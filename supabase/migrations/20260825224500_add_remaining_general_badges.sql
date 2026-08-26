/*
# Remaining General-Track Badges

## Summary
Wires up the general-track badges whose conditions are checked at existing
write points: total_points milestones (finalize_game + submit_trivia_answers),
prediction-volume milestones (submit_pregame_prediction, submit_drive_prediction),
correct-drive-pick volume (settle_drive_outcome), the two remaining legendary
gameday badges (perfect_saturday, iron_man — checked in finalize_game), and
poll participation (new triggers on user_poll_responses, fan_polls,
fan_poll_votes — the latter also adds the vote_count increment fan_polls
never had).

## NOT included here (deferred — see plan)
- making_friends/social_butterfly/popular_vol/vol_nation_celebrity (follow
  counts) and founding_member/one_year_vol (date-based, no row event) —
  these depend on the toggle_follow RPC and get_profile_page_data RPC that
  don't exist yet; they're built alongside the profile page itself.

## Changes
- `finalize_game()`: adds perfect_saturday, iron_man awards, and
  total_points milestone badges (rookie_season/rising_star/vol_veteran/
  all_sport_elite/living_legend), computed via old/new totals captured in
  the same UPDATE...RETURNING that credits points (no extra read).
- `submit_trivia_answers()`: adds the same total_points milestone check
  (trivia is the other place total_points changes).
- `submit_pregame_prediction()`: awards first_pick/veteran_predictor based
  on distinct-game count after the upsert.
- `submit_drive_prediction()`: awards drive_by_drive/drive_master based on
  total submitted-pick count after the upsert.
- `settle_drive_outcome()`: awards the_oracle (500 correct drive picks)
  when a pick resolves correct.
- New triggers: `on_poll_response_added` (user_poll_responses),
  `on_fan_poll_created` (fan_polls), `on_fan_poll_vote_added`
  (fan_poll_votes — also increments fan_polls.vote_count, which nothing
  previously maintained).

## Security
- All SECURITY DEFINER, matching every function/trigger in this schema.
*/

-- ── 1. finalize_game: perfect_saturday, iron_man, points milestones ─────────

CREATE OR REPLACE FUNCTION public.finalize_game(p_game_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM public.calculate_pregame_points(p_game_id);

  UPDATE public.live_games SET status = 'calculated' WHERE id = p_game_id;

  -- Credit points, capturing old/new totals in one pass for milestone badges
  WITH credited AS (
    UPDATE public.profiles p
    SET
      points_football = p.points_football + gl.total_game_points,
      total_points    = p.total_points    + gl.total_game_points
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
  SELECT pp.user_id, 'perfect_point_predictor'
  FROM public.pregame_predictions pp
  WHERE pp.game_id = p_game_id
    AND pp.home_score_points = 150
    AND pp.away_score_points = 150
  ON CONFLICT (user_id, badge_key) DO NOTHING;

  INSERT INTO public.user_badges (user_id, badge_key)
  SELECT pp.user_id, 'perfect_yardage_predictor'
  FROM public.pregame_predictions pp
  WHERE pp.game_id = p_game_id
    AND pp.home_yards_points = 300
    AND pp.away_yards_points = 300
  ON CONFLICT (user_id, badge_key) DO NOTHING;

  -- Perfect Saturday: winner + both exact scores + both exact yardage, one game
  INSERT INTO public.user_badges (user_id, badge_key)
  SELECT pp.user_id, 'perfect_saturday'
  FROM public.pregame_predictions pp
  WHERE pp.game_id = p_game_id
    AND pp.winner_correct = TRUE
    AND pp.home_score_points = 150 AND pp.away_score_points = 150
    AND pp.home_yards_points = 300 AND pp.away_yards_points = 300
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

  -- Iron Man: predicted every single drive of this game (zero missed)
  INSERT INTO public.user_badges (user_id, badge_key)
  SELECT dp.user_id, 'iron_man'
  FROM public.drive_predictions dp
  WHERE dp.game_id = p_game_id
  GROUP BY dp.user_id
  HAVING COUNT(*) = (SELECT COUNT(*) FROM public.drive_windows WHERE game_id = p_game_id)
     AND (SELECT COUNT(*) FROM public.drive_windows WHERE game_id = p_game_id) > 0
  ON CONFLICT (user_id, badge_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 2. Pregame predictions: first_pick, veteran_predictor ────────────────────

CREATE OR REPLACE FUNCTION public.submit_pregame_prediction(
  p_game_id         UUID,
  p_predicted_winner VARCHAR(4),
  p_home_score      INTEGER,
  p_away_score      INTEGER,
  p_home_yards      INTEGER,
  p_away_yards      INTEGER
) RETURNS VOID AS $$
DECLARE
  v_game       RECORD;
  v_lock_time  TIMESTAMPTZ;
  v_game_count INTEGER;
BEGIN
  SELECT id, kickoff_time, status INTO v_game
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

  INSERT INTO public.pregame_predictions (
    game_id, user_id,
    predicted_winner, predicted_home_score, predicted_away_score,
    predicted_home_yards, predicted_away_yards
  ) VALUES (
    p_game_id, auth.uid(),
    p_predicted_winner, p_home_score, p_away_score,
    p_home_yards, p_away_yards
  )
  ON CONFLICT (game_id, user_id) DO UPDATE SET
    predicted_winner      = EXCLUDED.predicted_winner,
    predicted_home_score  = EXCLUDED.predicted_home_score,
    predicted_away_score  = EXCLUDED.predicted_away_score,
    predicted_home_yards  = EXCLUDED.predicted_home_yards,
    predicted_away_yards  = EXCLUDED.predicted_away_yards,
    submitted_at          = NOW();

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

-- ── 3. Drive predictions: drive_by_drive, drive_master ───────────────────────

CREATE OR REPLACE FUNCTION public.submit_drive_prediction(
  p_game_id      UUID,
  p_drive_number INTEGER,
  p_prediction   VARCHAR(30)
) RETURNS VOID AS $$
DECLARE
  v_win          RECORD;
  v_pts_possible INTEGER;
  v_pick_count   INTEGER;
BEGIN
  SELECT * INTO v_win
  FROM public.drive_windows
  WHERE game_id = p_game_id AND drive_number = p_drive_number
    AND status = 'open' AND window_locked_at > NOW();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prediction window is closed for drive %.', p_drive_number;
  END IF;

  v_pts_possible := CASE p_prediction
    WHEN 'touchdown'         THEN v_win.pts_touchdown
    WHEN 'field_goal'        THEN v_win.pts_field_goal
    WHEN 'punt'              THEN v_win.pts_punt
    WHEN 'turnover'          THEN v_win.pts_turnover
    WHEN 'safety'            THEN v_win.pts_safety
    WHEN 'turnover_on_downs' THEN v_win.pts_turnover_on_downs
    WHEN 'end_of_quarter'    THEN v_win.pts_end_of_quarter
    ELSE NULL
  END;
  IF v_pts_possible IS NULL THEN
    RAISE EXCEPTION 'Invalid outcome: %', p_prediction;
  END IF;

  INSERT INTO public.drive_predictions
    (game_id, drive_number, user_id, prediction, points_possible, status)
  VALUES
    (p_game_id, p_drive_number, auth.uid(), p_prediction, v_pts_possible, 'open')
  ON CONFLICT (game_id, drive_number, user_id) DO UPDATE SET
    prediction      = EXCLUDED.prediction,
    points_possible = EXCLUDED.points_possible,
    submitted_at    = NOW();

  SELECT COUNT(*) INTO v_pick_count FROM public.drive_predictions WHERE user_id = auth.uid();
  IF v_pick_count = 50 THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (auth.uid(), 'drive_by_drive')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  ELSIF v_pick_count = 250 THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (auth.uid(), 'drive_master')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. Drive settlement: the_oracle (500 cumulative correct drive picks) ─────

CREATE OR REPLACE FUNCTION public.settle_drive_outcome(
  p_game_id       UUID,
  p_drive_number  INTEGER,
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
    IF v_pred.prediction = p_actual_outcome THEN
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
      correct        = (v_pred.prediction = p_actual_outcome),
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

    IF v_pred.prediction = p_actual_outcome THEN
      SELECT COUNT(*) INTO v_correct_total FROM public.drive_predictions WHERE user_id = v_pred.user_id AND correct = TRUE;
      IF v_correct_total >= 500 THEN
        INSERT INTO public.user_badges (user_id, badge_key) VALUES (v_pred.user_id, 'the_oracle')
        ON CONFLICT (user_id, badge_key) DO NOTHING;
      END IF;
    END IF;

    INSERT INTO public.game_leaderboard
      (game_id, user_id, username, total_drive_points, total_game_points)
    SELECT
      p_game_id, v_pred.user_id, p.username,
      v_pts_earned,
      v_pts_earned + COALESCE(gl.pregame_points, 0)
    FROM public.profiles p
    LEFT JOIN public.game_leaderboard gl
      ON gl.game_id = p_game_id AND gl.user_id = v_pred.user_id
    WHERE p.id = v_pred.user_id
    ON CONFLICT (game_id, user_id) DO UPDATE SET
      total_drive_points = game_leaderboard.total_drive_points + v_pts_earned,
      total_game_points  = game_leaderboard.pregame_points
                         + game_leaderboard.total_drive_points + v_pts_earned,
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

-- ── 5. Poll participation: first_vote, civic_duty, poll_creator,
--       democracy_in_action ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.on_poll_response_added()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM public.user_poll_responses WHERE user_id = NEW.user_id;
    IF v_count = 1 THEN
      INSERT INTO public.user_badges (user_id, badge_key) VALUES (NEW.user_id, 'first_vote')
      ON CONFLICT (user_id, badge_key) DO NOTHING;
    ELSIF v_count = 50 THEN
      INSERT INTO public.user_badges (user_id, badge_key) VALUES (NEW.user_id, 'civic_duty')
      ON CONFLICT (user_id, badge_key) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_poll_response_added ON public.user_poll_responses;
CREATE TRIGGER on_poll_response_added
  AFTER INSERT ON public.user_poll_responses
  FOR EACH ROW EXECUTE FUNCTION public.on_poll_response_added();

CREATE OR REPLACE FUNCTION public.on_fan_poll_created()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (NEW.user_id, 'poll_creator')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_fan_poll_created ON public.fan_polls;
CREATE TRIGGER on_fan_poll_created
  AFTER INSERT ON public.fan_polls
  FOR EACH ROW EXECUTE FUNCTION public.on_fan_poll_created();

CREATE OR REPLACE FUNCTION public.on_fan_poll_vote_added()
RETURNS TRIGGER AS $$
DECLARE
  v_poll RECORD;
BEGIN
  UPDATE public.fan_polls
    SET vote_count = vote_count + 1
    WHERE id = NEW.poll_id
    RETURNING user_id, vote_count INTO v_poll;

  IF v_poll.user_id IS NOT NULL AND v_poll.vote_count = 50 THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (v_poll.user_id, 'democracy_in_action')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_fan_poll_vote_added ON public.fan_poll_votes;
CREATE TRIGGER on_fan_poll_vote_added
  AFTER INSERT ON public.fan_poll_votes
  FOR EACH ROW EXECUTE FUNCTION public.on_fan_poll_vote_added();

-- ── 6. submit_trivia_answers: add the same total_points milestone check ──────

CREATE OR REPLACE FUNCTION public.submit_trivia_answers(
  p_trivia_date DATE,
  p_answers      JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id       UUID := auth.uid();
  v_existing      RECORD;
  v_q             RECORD;
  v_selected      TEXT;
  v_score         INTEGER := 0;
  v_correct       INTEGER := 0;
  v_answers_json  JSONB := '[]'::jsonb;
  v_points        INTEGER;
  v_last_date     DATE;
  v_is_first_ever BOOLEAN;
  v_new_streak    INTEGER;
  v_old_best      INTEGER;
  v_new_best      INTEGER;
  v_old_trivia_pts INTEGER;
  v_new_trivia_pts INTEGER;
  v_old_total     INTEGER;
  v_new_total     INTEGER;
  v_perfect_days  INTEGER;
  v_cat_count     INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT score, answers
    INTO v_existing
    FROM user_trivia_responses
    WHERE user_id = v_user_id AND trivia_date = p_trivia_date
    LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'already_completed', true,
      'score', v_existing.score,
      'correct', (v_existing.answers->>'correct')::int,
      'total', 5,
      'answers', v_existing.answers
    );
  END IF;

  FOR v_q IN
    SELECT slot, correct_answer, question, option_a, option_b, option_c, option_d,
           difficulty, category
      FROM trivia_questions
      WHERE scheduled_date = p_trivia_date
    ORDER BY slot ASC
  LOOP
    SELECT COALESCE((elem->>'selected')::text, '')
      INTO v_selected
      FROM jsonb_array_elements(p_answers) AS elem
      WHERE (elem->>'slot')::int = v_q.slot
      LIMIT 1;

    v_points := 10 + (v_q.slot - 1) * 5;

    IF v_selected = v_q.correct_answer THEN
      v_score := v_score + v_points;
      v_correct := v_correct + 1;
    END IF;

    v_answers_json := v_answers_json || jsonb_build_object(
      'slot', v_q.slot,
      'question', v_q.question,
      'option_a', v_q.option_a,
      'option_b', v_q.option_b,
      'option_c', v_q.option_c,
      'option_d', v_q.option_d,
      'selected', v_selected,
      'correct_answer', v_q.correct_answer,
      'difficulty', v_q.difficulty,
      'category', v_q.category,
      'points', v_points,
      'correct', v_selected = v_q.correct_answer
    );
  END LOOP;

  SELECT NOT EXISTS(SELECT 1 FROM user_trivia_responses WHERE user_id = v_user_id) INTO v_is_first_ever;

  SELECT MAX(trivia_date) INTO v_last_date
    FROM user_trivia_responses
    WHERE user_id = v_user_id AND trivia_date < p_trivia_date;

  INSERT INTO user_trivia_responses (user_id, trivia_date, score, answers, completed_at)
  VALUES (
    v_user_id, p_trivia_date, v_score,
    jsonb_build_object('questions', v_answers_json, 'correct', v_correct),
    now()
  )
  ON CONFLICT (user_id, trivia_date) DO NOTHING;

  IF v_last_date = p_trivia_date - 1 THEN
    SELECT trivia_streak_current + 1 INTO v_new_streak FROM profiles WHERE id = v_user_id;
  ELSE
    v_new_streak := 1;
  END IF;

  SELECT trivia_streak_best, points_trivia, total_points INTO v_old_best, v_old_trivia_pts, v_old_total FROM profiles WHERE id = v_user_id;
  v_new_best := GREATEST(v_old_best, v_new_streak);
  v_new_trivia_pts := v_old_trivia_pts + v_score;
  v_new_total := v_old_total + v_score;

  UPDATE profiles
    SET points_trivia          = v_new_trivia_pts,
        total_points           = v_new_total,
        trivia_streak_current  = v_new_streak,
        trivia_streak_best     = v_new_best
    WHERE id = v_user_id;

  IF v_is_first_ever THEN
    INSERT INTO user_badges (user_id, badge_key) VALUES (v_user_id, 'trivia_first_try')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  IF v_score = 100 THEN
    INSERT INTO user_badges (user_id, badge_key) VALUES (v_user_id, 'trivia_perfect')
    ON CONFLICT (user_id, badge_key) DO NOTHING;

    SELECT COUNT(*) INTO v_perfect_days FROM user_trivia_responses WHERE user_id = v_user_id AND score = 100;
    IF v_perfect_days >= 10 THEN
      INSERT INTO user_badges (user_id, badge_key) VALUES (v_user_id, 'trivia_perfectionist')
      ON CONFLICT (user_id, badge_key) DO NOTHING;
    END IF;
  END IF;

  IF v_new_streak = 3 THEN
    INSERT INTO user_badges (user_id, badge_key) VALUES (v_user_id, 'trivia_streak_3')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  ELSIF v_new_streak = 7 THEN
    INSERT INTO user_badges (user_id, badge_key) VALUES (v_user_id, 'trivia_streak_7')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  ELSIF v_new_streak = 30 THEN
    INSERT INTO user_badges (user_id, badge_key) VALUES (v_user_id, 'trivia_streak_30')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  ELSIF v_new_streak = 100 THEN
    INSERT INTO user_badges (user_id, badge_key) VALUES (v_user_id, 'trivia_streak_100')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  IF v_new_best >= 200 AND v_old_best < 200 THEN
    INSERT INTO user_badges (user_id, badge_key) VALUES (v_user_id, 'trivia_iron_man')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  IF v_new_trivia_pts >= 1000 AND v_old_trivia_pts < 1000 THEN
    INSERT INTO user_badges (user_id, badge_key) VALUES (v_user_id, 'trivia_century')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;
  IF v_new_trivia_pts >= 10000 AND v_old_trivia_pts < 10000 THEN
    INSERT INTO user_badges (user_id, badge_key) VALUES (v_user_id, 'vol_scholar')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  INSERT INTO public.user_badges (user_id, badge_key)
  SELECT v_user_id, b.badge_key
  FROM (VALUES
    ('rookie_season', 100), ('rising_star', 500), ('vol_veteran', 1500),
    ('all_sport_elite', 5000), ('living_legend', 15000)
  ) AS b(badge_key, threshold)
  WHERE v_new_total >= b.threshold AND v_old_total < b.threshold
  ON CONFLICT (user_id, badge_key) DO NOTHING;

  SELECT COUNT(*) INTO v_cat_count
    FROM user_trivia_responses utr, jsonb_array_elements(utr.answers->'questions') q
    WHERE utr.user_id = v_user_id AND (q->>'correct')::boolean = true AND q->>'category' = 'Vol Football History';
  IF v_cat_count >= 50 THEN
    INSERT INTO user_badges (user_id, badge_key) VALUES (v_user_id, 'football_scholar')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  SELECT COUNT(*) INTO v_cat_count
    FROM user_trivia_responses utr, jsonb_array_elements(utr.answers->'questions') q
    WHERE utr.user_id = v_user_id AND (q->>'correct')::boolean = true AND q->>'category' = 'Vol Basketball History';
  IF v_cat_count >= 30 THEN
    INSERT INTO user_badges (user_id, badge_key) VALUES (v_user_id, 'hoops_historian')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  SELECT COUNT(*) INTO v_cat_count
    FROM user_trivia_responses utr, jsonb_array_elements(utr.answers->'questions') q
    WHERE utr.user_id = v_user_id AND (q->>'correct')::boolean = true AND q->>'category' = 'Vol Baseball History';
  IF v_cat_count >= 30 THEN
    INSERT INTO user_badges (user_id, badge_key) VALUES (v_user_id, 'diamond_scholar')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  SELECT COUNT(*) INTO v_cat_count
    FROM user_trivia_responses utr, jsonb_array_elements(utr.answers->'questions') q
    WHERE utr.user_id = v_user_id AND (q->>'correct')::boolean = true AND q->>'category' = 'Lady Vols History';
  IF v_cat_count >= 30 THEN
    INSERT INTO user_badges (user_id, badge_key) VALUES (v_user_id, 'lady_vols_historian')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  SELECT COUNT(*) INTO v_cat_count
    FROM user_trivia_responses utr, jsonb_array_elements(utr.answers->'questions') q
    WHERE utr.user_id = v_user_id AND (q->>'correct')::boolean = true AND q->>'category' = 'SEC Knowledge';
  IF v_cat_count >= 30 THEN
    INSERT INTO user_badges (user_id, badge_key) VALUES (v_user_id, 'sec_savant')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'already_completed', false,
    'score', v_score,
    'correct', v_correct,
    'total', 5,
    'answers', jsonb_build_object('questions', v_answers_json, 'correct', v_correct)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_trivia_answers(DATE, JSONB) TO authenticated;
