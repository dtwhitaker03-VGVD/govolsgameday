-- Weekly social posting schedule (editable) and the admin-picked Player of the
-- Game. dow is the weekday in Eastern time (0 = Sunday); NULL means the post is
-- triggered by an event (final_stats: when a game is finalized) rather than a day.

CREATE TABLE IF NOT EXISTS public.social_schedule (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label   TEXT NOT NULL,
  kind    TEXT NOT NULL CHECK (kind IN ('promo_pregame', 'player_of_game', 'next_game_preview', 'trivia_teaser', 'poll_teaser', 'countdown', 'promo_general', 'final_stats')),
  dow     SMALLINT CHECK (dow BETWEEN 0 AND 6),
  hour    SMALLINT NOT NULL DEFAULT 12 CHECK (hour BETWEEN 0 AND 23),
  minute  SMALLINT NOT NULL DEFAULT 0 CHECK (minute BETWEEN 0 AND 59),
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS social_schedule_kind_dow_idx ON public.social_schedule (kind, COALESCE(dow, -1));

INSERT INTO public.social_schedule (label, kind, dow, hour, minute) VALUES
  ('Pregame: GoVolsGameDay.com promotion', 'promo_pregame', 6, 10, 0),
  ('Post-game: final game stats chart (when finalized)', 'final_stats', NULL, 0, 0),
  ('Player of the Game (picked by admin)', 'player_of_game', 0, 10, 0),
  ('Next game preview', 'next_game_preview', 1, 12, 0),
  ('Daily trivia', 'trivia_teaser', 2, 10, 0),
  ('Daily poll', 'poll_teaser', 2, 17, 0),
  ('Countdown', 'countdown', 3, 12, 0),
  ('Daily poll', 'poll_teaser', 3, 17, 0),
  ('GoVolsGameDay.com general promotion', 'promo_general', 4, 12, 0),
  ('Countdown', 'countdown', 5, 12, 0),
  ('Daily poll', 'poll_teaser', 5, 17, 0)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.social_player_of_game (
  game_id     UUID PRIMARY KEY REFERENCES public.live_games(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  position    TEXT,
  jersey      TEXT,
  stats       JSONB NOT NULL DEFAULT '[]',   -- [{label, value}], at most 4
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.social_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_player_of_game ENABLE ROW LEVEL SECURITY;

CREATE POLICY social_schedule_admin_read ON public.social_schedule FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin));
CREATE POLICY social_potg_admin_read ON public.social_player_of_game FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin));

CREATE OR REPLACE FUNCTION public.admin_social_update_schedule(p_id UUID, p_enabled BOOLEAN, p_hour INTEGER, p_minute INTEGER) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), FALSE) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required.';
  END IF;
  IF p_hour < 0 OR p_hour > 23 OR p_minute < 0 OR p_minute > 59 THEN RAISE EXCEPTION 'Invalid time.'; END IF;
  UPDATE public.social_schedule SET enabled = p_enabled, hour = p_hour, minute = p_minute WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Schedule row not found.'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_social_set_potg(p_game_id UUID, p_name TEXT, p_position TEXT, p_jersey TEXT, p_stats JSONB) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), FALSE) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required.';
  END IF;
  IF COALESCE(btrim(p_name), '') = '' THEN RAISE EXCEPTION 'Player name is required.'; END IF;
  IF jsonb_typeof(p_stats) <> 'array' OR jsonb_array_length(p_stats) > 4 THEN RAISE EXCEPTION 'Stats must be a list of at most 4.'; END IF;
  INSERT INTO public.social_player_of_game (game_id, player_name, position, jersey, stats, updated_at)
  VALUES (p_game_id, btrim(p_name), NULLIF(btrim(p_position), ''), NULLIF(btrim(p_jersey), ''), p_stats, now())
  ON CONFLICT (game_id) DO UPDATE SET player_name = EXCLUDED.player_name, position = EXCLUDED.position,
    jersey = EXCLUDED.jersey, stats = EXCLUDED.stats, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.admin_social_update_schedule(UUID, BOOLEAN, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_social_set_potg(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_social_update_schedule(UUID, BOOLEAN, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_social_set_potg(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
