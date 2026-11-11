-- The CFBD subscription is cancelled: stop the 15-second CFBD live poller. Live football is
-- driven by live-espn-sync (data_source 'espn', the column default). cron.unschedule is a no-op
-- when the job isn't there.
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'live-cfbd-sync-15s';
END $$;
