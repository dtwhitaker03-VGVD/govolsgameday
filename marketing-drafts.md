# Marketing Drafts

Log of drafted (never posted) GoVolsGameDay social graphics. Each
entry is a proposed Facebook post, published as a viewable design
canvas for David to review. See `.claude/agents/marketing-agent.md`
for the authority model — nothing here is ever posted automatically.

## 2026-09-02 — Gameday hype/countdown
- Trigger: on-demand
- Subject: Middle-ground layout combining the countdown hook with the make-your-picks CTA, per David's feedback (v6: added a small "...and more!" line under the Over/Under Picks section, above the Lock In Picks button, signaling the real form has more pick categories beyond what's shown — matches the actual site's TN Stat Guesses and weekly prop-bet sections in `PreGamePredictions.tsx`/`game_props`). Top: 3-day countdown to Tennessee (home) vs Furman, kickoff Sat Sep 5, 2026, 3:30 PM ET at Neyland Stadium. Middle: a Pre-Game Predictions card mockup (matching the real site UI) with an illustrative example pick — Winner: Tennessee, Total Yards: 372–198, Over/Under picks on the real DraftKings line (Spread TN -46.5: Over; Total 66.5: Under, captured 2026-09-02) — and a "Lock In Picks" CTA showing the real max points for this game (2,000, from the scoring formula + `game_props` count). Bottom: a poll teaser pulled from the real `daily_polls` row for 2026-09-02 (today) — "What single thing changed Tennessee basketball the most?" (Hiring Rick Barnes / The NIL era / Building Thompson-Boling / The Bruce Pearl hire in 2005) — shown as the question only, no results, since none exist yet — followed by the big GoVolsGameDay.com close and the "*Odds via DraftKings" citation.
- Canvas: https://claude.ai/code/artifact/b04912d3-b3fd-4db0-b0f9-fbfa9d7f7680
- Status: ⏳ pending review
- **Template locked 2026-09-02**: David approved this layout as the standard for future Gameday hype/countdown posts. Saved at `.claude/agents/templates/gameday-countdown-template.dc.html`; `marketing-agent.md` now points future runs at it instead of designing from scratch.
