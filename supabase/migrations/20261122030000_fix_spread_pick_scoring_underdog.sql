-- Spread O/U scoring was inverted whenever Tennessee was the underdog.
--
-- spread_line_tn is signed from TN's side (+4.5 = TN getting 4.5). The pick form
-- labels the row from the FAVORED team's side ("Spread (LSU wins by) 1.5"), so
-- OVER means the favorite covers. calculate_pregame_points[_bb] always scored OVER
-- as "TN covers" (v_tn_margin + line > 0), which matches the label only when TN is
-- favored. With TN as the underdog every spread pick was graded backwards.
--
-- Fix: measure the cover from the favored team's side, flipping the sign when TN
-- is the underdog. Both functions are patched in place so nothing else in them
-- changes.
DO $$
DECLARE
  v_fn  TEXT;
  v_def TEXT;
  v_old CONSTANT TEXT := '(v_tn_margin + game.spread_line_tn)';
  v_new CONSTANT TEXT := '((CASE WHEN game.spread_line_tn > 0 THEN -1 ELSE 1 END) * (v_tn_margin + game.spread_line_tn))';
BEGIN
  FOREACH v_fn IN ARRAY ARRAY['public.calculate_pregame_points(uuid)', 'public.calculate_pregame_points_bb(uuid)'] LOOP
    v_def := pg_get_functiondef(v_fn::regprocedure);
    IF position(v_old IN v_def) = 0 THEN
      RAISE NOTICE '% already patched or changed shape; skipping', v_fn;
      CONTINUE;
    END IF;
    EXECUTE replace(v_def, v_old, v_new);
  END LOOP;
END;
$$;
