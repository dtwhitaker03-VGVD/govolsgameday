ALTER TABLE public.scraped_videos
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE public.scraped_articles
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE NOT NULL;

CREATE INDEX IF NOT EXISTS idx_videos_pinned ON public.scraped_videos(sport_category, is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_articles_pinned ON public.scraped_articles(sport_category, is_pinned) WHERE is_pinned = TRUE;
