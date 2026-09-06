-- Basketball recruiting had no targets_url or transfers_url configured at
-- all, so its Prospect Database's Targets and Transfer tabs were always
-- empty — not a bug in the sync, just missing source config. Confirmed live
-- that both real On3/247 pages exist and use the same markdown shape their
-- football counterparts already parse (On3's transfers page follows the
-- team's own on3_url slug convention — "tennessee-volunteers", no numeric
-- team id, unlike football's "tennessee-volunteers-24635"; 247's targets
-- page just swaps the season segment to "2026-basketball").
--
-- transfers_scouting_year matches scouting_year here (both 2026) since
-- basketball recruiting classes are already labeled by the current
-- calendar year (see Recruiting.tsx's own comment on this) — unlike
-- football, where the HS class (2027) and the current transfer season
-- (2026) are genuinely different vintages.
UPDATE public.recruiting_sources
SET
  targets_url = 'https://247sports.com/college/tennessee/season/2026-basketball/targets/',
  transfers_url = 'https://www.on3.com/college/tennessee-volunteers/basketball/2026/transfers/',
  transfers_scouting_year = 2026
WHERE sport_category = 'basketball';
