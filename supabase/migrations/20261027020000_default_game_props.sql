-- Default weekly prop bets for football: every new football game in live_games
-- gets a copy of these rows automatically. Edit a game's props in the admin
-- Weekly Prop Bets panel and use "Save as defaults" to change what future
-- games start with; "Apply defaults" fills a game that was created earlier.
-- team_side is relative to Tennessee ('tennessee' / 'opponent') since the
-- home/away side differs per game.
CREATE TABLE IF NOT EXISTS public.default_game_props (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description   TEXT NOT NULL,
  line          NUMERIC NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  stat_scope    TEXT CHECK (stat_scope IN ('player', 'team')),
  stat_category TEXT,
  stat_type     TEXT,
  player_name   TEXT,
  team_side     TEXT CHECK (team_side IN ('tennessee', 'opponent'))
);

ALTER TABLE public.default_game_props ENABLE ROW LEVEL SECURITY;
CREATE POLICY default_game_props_select_public ON public.default_game_props FOR SELECT USING (true);

INSERT INTO public.default_game_props (description, line, sort_order, stat_scope, stat_category, stat_type, player_name, team_side) VALUES
  ('DeSean Bishop TDs', 1.5, 0, 'player', 'rushing,receiving', 'TD', 'DeSean Bishop', NULL),
  ('Mike Matthews Receptions', 5.5, 1, 'player', 'receiving', 'REC', 'Mike Matthews', NULL),
  ('George MacIntyre''s Completed Passes', 17.5, 2, 'player', 'passing', 'C/ATT', 'George MacIntyre', NULL),
  ('Arion Carter Tackles', 6.5, 3, 'player', 'defensive', 'TOT', 'Arion Carter', NULL),
  ('TN Defensive Sacks', 4.5, 4, 'team', 'sacks', NULL, NULL, 'tennessee');

-- Copies the defaults onto a game, skipping any description it already has.
CREATE OR REPLACE FUNCTION public.apply_default_props(p_game_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_home TEXT;
  v_count INTEGER;
BEGIN
  SELECT home_team INTO v_home FROM public.live_games WHERE id = p_game_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Game not found.'; END IF;

  INSERT INTO public.game_props (game_id, description, line, sort_order, stat_scope, stat_category, stat_type, player_name, team_side)
  SELECT p_game_id, d.description, d.line, d.sort_order, d.stat_scope, d.stat_category, d.stat_type, d.player_name,
         CASE
           WHEN d.team_side IS NULL THEN NULL
           WHEN (d.team_side = 'tennessee') = (v_home = 'Tennessee') THEN 'home'
           ELSE 'away'
         END
  FROM public.default_game_props d
  WHERE NOT EXISTS (
    SELECT 1 FROM public.game_props gp WHERE gp.game_id = p_game_id AND gp.description = d.description
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_default_props(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_apply_default_props() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.apply_default_props(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER live_games_default_props
  AFTER INSERT ON public.live_games
  FOR EACH ROW WHEN (NEW.sport = 'football')
  EXECUTE FUNCTION public.trg_apply_default_props();

-- Admin: fill an existing game with the defaults.
CREATE OR REPLACE FUNCTION public.admin_apply_default_props(p_game_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT (SELECT COALESCE(is_admin, FALSE) FROM public.profiles WHERE id = auth.uid()) THEN
      RAISE EXCEPTION 'Unauthorized: admin access required.';
    END IF;
  END IF;
  RETURN public.apply_default_props(p_game_id);
END;
$$;

-- Admin: replace the defaults with a game's current props.
CREATE OR REPLACE FUNCTION public.admin_save_default_props(p_game_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_home TEXT;
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT (SELECT COALESCE(is_admin, FALSE) FROM public.profiles WHERE id = auth.uid()) THEN
      RAISE EXCEPTION 'Unauthorized: admin access required.';
    END IF;
  END IF;
  SELECT home_team INTO v_home FROM public.live_games WHERE id = p_game_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Game not found.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.game_props WHERE game_id = p_game_id) THEN
    RAISE EXCEPTION 'That game has no props to save as defaults.';
  END IF;

  DELETE FROM public.default_game_props;
  INSERT INTO public.default_game_props (description, line, sort_order, stat_scope, stat_category, stat_type, player_name, team_side)
  SELECT description, line, sort_order, stat_scope, stat_category, stat_type, player_name,
         CASE
           WHEN team_side IS NULL THEN NULL
           WHEN (team_side = 'home') = (v_home = 'Tennessee') THEN 'tennessee'
           ELSE 'opponent'
         END
  FROM public.game_props WHERE game_id = p_game_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_apply_default_props(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_default_props(UUID) TO authenticated;
