-- Lets an admin pin a game's betting lines against the weekly CFBD refresh
-- (game-sync). First use: Tennessee at South Carolina (2026-10-24), where
-- ESPN/DraftKings, and therefore CFBD, had home and away swapped (showed
-- SC -2.5 / ML SC -122 while FanDuel, Vegas Insider and ESPN's own opening
-- line had Tennessee favored by 1.5-2.5). While lines_manual is true, updates
-- cannot change spread_line_tn / total_points_line / lines_provider /
-- lines_captured_at; an update that sets lines_manual = false (or any update
-- before the flag is set) is unaffected.
ALTER TABLE public.live_games
  ADD COLUMN IF NOT EXISTS lines_manual BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.keep_manual_lines()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.lines_manual AND NEW.lines_manual THEN
    NEW.spread_line_tn     := OLD.spread_line_tn;
    NEW.total_points_line  := OLD.total_points_line;
    NEW.lines_provider     := OLD.lines_provider;
    NEW.lines_captured_at  := OLD.lines_captured_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS live_games_keep_manual_lines ON public.live_games;
CREATE TRIGGER live_games_keep_manual_lines
  BEFORE UPDATE ON public.live_games
  FOR EACH ROW EXECUTE FUNCTION public.keep_manual_lines();
