-- Football auto-finalize: live-espn-sync now finalizes a game on the poll that sees
-- ESPN call it final with every drive window settled. finalize_game credits points
-- each time it runs, so a poll claims the game first by stamping finalizing_at.
ALTER TABLE public.live_games ADD COLUMN IF NOT EXISTS finalizing_at TIMESTAMPTZ;

-- In the last minute of a game live-espn-sync re-polls every 5s inside one 15s cron
-- run, and a finalize call adds a few seconds on top, longer than pg_net's default
-- 5s timeout. Give the call 30s so pg_net doesn't abandon it mid-run.
CREATE OR REPLACE FUNCTION public.invoke_live_espn_sync()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
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
    ),
    timeout_milliseconds := 30000
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_live_espn_sync failed: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_live_espn_sync() FROM PUBLIC, anon, authenticated;
