-- Backs a "Game Preview" button on the Live Game Stats panel: a modal
-- showing ESPN's pregame preview for the active game, reformatted into the
-- site's own styling rather than embedding ESPN's page directly.
--
-- espn_preview_url is per-game and has no automatic way to be derived (ESPN
-- game IDs don't map from CFBD's), so it's set here/via future migrations
-- rather than synced — same one-off admin-config pattern as game_props.
ALTER TABLE public.live_games
  ADD COLUMN IF NOT EXISTS espn_preview_url TEXT;

UPDATE public.live_games
SET espn_preview_url = 'https://www.espn.com/college-football/preview/_/gameId/401856681'
WHERE id = '644479ab-a279-4346-9f33-70edf79b1f61';

-- Caches the parsed preview (game-preview-sync fetches ESPN's page via
-- Firecrawl, which is needed to get past ESPN's bot-challenge WAF — a plain
-- fetch gets a 202 challenge response, no content) so repeat button clicks
-- don't re-scrape every time.
CREATE TABLE IF NOT EXISTS public.game_previews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID NOT NULL REFERENCES public.live_games(id) ON DELETE CASCADE,
  source_url  TEXT NOT NULL,
  content     JSONB NOT NULL,
  fetched_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_previews_game_id_key'
  ) THEN
    ALTER TABLE public.game_previews ADD CONSTRAINT game_previews_game_id_key UNIQUE (game_id);
  END IF;
END $$;

ALTER TABLE public.game_previews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_previews_select_public" ON public.game_previews;

CREATE POLICY "game_previews_select_public" ON public.game_previews FOR SELECT
  TO anon, authenticated USING (true);
