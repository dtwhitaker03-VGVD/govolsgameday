-- Backs a second column on the "Team Rankings" panel: national (any
-- conference) alongside the existing SEC-only comparison. On3's own
-- industry-composite rankings page is the same page sec_team_rankings
-- already scrapes, just without the "?conference=sec" filter — confirmed
-- live that dropping the filter returns every conference's teams (Tennessee
-- at #19 nationally, matching recruiting_class_rankings.rank_on3) using the
-- identical markdown table structure, so this reuses the same extraction
-- logic in recruiting-sync against a second, unfiltered URL.
CREATE TABLE IF NOT EXISTS public.national_team_rankings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_category  VARCHAR(50) NOT NULL,
  scouting_year   INT NOT NULL,
  team            TEXT NOT NULL,
  rank            INTEGER NOT NULL,
  total_commits   INTEGER NOT NULL DEFAULT 0,
  avg_rating      NUMERIC NOT NULL DEFAULT 0,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'national_team_rankings_sport_year_team_key'
  ) THEN
    ALTER TABLE public.national_team_rankings
      ADD CONSTRAINT national_team_rankings_sport_year_team_key UNIQUE (sport_category, scouting_year, team);
  END IF;
END $$;

-- public read; writes via server only (matches sec_team_rankings)
ALTER TABLE public.national_team_rankings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "national_team_rankings_select_public" ON public.national_team_rankings;

CREATE POLICY "national_team_rankings_select_public" ON public.national_team_rankings FOR SELECT
  TO anon, authenticated USING (true);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'national_team_rankings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.national_team_rankings;
  END IF;
END $$;

ALTER TABLE public.recruiting_sources
  ADD COLUMN IF NOT EXISTS national_rankings_url TEXT;

UPDATE public.recruiting_sources
SET national_rankings_url = 'https://www.on3.com/rivals/rankings/industry-team/football/2027/'
WHERE sport_category = 'football';
