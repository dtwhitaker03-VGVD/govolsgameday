-- One-off live test harness (2026-08-29): tracks CFBD API call volume
-- from live-cfbd-sync so usage against the Patreon tier's call limit is
-- visible during today's TCU vs North Carolina dry run.
create table if not exists cfbd_request_log (
  id bigint generated always as identity primary key,
  called_at timestamptz not null default now(),
  endpoint text not null,
  status_code int,
  source text
);
create index if not exists cfbd_request_log_called_at_idx on cfbd_request_log (called_at);
