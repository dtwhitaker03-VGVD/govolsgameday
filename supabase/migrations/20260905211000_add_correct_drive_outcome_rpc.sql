-- Fixes a real gap found live: the Admin Dashboard's "correct a historical
-- drive outcome" feature (correctHistoryOutcome in Admin.tsx) was calling
-- settle_drive_outcome again, but that function only processes
-- drive_predictions rows with status IN ('open', 'locked') -- a drive that's
-- already been settled once has every one of its predictions at status
-- 'resolved', so re-running it updates drive_windows.actual_outcome (the
-- history display) but silently leaves drive_predictions.correct/
-- points_earned and game_leaderboard.total_drive_points exactly as they
-- were under the ORIGINAL, wrong outcome. The Admin UI's own confirmation
-- message even said as much ("already-awarded points/streaks are
-- unchanged") -- an intentional tradeoff at the time, but not what "correct
-- the outcome" should mean, and not what was reported: a user corrected
-- their own drive result and their points never moved.
--
-- correct_drive_outcome is a separate function (not a settle_drive_outcome
-- branch) because its semantics are deliberately narrower: it recomputes
-- correctness and points for an ALREADY-resolved drive against the fixed
-- outcome, using each prediction's already-recorded multiplier rather than
-- recomputing streaks. That multiplier reflects the user's streak going
-- INTO this drive -- a fact about prior drives that a bad call on THIS
-- drive doesn't change. It adjusts game_leaderboard by the delta (new
-- points/correctness minus old), not a full replay.
--
-- Known limitation: if a LATER drive in the same game was already settled
-- before this correction runs, that later drive's streak/multiplier (and
-- any streak badges) were computed off this drive's ORIGINAL, wrong
-- correctness, and this function does not cascade the fix forward through
-- them. Correcting a drive before the next one settles -- the realistic
-- admin workflow -- is unaffected by this limitation. profiles.points_football
-- / total_points are untouched here too, same as settle_drive_outcome --
-- those are only credited once, at finalize_game, by which point they'll
-- read the corrected game_leaderboard totals.
CREATE OR REPLACE FUNCTION public.correct_drive_outcome(
  p_game_id uuid,
  p_drive_number integer,
  p_actual_outcome character varying
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_win           RECORD;
  v_pred          RECORD;
  v_new_pts_win   INTEGER;
  v_new_correct   BOOLEAN;
  v_new_points    INTEGER;
  v_delta_points  INTEGER;
  v_delta_correct INTEGER;
  v_processed     INTEGER := 0;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT (SELECT COALESCE(is_admin, FALSE) FROM public.profiles WHERE id = auth.uid()) THEN
      RAISE EXCEPTION 'Unauthorized: admin access required.';
    END IF;
  END IF;

  UPDATE public.drive_windows
  SET actual_outcome = p_actual_outcome
  WHERE game_id = p_game_id AND drive_number = p_drive_number AND status = 'resolved'
  RETURNING * INTO v_win;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No resolved drive window found for game % drive % to correct', p_game_id, p_drive_number;
  END IF;

  v_new_pts_win := CASE p_actual_outcome
    WHEN 'touchdown'         THEN v_win.pts_touchdown
    WHEN 'field_goal'        THEN v_win.pts_field_goal
    WHEN 'punt'              THEN v_win.pts_punt
    WHEN 'turnover'          THEN v_win.pts_turnover
    WHEN 'safety'            THEN v_win.pts_safety
    WHEN 'turnover_on_downs' THEN v_win.pts_turnover_on_downs
    WHEN 'end_of_quarter'    THEN v_win.pts_end_of_quarter
    ELSE 0
  END;

  FOR v_pred IN
    SELECT dp.id, dp.user_id, dp.prediction, dp.correct AS old_correct,
           dp.points_earned AS old_points, dp.multiplier
    FROM public.drive_predictions dp
    WHERE dp.game_id = p_game_id AND dp.drive_number = p_drive_number
      AND dp.status = 'resolved'
  LOOP
    v_new_correct := (v_pred.prediction = p_actual_outcome);
    v_new_points  := CASE WHEN v_new_correct
      THEN FLOOR(v_new_pts_win::NUMERIC * v_pred.multiplier)::INTEGER
      ELSE 0
    END;

    IF v_new_correct IS NOT DISTINCT FROM v_pred.old_correct AND v_new_points = v_pred.old_points THEN
      CONTINUE;
    END IF;

    v_delta_points  := v_new_points - COALESCE(v_pred.old_points, 0);
    v_delta_correct := (CASE WHEN v_new_correct THEN 1 ELSE 0 END)
                     - (CASE WHEN v_pred.old_correct THEN 1 ELSE 0 END);

    UPDATE public.drive_predictions SET
      actual_outcome = p_actual_outcome,
      correct        = v_new_correct,
      points_earned  = v_new_points
    WHERE id = v_pred.id;

    UPDATE public.game_leaderboard
    SET total_drive_points = total_drive_points + v_delta_points,
        total_game_points  = total_game_points + v_delta_points,
        drive_correct      = drive_correct + v_delta_correct,
        updated_at         = NOW()
    WHERE game_id = p_game_id AND user_id = v_pred.user_id;

    v_processed := v_processed + 1;
  END LOOP;

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

  RETURN v_processed;
END;
$$;
