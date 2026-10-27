-- Women's basketball uses the same pregame picks as men's: allow the sport in the
-- submit RPC, and credit Lady Vol points (points_lady_vol) when finalizing.
CREATE OR REPLACE FUNCTION public.submit_pregame_prediction_bb(
  p_game_id          UUID,
  p_predicted_winner VARCHAR,
  p_home_score       INTEGER,
  p_away_score       INTEGER,
  p_spread_pick      TEXT DEFAULT NULL,
  p_total_pick       TEXT DEFAULT NULL,
  p_prop_picks       JSONB DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game       RECORD;
  v_game_count INTEGER;
  v_prop_pick  RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to make picks.'; END IF;

  SELECT id, sport, kickoff_time, status, spread_line_tn, total_points_line
    INTO v_game
  FROM public.live_games WHERE id = p_game_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Game not found.'; END IF;
  IF v_game.sport NOT IN ('basketball', 'womens_basketball') THEN RAISE EXCEPTION 'Not a basketball game.'; END IF;

  IF NOW() >= v_game.kickoff_time - INTERVAL '10 minutes' THEN
    RAISE EXCEPTION 'Pre-game predictions are locked for this game.';
  END IF;

  IF p_predicted_winner NOT IN ('home', 'away') THEN
    RAISE EXCEPTION 'Invalid winner choice.';
  END IF;
  IF p_home_score < 0 OR p_home_score > 199 OR p_away_score < 0 OR p_away_score > 199 THEN
    RAISE EXCEPTION 'Scores must be 0-199.';
  END IF;

  IF p_spread_pick IS NOT NULL THEN
    IF p_spread_pick NOT IN ('over', 'under') THEN RAISE EXCEPTION 'Invalid spread pick.'; END IF;
    IF v_game.spread_line_tn IS NULL THEN RAISE EXCEPTION 'No spread line is available for this game yet.'; END IF;
  END IF;
  IF p_total_pick IS NOT NULL THEN
    IF p_total_pick NOT IN ('over', 'under') THEN RAISE EXCEPTION 'Invalid total points pick.'; END IF;
    IF v_game.total_points_line IS NULL THEN RAISE EXCEPTION 'No total points line is available for this game yet.'; END IF;
  END IF;

  INSERT INTO public.pregame_predictions (
    game_id, user_id, predicted_winner, predicted_home_score, predicted_away_score,
    predicted_spread_pick, predicted_total_pick
  ) VALUES (
    p_game_id, auth.uid(), p_predicted_winner, p_home_score, p_away_score,
    p_spread_pick, p_total_pick
  )
  ON CONFLICT (game_id, user_id) DO UPDATE SET
    predicted_winner      = EXCLUDED.predicted_winner,
    predicted_home_score  = EXCLUDED.predicted_home_score,
    predicted_away_score  = EXCLUDED.predicted_away_score,
    predicted_spread_pick = EXCLUDED.predicted_spread_pick,
    predicted_total_pick  = EXCLUDED.predicted_total_pick,
    submitted_at          = NOW();

  IF p_prop_picks IS NOT NULL AND jsonb_array_length(p_prop_picks) > 0 THEN
    FOR v_prop_pick IN SELECT * FROM jsonb_to_recordset(p_prop_picks) AS x(prop_id uuid, pick text) LOOP
      IF v_prop_pick.pick NOT IN ('over', 'under') THEN RAISE EXCEPTION 'Invalid prop pick.'; END IF;
      IF NOT EXISTS (SELECT 1 FROM public.game_props WHERE id = v_prop_pick.prop_id AND game_id = p_game_id) THEN
        RAISE EXCEPTION 'Invalid prop for this game.';
      END IF;
      INSERT INTO public.pregame_prop_picks (prop_id, game_id, user_id, pick)
      VALUES (v_prop_pick.prop_id, p_game_id, auth.uid(), v_prop_pick.pick)
      ON CONFLICT (prop_id, user_id) DO UPDATE SET pick = EXCLUDED.pick, submitted_at = NOW();
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

CREATE OR REPLACE FUNCTION public.finalize_game_bb(p_game_id UUID) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_womens BOOLEAN := (SELECT sport = 'womens_basketball' FROM public.live_games WHERE id = p_game_id);
BEGIN
  PERFORM public.calculate_pregame_points_bb(p_game_id);

  UPDATE public.live_games SET status = 'calculated' WHERE id = p_game_id;

  -- Men's games credit points_basketball, women's credit points_lady_vol.
  WITH credited AS (
    UPDATE public.profiles p
    SET points_basketball = CASE WHEN v_womens THEN p.points_basketball
                                 ELSE COALESCE(p.points_basketball, 0) + gl.total_game_points END,
        points_lady_vol   = CASE WHEN v_womens THEN COALESCE(p.points_lady_vol, 0) + gl.total_game_points
                                 ELSE p.points_lady_vol END,
        total_points      = p.total_points + gl.total_game_points
    FROM public.game_leaderboard gl
    WHERE gl.game_id = p_game_id AND gl.user_id = p.id
    RETURNING p.id AS user_id,
              p.total_points - gl.total_game_points AS old_total,
              p.total_points AS new_total
  )
  INSERT INTO public.user_badges (user_id, badge_key)
  SELECT c.user_id, b.badge_key
  FROM credited c
  CROSS JOIN (VALUES
    ('rookie_season', 100), ('rising_star', 500), ('vol_veteran', 1500),
    ('all_sport_elite', 5000), ('living_legend', 15000)
  ) AS b(badge_key, threshold)
  WHERE c.new_total >= b.threshold AND c.old_total < b.threshold
  ON CONFLICT (user_id, badge_key) DO NOTHING;

  INSERT INTO public.user_badges (user_id, badge_key)
  SELECT pp.user_id, 'picked_the_winner'
  FROM public.pregame_predictions pp
  WHERE pp.game_id = p_game_id AND pp.winner_correct = TRUE
  ON CONFLICT (user_id, badge_key) DO NOTHING;

  INSERT INTO public.user_badges (user_id, badge_key)
  SELECT gl.user_id, 'gameday_top_10'
  FROM public.game_leaderboard gl
  WHERE gl.game_id = p_game_id AND gl.rank <= 10
  ON CONFLICT (user_id, badge_key) DO NOTHING;

  INSERT INTO public.user_badges (user_id, badge_key)
  SELECT gl.user_id, 'gameday_winner'
  FROM public.game_leaderboard gl
  WHERE gl.game_id = p_game_id AND gl.rank = 1
  ON CONFLICT (user_id, badge_key) DO NOTHING;

  INSERT INTO public.user_badges (user_id, badge_key)
  SELECT lp.user_id, 'iron_man'
  FROM public.live_window_predictions lp
  WHERE lp.game_id = p_game_id
  GROUP BY lp.user_id
  HAVING COUNT(*) = (SELECT COUNT(*) FROM public.live_windows WHERE game_id = p_game_id AND status <> 'void')
     AND (SELECT COUNT(*) FROM public.live_windows WHERE game_id = p_game_id AND status <> 'void') > 0
  ON CONFLICT (user_id, badge_key) DO NOTHING;
END;
$$;
