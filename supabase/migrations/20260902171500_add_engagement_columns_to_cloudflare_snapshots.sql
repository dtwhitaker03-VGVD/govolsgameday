-- Extend cloudflare_analytics_snapshots with site-engagement counts so
-- weekly growth data is durably stored by the cron-driven edge function
-- itself, not just computed ad hoc by the analytics-agent subagent.
alter table public.cloudflare_analytics_snapshots
  add column new_signups bigint not null default 0,
  add column trivia_responses bigint not null default 0,
  add column poll_responses bigint not null default 0,
  add column pregame_predictions bigint not null default 0,
  add column live_predictor_participants bigint not null default 0;
