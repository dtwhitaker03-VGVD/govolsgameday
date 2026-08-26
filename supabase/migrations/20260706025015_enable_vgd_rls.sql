
/*
# VGD Row-Level Security — Phase 1, Step 2 (§40 RLS Rules)

## Summary
Enables RLS on all 26 tables and applies policies per the general rules at the end of §40.

## Policy Groups Applied

### Public read (anon + authenticated — browsable without login):
profiles, chat_messages, live_games, recruits, recruiting_class_rankings,
scraped_videos, scraped_articles, questions_of_the_day, game_leaderboard,
user_badges, forum_threads, forum_posts, forum_reactions, trivia_questions,
daily_polls, fan_polls, fan_poll_votes, user_follows, touchdown_videos

### Authenticated insert (own rows only):
chat_messages, forum_threads, forum_posts, forum_reactions,
user_trivia_responses, user_poll_responses, fan_polls, fan_poll_votes,
user_follows, reports

### Own-row read (until game status = 'calculated', then public):
pregame_predictions, drive_predictions

### Own profile update:
profiles (authenticated users can only update their own row)

### Admin-only (is_admin = TRUE check via subquery):
reports — insert by any authenticated user; select + update restricted to admins
system_health — select restricted to admins; writes via service role only
bad_words_filter — select restricted to admins (prevents evasion via list inspection)

### Server/trigger-only writes (no client insert/update policies):
game_leaderboard, user_badges — reads are public; all writes go through edge functions or triggers

## Notes
- All ENABLE ROW LEVEL SECURITY statements are idempotent (safe to re-run)
- All policies use DROP IF EXISTS before CREATE for idempotency
- Admin checks use: (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
- pregame/drive prediction SELECT: own rows always visible; all rows visible once game.status='calculated'
*/

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE public.profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bad_words_filter         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions_of_the_day     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraped_videos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraped_articles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruits                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiting_class_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_games               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pregame_predictions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_predictions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_leaderboard         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_threads            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trivia_responses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_polls              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_poll_responses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_polls                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_poll_votes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.touchdown_videos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health            ENABLE ROW LEVEL SECURITY;


-- =============================================
-- PROFILES
-- read all rows; update only own row
-- =============================================
DROP POLICY IF EXISTS "profiles_select_public"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"       ON public.profiles;

CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- =============================================
-- CHAT MESSAGES
-- authenticated insert; all read
-- =============================================
DROP POLICY IF EXISTS "chat_select_public"    ON public.chat_messages;
DROP POLICY IF EXISTS "chat_insert_auth"      ON public.chat_messages;

CREATE POLICY "chat_select_public" ON public.chat_messages FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "chat_insert_auth" ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);


-- =============================================
-- BAD WORDS FILTER
-- admin-only read (prevents evasion via list inspection); writes via service role
-- =============================================
DROP POLICY IF EXISTS "bad_words_select_admin" ON public.bad_words_filter;

CREATE POLICY "bad_words_select_admin" ON public.bad_words_filter FOR SELECT
  TO authenticated
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));


-- =============================================
-- QUESTIONS OF THE DAY
-- public read; writes via admin/server only
-- =============================================
DROP POLICY IF EXISTS "qotd_select_public" ON public.questions_of_the_day;

CREATE POLICY "qotd_select_public" ON public.questions_of_the_day FOR SELECT
  TO anon, authenticated USING (true);


-- =============================================
-- SCRAPED VIDEOS
-- public read; writes via server only
-- =============================================
DROP POLICY IF EXISTS "videos_select_public" ON public.scraped_videos;

CREATE POLICY "videos_select_public" ON public.scraped_videos FOR SELECT
  TO anon, authenticated USING (true);


-- =============================================
-- SCRAPED ARTICLES
-- public read; writes via server only
-- =============================================
DROP POLICY IF EXISTS "articles_select_public" ON public.scraped_articles;

CREATE POLICY "articles_select_public" ON public.scraped_articles FOR SELECT
  TO anon, authenticated USING (true);


-- =============================================
-- RECRUITS
-- public read; writes via server only
-- =============================================
DROP POLICY IF EXISTS "recruits_select_public" ON public.recruits;

CREATE POLICY "recruits_select_public" ON public.recruits FOR SELECT
  TO anon, authenticated USING (true);


-- =============================================
-- RECRUITING CLASS RANKINGS
-- public read; writes via server only
-- =============================================
DROP POLICY IF EXISTS "class_rankings_select_public" ON public.recruiting_class_rankings;

CREATE POLICY "class_rankings_select_public" ON public.recruiting_class_rankings FOR SELECT
  TO anon, authenticated USING (true);


-- =============================================
-- LIVE GAMES
-- public read; writes via server only
-- =============================================
DROP POLICY IF EXISTS "live_games_select_public" ON public.live_games;

CREATE POLICY "live_games_select_public" ON public.live_games FOR SELECT
  TO anon, authenticated USING (true);


-- =============================================
-- PREGAME PREDICTIONS
-- authenticated insert own row;
-- read own row always; read all rows once game status = 'calculated'
-- =============================================
DROP POLICY IF EXISTS "pregame_insert_own"   ON public.pregame_predictions;
DROP POLICY IF EXISTS "pregame_select_own_or_calculated" ON public.pregame_predictions;

CREATE POLICY "pregame_insert_own" ON public.pregame_predictions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pregame_select_own_or_calculated" ON public.pregame_predictions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.live_games g
      WHERE g.id = game_id AND g.status = 'calculated'
    )
  );


-- =============================================
-- DRIVE PREDICTIONS
-- authenticated insert own row;
-- read own row always; read all rows once game status = 'calculated'
-- =============================================
DROP POLICY IF EXISTS "drive_pred_insert_own"               ON public.drive_predictions;
DROP POLICY IF EXISTS "drive_pred_select_own_or_calculated" ON public.drive_predictions;

CREATE POLICY "drive_pred_insert_own" ON public.drive_predictions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "drive_pred_select_own_or_calculated" ON public.drive_predictions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.live_games g
      WHERE g.id = game_id AND g.status = 'calculated'
    )
  );


-- =============================================
-- GAME LEADERBOARD
-- read-only for all; writes only via server/edge functions or triggers
-- =============================================
DROP POLICY IF EXISTS "leaderboard_select_public" ON public.game_leaderboard;

CREATE POLICY "leaderboard_select_public" ON public.game_leaderboard FOR SELECT
  TO anon, authenticated USING (true);


-- =============================================
-- USER BADGES
-- read-only for all; writes only via server/edge functions or triggers
-- =============================================
DROP POLICY IF EXISTS "badges_select_public" ON public.user_badges;

CREATE POLICY "badges_select_public" ON public.user_badges FOR SELECT
  TO anon, authenticated USING (true);


-- =============================================
-- FORUM THREADS
-- read all; authenticated insert
-- =============================================
DROP POLICY IF EXISTS "threads_select_public" ON public.forum_threads;
DROP POLICY IF EXISTS "threads_insert_auth"   ON public.forum_threads;

CREATE POLICY "threads_select_public" ON public.forum_threads FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "threads_insert_auth" ON public.forum_threads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);


-- =============================================
-- FORUM POSTS
-- read all; authenticated insert
-- =============================================
DROP POLICY IF EXISTS "posts_select_public" ON public.forum_posts;
DROP POLICY IF EXISTS "posts_insert_auth"   ON public.forum_posts;

CREATE POLICY "posts_select_public" ON public.forum_posts FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "posts_insert_auth" ON public.forum_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);


-- =============================================
-- FORUM REACTIONS
-- read all; authenticated insert
-- =============================================
DROP POLICY IF EXISTS "reactions_select_public" ON public.forum_reactions;
DROP POLICY IF EXISTS "reactions_insert_auth"   ON public.forum_reactions;

CREATE POLICY "reactions_select_public" ON public.forum_reactions FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "reactions_insert_auth" ON public.forum_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);


-- =============================================
-- TRIVIA QUESTIONS
-- public read; writes via admin/server only
-- =============================================
DROP POLICY IF EXISTS "trivia_select_public" ON public.trivia_questions;

CREATE POLICY "trivia_select_public" ON public.trivia_questions FOR SELECT
  TO anon, authenticated USING (true);


-- =============================================
-- USER TRIVIA RESPONSES
-- authenticated insert own; authenticated read own
-- =============================================
DROP POLICY IF EXISTS "trivia_resp_insert_own" ON public.user_trivia_responses;
DROP POLICY IF EXISTS "trivia_resp_select_own" ON public.user_trivia_responses;

CREATE POLICY "trivia_resp_insert_own" ON public.user_trivia_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trivia_resp_select_own" ON public.user_trivia_responses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);


-- =============================================
-- DAILY POLLS
-- public read; writes via admin/server only
-- =============================================
DROP POLICY IF EXISTS "daily_polls_select_public" ON public.daily_polls;

CREATE POLICY "daily_polls_select_public" ON public.daily_polls FOR SELECT
  TO anon, authenticated USING (true);


-- =============================================
-- USER POLL RESPONSES
-- authenticated insert own; public read (for displaying live vote tallies)
-- =============================================
DROP POLICY IF EXISTS "poll_resp_insert_own"   ON public.user_poll_responses;
DROP POLICY IF EXISTS "poll_resp_select_public" ON public.user_poll_responses;

CREATE POLICY "poll_resp_insert_own" ON public.user_poll_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "poll_resp_select_public" ON public.user_poll_responses FOR SELECT
  TO anon, authenticated USING (true);


-- =============================================
-- FAN POLLS
-- public read; authenticated insert own
-- =============================================
DROP POLICY IF EXISTS "fan_polls_select_public" ON public.fan_polls;
DROP POLICY IF EXISTS "fan_polls_insert_auth"   ON public.fan_polls;

CREATE POLICY "fan_polls_select_public" ON public.fan_polls FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "fan_polls_insert_auth" ON public.fan_polls FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);


-- =============================================
-- FAN POLL VOTES
-- public read (for tallying); authenticated insert own
-- =============================================
DROP POLICY IF EXISTS "fan_votes_select_public" ON public.fan_poll_votes;
DROP POLICY IF EXISTS "fan_votes_insert_auth"   ON public.fan_poll_votes;

CREATE POLICY "fan_votes_select_public" ON public.fan_poll_votes FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "fan_votes_insert_auth" ON public.fan_poll_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);


-- =============================================
-- USER FOLLOWS
-- public read (follower/following lists); authenticated insert/delete own
-- =============================================
DROP POLICY IF EXISTS "follows_select_public" ON public.user_follows;
DROP POLICY IF EXISTS "follows_insert_own"    ON public.user_follows;
DROP POLICY IF EXISTS "follows_delete_own"    ON public.user_follows;

CREATE POLICY "follows_select_public" ON public.user_follows FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "follows_insert_own" ON public.user_follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows_delete_own" ON public.user_follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);


-- =============================================
-- TOUCHDOWN VIDEOS
-- public read; writes via server only
-- =============================================
DROP POLICY IF EXISTS "td_videos_select_public" ON public.touchdown_videos;

CREATE POLICY "td_videos_select_public" ON public.touchdown_videos FOR SELECT
  TO anon, authenticated USING (true);


-- =============================================
-- REPORTS
-- authenticated insert; read + update restricted to is_admin = TRUE
-- =============================================
DROP POLICY IF EXISTS "reports_insert_auth"    ON public.reports;
DROP POLICY IF EXISTS "reports_select_admin"   ON public.reports;
DROP POLICY IF EXISTS "reports_update_admin"   ON public.reports;

CREATE POLICY "reports_insert_auth" ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "reports_select_admin" ON public.reports FOR SELECT
  TO authenticated
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "reports_update_admin" ON public.reports FOR UPDATE
  TO authenticated
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));


-- =============================================
-- SYSTEM HEALTH
-- read restricted to is_admin = TRUE; writes via server/Make.com (service role)
-- =============================================
DROP POLICY IF EXISTS "system_health_select_admin" ON public.system_health;

CREATE POLICY "system_health_select_admin" ON public.system_health FOR SELECT
  TO authenticated
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));
