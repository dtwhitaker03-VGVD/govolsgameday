-- Cloudflare Zone Analytics weekly report pipeline. Mirrors the existing
-- invoke_X() -> edge function pattern (see invoke_game_sync), except the
-- edge function itself needs a THIRD-PARTY secret (the Cloudflare API
-- token) rather than just the internal service-role key, and there's no
-- CLI access in this environment to set a Deno edge-function secret --
-- so the token stays in Vault (already stored there as
-- 'cloudflare_api_token') and this SECURITY DEFINER function is the only
-- way to read it back out, tightly scoped to service_role.

create or replace function public.get_cloudflare_api_token()
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'cloudflare_api_token' limit 1;
$$;

revoke all on function public.get_cloudflare_api_token() from public, anon, authenticated;
grant execute on function public.get_cloudflare_api_token() to service_role;

-- One row per weekly report. Raw-ish data (daily breakdown + top-N
-- breakdowns as jsonb) -- the analytics-agent subagent is what turns this
-- into an actual written report, same division of labor as
-- trivia_questions/daily_polls -> trivia-poll-qa and live_games/etc ->
-- marketing-agent.
create table public.cloudflare_analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  total_requests bigint not null default 0,
  total_visits bigint not null default 0,
  total_page_views bigint not null default 0,
  cached_requests bigint not null default 0,
  total_bytes bigint not null default 0,
  threats bigint not null default 0,
  daily_breakdown jsonb not null default '[]'::jsonb,
  top_countries jsonb not null default '[]'::jsonb,
  status_breakdown jsonb not null default '[]'::jsonb,
  device_breakdown jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now(),
  unique (period_start, period_end)
);

alter table public.cloudflare_analytics_snapshots enable row level security;

create policy "cloudflare_analytics_snapshots_select_all"
  on public.cloudflare_analytics_snapshots for select
  using (true);

create or replace function public.invoke_cloudflare_analytics_report()
returns void
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'vgd_project_url';
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'vgd_service_role_key';
  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE WARNING 'invoke_cloudflare_analytics_report: vault secrets not yet configured';
    RETURN;
  END IF;
  PERFORM net.http_post(
    url     := v_url || '/functions/v1/cloudflare-analytics-report',
    body    := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_cloudflare_analytics_report failed: %', SQLERRM;
END;
$$;

-- Monday 5:10 AM UTC (~1:10 AM ET) -- well before the analytics-agent's
-- weekly Claude Code routine (Monday 10:00 AM ET) so a fresh snapshot is
-- always waiting for it. Covers the prior Mon-Sun week.
select cron.schedule(
  'cloudflare-analytics-report-weekly',
  '10 5 * * 1',
  'SELECT public.invoke_cloudflare_analytics_report()'
);
