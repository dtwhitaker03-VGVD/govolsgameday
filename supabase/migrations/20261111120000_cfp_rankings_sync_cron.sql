-- CFP committee rankings: checked on Tuesday evenings (released by 9 PM Central), refreshing
-- the site's "CFP Ranking" row and the generated previews when the poll changes
-- (cfp-rankings-sync; unchanged polls are a cheap no-op).
CREATE OR REPLACE FUNCTION public.invoke_cfp_rankings_sync()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'vgd_project_url';
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'vgd_service_role_key';
  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'invoke_cfp_rankings_sync: vault secrets not yet configured';
    RETURN;
  END IF;
  PERFORM net.http_post(
    url     := v_url || '/functions/v1/cfp-rankings-sync',
    body    := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    timeout_milliseconds := 60000
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_cfp_rankings_sync failed: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_cfp_rankings_sync() FROM PUBLIC, anon, authenticated;

-- Every 10 minutes from 9:00 PM to midnight Central on Tuesday (03:00-05:59 UTC Wednesday,
-- November is Central Standard Time), and once a day at 12:00 UTC as a catch-up for a late
-- or off-schedule release (e.g. the final Sunday rankings).
SELECT cron.schedule('cfp-rankings-sync-tuesday', '*/10 3-5 * * 3', 'SELECT public.invoke_cfp_rankings_sync()');
SELECT cron.schedule('cfp-rankings-sync-daily', '0 12 * * *', 'SELECT public.invoke_cfp_rankings_sync()');
