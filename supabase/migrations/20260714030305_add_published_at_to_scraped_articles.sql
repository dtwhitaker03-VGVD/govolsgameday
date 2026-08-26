-- Add published_at column to scraped_articles (§40 schema requirement)
-- Stores the article's REAL publish date from its source page, not the scrape timestamp.
ALTER TABLE public.scraped_articles
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

-- Backfill existing rows: use ingested_at as a reasonable fallback for articles
-- scraped before this column existed (better than NULL for sorting purposes).
UPDATE public.scraped_articles
  SET published_at = ingested_at
  WHERE published_at IS NULL;

-- Add index for the new sort pattern (published_at DESC per sport_category)
-- The existing idx_articles_sport_date indexes (sport_category, ingested_at DESC)
-- which is no longer the primary sort. Add a published_at-based index.
CREATE INDEX IF NOT EXISTS idx_articles_sport_published
  ON public.scraped_articles(sport_category, published_at DESC);

-- Also add an index for cross-sport aggregate queries on the Main page
-- (§18: 15 most recent articles across ALL sport categories, sorted by published_at DESC)
CREATE INDEX IF NOT EXISTS idx_articles_published_global
  ON public.scraped_articles(published_at DESC)
  WHERE is_hidden = false;
