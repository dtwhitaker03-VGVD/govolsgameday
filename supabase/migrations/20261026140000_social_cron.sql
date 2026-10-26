-- Schedules for the social posting pipeline. social_settings.enabled /
-- test_mode decide what the functions actually do.

CREATE OR REPLACE FUNCTION public.invoke_social_fn(p_name TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'vgd_project_url';
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'vgd_service_role_key';
  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'invoke_social_fn: vault secrets not yet configured';
    RETURN;
  END IF;
  PERFORM net.http_post(
    url     := v_url || '/functions/v1/' || p_name,
    body    := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    timeout_milliseconds := 60000
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_social_fn % failed: %', p_name, SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_social_fn(TEXT) FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('social-plan-10m', 'social-publish-5m');
  PERFORM cron.schedule('social-plan-10m', '*/10 * * * *', $c$SELECT public.invoke_social_fn('social-plan')$c$);
  PERFORM cron.schedule('social-publish-5m', '*/5 * * * *', $c$SELECT public.invoke_social_fn('social-publish')$c$);
END $$;
