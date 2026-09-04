-- admin_update_game only ever accepted status + score, because every game
-- so far relied on live-cfbd-sync to populate the rest (quarter, clock,
-- possession, down/distance, yards, turnovers, timeouts). A
-- manual_control game (e.g. an admin test game) has no such feed, so
-- there was literally no way to get anything into LiveGameStatsPanel
-- beyond the scoreboard. Add the rest of the display fields as optional
-- params (default NULL, COALESCE'd against the existing value) so
-- existing callers passing just status/score are unaffected.
CREATE OR REPLACE FUNCTION public.admin_update_game(
  p_game_id uuid,
  p_status text,
  p_home_score integer,
  p_away_score integer,
  p_current_quarter integer DEFAULT NULL,
  p_game_clock text DEFAULT NULL,
  p_possession text DEFAULT NULL,
  p_down integer DEFAULT NULL,
  p_distance integer DEFAULT NULL,
  p_yardline integer DEFAULT NULL,
  p_home_total_yards integer DEFAULT NULL,
  p_away_total_yards integer DEFAULT NULL,
  p_home_rushing_yards integer DEFAULT NULL,
  p_away_rushing_yards integer DEFAULT NULL,
  p_home_passing_yards integer DEFAULT NULL,
  p_away_passing_yards integer DEFAULT NULL,
  p_home_turnovers integer DEFAULT NULL,
  p_away_turnovers integer DEFAULT NULL,
  p_home_timeouts_remaining integer DEFAULT NULL,
  p_away_timeouts_remaining integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
IF auth.uid() IS NOT NULL THEN
IF NOT (SELECT COALESCE(is_admin, FALSE) FROM public.profiles WHERE id = auth.uid()) THEN
RAISE EXCEPTION 'Unauthorized: admin access required.';
END IF;
END IF;

UPDATE public.live_games
SET
status                    = p_status,
home_score                = p_home_score,
away_score                = p_away_score,
current_quarter           = COALESCE(p_current_quarter, current_quarter),
game_clock                = COALESCE(p_game_clock, game_clock),
possession                = COALESCE(p_possession, possession),
down                       = COALESCE(p_down, down),
distance                   = COALESCE(p_distance, distance),
yardline                   = COALESCE(p_yardline, yardline),
home_total_yards           = COALESCE(p_home_total_yards, home_total_yards),
away_total_yards           = COALESCE(p_away_total_yards, away_total_yards),
home_rushing_yards         = COALESCE(p_home_rushing_yards, home_rushing_yards),
away_rushing_yards         = COALESCE(p_away_rushing_yards, away_rushing_yards),
home_passing_yards         = COALESCE(p_home_passing_yards, home_passing_yards),
away_passing_yards         = COALESCE(p_away_passing_yards, away_passing_yards),
home_turnovers             = COALESCE(p_home_turnovers, home_turnovers),
away_turnovers             = COALESCE(p_away_turnovers, away_turnovers),
home_timeouts_remaining    = COALESCE(p_home_timeouts_remaining, home_timeouts_remaining),
away_timeouts_remaining    = COALESCE(p_away_timeouts_remaining, away_timeouts_remaining),
updated_at                 = NOW()
WHERE id = p_game_id;

IF NOT FOUND THEN
RAISE EXCEPTION 'Game not found.';
END IF;
END;
$function$;
