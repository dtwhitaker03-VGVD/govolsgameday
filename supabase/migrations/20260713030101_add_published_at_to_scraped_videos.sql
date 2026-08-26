-- Add YouTube's real publish date to scraped_videos.
-- ingested_at remains for internal bookkeeping only.

ALTER TABLE public.scraped_videos
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

DROP INDEX IF EXISTS idx_videos_sport_published;
DROP INDEX IF EXISTS idx_videos_main_priority;

CREATE INDEX idx_videos_sport_published
  ON public.scraped_videos(sport_category, published_at DESC NULLS LAST);

CREATE INDEX idx_videos_main_priority
  ON public.scraped_videos(channel_priority, published_at DESC NULLS LAST)
  WHERE sport_category = 'main';
