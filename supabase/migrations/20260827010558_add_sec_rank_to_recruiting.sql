-- recruiting_class_rankings.sec_rank was previously faked on the frontend as
-- min(national_rank, 16) — this adds a real column populated by scraping
-- On3's conference-filtered industry-composite team rankings page.
ALTER TABLE public.recruiting_class_rankings
  ADD COLUMN IF NOT EXISTS sec_rank INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.recruiting_sources
  ADD COLUMN IF NOT EXISTS sec_rankings_url TEXT;

UPDATE public.recruiting_sources
SET sec_rankings_url = 'https://www.on3.com/rivals/rankings/industry-team/football/2027/?conference=sec'
WHERE sport_category = 'football';
