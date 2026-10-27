-- Basketball score guesses: 100 minus 5 per point missed (was 4), floor 0, +50 for an exact score.
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

    hs_pts   := GREATEST(0, 100 - (5 * ABS(pred.predicted_home_score - game.home_score)));
    hs_bonus := CASE WHEN pred.predicted_home_score = game.home_score THEN 50 ELSE 0 END;
    as_pts   := GREATEST(0, 100 - (5 * ABS(pred.predicted_away_score - game.away_score)));
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
