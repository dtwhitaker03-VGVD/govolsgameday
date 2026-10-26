-- Basketball live poller (live-espn-sync-bb), every 15 seconds.
CREATE OR REPLACE FUNCTION public.invoke_live_espn_sync_bb()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'vgd_project_url';
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'vgd_service_role_key';
  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'invoke_live_espn_sync_bb: vault secrets not yet configured';
    RETURN;
  END IF;
  PERFORM net.http_post(
    url     := v_url || '/functions/v1/live-espn-sync-bb',
    body    := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_live_espn_sync_bb failed: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_live_espn_sync_bb() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'live-espn-sync-bb-15s';
  PERFORM cron.schedule('live-espn-sync-bb-15s', '15 seconds', 'SELECT public.invoke_live_espn_sync_bb()');
END $$;
