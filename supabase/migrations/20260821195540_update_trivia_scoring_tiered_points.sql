-- Update submit_trivia_answers to use tiered per-question scoring:
--   slot 1 = 10 pts, slot 2 = 15, slot 3 = 20, slot 4 = 25, slot 5 = 30
-- Total possible remains 100. Previously every correct answer was worth 20.

CREATE OR REPLACE FUNCTION public.submit_trivia_answers(
  p_trivia_date DATE,
  p_answers      JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id     UUID := auth.uid();
  v_existing    RECORD;
  v_q           RECORD;
  v_selected    TEXT;
  v_score       INTEGER := 0;
  v_correct     INTEGER := 0;
  v_answers_json JSONB := '[]'::jsonb;
  v_points      INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check for existing completion today
  SELECT score, answers
    INTO v_existing
    FROM trivia_results
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
      WHERE trivia_date = p_trivia_date
    ORDER BY slot ASC
  LOOP
    -- Find the user's answer for this slot
    SELECT COALESCE((elem->>'selected')::text, '')
      INTO v_selected
      FROM jsonb_array_elements(p_answers) AS elem
      WHERE (elem->>'slot')::int = v_q.slot
      LIMIT 1;

    -- Tiered points by slot: 1→10, 2→15, 3→20, 4→25, 5→30
    v_points := 10 + (v_q.slot - 1) * 5;

    -- Score: correct = tiered pts, wrong/timeout = 0
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

  -- Insert the result
  INSERT INTO trivia_results (user_id, trivia_date, score, answers, completed_at)
  VALUES (
    v_user_id, p_trivia_date, v_score,
    jsonb_build_object('questions', v_answers_json, 'correct', v_correct),
    now()
  );

  -- Add points to the user's profile
  UPDATE profiles
    SET points_trivia = points_trivia + v_score,
        total_points  = total_points + v_score
    WHERE id = v_user_id;

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
