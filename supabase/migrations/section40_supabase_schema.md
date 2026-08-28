## 40. SUPABASE SCHEMA (execute in SQL editor — exact, complete, final)

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. USER PROFILES
-- =============================================
CREATE TABLE public.profiles (
  id                       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username                 VARCHAR(50) UNIQUE NOT NULL,
  avatar_url               TEXT,
  cover_photo_url          TEXT,
  tagline                  VARCHAR(100),
  hometown                 VARCHAR(100),
  threads_created_count    INTEGER DEFAULT 0,
  threads_replied_count    INTEGER DEFAULT 0,
  points_football          INTEGER DEFAULT 0,
  points_basketball        INTEGER DEFAULT 0,
  points_baseball          INTEGER DEFAULT 0,
  points_lady_vol          INTEGER DEFAULT 0,
  points_trivia            INTEGER DEFAULT 0,
  total_points             INTEGER DEFAULT 0,
  trivia_streak_current    INTEGER DEFAULT 0,
  trivia_streak_best       INTEGER DEFAULT 0,
  moderation_strikes       INTEGER DEFAULT 0,
  is_banned                BOOLEAN DEFAULT FALSE,
  ban_reason               TEXT,
  is_premium               BOOLEAN DEFAULT FALSE,
  is_admin                 BOOLEAN DEFAULT FALSE,
  hot_streak_active        BOOLEAN DEFAULT FALSE,
  current_streak_count     INTEGER DEFAULT 0,
  follower_count           INTEGER DEFAULT 0,
  following_count          INTEGER DEFAULT 0,
  privacy_hide_hometown     BOOLEAN DEFAULT FALSE,
  privacy_hide_points       BOOLEAN DEFAULT FALSE,
  privacy_hide_predictions  BOOLEAN DEFAULT FALSE,
  privacy_hide_activity     BOOLEAN DEFAULT FALSE,
  privacy_hide_followers    BOOLEAN DEFAULT FALSE,
  created_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'VolFan_' || substring(uuid_generate_v4()::text, 1, 8)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================
-- 2. CHAT MESSAGES
-- =============================================
CREATE TABLE public.chat_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  username       VARCHAR(50) NOT NULL,
  message_text   TEXT NOT NULL,
  room_category  VARCHAR(50) DEFAULT 'main',
  -- valid values: 'main','football','basketball','baseball','lv-basketball','lv-softball','other','recruiting'
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
CREATE INDEX idx_chat_messages_room_time ON public.chat_messages(room_category, created_at DESC);


-- =============================================
-- 3. PROFANITY / CONTENT FILTER
-- =============================================
CREATE TABLE public.bad_words_filter (
  id           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  blocked_word VARCHAR(100) UNIQUE NOT NULL,
  severity     VARCHAR(20) DEFAULT 'tier1' -- 'tier1' (mask) | 'tier3' (block+suspend)
);

CREATE OR REPLACE FUNCTION public.clean_and_verify_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  word_record  RECORD;
  user_banned  BOOLEAN;
BEGIN
  SELECT is_banned INTO user_banned FROM public.profiles WHERE id = NEW.user_id;
  IF user_banned = TRUE THEN
    RAISE EXCEPTION 'Your chat privileges have been suspended for violating the Code of Conduct.';
  END IF;
  FOR word_record IN SELECT blocked_word, severity FROM public.bad_words_filter LOOP
    IF NEW.message_text ILIKE '%' || word_record.blocked_word || '%' THEN
      IF word_record.severity = 'tier3' THEN
        UPDATE public.profiles SET moderation_strikes = moderation_strikes + 2 WHERE id = NEW.user_id;
        RAISE EXCEPTION 'Your submission was rejected for violating the Code of Conduct.';
      ELSE
        NEW.message_text := REGEXP_REPLACE(NEW.message_text, word_record.blocked_word, '****', 'gi');
      END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER chat_moderation_trigger
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.clean_and_verify_chat_message();


-- =============================================
-- 4. QUESTION OF THE DAY (discussion board prompts)
-- =============================================
CREATE TABLE public.questions_of_the_day (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question       TEXT NOT NULL,
  sport_category VARCHAR(50) NOT NULL, -- 'football'|'basketball'|'baseball'|'lady-vols'
  active_date    DATE,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- =============================================
-- 5. SCRAPED VIDEOS
-- =============================================
CREATE TABLE public.scraped_videos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  thumbnail_url   TEXT NOT NULL,
  video_url       TEXT NOT NULL,
  duration        VARCHAR(20),
  view_count      BIGINT DEFAULT 0,
  sport_category  VARCHAR(50) NOT NULL,
  ingested_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_videos_sport_date  ON public.scraped_videos(sport_category, ingested_at DESC);
CREATE INDEX idx_videos_sport_views ON public.scraped_videos(sport_category, view_count DESC);


-- =============================================
-- 6. SCRAPED ARTICLES
-- =============================================
CREATE TABLE public.scraped_articles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  summary         TEXT NOT NULL,
  source_name     VARCHAR(100),
  source_url      TEXT NOT NULL,
  thumbnail_url   TEXT,
  sport_category  VARCHAR(50) NOT NULL,
  ingested_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_articles_sport_date ON public.scraped_articles(sport_category, ingested_at DESC);


-- =============================================
-- 7. RECRUITS
-- =============================================
CREATE TABLE public.recruits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT NOT NULL,
  hometown        TEXT,
  position        VARCHAR(50),
  sport_category  VARCHAR(20) NOT NULL, -- 'football'|'basketball'|'baseball'|'lv-basketball'|'lv-softball'
  scouting_year   INT NOT NULL,
  stars_247       INTEGER,
  stars_on3       INTEGER,
  national_rank   INTEGER,
  status          VARCHAR(50), -- 'target','committed','portal', etc.
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.recruits;


-- =============================================
-- 8. RECRUITING CLASS RANKINGS
-- =============================================
CREATE TABLE public.recruiting_class_rankings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_category  VARCHAR(50) NOT NULL,
  scouting_year   INT NOT NULL,
  rank_247        INTEGER NOT NULL,
  rank_on3        INTEGER NOT NULL,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.recruiting_class_rankings;


-- =============================================
-- 9. LIVE GAMES
-- =============================================
CREATE TABLE public.live_games (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cfbd_game_id      BIGINT UNIQUE NOT NULL,
  sport             VARCHAR(20) NOT NULL DEFAULT 'football',
  home_team         TEXT NOT NULL,
  away_team         TEXT NOT NULL,
  kickoff_time      TIMESTAMP WITH TIME ZONE NOT NULL,
  status            VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled'|'pregame'|'live'|'final'|'calculated'
  home_score        INTEGER DEFAULT 0,
  away_score        INTEGER DEFAULT 0,
  home_total_yards  INTEGER,
  away_total_yards  INTEGER,
  current_quarter   INTEGER,
  game_clock        TEXT,
  possession        TEXT,
  down              INTEGER,
  distance          INTEGER,
  yardline          INTEGER,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_games;


-- =============================================
-- 10. PRE-GAME PREDICTIONS
-- =============================================
CREATE TABLE public.pregame_predictions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id              UUID REFERENCES public.live_games(id) ON DELETE CASCADE,
  user_id              UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  predicted_winner     TEXT NOT NULL, -- 'home'|'away'
  predicted_home_score INTEGER NOT NULL,
  predicted_away_score INTEGER NOT NULL,
  predicted_home_yards INTEGER NOT NULL,
  predicted_away_yards INTEGER NOT NULL,
  winner_correct       BOOLEAN,
  home_score_points    INTEGER,  -- includes +50 exact bonus if applicable
  away_score_points    INTEGER,  -- includes +50 exact bonus if applicable
  home_yards_points    INTEGER,  -- includes +100 exact bonus if applicable
  away_yards_points    INTEGER,  -- includes +100 exact bonus if applicable
  total_pregame_points INTEGER,
  submitted_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, user_id)
);


-- =============================================
-- 11. DRIVE PREDICTIONS
-- =============================================
CREATE TABLE public.drive_predictions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id         UUID REFERENCES public.live_games(id) ON DELETE CASCADE,
  drive_number    INTEGER NOT NULL,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  cfbd_drive_id   TEXT,
  prediction      VARCHAR(30) NOT NULL,
  -- 'touchdown'|'field_goal'|'punt'|'turnover'|'safety'|'turnover_on_downs'|'end_of_quarter'
  points_possible INTEGER NOT NULL, -- 40-60, independent per button, set by server
  actual_outcome  VARCHAR(30),
  correct         BOOLEAN,
  multiplier      NUMERIC(4,2),     -- 1.00|1.25|1.50|2.00|3.00|4.00
  points_earned   INTEGER,          -- FLOOR(points_possible * multiplier) — server only
  status          VARCHAR(20) DEFAULT 'open', -- 'open'|'locked'|'resolved'
  submitted_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, drive_number, user_id)
);


-- =============================================
-- 12. GAME LEADERBOARD (materialized per game)
-- =============================================
CREATE TABLE public.game_leaderboard (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id             UUID REFERENCES public.live_games(id) ON DELETE CASCADE,
  user_id             UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  username            VARCHAR(50) NOT NULL,
  total_drive_points  INTEGER DEFAULT 0,
  pregame_points      INTEGER DEFAULT 0,
  total_game_points   INTEGER DEFAULT 0,
  home_yards_diff     INTEGER,
  away_yards_diff     INTEGER,
  rank                INTEGER,
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, user_id)
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.game_leaderboard;


-- =============================================
-- 13. BADGES / ACHIEVEMENTS
-- =============================================
CREATE TABLE public.user_badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_key   VARCHAR(80) NOT NULL, -- see §31 and VGD_Additional_Badges.md
  awarded_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_key)
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges;


-- =============================================
-- 14. FORUM THREADS (native Supabase — NOT XenForo)
-- =============================================
CREATE TABLE public.forum_threads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  username        VARCHAR(50),
  title           TEXT NOT NULL,
  body            TEXT,
  category        VARCHAR(50) NOT NULL,
  -- 'general'|'football'|'football_recruiting'|'basketball'|'basketball_recruiting'
  -- |'baseball'|'lady_vol_basketball'|'lady_vol_softball'|'other_sports'
  -- |'other_recruiting'|'tickets'
  reply_count     INTEGER DEFAULT 0,
  view_count      INTEGER DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_forum_threads_category_newest  ON public.forum_threads(category, created_at DESC);
CREATE INDEX idx_forum_threads_category_hot     ON public.forum_threads(category, view_count DESC, last_active_at DESC);
CREATE INDEX idx_forum_threads_category_popular ON public.forum_threads(category, view_count DESC);


-- =============================================
-- 15. FORUM POSTS (replies within a thread)
-- =============================================
CREATE TABLE public.forum_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       UUID REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  username        VARCHAR(50),
  body            TEXT NOT NULL,
  quoted_post_id  UUID REFERENCES public.forum_posts(id) ON DELETE SET NULL,
  edited_at       TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_forum_posts_thread ON public.forum_posts(thread_id, created_at ASC);


-- =============================================
-- 16. FORUM REACTIONS
-- =============================================
CREATE TABLE public.forum_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction    VARCHAR(20) NOT NULL,
  -- 'vol_love'|'fire'|'facts'|'funny'|'disagree'|'beer'|'big_brain'|'too_real'
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id, reaction)
);


-- =============================================
-- 17. DAILY TRIVIA
-- =============================================
CREATE TABLE public.trivia_questions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question         TEXT NOT NULL,
  option_a         TEXT NOT NULL,
  option_b         TEXT NOT NULL,
  option_c         TEXT NOT NULL,
  option_d         TEXT NOT NULL,
  correct_answer   CHAR(1) NOT NULL, -- 'A'|'B'|'C'|'D'
  difficulty       VARCHAR(20) NOT NULL, -- 'easy'|'medium'|'hard'
  category         VARCHAR(50) NOT NULL,
  scheduled_date   DATE UNIQUE NOT NULL
);

CREATE TABLE public.user_trivia_responses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  trivia_date         DATE NOT NULL,
  score               INTEGER NOT NULL DEFAULT 0,
  answers             JSONB,
  completed_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  time_taken_seconds  INTEGER,
  UNIQUE(user_id, trivia_date)
);


-- =============================================
-- 18. POLLS
-- =============================================
CREATE TABLE public.daily_polls (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question      TEXT NOT NULL,
  option_a      TEXT NOT NULL,
  option_b      TEXT NOT NULL,
  option_c      TEXT,
  option_d      TEXT,
  active_date   DATE UNIQUE NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.user_poll_responses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  poll_id          UUID REFERENCES public.daily_polls(id) ON DELETE CASCADE,
  selected_option  CHAR(1) NOT NULL,
  responded_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, poll_id)
);

CREATE TABLE public.fan_polls (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  question       TEXT NOT NULL,
  option_a       TEXT NOT NULL,
  option_b       TEXT NOT NULL,
  option_c       TEXT,
  option_d       TEXT,
  duration_hours INTEGER NOT NULL DEFAULT 24,
  closes_at      TIMESTAMP WITH TIME ZONE NOT NULL,
  vote_count     INTEGER DEFAULT 0,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.fan_poll_votes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id          UUID REFERENCES public.fan_polls(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  selected_option  CHAR(1) NOT NULL,
  voted_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);


-- =============================================
-- 19. FOLLOWING SYSTEM
-- =============================================
CREATE TABLE public.user_follows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);


-- =============================================
-- 20. TOUCHDOWN VIDEOS
-- =============================================
CREATE TABLE public.touchdown_videos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path     TEXT NOT NULL,
  style_tag        VARCHAR(50), -- 'retro'|'anime'|'simpsons'|'madden'|'comic'|'claymation'|'80s_action'|'looney_tunes'
  opponent_tag     VARCHAR(100), -- NULL = general pool
  uploaded_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- =============================================
-- 21. REPORTS (chat + forum)
-- =============================================
CREATE TABLE public.reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_type   VARCHAR(20) NOT NULL, -- 'chat_message'|'forum_post'|'forum_thread'|'fan_poll'
  target_id     UUID NOT NULL,
  reason        TEXT,
  status        VARCHAR(20) DEFAULT 'open', -- 'open'|'dismissed'|'deleted'|'warned'|'struck'|'banned'
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at   TIMESTAMP WITH TIME ZONE
);


-- =============================================
-- 22. SYSTEM HEALTH MONITORING
-- =============================================
CREATE TABLE public.system_health (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name           VARCHAR(100) NOT NULL UNIQUE,
  -- '247sports_scrape'|'on3_scrape'|'youtube_ingestion'|'news_ingestion'|'cfbd_live_feed'
  last_successful_run   TIMESTAMP WITH TIME ZONE,
  status                VARCHAR(20) DEFAULT 'unknown' -- 'healthy'|'stalled'|'unknown'
);
```

### Row-Level Security (general rules)
- `profiles`: read all rows; update only own row.
- `chat_messages`: authenticated insert; all read.
- `pregame_predictions` / `drive_predictions`: authenticated insert own row; read own row only until game is `calculated`, then public read.
- `game_leaderboard`, `user_badges`: read-only for all; writes only via server/edge functions or triggers.
- `forum_threads`, `forum_posts`, `forum_reactions`: read all; authenticated insert.
- `daily_polls`, `fan_polls`, `trivia_questions`: public read; writes via admin/server only (except `fan_polls` insert, which is authenticated-user).
- `reports`: authenticated insert; read/update restricted to `is_admin = TRUE`.
- `system_health`: read restricted to `is_admin = TRUE`; writes via server/Make.com only.

---
