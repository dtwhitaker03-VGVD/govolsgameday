# GoVolsGameDay — Comprehensive Project Summary
*Prepared 2026-08-25. Companion document to `CLAUDE.md` (Claude Code Edition). Read this first for orientation, then load `CLAUDE.md` as the working spec for any build session.*

---

## 1. What This Project Is

GoVolsGameDay (formerly branded "VolGameday") is a fan companion web app for University of Tennessee athletics — built around live gameday predictions, a running leaderboard, badges, trivia, polls, discussion boards/forums, and news/video aggregation. It is not an official UT product; it's an independent fan platform.

- **Current name:** GoVolsGameDay (renamed from VolGameday)
- **Domain:** govolsgameday.com — **not yet purchased** (open item, see §7)
- **Platform:** Bolt.new-built, deployed to Netlify
- **Status:** Pre-launch, spec-complete. `claude.md` in the project is marked "FINAL" and is the authoritative build spec.
- **Authoritative spec:** `claude.md` (project doc) / `CLAUDE.md` (this session's Claude Code edition, corrected — see §8)

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| Backend | Supabase (Postgres + Realtime + Storage + Auth + Edge Functions) |
| Automation | Supabase Edge Functions + `pg_cron` (9 scheduled jobs — see §6) |
| Web scraping | Firecrawl |
| Video | YouTube Data API v3 |
| Image moderation | Sightengine |
| Sports data | CollegeFootballData (CFBD) API |
| Hosting | Bolt.new build → Netlify deploy |

**Non-negotiable architecture rules** (14 total in `claude.md` §"Frontend Rules"; the ones that matter most day to day):
- **Zero client-side math.** All scoring, multipliers, and point settlement happen in Postgres RPC functions. The frontend only ever displays values the server returns.
- **Anti-spoiler buffer.** Drive outcomes and live score/point data are never rendered until a drive row's `status` column leaves `'open'`.
- **Room-category-isolated chat.** Every chat message is scoped by a `room_category` column; clients subscribe only to their own room via Supabase Realtime — never polling.
- **No page-code duplication across sports.** Basketball, Baseball, LV Basketball, LV Softball, and Other Sports all reuse the same template component as Football, parameterized by sport.
- **Server-side ban enforcement** is authoritative; the frontend never gatekeeps on the ban column itself.
- **Native Supabase forums — never XenForo.** Repeated as a hard rule throughout the spec.
- **Realtime, not polling**, for chat and hot-streak status.

Automation was originally planned around Make.com; that was dropped in favor of Supabase Edge Functions + `pg_cron` to save roughly $9/month, since Supabase can run all 9 scheduled jobs natively.

---

## 3. Design System (Summary)

- Card-based UI system with defined design tokens (colors, spacing, elevation) specified in full in `claude.md`.
- Hero banner + game card pattern on the Main page.
- Header/nav, auth modal, and legal footer are defined once and shared everywhere — **the legal footer appears on every single page, non-negotiable.**
- Video grid: **3×8 (24 cards)**, uniform on every page.
- News grid: **3×10 (30 cards)**, uniform on every page.
- Prediction engine UI lives **only on the Main page** — never duplicated onto Football or other sport pages.

---

## 4. Page Structure & Core Features

- **Main page** — 7-layer structure (replaced an earlier two-state "non-gameday / gameday" layout). Houses the prediction engine, hero banner/game card, and the primary gameday experience.
- **Football page** and parameterized **sport pages** (Basketball, Baseball, LV Basketball, LV Softball, Other Sports) — share one template component.
- **Live leaderboard** — settles at two moments only: end of each confirmed drive, and end of game. No continuous polling.
- **Hot streak effects** — visual treatment tied to a user's prediction streak; driven by the streak-multiplier table in `claude.md` (Pregame Scoring / Live Drive Predictions section).
- **Victory fireworks** — celebratory UI state on a Vols win.
- **Touchdown Video System — explicitly dropped.** `claude.md` states plainly this is **NOT being built.** Do not resurrect it in any future session.
- **Video/news grids** — see grid sizes above.
- **Discussion boards & native Supabase forums** (never XenForo).
- **Recruiting pages.**
- **About / Code of Conduct pages.**
- **Content moderation** — Sightengine for images; Scraped Content Review + `content_blocklist` on the admin side.
- **Admin dashboard** — includes Scraped Content Review, `content_blocklist` management, and pin/unpin controls. Does **not** include a Touchdown Videos section (dropped along with the feature).
- **User profile** — includes badges, prediction history, hot-streak status.
- **Post-OAuth username-selection flow** — new users pick a username after authenticating via OAuth.
- **Badge system** — 68 total badges (see §5).
- **Daily Vol Trivia** — see §5.
- **Daily Evergreen Poll** and **Fan Polls** — see §5.
- **Analytics, ad placement, premium/membership, and monetization** — specified in `claude.md`; no changes flagged in this pass.

**Trigger pattern:** a single unified "scheduled kickoff time" trigger drives gameday-mode transitions across the app, replacing an earlier two-stage "10 minutes before kickoff" design.

---

## 5. Content Asset Inventory (Current, Verified Counts)

| Asset | Count | Status | Source file |
|---|---|---|---|
| Daily Trivia questions | **1,000** (300 Football / 200 Basketball / 150 Baseball / 150 Lady Vols / 100 General Vol Athletics / 100 SEC Knowledge; each split Easy/Medium/Hard) | **Production-ready — 0 flags remaining**, ~200-day rotation at 5 questions/day | `VGD_Trivia_Questions_FULLY_REVISED.md` |
| Daily Polls | 200 (80 Football / 50 Basketball / 40 Baseball / 30 Lady Vols) | Confirmed consistent with spec | `VGD_Daily_Polls.md` |
| Question of the Day (discussion) | 800 (200 each: Football / Basketball / Baseball / Lady Vols) | Confirmed consistent with spec | `VGD_Question_of_the_Day.md` |
| Badges | 68 total (16 launch: 13 Gameday Prediction Track + 3 Forum Interaction Track; 52 additional: 37 general + 15 Trivia) | Confirmed consistent with spec | `VGD_Additional_Badges.md`, `claude.md` §31 |

**Trivia database — what changed and why it mattered:** the version of the trivia content described inside `claude.md` §32 was stale — it described an earlier filtered subset (539 audit-clean questions out of 997, cycling over 365 days, with 458 questions excluded as an "open item"). `VGD_Trivia_Questions_FULLY_REVISED.md` (dated one day after that filtered pass) is a full rewrite: every one of 1,000 questions was individually reviewed, hedge/non-answers and self-eliminating distractors were rewritten, and load-bearing claims were fact-checked. Notable corrections made in that rewrite:

- A.J. Burnett never played for Tennessee (drafted by the Mets out of high school) — replaced with real Tennessee pitchers (Luke Hochevar, R.A. Dickey).
- The checkerboard end zones trace to Doug Dickey in 1964, not Johnny Majors or Bowden Wyatt.
- Tennessee's first College Football Playoff appearance was 2024.
- John Henderson won the Outland Trophy in 2000, not 2001.
- The QB who won the 2022 Orange Bowl was Joe Milton III (Hendon Hooker was already out with an ACL injury).
- "Rocky Top" is Tennessee's beloved unofficial anthem — the official fight song is "Down the Field."
- Allan Houston was drafted by the Detroit Pistons in 1993 (he signed with the Knicks as a free agent three years later).
- Tamika Catchings was the #3 overall pick in the 2001 WNBA Draft, not #1.
- The Beer Barrel trophy (Tennessee–Kentucky) is historical/inactive — contested 1925–1999, not an ongoing rivalry trophy.

This is now reflected in `CLAUDE.md` (the corrected edition delivered alongside this summary) — §32, §44's quick-reference table, and Phase 2 build-order item 18 all now describe the trivia database as production-ready with no open QA gate. **The Project's `claude.md` doc is being updated to match** (see §9 below).

---

## 6. Database & Automation

- **Schema:** 22 Supabase/Postgres tables with row-level security (RLS) rules, fully specified in `claude.md`. Key tables include `trivia_questions`, `questions_of_the_day`, `content_blocklist`, plus drive/prediction, leaderboard, badge, chat, and forum tables (`room_category`-scoped).
- **Automation:** 9 scheduled jobs, all run via Supabase Edge Functions + `pg_cron` (no Make.com). Covers content rotation (trivia, polls, QOTD), scraped-content ingestion via Firecrawl, and gameday trigger logic tied to the unified kickoff-time pattern.
- **Prediction engine:** pregame scoring formulas and live drive predictions run entirely server-side; streak multiplier table lives in Postgres, never the client.

---

## 7. Open Items

- **Domain `govolsgameday.com` has not been purchased yet.**
- **Banner asset** `GoVolsGameDayBanner2100x1000.png` — existence/location not yet confirmed against the current asset library; verify before it's referenced in a build.
- Trivia database QA gate is now closed (see §5) — no longer blocking Phase 2 build-order item 18.

---

## 8. Build Phases (per `claude.md`)

- **Phase 1** — Core scaffolding, auth, design system, page shells, database schema, RLS.
- **Phase 2** — Feature build-out: prediction engine, leaderboard, badges, Daily Trivia (item 18 — content is production-ready, no longer QA-gated), polls, QOTD, chat/forums.
- **Phase 3** — Admin dashboard, content moderation pipeline, analytics, ad placement.
- **Post-launch** — Premium/membership, monetization expansion, ongoing content refresh.

*(Exact phase item numbering and full task lists live in `claude.md` / `CLAUDE.md` — this is a phase-level summary only, not a substitute for the source spec.)*

---

## 9. Key Deltas: Older Docs vs. Current Spec

Two project docs — `VGD_Session_Summary.md` and `VGD_Project_Summary.docx` (both dated 2026-07-06) — predate `claude.md` (dated 2026-08-25) and are **explicitly superseded** by it per its own preamble. They're kept for historical reference only. Do not build from them. Deltas between them and the current spec:

- Brand renamed: VolGameday → **GoVolsGameDay**.
- Domain changed: `vol-gameday.com` → **govolsgameday.com** (not yet purchased).
- Automation platform: Make.com → **Supabase Edge Functions + pg_cron**.
- Video grid: 3×10 → **3×8 (24 cards)**.
- **Touchdown Video System fully dropped** (was active/planned in the old docs).
- Streak-multiplier table changed from the old 1x/1.25x/1.5x/1.75x/2x/2.5x scale to the current table in `claude.md`.
- Trivia scoring/timer redesigned away from the old flat 20-pt/10-second model.
- Gameday trigger redesigned: old "10 minutes before kickoff" two-stage trigger → **unified scheduled-kickoff-time trigger**.
- Main page redesigned: old two-state (non-gameday/gameday) layout → **7-layer structure**.
- Admin Dashboard: gained Scraped Content Review, `content_blocklist`, and pin/unpin; **lost** the Touchdown Videos section.
- Added: **post-OAuth username-selection flow** for new users (not present in the old docs).
- Trivia content database: old filtered-subset (539/997 questions) → **full rewrite, 1,000 questions, 0 flags** (see §5).

---

## 10. File Inventory & Authority Guide

| File | Status | Use for |
|---|---|---|
| `claude.md` (project doc, 2026-08-25) | **Authoritative master spec** — 44 sections | The build spec of record |
| `CLAUDE.md` (this session's deliverable) | **Corrected, Claude-Code-framed edition of the above** | Drop into a Claude Code repo as its instructions file |
| `VGD_Trivia_Questions_FULLY_REVISED.md` (2026-08-24) | Current, production-ready | Trivia content load; source of the §32 corrections |
| `VGD_Daily_Polls.md` (2026-07-06) | Current, verified consistent | Poll content load |
| `VGD_Question_of_the_Day.md` (2026-07-06) | Current, verified consistent | QOTD content load |
| `VGD_Additional_Badges.md` (2026-07-06) | Current, verified consistent | Badge system content/logic |
| `VGD_Session_Summary.md` (2026-07-06) | **Superseded — historical only** | Understanding earlier decisions, not building |
| `VGD_Project_Summary.docx` (2026-07-06) | **Superseded — historical only** | Old handoff template reference only |
| `VGD_Comprehensive_Summary.md` (this file, 2026-08-25) | Current | Onboarding a new session/collaborator |

**Bottom line for a new Claude Code session:** load `CLAUDE.md` as the repo's instructions file, treat this summary as orientation reading, use the four content-database files for data loads, and never build from `VGD_Session_Summary.md` or `VGD_Project_Summary.docx`.
