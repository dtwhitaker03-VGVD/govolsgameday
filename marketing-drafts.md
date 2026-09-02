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

## 2026-09-02 — Website highlight (Monday)
- Trigger: on-demand (example request — "show me an example of a Monday post")
- Subject: Feature-capability grid based on a reference David shared: GVGD wordmark + tagline, a bordered feature grid with real site capabilities (Live Game Predictor, Live Fan Chat, Recruiting Central, Daily Trivia & Polls — all backed by real tables: `pregame_predictions`/`drive_predictions`/`game_leaderboard`, `chat_messages`, `recruiting_class_rankings`/`scraped_articles`, `trivia_questions`/`daily_polls`), closing with a real season-kickoff banner (Sept 5 vs Furman, from `live_games`). Went through one revision (initial draft cited a specific real forum thread + video with a "what's happening" framing; David redirected toward capability marketing — "tell people what they can do," not "show what we have" — landing on this feature-grid format).
- Canvas: https://claude.ai/code/artifact/2eeb1147-a117-4ae1-a03f-4e04224e7bfd
- Status: example only — not a real week's draft, no PR
- **Template locked 2026-09-02**: David confirmed each real Monday post should be a variation of this — rotating which 2-4 real features are shown and varying the top graphic/accent band. Saved at `.claude/agents/templates/monday-website-highlight-template.dc.html`; `marketing-agent.md`'s Monday entry now points at it.
