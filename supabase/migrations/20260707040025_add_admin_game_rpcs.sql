
-- ============================================================
-- admin_create_test_game
-- Inserts a new test game into live_games.
-- Requires the calling user to have is_admin = TRUE (enforced
-- when auth.uid() is not null — service-role callers bypass).
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_create_test_game(
  p_home_team    TEXT,
  p_away_team    TEXT,
  p_kickoff_time TIMESTAMPTZ
) RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
BEGIN
  -- Enforce admin check for authenticated (non-service-role) callers
  IF auth.uid() IS NOT NULL THEN
    IF NOT (SELECT COALESCE(is_admin, FALSE) FROM public.profiles WHERE id = auth.uid()) THEN
      RAISE EXCEPTION 'Unauthorized: admin access required.';
    END IF;
  END IF;

  INSERT INTO public.live_games (
    cfbd_game_id,
    home_team,
    away_team,
    kickoff_time,
    status,
    home_score,
    away_score
  ) VALUES (
    (FLOOR(RANDOM() * 900000) + 100000)::INTEGER,
    p_home_team,
    p_away_team,
    p_kickoff_time,
    'scheduled',
    0,
    0
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- admin_update_game
-- Updates live_games status + scores.
-- Same admin-or-service-role guard as above.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_update_game(
  p_game_id    UUID,
  p_status     TEXT,
  p_home_score INTEGER,
  p_away_score INTEGER
) RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT (SELECT COALESCE(is_admin, FALSE) FROM public.profiles WHERE id = auth.uid()) THEN
      RAISE EXCEPTION 'Unauthorized: admin access required.';
    END IF;
  END IF;

  UPDATE public.live_games
  SET
    status     = p_status,
    home_score = p_home_score,
    away_score = p_away_score
  WHERE id = p_game_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
