-- Firecrawl free-tier usage reduction: news-ingest was running twice daily
-- (6am/6pm Central), each run scraping every configured source's list pages
-- regardless of whether anything new had been published since the last run.
-- Combined with the per-source trim in this same change (dropping three
-- near-zero-yield sources), dropping to a single daily run cuts projected
-- monthly Firecrawl usage from well above the 1,000-credit/month free plan
-- down to comfortably under it. news-ingest-6am (11 UTC) stays as the one
-- daily run — a fresh morning digest before most site traffic.
--
-- Idempotent: safe to apply even though this was already run directly
-- against the live project, so the migration history stays consistent with
-- actual state without erroring on a second apply.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'news-ingest-6pm') THEN
    PERFORM cron.unschedule('news-ingest-6pm');
  END IF;
END $$;
