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

## 2026-09-07 — Gameday hype/countdown: full pre-scheduled week batch

- Trigger: on-demand — David wants to pre-schedule the whole countdown
  week in Meta Business Suite's Planner rather than have posts generated
  day-by-day, so this batch generates all 7 graphics for the Tennessee at
  Georgia Tech countdown in one pass. Same design/layout/branding as the
  single Game Week countdown draft above — same matchup, kickoff time,
  DraftKings line, and Furman recap — with only the hero content changing
  per artboard (day count, or the distinct "GAME DAY" treatment for
  kickoff day itself instead of an awkward "0 DAYS").
- Re-verified against `live_games` immediately before generating this
  batch: kickoff 2026-09-12 23:00 UTC (7:00 PM ET) unchanged, DraftKings
  line still TN −10.5 / O/U 56.5, Furman recap still 56–9 (638–221 total
  yards). Nothing had moved since the single-canvas refresh above.
- Each of the 7 images is its own artboard on one canvas (David can open
  each and use the toolbar's Export to grab it as a standalone PNG for
  scheduling). Date-to-variant mapping (Eastern time, matching how the
  countdown logic already works — this is the same timezone reasoning
  used in the refresh above):

  | Post date (Eastern) | Artboard      | Hero content              |
  |----------------------|---------------|----------------------------|
  | Sun, Sep 6 (today)   | `Main`        | 6 DAYS TIL KICKOFF         |
  | Mon, Sep 7           | `Day5`        | 5 DAYS TIL KICKOFF         |
  | Tue, Sep 8           | `Day4`        | 4 DAYS TIL KICKOFF         |
  | Wed, Sep 9           | `Day3`        | 3 DAYS TIL KICKOFF         |
  | Thu, Sep 10          | `Day2`        | 2 DAYS TIL KICKOFF         |
  | Fri, Sep 11          | `Day1`        | 1 DAY TIL KICKOFF          |
  | Sat, Sep 12 (kickoff)| `GameDay`     | "GAME DAY" + KICKOFF 7:00 PM ET, pill reads "IT'S HERE" instead of "GAME WEEK" |

- Caveats worth flagging before David schedules the full week:
  - **The betting line will not stay live.** All 7 images bake in the
    DraftKings line captured today (TN −10.5, O/U 56.5). Lines routinely
    move over a full week, so by Thursday/Friday this number may no
    longer match the market — that's an accepted tradeoff of
    pre-generating a static batch instead of a live daily pull, per
    David's instruction to reuse the same line across all variants. If
    it drifts meaningfully, a quick manual edit to the later-day
    artboards (or re-running this batch closer to those days) would keep
    it honest.
  - **The Sep 6 ("today"/6-day) artboard duplicates the single Game Week
    canvas already logged above** — it's included here for a complete,
    grab-any-day batch, not a separate new post.
  - The Furman recap line ("Coming off a 56–9 Week 1 win") stays fixed
    across all 7 days per David's instruction to keep the design
    otherwise unchanged; by kickoff day (Sep 12) that reference is over a
    week old — fine as shipped, but worth a look if it reads stale by
    then.
- Canvas (all 7 artboards): https://claude.ai/code/artifact/96406099-f7f1-4381-bdbd-e3108a7fa08c
- Status: ⏳ pending review (full week batch, ready for David to export
  and schedule)

### Update — remove betting line (both canvases)

- David's call on the staleness problem flagged above: rather than keep
  refreshing the DraftKings line across a week of pre-scheduled posts (or
  accepting that it may drift), drop the line from the graphics entirely.
  Everything else that doesn't go stale — matchup, kickoff time, the
  day-count/GAME DAY hero, and the Furman recap — stays exactly as-is.
- The context card at the bottom of every artboard now reads only
  "Coming off a 56–9 Week 1 win over Furman," centered, with no odds
  column. Applied identically to the single Game Week canvas and all 7
  artboards in the batch canvas.
- Both redeployed to their existing URLs (no new artifacts):
  - Single canvas: https://claude.ai/code/artifact/8180dc70-276e-4667-8621-295df9f572b5
  - Full week batch (7 artboards): https://claude.ai/code/artifact/96406099-f7f1-4381-bdbd-e3108a7fa08c
- The earlier "betting line will drift" caveat above is now moot for both
  canvases — there's no line on them to go stale.
- Status: ⏳ pending review (line removed from both; ready for David to
  re-check and schedule)

### Update — Day4 artboard: swap in Sept 8 Daily Poll

- David updated `daily_polls` directly (active_date 2026-09-08): "How many
  total TDs will Faizon Brandon have?" with options 1 / 2 / 3 / 4+, and
  asked for it on the "4 DAYS TIL KICKOFF" artboard (`Day4`, mapped to the
  Sept 8 posting date) in the countdown batch canvas.
- Re-verified the poll row directly in `daily_polls` before editing:
  question and options above match the live row exactly.
- Design choice: replaced the Furman-recap context card on `Day4` only
  with a poll card (eyebrow "TODAY'S POLL," the question, and the four
  options as pill chips) rather than stacking both — keeps the graphic
  focused on one timely call-to-action instead of pairing a 3-day-old
  recap with same-day poll content. The other 6 artboards (Main, Day5,
  Day3, Day2, Day1, GameDay) are untouched and still show the Furman
  recap card.
- Redeployed to the same canvas URL (no new artifact):
  https://claude.ai/code/artifact/96406099-f7f1-4381-bdbd-e3108a7fa08c
- Status: ⏳ pending review (Day4 now carries the Sept 8 poll; re-check
  before scheduling that day's post)

### Update — single canvas: swap in today's poll, bump countdown (2026-09-09)

- David asked for a countdown canvas with today's poll question at the
  bottom. Applied to the **single Game Week canvas** (not the 7-artboard
  batch): re-pulled `live_games` (Georgia Tech kickoff unchanged,
  2026-09-12 23:00 UTC / 7:00 PM ET, 3 days from today) and `daily_polls`
  for `active_date = 2026-09-09`: "Greatest TN Vol Backfield?" (McEver–
  Feathers / Cobb–Webb / Lewis–Henry–Stephens / Wright–Small–Sampson).
- Bumped the hero countdown from the stale "6" to the real "3."
- Followed the Day4-batch precedent above rather than stacking a second
  card: **replaced** the Furman-recap context card with a poll card
  (same "TODAY'S POLL" eyebrow + question + option-chip treatment used on
  Day4), so the graphic keeps one timely call-to-action instead of
  pairing a now-4-day-old recap with a same-day poll.
- Redeployed to the same canvas URL (no new artifact):
  https://claude.ai/code/artifact/8180dc70-276e-4667-8621-295df9f572b5
- Status: ⏳ pending review (poll and 3-day countdown current as of
  2026-09-09; the batch canvas's other 6 artboards are untouched)

## 2026-09-10 — Site feature promo (evergreen)

- Trigger: on-demand — David asked for a brand-new canvas promoting the
  site itself, highlighting its features, with a real hard trivia
  question on it.
- Subject: not tied to a game or date. Headline "Pick. Predict.
  Compete." with a subhead positioning GVGD as more than a scoreboard.
  A 2x2 feature grid names four real, shipped capabilities: Live Drive
  Picks (drive predictions during live games), Daily Trivia
  (`trivia_questions`), Fan Polls (`daily_polls`), and Leaderboard
  (`game_leaderboard`) — each described as a capability, not tied to a
  specific stat/instance.
- Visual system matches the currently-live graphics (Game Week
  countdown, Faizon Brandon news post): `#0F172A` background, `#FF8200`
  orange accent, Anton for the headline/wordmark, Inter for body text,
  diagonal end-zone-stripe motif + radial glow, GVGD logo lockup pulled
  from the current `Header.tsx` (rounded-square orange "GVGD" mark +
  "Go/Vols" white, "GameDay" orange wordmark). No stock photos or team
  crests. Seeded with an explicit `canvas.json` (1080×1080 frame) and
  passed `--check` before publishing.
- Canvas: https://claude.ai/code/artifact/bf095001-7d83-4606-85e1-1a64c18056ab
- Status: ⏳ pending review

### Update — swap trivia question to something more positive (2026-09-10)

- David's original trivia teaser (a real hard row about the Nov. 10,
  1990 Notre Dame loss) read too negative for a promo piece; asked for
  the 1991 game's final score instead.
- **Data gap found**: no real `trivia_questions` row gives a final
  score for any 1991 game, and there's no historical-scores table to
  cross-reference (checked `information_schema.tables` for anything
  `%histor%`/`%past_game%`/`%archive%` — none exist). Rather than
  invent a score, swapped to the closest real, positive, hard-
  difficulty row instead: "Which Tennessee running back set a since-
  broken bowl rushing record in the 1991 Sugar Bowl?" (Travis Henry /
  Chuck Webb / Jamal Lewis / Arian Foster; real correct answer Chuck
  Webb, not shown on the graphic) — the 1991 Sugar Bowl (played Jan. 1,
  1991, capping the 1990 season) was a Tennessee win over Virginia, so
  this keeps the positive framing and the 1991 game context David
  asked for, just phrased around the record instead of a score that
  isn't in the database.
- Redeployed to the same canvas URL (no new artifact):
  https://claude.ai/code/artifact/bf095001-7d83-4606-85e1-1a64c18056ab
- Status: ⏳ pending review
