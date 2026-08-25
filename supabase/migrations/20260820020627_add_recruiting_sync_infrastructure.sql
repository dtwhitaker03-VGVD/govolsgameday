
-- ── 1. Unique constraints for upsert safety ───────────────────────────────
-- recruits: match on full_name + scouting_year (per §38 Job 3 spec)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'recruits_full_name_scouting_year_key'
  ) THEN
    ALTER TABLE public.recruits
      ADD CONSTRAINT recruits_full_name_scouting_year_key UNIQUE (full_name, scouting_year);
  END IF;
END $$;

-- recruiting_class_rankings: match on sport_category + scouting_year
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rcr_sport_year_key'
  ) THEN
    ALTER TABLE public.recruiting_class_rankings
      ADD CONSTRAINT rcr_sport_year_key UNIQUE (sport_category, scouting_year);
  END IF;
END $$;

-- ── 2. Seed system_health row for recruiting sync ──────────────────────────
INSERT INTO public.system_health (source_name, status)
VALUES ('recruiting_sync', 'unknown')
ON CONFLICT (source_name) DO NOTHING;

-- ── 3. Invoker function (reads vault secrets at runtime, same pattern as Jobs 1 & 2) ──
CREATE OR REPLACE FUNCTION public.invoke_recruiting_sync()
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
    RAISE WARNING 'invoke_recruiting_sync: vault secrets not yet configured';
    RETURN;
  END IF;
  PERFORM extensions.http_post(
    url     := v_url || '/functions/v1/recruiting-sync',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := '{}'::jsonb
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_recruiting_sync failed: %', SQLERRM;
END;
$$;

-- ── 4. Register pg_cron schedule ──────────────────────────────────────────
-- 2 AM EST = 7:00 UTC (EST = UTC-5; 2AM + 5 = 7:00 UTC)
-- Note: EDT (UTC-4) would be 6:00 UTC; using 7:00 UTC covers EST year-round.
-- pg_cron uses UTC, so we schedule for 07:00 UTC.
SELECT cron.schedule('recruiting-sync-2am', '0 7 * * *', 'SELECT public.invoke_recruiting_sync()');
