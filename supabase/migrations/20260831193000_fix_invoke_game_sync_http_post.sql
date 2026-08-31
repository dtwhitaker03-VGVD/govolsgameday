-- invoke_game_sync() has been calling extensions.http_post(url, headers, body),
-- a function that doesn't exist in this project (the real one lives in schema
-- net, per the fix already applied to invoke_live_cfbd_sync). Its own
-- EXCEPTION handler swallowed the error every hourly tick since it stopped
-- working, so the game-sync edge function was never actually invoked during
-- any of the three weekly windows (Mon/Wed/Sat) -- most concretely, this
-- Monday's betting-line check never ran, leaving spread/O-U null for the
-- pregame predictor.

CREATE OR REPLACE FUNCTION public.invoke_game_sync()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'vgd_project_url';
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'vgd_service_role_key';
  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'invoke_game_sync: vault secrets not yet configured';
    RETURN;
  END IF;
  PERFORM net.http_post(
    url     := v_url || '/functions/v1/game-sync',
    body    := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_game_sync failed: %', SQLERRM;
END;
$$;
