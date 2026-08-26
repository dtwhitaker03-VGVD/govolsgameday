/*
# Update Pregame Prediction RPCs for 5 New Categories

## Summary
Extends `submit_pregame_prediction` and `calculate_pregame_points` to
accept and grade 5 new flat 100/0 pregame categories: Spread O/U, Total
Points O/U, TN Rushing TDs, TN Receiving TDs, TN Turnovers Forced. New
per-game max: 1,500 pts (was 1,000).

## Changes
- `submit_pregame_prediction`: adds 5 new optional params. Spread/total
  picks are only accepted when the corresponding live_games line has been
  captured (else raises — the frontend hides those fields until a line
  exists, so this should never fire from normal use). The 3 exact-guess
  picks are always required, bounded 0-10. The existing
  first_pick/veteran_predictor badge-award block (added in
  20260825224500_add_remaining_general_badges.sql) is preserved verbatim.
- `calculate_pregame_points`: adds grading for all 5 categories inside the
  existing per-prediction loop, folds them into `total`, and writes the 10
  new correctness/points columns. Spread grading uses a TN-relative
  signed-margin comparison (see inline comment). Total grading compares
  combined final score to the captured total-points line. The 3
  exact-guess categories require an exact integer match against the
  CFBD-sourced actual value on live_games. Every new term degrades to 0
  (never throws) when its underlying line/actual value was never
  captured — a missing CFBD data point should never block grading of the
  rest of a game's predictions. A push (actual value lands exactly on the
  line) grades 0 for both Over and Under picks — there's no partial-credit
  or "push/refund" concept in this flat 100/0 scheme.
- `game_leaderboard` upsert/rank logic and `finalize_game` itself are
  UNCHANGED — both already treat `total_pregame_points` as one opaque
  number regardless of how many sub-categories feed it.
*/

-- ── submit_pregame_prediction ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_pregame_prediction(
  p_game_id              UUID,
  p_predicted_winner     VARCHAR(4),
  p_home_score           INTEGER,
  p_away_score           INTEGER,
  p_home_yards           INTEGER,
  p_away_yards           INTEGER,
  p_spread_pick          TEXT    DEFAULT NULL,
  p_total_pick           TEXT    DEFAULT NULL,
  p_tn_rushing_tds       INTEGER DEFAULT NULL,
  p_tn_receiving_tds     INTEGER DEFAULT NULL,
  p_tn_turnovers_forced  INTEGER DEFAULT NULL
) RETURNS VOID AS $$
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

  -- The 3 exact-integer guesses are always required, sanity-bounded.
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

  SELECT COUNT(*) INTO v_game_count FROM public.pregame_predictions WHERE user_id = auth.uid();
  IF v_game_count = 1 THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (auth.uid(), 'first_pick')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  ELSIF v_game_count = 10 THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (auth.uid(), 'veteran_predictor')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── calculate_pregame_points ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.calculate_pregame_points(p_game_id UUID)
RETURNS VOID AS $$
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
  total  INTEGER;
BEGIN
  SELECT * INTO game FROM public.live_games WHERE id = p_game_id;
  IF NOT FOUND THEN RETURN; END IF;

  FOR pred IN SELECT * FROM public.pregame_predictions WHERE game_id = p_game_id LOOP
    -- Winner: 100 pts flat
    w_pts := CASE
      WHEN pred.predicted_winner = 'home' AND game.home_score > game.away_score THEN 100
      WHEN pred.predicted_winner = 'away' AND game.away_score > game.home_score THEN 100
      ELSE 0
    END;

    -- Home score: up to 100, +50 exact-match bonus
    hs_pts   := GREATEST(0, 100 - (5 * ABS(pred.predicted_home_score - game.home_score)));
    hs_bonus := CASE WHEN pred.predicted_home_score = game.home_score THEN 50 ELSE 0 END;

    -- Away score: up to 100, +50 exact-match bonus
    as_pts   := GREATEST(0, 100 - (5 * ABS(pred.predicted_away_score - game.away_score)));
    as_bonus := CASE WHEN pred.predicted_away_score = game.away_score THEN 50 ELSE 0 END;

    -- Home yards: up to 200, +100 exact-match bonus
    hy_pts   := GREATEST(0, 200 - ABS(pred.predicted_home_yards - COALESCE(game.home_total_yards, 0)));
    hy_bonus := CASE WHEN pred.predicted_home_yards = COALESCE(game.home_total_yards, 0) THEN 100 ELSE 0 END;

    -- Away yards: up to 200, +100 exact-match bonus
    ay_pts   := GREATEST(0, 200 - ABS(pred.predicted_away_yards - COALESCE(game.away_total_yards, 0)));
    ay_bonus := CASE WHEN pred.predicted_away_yards = COALESCE(game.away_total_yards, 0) THEN 100 ELSE 0 END;

    -- TN's actual signed scoring margin, regardless of home/away side
    v_tn_margin := CASE
      WHEN game.home_team = 'Tennessee' THEN game.home_score - game.away_score
      ELSE game.away_score - game.home_score
    END;
    v_total_actual := game.home_score + game.away_score;

    -- Spread O/U (cover-based, TN-relative): graded only if a line was
    -- captured and the user made a pick. spread_line_tn is negative when
    -- TN is favored, so "covers" (Over) means margin + line > 0. An exact
    -- push (= 0) grades 0 for both picks.
    IF game.spread_line_tn IS NOT NULL AND pred.predicted_spread_pick IS NOT NULL THEN
      sp_pts := CASE
        WHEN (v_tn_margin + game.spread_line_tn) > 0 AND pred.predicted_spread_pick = 'over'  THEN 100
        WHEN (v_tn_margin + game.spread_line_tn) < 0 AND pred.predicted_spread_pick = 'under' THEN 100
        ELSE 0
      END;
    ELSE
      sp_pts := 0;
    END IF;

    -- Total points O/U: same push-to-zero convention.
    IF game.total_points_line IS NOT NULL AND pred.predicted_total_pick IS NOT NULL THEN
      tot_pts := CASE
        WHEN v_total_actual > game.total_points_line AND pred.predicted_total_pick = 'over'  THEN 100
        WHEN v_total_actual < game.total_points_line AND pred.predicted_total_pick = 'under' THEN 100
        ELSE 0
      END;
    ELSE
      tot_pts := 0;
    END IF;

    -- Exact-guess categories: 100 only on an exact match against the
    -- CFBD-sourced actual; NULL actual (CFBD data unavailable) degrades to 0.
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

    total := w_pts
           + (hs_pts + hs_bonus)
           + (as_pts + as_bonus)
           + (hy_pts + hy_bonus)
           + (ay_pts + ay_bonus)
           + sp_pts + tot_pts + rtd_pts + rectd_pts + tof_pts;

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

  -- Upsert into game_leaderboard with pregame totals + tiebreaker diffs
  -- (unchanged — total_pregame_points is consumed as one opaque number)
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

  -- Recompute ranks: descending points, tiebreaker home_yards_diff ASC, away_yards_diff ASC
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
