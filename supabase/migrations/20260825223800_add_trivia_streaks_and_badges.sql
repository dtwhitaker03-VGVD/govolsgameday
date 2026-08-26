/*
# Trivia Streak Maintenance + Trivia Badges

## Summary
`profiles.trivia_streak_current`/`trivia_streak_best` have existed since the
original schema but nothing ever wrote to them. This migration makes
`submit_trivia_answers()` maintain them (increments on a consecutive-day
completion, resets to 1 otherwise) and awards all 15 trivia badges inline,
at the same point points are already credited.

## Changes
- `submit_trivia_answers()`: after inserting the day's result, computes the
  streak from the user's most recent prior `trivia_date`, updates
  `trivia_streak_current`/`best`, then awards:
  trivia_first_try, trivia_perfect, trivia_perfectionist (10 perfect days),
  trivia_streak_3/7/30/100, trivia_century/vol_scholar (points_trivia
  crossing 1,000/10,000 — checked as a threshold *crossing*, not an exact
  match, since trivia points increase by variable tiered amounts and could
  jump past an exact value), trivia_iron_man (best streak crossing 200),
  and the 5 category-mastery badges — computed directly from the
  `answers.questions[].category`/`.correct` fields already stored in
  `user_trivia_responses`, no extra join needed.

## Security
- Same SECURITY DEFINER function, same grant, no RLS changes.
*/

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
  v_perfect_days  INTEGER;
  v_cat_count     INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check for existing completion today
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

  -- Fetch today's questions and score them
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

  -- Was this the user's very first completion ever?
  SELECT NOT EXISTS(SELECT 1 FROM user_trivia_responses WHERE user_id = v_user_id) INTO v_is_first_ever;

  -- Most recent prior completion date, for streak math
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

  -- Streak maintenance
  IF v_last_date = p_trivia_date - 1 THEN
    SELECT trivia_streak_current + 1 INTO v_new_streak FROM profiles WHERE id = v_user_id;
  ELSE
    v_new_streak := 1;
  END IF;

  SELECT trivia_streak_best, points_trivia INTO v_old_best, v_old_trivia_pts FROM profiles WHERE id = v_user_id;
  v_new_best := GREATEST(v_old_best, v_new_streak);
  v_new_trivia_pts := v_old_trivia_pts + v_score;

  UPDATE profiles
    SET points_trivia          = v_new_trivia_pts,
        total_points           = total_points + v_score,
        trivia_streak_current  = v_new_streak,
        trivia_streak_best     = v_new_best
    WHERE id = v_user_id;

  -- ── Badge awards ────────────────────────────────────────────────────────
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

  -- Category mastery — derived from stored answers.questions[], no extra join
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
