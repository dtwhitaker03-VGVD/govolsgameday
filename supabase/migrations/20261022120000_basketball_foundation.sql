-- Men's basketball foundation: pregame predictions (reusing pregame_predictions,
-- game_props, game_leaderboard), the live "stretch" prediction game (TV timeout
-- to TV timeout), and the finalize path. Football is untouched except that
-- finalize_game() now dispatches to finalize_game_bb() for sport = 'basketball'.
--
-- Statements are separated by "-- @@" lines so they can be applied one at a time.

ALTER TABLE public.live_games ADD COLUMN IF NOT EXISTS bb_stats JSONB;

-- Basketball has no yardage guesses.
ALTER TABLE public.pregame_predictions ALTER COLUMN predicted_home_yards DROP NOT NULL;

ALTER TABLE public.pregame_predictions ALTER COLUMN predicted_away_yards DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.submit_pregame_prediction_bb(
  p_game_id          UUID,
  p_predicted_winner VARCHAR,
  p_home_score       INTEGER,
  p_away_score       INTEGER,
  p_spread_pick      TEXT DEFAULT NULL,
  p_total_pick       TEXT DEFAULT NULL,
  p_prop_picks       JSONB DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game       RECORD;
  v_game_count INTEGER;
  v_prop_pick  RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to make picks.'; END IF;

  SELECT id, sport, kickoff_time, status, spread_line_tn, total_points_line
    INTO v_game
  FROM public.live_games WHERE id = p_game_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Game not found.'; END IF;
  IF v_game.sport <> 'basketball' THEN RAISE EXCEPTION 'Not a basketball game.'; END IF;

  IF NOW() >= v_game.kickoff_time - INTERVAL '10 minutes' THEN
    RAISE EXCEPTION 'Pre-game predictions are locked for this game.';
  END IF;

  IF p_predicted_winner NOT IN ('home', 'away') THEN
    RAISE EXCEPTION 'Invalid winner choice.';
  END IF;
  IF p_home_score < 0 OR p_home_score > 199 OR p_away_score < 0 OR p_away_score > 199 THEN
    RAISE EXCEPTION 'Scores must be 0-199.';
  END IF;

  IF p_spread_pick IS NOT NULL THEN
    IF p_spread_pick NOT IN ('over', 'under') THEN RAISE EXCEPTION 'Invalid spread pick.'; END IF;
    IF v_game.spread_line_tn IS NULL THEN RAISE EXCEPTION 'No spread line is available for this game yet.'; END IF;
  END IF;
  IF p_total_pick IS NOT NULL THEN
    IF p_total_pick NOT IN ('over', 'under') THEN RAISE EXCEPTION 'Invalid total points pick.'; END IF;
    IF v_game.total_points_line IS NULL THEN RAISE EXCEPTION 'No total points line is available for this game yet.'; END IF;
  END IF;

  INSERT INTO public.pregame_predictions (
    game_id, user_id, predicted_winner, predicted_home_score, predicted_away_score,
    predicted_spread_pick, predicted_total_pick
  ) VALUES (
    p_game_id, auth.uid(), p_predicted_winner, p_home_score, p_away_score,
    p_spread_pick, p_total_pick
  )
  ON CONFLICT (game_id, user_id) DO UPDATE SET
    predicted_winner      = EXCLUDED.predicted_winner,
    predicted_home_score  = EXCLUDED.predicted_home_score,
    predicted_away_score  = EXCLUDED.predicted_away_score,
    predicted_spread_pick = EXCLUDED.predicted_spread_pick,
    predicted_total_pick  = EXCLUDED.predicted_total_pick,
    submitted_at          = NOW();

  IF p_prop_picks IS NOT NULL AND jsonb_array_length(p_prop_picks) > 0 THEN
    FOR v_prop_pick IN SELECT * FROM jsonb_to_recordset(p_prop_picks) AS x(prop_id uuid, pick text) LOOP
      IF v_prop_pick.pick NOT IN ('over', 'under') THEN RAISE EXCEPTION 'Invalid prop pick.'; END IF;
      IF NOT EXISTS (SELECT 1 FROM public.game_props WHERE id = v_prop_pick.prop_id AND game_id = p_game_id) THEN
        RAISE EXCEPTION 'Invalid prop for this game.';
      END IF;
      INSERT INTO public.pregame_prop_picks (prop_id, game_id, user_id, pick)
      VALUES (v_prop_pick.prop_id, p_game_id, auth.uid(), v_prop_pick.pick)
      ON CONFLICT (prop_id, user_id) DO UPDATE SET pick = EXCLUDED.pick, submitted_at = NOW();
    END LOOP;
  END IF;

  SELECT COUNT(*) INTO v_game_count FROM public.pregame_predictions WHERE user_id = auth.uid();
  IF v_game_count = 1 THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (auth.uid(), 'first_pick')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  ELSIF v_game_count = 10 THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (auth.uid(), 'veteran_predictor')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;
END;
$$;

-- Scoring: winner 100; each team's score 100 minus 4 per point missed (floor 0)
-- plus a 50 bonus for exact; spread and total 100 each; props as in football.
-- (Football's 5-per-point would score almost every basketball guess zero.)
CREATE OR REPLACE FUNCTION public.calculate_pregame_points_bb(p_game_id UUID) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  game RECORD;
  pred RECORD;
  w_pts INTEGER;
  hs_pts INTEGER; hs_bonus INTEGER;
  as_pts INTEGER; as_bonus INTEGER;
  v_tn_margin INTEGER;
  v_total_actual INTEGER;
  sp_pts INTEGER;
  tot_pts INTEGER;
  prop_pts INTEGER;
  total INTEGER;
BEGIN
  SELECT * INTO game FROM public.live_games WHERE id = p_game_id;
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.pregame_prop_picks ppp
  SET correct       = (gp.actual_result <> 'push' AND ppp.pick = gp.actual_result),
      points_earned = CASE WHEN gp.actual_result <> 'push' AND ppp.pick = gp.actual_result THEN gp.points_value ELSE 0 END
  FROM public.game_props gp
  WHERE ppp.prop_id = gp.id AND gp.game_id = p_game_id AND gp.actual_result IS NOT NULL;

  FOR pred IN SELECT * FROM public.pregame_predictions WHERE game_id = p_game_id LOOP
    w_pts := CASE
      WHEN pred.predicted_winner = 'home' AND game.home_score > game.away_score THEN 100
      WHEN pred.predicted_winner = 'away' AND game.away_score > game.home_score THEN 100
      ELSE 0
    END;

    hs_pts   := GREATEST(0, 100 - (4 * ABS(pred.predicted_home_score - game.home_score)));
    hs_bonus := CASE WHEN pred.predicted_home_score = game.home_score THEN 50 ELSE 0 END;
    as_pts   := GREATEST(0, 100 - (4 * ABS(pred.predicted_away_score - game.away_score)));
    as_bonus := CASE WHEN pred.predicted_away_score = game.away_score THEN 50 ELSE 0 END;

    v_tn_margin := CASE WHEN game.home_team = 'Tennessee' THEN game.home_score - game.away_score
                        ELSE game.away_score - game.home_score END;
    v_total_actual := game.home_score + game.away_score;

    IF game.spread_line_tn IS NOT NULL AND pred.predicted_spread_pick IS NOT NULL THEN
      sp_pts := CASE
        WHEN (v_tn_margin + game.spread_line_tn) > 0 AND pred.predicted_spread_pick = 'over'  THEN 100
        WHEN (v_tn_margin + game.spread_line_tn) < 0 AND pred.predicted_spread_pick = 'under' THEN 100
        ELSE 0 END;
    ELSE
      sp_pts := 0;
    END IF;

    IF game.total_points_line IS NOT NULL AND pred.predicted_total_pick IS NOT NULL THEN
      tot_pts := CASE
        WHEN v_total_actual > game.total_points_line AND pred.predicted_total_pick = 'over'  THEN 100
        WHEN v_total_actual < game.total_points_line AND pred.predicted_total_pick = 'under' THEN 100
        ELSE 0 END;
    ELSE
      tot_pts := 0;
    END IF;

    SELECT COALESCE(SUM(points_earned), 0) INTO prop_pts
    FROM public.pregame_prop_picks WHERE game_id = p_game_id AND user_id = pred.user_id;

    total := w_pts + (hs_pts + hs_bonus) + (as_pts + as_bonus) + sp_pts + tot_pts + prop_pts;

    UPDATE public.pregame_predictions SET
      winner_correct      = (w_pts = 100),
      home_score_points   = hs_pts + hs_bonus,
      away_score_points   = as_pts + as_bonus,
      spread_pick_correct = (sp_pts = 100),
      spread_pick_points  = sp_pts,
      total_pick_correct  = (tot_pts = 100),
      total_pick_points   = tot_pts,
      total_pregame_points = total
    WHERE id = pred.id;
  END LOOP;

  -- Leaderboard tie-break reuses the yards-diff columns for the score misses.
  INSERT INTO public.game_leaderboard
    (game_id, user_id, username, pregame_points, total_game_points, home_yards_diff, away_yards_diff)
  SELECT p_game_id, pp.user_id, p.username, pp.total_pregame_points,
         pp.total_pregame_points + COALESCE(gl.total_drive_points, 0),
         ABS(pp.predicted_home_score - game.home_score),
         ABS(pp.predicted_away_score - game.away_score)
  FROM public.pregame_predictions pp
  JOIN public.profiles p ON p.id = pp.user_id
  LEFT JOIN public.game_leaderboard gl ON gl.game_id = p_game_id AND gl.user_id = pp.user_id
  WHERE pp.game_id = p_game_id AND pp.total_pregame_points IS NOT NULL
  ON CONFLICT (game_id, user_id) DO UPDATE SET
    pregame_points    = EXCLUDED.pregame_points,
    total_game_points = EXCLUDED.pregame_points + game_leaderboard.total_drive_points,
    home_yards_diff   = EXCLUDED.home_yards_diff,
    away_yards_diff   = EXCLUDED.away_yards_diff,
    updated_at        = NOW();

  UPDATE public.game_leaderboard gl
  SET rank = sub.r
  FROM (
    SELECT id, RANK() OVER (
      PARTITION BY game_id
      ORDER BY total_game_points DESC, home_yards_diff ASC NULLS LAST, away_yards_diff ASC NULLS LAST
    ) AS r
    FROM public.game_leaderboard WHERE game_id = p_game_id
  ) sub
  WHERE gl.id = sub.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_game_bb(p_game_id UUID) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.calculate_pregame_points_bb(p_game_id);

  UPDATE public.live_games SET status = 'calculated' WHERE id = p_game_id;

  WITH credited AS (
    UPDATE public.profiles p
    SET points_basketball = COALESCE(p.points_basketball, 0) + gl.total_game_points,
        total_points      = p.total_points + gl.total_game_points
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
  SELECT gl.user_id, 'gameday_top_10'
  FROM public.game_leaderboard gl
  WHERE gl.game_id = p_game_id AND gl.rank <= 10
  ON CONFLICT (user_id, badge_key) DO NOTHING;

  INSERT INTO public.user_badges (user_id, badge_key)
  SELECT gl.user_id, 'gameday_winner'
  FROM public.game_leaderboard gl
  WHERE gl.game_id = p_game_id AND gl.rank = 1
  ON CONFLICT (user_id, badge_key) DO NOTHING;

  INSERT INTO public.user_badges (user_id, badge_key)
  SELECT lp.user_id, 'iron_man'
  FROM public.live_window_predictions lp
  WHERE lp.game_id = p_game_id
  GROUP BY lp.user_id
  HAVING COUNT(*) = (SELECT COUNT(*) FROM public.live_windows WHERE game_id = p_game_id AND status <> 'void')
     AND (SELECT COUNT(*) FROM public.live_windows WHERE game_id = p_game_id AND status <> 'void') > 0
  ON CONFLICT (user_id, badge_key) DO NOTHING;
END;
$$;

-- Live "stretch" game: one window per TV-timeout-to-TV-timeout stretch.
CREATE TABLE IF NOT EXISTS public.live_windows (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id           UUID NOT NULL REFERENCES public.live_games(id) ON DELETE CASCADE,
  window_number     INTEGER NOT NULL,
  market            TEXT NOT NULL DEFAULT 'stretch_winner',
  start_play_id     TEXT,
  end_play_id       TEXT,
  window_opened_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_locked_at  TIMESTAMPTZ NOT NULL,
  status            VARCHAR NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'void')),
  period            INTEGER,
  game_clock        TEXT,
  start_home_score  INTEGER NOT NULL DEFAULT 0,
  start_away_score  INTEGER NOT NULL DEFAULT 0,
  end_home_score    INTEGER,
  end_away_score    INTEGER,
  pts_home          INTEGER NOT NULL DEFAULT 50,
  pts_away          INTEGER NOT NULL DEFAULT 50,
  pts_tie           INTEGER NOT NULL DEFAULT 120,
  actual_outcome    VARCHAR,
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, window_number)
);

CREATE TABLE IF NOT EXISTS public.live_window_predictions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id          UUID NOT NULL REFERENCES public.live_games(id) ON DELETE CASCADE,
  window_number    INTEGER NOT NULL,
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prediction       VARCHAR NOT NULL CHECK (prediction IN ('home', 'away', 'tie')),
  points_possible  INTEGER NOT NULL,
  actual_outcome   VARCHAR,
  correct          BOOLEAN,
  multiplier       NUMERIC(4,2),
  points_earned    INTEGER,
  status           VARCHAR NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'void')),
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, window_number, user_id)
);

ALTER TABLE public.live_windows ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.live_window_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY live_windows_read_all ON public.live_windows FOR SELECT USING (true);

-- Same rule as drive_predictions: your own picks while a game is live, everyone's once it is calculated.
CREATE POLICY live_window_pred_select_own_or_calculated ON public.live_window_predictions FOR SELECT
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.live_games g WHERE g.id = live_window_predictions.game_id AND g.status = 'calculated'));

CREATE OR REPLACE FUNCTION public.open_live_window(
  p_game_id UUID, p_window_number INTEGER, p_start_play_id TEXT, p_period INTEGER, p_clock TEXT,
  p_home_score INTEGER, p_away_score INTEGER, p_lock_seconds INTEGER DEFAULT 150
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_id UUID;
BEGIN
  INSERT INTO public.live_windows (
    game_id, window_number, start_play_id, period, game_clock,
    start_home_score, start_away_score, window_locked_at
  ) VALUES (
    p_game_id, p_window_number, p_start_play_id, p_period, p_clock,
    p_home_score, p_away_score, NOW() + (GREATEST(1, p_lock_seconds) || ' seconds')::INTERVAL
  )
  ON CONFLICT (game_id, window_number) DO NOTHING
  RETURNING id INTO new_id;

  IF new_id IS NULL THEN
    SELECT id INTO new_id FROM public.live_windows WHERE game_id = p_game_id AND window_number = p_window_number;
  END IF;
  RETURN new_id;
END;
$$;

-- Locks a window early (the stretch's first play after the timeout has appeared).
CREATE OR REPLACE FUNCTION public.lock_live_window(p_game_id UUID, p_window_number INTEGER) RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.live_windows
  SET window_locked_at = LEAST(window_locked_at, NOW())
  WHERE game_id = p_game_id AND window_number = p_window_number AND status = 'open'
$$;

CREATE OR REPLACE FUNCTION public.submit_live_window_prediction(
  p_game_id UUID, p_window_number INTEGER, p_prediction VARCHAR
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_win RECORD;
  v_pts INTEGER;
  v_pick_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to make picks.'; END IF;

  SELECT * INTO v_win FROM public.live_windows
  WHERE game_id = p_game_id AND window_number = p_window_number
    AND status = 'open' AND window_locked_at > NOW();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prediction window is closed.';
  END IF;

  v_pts := CASE p_prediction
    WHEN 'home' THEN v_win.pts_home
    WHEN 'away' THEN v_win.pts_away
    WHEN 'tie'  THEN v_win.pts_tie
    ELSE NULL END;
  IF v_pts IS NULL THEN RAISE EXCEPTION 'Invalid pick: %', p_prediction; END IF;

  INSERT INTO public.live_window_predictions (game_id, window_number, user_id, prediction, points_possible)
  VALUES (p_game_id, p_window_number, auth.uid(), p_prediction, v_pts)
  ON CONFLICT (game_id, window_number, user_id) DO UPDATE SET
    prediction = EXCLUDED.prediction, points_possible = EXCLUDED.points_possible, submitted_at = NOW();

  SELECT COUNT(*) INTO v_pick_count FROM public.live_window_predictions WHERE user_id = auth.uid();
  IF v_pick_count = 50 THEN
    INSERT INTO public.user_badges (user_id, badge_key) VALUES (auth.uid(), 'drive_by_drive')
    ON CONFLICT (user_id, badge_key) DO NOTHING;
  END IF;
END;
$$;

-- Settles a stretch from the scores at its two ends. Mirrors settle_drive_outcome:
-- streak multiplier, per-game leaderboard, hot-streak badges.
CREATE OR REPLACE FUNCTION public.settle_live_window(
  p_game_id UUID, p_window_number INTEGER, p_end_home_score INTEGER, p_end_away_score INTEGER, p_end_play_id TEXT DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_win RECORD;
  v_pred RECORD;
  v_outcome VARCHAR;
  v_pts_win INTEGER;
  v_new_streak INTEGER;
  v_mult NUMERIC(4,2);
  v_pts_earned INTEGER;
  v_processed INTEGER := 0;
  v_is_correct BOOLEAN;
BEGIN
  SELECT * INTO v_win FROM public.live_windows
  WHERE game_id = p_game_id AND window_number = p_window_number AND status = 'open'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No open window % for game %.', p_window_number, p_game_id;
  END IF;

  v_outcome := CASE
    WHEN (p_end_home_score - v_win.start_home_score) > (p_end_away_score - v_win.start_away_score) THEN 'home'
    WHEN (p_end_home_score - v_win.start_home_score) < (p_end_away_score - v_win.start_away_score) THEN 'away'
    ELSE 'tie' END;

  UPDATE public.live_windows
  SET status = 'resolved', actual_outcome = v_outcome, resolved_at = NOW(),
      end_home_score = p_end_home_score, end_away_score = p_end_away_score, end_play_id = p_end_play_id,
      window_locked_at = LEAST(window_locked_at, NOW())
  WHERE id = v_win.id;

  v_pts_win := CASE v_outcome WHEN 'home' THEN v_win.pts_home WHEN 'away' THEN v_win.pts_away ELSE v_win.pts_tie END;

  FOR v_pred IN
    SELECT lp.id, lp.user_id, lp.prediction, p.current_streak_count
    FROM public.live_window_predictions lp
    JOIN public.profiles p ON p.id = lp.user_id
    WHERE lp.game_id = p_game_id AND lp.window_number = p_window_number AND lp.status = 'open'
  LOOP
    v_is_correct := (v_pred.prediction = v_outcome);

    IF v_is_correct THEN
      v_new_streak := v_pred.current_streak_count + 1;
      v_mult := CASE v_new_streak WHEN 1 THEN 1.00 WHEN 2 THEN 1.25 WHEN 3 THEN 1.50 WHEN 4 THEN 2.00 WHEN 5 THEN 3.00 ELSE 4.00 END;
      v_pts_earned := FLOOR(v_pts_win::NUMERIC * v_mult)::INTEGER;
    ELSE
      v_new_streak := 0; v_mult := 1.00; v_pts_earned := 0;
    END IF;

    UPDATE public.live_window_predictions SET
      actual_outcome = v_outcome, correct = v_is_correct, multiplier = v_mult,
      points_earned = v_pts_earned, status = 'resolved'
    WHERE id = v_pred.id;

    UPDATE public.profiles SET current_streak_count = v_new_streak, hot_streak_active = (v_new_streak >= 3)
    WHERE id = v_pred.user_id;

    IF v_new_streak = 3 THEN
      INSERT INTO public.user_badges (user_id, badge_key) VALUES (v_pred.user_id, 'hot_streak_3') ON CONFLICT (user_id, badge_key) DO NOTHING;
    ELSIF v_new_streak = 4 THEN
      INSERT INTO public.user_badges (user_id, badge_key) VALUES (v_pred.user_id, 'hot_streak_4') ON CONFLICT (user_id, badge_key) DO NOTHING;
    ELSIF v_new_streak = 5 THEN
      INSERT INTO public.user_badges (user_id, badge_key) VALUES (v_pred.user_id, 'hot_streak_5') ON CONFLICT (user_id, badge_key) DO NOTHING;
    ELSIF v_new_streak >= 6 THEN
      INSERT INTO public.user_badges (user_id, badge_key) VALUES (v_pred.user_id, 'hot_streak_6_plus') ON CONFLICT (user_id, badge_key) DO NOTHING;
    END IF;

    INSERT INTO public.game_leaderboard
      (game_id, user_id, username, total_drive_points, total_game_points, drive_correct, drive_total)
    SELECT p_game_id, v_pred.user_id, p.username, v_pts_earned,
           v_pts_earned + COALESCE(gl.pregame_points, 0),
           CASE WHEN v_is_correct THEN 1 ELSE 0 END, 1
    FROM public.profiles p
    LEFT JOIN public.game_leaderboard gl ON gl.game_id = p_game_id AND gl.user_id = v_pred.user_id
    WHERE p.id = v_pred.user_id
    ON CONFLICT (game_id, user_id) DO UPDATE SET
      total_drive_points = game_leaderboard.total_drive_points + v_pts_earned,
      total_game_points  = game_leaderboard.pregame_points + game_leaderboard.total_drive_points + v_pts_earned,
      drive_correct      = game_leaderboard.drive_correct + (CASE WHEN v_is_correct THEN 1 ELSE 0 END),
      drive_total        = game_leaderboard.drive_total + 1,
      updated_at         = NOW();

    v_processed := v_processed + 1;
  END LOOP;

  -- Anyone on this game's leaderboard who skipped the window loses their streak.
  UPDATE public.profiles p
  SET current_streak_count = 0, hot_streak_active = FALSE
  WHERE p.id IN (
    SELECT gl.user_id FROM public.game_leaderboard gl WHERE gl.game_id = p_game_id
    EXCEPT
    SELECT lp.user_id FROM public.live_window_predictions lp
    WHERE lp.game_id = p_game_id AND lp.window_number = p_window_number
  );

  UPDATE public.game_leaderboard gl
  SET rank = sub.r
  FROM (
    SELECT id, RANK() OVER (
      PARTITION BY game_id
      ORDER BY total_game_points DESC, home_yards_diff ASC NULLS LAST, away_yards_diff ASC NULLS LAST
    ) AS r
    FROM public.game_leaderboard WHERE game_id = p_game_id
  ) sub
  WHERE gl.id = sub.id;

  RETURN v_processed;
END;
$$;

-- Cancels a window that can't be scored fairly (game suspended etc.): no points, no streak change.
CREATE OR REPLACE FUNCTION public.void_live_window(p_game_id UUID, p_window_number INTEGER) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.live_windows SET status = 'void', resolved_at = NOW()
  WHERE game_id = p_game_id AND window_number = p_window_number AND status = 'open';
  UPDATE public.live_window_predictions SET status = 'void'
  WHERE game_id = p_game_id AND window_number = p_window_number AND status = 'open';
END;
$$;

-- finalize_game now dispatches by sport; the football body below is unchanged.
CREATE OR REPLACE FUNCTION public.finalize_game(p_game_id UUID) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (SELECT sport FROM public.live_games WHERE id = p_game_id) = 'basketball' THEN
    PERFORM public.finalize_game_bb(p_game_id);
    RETURN;
  END IF;

  PERFORM public.calculate_pregame_points(p_game_id);

  UPDATE public.live_games SET status = 'calculated' WHERE id = p_game_id;

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

  INSERT INTO public.user_badges (user_id, badge_key)
  SELECT dp.user_id, 'iron_man'
  FROM public.drive_predictions dp
  WHERE dp.game_id = p_game_id
  GROUP BY dp.user_id
  HAVING COUNT(*) = (SELECT COUNT(*) FROM public.drive_windows WHERE game_id = p_game_id)
     AND (SELECT COUNT(*) FROM public.drive_windows WHERE game_id = p_game_id) > 0
  ON CONFLICT (user_id, badge_key) DO NOTHING;
END;
$$;

-- The pick-submitting functions are for signed-in users; everything that opens,
-- settles or finalizes is for the server (service role) only.
REVOKE ALL ON FUNCTION public.submit_pregame_prediction_bb(UUID, VARCHAR, INTEGER, INTEGER, TEXT, TEXT, JSONB) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.submit_pregame_prediction_bb(UUID, VARCHAR, INTEGER, INTEGER, TEXT, TEXT, JSONB) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.submit_live_window_prediction(UUID, INTEGER, VARCHAR) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.submit_live_window_prediction(UUID, INTEGER, VARCHAR) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.calculate_pregame_points_bb(UUID) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.finalize_game_bb(UUID) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.open_live_window(UUID, INTEGER, TEXT, INTEGER, TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.lock_live_window(UUID, INTEGER) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.settle_live_window(UUID, INTEGER, INTEGER, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.void_live_window(UUID, INTEGER) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.calculate_pregame_points_bb(UUID), public.finalize_game_bb(UUID), public.open_live_window(UUID, INTEGER, TEXT, INTEGER, TEXT, INTEGER, INTEGER, INTEGER), public.lock_live_window(UUID, INTEGER), public.settle_live_window(UUID, INTEGER, INTEGER, INTEGER, TEXT), public.void_live_window(UUID, INTEGER) TO service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_windows;
