-- Automated Facebook + Instagram posting: a queue of generated posts, settings
-- with a kill switch, and a public bucket for the rendered images (Meta fetches
-- the image from a public URL). Service-role only: no client policies except an
-- admin read, so nothing here is exposed to ordinary users.

CREATE TABLE IF NOT EXISTS public.social_settings (
  id             BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),   -- single row
  enabled        BOOLEAN NOT NULL DEFAULT FALSE,                -- master kill switch (planning + publishing)
  test_mode      BOOLEAN NOT NULL DEFAULT TRUE,                 -- TRUE: render and queue, never call Meta
  mode           TEXT    NOT NULL DEFAULT 'veto' CHECK (mode IN ('veto', 'auto')),
  veto_hours     INTEGER NOT NULL DEFAULT 2 CHECK (veto_hours >= 0),  -- 'veto': wait this long before posting
  post_facebook  BOOLEAN NOT NULL DEFAULT TRUE,
  post_instagram BOOLEAN NOT NULL DEFAULT TRUE,
  page_id        TEXT    NOT NULL DEFAULT '1250778491460245',
  ig_user_id     TEXT    NOT NULL DEFAULT '17841425392132922',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.social_settings (id) VALUES (TRUE) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.social_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          TEXT NOT NULL,                 -- countdown | final_recap | trivia_teaser | poll_teaser | news | leaderboard
  subject_key   TEXT NOT NULL UNIQUE,          -- idempotency: one post per subject, e.g. 'countdown:<game>:3d'
  game_id       UUID REFERENCES public.live_games(id) ON DELETE SET NULL,
  caption       TEXT NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}',   -- the real data the image and caption were built from
  image_path    TEXT,                          -- path inside the 'social' bucket
  image_url     TEXT,                          -- public URL Meta fetches
  status        TEXT NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled', 'posting', 'posted', 'failed', 'canceled', 'test_ok')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  attempts      INTEGER NOT NULL DEFAULT 0,
  fb_post_id    TEXT,
  ig_media_id   TEXT,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  posted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS social_posts_due_idx ON public.social_posts (status, scheduled_for);

ALTER TABLE public.social_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY social_settings_admin_read ON public.social_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin));
CREATE POLICY social_posts_admin_read ON public.social_posts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin));

INSERT INTO storage.buckets (id, name, public) VALUES ('social', 'social', TRUE) ON CONFLICT (id) DO NOTHING;
