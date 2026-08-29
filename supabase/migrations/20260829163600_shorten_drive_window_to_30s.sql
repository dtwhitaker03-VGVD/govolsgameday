-- Shorten the drive prediction pick window from 60s to 30s.
-- Based on live-test observation (2026-08-29, TCU vs North Carolina):
-- 60s left too much dead time between the window opening and users
-- actually picking; 30s keeps urgency without cutting picks short.

ALTER TABLE public.drive_windows
  ALTER COLUMN window_locked_at SET DEFAULT (NOW() + INTERVAL '30 seconds');

CREATE OR REPLACE FUNCTION public.open_drive_window(
  p_game_id       UUID,
  p_drive_number  INTEGER,
  p_yardline      INTEGER  DEFAULT 25,
  p_quarter       INTEGER  DEFAULT 2,
  p_game_clock    TEXT     DEFAULT '12:00',
  p_score_diff    INTEGER  DEFAULT 0,
  p_down          INTEGER  DEFAULT 1,
  p_distance      INTEGER  DEFAULT 10,
  p_cfbd_drive_id TEXT     DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_td   INTEGER := 50;
  v_fg   INTEGER := 50;
  v_punt INTEGER := 50;
  v_turn INTEGER := 55;
  v_safe INTEGER := 58;
  v_tod  INTEGER := 55;
  v_eoq  INTEGER := 55;
  clock_mins INTEGER;
  new_id UUID;
BEGIN
  clock_mins := COALESCE(
    NULLIF(SPLIT_PART(COALESCE(p_game_clock, '15:00'), ':', 1), '')::INTEGER, 15);

  -- ── Field-position adjustments ─────────────────────────────────────────
  IF p_yardline >= 80 THEN          -- red zone
    v_td   := 41; v_fg := 43; v_punt := 58; v_eoq := 56;
  ELSIF p_yardline >= 60 THEN       -- opponent territory
    v_td   := 45; v_fg := 45; v_punt := 52;
  ELSIF p_yardline >= 40 THEN       -- midfield
    v_td   := 48; v_fg := 48; v_punt := 48;
  ELSIF p_yardline <= 20 THEN       -- own end, backed up
    v_td   := 57; v_fg := 57; v_punt := 40; v_safe := 46;
  END IF;

  -- ── Score/situation adjustments ────────────────────────────────────────
  IF p_score_diff <= -14 AND p_quarter = 4 THEN
    v_td   := GREATEST(40, v_td   - 4);
    v_fg   := v_fg + 3;
    v_punt := LEAST(60, v_punt + 4);
  END IF;

  -- ── End-of-half clock adjustments ──────────────────────────────────────
  IF (p_quarter = 2 OR p_quarter = 4) AND clock_mins <= 2 THEN
    v_eoq  := GREATEST(40, v_eoq - 10);
    v_punt := LEAST(60, v_punt + 4);
  ELSIF p_quarter IN (1, 3) AND clock_mins <= 1 THEN
    v_eoq  := GREATEST(40, v_eoq - 6);
  END IF;

  -- Clamp all values to [40, 60]
  v_td   := GREATEST(40, LEAST(60, v_td));
  v_fg   := GREATEST(40, LEAST(60, v_fg));
  v_punt := GREATEST(40, LEAST(60, v_punt));
  v_turn := GREATEST(40, LEAST(60, v_turn));
  v_safe := GREATEST(40, LEAST(60, v_safe));
  v_tod  := GREATEST(40, LEAST(60, v_tod));
  v_eoq  := GREATEST(40, LEAST(60, v_eoq));

  INSERT INTO public.drive_windows (
    game_id, drive_number, cfbd_drive_id,
    window_opened_at, window_locked_at,
    pts_touchdown, pts_field_goal, pts_punt, pts_turnover,
    pts_safety, pts_turnover_on_downs, pts_end_of_quarter,
    yardline, down, distance, score_differential, quarter, game_clock
  ) VALUES (
    p_game_id, p_drive_number, p_cfbd_drive_id,
    NOW(), NOW() + INTERVAL '30 seconds',
    v_td, v_fg, v_punt, v_turn, v_safe, v_tod, v_eoq,
    p_yardline, p_down, p_distance, p_score_diff, p_quarter, p_game_clock
  )
  ON CONFLICT (game_id, drive_number) DO UPDATE SET
    window_opened_at      = NOW(),
    window_locked_at      = NOW() + INTERVAL '30 seconds',
    status                = 'open',
    actual_outcome        = NULL,
    pts_touchdown         = EXCLUDED.pts_touchdown,
    pts_field_goal        = EXCLUDED.pts_field_goal,
    pts_punt              = EXCLUDED.pts_punt,
    pts_turnover          = EXCLUDED.pts_turnover,
    pts_safety            = EXCLUDED.pts_safety,
    pts_turnover_on_downs = EXCLUDED.pts_turnover_on_downs,
    pts_end_of_quarter    = EXCLUDED.pts_end_of_quarter,
    yardline              = EXCLUDED.yardline,
    down                  = EXCLUDED.down,
    distance              = EXCLUDED.distance,
    score_differential    = EXCLUDED.score_differential,
    quarter               = EXCLUDED.quarter,
    game_clock            = EXCLUDED.game_clock
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
