-- Lets a weekly prop bet be auto-graded from CFBD data at finalize time,
-- instead of always requiring admin_grade_game_prop by hand. game_props
-- previously only had a free-text `description` ("Edwin Spillman Tackles"),
-- which can't be programmatically matched against CFBD's response shape —
-- these columns are the structured equivalent, confirmed against a real
-- CFBD /games/players and /games/teams response for a 2026 FBS game
-- (TCU @ North Carolina, gameId 401856766) on 2026-09-05, not guessed:
--
--   player scope  (/games/players): category is one of passing, rushing,
--   receiving, defensive, fumbles, kicking, punting, kickReturns,
--   puntReturns; stat_type is the type name within that category, e.g.
--   defensive -> TOT/SOLO/SACKS/TFL/PD/QB HUR/TD, receiving -> REC/YDS/AVG/
--   TD/LONG, rushing -> CAR/YDS/AVG/TD/LONG. player_name is matched
--   case-insensitively against CFBD's athlete name -- no fuzzy matching,
--   since a wrong guess would corrupt real scoring.
--
--   team scope (/games/teams): stat_category is one of CFBD's flat team
--   stat keys directly, e.g. sacks, tackles, interceptions, turnovers,
--   rushingYards, passingTDs, totalYards, tacklesForLoss. team_side picks
--   which side of the game the stat applies to, resolved against
--   live_games.home_team/away_team at grading time (not hardcoded to
--   Tennessee, so this still works for a non-Tennessee test game).
--
-- All columns are nullable and default NULL, so every existing prop keeps
-- working exactly as before (manual grading only) until it's edited to add
-- these fields via the admin UI.
ALTER TABLE public.game_props
  ADD COLUMN IF NOT EXISTS stat_scope    TEXT CHECK (stat_scope IN ('player', 'team')),
  ADD COLUMN IF NOT EXISTS stat_category TEXT,
  ADD COLUMN IF NOT EXISTS stat_type     TEXT,
  ADD COLUMN IF NOT EXISTS player_name   TEXT,
  ADD COLUMN IF NOT EXISTS team_side     TEXT CHECK (team_side IN ('home', 'away'));

COMMENT ON COLUMN public.game_props.stat_scope IS
  'player or team -- which CFBD endpoint/shape to match against for auto-grading. NULL = manual grading only.';
COMMENT ON COLUMN public.game_props.stat_category IS
  'CFBD category name: player scope uses /games/players category names (rushing, receiving, defensive, ...); team scope uses /games/teams flat stat keys (sacks, tackles, turnovers, ...).';
COMMENT ON COLUMN public.game_props.stat_type IS
  'Player scope only: the CFBD type name within stat_category (e.g. TOT, SACKS, REC, TD, YDS).';
COMMENT ON COLUMN public.game_props.player_name IS
  'Player scope only: matched case-insensitively against CFBD athlete.name. No fuzzy matching -- an unmatched name is left for manual grading.';
COMMENT ON COLUMN public.game_props.team_side IS
  'Team scope only: home or away, resolved against live_games.home_team/away_team at grading time.';

-- admin_upsert_game_prop: accept the new optional fields (all default NULL,
-- so existing calls that omit them are unaffected).
CREATE OR REPLACE FUNCTION public.admin_upsert_game_prop(
  p_id UUID DEFAULT NULL,
  p_game_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_line NUMERIC DEFAULT NULL,
  p_sort_order INTEGER DEFAULT 0,
  p_stat_scope TEXT DEFAULT NULL,
  p_stat_category TEXT DEFAULT NULL,
  p_stat_type TEXT DEFAULT NULL,
  p_player_name TEXT DEFAULT NULL,
  p_team_side TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id UUID;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT (SELECT COALESCE(is_admin, FALSE) FROM public.profiles WHERE id = auth.uid()) THEN
      RAISE EXCEPTION 'Unauthorized: admin access required.';
    END IF;
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE public.game_props
    SET description = p_description, line = p_line, sort_order = p_sort_order,
        stat_scope = p_stat_scope, stat_category = p_stat_category,
        stat_type = p_stat_type, player_name = p_player_name, team_side = p_team_side
    WHERE id = p_id
    RETURNING id INTO v_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Prop not found.'; END IF;
  ELSE
    IF p_game_id IS NULL THEN RAISE EXCEPTION 'game_id required for a new prop.'; END IF;
    INSERT INTO public.game_props (game_id, description, line, sort_order, stat_scope, stat_category, stat_type, player_name, team_side)
    VALUES (p_game_id, p_description, p_line, p_sort_order, p_stat_scope, p_stat_category, p_stat_type, p_player_name, p_team_side)
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;
