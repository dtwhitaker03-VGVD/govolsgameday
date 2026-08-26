/*
# New Pregame Prediction Categories — Schema

## Summary
Adds the columns needed for 5 new pregame prediction categories, each
scored flat 100 pts correct / 0 pts wrong (no partial credit, unlike the
existing distance-based winner/score/yards categories): Spread O/U, Total
Points O/U, TN Rushing TDs, TN Receiving TDs, TN Turnovers Forced. Raises
the per-game pregame max from 1,000 to 1,500 once calculate_pregame_points
is updated in the follow-up RPC migration.

## Changes
- `live_games`: the captured betting line (TN-relative spread + total
  points) and CFBD-sourced actual post-game stats (rushing/receiving TDs,
  turnovers forced) needed to grade the 5 new categories.
- `pregame_predictions`: the 5 new predicted picks + 10 grading-output
  columns (correct/points per category), mirroring the existing
  winner_correct/home_score_points pattern.

All new columns are nullable — a betting line may not exist yet when a
game enters live_games (graceful degradation: those 2 categories are
simply hidden on the form until captured), and existing
pregame_predictions rows can't be retroactively backfilled anyway.
Mandatory-ness for the 3 exact-guess picks going forward is enforced in
submit_pregame_prediction (next migration), not at the schema level.
*/

-- ── live_games: captured line + actual post-game stats ──────────────────────

ALTER TABLE public.live_games
  ADD COLUMN IF NOT EXISTS spread_line_tn      NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS total_points_line   NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS lines_provider      TEXT,
  ADD COLUMN IF NOT EXISTS lines_captured_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tn_rushing_tds      INTEGER,
  ADD COLUMN IF NOT EXISTS tn_receiving_tds    INTEGER,
  ADD COLUMN IF NOT EXISTS tn_turnovers_forced INTEGER;

COMMENT ON COLUMN public.live_games.spread_line_tn IS
  'Betting spread normalized Tennessee-relative: negative = TN favored. NULL = no line captured yet.';
COMMENT ON COLUMN public.live_games.total_points_line IS
  'Betting total-points (over/under) line. NULL = no line captured yet.';
COMMENT ON COLUMN public.live_games.tn_turnovers_forced IS
  'Turnovers forced BY Tennessee = the opponent''s own turnovers stat for this game.';

-- ── pregame_predictions: 5 new picks + 10 grading-output columns ────────────

ALTER TABLE public.pregame_predictions
  ADD COLUMN IF NOT EXISTS predicted_spread_pick        TEXT,
  ADD COLUMN IF NOT EXISTS predicted_total_pick         TEXT,
  ADD COLUMN IF NOT EXISTS predicted_tn_rushing_tds      INTEGER,
  ADD COLUMN IF NOT EXISTS predicted_tn_receiving_tds    INTEGER,
  ADD COLUMN IF NOT EXISTS predicted_tn_turnovers_forced INTEGER,
  ADD COLUMN IF NOT EXISTS spread_pick_correct          BOOLEAN,
  ADD COLUMN IF NOT EXISTS spread_pick_points           INTEGER,
  ADD COLUMN IF NOT EXISTS total_pick_correct           BOOLEAN,
  ADD COLUMN IF NOT EXISTS total_pick_points            INTEGER,
  ADD COLUMN IF NOT EXISTS tn_rushing_tds_correct       BOOLEAN,
  ADD COLUMN IF NOT EXISTS tn_rushing_tds_points        INTEGER,
  ADD COLUMN IF NOT EXISTS tn_receiving_tds_correct     BOOLEAN,
  ADD COLUMN IF NOT EXISTS tn_receiving_tds_points      INTEGER,
  ADD COLUMN IF NOT EXISTS tn_turnovers_forced_correct  BOOLEAN,
  ADD COLUMN IF NOT EXISTS tn_turnovers_forced_points   INTEGER;

ALTER TABLE public.pregame_predictions DROP CONSTRAINT IF EXISTS pregame_predictions_spread_pick_check;
ALTER TABLE public.pregame_predictions
  ADD CONSTRAINT pregame_predictions_spread_pick_check
    CHECK (predicted_spread_pick IS NULL OR predicted_spread_pick IN ('over', 'under'));

ALTER TABLE public.pregame_predictions DROP CONSTRAINT IF EXISTS pregame_predictions_total_pick_check;
ALTER TABLE public.pregame_predictions
  ADD CONSTRAINT pregame_predictions_total_pick_check
    CHECK (predicted_total_pick IS NULL OR predicted_total_pick IN ('over', 'under'));
