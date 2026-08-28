/*
# Badge Catalog (§31)

## Summary
Adds a `badges` table — the single source of truth for every badge's
display name, description, icon, track, and tier. Previously only bare
`badge_key` strings existed in `user_badges`; nothing defined what a badge
actually looks like. Seeds all 68 badges from §31: the 16 launch badges
(13 Gameday Prediction + 3 Forum Interaction) plus 52 additional badges
(37 general + 15 trivia) covering the six named legendary badges (The
Oracle, Iron Man, Perfect Saturday, Living Legend, Vol Scholar, Trivia
Iron Man).

## Changes
- New table `public.badges`: badge_key (PK), label, description, icon
  (a lucide-react icon name string — the frontend maps this to the actual
  component), track, tier ('standard' | 'legendary'), sort_order.
- RLS: public read, no write policies — same "read-only for all; writes
  only via server/edge functions or triggers" pattern already used for
  `game_leaderboard` and `user_badges`.

## Security
- No changes to existing tables. Read-only catalog data, safe for anon.
*/

CREATE TABLE IF NOT EXISTS public.badges (
  badge_key    VARCHAR(80) PRIMARY KEY,
  label        VARCHAR(100) NOT NULL,
  description  TEXT NOT NULL,
  icon         VARCHAR(40) NOT NULL,
  track        VARCHAR(30) NOT NULL,
  tier         VARCHAR(20) NOT NULL DEFAULT 'standard',
  sort_order   INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "badges_select_public" ON public.badges;
CREATE POLICY "badges_select_public" ON public.badges FOR SELECT
  TO anon, authenticated USING (true);

-- =============================================
-- GAMEDAY PREDICTION TRACK (13)
-- =============================================
INSERT INTO public.badges (badge_key, label, description, icon, track, tier, sort_order) VALUES
  ('picked_the_winner',        'Picked the Winner',        'Correctly predicted the winner of a game.',                          'Target',       'gameday', 'standard',  10),
  ('perfect_point_predictor',  'Perfect Point Predictor',  'Nailed both teams'' final score exactly.',                           'Crosshair',    'gameday', 'standard',  11),
  ('perfect_yardage_predictor','Perfect Yardage Predictor','Nailed both teams'' total yardage exactly.',                         'Ruler',        'gameday', 'standard',  12),
  ('hot_streak_3',             'Hot Streak x3',            '3 consecutive correct drive picks in one game.',                     'Flame',        'gameday', 'standard',  13),
  ('hot_streak_4',             'Hot Streak x4',            '4 consecutive correct drive picks in one game.',                     'Flame',        'gameday', 'standard',  14),
  ('hot_streak_5',             'Hot Streak x5',            '5 consecutive correct drive picks in one game.',                     'Flame',        'gameday', 'standard',  15),
  ('hot_streak_6_plus',        'Hot Streak x6+',           '6 or more consecutive correct drive picks in one game.',             'Flame',        'gameday', 'standard',  16),
  ('gameday_top_10',           'Gameday Top 10',           'Finished a game in the top 10 of the live leaderboard.',             'Medal',        'gameday', 'standard',  17),
  ('gameday_winner',           'Gameday Winner',           'Finished #1 on a game''s live leaderboard.',                         'Trophy',       'gameday', 'standard',  18),
  ('season_top_10',            'Season Top 10',            'Finished a season in the top 10 for a sport, site-wide.',            'Medal',        'gameday', 'standard',  19),
  ('season_champion',          'Season Champion',          'Finished #1 for a sport, site-wide, at season end.',                 'Crown',        'gameday', 'standard',  20),
  ('all_sport_top_10',         'All-Sport Top 10',         'Finished a year in the site-wide all-sport top 10.',                 'Award',        'gameday', 'standard',  21),
  ('all_sport_champion',       'All-Sport Champion',       'Finished #1 site-wide across all sports at year end.',               'Crown',        'gameday', 'standard',  22)
ON CONFLICT (badge_key) DO NOTHING;

-- =============================================
-- FORUM INTERACTION TRACK (3)
-- =============================================
INSERT INTO public.badges (badge_key, label, description, icon, track, tier, sort_order) VALUES
  ('new_thread_created', 'New Thread',    'Created your first forum thread.',                          'PenLine', 'forum', 'standard', 30),
  ('hot_thread',         'Hot Thread',    'One of your threads passed 1,000 views within 24 hours.',   'Flame',   'forum', 'standard', 31),
  ('going_viral_thread', 'Going Viral',   'One of your threads passed 10,000 views within 24 hours.',  'Rocket',  'forum', 'standard', 32)
ON CONFLICT (badge_key) DO NOTHING;

-- =============================================
-- GENERAL TRACK (37, additional — drafted, see §31 note on VGD_Additional_Badges.md)
-- =============================================
INSERT INTO public.badges (badge_key, label, description, icon, track, tier, sort_order) VALUES
  -- Points / rank milestones
  ('rookie_season',       'Rookie Season',        'Earned your first 100 points.',                              'Star',        'general', 'standard',  100),
  ('rising_star',         'Rising Star',          'Earned 500 total points.',                                   'TrendingUp',  'general', 'standard',  101),
  ('vol_veteran',         'Vol Veteran',          'Earned 1,500 total points.',                                 'Shield',      'general', 'standard',  102),
  ('all_sport_elite',     'All-Sport Elite',      'Earned 5,000 total points.',                                 'Award',       'general', 'standard',  103),
  ('living_legend',       'Living Legend',        'Earned 15,000 total points.',                                'Crown',       'general', 'legendary', 104),
  -- Forum posting
  ('first_reply',         'First Reply',          'Posted your first forum reply.',                             'MessageCircle','general','standard',  110),
  ('conversationalist',   'Conversationalist',    'Posted 25 forum replies.',                                   'MessagesSquare','general','standard', 111),
  ('forum_regular',       'Forum Regular',        'Posted 100 forum replies.',                                  'Users',       'general', 'standard',  112),
  ('thread_starter',      'Thread Starter',       'Created 5 forum threads.',                                   'PenLine',     'general', 'standard',  113),
  ('prolific_poster',     'Prolific Poster',      'Created 25 forum threads.',                                  'FileText',    'general', 'standard',  114),
  ('forum_veteran',       'Forum Veteran',        'Created 50 forum threads.',                                  'BookOpen',    'general', 'standard',  115),
  -- Reactions received
  ('well_liked',          'Well Liked',           'Received 50 reactions across your posts.',                   'Heart',       'general', 'standard',  120),
  ('crowd_favorite',      'Crowd Favorite',       'Received 250 reactions across your posts.',                  'Sparkles',    'general', 'standard',  121),
  ('beloved_by_vol_nation','Beloved by Vol Nation','Received 1,000 reactions across your posts.',                'HeartHandshake','general','standard', 122),
  ('big_brain_award',     'Big Brain Award',      'Received 25 Big Brain reactions.',                           'Brain',       'general', 'standard',  123),
  ('hot_take_haver',      'Hot Take Haver',       'Received 15 Fire Take reactions.',                           'Flame',       'general', 'standard',  124),
  -- Chat
  ('breaking_the_ice',    'Breaking the Ice',     'Sent your first chat message.',                              'MessageSquare','general','standard',  130),
  ('chatterbox',          'Chatterbox',           'Sent 250 chat messages.',                                    'MessagesSquare','general','standard', 131),
  ('town_hall_regular',   'Town Hall Regular',    'Sent 1,000 chat messages.',                                  'Radio',       'general', 'standard',  132),
  -- Social / follow
  ('making_friends',      'Making Friends',       'Followed 10 fans.',                                         'UserPlus',    'general', 'standard',  140),
  ('social_butterfly',    'Social Butterfly',     'Followed 50 fans.',                                         'Users2',      'general', 'standard',  141),
  ('popular_vol',         'Popular Vol',          'Followed by 10 fans.',                                      'UserCheck',   'general', 'standard',  142),
  ('vol_nation_celebrity','Vol Nation Celebrity',  'Followed by 100 fans.',                                     'Star',        'general', 'standard',  143),
  -- Predictions
  ('first_pick',          'First Pick',           'Submitted your first pregame prediction.',                   'Target',      'general', 'standard',  150),
  ('veteran_predictor',   'Veteran Predictor',    'Submitted pregame predictions for 10 games.',                'ClipboardCheck','general','standard', 151),
  ('drive_by_drive',      'Drive by Drive',       'Submitted 50 live drive predictions.',                       'Activity',    'general', 'standard',  152),
  ('drive_master',        'Drive Master',         'Submitted 250 live drive predictions.',                      'Zap',         'general', 'standard',  153),
  ('the_oracle',          'The Oracle',           'Correctly predicted 500 live drives.',                       'Eye',         'general', 'legendary', 154),
  ('perfect_saturday',    'Perfect Saturday',     'Hit the winner, both exact scores, and both exact yardage totals in one game.', 'Gem', 'general', 'legendary', 155),
  ('iron_man',            'Iron Man',             'Predicted every single drive of a completed game.',          'Dumbbell',    'general', 'legendary', 156),
  -- Polls
  ('first_vote',          'First Vote',           'Voted in your first daily poll.',                            'CheckSquare', 'general', 'standard',  160),
  ('civic_duty',          'Civic Duty',           'Voted in 50 daily polls.',                                   'Vote',        'general', 'standard',  161),
  ('poll_creator',        'Poll Creator',         'Created your first fan poll.',                               'PlusSquare',  'general', 'standard',  162),
  ('democracy_in_action', 'Democracy in Action',  'A fan poll you created reached 50 votes.',                   'BarChart3',   'general', 'standard',  163),
  -- Community / membership
  ('founding_member',     'Founding Member',      'One of the first 100 GoVolsGameDay accounts.',               'Landmark',    'general', 'standard',  170),
  ('one_year_vol',        'One Year Vol',         'Member for a full year.',                                    'CalendarCheck','general','standard',  171),
  ('quotable',            'Quotable',             'Had one of your posts quoted 10 times.',                     'Quote',       'general', 'standard',  172)
ON CONFLICT (badge_key) DO NOTHING;

-- =============================================
-- TRIVIA TRACK (15, additional — drafted)
-- =============================================
INSERT INTO public.badges (badge_key, label, description, icon, track, tier, sort_order) VALUES
  ('trivia_first_try',      'First Try',              'Completed your first Daily Vol Trivia.',                  'Brain',         'trivia', 'standard',  200),
  ('trivia_perfect',        'Perfect Score',           'Scored 100/100 on a single day''s trivia.',               'Trophy',        'trivia', 'standard',  201),
  ('trivia_perfectionist',  'Perfectionist',           'Scored 100/100 on 10 separate days.',                     'Medal',         'trivia', 'standard',  202),
  ('trivia_streak_3',       'Trivia Streak x3',        'Played 3 days of trivia in a row.',                       'Flame',         'trivia', 'standard',  203),
  ('trivia_streak_7',       'Trivia Streak x7',        'Played 7 days of trivia in a row.',                       'Flame',         'trivia', 'standard',  204),
  ('trivia_streak_30',      'Trivia Streak x30',       'Played 30 days of trivia in a row.',                      'CalendarClock', 'trivia', 'standard',  205),
  ('trivia_streak_100',     'Trivia Streak x100',      'Played 100 days of trivia in a row.',                     'CalendarClock', 'trivia', 'standard',  206),
  ('trivia_century',        'Trivia Century',          'Earned 1,000 cumulative trivia points.',                  'Award',         'trivia', 'standard',  207),
  ('trivia_iron_man',       'Trivia Iron Man',         'Reached a 200-day trivia streak.',                        'Dumbbell',      'trivia', 'legendary', 208),
  ('football_scholar',      'Football Scholar',        'Answered 50 Vol Football History questions correctly.',   'GraduationCap', 'trivia', 'standard',  209),
  ('hoops_historian',       'Hoops Historian',         'Answered 30 Vol Basketball History questions correctly.', 'GraduationCap', 'trivia', 'standard',  210),
  ('diamond_scholar',       'Diamond Scholar',         'Answered 30 Vol Baseball History questions correctly.',   'GraduationCap', 'trivia', 'standard',  211),
  ('lady_vols_historian',   'Lady Vols Historian',     'Answered 30 Lady Vols History questions correctly.',      'GraduationCap', 'trivia', 'standard',  212),
  ('sec_savant',            'SEC Savant',              'Answered 30 SEC Knowledge questions correctly.',          'GraduationCap', 'trivia', 'standard',  213),
  ('vol_scholar',           'Vol Scholar',             'Earned 10,000 cumulative trivia points.',                 'Sparkles',      'trivia', 'legendary', 214)
ON CONFLICT (badge_key) DO NOTHING;
