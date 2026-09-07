-- Backs a rework of the Football Recruiting page's "Team Rankings" panel:
-- instead of recruiting-class rankings, it now shows where Tennessee
-- actually ranks nationally in Scoring Offense and Scoring Defense, sourced
-- from NCAA.com's own team stat pages (stat category 27 = Scoring Offense,
-- 28 = Scoring Defense — https://www.ncaa.com/stats/football/fbs/current/team/27
-- and .../28). Those pages are plain server-rendered HTML tables (no JS
-- rendering needed, unlike the On3/247 recruiting sources), paginated
-- ~50 teams per page at /team/27/p2, /p3, etc.
CREATE TABLE IF NOT EXISTS public.ncaa_scoring_rankings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_type         VARCHAR(10) NOT NULL CHECK (stat_type IN ('offense', 'defense')),
  season            INT NOT NULL,
  team              TEXT NOT NULL,
  rank              INTEGER NOT NULL,
  games             INTEGER NOT NULL DEFAULT 0,
  points            NUMERIC NOT NULL DEFAULT 0,
  points_per_game   NUMERIC NOT NULL DEFAULT 0,
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ncaa_scoring_rankings_stat_season_team_key'
  ) THEN
    ALTER TABLE public.ncaa_scoring_rankings
      ADD CONSTRAINT ncaa_scoring_rankings_stat_season_team_key UNIQUE (stat_type, season, team);
  END IF;
END $$;

-- public read; writes via server only (matches sec_team_rankings / national_team_rankings)
ALTER TABLE public.ncaa_scoring_rankings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ncaa_scoring_rankings_select_public" ON public.ncaa_scoring_rankings;

CREATE POLICY "ncaa_scoring_rankings_select_public" ON public.ncaa_scoring_rankings FOR SELECT
  TO anon, authenticated USING (true);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ncaa_scoring_rankings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ncaa_scoring_rankings;
  END IF;
END $$;

INSERT INTO public.system_health (source_name, status)
VALUES ('scoring_rankings_sync', 'unknown')
ON CONFLICT (source_name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.invoke_scoring_rankings_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'vgd_project_url';
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'vgd_service_role_key';
  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'invoke_scoring_rankings_sync: vault secrets not yet configured';
    RETURN;
  END IF;
  PERFORM extensions.http_post(
    url     := v_url || '/functions/v1/scoring-rankings-sync',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := '{}'::jsonb
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_scoring_rankings_sync failed: %', SQLERRM;
END;
$$;

-- 8:00 UTC = 3am EST / 4am EDT — once daily is plenty since these stats only
-- move after game days, same cadence as recruiting-sync (7:00 UTC).
SELECT cron.schedule('scoring-rankings-sync-3am', '0 8 * * *', 'SELECT public.invoke_scoring_rankings_sync()');
