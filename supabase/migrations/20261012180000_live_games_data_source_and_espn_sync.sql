-- Per-game choice of which feed drives the live scoreboard and drive predictor.
-- 'cfbd' (default) is the existing live-cfbd-sync poller; 'espn' hands the game
-- to live-espn-sync instead. Each poller skips games that belong to the other,
-- so flipping this column switches a game's feed on the next 15s tick. ESPN's
-- drive ids match CFBD's, so windows already opened by one source are
-- recognised by the other.
ALTER TABLE public.live_games
  ADD COLUMN IF NOT EXISTS data_source TEXT NOT NULL DEFAULT 'cfbd';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'live_games_data_source_check'
  ) THEN
    ALTER TABLE public.live_games
      ADD CONSTRAINT live_games_data_source_check CHECK (data_source IN ('cfbd', 'espn'));
  END IF;
END $$;

-- Same shape as invoke_live_cfbd_sync: read the project URL and service-role
-- key from Vault and POST to the edge function.
CREATE OR REPLACE FUNCTION public.invoke_live_espn_sync()
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
    RAISE WARNING 'invoke_live_espn_sync: vault secrets not yet configured';
    RETURN;
  END IF;
  PERFORM net.http_post(
    url     := v_url || '/functions/v1/live-espn-sync',
    body    := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_live_espn_sync failed: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_live_espn_sync() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'live-espn-sync-15s';
  PERFORM cron.schedule('live-espn-sync-15s', '15 seconds', 'SELECT public.invoke_live_espn_sync()');
END $$;
