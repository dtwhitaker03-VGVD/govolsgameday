
-- ── Cache table for CFBD API responses ──────────────────────────────────────
-- Stores the full upcoming-game payload so we don't hit the CFBD API
-- (free tier: 1,000 calls/month) on every single page load.
-- The edge function fetches from CFBD at most once per CACHE_TTL_SECONDS,
-- and serves the cached version otherwise.

CREATE TABLE IF NOT EXISTS public.cfbd_cache (
  id           SERIAL PRIMARY KEY,
  cache_key    TEXT NOT NULL,
  payload      JSONB NOT NULL,
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cache_key)
);

ALTER TABLE public.cfbd_cache ENABLE ROW LEVEL SECURITY;

-- Service role (edge function) needs full access; anon/authenticated need read
CREATE POLICY "cfbd_cache_select_all" ON public.cfbd_cache
  FOR SELECT TO anon, authenticated USING (true);

-- Only service role writes (no policy needed for anon/authenticated insert/update)
