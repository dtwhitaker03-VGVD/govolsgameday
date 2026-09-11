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

### Update — swap again: David wanted a harder question, not a fabricated one (2026-09-10)

- David pointed out the Sugar Bowl/Chuck Webb question above isn't
  genuinely hard (most Vol fans can place a running back's era) and
  asked for a completely new, made-up question about the 1991 game.
- Declined to fabricate one: a graphic presenting a trivia question as
  a real example of site content has to actually be a real question a
  user could get when they play — inventing one would be the same
  kind of made-up fact this whole log has deliberately avoided
  everywhere else. Explained this and searched the real
  `trivia_questions` table further instead.
- Found a real row that's genuinely hard, positive, AND tied to 1991,
  just not a "game": "Antone Davis was drafted in which round, and by
  which team, in 1991?" (Second round, Dallas Cowboys / Third round,
  Green Bay Packers / First round, San Francisco 49ers / First round,
  Philadelphia Eagles; real correct answer is First round, Philadelphia
  Eagles — not shown on the graphic). Swapped to this — an NFL Draft
  moment, not a game, but real, hard (round + team is specific), and a
  positive Vol accomplishment, which was the actual goal.
- Switched the option layout from a 2x2 chip grid to a stacked list
  (these option strings are longer than a single name) and trimmed a
  few margins elsewhere on the artboard to keep the extra row height
  inside the fixed 1080×1080 frame.
- Redeployed to the same canvas URL (no new artifact):
  https://claude.ai/code/artifact/bf095001-7d83-4606-85e1-1a64c18056ab
- Status: ⏳ pending review

### Update — David's own question: "Miracle at South Bend" 1991 (2026-09-10)

- David supplied the exact question and four score options himself:
  the "Miracle at South Bend" game — Tennessee at Notre Dame, 1991 —
  with 38–37 / 33–32 / 35–34 / 36–35 as the choices.
- Not a `trivia_questions` row (checked — no match for "South Bend" or
  "Miracle"), and a specific score on a public graphic is exactly the
  kind of claim this log has been careful to verify rather than take
  on memory, so checked it independently via web search before using
  it: UT Sports, 247Sports, and the Sports Illustrated Vault archive
  all confirm the real final score was **Tennessee 35, Notre Dame
  34** (Nov. 9, 1991 — Tennessee trailed 31–7 and rallied, sealed by a
  blocked field goal as time expired). That matches David's third
  option exactly, so used the question and options as given, with
  35–34 as the correct answer (not shown on the graphic).
- Switched the option layout back to the 2x2 chip grid (score pairs
  are short, same treatment as the original Notre Dame 1990 question)
  now that the options are short again.
- Redeployed to the same canvas URL (no new artifact):
  https://claude.ai/code/artifact/bf095001-7d83-4606-85e1-1a64c18056ab
- Status: ⏳ pending review

### Post copy — 2026-09-10

- David asked for a caption to go with this graphic. Drafted from the
  same real content already on the canvas — the four real features and
  the verified "Miracle at South Bend" trivia question — no new facts
  introduced.

  ```
  🧡 MORE THAN JUST THE SCORE 🧡

  Call every drive in real time. Play daily trivia. Sound off in the
  polls. Climb the leaderboard against the whole fan base.

  That's GoVolsGameDay — built for Vol fans who live and die with
  every snap.

  Think you know your Vols history? Today's challenge: what was the
  final score of the "Miracle at South Bend" — Tennessee's legendary
  comeback at Notre Dame in 1991?

  Drop your guess below, then go test yourself for real at
  GoVolsGameDay.com

  #GoVols #Vols #TennesseeFootball #MiracleAtSouthBend
  ```

- Status: ⏳ pending review (copy drafted, not yet approved or posted)

## 2026-09-11 — Gameday countdown ("1 day left", flare variant)

- Trigger: on-demand — David asked for a new countdown canvas, explicitly
  different from the earlier Game Week countdown graphic, with "more
  design, flare and pop," built around "1 day left" before kickoff.
- Subject: Tennessee at Georgia Tech, kickoff Sat, Sept 12, 2026, 7:00 PM
  ET on ESPN — confirmed still the soonest pregame game in `live_games`
  as of today (2026-09-11), so "1 day left" is accurate. Stats pulled
  fresh from `game_previews` (fetched 2026-09-11 13:05 UTC, joined to the
  TN@GT `live_games` row): No. 18 Tennessee, 1-0; offense averaging 638
  yards/game (12th in FBS) and 56.0 points/game (19th in FBS); 100% red
  zone scoring (a TD on every trip). The same `game_previews` payload
  also included an opening betting line (Tennessee by 12.5) — deliberately
  left off the graphic, per David's earlier standing decision to keep
  Game Week/countdown graphics odds-free (see the "remove betting line"
  update on the original Sept 7 countdown post above).
- Design departs intentionally from the existing Game Week countdown
  style: rotated diagonal color wedges, a conic-gradient starburst behind
  the hero "1," a duotone/offset-shadow treatment on the hero number, a
  rotated red "GAMEDAY EVE" ribbon badge, a rank/record pill, and three
  independently-rotated stat-burst tiles — brand palette (`#0F172A` /
  `#FF8200` / `#162038`), Anton + Inter type pairing, and GVGD logo
  treatment unchanged from the rest of the site's graphics.
- Canvas: https://claude.ai/code/artifact/347ca27f-f451-48ae-8a01-24211920debc
- Status: ⏳ pending review

### Update — cleanup pass (2026-09-11)

- David flagged the "1" bleeding into "DAY LEFT" below it, the dark card
  boxes around the three stats, and asked for the stats bigger and the
  tiles straightened out.
- Added clearance between the hero number and the "DAY LEFT" label,
  dropped the stat tiles' dark background/border/shadow (now sit plain
  on the background with thin dividers between them instead of boxes),
  increased the stat number/label/sub-label sizes, and removed the
  independent rotation on each stat tile so all three sit level.
- Redeployed to the same canvas URL (no new artifact):
  https://claude.ai/code/artifact/347ca27f-f451-48ae-8a01-24211920debc
- Status: ⏳ pending review

### Update — download button (2026-09-11)

- David asked to be able to download this one as an image. Added a
  "Download PNG" button below the graphic (outside the 1080×1080
  artboard itself, so it never appears in the exported image) that
  renders the artboard to a PNG at full resolution (2160×2160, 2x for
  crispness) via html2canvas and saves it through the page's
  `downloads` capability.
- Verified the whole flow end-to-end locally (headless browser, mocked
  save call, inspected the exported PNG) before publishing rather than
  just shipping it — caught and fixed a real bug in the process: the
  page's outer layout was `display: flex` with no `flex-direction`, so
  once the download button was added as a second element it defaulted
  to a row and squeezed the graphic sideways. Fixed to `flex-direction:
  column` and confirmed the export renders at the correct full
  1080×1080 artboard size regardless of viewport width (tested at both
  desktop and phone widths).
- Redeployed to the same canvas URL (no new artifact):
  https://claude.ai/code/artifact/347ca27f-f451-48ae-8a01-24211920debc
- Status: ⏳ pending review

### Update — switched to a static image (2026-09-11)

- David reported the download button still said "unavailable" even
  after opening the canvas in its own tab and doing a full reload.
  Retried once with the capability declared as an object instead of a
  boolean plus the runtime pinned to `latest`, in case that was the
  issue — same result. Rather than keep guessing at why this
  particular runtime capability wasn't reaching his view, switched to
  an approach that doesn't depend on it at all: rendered the same
  design to a real PNG (1080×1080 canvas at 2x = 2160×2160) locally
  and republished the canvas as that baked image plus a one-line "press
  and hold / right-click to save" hint. Saving an `<img>` this way is a
  native browser action, not something the page triggers itself, so it
  isn't subject to the same capability gate.
- Trade-off: this canvas is now a static image rather than a live page,
  so any further copy/design tweaks mean re-rendering and republishing
  rather than editing in place — the editable source is kept locally
  for that.
- Also sent David the same PNG directly as a file, as a backup in case
  saving from the browser is still inconvenient.
- Redeployed to the same canvas URL (no new artifact):
  https://claude.ai/code/artifact/347ca27f-f451-48ae-8a01-24211920debc
- Status: ⏳ pending review
