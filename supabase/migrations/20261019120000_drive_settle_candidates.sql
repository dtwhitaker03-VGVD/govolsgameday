-- Holds an unconfirmed drive result between live-espn-sync ticks. A scoring
-- play or turnover can be reversed on review (2026-10-17 Alabama game: ESPN
-- first reported a fumble-return touchdown, then corrected it to a plain
-- fumble minutes later), and settling credits points and streaks for good, so
-- the sync only settles such a drive once it has seen the same result on two
-- polls at least 30s apart. Service-role only: RLS on, no policies, so nothing
-- is exposed to clients (the result would otherwise leak before settling).
CREATE TABLE IF NOT EXISTS public.drive_settle_candidates (
  game_id       UUID        NOT NULL REFERENCES public.live_games(id) ON DELETE CASCADE,
  drive_number  INTEGER     NOT NULL,
  outcome       TEXT        NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, drive_number)
);

ALTER TABLE public.drive_settle_candidates ENABLE ROW LEVEL SECURITY;
