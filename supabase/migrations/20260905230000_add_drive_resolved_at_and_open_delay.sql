-- Supports a deliberate pause between drives in auto mode: as soon as
-- live-cfbd-sync settles a drive, it should wait ~15s before opening the
-- next drive's pick window (rather than opening it the instant CFBD's data
-- allows), to smooth out the lag/rapid-fire feel reported when running
-- without manual control. live-cfbd-sync is a stateless 15s poller with no
-- in-memory state between runs, so the only way to know "how long ago did
-- the last drive resolve" across polls is to persist it — resolved_at gives
-- it that.
--
-- Note on precision: with a 15s poll interval, this produces an effective
-- delay of one poll cycle (~15-30s), not an exact 15.000s -- the poller
-- can't check more often than it runs.
ALTER TABLE public.drive_windows
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

COMMENT ON COLUMN public.drive_windows.resolved_at IS
  'When settle_drive_outcome resolved this drive. Used by live-cfbd-sync to hold off opening the next drive''s window for ~15s after this timestamp.';

CREATE OR REPLACE FUNCTION public.settle_drive_outcome(p_game_id uuid, p_drive_number integer, p_actual_outcome character varying)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
  SET status = 'resolved', actual_outcome = p_actual_outcome, resolved_at = NOW()
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
$function$;
