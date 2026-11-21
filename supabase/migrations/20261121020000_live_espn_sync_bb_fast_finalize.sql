-- Faster basketball finalize: live-espn-sync-bb now re-polls crunch-time games every
-- 5s inside one 15s cron run (~11s), longer than pg_net's default 5s timeout. Give the
-- call 20s so pg_net doesn't abandon the request while the function is still working.
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
    ),
    timeout_milliseconds := 20000
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_live_espn_sync_bb failed: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_live_espn_sync_bb() FROM PUBLIC, anon, authenticated;
