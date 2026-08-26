/*
# Last-Seen Tracking, Site-Wide Rank, Ignore/Block (§30 mockup parity)

## Summary
Closes three gaps between the built profile page and the provided
mockup: a "last active" timestamp, a site-wide rank stat, and an
Ignore button next to Follow.

## Changes
- New column `profiles.last_seen_at TIMESTAMPTZ`.
- New RPC `touch_last_seen()`: sets the caller's `last_seen_at` to now.
  Called from the frontend on app mount for a logged-in session — this
  gives page-load-granularity presence (matches the mockup's hour-level
  "Active 2h ago"), not true real-time presence, since there's no
  heartbeat/websocket presence channel in this schema.
- New table `user_ignores` (ignorer_id, ignored_id, unique pair). RLS:
  a user's ignore list is only visible/writable by that user — unlike
  `user_follows` (public, social-graph data), who someone has ignored
  is private.
- New RPC `toggle_ignore(p_target_user_id)`: insert/delete, mirrors
  `toggle_follow`'s shape. No counts, no badges — ignoring isn't a
  publicly-scored action.
- `get_profile_page_data()` extended to return `last_seen_at`,
  `site_rank` (site-wide rank by total_points, null when points are
  privacy-hidden since rank leaks relative standing), and
  `is_ignoring` (viewer's ignore state on this profile).

## Scope note (read before assuming this is "done")
This migration makes Ignore a real, working per-viewer preference — it
persists and the profile page reflects it. It does **not** wire that
preference into chat, forum threads, or any other content surface
(hiding an ignored user's messages/posts app-wide). That's a separate,
larger change touching DiscussionBoard/ThreadPage/ForumThreadsPanel and
is out of scope for the profile page itself.

## Security
- SECURITY DEFINER on both new RPCs, matching every other RPC in this
  schema. `user_ignores` RLS is intentionally tighter than
  `user_follows` (owner-only, not public-read).
*/

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.profiles SET last_seen_at = NOW() WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;

-- ── Ignore / block ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_ignores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ignorer_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ignored_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ignorer_id, ignored_id)
);

ALTER TABLE public.user_ignores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ignores_select_own" ON public.user_ignores;
CREATE POLICY "ignores_select_own" ON public.user_ignores FOR SELECT
  TO authenticated USING (ignorer_id = auth.uid());

CREATE OR REPLACE FUNCTION public.toggle_ignore(p_target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_ignorer_id UUID := auth.uid();
  v_existing   UUID;
BEGIN
  IF v_ignorer_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_ignorer_id = p_target_user_id THEN
    RAISE EXCEPTION 'Cannot ignore yourself';
  END IF;

  SELECT id INTO v_existing FROM public.user_ignores
    WHERE ignorer_id = v_ignorer_id AND ignored_id = p_target_user_id;

  IF v_existing IS NOT NULL THEN
    DELETE FROM public.user_ignores WHERE id = v_existing;
    RETURN FALSE;
  END IF;

  INSERT INTO public.user_ignores (ignorer_id, ignored_id) VALUES (v_ignorer_id, p_target_user_id);
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.toggle_ignore(UUID) TO authenticated;

-- ── get_profile_page_data: last_seen_at, site_rank, is_ignoring ──────────────

CREATE OR REPLACE FUNCTION public.get_profile_page_data(p_username TEXT)
RETURNS JSON AS $$
DECLARE
  result          JSON;
  p               RECORD;
  v_total_posts   INTEGER;
  v_total_reactions INTEGER;
  v_most_prestigious TEXT;
  v_is_following  BOOLEAN;
  v_is_ignoring   BOOLEAN;
  v_site_rank     BIGINT;
  v_viewer        UUID := auth.uid();
BEGIN
  SELECT * INTO p FROM public.profiles WHERE username = p_username;
  IF NOT FOUND THEN RETURN NULL; END IF;

  PERFORM public.evaluate_membership_badges(p.id);

  SELECT count(*) INTO v_total_posts FROM public.forum_posts WHERE user_id = p.id;

  SELECT count(*) INTO v_total_reactions
    FROM public.forum_reactions r
    JOIN public.forum_posts fp ON r.post_id = fp.id
    WHERE fp.user_id = p.id;

  SELECT badge_key INTO v_most_prestigious
    FROM public.user_badges WHERE user_id = p.id ORDER BY awarded_at DESC LIMIT 1;

  IF NOT p.privacy_hide_points THEN
    SELECT rnk INTO v_site_rank FROM (
      SELECT id, RANK() OVER (ORDER BY total_points DESC) rnk FROM public.profiles
    ) r WHERE r.id = p.id;
  END IF;

  IF v_viewer IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.user_follows WHERE follower_id = v_viewer AND following_id = p.id
    ) INTO v_is_following;
    SELECT EXISTS(
      SELECT 1 FROM public.user_ignores WHERE ignorer_id = v_viewer AND ignored_id = p.id
    ) INTO v_is_ignoring;
  END IF;

  SELECT json_build_object(
    'id', p.id,
    'username', p.username,
    'avatar_url', p.avatar_url,
    'cover_photo_url', p.cover_photo_url,
    'tagline', p.tagline,
    'hometown', CASE WHEN p.privacy_hide_hometown THEN NULL ELSE p.hometown END,
    'created_at', p.created_at,
    'last_seen_at', p.last_seen_at,
    'is_own_profile', v_viewer = p.id,
    'is_following', COALESCE(v_is_following, FALSE),
    'is_ignoring', COALESCE(v_is_ignoring, FALSE),
    'follower_count', CASE WHEN p.privacy_hide_followers THEN NULL ELSE p.follower_count END,
    'following_count', CASE WHEN p.privacy_hide_followers THEN NULL ELSE p.following_count END,
    'total_points', CASE WHEN p.privacy_hide_points THEN NULL ELSE p.total_points END,
    'site_rank', v_site_rank,
    'points_football', CASE WHEN p.privacy_hide_points THEN NULL ELSE p.points_football END,
    'points_basketball', CASE WHEN p.privacy_hide_points THEN NULL ELSE p.points_basketball END,
    'points_baseball', CASE WHEN p.privacy_hide_points THEN NULL ELSE p.points_baseball END,
    'points_lady_vol', CASE WHEN p.privacy_hide_points THEN NULL ELSE p.points_lady_vol END,
    'points_trivia', CASE WHEN p.privacy_hide_points THEN NULL ELSE p.points_trivia END,
    'threads_created_count', p.threads_created_count,
    'threads_replied_count', p.threads_replied_count,
    'total_posts', v_total_posts,
    'total_reactions', v_total_reactions,
    'hot_streak_active', p.hot_streak_active,
    'current_streak_count', p.current_streak_count,
    'most_prestigious_badge', v_most_prestigious,
    'is_premium', p.is_premium,
    'is_admin', p.is_admin,
    'show_predictions', NOT p.privacy_hide_predictions,
    'show_activity', NOT p.privacy_hide_activity,
    'privacy_hide_hometown', p.privacy_hide_hometown,
    'privacy_hide_points', p.privacy_hide_points,
    'privacy_hide_predictions', p.privacy_hide_predictions,
    'privacy_hide_activity', p.privacy_hide_activity,
    'privacy_hide_followers', p.privacy_hide_followers
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_profile_page_data(TEXT) TO anon, authenticated;
