-- The 3 TN stat guesses (rushing/receiving TDs, turnovers forced) were
-- hard-required on every pregame prediction regardless of whether the
-- game actually involves Tennessee. Loosen them to the same "validated
-- only if provided" pattern already used for spread_pick/total_pick, so
-- a game with no Tennessee team (e.g. an admin test game) can omit them.
-- Real Tennessee games are unaffected: the frontend still always sends
-- real values for those games and validates them client-side first.

CREATE OR REPLACE FUNCTION public.submit_pregame_prediction(
  p_game_id uuid,
  p_predicted_winner character varying,
  p_home_score integer,
  p_away_score integer,
  p_home_yards integer,
  p_away_yards integer,
  p_spread_pick text DEFAULT NULL::text,
  p_total_pick text DEFAULT NULL::text,
  p_tn_rushing_tds integer DEFAULT NULL::integer,
  p_tn_receiving_tds integer DEFAULT NULL::integer,
  p_tn_turnovers_forced integer DEFAULT NULL::integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_game       RECORD;
  v_lock_time  TIMESTAMPTZ;
  v_game_count INTEGER;
BEGIN
  SELECT id, kickoff_time, status, spread_line_tn, total_points_line
    INTO v_game
  FROM public.live_games WHERE id = p_game_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Game not found.'; END IF;

  v_lock_time := v_game.kickoff_time - INTERVAL '10 minutes';
  IF NOW() >= v_lock_time THEN
    RAISE EXCEPTION 'Pre-game predictions are locked for this game.';
  END IF;

  IF p_predicted_winner NOT IN ('home', 'away') THEN
    RAISE EXCEPTION 'Invalid winner choice.';
  END IF;

  IF p_home_score < 0 OR p_home_score > 99
  OR p_away_score < 0 OR p_away_score > 99 THEN
    RAISE EXCEPTION 'Scores must be 0–99.';
  END IF;
  IF p_home_yards < 0 OR p_home_yards > 999
  OR p_away_yards < 0 OR p_away_yards > 999 THEN
    RAISE EXCEPTION 'Yards must be 0–999.';
  END IF;

  -- Spread pick: only valid when a line has actually been captured.
  IF p_spread_pick IS NOT NULL THEN
    IF p_spread_pick NOT IN ('over', 'under') THEN
      RAISE EXCEPTION 'Invalid spread pick.';
    END IF;
    IF v_game.spread_line_tn IS NULL THEN
      RAISE EXCEPTION 'No spread line is available for this game yet.';
    END IF;
  END IF;

  -- Total points pick: same rule.
  IF p_total_pick IS NOT NULL THEN
    IF p_total_pick NOT IN ('over', 'under') THEN
      RAISE EXCEPTION 'Invalid total points pick.';
    END IF;
    IF v_game.total_points_line IS NULL THEN
      RAISE EXCEPTION 'No total points line is available for this game yet.';
    END IF;
  END IF;

  -- The 3 exact-integer guesses are optional (e.g. a game with no
  -- Tennessee team won't have them) but sanity-bounded when provided.
  IF p_tn_rushing_tds IS NOT NULL AND (p_tn_rushing_tds < 0 OR p_tn_rushing_tds > 10) THEN
    RAISE EXCEPTION 'TN rushing TDs must be 0–10.';
  END IF;
  IF p_tn_receiving_tds IS NOT NULL AND (p_tn_receiving_tds < 0 OR p_tn_receiving_tds > 10) THEN
    RAISE EXCEPTION 'TN receiving TDs must be 0–10.';
  END IF;
  IF p_tn_turnovers_forced IS NOT NULL AND (p_tn_turnovers_forced < 0 OR p_tn_turnovers_forced > 10) THEN
    RAISE EXCEPTION 'TN turnovers forced must be 0–10.';
  END IF;

  INSERT INTO public.pregame_predictions (
    game_id, user_id,
    predicted_winner, predicted_home_score, predicted_away_score,
    predicted_home_yards, predicted_away_yards,
    predicted_spread_pick, predicted_total_pick,
    predicted_tn_rushing_tds, predicted_tn_receiving_tds, predicted_tn_turnovers_forced
  ) VALUES (
    p_game_id, auth.uid(),
    p_predicted_winner, p_home_score, p_away_score,
    p_home_yards, p_away_yards,
    p_spread_pick, p_total_pick,
    p_tn_rushing_tds, p_tn_receiving_tds, p_tn_turnovers_forced
  )
  ON CONFLICT (game_id, user_id) DO UPDATE SET
    predicted_winner              = EXCLUDED.predicted_winner,
    predicted_home_score          = EXCLUDED.predicted_home_score,
    predicted_away_score          = EXCLUDED.predicted_away_score,
    predicted_home_yards          = EXCLUDED.predicted_home_yards,
    predicted_away_yards          = EXCLUDED.predicted_away_yards,
    predicted_spread_pick         = EXCLUDED.predicted_spread_pick,
    predicted_total_pick          = EXCLUDED.predicted_total_pick,
    predicted_tn_rushing_tds      = EXCLUDED.predicted_tn_rushing_tds,
    predicted_tn_receiving_tds    = EXCLUDED.predicted_tn_receiving_tds,
    predicted_tn_turnovers_forced = EXCLUDED.predicted_tn_turnovers_forced,
    submitted_at                  = NOW();

  SELECT COUNT(*) INTO v_game_count FROM public.pregame_predictions WHERE user_id = auth.uid();
  IF v_game_count = 1 THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (auth.uid(), 'first_pick')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  ELSIF v_game_count = 10 THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (auth.uid(), 'veteran_predictor')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_pregame_prediction(
  p_game_id uuid,
  p_predicted_winner character varying,
  p_home_score integer,
  p_away_score integer,
  p_home_yards integer,
  p_away_yards integer,
  p_spread_pick text DEFAULT NULL::text,
  p_total_pick text DEFAULT NULL::text,
  p_tn_rushing_tds integer DEFAULT NULL::integer,
  p_tn_receiving_tds integer DEFAULT NULL::integer,
  p_tn_turnovers_forced integer DEFAULT NULL::integer,
  p_prop_picks jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_game       RECORD;
  v_lock_time  TIMESTAMPTZ;
  v_game_count INTEGER;
  v_prop_pick  RECORD;
BEGIN
  SELECT id, kickoff_time, status, spread_line_tn, total_points_line
    INTO v_game
  FROM public.live_games WHERE id = p_game_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Game not found.'; END IF;

  v_lock_time := v_game.kickoff_time - INTERVAL '10 minutes';
  IF NOW() >= v_lock_time THEN
    RAISE EXCEPTION 'Pre-game predictions are locked for this game.';
  END IF;

  IF p_predicted_winner NOT IN ('home', 'away') THEN
    RAISE EXCEPTION 'Invalid winner choice.';
  END IF;

  IF p_home_score < 0 OR p_home_score > 99
  OR p_away_score < 0 OR p_away_score > 99 THEN
    RAISE EXCEPTION 'Scores must be 0–99.';
  END IF;
  IF p_home_yards < 0 OR p_home_yards > 999
  OR p_away_yards < 0 OR p_away_yards > 999 THEN
    RAISE EXCEPTION 'Yards must be 0–999.';
  END IF;

  IF p_spread_pick IS NOT NULL THEN
    IF p_spread_pick NOT IN ('over', 'under') THEN
      RAISE EXCEPTION 'Invalid spread pick.';
    END IF;
    IF v_game.spread_line_tn IS NULL THEN
      RAISE EXCEPTION 'No spread line is available for this game yet.';
    END IF;
  END IF;

  IF p_total_pick IS NOT NULL THEN
    IF p_total_pick NOT IN ('over', 'under') THEN
      RAISE EXCEPTION 'Invalid total points pick.';
    END IF;
    IF v_game.total_points_line IS NULL THEN
      RAISE EXCEPTION 'No total points line is available for this game yet.';
    END IF;
  END IF;

  IF p_tn_rushing_tds IS NOT NULL AND (p_tn_rushing_tds < 0 OR p_tn_rushing_tds > 10) THEN
    RAISE EXCEPTION 'TN rushing TDs must be 0–10.';
  END IF;
  IF p_tn_receiving_tds IS NOT NULL AND (p_tn_receiving_tds < 0 OR p_tn_receiving_tds > 10) THEN
    RAISE EXCEPTION 'TN receiving TDs must be 0–10.';
  END IF;
  IF p_tn_turnovers_forced IS NOT NULL AND (p_tn_turnovers_forced < 0 OR p_tn_turnovers_forced > 10) THEN
    RAISE EXCEPTION 'TN turnovers forced must be 0–10.';
  END IF;

  INSERT INTO public.pregame_predictions (
    game_id, user_id,
    predicted_winner, predicted_home_score, predicted_away_score,
    predicted_home_yards, predicted_away_yards,
    predicted_spread_pick, predicted_total_pick,
    predicted_tn_rushing_tds, predicted_tn_receiving_tds, predicted_tn_turnovers_forced
  ) VALUES (
    p_game_id, auth.uid(),
    p_predicted_winner, p_home_score, p_away_score,
    p_home_yards, p_away_yards,
    p_spread_pick, p_total_pick,
    p_tn_rushing_tds, p_tn_receiving_tds, p_tn_turnovers_forced
  )
  ON CONFLICT (game_id, user_id) DO UPDATE SET
    predicted_winner              = EXCLUDED.predicted_winner,
    predicted_home_score          = EXCLUDED.predicted_home_score,
    predicted_away_score          = EXCLUDED.predicted_away_score,
    predicted_home_yards          = EXCLUDED.predicted_home_yards,
    predicted_away_yards          = EXCLUDED.predicted_away_yards,
    predicted_spread_pick         = EXCLUDED.predicted_spread_pick,
    predicted_total_pick          = EXCLUDED.predicted_total_pick,
    predicted_tn_rushing_tds      = EXCLUDED.predicted_tn_rushing_tds,
    predicted_tn_receiving_tds    = EXCLUDED.predicted_tn_receiving_tds,
    predicted_tn_turnovers_forced = EXCLUDED.predicted_tn_turnovers_forced,
    submitted_at                  = NOW();

  IF p_prop_picks IS NOT NULL AND jsonb_array_length(p_prop_picks) > 0 THEN
    FOR v_prop_pick IN SELECT * FROM jsonb_to_recordset(p_prop_picks) AS x(prop_id uuid, pick text) LOOP
      IF v_prop_pick.pick NOT IN ('over', 'under') THEN
        RAISE EXCEPTION 'Invalid prop pick.';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.game_props WHERE id = v_prop_pick.prop_id AND game_id = p_game_id) THEN
        RAISE EXCEPTION 'Invalid prop for this game.';
      END IF;

      INSERT INTO public.pregame_prop_picks (prop_id, game_id, user_id, pick)
      VALUES (v_prop_pick.prop_id, p_game_id, auth.uid(), v_prop_pick.pick)
      ON CONFLICT (prop_id, user_id) DO UPDATE SET
        pick = EXCLUDED.pick,
        submitted_at = NOW();
    END LOOP;
  END IF;

  SELECT COUNT(*) INTO v_game_count FROM public.pregame_predictions WHERE user_id = auth.uid();
  IF v_game_count = 1 THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (auth.uid(), 'first_pick')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  ELSIF v_game_count = 10 THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (auth.uid(), 'veteran_predictor')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;
END;
$function$;
