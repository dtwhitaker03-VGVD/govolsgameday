/*
# Profile Page RPCs + Follow System + Remaining Badges (§30)

## Summary
Builds the server side of the user profile page: one round-trip RPC for
the profile itself (respecting privacy flags server-side), one for
prediction history, and a follow toggle. Also completes the badges that
were deferred from the badges-system migration set because they depend
on these exact RPCs: making_friends/social_butterfly/popular_vol/
vol_nation_celebrity (follow counts) and founding_member/one_year_vol
(date-based, evaluated opportunistically on profile view).

## Changes
- New UNIQUE(follower_id, following_id) constraint on user_follows (none
  existed — nothing currently prevents duplicate follow rows).
- New RPC `toggle_follow(p_target_user_id)`: inserts/deletes a follow,
  keeps follower_count/following_count in sync on both profiles (same
  "RPC does the counting" style as everywhere else in this schema, not a
  trigger), awards making_friends/social_butterfly to the follower and
  popular_vol/vol_nation_celebrity to the target on follow (never
  un-awarded on unfollow — badges are permanent).
- New RPC `evaluate_membership_badges(p_user_id)`: founding_member (one
  of the first 100 accounts by created_at) and one_year_vol (account age
  >= 1 year). No row-event triggers this — it's called from
  get_profile_page_data on every profile view, which is cheap and
  idempotent (ON CONFLICT DO NOTHING).
- New RPC `get_profile_page_data(p_username)`: single round-trip for the
  whole page — profile header fields, stats, point ledger, follow state
  for the viewer, all privacy-checked server-side (nulled here, not left
  for the client to hide).
- New RPC `get_profile_prediction_history(p_user_id)`: pregame_predictions
  joined to live_games, for finished (calculated) games only — existing
  RLS on pregame_predictions already restricts other users' in-progress
  picks, so this just adds the join, not new visibility.

## Security
- All SECURITY DEFINER, EXECUTE granted to anon/authenticated — same
  pattern as get_hover_card_data.
- get_profile_page_data nulls privacy-hidden fields itself rather than
  returning everything and trusting the client.
*/

ALTER TABLE public.user_follows
  ADD CONSTRAINT user_follows_unique_pair UNIQUE (follower_id, following_id);

-- ── Follow toggle ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.toggle_follow(p_target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_follower_id UUID := auth.uid();
  v_existing    UUID;
  v_new_following_count INTEGER;
  v_new_follower_count  INTEGER;
BEGIN
  IF v_follower_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_follower_id = p_target_user_id THEN
    RAISE EXCEPTION 'Cannot follow yourself';
  END IF;

  SELECT id INTO v_existing FROM public.user_follows
    WHERE follower_id = v_follower_id AND following_id = p_target_user_id;

  IF v_existing IS NOT NULL THEN
    DELETE FROM public.user_follows WHERE id = v_existing;
    UPDATE public.profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = v_follower_id;
    UPDATE public.profiles SET follower_count  = GREATEST(follower_count - 1, 0) WHERE id = p_target_user_id;
    RETURN FALSE;
  END IF;

  INSERT INTO public.user_follows (follower_id, following_id) VALUES (v_follower_id, p_target_user_id);

  UPDATE public.profiles SET following_count = following_count + 1
    WHERE id = v_follower_id RETURNING following_count INTO v_new_following_count;
  UPDATE public.profiles SET follower_count = follower_count + 1
    WHERE id = p_target_user_id RETURNING follower_count INTO v_new_follower_count;

  IF v_new_following_count = 10 THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (v_follower_id, 'making_friends')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  ELSIF v_new_following_count = 50 THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (v_follower_id, 'social_butterfly')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  IF v_new_follower_count = 10 THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (p_target_user_id, 'popular_vol')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  ELSIF v_new_follower_count = 100 THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (p_target_user_id, 'vol_nation_celebrity')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.toggle_follow(UUID) TO authenticated;

-- ── Membership badges (date-based, no row event) ─────────────────────────────

CREATE OR REPLACE FUNCTION public.evaluate_membership_badges(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_created_at TIMESTAMPTZ;
  v_rank       BIGINT;
BEGIN
  SELECT created_at INTO v_created_at FROM public.profiles WHERE id = p_user_id;
  IF v_created_at IS NULL THEN RETURN; END IF;

  IF NOW() - v_created_at >= INTERVAL '1 year' THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (p_user_id, 'one_year_vol')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  SELECT rnk INTO v_rank FROM (
    SELECT id, RANK() OVER (ORDER BY created_at ASC) rnk FROM public.profiles
  ) r WHERE r.id = p_user_id;

  IF v_rank IS NOT NULL AND v_rank <= 100 THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (p_user_id, 'founding_member')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.evaluate_membership_badges(UUID) TO authenticated, anon;

-- ── Profile page data ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_profile_page_data(p_username TEXT)
RETURNS JSON AS $$
DECLARE
  result          JSON;
  p               RECORD;
  v_total_posts   INTEGER;
  v_total_reactions INTEGER;
  v_most_prestigious TEXT;
  v_is_following  BOOLEAN;
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

  IF v_viewer IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.user_follows WHERE follower_id = v_viewer AND following_id = p.id
    ) INTO v_is_following;
  END IF;

  SELECT json_build_object(
    'id', p.id,
    'username', p.username,
    'avatar_url', p.avatar_url,
    'cover_photo_url', p.cover_photo_url,
    'tagline', p.tagline,
    'hometown', CASE WHEN p.privacy_hide_hometown THEN NULL ELSE p.hometown END,
    'created_at', p.created_at,
    'is_own_profile', v_viewer = p.id,
    'is_following', COALESCE(v_is_following, FALSE),
    'follower_count', CASE WHEN p.privacy_hide_followers THEN NULL ELSE p.follower_count END,
    'following_count', CASE WHEN p.privacy_hide_followers THEN NULL ELSE p.following_count END,
    'total_points', CASE WHEN p.privacy_hide_points THEN NULL ELSE p.total_points END,
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

-- ── Prediction history ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_profile_prediction_history(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(row_data ORDER BY kickoff_time DESC) INTO result
  FROM (
    SELECT
      pp.id,
      pp.predicted_winner, pp.predicted_home_score, pp.predicted_away_score,
      pp.predicted_home_yards, pp.predicted_away_yards,
      pp.winner_correct, pp.total_pregame_points,
      lg.home_team, lg.away_team, lg.home_score, lg.away_score,
      lg.home_total_yards, lg.away_total_yards, lg.kickoff_time, lg.status,
      json_build_object(
        'id', pp.id,
        'predicted_winner', pp.predicted_winner,
        'predicted_home_score', pp.predicted_home_score,
        'predicted_away_score', pp.predicted_away_score,
        'predicted_home_yards', pp.predicted_home_yards,
        'predicted_away_yards', pp.predicted_away_yards,
        'winner_correct', pp.winner_correct,
        'total_pregame_points', pp.total_pregame_points,
        'home_team', lg.home_team,
        'away_team', lg.away_team,
        'home_score', lg.home_score,
        'away_score', lg.away_score,
        'home_total_yards', lg.home_total_yards,
        'away_total_yards', lg.away_total_yards,
        'kickoff_time', lg.kickoff_time,
        'status', lg.status
      ) AS row_data
    FROM public.pregame_predictions pp
    JOIN public.live_games lg ON lg.id = pp.game_id
    WHERE pp.user_id = p_user_id AND lg.status = 'calculated'
  ) sub;

  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_profile_prediction_history(UUID) TO anon, authenticated;
