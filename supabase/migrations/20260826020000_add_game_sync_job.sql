-- ── 1. Seed system_health row for the new sync job ─────────────────────────
INSERT INTO public.system_health (source_name, status)
VALUES ('game_sync', 'unknown')
ON CONFLICT (source_name) DO NOTHING;

-- ── 2. Invoker function (reads vault secrets at runtime, same pattern as
--       invoke_recruiting_sync / invoke_youtube_ingest) ────────────────────
CREATE OR REPLACE FUNCTION public.invoke_game_sync()
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
    RAISE WARNING 'invoke_game_sync: vault secrets not yet configured';
    RETURN;
  END IF;
  PERFORM extensions.http_post(
    url     := v_url || '/functions/v1/game-sync',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := '{}'::jsonb
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_game_sync failed: %', SQLERRM;
END;
$$;

-- ── 3. Register pg_cron schedule ────────────────────────────────────────────
-- Hourly, on the hour (UTC). One lightweight CFBD schedule call per run —
-- keeps well within the free-tier budget noted in cfbd-proxy while still
-- catching a pregame->live->final transition within about an hour.
SELECT cron.schedule('game-sync-hourly', '0 * * * *', 'SELECT public.invoke_game_sync()');
