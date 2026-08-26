
-- ── RPC: submit_trivia_answers ──────────────────────────────────────────────
-- Called by the client after the user completes all 5 trivia questions.
-- Computes the score server-side (zero-client-side-math rule §0/§41),
-- stores the response row, updates profiles.points_trivia + total_points,
-- and returns the computed score + correct answers.
--
-- Parameters:
--   p_trivia_date  DATE  — the scheduled_date of the trivia questions
--   p_answers      JSONB — array of {slot, selected} objects, e.g.
--                          [{"slot":1,"selected":"A"},{"slot":2,"selected":"C"},...]
--
-- Returns: JSON with score, correct_answers, total_questions

CREATE OR REPLACE FUNCTION public.submit_trivia_answers(
  p_trivia_date DATE,
  p_answers     JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id     UUID := auth.uid();
  v_score       INTEGER := 0;
  v_correct     INTEGER := 0;
  v_total       INTEGER := 0;
  v_existing     RECORD;
  v_answers_json JSONB := '[]'::jsonb;
  v_q            RECORD;
  v_selected     CHAR(1);
  v_answer_entry JSONB;
BEGIN
  -- Must be authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if already completed today (one session per user per day)
  SELECT * INTO v_existing
  FROM public.user_trivia_responses
  WHERE user_id = v_user_id AND trivia_date = p_trivia_date;

  IF FOUND THEN
    -- Already completed — return existing result
    RETURN jsonb_build_object(
      'score', v_existing.score,
      'correct', (v_existing.answers->>'correct')::int,
      'total', 5,
      'already_completed', true,
      'answers', v_existing.answers
    );
  END IF;

  -- Fetch today's questions and score them
  FOR v_q IN
    SELECT slot, correct_answer, question, option_a, option_b, option_c, option_d,
           difficulty, category
    FROM public.trivia_questions
    WHERE scheduled_date = p_trivia_date
    ORDER BY slot ASC
  LOOP
    v_total := v_total + 1;

    -- Find the user's answer for this slot
    SELECT (elem->>'selected')::char INTO v_selected
    FROM jsonb_array_elements(p_answers) AS elem
    WHERE (elem->>'slot')::int = v_q.slot
    LIMIT 1;

    v_selected := COALESCE(v_selected, '');

    -- Score: correct = 20 pts, wrong/timeout = 0
    IF v_selected = v_q.correct_answer THEN
      v_score := v_score + 20;
      v_correct := v_correct + 1;
    END IF;

    -- Build answer entry for storage
    v_answer_entry := jsonb_build_object(
      'slot', v_q.slot,
      'question', v_q.question,
      'option_a', v_q.option_a,
      'option_b', v_q.option_b,
      'option_c', v_q.option_c,
      'option_d', v_q.option_d,
      'correct_answer', v_q.correct_answer,
      'selected', v_selected,
      'correct', v_selected = v_q.correct_answer,
      'difficulty', v_q.difficulty,
      'category', v_q.category
    );
    v_answers_json := v_answers_json || jsonb_build_array(v_answer_entry);
  END LOOP;

  -- Store the response
  INSERT INTO public.user_trivia_responses (
    user_id, trivia_date, score, answers, completed_at
  ) VALUES (
    v_user_id, p_trivia_date, v_score,
    jsonb_build_object('questions', v_answers_json, 'correct', v_correct),
    NOW()
  )
  ON CONFLICT (user_id, trivia_date) DO NOTHING;

  -- Update profile: add to points_trivia and total_points
  UPDATE public.profiles
  SET
    points_trivia = points_trivia + v_score,
    total_points  = total_points + v_score
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'score', v_score,
    'correct', v_correct,
    'total', v_total,
    'already_completed', false,
    'answers', jsonb_build_object('questions', v_answers_json, 'correct', v_correct)
  );
END;
$$;

-- ── RPC: get_trivia_percentile ──────────────────────────────────────────────
-- Returns the calling user's percentile for a given trivia date,
-- comparing their score against all other users who completed that day.
-- Does NOT expose other users' raw scores — only the percentile.
--
-- Returns: JSON with percentile (0-100, higher = better than X% of fans)

CREATE OR REPLACE FUNCTION public.get_trivia_percentile(
  p_trivia_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_user_score INTEGER;
  v_total      INTEGER;
  v_below      INTEGER;
  v_percentile NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get the user's score for this date
  SELECT score INTO v_user_score
  FROM public.user_trivia_responses
  WHERE user_id = v_user_id AND trivia_date = p_trivia_date;

  IF v_user_score IS NULL THEN
    RETURN jsonb_build_object('percentile', null, 'total_participants', 0);
  END IF;

  -- Count total participants and how many scored below this user
  SELECT COUNT(*), COUNT(*) FILTER (WHERE score < v_user_score)
  INTO v_total, v_below
  FROM public.user_trivia_responses
  WHERE trivia_date = p_trivia_date;

  -- Percentile: what percentage of participants scored below this user
  -- If only 1 participant (just this user), return 100 (they're the best so far)
  IF v_total <= 1 THEN
    v_percentile := 100;
  ELSE
    v_percentile := ROUND((v_below::numeric / (v_total - 1)) * 100, 0);
  END IF;

  RETURN jsonb_build_object(
    'percentile', v_percentile,
    'total_participants', v_total
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.submit_trivia_answers(DATE, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trivia_percentile(DATE) TO authenticated;
