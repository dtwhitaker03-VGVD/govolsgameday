/*
# Forum Thread Pages + Hover Card Fix (§23)

## Summary
1. Fixes get_hover_card_data — unqualified record field references caused "column does not exist" error.
2. Adds AFTER INSERT trigger on forum_posts: increments threads_replied_count + reply_count + last_active_at.
3. Adds BEFORE INSERT trigger on forum_posts: profanity filter (same tier-1/tier-3 logic as threads).
4. Adds increment_thread_view RPC (SECURITY DEFINER) — bumps view_count, no client UPDATE policy needed.
5. Adds get_thread_page RPC — returns thread + paginated posts with per-post reaction counts.
6. Updates get_forum_threads_by_category — adds has_questionable_take boolean (10+ beer reactions on any post).

## Security
- No new tables. No RLS policy changes.
- All new RPCs are SECURITY DEFINER, granted to anon + authenticated.
*/

-- ── 1. Fix get_hover_card_data ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_hover_card_data(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result              JSON;
  profile_record      RECORD;
  most_prestigious    TEXT;
  most_active_sport   TEXT;
  total_posts         INT;
  total_likes         INT;
BEGIN
  SELECT * INTO profile_record FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT badge_key INTO most_prestigious
    FROM public.user_badges
    WHERE user_id = p_user_id
    ORDER BY awarded_at DESC
    LIMIT 1;

  SELECT sport INTO most_active_sport FROM (
    SELECT 'Football'   AS sport, profile_record.points_football   AS pts
    UNION ALL SELECT 'Basketball', profile_record.points_basketball
    UNION ALL SELECT 'Baseball',    profile_record.points_baseball
    UNION ALL SELECT 'Lady Vol',   profile_record.points_lady_vol
    UNION ALL SELECT 'Trivia',     profile_record.points_trivia
  ) s ORDER BY pts DESC LIMIT 1;

  SELECT count(*) INTO total_posts
    FROM public.forum_posts WHERE user_id = p_user_id;

  SELECT count(*) INTO total_likes
    FROM public.forum_reactions r
    JOIN public.forum_posts p ON r.post_id = p.id
    WHERE p.user_id = p_user_id;

  SELECT json_build_object(
    'id',                   profile_record.id,
    'username',             profile_record.username,
    'avatar_url',           profile_record.avatar_url,
    'tagline',              profile_record.tagline,
    'hometown',             CASE WHEN profile_record.privacy_hide_hometown THEN NULL ELSE profile_record.hometown END,
    'created_at',           profile_record.created_at,
    'total_points',         CASE WHEN profile_record.privacy_hide_points THEN NULL ELSE profile_record.total_points END,
    'hot_streak_active',    profile_record.hot_streak_active,
    'current_streak_count', profile_record.current_streak_count,
    'threads_created_count',profile_record.threads_created_count,
    'threads_replied_count',profile_record.threads_replied_count,
    'total_posts',          total_posts,
    'total_likes',          total_likes,
    'most_prestigious_badge', most_prestigious,
    'most_active_sport',    most_active_sport,
    'is_premium',           profile_record.is_premium,
    'is_admin',             profile_record.is_admin
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 2. Trigger: increment reply counters on forum_posts insert ───────────────

CREATE OR REPLACE FUNCTION public.on_forum_post_created()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.forum_threads
    SET reply_count = reply_count + 1,
        last_active_at = now()
    WHERE id = NEW.thread_id;

  IF NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles
      SET threads_replied_count = threads_replied_count + 1
      WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_forum_post_created ON public.forum_posts;
CREATE TRIGGER on_forum_post_created
  AFTER INSERT ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.on_forum_post_created();

-- ── 3. Profanity filter on forum_posts ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.clean_and_verify_forum_post()
RETURNS TRIGGER AS $$
DECLARE
  word_record  RECORD;
  user_banned  BOOLEAN;
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    SELECT is_banned INTO user_banned FROM public.profiles WHERE id = NEW.user_id;
    IF user_banned = TRUE THEN
      RAISE EXCEPTION 'Your posting privileges have been suspended for violating the Code of Conduct.';
    END IF;
  END IF;

  FOR word_record IN SELECT blocked_word, severity FROM public.bad_words_filter LOOP
    IF NEW.body ILIKE '%' || word_record.blocked_word || '%' THEN
      IF word_record.severity = 'tier3' THEN
        UPDATE public.profiles SET moderation_strikes = moderation_strikes + 2 WHERE id = NEW.user_id;
        RAISE EXCEPTION 'Your submission was rejected for violating the Code of Conduct.';
      ELSE
        NEW.body := REGEXP_REPLACE(NEW.body, word_record.blocked_word, '****', 'gi');
      END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS forum_post_moderation_trigger ON public.forum_posts;
CREATE TRIGGER forum_post_moderation_trigger
  BEFORE INSERT ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.clean_and_verify_forum_post();

-- ── 4. Increment thread view count ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_thread_view(p_thread_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.forum_threads SET view_count = view_count + 1 WHERE id = p_thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_thread_view(UUID) TO anon, authenticated;

-- ── 5. Thread page RPC ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_thread_page(
  p_thread_id UUID,
  p_page      INT DEFAULT 1,
  p_per_page  INT DEFAULT 10
)
RETURNS JSON AS $$
DECLARE
  thread_record  RECORD;
  posts_data     JSON;
  offset_val     INT;
BEGIN
  SELECT * INTO thread_record FROM public.forum_threads WHERE id = p_thread_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  offset_val := (p_page - 1) * p_per_page;

  SELECT json_agg(json_build_object(
    'id',          p.id,
    'user_id',     p.user_id,
    'username',    p.username,
    'body',        p.body,
    'quoted_post_id', p.quoted_post_id,
    'edited_at',   p.edited_at,
    'created_at',  p.created_at,
    'reactions',   COALESCE(r.reaction_counts, '{}'::json)
  ) ORDER BY p.created_at ASC)
  INTO posts_data
  FROM public.forum_posts p
  LEFT JOIN LATERAL (
    SELECT json_object_agg(reaction, cnt) AS reaction_counts
    FROM (
      SELECT reaction, count(*) AS cnt
      FROM public.forum_reactions
      WHERE post_id = p.id
      GROUP BY reaction
    ) rc
  ) r ON true
  WHERE p.thread_id = p_thread_id
  ORDER BY p.created_at ASC
  LIMIT p_per_page OFFSET offset_val;

  RETURN json_build_object(
    'thread', json_build_object(
      'id',             thread_record.id,
      'user_id',        thread_record.user_id,
      'username',       thread_record.username,
      'title',          thread_record.title,
      'body',           thread_record.body,
      'category',       thread_record.category,
      'reply_count',    thread_record.reply_count,
      'view_count',      thread_record.view_count,
      'created_at',     thread_record.created_at,
      'last_active_at', thread_record.last_active_at
    ),
    'posts', COALESCE(posts_data, '[]'::json),
    'page', p_page,
    'per_page', p_per_page
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_thread_page(UUID, INT, INT) TO anon, authenticated;

-- ── 6. Update listing RPC: add has_questionable_take ──────────────────────────
-- Must DROP first because the return signature changes (new column added)

DROP FUNCTION IF EXISTS public.get_forum_threads_by_category(TEXT, INT);

CREATE OR REPLACE FUNCTION public.get_forum_threads_by_category(
  p_category TEXT,
  p_limit    INT DEFAULT 10
)
RETURNS TABLE (
  id              UUID,
  user_id         UUID,
  username        VARCHAR,
  title           TEXT,
  body            TEXT,
  category        VARCHAR,
  reply_count     INTEGER,
  view_count      INTEGER,
  created_at      TIMESTAMPTZ,
  last_active_at  TIMESTAMPTZ,
  last_reply_username  VARCHAR,
  last_reply_at        TIMESTAMPTZ,
  has_questionable_take BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      t.id,
      t.user_id,
      t.username,
      t.title,
      t.body,
      t.category,
      t.reply_count,
      t.view_count,
      t.created_at,
      t.last_active_at,
      lp.username  AS last_reply_username,
      lp.created_at AS last_reply_at,
      COALESCE(qt.has_qt, false) AS has_questionable_take
    FROM public.forum_threads t
    LEFT JOIN LATERAL (
      SELECT p.username, p.created_at
      FROM public.forum_posts p
      WHERE p.thread_id = t.id
      ORDER BY p.created_at DESC
      LIMIT 1
    ) lp ON true
    LEFT JOIN LATERAL (
      SELECT true AS has_qt
      FROM public.forum_reactions r
      JOIN public.forum_posts p ON r.post_id = p.id
      WHERE p.thread_id = t.id AND r.reaction = 'beer'
      GROUP BY p.id
      HAVING count(*) >= 10
      LIMIT 1
    ) qt ON true
    WHERE t.category = p_category
    ORDER BY t.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_forum_threads_by_category(TEXT, INT) TO anon, authenticated;