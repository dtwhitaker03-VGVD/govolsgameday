-- The Live Game Stats panel's "Scoring Offense"/"Scoring Defense" rows were
-- sourced from ncaa_scoring_rankings (season-long national points-per-game,
-- synced daily from NCAA.com by scoring-rankings-sync) rather than from CFBD
-- or anything specific to the game in progress — on a panel otherwise made
-- of this-game box score numbers (rushing/passing/total yards, turnovers,
-- timeouts), that read as live-game stats but wasn't, and disagreed with the
-- actual score shown just above it. Replacing with First Downs and Time of
-- Possession, both real per-game box score stats CFBD's /games/teams
-- endpoint already reports (see live-cfbd-sync), matching the shape of the
-- other rows on this panel.
ALTER TABLE public.live_games
  ADD COLUMN IF NOT EXISTS home_first_downs      INTEGER,
  ADD COLUMN IF NOT EXISTS away_first_downs      INTEGER,
  ADD COLUMN IF NOT EXISTS home_possession_time  TEXT,
  ADD COLUMN IF NOT EXISTS away_possession_time  TEXT;
