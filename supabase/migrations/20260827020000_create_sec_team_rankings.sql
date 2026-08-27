-- Backs the "Team Rankings — TN vs SEC" comparison, which previously only
-- rendered Tennessee's own row plus a hardcoded list of rival names with
-- "Awaiting data" placeholders (no source ever populated the rest). This
-- stores every SEC team's row from On3's conference-filtered industry-
-- composite rankings page, scraped alongside recruiting_class_rankings.sec_rank.
CREATE TABLE IF NOT EXISTS public.sec_team_rankings (
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
    WHERE conname = 'sec_team_rankings_sport_year_team_key'
  ) THEN
    ALTER TABLE public.sec_team_rankings
      ADD CONSTRAINT sec_team_rankings_sport_year_team_key UNIQUE (sport_category, scouting_year, team);
  END IF;
END $$;

-- public read; writes via server only (matches recruiting_class_rankings)
ALTER TABLE public.sec_team_rankings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sec_team_rankings_select_public" ON public.sec_team_rankings;

CREATE POLICY "sec_team_rankings_select_public" ON public.sec_team_rankings FOR SELECT
  TO anon, authenticated USING (true);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sec_team_rankings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sec_team_rankings;
  END IF;
END $$;
