-- Basketball live stretch / quarter picks: each of the five guesses now scores 50 minus 10 per
-- miss (was 5), floor 0, so a window is still worth up to 250 but accuracy matters more.
-- Applies to windows settled from now on; already-settled windows keep their points.
CREATE OR REPLACE FUNCTION public.settle_live_window(
  p_game_id UUID, p_window_number INTEGER, p_end_home_score INTEGER, p_end_away_score INTEGER, p_end_play_id TEXT,
  p_threes INTEGER, p_twos INTEGER, p_turnovers INTEGER, p_fouls INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_win RECORD;
  v_pred RECORD;
  v_tn_home BOOLEAN;
  v_tn_pts INTEGER;
  v_a INTEGER; v_b INTEGER; v_c INTEGER; v_d INTEGER; v_e INTEGER;
  v_total INTEGER;
  v_exact BOOLEAN;
  v_processed INTEGER := 0;
BEGIN
  SELECT * INTO v_win FROM public.live_windows
  WHERE game_id = p_game_id AND window_number = p_window_number AND status = 'open'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No open window % for game %.', p_window_number, p_game_id;
  END IF;

  SELECT home_team = 'Tennessee' INTO v_tn_home FROM public.live_games WHERE id = p_game_id;
  v_tn_pts := CASE WHEN v_tn_home THEN p_end_home_score - v_win.start_home_score
                   ELSE p_end_away_score - v_win.start_away_score END;

  UPDATE public.live_windows
  SET status = 'resolved', resolved_at = NOW(),
      end_home_score = p_end_home_score, end_away_score = p_end_away_score, end_play_id = p_end_play_id,
      actual_tn_pts = v_tn_pts, actual_threes = p_threes, actual_twos = p_twos,
      actual_turnovers_forced = p_turnovers, actual_fouls = p_fouls,
      window_locked_at = LEAST(window_locked_at, NOW())
  WHERE id = v_win.id;

  FOR v_pred IN
    SELECT lp.id, lp.user_id, lp.pick_pts, lp.pick_threes, lp.pick_twos, lp.pick_turnovers, lp.pick_fouls
    FROM public.live_window_predictions lp
    WHERE lp.game_id = p_game_id AND lp.window_number = p_window_number AND lp.status = 'open'
  LOOP
    v_a := GREATEST(0, 50 - 10 * ABS(v_pred.pick_pts - v_tn_pts));
    v_b := GREATEST(0, 50 - 10 * ABS(v_pred.pick_threes - p_threes));
    v_c := GREATEST(0, 50 - 10 * ABS(v_pred.pick_twos - p_twos));
    v_d := GREATEST(0, 50 - 10 * ABS(v_pred.pick_turnovers - p_turnovers));
    v_e := GREATEST(0, 50 - 10 * ABS(v_pred.pick_fouls - p_fouls));
    v_total := v_a + v_b + v_c + v_d + v_e;
    v_exact := (v_pred.pick_pts = v_tn_pts);

    UPDATE public.live_window_predictions SET
      actual_outcome = NULL, correct = v_exact, multiplier = 1.00, points_earned = v_total, status = 'resolved',
      breakdown = jsonb_build_object('pts', v_a, 'threes', v_b, 'twos', v_c, 'turnovers', v_d, 'fouls', v_e)
    WHERE id = v_pred.id;

    INSERT INTO public.game_leaderboard
      (game_id, user_id, username, total_drive_points, total_game_points, drive_correct, drive_total)
    SELECT p_game_id, v_pred.user_id, p.username, v_total,
           v_total + COALESCE(gl.pregame_points, 0),
           CASE WHEN v_exact THEN 1 ELSE 0 END, 1
    FROM public.profiles p
    LEFT JOIN public.game_leaderboard gl ON gl.game_id = p_game_id AND gl.user_id = v_pred.user_id
    WHERE p.id = v_pred.user_id
    ON CONFLICT (game_id, user_id) DO UPDATE SET
      total_drive_points = game_leaderboard.total_drive_points + v_total,
      total_game_points  = game_leaderboard.pregame_points + game_leaderboard.total_drive_points + v_total,
      drive_correct      = game_leaderboard.drive_correct + (CASE WHEN v_exact THEN 1 ELSE 0 END),
      drive_total        = game_leaderboard.drive_total + 1,
      updated_at         = NOW();

    v_processed := v_processed + 1;
  END LOOP;

  UPDATE public.game_leaderboard gl
  SET rank = sub.r
  FROM (
    SELECT id, RANK() OVER (
      PARTITION BY game_id
      ORDER BY total_game_points DESC, home_yards_diff ASC NULLS LAST, away_yards_diff ASC NULLS LAST
    ) AS r
    FROM public.game_leaderboard WHERE game_id = p_game_id
  ) sub
  WHERE gl.id = sub.id;

  RETURN v_processed;
END;
$$;
