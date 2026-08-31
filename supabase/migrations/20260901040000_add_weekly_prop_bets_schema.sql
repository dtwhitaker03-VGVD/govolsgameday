-- Generic, admin-configurable weekly prop bets (player/team over-under
-- lines that change every week -- e.g. "DeSean Bishop TDs 2.5"). Spread and
-- Total Points keep their existing dedicated columns/CFBD-line pipeline
-- (live_games.spread_line_tn/total_points_line, pregame_predictions.
-- predicted_spread_pick/predicted_total_pick) untouched -- this table is
-- only for the manually-entered player/team props, which the frontend
-- displays merged into the same Over/Under table as spread and total.

CREATE TABLE public.game_props (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id       UUID NOT NULL REFERENCES public.live_games(id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  description   TEXT NOT NULL,
  line          NUMERIC(5,1) NOT NULL,
  points_value  INTEGER NOT NULL DEFAULT 100,
  actual_value  NUMERIC(6,1),
  actual_result TEXT CHECK (actual_result IN ('over', 'under', 'push')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.game_props ENABLE ROW LEVEL SECURITY;

CREATE POLICY game_props_select_public ON public.game_props
  FOR SELECT USING (true);

CREATE TABLE public.pregame_prop_picks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prop_id       UUID NOT NULL REFERENCES public.game_props(id) ON DELETE CASCADE,
  game_id       UUID NOT NULL REFERENCES public.live_games(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pick          TEXT NOT NULL CHECK (pick IN ('over', 'under')),
  correct       BOOLEAN,
  points_earned INTEGER NOT NULL DEFAULT 0,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (prop_id, user_id)
);

ALTER TABLE public.pregame_prop_picks ENABLE ROW LEVEL SECURITY;

CREATE POLICY prop_picks_insert_own ON public.pregame_prop_picks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY prop_picks_select_own_or_calculated ON public.pregame_prop_picks
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.live_games g WHERE g.id = pregame_prop_picks.game_id AND g.status = 'calculated')
  );

-- ── Admin management RPCs ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_upsert_game_prop(
  p_id UUID DEFAULT NULL,
  p_game_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_line NUMERIC DEFAULT NULL,
  p_sort_order INTEGER DEFAULT 0
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
    SET description = p_description, line = p_line, sort_order = p_sort_order
    WHERE id = p_id
    RETURNING id INTO v_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Prop not found.'; END IF;
  ELSE
    IF p_game_id IS NULL THEN RAISE EXCEPTION 'game_id required for a new prop.'; END IF;
    INSERT INTO public.game_props (game_id, description, line, sort_order)
    VALUES (p_game_id, p_description, p_line, p_sort_order)
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_game_prop(p_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT (SELECT COALESCE(is_admin, FALSE) FROM public.profiles WHERE id = auth.uid()) THEN
      RAISE EXCEPTION 'Unauthorized: admin access required.';
    END IF;
  END IF;

  DELETE FROM public.game_props WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Prop not found.'; END IF;
END;
$$;

-- Grades one prop against a manually-entered actual stat value (CFBD box
-- scores don't cover most player-level props like tackles or receptions).
-- An exact match on the line is a push -- no one scores it, matching the
-- existing spread/total push-to-zero convention in calculate_pregame_points.
CREATE OR REPLACE FUNCTION public.admin_grade_game_prop(p_id UUID, p_actual_value NUMERIC)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_line NUMERIC; v_result TEXT;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT (SELECT COALESCE(is_admin, FALSE) FROM public.profiles WHERE id = auth.uid()) THEN
      RAISE EXCEPTION 'Unauthorized: admin access required.';
    END IF;
  END IF;

  SELECT line INTO v_line FROM public.game_props WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Prop not found.'; END IF;

  v_result := CASE
    WHEN p_actual_value > v_line THEN 'over'
    WHEN p_actual_value < v_line THEN 'under'
    ELSE 'push'
  END;

  UPDATE public.game_props
  SET actual_value = p_actual_value, actual_result = v_result
  WHERE id = p_id;
END;
$$;

-- ── submit_pregame_prediction: accept this game's prop picks too ───────────

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
AS $$
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

  IF p_tn_rushing_tds IS NULL OR p_tn_rushing_tds < 0 OR p_tn_rushing_tds > 10 THEN
    RAISE EXCEPTION 'TN rushing TDs must be 0–10.';
  END IF;
  IF p_tn_receiving_tds IS NULL OR p_tn_receiving_tds < 0 OR p_tn_receiving_tds > 10 THEN
    RAISE EXCEPTION 'TN receiving TDs must be 0–10.';
  END IF;
  IF p_tn_turnovers_forced IS NULL OR p_tn_turnovers_forced < 0 OR p_tn_turnovers_forced > 10 THEN
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
$$;

-- ── calculate_pregame_points: grade + fold in prop points ──────────────────

CREATE OR REPLACE FUNCTION public.calculate_pregame_points(p_game_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  game RECORD;
  pred RECORD;
  w_pts  INTEGER;
  hs_pts INTEGER; hs_bonus INTEGER;
  as_pts INTEGER; as_bonus INTEGER;
  hy_pts INTEGER; hy_bonus INTEGER;
  ay_pts INTEGER; ay_bonus INTEGER;
  v_tn_margin    INTEGER;
  v_total_actual INTEGER;
  sp_pts    INTEGER;
  tot_pts   INTEGER;
  rtd_pts   INTEGER;
  rectd_pts INTEGER;
  tof_pts   INTEGER;
  prop_pts  INTEGER;
  total  INTEGER;
BEGIN
  SELECT * INTO game FROM public.live_games WHERE id = p_game_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Grade every picked prop against whatever this game's props are
  -- currently graded to (admin_grade_game_prop sets actual_result).
  -- Ungraded props (actual_result IS NULL) are simply left untouched --
  -- points_earned stays at its 0 default, scoring no one either way.
  UPDATE public.pregame_prop_picks ppp
  SET correct       = (gp.actual_result <> 'push' AND ppp.pick = gp.actual_result),
      points_earned = CASE WHEN gp.actual_result <> 'push' AND ppp.pick = gp.actual_result THEN gp.points_value ELSE 0 END
  FROM public.game_props gp
  WHERE ppp.prop_id = gp.id
    AND gp.game_id = p_game_id
    AND gp.actual_result IS NOT NULL;

  FOR pred IN SELECT * FROM public.pregame_predictions WHERE game_id = p_game_id LOOP
    w_pts := CASE
      WHEN pred.predicted_winner = 'home' AND game.home_score > game.away_score THEN 100
      WHEN pred.predicted_winner = 'away' AND game.away_score > game.home_score THEN 100
      ELSE 0
    END;

    hs_pts   := GREATEST(0, 100 - (5 * ABS(pred.predicted_home_score - game.home_score)));
    hs_bonus := CASE WHEN pred.predicted_home_score = game.home_score THEN 50 ELSE 0 END;

    as_pts   := GREATEST(0, 100 - (5 * ABS(pred.predicted_away_score - game.away_score)));
    as_bonus := CASE WHEN pred.predicted_away_score = game.away_score THEN 50 ELSE 0 END;

    hy_pts   := GREATEST(0, 200 - ABS(pred.predicted_home_yards - COALESCE(game.home_total_yards, 0)));
    hy_bonus := CASE WHEN pred.predicted_home_yards = COALESCE(game.home_total_yards, 0) THEN 100 ELSE 0 END;

    ay_pts   := GREATEST(0, 200 - ABS(pred.predicted_away_yards - COALESCE(game.away_total_yards, 0)));
    ay_bonus := CASE WHEN pred.predicted_away_yards = COALESCE(game.away_total_yards, 0) THEN 100 ELSE 0 END;

    v_tn_margin := CASE
      WHEN game.home_team = 'Tennessee' THEN game.home_score - game.away_score
      ELSE game.away_score - game.home_score
    END;
    v_total_actual := game.home_score + game.away_score;

    IF game.spread_line_tn IS NOT NULL AND pred.predicted_spread_pick IS NOT NULL THEN
      sp_pts := CASE
        WHEN (v_tn_margin + game.spread_line_tn) > 0 AND pred.predicted_spread_pick = 'over'  THEN 100
        WHEN (v_tn_margin + game.spread_line_tn) < 0 AND pred.predicted_spread_pick = 'under' THEN 100
        ELSE 0
      END;
    ELSE
      sp_pts := 0;
    END IF;

    IF game.total_points_line IS NOT NULL AND pred.predicted_total_pick IS NOT NULL THEN
      tot_pts := CASE
        WHEN v_total_actual > game.total_points_line AND pred.predicted_total_pick = 'over'  THEN 100
        WHEN v_total_actual < game.total_points_line AND pred.predicted_total_pick = 'under' THEN 100
        ELSE 0
      END;
    ELSE
      tot_pts := 0;
    END IF;

    rtd_pts := CASE
      WHEN game.tn_rushing_tds IS NOT NULL AND pred.predicted_tn_rushing_tds = game.tn_rushing_tds THEN 100
      ELSE 0
    END;
    rectd_pts := CASE
      WHEN game.tn_receiving_tds IS NOT NULL AND pred.predicted_tn_receiving_tds = game.tn_receiving_tds THEN 100
      ELSE 0
    END;
    tof_pts := CASE
      WHEN game.tn_turnovers_forced IS NOT NULL AND pred.predicted_tn_turnovers_forced = game.tn_turnovers_forced THEN 100
      ELSE 0
    END;

    SELECT COALESCE(SUM(points_earned), 0) INTO prop_pts
    FROM public.pregame_prop_picks
    WHERE game_id = p_game_id AND user_id = pred.user_id;

    total := w_pts
           + (hs_pts + hs_bonus)
           + (as_pts + as_bonus)
           + (hy_pts + hy_bonus)
           + (ay_pts + ay_bonus)
           + sp_pts + tot_pts + rtd_pts + rectd_pts + tof_pts
           + prop_pts;

    UPDATE public.pregame_predictions SET
      winner_correct              = (w_pts = 100),
      home_score_points           = hs_pts + hs_bonus,
      away_score_points           = as_pts + as_bonus,
      home_yards_points           = hy_pts + hy_bonus,
      away_yards_points           = ay_pts + ay_bonus,
      spread_pick_correct         = (sp_pts = 100),
      spread_pick_points          = sp_pts,
      total_pick_correct          = (tot_pts = 100),
      total_pick_points           = tot_pts,
      tn_rushing_tds_correct      = (rtd_pts = 100),
      tn_rushing_tds_points       = rtd_pts,
      tn_receiving_tds_correct    = (rectd_pts = 100),
      tn_receiving_tds_points     = rectd_pts,
      tn_turnovers_forced_correct = (tof_pts = 100),
      tn_turnovers_forced_points  = tof_pts,
      total_pregame_points        = total
    WHERE id = pred.id;
  END LOOP;

  INSERT INTO public.game_leaderboard
    (game_id, user_id, username, pregame_points, total_game_points, home_yards_diff, away_yards_diff)
  SELECT
    p_game_id,
    pp.user_id,
    p.username,
    pp.total_pregame_points,
    pp.total_pregame_points + COALESCE(gl.total_drive_points, 0),
    ABS(pp.predicted_home_yards - COALESCE(game.home_total_yards, 0)),
    ABS(pp.predicted_away_yards - COALESCE(game.away_total_yards, 0))
  FROM public.pregame_predictions pp
  JOIN  public.profiles p ON p.id = pp.user_id
  LEFT JOIN public.game_leaderboard gl
    ON gl.game_id = p_game_id AND gl.user_id = pp.user_id
  WHERE pp.game_id = p_game_id AND pp.total_pregame_points IS NOT NULL
  ON CONFLICT (game_id, user_id) DO UPDATE SET
    pregame_points    = EXCLUDED.pregame_points,
    total_game_points = EXCLUDED.pregame_points + game_leaderboard.total_drive_points,
    home_yards_diff   = EXCLUDED.home_yards_diff,
    away_yards_diff   = EXCLUDED.away_yards_diff,
    updated_at        = NOW();

  UPDATE public.game_leaderboard gl
  SET rank = sub.r
  FROM (
    SELECT id,
      RANK() OVER (
        PARTITION BY game_id
        ORDER BY total_game_points DESC,
                 home_yards_diff   ASC NULLS LAST,
                 away_yards_diff   ASC NULLS LAST
      ) AS r
    FROM public.game_leaderboard
    WHERE game_id = p_game_id
  ) sub
  WHERE gl.id = sub.id;
END;
$$;
