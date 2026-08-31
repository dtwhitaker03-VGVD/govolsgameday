-- Server-side pg_cron job that polls CFBD for live game data once, regardless
-- of how many browser tabs currently have the page open (replaces the old
-- client-side polling useEffect in Home.tsx, which scaled CFBD call volume
-- with concurrent viewers).

INSERT INTO public.system_health (source_name, status)
VALUES ('live_cfbd_sync', 'unknown')
ON CONFLICT (source_name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.invoke_live_cfbd_sync()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_url TEXT; v_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'vgd_project_url';
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'vgd_service_role_key';
  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'invoke_live_cfbd_sync: vault secrets not yet configured';
    RETURN;
  END IF;
  PERFORM net.http_post(
    url     := v_url || '/functions/v1/live-cfbd-sync',
    body    := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key)
  );
  UPDATE public.system_health SET last_successful_run = NOW(), status = 'healthy' WHERE source_name = 'live_cfbd_sync';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_live_cfbd_sync failed: %', SQLERRM;
  UPDATE public.system_health SET status = 'stalled' WHERE source_name = 'live_cfbd_sync';
END; $$;

SELECT cron.schedule('live-cfbd-sync-15s', '15 seconds', 'SELECT public.invoke_live_cfbd_sync()');
