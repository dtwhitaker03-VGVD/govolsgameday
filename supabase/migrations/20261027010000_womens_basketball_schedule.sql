-- Tennessee women's basketball schedule (display only; no prediction pipeline yet).
CREATE TABLE IF NOT EXISTS public.womens_basketball_games (
  espn_id      BIGINT PRIMARY KEY,
  kickoff_time TIMESTAMPTZ NOT NULL,
  time_valid   BOOLEAN NOT NULL DEFAULT TRUE,
  home_team    TEXT NOT NULL,
  away_team    TEXT NOT NULL,
  home_score   INTEGER,
  away_score   INTEGER,
  status       TEXT NOT NULL DEFAULT 'pregame' CHECK (status IN ('pregame', 'live', 'final', 'canceled')),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS womens_basketball_games_kickoff_idx ON public.womens_basketball_games (kickoff_time);

ALTER TABLE public.womens_basketball_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read the women's schedule"
  ON public.womens_basketball_games FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.invoke_wbb_schedule_sync()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'vgd_project_url';
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'vgd_service_role_key';
  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'invoke_wbb_schedule_sync: vault secrets not yet configured';
    RETURN;
  END IF;
  PERFORM net.http_post(
    url     := v_url || '/functions/v1/wbb-schedule-sync',
    body    := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_wbb_schedule_sync failed: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_wbb_schedule_sync() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('wbb-schedule-sync-daily', '15 9 * * *', 'SELECT public.invoke_wbb_schedule_sync()');
