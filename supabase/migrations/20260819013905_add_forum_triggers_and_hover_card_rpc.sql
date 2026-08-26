/*
# Forum Triggers + Hover Card RPC (§22, §23)

## Summary
Adds database automation for the Forums feature and a data-fetch function
for the Username Hover Card component.

## Changes

### 1. Trigger: increment threads_created_count
- AFTER INSERT on forum_threads → increments profiles.threads_created_count
- Runs as SECURITY DEFINER so it can update profiles even though the
  inserter only has INSERT permission on forum_threads.

### 2. Trigger: profanity filter on forum threads
- BEFORE INSERT on forum_threads
- Reuses the existing bad_words_filter table (same as chat).
- tier1 words are masked with **** in title and body.
- tier3 words block the insert and add 2 moderation_strikes.
- Banned users are blocked from posting entirely.

### 3. RPC: get_hover_card_data(p_user_id)
Returns a JSON object with everything the hover card needs in one round-trip:
- username, avatar_url, tagline
- hometown (NULL if privacy_hide_hometown is true)
- created_at (member-since)
- total_points (NULL if privacy_hide_points is true)
- hot_streak_active, current_streak_count
- threads_created_count, threads_replied_count
- total_posts (count of forum_posts by this user)
- total_likes (count of forum_reactions on this user's posts)
- most_prestigious_badge (most recently awarded badge_key)
- most_active_sport (sport with highest points)
- is_premium, is_admin

### 4. RPC: get_forum_threads_by_category(p_category, p_limit)
Returns the newest threads in a category with last-reply info joined in
a single query (avoids N+1 from the client).

## Security
- No new tables. No RLS policy changes.
- Both RPCs are SECURITY DEFINER but only read data that is already
  publicly readable under existing RLS policies.
- EXECUTE granted to anon and authenticated on both functions.
*/

-- ── 1. Increment threads_created_count ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_threads_created_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles
      SET threads_created_count = threads_created_count + 1
      WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_forum_thread_created ON public.forum_threads;
CREATE TRIGGER on_forum_thread_created
  AFTER INSERT ON public.forum_threads
  FOR EACH ROW EXECUTE FUNCTION public.increment_threads_created_count();

-- ── 2. Profanity filter on forum threads ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.clean_and_verify_forum_thread()
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
    -- Check title
    IF NEW.title ILIKE '%' || word_record.blocked_word || '%' THEN
      IF word_record.severity = 'tier3' THEN
        UPDATE public.profiles SET moderation_strikes = moderation_strikes + 2 WHERE id = NEW.user_id;
        RAISE EXCEPTION 'Your submission was rejected for violating the Code of Conduct.';
      ELSE
        NEW.title := REGEXP_REPLACE(NEW.title, word_record.blocked_word, '****', 'gi');
      END IF;
    END IF;
    -- Check body
    IF NEW.body IS NOT NULL AND NEW.body ILIKE '%' || word_record.blocked_word || '%' THEN
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

DROP TRIGGER IF EXISTS forum_thread_moderation_trigger ON public.forum_threads;
CREATE TRIGGER forum_thread_moderation_trigger
  BEFORE INSERT ON public.forum_threads
  FOR EACH ROW EXECUTE FUNCTION public.clean_and_verify_forum_thread();

-- ── 3. Hover card data RPC ───────────────────────────────────────────────────

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
    SELECT 'Football'   AS sport, points_football   AS pts
    UNION ALL SELECT 'Basketball', points_basketball
    UNION ALL SELECT 'Baseball',    points_baseball
    UNION ALL SELECT 'Lady Vol',   points_lady_vol
    UNION ALL SELECT 'Trivia',     points_trivia
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

GRANT EXECUTE ON FUNCTION public.get_hover_card_data(UUID) TO anon, authenticated;

-- ── 4. Forum threads by category with last-reply info ────────────────────────

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
  last_reply_at        TIMESTAMPTZ
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
      lp.created_at AS last_reply_at
    FROM public.forum_threads t
    LEFT JOIN LATERAL (
      SELECT p.username, p.created_at
      FROM public.forum_posts p
      WHERE p.thread_id = t.id
      ORDER BY p.created_at DESC
      LIMIT 1
    ) lp ON true
    WHERE t.category = p_category
    ORDER BY t.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_forum_threads_by_category(TEXT, INT) TO anon, authenticated;