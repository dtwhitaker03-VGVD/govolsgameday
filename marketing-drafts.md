# Marketing Drafts

Draft log for GoVolsGameDay's Facebook page content. Every entry here is a
**draft only** — nothing is posted automatically. David reviews each one and
either posts it himself or asks for changes first.

## 2026-09-07 — Intro/explainer ("Welcome to the page")

- Trigger: on-demand — David reviewed the Game Week countdown draft below
  and asked for a different piece as the actual first post on the
  brand-new GoVolsGameDay Facebook page: an intro/explainer about the
  platform itself rather than a specific game.
- Subject: not tied to a game or date. Explains what GoVolsGameDay is (the
  hub for Vols fans who want more than just the score) and how it works,
  scannable in short punchy labels rather than paragraphs: Live Drive
  Picks (predict every drive in real time), Daily Trivia, Fan Polls, and
  a Leaderboard to compete against other fans — plus three pull-quote
  pills (Free / Interactive / 100% Tennessee). These are real, shipped
  site features (drive predictions during live games, `trivia_questions`,
  `daily_polls`, `game_leaderboard`) — this graphic describes product
  functionality rather than citing a specific stat, so no per-run
  Supabase row is quoted here the way a game/trivia/news graphic would.
  No team logos/crests or photos used — pure typography, color, and the
  diagonal-stripe/glow motif, matching the site's brand system pushed
  bolder for social.
- Canvas: https://claude.ai/code/artifact/6aeb72ba-c728-4037-9cdb-da8274525d21
- Status: ✅ posted (page's first post)

## 2026-09-07 — Gameday hype/countdown

- Trigger: on-demand (originally drafted as the first post for the
  brand-new GoVolsGameDay Facebook page; David posted the intro graphic
  above as post #1 instead and held this one for post #2)
- Subject: Tennessee at Georgia Tech, kickoff Saturday, Sept 12, 2026 at
  7:00 PM ET. Graphic leads with a countdown ("X DAYS TIL KICKOFF"), the
  matchup, kickoff time, the DraftKings line (TN −10.5, O/U 56.5), and
  context that Tennessee is coming off a 56–9 Week 1 win over Furman
  (638–221 total yards). All figures pulled from `live_games`. No team
  logos/crests used (text-only matchup treatment); the "photo" motif is
  intentionally typographic/diagonal-stripe per the brand system, not a
  stylized placeholder block, since no photo element was called for in
  this design.
- Canvas: https://claude.ai/code/artifact/8180dc70-276e-4667-8621-295df9f572b5
- Status: ⏳ pending review (queued as post #2)

### Refresh — 2026-09-06 (Eastern) / 2026-09-07 01:17 UTC

- Re-checked before David posts it as #2. Re-pulled `live_games` for both
  the Georgia Tech game and the Furman recap: kickoff time, the
  DraftKings line (TN −10.5, O/U 56.5), and the Furman score/yardage
  (56–9, 638–221) are all unchanged since the original draft — no other
  stat needed updating.
- The countdown itself needed correcting: the graphic states kickoff as
  "7:00 PM ET," so the day count is computed against the Eastern
  calendar date, not the raw UTC date. At the moment of this refresh it
  is still September 6 in US Eastern time (9:17 PM EDT) even though the
  UTC calendar has already rolled to September 7 — so kickoff on
  September 12 is **6 days** away, not 5. Updated the countdown number
  from 5 to 6 and republished to the same canvas URL (no new artifact
  created).
- Canvas (same URL): https://claude.ai/code/artifact/8180dc70-276e-4667-8621-295df9f572b5
- Status: ⏳ pending review (6-day countdown is accurate through the end
  of 2026-09-06 Eastern time; if it sits past then, the number will need
  another quick bump before posting)
