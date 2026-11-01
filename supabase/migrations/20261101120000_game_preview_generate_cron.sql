-- Daily generation of our own football game previews (game-preview-generate).
-- It rewrites the preview for every upcoming football game in the next 10 days,
-- so the line, kickoff time, records and last-game numbers stay current through
-- the week. Hand-entered previews are never touched.
CREATE OR REPLACE FUNCTION public.invoke_game_preview_generate()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'vgd_project_url';
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'vgd_service_role_key';
  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'invoke_game_preview_generate: vault secrets not yet configured';
    RETURN;
  END IF;
  PERFORM net.http_post(
    url     := v_url || '/functions/v1/game-preview-generate',
    body    := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    timeout_milliseconds := 60000
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_game_preview_generate failed: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_game_preview_generate() FROM PUBLIC, anon, authenticated;

-- 11:00 UTC daily (6-7 AM Eastern).
SELECT cron.schedule('game-preview-generate-daily', '0 11 * * *', 'SELECT public.invoke_game_preview_generate()');
