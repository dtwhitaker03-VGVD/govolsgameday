-- Live Game Stats panel expansion (2026-08-29 live test): rushing yards,
-- passing yards, turnovers, and timeouts remaining per team, computed by
-- live-cfbd-sync from CFBD's play-by-play data.

ALTER TABLE public.live_games
  ADD COLUMN IF NOT EXISTS home_rushing_yards      INTEGER,
  ADD COLUMN IF NOT EXISTS away_rushing_yards      INTEGER,
  ADD COLUMN IF NOT EXISTS home_passing_yards      INTEGER,
  ADD COLUMN IF NOT EXISTS away_passing_yards      INTEGER,
  ADD COLUMN IF NOT EXISTS home_turnovers          INTEGER,
  ADD COLUMN IF NOT EXISTS away_turnovers          INTEGER,
  ADD COLUMN IF NOT EXISTS home_timeouts_remaining INTEGER,
  ADD COLUMN IF NOT EXISTS away_timeouts_remaining INTEGER;
