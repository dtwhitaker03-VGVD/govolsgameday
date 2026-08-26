
-- ============================================================
-- drive_windows — one row per drive in a game
-- Holds the prediction window timing + independent point values
-- per outcome (40–60 range each, NOT constrained to sum to 100)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.drive_windows (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id               UUID        NOT NULL REFERENCES public.live_games(id) ON DELETE CASCADE,
  drive_number          INTEGER     NOT NULL,
  cfbd_drive_id         TEXT,
  window_opened_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_locked_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '60 seconds'),
  status                VARCHAR(20) NOT NULL DEFAULT 'open',  -- 'open'|'locked'|'resolved'
  actual_outcome        VARCHAR(30),
  -- Independent point values per outcome (40–60 each)
  pts_touchdown         INTEGER     NOT NULL DEFAULT 50,
  pts_field_goal        INTEGER     NOT NULL DEFAULT 50,
  pts_punt              INTEGER     NOT NULL DEFAULT 50,
  pts_turnover          INTEGER     NOT NULL DEFAULT 55,
  pts_safety            INTEGER     NOT NULL DEFAULT 58,
  pts_turnover_on_downs INTEGER     NOT NULL DEFAULT 55,
  pts_end_of_quarter    INTEGER     NOT NULL DEFAULT 55,
  -- Situational context snapshot
  yardline              INTEGER,
  down                  INTEGER,
  distance              INTEGER,
  score_differential    INTEGER     DEFAULT 0,
  quarter               INTEGER     DEFAULT 1,
  game_clock            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(game_id, drive_number)
);

ALTER TABLE public.drive_windows ENABLE ROW LEVEL SECURITY;

-- All users (including logged-out) can read drive windows to see prediction buttons
CREATE POLICY "drive_windows_read_all" ON public.drive_windows
  FOR SELECT TO anon, authenticated USING (true);

-- No direct INSERT/UPDATE/DELETE — only via SECURITY DEFINER RPCs below

ALTER PUBLICATION supabase_realtime ADD TABLE public.drive_windows;


-- ============================================================
-- submit_pregame_prediction
-- Upserts the user's 5 pre-game picks.
-- Enforces T-10 lock server-side; all math deferred to settlement.
-- ============================================================

CREATE OR REPLACE FUNCTION public.submit_pregame_prediction(
  p_game_id         UUID,
  p_predicted_winner VARCHAR(4),   -- 'home' | 'away'
  p_home_score      INTEGER,
  p_away_score      INTEGER,
  p_home_yards      INTEGER,
  p_away_yards      INTEGER
) RETURNS VOID AS $$
DECLARE
  v_game      RECORD;
  v_lock_time TIMESTAMPTZ;
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

  -- Score bounds (0–99), yards bounds (0–999)
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- calculate_pregame_points
-- Exact implementation from §12.1.
-- Run after live_games.status → 'final' to score all picks.
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_pregame_points(p_game_id UUID)
RETURNS VOID AS $$
DECLARE
  game RECORD;
  pred RECORD;
  w_pts  INTEGER;
  hs_pts INTEGER; hs_bonus INTEGER;
  as_pts INTEGER; as_bonus INTEGER;
  hy_pts INTEGER; hy_bonus INTEGER;
  ay_pts INTEGER; ay_bonus INTEGER;
  total  INTEGER;
BEGIN
  SELECT * INTO game FROM public.live_games WHERE id = p_game_id;
  IF NOT FOUND THEN RETURN; END IF;

  FOR pred IN SELECT * FROM public.pregame_predictions WHERE game_id = p_game_id LOOP
    -- Winner: 100 pts flat
    w_pts := CASE
      WHEN pred.predicted_winner = 'home' AND game.home_score > game.away_score THEN 100
      WHEN pred.predicted_winner = 'away' AND game.away_score > game.home_score THEN 100
      ELSE 0
    END;

    -- Home score: up to 100, +50 exact-match bonus
    hs_pts   := GREATEST(0, 100 - (5 * ABS(pred.predicted_home_score - game.home_score)));
    hs_bonus := CASE WHEN pred.predicted_home_score = game.home_score THEN 50 ELSE 0 END;

    -- Away score: up to 100, +50 exact-match bonus
    as_pts   := GREATEST(0, 100 - (5 * ABS(pred.predicted_away_score - game.away_score)));
    as_bonus := CASE WHEN pred.predicted_away_score = game.away_score THEN 50 ELSE 0 END;

    -- Home yards: up to 200, +100 exact-match bonus
    hy_pts   := GREATEST(0, 200 - ABS(pred.predicted_home_yards - COALESCE(game.home_total_yards, 0)));
    hy_bonus := CASE WHEN pred.predicted_home_yards = COALESCE(game.home_total_yards, 0) THEN 100 ELSE 0 END;

    -- Away yards: up to 200, +100 exact-match bonus
    ay_pts   := GREATEST(0, 200 - ABS(pred.predicted_away_yards - COALESCE(game.away_total_yards, 0)));
    ay_bonus := CASE WHEN pred.predicted_away_yards = COALESCE(game.away_total_yards, 0) THEN 100 ELSE 0 END;

    total := w_pts
           + (hs_pts + hs_bonus)
           + (as_pts + as_bonus)
           + (hy_pts + hy_bonus)
           + (ay_pts + ay_bonus);

    UPDATE public.pregame_predictions SET
      winner_correct       = (w_pts = 100),
      home_score_points    = hs_pts + hs_bonus,
      away_score_points    = as_pts + as_bonus,
      home_yards_points    = hy_pts + hy_bonus,
      away_yards_points    = ay_pts + ay_bonus,
      total_pregame_points = total
    WHERE id = pred.id;
  END LOOP;

  -- Upsert into game_leaderboard with pregame totals + tiebreaker diffs
  INSERT INTO public.game_leaderboard
    (game_id, user_id, username, pregame_points, total_game_points, home_yards_diff, away_yards_diff)
  SELECT
    p_game_id,
    pp.user_id,
    p.username,
    pp.total_pregame_points,
    pp.total_pregame_points + COALESCE(gl.total_drive_points, 0),
    ABS(pp.predicted_home_yards - COALESCE(game.home_total_yards, 0)),
    ABS(pp.predicted_away_yards - COALESCE(game.away_total_yards, 0))
  FROM public.pregame_predictions pp
  JOIN  public.profiles p ON p.id = pp.user_id
  LEFT JOIN public.game_leaderboard gl
    ON gl.game_id = p_game_id AND gl.user_id = pp.user_id
  WHERE pp.game_id = p_game_id AND pp.total_pregame_points IS NOT NULL
  ON CONFLICT (game_id, user_id) DO UPDATE SET
    pregame_points    = EXCLUDED.pregame_points,
    total_game_points = EXCLUDED.pregame_points + game_leaderboard.total_drive_points,
    home_yards_diff   = EXCLUDED.home_yards_diff,
    away_yards_diff   = EXCLUDED.away_yards_diff,
    updated_at        = NOW();

  -- Recompute ranks: descending points, tiebreaker home_yards_diff ASC, away_yards_diff ASC
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- open_drive_window
-- Opens a 60-second prediction window for a new drive and
-- computes independent 40-60 pt values for each of the 7 outcomes
-- based on situational context (yardline, quarter, clock, score).
-- ============================================================

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
    NOW(), NOW() + INTERVAL '60 seconds',
    v_td, v_fg, v_punt, v_turn, v_safe, v_tod, v_eoq,
    p_yardline, p_down, p_distance, p_score_diff, p_quarter, p_game_clock
  )
  ON CONFLICT (game_id, drive_number) DO UPDATE SET
    window_opened_at      = NOW(),
    window_locked_at      = NOW() + INTERVAL '60 seconds',
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


-- ============================================================
-- submit_drive_prediction
-- Looks up points_possible from drive_windows server-side
-- (frontend never sends or calculates this value).
-- Rejects submissions after the 60-second window closes.
-- ============================================================

CREATE OR REPLACE FUNCTION public.submit_drive_prediction(
  p_game_id      UUID,
  p_drive_number INTEGER,
  p_prediction   VARCHAR(30)
) RETURNS VOID AS $$
DECLARE
  v_win          RECORD;
  v_pts_possible INTEGER;
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- settle_drive_outcome
-- Resolves a drive: scores every submitted pick, updates streaks,
-- awards hot-streak badges, upserts game_leaderboard, resets
-- streak for participants who missed the window.
-- All math is server-side (§0 Rule 1 / §41 Rule 1).
-- Returns the count of predictions processed.
-- ============================================================

CREATE OR REPLACE FUNCTION public.settle_drive_outcome(
  p_game_id       UUID,
  p_drive_number  INTEGER,
  p_actual_outcome VARCHAR(30)
) RETURNS INTEGER AS $$
DECLARE
  v_win        RECORD;
  v_pred       RECORD;
  v_pts_win    INTEGER;
  v_new_streak INTEGER;
  v_mult       NUMERIC(4,2);
  v_pts_earned INTEGER;
  v_processed  INTEGER := 0;
BEGIN
  -- Resolve the window
  UPDATE public.drive_windows
  SET status = 'resolved', actual_outcome = p_actual_outcome
  WHERE game_id = p_game_id AND drive_number = p_drive_number
  RETURNING * INTO v_win;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No drive window found for game % drive %', p_game_id, p_drive_number;
  END IF;

  -- Point value that the correct outcome was worth
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

  -- ── Score each submitted pick ────────────────────────────────────────────
  FOR v_pred IN
    SELECT dp.id, dp.user_id, dp.prediction, p.current_streak_count
    FROM public.drive_predictions dp
    JOIN public.profiles p ON p.id = dp.user_id
    WHERE dp.game_id = p_game_id AND dp.drive_number = p_drive_number
      AND dp.status IN ('open', 'locked')
  LOOP
    IF v_pred.prediction = p_actual_outcome THEN
      v_new_streak := v_pred.current_streak_count + 1;
      -- Multiplier table from §12.2 — applied to the pick that achieved streak N
      v_mult := CASE v_new_streak
        WHEN 1 THEN 1.00
        WHEN 2 THEN 1.25
        WHEN 3 THEN 1.50
        WHEN 4 THEN 2.00
        WHEN 5 THEN 3.00
        ELSE        4.00  -- 6+
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

    -- Update streak and hot-streak flag
    UPDATE public.profiles SET
      current_streak_count = v_new_streak,
      hot_streak_active    = (v_new_streak >= 3)
    WHERE id = v_pred.user_id;

    -- Badge awards for streak milestones
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

    -- Upsert into game_leaderboard
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

  -- ── Reset streak for participants who missed this drive ───────────────────
  -- "Failing to pick in time = wrong answer = streak resets" §12.2
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

  -- ── Recompute all ranks for this game ─────────────────────────────────────
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


-- ============================================================
-- finalize_game
-- Called when live_games.status is set to 'final'.
-- Runs calculate_pregame_points, marks game 'calculated',
-- credits points to profiles, and awards game-end badges.
-- ============================================================

CREATE OR REPLACE FUNCTION public.finalize_game(p_game_id UUID)
RETURNS VOID AS $$
BEGIN
  -- 1. Score all pregame predictions
  PERFORM public.calculate_pregame_points(p_game_id);

  -- 2. Mark game calculated
  UPDATE public.live_games SET status = 'calculated' WHERE id = p_game_id;

  -- 3. Credit total_game_points to profile sport columns
  UPDATE public.profiles p
  SET
    points_football = p.points_football + gl.total_game_points,
    total_points    = p.total_points    + gl.total_game_points
  FROM public.game_leaderboard gl
  WHERE gl.game_id = p_game_id AND gl.user_id = p.id;

  -- 4. Awards: winner pick
  INSERT INTO public.user_badges (user_id, badge_key)
  SELECT pp.user_id, 'picked_the_winner'
  FROM public.pregame_predictions pp
  WHERE pp.game_id = p_game_id AND pp.winner_correct = TRUE
  ON CONFLICT (user_id, badge_key) DO NOTHING;

  -- 5. Awards: perfect score predictor (both scores exact = 150 pts each)
  INSERT INTO public.user_badges (user_id, badge_key)
  SELECT pp.user_id, 'perfect_point_predictor'
  FROM public.pregame_predictions pp
  WHERE pp.game_id = p_game_id
    AND pp.home_score_points = 150
    AND pp.away_score_points = 150
  ON CONFLICT (user_id, badge_key) DO NOTHING;

  -- 6. Awards: perfect yardage predictor (both yards exact = 300 pts each)
  INSERT INTO public.user_badges (user_id, badge_key)
  SELECT pp.user_id, 'perfect_yardage_predictor'
  FROM public.pregame_predictions pp
  WHERE pp.game_id = p_game_id
    AND pp.home_yards_points = 300
    AND pp.away_yards_points = 300
  ON CONFLICT (user_id, badge_key) DO NOTHING;

  -- 7. Awards: gameday top 10 and winner
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
