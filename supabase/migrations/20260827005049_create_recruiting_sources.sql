create table public.recruiting_sources (
  sport_category text primary key,
  scouting_year integer not null,
  target_url text not null,
  on3_url text not null,
  targets_url text,
  transfers_url text,
  transfers_scouting_year integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recruiting_sources enable row level security;

-- Internal scrape config only, read/written by the recruiting-sync edge
-- function via the service-role key (which bypasses RLS) — no client-facing
-- policy needed since the frontend never queries this table.

insert into public.recruiting_sources
  (sport_category, scouting_year, target_url, on3_url, targets_url, transfers_url, transfers_scouting_year)
values
  (
    'football',
    2027,
    'https://247sports.com/college/tennessee/season/2027-football/commits/',
    'https://www.on3.com/college/tennessee-volunteers-24635/football/2027/commits/',
    'https://247sports.com/college/tennessee/season/2027-football/targets/',
    'https://www.on3.com/college/tennessee-volunteers-24635/football/2026/transfers/',
    2026
  ),
  (
    'basketball',
    2026,
    'https://247sports.com/college/tennessee/season/2026-basketball/commits/',
    'https://www.on3.com/college/tennessee-volunteers/basketball/2026/industry-comparison-commits/',
    null,
    null,
    null
  );
