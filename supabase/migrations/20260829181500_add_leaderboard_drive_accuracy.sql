-- Game leaderboard accuracy columns (2026-08-29 live test): the frontend
-- was computing per-user drive-pick accuracy by querying drive_predictions
-- directly from the client, but that table's RLS policy only allows a user
-- to read their OWN rows while a game is live (by design, so players can't
-- see each other's live picks) — so the leaderboard could only ever show
-- accuracy for the currently signed-in user, never for anyone else.
--
-- Fix: track drive_correct/drive_total directly on game_leaderboard (which
-- is fully public-readable), maintained by settle_drive_outcome alongside
-- the points math it already does, so the frontend can read aggregate
-- accuracy without needing row-level access to other users' picks.

ALTER TABLE public.game_leaderboard
  ADD COLUMN IF NOT EXISTS drive_correct INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS drive_total   INTEGER NOT NULL DEFAULT 0;

-- Backfill from already-resolved drives in today's live test game(s) so
-- history isn't lost for drives settled before this migration ran.
UPDATE public.game_leaderboard gl
SET drive_correct = sub.correct_count,
    drive_total   = sub.total_count
FROM (
  SELECT user_id, game_id,
    COUNT(*) FILTER (WHERE correct = TRUE) AS correct_count,
    COUNT(*) AS total_count
  FROM public.drive_predictions
  WHERE status = 'resolved'
  GROUP BY user_id, game_id
) sub
WHERE gl.user_id = sub.user_id AND gl.game_id = sub.game_id;

CREATE OR REPLACE FUNCTION public.settle_drive_outcome(
  p_game_id UUID,
  p_drive_number INTEGER,
  p_actual_outcome VARCHAR(30)
) RETURNS INTEGER AS $$
DECLARE
  v_win            RECORD;
  v_pred           RECORD;
  v_pts_win        INTEGER;
  v_new_streak     INTEGER;
  v_mult           NUMERIC(4,2);
  v_pts_earned     INTEGER;
  v_processed      INTEGER := 0;
  v_correct_total  INTEGER;
  v_is_correct     BOOLEAN;
BEGIN
  UPDATE public.drive_windows
  SET status = 'resolved', actual_outcome = p_actual_outcome
  WHERE game_id = p_game_id AND drive_number = p_drive_number
  RETURNING * INTO v_win;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No drive window found for game % drive %', p_game_id, p_drive_number;
  END IF;

  v_pts_win := CASE p_actual_outcome
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
    SELECT dp.id, dp.user_id, dp.prediction, p.current_streak_count
    FROM public.drive_predictions dp
    JOIN public.profiles p ON p.id = dp.user_id
    WHERE dp.game_id = p_game_id AND dp.drive_number = p_drive_number
      AND dp.status IN ('open', 'locked')
  LOOP
    v_is_correct := (v_pred.prediction = p_actual_outcome);

    IF v_is_correct THEN
      v_new_streak := v_pred.current_streak_count + 1;
      v_mult := CASE v_new_streak
        WHEN 1 THEN 1.00
        WHEN 2 THEN 1.25
        WHEN 3 THEN 1.50
        WHEN 4 THEN 2.00
        WHEN 5 THEN 3.00
        ELSE        4.00
      END;
      v_pts_earned := FLOOR(v_pts_win::NUMERIC * v_mult)::INTEGER;
    ELSE
      v_new_streak := 0;
      v_mult       := 1.00;
      v_pts_earned := 0;
    END IF;

    UPDATE public.drive_predictions SET
      actual_outcome = p_actual_outcome,
      correct        = v_is_correct,
      multiplier     = v_mult,
      points_earned  = v_pts_earned,
      status         = 'resolved'
    WHERE id = v_pred.id;

    UPDATE public.profiles SET
      current_streak_count = v_new_streak,
      hot_streak_active    = (v_new_streak >= 3)
    WHERE id = v_pred.user_id;

    CASE v_new_streak
      WHEN 3 THEN
        INSERT INTO public.user_badges (user_id, badge_key) VALUES (v_pred.user_id, 'hot_streak_3')
        ON CONFLICT (user_id, badge_key) DO NOTHING;
      WHEN 4 THEN
        INSERT INTO public.user_badges (user_id, badge_key) VALUES (v_pred.user_id, 'hot_streak_4')
        ON CONFLICT (user_id, badge_key) DO NOTHING;
      WHEN 5 THEN
        INSERT INTO public.user_badges (user_id, badge_key) VALUES (v_pred.user_id, 'hot_streak_5')
        ON CONFLICT (user_id, badge_key) DO NOTHING;
      ELSE
        IF v_new_streak >= 6 THEN
          INSERT INTO public.user_badges (user_id, badge_key) VALUES (v_pred.user_id, 'hot_streak_6_plus')
          ON CONFLICT (user_id, badge_key) DO NOTHING;
        END IF;
    END CASE;

    IF v_is_correct THEN
      SELECT COUNT(*) INTO v_correct_total FROM public.drive_predictions WHERE user_id = v_pred.user_id AND correct = TRUE;
      IF v_correct_total >= 500 THEN
        INSERT INTO public.user_badges (user_id, badge_key) VALUES (v_pred.user_id, 'the_oracle')
        ON CONFLICT (user_id, badge_key) DO NOTHING;
      END IF;
    END IF;

    INSERT INTO public.game_leaderboard
      (game_id, user_id, username, total_drive_points, total_game_points, drive_correct, drive_total)
    SELECT
      p_game_id, v_pred.user_id, p.username,
      v_pts_earned,
      v_pts_earned + COALESCE(gl.pregame_points, 0),
      CASE WHEN v_is_correct THEN 1 ELSE 0 END,
      1
    FROM public.profiles p
    LEFT JOIN public.game_leaderboard gl
      ON gl.game_id = p_game_id AND gl.user_id = v_pred.user_id
    WHERE p.id = v_pred.user_id
    ON CONFLICT (game_id, user_id) DO UPDATE SET
      total_drive_points = game_leaderboard.total_drive_points + v_pts_earned,
      total_game_points  = game_leaderboard.pregame_points
                         + game_leaderboard.total_drive_points + v_pts_earned,
      drive_correct       = game_leaderboard.drive_correct + (CASE WHEN v_is_correct THEN 1 ELSE 0 END),
      drive_total         = game_leaderboard.drive_total + 1,
      updated_at         = NOW();

    v_processed := v_processed + 1;
  END LOOP;

  UPDATE public.profiles p
  SET current_streak_count = 0, hot_streak_active = FALSE
  WHERE p.id IN (
    SELECT gl.user_id
    FROM public.game_leaderboard gl
    WHERE gl.game_id = p_game_id
    EXCEPT
    SELECT dp.user_id
    FROM public.drive_predictions dp
    WHERE dp.game_id = p_game_id AND dp.drive_number = p_drive_number
  );

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
$$ LANGUAGE plpgsql SECURITY DEFINER;
