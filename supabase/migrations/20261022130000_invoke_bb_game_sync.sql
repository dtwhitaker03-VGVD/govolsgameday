-- Hourly basketball schedule/lines sync (bb-game-sync edge function).
CREATE OR REPLACE FUNCTION public.invoke_bb_game_sync()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'vgd_project_url';
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'vgd_service_role_key';
  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'invoke_bb_game_sync: vault secrets not yet configured';
    RETURN;
  END IF;
  PERFORM net.http_post(
    url     := v_url || '/functions/v1/bb-game-sync',
    body    := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_bb_game_sync failed: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_bb_game_sync() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('bb-game-sync-hourly', '30 * * * *', 'SELECT public.invoke_bb_game_sync()');
