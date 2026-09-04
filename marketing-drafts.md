# Marketing Drafts

Log of drafted (never posted) GoVolsGameDay social graphics. Each
entry is a proposed Facebook post, published as a viewable design
canvas for David to review. See `.claude/agents/marketing-agent.md`
for the authority model — nothing here is ever posted automatically.

**Note (2026-09-04):** this file doesn't yet exist on `main` — an
earlier round of drafts (2026-09-02, including the locked Wednesday
and Monday templates) is still sitting in open PR #78
(`marketing/2026-09-02`), which also creates this file from scratch.
Whichever of that PR and this one merges second will hit a trivial
add/add conflict on this file — just keep both sets of entries when
resolving it.

## 2026-09-04 — Gameday countdown + predictions (Friday)
- Trigger: scheduled (Mon/Wed/Fri)
- Subject: "Last call" pre-game post for Tennessee (home) vs Furman, kickoff Sat Sep 5, 2026, 3:30 PM ET at Neyland Stadium — 1 day out, picks locking tomorrow. Countdown ("1 DAY TO KICKOFF") + a "Picks Lock Tomorrow · Get Yours In" urgency banner, then a Pre-Game Predictions card mockup (matching the real site UI) with an illustrative example pick — Winner: Tennessee, Total Yards: 372–198, Over/Under picks on the real DraftKings line (Spread TN -46.5: Over; Total 66.5: Under, captured 2026-09-02, unchanged as of today) — a "...and more!" teaser, and a "Lock In Picks" CTA showing the real max points for this game (2,000, from the scoring formula in the current `PreGamePredictions.tsx` + 5 real `game_props`). Closes with a "Last Chance Before Kickoff" line and the big GoVolsGameDay.com wordmark.
- **Team Stats section on hold**: per David's Mon/Wed/Fri plan, Friday's post was meant to also include a Team Stats comparison (Tennessee vs Furman). As flagged when the weekly schedule was documented (see PR #78), there is still no real season-performance table in Supabase to build that from — `sec_team_rankings` is recruiting-class data, and `live_games`'s stat columns only populate once a game is live/final. Built this post as countdown + predictions only, per that guidance, rather than fabricate stats. Flagging again here since PR #78 (which documents this gap in `marketing-agent.md`) hasn't merged yet.
- Canvas: https://claude.ai/code/artifact/d1a7014b-d7f1-48b7-80e3-543898e338f1
- Status: ⏳ pending review
