# GOVOLSGAMEDAY — MASTER SPECIFICATION (CLAUDE CODE EDITION)
> Load this file at the start of every Claude Code session working on this repo. It is the single source of truth for every architectural, logic, and UI decision — treat it as CLAUDE.md / project instructions, read it before writing any code, and follow it over any conflicting assumption.
> This document supersedes and replaces the original `claude.md`, `VGD_Session_Summary.md`, and `VGD_Project_Summary.docx` — all conflicts between those documents have been resolved here in favor of the most recent, most detailed decision set. Do not consult the older files during the build; they are kept only as historical record. This edition also folds in the trivia-database rewrite documented in `VGD_Trivia_Questions_FULLY_REVISED.md` (see §32 and §44).

---

## 0. SESSION RULES (READ FIRST — NEVER VIOLATE)

1. **Zero client-side math.** The frontend NEVER calculates, evaluates, or estimates points, multipliers, or scores. All math lives in PostgreSQL functions or Supabase RPC calls. The frontend only displays values returned by the server.
2. **Anti-spoiler buffer.** The frontend NEVER renders drive outcomes, live score updates, or point tallies for a drive unless the corresponding database row's `status` column is in a state other than `'open'`. Raw live data from CFBD is never displayed directly in prediction UI until the drive is resolved server-side.
3. **Room category isolation.** Chat messages are strictly scoped by `room_category`. Each page subscribes only to its own room. Messages from other rooms are never shown. The `room_category` value is always set by the outbound insertion logic, never by the user.
4. **No code duplication across sport pages.** Basketball, Baseball, LV Basketball, LV Softball, and Other Sports pages all use the same template component as Football, parameterized by sport. Never copy-paste page code.
5. **Server-side ban enforcement is the authority.** The database trigger rejects banned users. The frontend catches the error and freezes the UI — it does NOT check the ban column itself before submitting.
6. **All leaderboard reads and point settlements happen at two moments only:** end of each confirmed drive, and end of game. No continuous polling.
7. **Supabase Realtime subscriptions, not polling,** for chat and profile hot-streak status.
8. **Forums are native Supabase — never XenForo.** XenForo was an earlier idea and has been fully dropped. Do not create any XenForo integration, API keys, or references.
9. **The prediction engine (pre-game + live drive) and the live gameday leaderboard live on the Main page ONLY.** They are never duplicated on the Football page or any other sport page.
10. **Article clicks always open in a new tab** — never navigate away from GoVolsGameDay.
11. **Affiliate URL parameters must never be stripped or modified.**
12. **Admin route `/admin` immediately redirects non-admin users** — it never reveals that it exists.
13. **Profile rows are created only by the `handle_new_user` database trigger** — never client-side.

---

## 1. TECH STACK

| Layer | Tool |
|---|---|
| Frontend framework | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| Backend / DB / Auth | Supabase (PostgreSQL + Realtime + Storage + Auth + Edge Functions) |
| Automation / Workflows | **Supabase Edge Functions + `pg_cron`** — scheduled and event-triggered automation, no separate service, no extra monthly cost (built into Supabase at every tier). Make.com was an earlier idea and has been dropped. |
| Web scraping | Firecrawl |
| Video data | YouTube Data API v3 |
| Image moderation | Sightengine |
| Live sports data | CollegeFootballData (CFBD) API |
| Forum infrastructure | **Native Supabase tables** (forum_threads, forum_posts, forum_reactions) — NOT XenForo |
| Hosting | Bolt.new / Netlify |
| Domain | `govolsgameday.com` — **purchased** (Namecheap, 2026-08-25). Brand/name displayed throughout the site is **"GoVolsGameDay"** (logo mark: **"GVGD"**), matching the domain and the current banner artwork — this replaces an earlier decision to keep the display brand as "VolGameday"/"VGD" independent of the domain name; that's been reversed. |

### Environment Variables (never hard-code)
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   # server/edge functions only — never client-side
CFBD_API_KEY
YOUTUBE_API_KEY
FIRECRAWL_API_KEY
SIGHTENGINE_API_USER
SIGHTENGINE_API_SECRET
```

---

## 2. GLOBAL DESIGN TOKENS

```css
--color-bg:         #0F172A   /* slate dark — every page background, subtle gradient depth (lighter in cards, darker in gutters) */
--color-orange:     #FF8200   /* Tennessee Orange — all accents, CTAs, active states, live indicators, leaderboard #1 glow */
--color-error:      #D11919   /* Crimson Red — ban notices, errors, warnings */
--color-muted:      #58595B   /* Smokey Gray — timestamps, borders, metadata */
--color-white:      #FFFFFF
```

**Typography:** Clean modern sans-serif. Heavier weights for numerical dashboards, stats, and grids.

**Overall feel:** Data-dense, second-screen optimized, dark premium aesthetic — think ESPN or The Athletic at night. No background texture. 2-line max truncation with ellipsis on card titles. Minimal padding to maximize information per viewport.

---

## 2A. UI PATTERN LIBRARY — WINDOWED CARD SYSTEM

This section codifies the visual treatment used across every dashboard-style widget on the site (chat, stats, predictions, leaderboard, video hub, news wire, forum threads, etc.). Every "window" described elsewhere in this spec (Discussion Board, Live Game Stats, Pre-Game Predictions, Live Drive Prediction, Live Leaderboard, Video Grid, News Grid, Forum Tray, and so on) uses this same card component — never a bespoke layout per widget.

**Card shell:**
- Rounded-rectangle container, background one step lighter than `--color-bg` (subtle card-vs-gutter contrast), thin 1px border in a faint neutral tone
- Card header bar sits inside the same container, visually separated from the body by a hairline divider — not a separate outer element

**Card header bar (every window, no exceptions):**
- Left side: small colored status dot (orange = live/active, can shift color contextually) + title in uppercase, letter-spaced, small-caps style (e.g. "LIVE VOL CHAT", "SCOREBOARD & GAME STATS", "VOL VIDEO HUB — YOUTUBE")
- Right side: a metadata tag relevant to that widget — presence count ("847 ONLINE"), a live badge with lightning icon ("⚡ LIVE"), a scope tag ("TOP 10", "15 SOURCES", "2026", "UT vs ALA"), or a state label ("ACTIVE", "WAITING")
- This left-title/right-metadata header pattern is mandatory on every card — it's how a user scans the dashboard at a glance

**Grid composition:**
- Top row of the gameday engine: 3 equal-width windows side by side on desktop (e.g. Pre-Game Predictions | Live Drive Prediction | Live Gameday Leaderboard)
- Below that: 3-column rows for content windows (e.g. Vol News Wire | Hot Forum Threads | leaderboard-style panel)
- Video/News grids: uniform card grid inside a single window, not three separate windows
- Stacks to single column on mobile, cards keep their internal header/body structure

**List rows inside a card (leaderboard, news wire, forum threads):**
- Rank or source tag on the far left in Tennessee Orange, bold
- Primary text (headline, thread title, username) in white, single line or 2-line max with ellipsis
- Secondary/trailing info right-aligned: points, reply count, relative timestamp ("1h", "2h ago")
- Rows separated by hairline dividers, not full card borders

**Prediction/action widgets:**
- Toggle-chip style buttons for binary choices (e.g. Tennessee vs. Opponent winner pick) — pill-shaped, orange when selected
- Numeric inputs: dark input field, placeholder shows an example value ("e.g. 31"), helper microcopy below in Smokey Gray explaining the scoring math
- Outcome buttons (drive predictions): full-width stacked rows, icon + label left, percentage + point value right, orange left-edge accent bar indicating the active/selectable state
- Primary CTA button (e.g. "Lock In Pick", "Become a Member"): solid Tennessee Orange, rounded, full-width within its context

**Video grid cards:** dark thumbnail placeholder with centered orange play-button icon, timestamp + 2-line title below the thumbnail, uniform card sizing across the grid.

**Status/live indicators:** small dot (orange or green) paired with a short label — used consistently for "LIVE", "ONLINE", "ACTIVE" states rather than separate icon systems per widget.

This card system is the connective visual tissue across the whole site — Bolt should build one reusable `<DashboardCard>` component (header slot + body slot) and compose every widget in this spec from it, rather than hand-building each panel independently.

---

## 3. HERO BANNER + UPCOMING GAME CARD (every page)

**Layout — site-wide, every single page, no exceptions:** sits **above** the sticky header/nav, same as before — page stacking order top to bottom is: Banner+Game Card row → Sticky Header/Nav → page content. The header remains sticky and pins to the top of the viewport once the user scrolls past this row. What's new is that the banner no longer runs full-width alone — it's now a two-column row split exactly at the page's horizontal midpoint: **Hero Banner (left half)** + **Upcoming Game Card (right half)**. (This replaces the earlier version of this section, where the banner ran full-width alone with no paired content — changed because a lone full-width banner felt disconnected from the rest of the page, and because the Upcoming Game Card needed a permanent, always-visible home that didn't depend on which page a fan happened to be on.)

**For now, the Upcoming Game Card always shows Tennessee Football's upcoming/live game, on every page site-wide** — Basketball page, Baseball page, Forums, Recruiting, Profile, Admin, About, Contact, all of it. This is a deliberate interim simplification: only football has a live CFBD data pipeline built today. Revisit once Basketball/Baseball have their own live-data integrations (see §6.6 Post-Launch) — at that point each sport page could show its own sport's upcoming game instead.

**Banner sizing — unchanged from the existing locked-in approach, just narrower:** still `object-fit: contain` with the same fixed max-height (`max-h-[220px]` mobile, `max-h-[320px]` desktop) that was already locked in to prevent the cropping problems an earlier `vh`-based approach caused. Only the container width changes — capped to the left half of the row instead of full page width. Page background (`#0F172A`) fills any empty space around the image, same as before.
- File: `GoVolsGameDayBanner2100x1000.png` (1817×866, ~2.1:1 ratio). This replaces an earlier `VGDBannerAthletes3Final_1600x1200.png` (4:3) — that ratio was an initial estimate made before the row's real container math was known. Once the actual live container dimensions were confirmed (`max-w-[1400px]` row, 24px padding each side, 12px gap between columns → ~670px per column at typical desktop widths), the precise ratio needed to fill that column with zero gap at the fixed 320px height came out to ~2.09:1 (670÷320), not 4:3 — this asset was recomposed specifically to hit that target, and does so almost exactly (measured 2.098:1). All four athletes remain fully visible with no cropping, logo/tagline safely centered.
- The image is the finished graphic as-is — logo, "GOVOLSGAMEDAY.COM," and tagline are baked into the artwork. No separate HTML text overlay.

**Upcoming Game Card sizing:** height matches the banner's rendered height exactly (220px mobile / 320px desktop) — the banner drives the row height, the card fills it. Final compact design, validated to fit comfortably at true size on both breakpoints:
1. Team matchup, centered, no header label: `[Tennessee-orange badge] Tennessee vs Georgia [opponent-color badge]` — badges are real team logo images from CFBD in production (not the colored placeholder circles used during mockup review)
2. Date line, centered below it: `Sat, Nov 14 · 3:30 PM ET · ABC · ` + the countdown remaining, in **highlighted orange text** (e.g. `4d 6h`) — no "kicks off in" wrapper text, just the bare countdown, colored. TV network is appended here; if CFBD hasn't assigned a broadcast yet, drop that segment gracefully rather than showing "TBD" or leaving a stray separator.
3. Six-row comparison table, `TENN` / opponent-abbreviation column headers (desktop only — dropped on mobile to save a row of height), each row `label | Tennessee value | opponent value`:
   - Record
   - AP / Coaches (both polls combined into one row — `#12 / #11`)
   - Scoring offense
   - Total offense
   - Scoring defense
   - Total defense

This fits with real room to spare on desktop and comfortably on mobile — no modal or click-to-expand needed for this card; everything is visible inline. (An earlier draft of this design tried to fit all 8 offense/defense sub-stats plus separate AP and Coaches rows — 11 rows total — which required a click-to-expand modal to work at all. Combining the two polls into one row and dropping to just scoring+total for each side of the ball removed the need for that modal entirely.)

**Gameday behavior:** at **scheduled kickoff time** — see §8, everything on this page now hinges on this one unified trigger — the right half of this row swaps from the Upcoming Game Card to the **Live Game Stats Panel**, same compact height:
1. Header, centered: 🔴 `LIVE` + `· Q3 · 8:42` (quarter and clock)
2. Score, centered, large: `[TN badge] 21 – 17 [opponent badge]`, with a possession line below it (`Tennessee ball · 2nd & 6`)
3. Five-row comparison table, same `label | TENN | opponent` format as the pregame card:
   - Rushing
   - Passing
   - Total offense
   - Turnovers
   - Timeouts left

(Team defensive "yards allowed" was considered and deliberately cut — it's the exact mirror of the opponent's Total offense row already shown, so including both would just repeat the same four numbers twice.)

This is the only place Live Game Stats appears — it is not duplicated further down the page (see §9, which no longer has its own separate Live Game Stats row for this reason).
- Mobile: banner and card stack vertically instead of side-by-side; each keeps its own compact treatment.

---

## 4. GLOBAL HEADER AND NAVIGATION

**Header specs:**
- Slim vertical profile on desktop — tight padding, roughly half typical header height, sleek status-bar feel
- Full-width, translucent blur, sticky, depth layer 50 — sits directly below the Hero Banner (§3) in normal document flow, then pins to the top of the viewport once the user scrolls past the banner
- Mobile: standard height, hamburger → right-to-left slide drawer with same link order

**Logo mark (left side of header):** small square icon box, background Tennessee Orange, containing **"GVGD"** in white — followed by the wordmark **"GoVolsGameDay"**, styled with "GO" and "VOLS" in white and "GAMEDAY" in Tennessee Orange (matching the banner artwork's V/GD orange-white split treatment). This replaces an earlier "VGD" icon + "VOLGAMEDAY" wordmark that predates the GoVolsGameDay rebrand — if the header still shows the old mark, that's stale and needs updating to match.

**Navigation order (desktop):**
`Home | Football ▼ | Basketball | Baseball | Lady Vols ▼ | Recruiting ▼ | Forums | Other | 🛍 Fan Shop | About`

**Dropdowns:**
- **Football ▼:** Football | Football Recruiting
- **Lady Vols ▼:** LV Basketball | LV Softball
- **Recruiting ▼:** Football Recruiting | Other Sports Recruiting

**Active page:** Bold Tennessee Orange + 2px orange underline
**Hover:** 150ms fade from Smokey Gray to orange

**Fan Shop link:**
- Small shopping bag icon + text, links to Amazon affiliate URL for Tennessee fan merchandise
- Opens in new tab — never navigates away from GoVolsGameDay
- Full affiliate URL with tracking parameters preserved exactly — never stripped or modified
- Amazon Associates account/tracking tag set up by owner before launch

**Auth states:**

*Logged out — two buttons top right:*
- "Sign In" — ghost/outlined button → opens auth modal in login view
- "Become a Member" — solid orange button → opens auth modal in registration view

*Logged in — avatar replaces both buttons:*
- Circular avatar photo, or Tennessee Orange circle with initials as fallback
- Click opens dropdown: avatar + username + total points at top, divider, My Profile, Settings, Sign Out
- Admin accounts additionally see an "Admin" link in this dropdown
- Red badge on avatar showing count of open moderation reports (admins only)

---

## 5. AUTH MODAL

- Title: **"Join GVGD"** — bold, high-contrast, centered modal, full dark backdrop blur (replaces an earlier "Join Vol Game Day" title that predates the GoVolsGameDay rebrand)
- `Continue with Google` button (Google logo icon) → Supabase OAuth
- Divider: `or use credentials`
- Fields: Email (required), Username (required, alphanumeric only, max 50 chars, frontend regex enforced), Password (required, min 8 chars)
- Bottom toggle: switch between Register and Login modes
- On successful registration: Supabase trigger auto-creates a `profiles` row — never created client-side

**Post-OAuth username selection (Google sign-ups only):**
- Credential sign-up already collects a username directly in the form. Google OAuth does not — the `handle_new_user()` trigger auto-generates a placeholder (`VolFan` + 8 hex chars) and sets `profiles.username_is_default = TRUE`.
- Immediately after a Google OAuth sign-up completes (detected via `username_is_default = TRUE` on the freshly-created profile), show a one-time **"Choose Your Username"** modal before the user reaches the site — same visual style as the auth modal, single field (alphanumeric, max 50 chars, live availability check against the `username` unique constraint), single "Continue" button. No skip option — a username must be set before the modal dismisses.
- Submitting this modal performs a normal client-side `UPDATE` to the user's own `profiles` row (permitted under RLS — users may update their own row) setting `username` to their choice and `username_is_default = FALSE`. This does not violate the trigger-only profile *creation* rule, since the row already exists — this only edits it.
- This modal never appears again once `username_is_default = FALSE`, including on subsequent logins.
- Existing users created before this feature shipped default to `username_is_default = FALSE` (backfill) so they aren't unexpectedly prompted.

---

## 6. LEGAL FOOTER (every page — immutable)

Anchored to the absolute bottom of every page inside the root layout. Cannot be removed by any route. Exact text:

> *"GoVolsGameDay is an independent, fan-driven digital community and is not endorsed by, sponsored by, directly managed by, or affiliated with the University of Tennessee or UT Athletics. All trademarks and logos displayed within the automated video and news grids belong to their respective intellectual property owners."*

Low-contrast micro-copy, Smokey Gray. Links to Code of Conduct page. Never remove.

---

## 7. PAGE STRUCTURE AND URLS

| Page | URL | Discussion Board Title |
|---|---|---|
| Main/Home | `/` | Vol Discussion Board |
| Football | `/football` | Football Discussion Board |
| Football Recruiting | `/football-recruiting` | Football Recruiting Discussion Board |
| Basketball | `/basketball` | Basketball Discussion Board |
| Baseball | `/baseball` | Baseball Discussion Board |
| LV Basketball | `/lv-basketball` | Lady Vols Basketball Discussion Board |
| LV Softball | `/lv-softball` | Lady Vols Softball Discussion Board |
| Other Sports Recruiting | `/recruiting` | Recruiting Discussion Board |
| Forums | `/forums` | — |
| Other Sports | `/other` | Vol Sports Discussion Board |
| About | `/about` | — |
| Code of Conduct | `/code-of-conduct` | — |
| User Profile | `/profile/:username` | — |
| Admin Dashboard | `/admin` | — (admin only, redirects non-admins) |

Note: `/lady-vols` as a single combined page and a single `/recruiting` page combining football+basketball were **early ideas and are dropped**. Lady Vols is two separate pages (LV Basketball, LV Softball); recruiting is two separate pages (Football Recruiting, Other Sports Recruiting).

---

## 8. GAME STATUS TRANSITIONS (fully automatic)

**Everything on the page now hinges on one unified trigger: scheduled kickoff time.** An earlier version of this table split things across two different moments — a layout switch at "10 minutes before kickoff" and various other thresholds scattered through §9/§12/§13. That's been consolidated: the banner-row swap, the predictions lock, the Layer 3 predictor-window swap, and the Live Gameday Leaderboard's appearance all now fire at the exact same instant.

| Status | Layout | Trigger |
|---|---|---|
| Before kickoff | Non-gameday layout — see §9 Layer 1 (Upcoming Game Card) and Layer 3 (Pregame Predictor active on top, Live Game Predictor waiting on bottom) | CFBD scheduled kickoff time |
| At scheduled kickoff time | Switches to gameday layout in one move: Layer 1 swaps to Live Game Stats Panel; pre-game predictions lock permanently; Layer 3 swaps — Pregame Predictor is removed from the page (its picks remain viewable via the "My Picks" button, §12.2), Live Game Predictor moves to top and becomes active, Live Gameday Leaderboard appears on bottom | Automatic time-based trigger, fires on `kickoff_time` to the second |
| Game live | Full gameday layout, all widgets active | CFBD status = live |
| Game final — TN wins | Fireworks site-wide, leaderboard stays visible | CFBD status = final |
| Game final — TN loses | Leaderboard stays visible, no fireworks | CFBD status = final |
| Midnight after game day | Rolls back to non-gameday layout | Calendar midnight rollover |
| Next game week | Non-gameday with upcoming game card and countdown | CFBD schedule data |

CFBD API polled every 2-3 minutes on game days via a Supabase Edge Function on a `pg_cron` schedule.

**Important — the lock and the layout swap use the scheduled kickoff time, not detected live status.** CFBD's live-status polling (every 2-3 minutes) lags reality by up to a few minutes — games sometimes kick off a little late or a little early relative to the announced time. Locking predictions against *detected* live status instead of the *scheduled* time would open a real fairness gap: a user could submit a pick during that polling lag, after the ball is already in the air. The scheduled kickoff time is known in advance and precise to the second, so all four things above trigger on it. The one piece that's still naturally bound by real-world data speed regardless of trigger choice: the Live Game Predictor's buttons don't have anything to predict until CFBD actually reports the first drive's data, a moment after kickoff — that's inherent to how fast play data arrives, not something a different trigger fixes.

---

## 9. MAIN PAGE (`/`) — SEVEN LAYERS

The prediction engine and live gameday leaderboard live **here only** — never duplicated on the Football page.

An earlier version of this spec described two largely-separate layout structures ("non-gameday" and "gameday"), which had grown a lot of duplicated content between them. Restructured here as **seven layers, stacked top to bottom** — most layers never change regardless of game status; only Layer 1 (via §3, site-wide) and Layer 3 swap their content at kickoff. This is simpler to reason about and simpler to build than maintaining two parallel page structures.

**Layer 1 — Hero Banner + Upcoming Game Card / Live Game Stats Panel.** Site-wide, not Main-Page-specific — see §3 for the full spec. Included here only to show where it sits relative to the rest of the page.

**Layer 2 — Global Header/Nav.** See §4.

**Layer 3 — Vol Discussion Board (left, full column) + a two-window predictor column (right).** This is the layer that changes at kickoff, alongside Layer 1:

- **Before kickoff:** Pregame Predictor (top, open for submission) + Live Game Predictor (bottom, inactive "waiting" state — buttons visible but dimmed, since there's no live game yet to predict).
- **At scheduled kickoff time** (§8): the two windows swap. **Pregame Predictor is removed from the page entirely** — not locked-in-place, not demoted to a smaller summary card, just gone from this position. Live Game Predictor moves to the top and becomes fully active (§12.2). **Live Gameday Leaderboard** (§13) takes the now-empty bottom slot.
- **My Picks button:** small button/badge in the Live Game Predictor's header, present from kickoff onward. Opens a modal (same modal pattern as videos/articles/trivia) showing the user's five pregame prediction fields (§12.1) — read-only. **During the live game**, the modal shows picks only, with a note that the full comparison unlocks once the game ends. **After the game ends**, the same button/modal now also shows the actual result next to each pick, a hit/miss mark per field, and the total pregame points earned. This is how the old "post-game comparison summary" requirement is satisfied now that there's no Pregame Predictor card left on the page to replace in-place.

**The Discussion Board's total height must equal the combined height of whatever two cards are currently stacked in the right column** — Pregame Predictor + Live Game Predictor pre-kickoff, or Live Game Predictor + Live Gameday Leaderboard post-kickoff — bottom-aligning evenly as one balanced row in either state. The chat's internal message list (fixed-height with internal scroll, per §9.1) sizes itself to fill whatever height this equal-height row produces.

**Layer 4 — Daily Evergreen Poll + Daily Vol Trivia, side by side, kept as short as the content allows.** These no longer stack together in the Layer 3 predictor column — they get their own row, and both stay compact per their own component specs (Poll: question + option bars, "See More Polls" button; Trivia: §32's modal-based design — icon, title, "Take Today's Trivia" button in the available state, or score + "Come back tomorrow" + countdown in the completed state).

**Layer 5 — 3×8 Video Grid** (24 cards, curated cross-sport selection — see §17).

**Layer 6 — Vol News Wire (left) + New Threads (center) + Most Popular Threads (right)**, three columns.

**Layer 7 — Last Game Leaders + Season Leaders Football + All-Sport Leaders**, three leaderboard panels.

**Legal footer** (§6, every page, unaffected by any of this).

### 9.1 Component: 24/7 Global Live Chat (Vol Discussion Board)
- Subscribes to `chat_messages` where `room_category = 'main'`
- **Fixed-height message list with internal scroll** — the chat window (and every other Discussion Board instance on sport pages, per §11) must have a fixed, unchanging height regardless of how many messages exist. The message list itself scrolls internally (`overflow-y: auto` on the message container, not the card or the page) — older messages scroll out of view at the top as new ones arrive at the bottom, exactly like Discord/Slack/iMessage. The card's overall height must never grow as messages accumulate. (This was found broken — the card was growing taller with every new message instead of staying fixed, pushing the rest of the page down further and further.)
- **The "Say something..." input is always pinned to the bottom of the card**, regardless of message count — use a flex layout where the scrollable message list fills the remaining space above it (`flex-grow` on the message list, input fixed below it), not positioned directly after the last message's content. There should never be an empty gap between the input and the card's bottom edge, and the input should never float partway up the card when there are few messages.
- Question of the Day bar pinned at top: fetches `questions_of_the_day` where `active_date = TODAY()` (rotates by season on main page — football questions during football season, basketball during basketball season, mixed pools during overlaps)
- New messages auto-scroll to bottom — **within the internal message-list container only**, never the page itself (already fixed once — a regression here should be treated as the same class of bug)
- Username color: deterministic hash of `user_id` → fixed hex color per user, stable across sessions
- Send debounce: 1 message per 3 seconds (frontend enforcement)
- Report button on every chat message
- Ban handling: DB trigger rejects insert → frontend catches exception → freeze input, crimson border, message: "Your chat privileges have been suspended for violating the Code of Conduct."
- Hot streak flame: when `profiles.hot_streak_active = TRUE`, show 🔥 next to that user's name (site-wide, all rooms — subscribe to `profiles` Realtime)
- Message input reclaims focus automatically after send, so a user can type/send repeatedly using only the keyboard

---

## 10. FOOTBALL PAGE (`/football`)

**Deferred for now:** the special 70/30 desktop layout (fixed sidebar + scrollable content column) and a dedicated, expanded in-page Live Game Stats panel originally spec'd for this page are on hold — they'll be reintroduced closer to football season. The *basic* live scoreboard need is already covered without that extra work: since the site-wide Banner+Upcoming Game Card row (§3) swaps to the Live Game Stats Panel on gameday and appears on every page including this one, Football already shows live game status at the top of the page even before the fuller in-page panel is built. For now, the rest of Football uses the exact same shared template as the other sport pages (§11), just filtered to `sport_category = 'football'` / `room_category = 'football'`.

**No predictions or leaderboard on this page** — those live on Main only.

**Stack order (matches §11's shared template):**
1. Football Discussion Board — subscribes to `chat_messages` where `room_category = 'football'`; outbound inserts always set `room_category = 'football'`; all other chat behaviors identical to Main.
2. 3×8 Football Video Grid (`sport_category = 'football'`)
3. 3×10 Football News Grid
4. Three-Window Football Forum Tray: New Threads | Most Popular Threads (48hr default, All Time toggle) | Recruiting Threads

---

## 11. SPORT PAGES (Football, Basketball, Baseball, LV Basketball, LV Softball, Other Sports)

All six use the exact same template component, parameterized by `sport_category`. Stack order:
1. Sport-specific Discussion Board
2. 3×8 Sport Video Grid
3. 3×10 Sport News Grid
4. Three-Window Forum Tray: New Threads | Most Popular Threads | Sport Recruiting Threads

Room categories: `football`, `basketball`, `baseball`, `lv-basketball`, `lv-softball`, `other`.
- **LV Basketball / LV Softball** replace the old single combined "Lady Vols" page and also implicitly cover volleyball discussion where relevant.
- **Other Sports** covers: Soccer, Volleyball, Tennis, Track & Field, Cross Country, Swimming & Diving, Rowing, Golf.
- No prediction widgets on any of these pages at launch (prediction engine is football-only, main-page-only, at launch — see §12).

---

## 12. PREDICTION ENGINE (Main Page only)

Built as a **reusable module** from the start — not hardwired to football — so basketball/baseball prediction engines can be added post-launch without a rewrite. Football-only at launch.

### 12.1 Pre-Game Predictions

**Available:** from game scheduling until **scheduled kickoff time** (§8), then permanently and irreversibly locked. (An earlier version of this spec locked 10 minutes before kickoff — consolidated into the single unified kickoff trigger everything else now uses.)

**Five input fields:**
1. Winner toggle: Tennessee | Opponent
2. Tennessee final score (0-99)
3. Opponent final score (0-99)
4. Tennessee total yards (0-999)
5. Opponent total yards (0-999)

**Scoring (server-side only, PostgreSQL RPC — runs after `live_games.status` → `'final'`):**

| Prediction | Formula | Base Max | Exact-Match Bonus | True Max |
|---|---|---|---|---|
| Winner | Correct = 100, Wrong = 0 | 100 | — | 100 |
| Tennessee score | `MAX(0, 100 - (5 × \|predicted - actual\|))` | 100 | +50 pts if exact | 150 |
| Opponent score | `MAX(0, 100 - (5 × \|predicted - actual\|))` | 100 | +50 pts if exact | 150 |
| Tennessee yards | `MAX(0, 200 - (1 × \|predicted - actual\|))` | 200 | +100 pts if exact | 300 |
| Opponent yards | `MAX(0, 200 - (1 × \|predicted - actual\|))` | 200 | +100 pts if exact | 300 |
| **Maximum total** | | | | **1,000 pts** |

**Tiebreaker for leaderboard rank:** 1) `total_game_points` descending → 2) `home_yards_diff` ascending → 3) `away_yards_diff` ascending.

**? tooltip** on widget header explains all scoring rules, including bonuses, in a popup.

**Countdown lock:** timer = `kickoff_time` (§8 — the unified trigger; no longer offset by 10 minutes). At 0: all fields disabled, read-only, submit hidden, gray lock banner. Irreversible.

Submission stores a row in `pregame_predictions` with no points calculated yet. **At kickoff, this widget is removed from the page entirely** (see §9 Layer 3) — its picks are not left on-page in a locked summary state. Instead, they become viewable through the **"My Picks" button** in the Live Game Predictor's header (§12.2): during the live game, that button opens a modal showing the five picks read-only with a note that comparison unlocks post-game; after `live_games.status` → `'calculated'`, the same button/modal shows each pick against the actual result, a hit/miss mark per field, and the total pregame points earned.

```sql
-- RPC skeleton — complete in edge function
CREATE OR REPLACE FUNCTION public.calculate_pregame_points(p_game_id UUID)
RETURNS VOID AS $$
DECLARE
  game RECORD; pred RECORD;
  w_pts INTEGER; hs_pts INTEGER; as_pts INTEGER; hy_pts INTEGER; ay_pts INTEGER;
  hs_bonus INTEGER; as_bonus INTEGER; hy_bonus INTEGER; ay_bonus INTEGER;
  total INTEGER;
BEGIN
  SELECT * INTO game FROM public.live_games WHERE id = p_game_id;

  FOR pred IN SELECT * FROM public.pregame_predictions WHERE game_id = p_game_id LOOP
    w_pts := CASE
      WHEN pred.predicted_winner = 'home' AND game.home_score > game.away_score THEN 100
      WHEN pred.predicted_winner = 'away' AND game.away_score > game.home_score THEN 100
      ELSE 0
    END;

    hs_pts := GREATEST(0, 100 - (5 * ABS(pred.predicted_home_score - game.home_score)));
    hs_bonus := CASE WHEN pred.predicted_home_score = game.home_score THEN 50 ELSE 0 END;

    as_pts := GREATEST(0, 100 - (5 * ABS(pred.predicted_away_score - game.away_score)));
    as_bonus := CASE WHEN pred.predicted_away_score = game.away_score THEN 50 ELSE 0 END;

    hy_pts := GREATEST(0, 200 - ABS(pred.predicted_home_yards - game.home_total_yards));
    hy_bonus := CASE WHEN pred.predicted_home_yards = game.home_total_yards THEN 100 ELSE 0 END;

    ay_pts := GREATEST(0, 200 - ABS(pred.predicted_away_yards - game.away_total_yards));
    ay_bonus := CASE WHEN pred.predicted_away_yards = game.away_total_yards THEN 100 ELSE 0 END;

    total := w_pts + (hs_pts + hs_bonus) + (as_pts + as_bonus) + (hy_pts + hy_bonus) + (ay_pts + ay_bonus);

    UPDATE public.pregame_predictions SET
      winner_correct       = (w_pts = 100),
      home_score_points    = hs_pts + hs_bonus,
      away_score_points    = as_pts + as_bonus,
      home_yards_points    = hy_pts + hy_bonus,
      away_yards_points    = ay_pts + ay_bonus,
      total_pregame_points = total
    WHERE id = pred.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 12.2 Live Drive Predictions

**Timing:**
- The widget itself is visible from the moment a fan lands on Main (in §9 Layer 3, bottom slot) in an inactive "waiting" state — dimmed buttons, no picks possible — since there's no live game yet to predict.
- **At scheduled kickoff time** (§8, the unified trigger): the widget moves to the top of the Layer 3 predictor column and becomes fully active.
- Once active, prediction windows open per-drive: window opens instantly when the previous drive ends, 60-second countdown begins immediately
- Point values are calculated and **locked** the moment each drive's window opens — never update mid-drive
- At 0 seconds: buttons disabled, 50% opacity, locked badge appears
- Failing to pick in time = wrong answer = streak resets
- The very first drive's prediction becomes available as soon as CFBD reports it after kickoff — there's inherently a short gap between the layout becoming active and real play data arriving, since that depends on CFBD's reporting speed rather than the trigger itself (§8)

**My Picks button:** small button in this widget's header, visible from kickoff onward (once this widget is active and on top of the Layer 3 column). Opens a modal:
- **During the live game:** shows the user's five Pregame Prediction fields (§12.1) — winner, both teams' scores, both teams' total yards — read-only, plus a note that the full comparison unlocks once the game ends.
- **After the game ends** (`live_games.status` → `'calculated'`): same button, same modal, now also shows the actual result next to each of the five picks, a hit/miss indicator per field, and the total pregame points earned. This is the only place the pregame comparison summary appears — there is no separate "locked Pregame Predictor card" left on the page after kickoff (see §9 Layer 3).

**Seven outcome buttons:** `Touchdown | Field Goal | Punt | Turnover | Safety | Turnover on Downs | End of Quarter`

**Point values — 40 to 60 range, independent per button (NOT constrained to sum to 100):**
- Most likely outcome given the current situation = 40 points; least likely = 60 points
- All seven values spread across 40-60 based on situational probability — each button's value is independent of the others
- Situational factors: field position (own 1-20 = punt very likely; red zone = TD/FG likely), score differential (trailing late = more aggressive; big lead = conservative), quarter/clock (end of half = end-of-quarter more likely)
- Values are stored on the drive row and never recalculated client-side

**Button display shows:** outcome name, situational probability %, point value.

**Streak multiplier (consecutive correct picks in one game):**

| Consecutive Correct | Multiplier |
|---|---|
| 1 | 1.00x |
| 2 | 1.25x |
| 3 | 1.50x + 🔥 hot streak activates |
| 4 | 2.00x |
| 5 | 3.00x |
| 6+ | 4.00x |

**Points earned formula (server-side only):** `points_earned = FLOOR(points_possible × multiplier)`

**Streak resets on:** wrong answer OR missed/timed-out pick — no exceptions. `profiles.hot_streak_active` set to `FALSE` on reset.

**? tooltip** on widget header explains scoring rules and shows the multiplier table.

**Drive result mapping (CFBD → prediction outcome):**
```
TD                  → touchdown
FG                  → field_goal
Punt                → punt
Fumble/Interception → turnover
Safety              → safety
Downs               → turnover_on_downs
End of Half/Game/Period → end_of_quarter
```

### 12.3 Leaderboard Update Trigger
Run `calculate_pregame_points()` + tally all `drive_predictions.points_earned` per user → update `game_leaderboard` at:
1. End of each confirmed drive (`status`: `'open'` → `'resolved'`)
2. End of game (`status`: `'final'` → `'calculated'`)

After `'calculated'`: add `total_game_points` to `profiles.points_football` (or relevant sport column) and update `profiles.total_points`.

---

## 13. LIVE GAMEDAY LEADERBOARD (Main Page)

**Position:** takes the bottom slot of the §9 Layer 3 predictor column at scheduled kickoff time, directly below the now-active Live Game Predictor — it is not a separate full-width row further down the page (an earlier version of this spec had it as its own row; consolidated into Layer 3 alongside the predictor-window swap). It occupies the same slot the Pregame Predictor used to sit in before being removed from the page at kickoff.

**Data:** reads `game_leaderboard` for current `game_id`. **Refresh:** only at drive-end and game-end — never continuous polling. **Display:** top 10.

**Visual tiers:** #1 gold crown/border glow/gold username · #2 silver · #3 bronze · #4-5 subtle orange dot · #6-10 clean white, no decoration.

**Animated features:** points tick upward like an odometer (1-2 sec) · movement arrows after each drive (⬆️ green up, ⬇️ red down, ➡️ gray same, fade after 10 sec) · tiebreaker badge (e.g. "Diff: +12 yds").

**Hot streak + crown combo:** if a top-3 player is on a hot streak, add 🔥 both sides of username + flaming animated username + row glow in that rank's color.

**Pinned personal rank row:** if the logged-in user isn't in top 10, a permanently pinned row at the bottom shows their rank/username/points, separated by a faint divider. Disappears once they break into top 10.

---

## 14. HOT STREAK VISUAL EFFECTS

**In live chat (all rooms, site-wide):** 🔥 next to username, warm orange-to-yellow glow on username text, subtle warm-orange chat-bubble border.

**On leaderboard:** 🔥 both sides of username, username animates orange→yellow→deep red in a smooth wave, row gets warm orange border + background glow.

**On user profile:** same full effect as leaderboard, plus a badge in the trophy room for current/past hot streaks.

**At 6+ streak:** effect intensifies — deeper glow, faster animation cycle.

**Activation:** instant on 3rd consecutive correct pick (server-confirmed). **Deactivation:** instant on streak reset — all effects disappear immediately.

---

## 15. TOUCHDOWN VIDEO SYSTEM — NOT BEING BUILT

Not being implemented. On a Tennessee score, the Live Game Stats Panel (§3) simply updates to the new score like any other stat change — no video, no special transition, no skip button. Nothing elsewhere in this spec should reference this system as active; every place that previously assumed it was live has been updated (§8's status table, the Admin Dashboard's content sections, the Phase 1 build checklist, and the post-launch roadmap).

---

## 16. VICTORY FIREWORKS

**Trigger:** CFBD confirms game final AND Tennessee score > opponent score. **Scope:** site-wide, every page simultaneously.

**Experience:** full-screen fireworks animation in Tennessee Orange and White, royalty-free crowd roar audio (not "Rocky Top" — copyright; revisit licensing later), 15-20 seconds, then final-score celebration card + top-3 leaderboard with crowns. Skip button in corner. **Never triggers** on opponent wins or ties.

---

## 17. VIDEO GRIDS (3×8, every page)

- 3 rows × 8 columns = 24 cards, uniform across all pages (Main, Football, every sport page, both recruiting pages). (Reduced from an earlier 3×10/30-card version — fewer, larger cards.)
- Toggle: **Latest Videos** (default — `published_at` within last 14 days, sorted by `published_at` desc; videos older than 14 days auto-drop from this view) | **Most Popular** (`published_at` within last 30 days, sorted by `view_count` desc). This applies to every page (Main, Football, all sport pages, both recruiting pages) — always sort by the video's real YouTube publish date, never by `ingested_at`.
- Cards: larger thumbnail than the previous version (fixed 16:9, increased size to suit the reduced column count), duration pill overlay, title (2-line max, ellipsis), **creator/channel name displayed below the title** (e.g. "A to Z Sports," "Matt Mitchell," "Bluechip Breakdown") — smaller text, Smokey Gray, single line with ellipsis if needed. Shorts and long-form both displayed at uniform 16:9.
- **Ingestion requirement to support the creator-name display**: every video row, regardless of ingestion path (Part A keyword search, Part B/C channel-priority fetch), must capture and store the uploading channel's name in `channel_name` — YouTube's API already returns this (`snippet.channelTitle`) on every search/playlist response at no extra quota cost, so this applies universally, not just to Tier 1/2 priority-channel videos.
- Mobile: dual-column swipeable horizontal carousel
- **Click: opens an embedded modal player** — dark overlay, centered card, YouTube's iframe embed player loads and autoplays the video inline, close button (X) returns to the grid. The viewer never leaves GoVolsGameDay. (Earlier versions of this spec had videos opening in a new YouTube tab — that behavior is replaced by this embedded approach.)
- **Modal sizing: large, theater-style** — width roughly 85vw up to a max-width around 1400px (noticeably larger than a small popup), height locked to a true 16:9 ratio for the video area itself, centered both axes. This is distinct from the smaller news article modal in §18 — video is the primary content being consumed here, so it should feel like a proper viewing experience, not a small preview window.

**Sport pages (Football, Basketball, Baseball, LV Basketball, LV Softball, Other, both Recruiting pages):** grid filters strictly to that page's own `sport_category`, ranked by the Latest/Popular toggle as above. No cross-category mixing — straightforward as originally spec'd.

**Main Page grid is different — a curated channel-priority selection, not a sport-category filter or balance**, since there's no dedicated "main" content being produced. (This replaces both an earlier cross-sport-balance approach and an earlier two-tier/diversity-cap approach from previous revisions of this spec — the model below is final.)

- **Priority channel list (11 channels, no tiers — all treated equally)**: Volquest, Talkin' VAWLS Network, Rocky Top Talk / OffTheHookSports, Locked On Vols, TN Fan Talk, Bluechip Breakdown, Vol Freak, Sports Talk J, Tennessee Football Talk (Chat Sports), Matt Mitchell (SEC Roll Call), SEC Shorts. (WVLT and the official UT Athletics / Vol Network channel were removed from this list and must not be re-added.)
- **Selection rule: the latest 2 videos from each of the 11 priority channels** — flat cap, no ranking between channels beyond each channel's own 2 most recent uploads. 11 channels × 2 = **22 videos maximum** from priority channels.
- **Fallback fills the gap to reach 24**: if fewer than 22 priority-channel videos are available (a channel posted 0 or 1 video recently), general keyword-scraped Tennessee content from Job 1 Part A fills the remaining slots, up to the 24-card total. On a normal week this is roughly 2-3 fallback slots; it can be more on a slow week for the priority channels.
- Within the priority-channel set, display ordering follows the active Latest/Popular toggle, sorted by **`published_at`** (YouTube's real publish date) descending for Latest, or `view_count` descending for Popular — **never sort by `ingested_at`** (scrape time), since videos are fetched channel-by-channel and `ingested_at` will cluster by channel regardless of true recency, producing an incorrect grouped-by-creator appearance even when the underlying selection logic is correct. The "latest 2 per channel" selection rule determines *which* videos qualify; the toggle + `published_at`/`view_count` sort determines *display order* among all qualified videos merged into a single list.
- **This flat 2-per-channel cap supersedes any separate diversity cap** — since no channel can ever contribute more than 2 videos under this rule, a further diversity limit is redundant and not needed.
- **This is Main Page only.** Sport-specific pages (Football, Basketball, Baseball, LV Basketball, LV Softball, Other, both Recruiting pages) are unaffected — they continue filtering strictly to their own `sport_category` via the general keyword-scraped ingestion, exactly as already built. (Extending this same priority-channel model to sport pages, with per-video content classification since these channels cover multiple sports, is a separate deferred item — see §38 Part C.)

---

## 18. NEWS GRIDS (every page)

**Sport-specific pages** (Football, Basketball, Baseball, LV Basketball, LV Softball, Other, both Recruiting pages): 3×10 (30 cards), sorted by **`published_at`** descending (the article's real publish date from its source — never `ingested_at`/scrape time; pinned articles guaranteed placement first — see §29 — remainder filled by normal `published_at` order), reads `scraped_articles` filtered by `sport_category` and `is_hidden = false`.

**Main Page News Wire is different — a cross-sport aggregate feed, not filtered to one `sport_category`.** (This mirrors the same fix already applied to the Main Page Video Grid in §17 — nothing is tagged `sport_category = 'main'` anymore now that every source routes to a real specific sport via §38's priority-source mapping, so filtering Main's feed to that tag would starve it.) Show the **most recent 15 articles across all sport categories combined**, sorted by `published_at` descending, respecting `is_hidden = false` and pinned-article priority per §29.

**Ingestion requirement**: every article, regardless of source or scraping method, must capture and store its real publish date from the source page itself (visible on the article, e.g. a byline timestamp or dateline) into `published_at` — never use the time your system happened to scrape it. Same class of bug already caught and fixed for videos in §40; do not repeat it here.

**Article modal**: click opens an embedded modal, **larger than the previous version** (roughly matching a substantial reading-width card — noticeably bigger than before, though not full theater-size like the video modal in §17, since this is text-based) — thumbnail, full title, and an **improved AI-generated summary** (upgraded from a terse 2-sentence blurb to a more substantive 3-5 sentence summary that actually conveys the article's key points, not just a teaser), plus a "Click to Read More" button that opens the real source article (the individual article URL captured during ingestion, not a homepage) in a new tab.

**Never** navigate away from GoVolsGameDay on article click.

---

## 19. DISCUSSION BOARDS / CHAT SYSTEM — COMPLETE RULES

| Rule | Detail |
|---|---|
| Room isolation | Each page subscribes to exactly one `room_category`. Never cross-contaminate. |
| Insert logic | Client always sets `room_category` on insert (by route), never null, never user-controlled. |
| Real-time | Supabase Realtime channel subscriptions — never polling. |
| Scroll | New message auto-snaps to bottom; old messages roll up. |
| Username color | Deterministic hash of `user_id` → stable hex color per user, same across all sessions. |
| Debounce | Max 1 message per 3 seconds per user (frontend). |
| Report button | On every chat message. |
| Profanity | DB trigger (see §26 schema): Tier 1 casual vulgarities masked with `****`; Tier 3/4 severe terms abort the transaction. |
| Ban | DB trigger rejects insert → frontend catches exception → freeze input, crimson border, message: "Your chat privileges have been suspended for violating the Code of Conduct." |
| Hot streak flame | When `profiles.hot_streak_active = TRUE`, ALL chat rooms site-wide show 🔥 next to that user's name (subscribe to `profiles` Realtime). |
| Question of the Day | Pinned at top of every Discussion Board on non-gameday days; pulls from sport-specific pool based on current page; main page rotates by season, mixing pools during overlaps. |

---

## 20. THREE-WINDOW FORUM TRAY (all sport pages)

| Window | Content | Options |
|---|---|---|
| New Threads | Most recently created threads for that sport | None — always chronological |
| Most Popular | Last 48 hours by view count (default) | Toggle to All Time |
| Recruiting Threads | Most recent activity in that sport's recruiting category | None |

---

## 21. THREAD ROW DISPLAY (forums + forum trays everywhere)

Each row shows: thread title (bold, 2-line max, click routes to page 1) · author username with hot streak flame + hover card · relative creation timestamp · clickable page-number pills · category tag pill · reply count · view count · most recent reply timestamp · most recent replier username (hover card) + avatar thumbnail (small circle, far right) · Hot Thread badge 🔥 (>1,000 views/24hr) · Going Viral badge (>10,000 views/24hr).

---

## 22. USERNAME HOVER CARD

Appears on hover (300ms delay, desktop) or tap-and-hold (mobile) over any username site-wide. Never appears on your own username.

**Shows:** avatar/initials circle, username (bold), custom tagline, hometown (respects privacy toggle), member-since date, last-seen timestamp, total forum messages, total forum reactions received (sums across all 8 reaction types in §23 — not a single "like" type), total points balance + trophy icon, current hot streak indicator, most prestigious badge, most-active sport, Follow button (others) / Edit Profile (own), Ignore button.

---

## 23. FORUMS PAGE (`/forums`)

**11 sub-categories:** General | Football | Football Recruiting | Basketball | Basketball Recruiting | Baseball | Lady Vol Basketball | Lady Vol Softball | Other Sports | Other Recruiting | Tickets

**Layout:** grid of 11 category windows, each showing the 10 newest threads.

**Thread creation:**
- "Create New Forum" button pinned at top; each category window also has a `+` button that pre-selects that category
- Title: max 50 chars with live countdown
- Body: unlimited, drag-and-drop video/GIF/image inline embedding
- Profanity filter applies to all content — on violation: freeze modal, red highlight on body, error message
- Thread page always loads at Page 1; comment input pinned to bottom
- Thread creation increments `profiles.threads_created_count`; each reply increments `profiles.threads_replied_count` — both via backend trigger, never frontend

**Post reactions (8 total):**

| Reaction | Emoji | Label |
|---|---|---|
| Vol Love | 🧡 | "Vol Love" |
| Fire Take | 🔥 | "Fire" |
| Facts | 💯 | "Facts" |
| Funny | 😂 | "Funny" |
| Disagree | 👎 | "Nope" |
| What Are You Drinking | 🍺 | "What Are You Drinking?" |
| Big Brain | 🧠 | "Big Brain" |
| Too Real | 💔 | "Too Real" |

**Threshold effect:** 10+ 🍺 reactions on one post → "Questionable Take 🍺" badge on the thread row.

**Post action buttons:** Report | Quote | Reply | Reactions (8-picker) | Edit (own posts only, unlimited) | Share.

**Left sidebar per post:** larger avatar, username + hot streak flame, custom tagline, member-since date, message count, reactions received (sums across all 8 reaction types, not a single "like" type — label reads "Reactions," not "Likes"), total points balance, most prestigious badge icon, favorite sport indicator.

---

## 24. FOOTBALL RECRUITING PAGE (`/football-recruiting`)

Full consolidated layout — one page, all sections as windows (no recruiting calendar — removed from spec):
1. Header Stats Bar — class year selector, national rank, SEC rank, total commits, average stars, industry comparison toggle, last-updated timestamp
2. Class Rankings Banner — 247Sports and On3 national/SEC rank side by side
3. Live Commit Tracker — commits, decommits, portal activity (orange/red highlights)
4. Tabbed Prospect Database — HS Commits | Transfer Portal | Targets | Roster — filterable by position, stars, class year, status
5. Player Rankings Module — sortable by composite, 247Sports, On3, position ranking
6. Team Rankings Comparison — Tennessee vs. SEC rivals
7. Class Year Tabs for historical browsing
8. Football Recruiting Discussion Board
9. 3×8 Recruiting Video Grid — `sport_category = 'football-recruiting'` (a distinct category from the Other Sports Recruiting page's — the two pages must never share the same tag, or content bleeds between them)
10. 3×10 Recruiting News Grid — same `'football-recruiting'` category
11. Three-Window Forum Tray

Star ratings always show both 247Sports and On3 labels — never hide attribution. Data via Firecrawl scraping 247Sports/On3 twice daily.

---

## 25. OTHER SPORTS RECRUITING PAGE (`/recruiting`)

**Note: "Tier 1"/"Tier 2" are internal spec terminology only — do not render these labels anywhere in the actual UI.** Section headers should just name the sport directly (e.g. "Men's Basketball — Class Rankings," "Baseball Recruiting," etc.), with no visible "Tier 1"/"Tier 2" text on the page itself. **The section grouping LV Basketball/Baseball/LV Softball together should be labeled "Other Sports Recruiting" — not "Olympic Sports Recruiting" or any other variant.**

**Men's Basketball (full treatment, mirrors Football Recruiting minus calendar):** Class Rankings Banner (247Sports/On3 national+SEC rank), Live Commit Tracker, Tabbed Prospect Database (HS Commits/Transfer Portal/Targets/Roster), Player Rankings Module, Team Rankings Comparison vs. SEC rivals, Class Year Tabs.

**LV Basketball, Baseball, LV Softball (minimal treatment, identical format across all three):** Class Rankings Banner (national team ranking only), Simple Prospect List (name, position, hometown, star rating, status, date), Class Year Tabs.

**Page footer:** dedicated Recruiting Discussion Board, 3×8 Recruiting Video Grid — `sport_category = 'other-recruiting'` (a distinct category from the Football Recruiting page's `'football-recruiting'` — the two pages must never share the same tag, or content bleeds between them, which is what happened previously when both pages were set to a single shared `'recruiting'` value), 3×10 Recruiting News Grid — same `'other-recruiting'` category, Three-Window Forum Tray.

---

## 26. ABOUT PAGE (`/about`)

Layout: hero banner, centered minimal content, no widgets or chat.

**Approved mission statement:**

> Watching a Vols game with other fans used to mean refreshing a forum thread, typing out what just happened, and hoping someone replies before the next play snaps. GoVolsGameDay was built to fix that.
>
> Turn on the game, pull up GoVolsGameDay, and experience it together in real time — live chat that moves as fast as the action, automatic scores and stats that update themselves, and a drive-by-drive prediction game that turns every single play into something worth paying attention to. No more typing play-by-play updates by hand. No more scattered conversations across five different threads. Just you, the game, and thousands of other Vol fans experiencing it together exactly as it happens.
>
> GoVolsGameDay is also your one-stop shop for everything Tennessee Volunteers. Video highlights, breaking news, recruiting updates, and community discussion across every Vol sport — football, basketball, baseball, and Lady Vols — all gathered in one place so you never have to go hunting across a dozen different sites again.
>
> We're an independent, fan-built community — not affiliated with the University of Tennessee or UT Athletics. Just a better way to follow Tennessee athletics, built by fans who wanted exactly that.
>
> If you can't be there, be here.

**Contact form:** Email (required, private, never displayed), Subject (required), Message (required, large textarea). Submits via a Supabase Edge Function that relays to admin email (e.g. via Resend or another email API). Success confirmation replaces the form on submit. No phone/email/physical address displayed anywhere on the page.

---

## 27. CODE OF CONDUCT PAGE (`/code-of-conduct`)

Linked from About page and site footer. Sections: 1) Our Commitment · 2) Expected Behavior · 3) Prohibited Behavior (hate speech, harassment, threats, doxxing, sexual content especially involving minors, spam, impersonation, excessive profanity) · 4) Enforcement (plain-language version of §28 tables) · 5) Appeals (via Contact form, reviewed individually).

---

## 28. CONTENT MODERATION SYSTEM

**Offense tiers (fully automated):**

| Tier | Examples | Response | Strike |
|---|---|---|---|
| 1 — Mild | Casual cursing | Word masked with `****` | No |
| 2 — Moderate | Harassment, spam, personal insults | Message blocked, user notified | 1 |
| 3 — Severe | Hate speech, slurs, threats, doxxing, sexual content | Message blocked, immediate 7-day suspension, urgent admin flag | 2 |
| 4 — Critical | Repeat Tier 3, illegal content, credible threats | Immediate permanent ban | Permanent |

**Strike consequences:** 1 = warning + 24hr posting freeze · 2 = 7-day freeze · 3 = 30-day freeze · 4 = permanent ban.

**Implementation:** `bad_words_filter` table for Tier 1 (masks with `****`); separate severe keyword list for Tier 3/4 (blocks + triggers suspension). Both apply to chat AND forum posts. Report button on every chat message and forum post. All enforcement via database triggers — zero human moderators required. Admin dashboard shows reported-posts queue with Dismiss/Delete/Warn/Strike/Ban actions.

---

## 29. ADMIN DASHBOARD (`/admin`)

**Access:** only `profiles.is_admin = TRUE`, set manually via SQL post-launch. Route never reveals itself to non-admins — immediate redirect to home.

**Navigation:** simple left sidebar; landing page is always Reported Posts.

**Sections:** Reported Posts Queue (newest first, full actions) · User Management (search, view, adjust strikes, ban/unban) · Bad Words Filter (add/remove) · Content Moderation (review Sightengine-flagged images) · **Scraped Content Review** (see below) · Question of the Day (schedule/manage rotation) · Game Management (manual override of game status if CFBD has issues) · Ban Log (full history) · Data Sync Health (last-successful-run timestamp + 🟢/🔴 status per job: YouTube ingestion, News ingestion, Recruiting sync, CFBD live feed).

**Scraped Content Review:** since automated relevance filters (§38) can't be perfect, this section lets an admin quickly hide or delete individual rows from `scraped_videos` and `scraped_articles` that slipped through irrelevant or off-topic — e.g. a video that matched a search query by a person's name but isn't actually Tennessee-related content. Simple list view (most recent first) with a hide/delete action per row; hidden items stop appearing in the Video Grid/News Wire immediately without needing to wait for or adjust the ingestion filter logic itself.

**Delete is permanent — it must survive re-scraping, not just remove the row.** An earlier version of this only removed the row from `scraped_videos`/`scraped_articles`, which meant the next ingestion run (Job 1/Job 2, §38) — having no record that this specific video/article was ever rejected — would simply re-discover and re-insert the exact same content on its next pass, since upserts match on the content's own ID/URL and a deleted row leaves no conflict to match against. **Delete must also write to a permanent blocklist that ingestion checks before inserting anything new** — see `content_blocklist` in the schema (§40) for the table definition.

When an admin clicks **Delete** (not Hide — Hide stays exactly as it is today, a reversible `is_hidden = TRUE` toggle with no blocklist entry): (1) insert a row into `content_blocklist` with the video's ID or the article's normalized URL, (2) then delete the row from `scraped_videos`/`scraped_articles` as before. **Both Job 1 (YouTube ingestion) and Job 2 (news ingestion) must check `content_blocklist` before every upsert** — if the candidate video's ID or the candidate article's normalized URL matches an existing blocklist row, skip it entirely, don't insert or upsert it. This makes delete genuinely permanent: the content can never reappear through automated ingestion again, regardless of how many future scrape runs search for it. (The "Add Video"/"Add Article" tools below are a manual admin action, not automated ingestion, so they intentionally bypass the blocklist check — if an admin manually pastes a URL that happens to match a blocklisted item, that's a deliberate override, not a bug.)

**Pinning a video:** every row in the Scraped Content Review list — whether it arrived via automated ingestion or was manually added — has a **Pin/Unpin toggle** alongside the existing hide/delete actions. A pinned video is guaranteed to display on its assigned page's Video Grid, bypassing the normal 24-card selection/ranking/channel-priority/diversity-cap logic entirely (§17) — it doesn't count against the per-channel diversity cap either, since an admin explicitly chose it. **Pinning does not grant indefinite life** — a pinned video still expires on the normal 14-day Latest-view cutoff like any other video, unless the admin unpins it (returning it to normal ranking rules) or deletes it outright before then. So pinning guarantees placement for the remainder of that video's natural 14-day window, not forever.

**Manually adding a video:** the same panel includes an "Add Video" tool — paste a YouTube URL, the system extracts the video ID and calls the YouTube Data API's single-video lookup endpoint (cheap, not a search call) to fetch its real metadata (title, thumbnail, duration, channel name, publish date), then the admin selects which page's `sport_category` it should appear under and submits. The video is inserted into `scraped_videos` with `is_pinned = TRUE` by default (same expiry rules as above apply — 14 days unless unpinned/deleted first).

**Pinning and manually adding an article** works the same way, applied to `scraped_articles`: a **Pin/Unpin toggle** on every article row (automated or manually added), plus an "Add Article" tool — paste an article URL, Firecrawl scrapes it for title/thumbnail/source, an LLM generates the same 2-sentence summary used by normal ingestion (§38 Job 2), the admin selects the target page's `sport_category`, and it's inserted with `is_pinned = TRUE`. **Pinned articles now expire after 14 days, matching videos — or until the admin deletes/unpins them early, whichever comes first.** (An earlier version of this spec had pinned articles stay pinned indefinitely with no expiry at all, reasoning that News Grids have no time-based cutoff the way video's "Latest" view does. That's been changed to match videos' behavior for consistency. Since articles genuinely have no existing 14-day window to fall back into the way videos do, this requires a small dedicated mechanism rather than just removing an exception: `scraped_articles` needs a `pin_expires_at` column, set to `NOW() + INTERVAL '14 days'` whenever an article is pinned — either via "Add Article" or the manual Pin toggle on an existing row. The News Grid query's guaranteed-placement logic for pinned articles must check `is_pinned = TRUE AND pin_expires_at > NOW()`; once `pin_expires_at` passes, the article automatically falls back to normal ingestion-date sorting like any other article — the row and its content aren't deleted, it just loses guaranteed placement, exactly like an expired pinned video.) Pinned, non-expired articles are guaranteed placement in their page's News Grid regardless of normal ingestion-date sorting.

Admin notification: red badge on header avatar showing open-report count. Mobile-friendly for on-the-go moderation.

---

## 30. USER PROFILE PAGE (`/profile/:username`)

Public — viewable by clicking any username anywhere on the site.

**Header:** cover/banner photo (user-uploaded), large overlapping avatar, username + hot streak flame, custom tagline, hometown (privacy toggle), member-since + last-seen, most prestigious badge, follower/following count (privacy toggle), Follow button (others) / Edit Profile + Account Settings (own).

**Stats bar:** total cumulative points (privacy toggle), threads created, threads replied, forum reactions received (sums across all 8 reaction types in §23), site-wide rank if applicable.

**Point ledger:** breakdown by sport, visual bar/chart, privacy toggle.

**Digital Trophy Room:** earned badges grid; locked/greyed badges shown as future goals.

**Prediction history:** game-by-game log, privacy toggle. **Recent activity feed:** recent posts/threads, privacy toggle.

**Privacy settings (default: all visible, opt-out model):** hide hometown, hide point ledger, hide prediction history, hide recent activity, hide follower/following counts.

**Following system:** one-directional (Twitter/X style), no approval needed, `user_follows` table. Following Feed is a **post-launch (Phase 2+)** enhancement, not a launch requirement.

**Avatar/banner upload:** JPG/PNG/GIF, runs through Sightengine moderation before going live. Fallback: Tennessee Orange circle with initials.

---

## 31. BADGE SYSTEM

68 total badges, all awarded automatically via server-side database triggers/PostgreSQL functions — zero manual awarding. Full list of the 52 additional badges is in `VGD_Additional_Badges.md`; the original 16 launch badges (Gameday Prediction Track + Forum Interaction Track) are specified below with exact trigger logic.

**Visual tiers:** standard badges display normally; legendary badges (The Oracle, Iron Man, Perfect Saturday, Living Legend, Vol Scholar, Trivia Iron Man) get a gold/rainbow shimmer effect.

**Display:** trophy room on profile page, flair icon next to username in chats/forum feeds, 🔥 hot streak icon (most prominent, pulses orange), hover card shows most prestigious badge.

**Build order:** launch with the original 16 badges below; add the remaining 52 progressively once the core platform is stable.

### Gameday Prediction Track (13 badges)
| Badge Key | Trigger |
|---|---|
| `picked_the_winner` | `pregame_predictions.winner_correct = TRUE` after game |
| `perfect_point_predictor` | `home_score_points` includes the +50 exact bonus AND `away_score_points` includes the +50 exact bonus |
| `perfect_yardage_predictor` | `home_yards_points` includes the +100 exact bonus AND `away_yards_points` includes the +100 exact bonus |
| `hot_streak_3` | 3 consecutive correct drive picks in one game |
| `hot_streak_4` | 4 consecutive correct drive picks in one game |
| `hot_streak_5` | 5 consecutive correct drive picks in one game |
| `hot_streak_6_plus` | 6+ consecutive correct drive picks in one game |
| `gameday_top_10` | user ranks in top 10 of `game_leaderboard` at game end |
| `gameday_winner` | user rank = 1 on `game_leaderboard` at game end |
| `season_top_10` | user's sport-specific points in top 10 site-wide at season end |
| `season_champion` | user's sport-specific points = #1 site-wide at season end |
| `all_sport_top_10` | `total_points` in top 10 site-wide at year end |
| `all_sport_champion` | `total_points` = #1 site-wide at year end |

### Forum Interaction Track (3 badges)
| Badge Key | Trigger |
|---|---|
| `new_thread_created` | First row inserted to `forum_threads` by user |
| `hot_thread` | Any user's thread reaches >1,000 views within 24 hours |
| `going_viral_thread` | Any user's thread reaches >10,000 views within 24 hours |

---

## 32. DAILY VOL TRIVIA

**Layout: modal popup, not an inline expanding block.** The "Today's Trivia" card stays compact on the Main Page at all times (icon, title, brief description, the "Take Today's Trivia" button) — clicking it opens the entire quiz experience in a modal overlay, matching the same dark-overlay/centered-card treatment already established for the video player (§17) and news article (§18) modals, so the page itself never grows tall or pushes other content down. **Both the 5-question quiz flow and the results screen render inside this same modal** — closing the modal (X button) at any point returns to the compact card on the page underneath. (This replaces an earlier version of this spec where the quiz and results rendered inline on the page itself, expanding it significantly — that's been changed based on how it looked in practice.)

**Format:** one session per user per day, 5 questions one at a time inside the modal, 12-second countdown per question (prominent, orange), answer locks immediately on click (no takebacks), question dissolves → next appears, no going back once answered/timed out, timeout = 0 points + auto-advance.

**Difficulty progression:** Q1 Easy → Q2 Easy/Medium → Q3 Medium → Q4 Medium/Hard → Q5 Hard.

**Scoring:** escalating by question position — a correct answer is worth **10 / 15 / 20 / 25 / 30 pts for questions 1–5 respectively** (rewards the harder later questions); wrong/timeout = 0. Max 100/day (10+15+20+25+30 = 100, so the daily ceiling is unchanged). Points go into `profiles.points_trivia`, count toward `total_points` for the All-Sport leaderboard.

**Results screen (inside the same modal):** all 5 questions with correct answers revealed, user's score, "Better than X% of fans today," points-added animation, four share buttons (📢 Post to Vol Discussion Board | 📘 Facebook | 🐦 X/Twitter | 📋 Copy to Clipboard).

**Compact card states (on the page, not the modal):** available = "Take Today's Trivia" (orange button, opens modal); completed = "You scored X/100 — Come back tomorrow" with midnight countdown shown directly on the card (clicking a completed card can optionally reopen the modal to review the results screen again, rather than replaying the quiz).

**Question scope:** Vol-specific and SEC-conference-level only — NEVER rival-team-specific (OK: "Who won the 2018 SEC Championship game?" — NOT OK: "Who was Alabama's starting QB in 2018?"). Gut check: "Would a knowledgeable Vol fan know this?"

**Categories:** Vol Football History, Vol Basketball History, Vol Baseball History, Lady Vols History, General Vol Athletics, SEC Knowledge.

**Content-quality status (current — production-ready, replaces an earlier filtered-subset approach):** the trivia database has been through a complete rewrite and fact-check pass, documented in full in `VGD_Trivia_Questions_FULLY_REVISED.md`. Every one of the 1,000 questions was reviewed individually: hedge/non-answers marked "correct" (e.g. "specifics vary by year") were replaced with single defensible facts; meta-commentary and visible first-draft reasoning bleeding into question text was removed; self-eliminating or self-referential distractors were rewritten; and load-bearing claims (dates, scores, draft positions, award years, coaching tenures) were fact-checked against university athletics sites, Wikipedia, and contemporary press coverage. This pass also corrected a number of outright errors carried over from the original draft — among them: A.J. Burnett was never a Tennessee baseball player (he was drafted by the Mets out of high school and never played college ball); the checkerboard end zones trace to Doug Dickey in 1964, not Johnny Majors or Bowden Wyatt; the QB who won the 2022 Orange Bowl was Joe Milton III, not the already-injured Hendon Hooker; John Henderson won the Outland Trophy in 2000, not 2001; and "Rocky Top" is Tennessee's beloved unofficial anthem, not its official fight song ("Down the Field" holds that title). **As of this revision, 0 questions remain flagged across all 1,000 questions** (300 Football / 200 Basketball / 150 Baseball / 150 Lady Vols / 100 General Vol Athletics / 100 SEC Knowledge, each split Easy/Medium/Hard). Load all 1,000 into `trivia_questions` with sequential `scheduled_date` assignments — 5 questions/day = **~200 days of rotation**, shuffled so categories don't cluster. This database is production-ready; there is no longer an open item gating the Daily Trivia build.

**Fully automated** once the database is loaded (it is — see above). Resets at midnight. **Query pattern**: `SELECT * FROM trivia_questions WHERE scheduled_date = TODAY() ORDER BY slot ASC` returns that day's 5 questions in the correct Easy→Hard order via the `slot` column (1-5).

---

## 33. DAILY EVERGREEN POLL

**Placement:** Layer 4 (§9) — paired side by side with Daily Vol Trivia in their own row below the Discussion Board/Predictor row (Layer 3), not stacked with anything else. Both cards match each other's height so the row reads as one balanced pair, matching Trivia's existing compact treatment rather than expanding to fill extra space.

One poll per day, pre-loaded database rotates automatically via `active_date` (no cron job needed — every row has a unique pre-assigned date; `WHERE active_date = CURRENT_DATE` handles rotation on its own). Question + 4 options, one vote per user per day (locked after voting). Database: `VGD_Daily_Polls.md` — 200 pre-loaded, fact-checked questions (80 Football, 50 Basketball, 40 Baseball, 30 Lady Vols).

**Visual design — validated via mockup, build to this exactly:**
- Card header, matching the site's standard card-header pattern used elsewhere (Discussion Board, Trivia, etc.): small orange dot + "DAILY POLL" label, uppercase, letter-spaced, muted color.
- Question text directly below the header — one line, medium weight, ~14px.
- **Not-yet-voted state:** the 4 options render as plain bordered rows — 1px border (muted/neutral, not orange), ~8px corner radius, comfortable padding, plain text, no percentages shown yet. Each row is clickable.
- **Already-voted state (today):** the same 4 rows now show live results as horizontal fill bars:
  - Every row keeps its bordered-rectangle shape, but now has a background fill whose width equals that option's vote percentage (an absolutely-positioned fill layer behind the text, not a separate progress-bar element).
  - All 4 rows use identical styling — same muted border, same dark fill color, same text color for the percentage. **No option is specially highlighted** — not the leading option, not the option the user personally picked. No orange border, no checkmark, no bolding to distinguish any single row from the others. The percentage numbers alone convey the result; the visual treatment stays uniform across all four.
  - Once voted, all 4 rows are no longer clickable — voting is locked for that poll.
- **Below the 4 rows, small and muted:** "Yesterday: X% said [winning option's text]" — computed from yesterday's poll_id's vote distribution. If there's no poll from yesterday (e.g. the very first day live), omit this line entirely rather than showing an error or empty space.
- **"See More Polls" button:** per §34, opens the Fan Polls list. Fan Polls isn't built yet (separate future feature) — for now, render this button disabled or omit it entirely rather than linking to a page that doesn't exist yet.

---

## 34. FAN POLLS (user-created)

Any registered user can create a standalone poll: title (max 100 chars), 2-4 options (max 50 chars each), duration (24hr/48hr/7 days). Goes live immediately, same profanity filter as chat/forums.

**Fan Polls list ("See More Polls"):** all active polls sorted by popularity (default); toggle Most Popular 24hrs | Newest | All Time; "Create a Poll" button at top; each shows title/creator/vote count/time remaining; click to vote and see results; share buttons (Discussion Board | Facebook | X | Copy to Clipboard); report button on every poll.

**Main page widget:** top 3 most active polls + "See All Fan Polls" button. **Points:** none — purely engagement.

---

## 34A. ANALYTICS & TRACKING

Google Analytics (GA4) is installed site-wide from launch — free, standard, and foundational to every monetization decision downstream (§35-37), since ad revenue, sponsorship pitches, and premium-tier timing all depend on knowing real traffic and engagement numbers rather than guessing.

**Track at minimum:**
- Page views per route (which pages/sports draw the most traffic)
- Video modal opens (§17) — a custom event, since embedding a video doesn't generate revenue for GoVolsGameDay directly (any ads inside YouTube's embedded player pay the video's creator/YouTube, not GoVolsGameDay), so this is purely an engagement signal, not a revenue source. Track it anyway — it's a strong proxy for which content and which priority channels actually drive interest, useful for deciding what to keep prioritizing in §17's channel list.
- News article modal opens (§18)
- Outbound Fan Shop affiliate link clicks (§4) — this is the one category of click that directly ties to revenue, so it deserves accurate tracking above all else
- Sign-up conversions (auth modal completions)
- Session duration and pages-per-session

**Honest framing on video engagement specifically:** video plays are a traffic/retention signal (longer sessions, more page views, more impressions on the site's own ad zones) — not a direct revenue source. Don't build anything that tries to monetize the embedded player itself (e.g. overlaying ads on it) — that violates YouTube's embed terms and risks losing the embed feature entirely. The actual profit levers are the existing monetization layers in §35-37; analytics exists to inform *when* to activate them and *which content* is worth doubling down on.

---

## 35. AD PLACEMENT STRATEGY

**Protected zones — never any ads:** Discussion Board panel (§9 Layer 3), Live Game Stats Panel (§3 Layer 1 — no longer physically adjacent to the Discussion Board now that Layer 2's header sits between them, but still fully protected), the Layer 3 predictor column (whichever pair is currently showing — Pregame Predictor + Live Game Predictor pre-kickoff, or Live Game Predictor + Live Gameday Leaderboard post-kickoff) and the gap between those two stacked cards.

**Approved zones:** between Layer 3 (Discussion Board/predictors) and Layer 4 (Poll + Trivia), between Layer 4 and Layer 5 (video grid), between Layer 5 and Layer 6 (news/forum row), between Layer 6 and Layer 7 (bottom leaderboards), above legal footer, vertical sidebar columns on wide desktop (unused space only, never displaces content).

**Gameday vs. non-gameday:** heavier presence during gameday traffic peaks, lighter on non-gameday.

**Implementation:** build empty, properly-sized ad slot containers in these zones from day one. Drop Google AdSense or direct sponsor code in later without layout restructuring.

**Premium members:** `is_premium = TRUE` → ad slots do not render (dormant flag, already architected).

---

## 36. PREMIUM / MEMBERSHIP (dormant at launch)

`is_premium` boolean on `profiles` — exists, all users free at launch. Every component that respects premium status checks this flag conditionally from day one. No Stripe integration, no payment UI, no members-only content at launch. Planned perks when activated: ad-free experience, members-only discussion board, premium visual flair (neon chat color, exclusive badge flairs).

---

## 37. MONETIZATION LAYER (build last)

| Trigger | Revenue Type | Implementation |
|---|---|---|
| Day 1 | Affiliate links | Tracked Amazon/Fanatics links in nav Fan Shop, news modals, video descriptions |
| 10k+ monthly views | Programmatic ads | Google AdSense in approved zones from §35 |
| 50k+ monthly views | Premium subscriptions | `is_premium` flag; $4.99/mo Stripe; ad-free UI, neon chat color, exclusive badges |
| 100k+ monthly views | Direct sponsorships | Fixed banner slots on Football and Recruiting pages; flat monthly rate to local Knoxville businesses |

---

## 38. AUTOMATION — SUPABASE EDGE FUNCTIONS + PG_CRON

All automation runs on **Supabase Edge Functions** (Deno/TypeScript), triggered either by **`pg_cron`** (scheduled jobs, built into every Supabase project at every tier — no extra service, no extra monthly cost) or **Database Webhooks** (event-triggered, e.g. on a new Storage upload or a row update). Make.com was an earlier idea and has been dropped — it added a $9/month recurring cost and a second platform for no functional benefit once the logic lives in code Bolt already writes and maintains.

**Pattern for every scheduled job:** write the logic as an Edge Function → deploy it → register a `pg_cron` job that calls it via `pg_net` HTTP POST on the required schedule, authenticated with the service role key (stored in Supabase Vault, never client-side). Firecrawl free tier may work initially for scraping-based jobs; monitor credit usage.

**Job 1 — YouTube Video Ingestion** (`pg_cron`, 2×/day, 6AM + 6PM EST):

**Part A — Sport-specific keyword search** (unchanged mechanism, feeds sport pages and Tier 3 of the Main Page):

| Page | Search Queries |
|---|---|
| Main/Home (Tier 3 fallback only — see Part B) | "Tennessee Volunteers 2026", "Tennessee Vols highlights" |
| Football | "Tennessee Vols football", "Tennessee Football highlights", "Josh Heupel" — exclude basketball/baseball |
| Basketball | "Tennessee Vols basketball", "Rick Barnes Tennessee" — exclude football/baseball |
| Baseball | "Tennessee Vols baseball", "Lindsey Nelson Stadium" — coach-name queries should reflect current staff; a departed coach's name (e.g. searching a former coach who has since moved to another program) tends to surface off-topic results about their new team rather than Tennessee content |
| LV Basketball | "Lady Vols basketball", "Kim Caldwell press conference" |
| LV Softball | "Lady Vols softball", "Tennessee softball SEC" |
| Football Recruiting | "Tennessee football recruiting", "Tennessee Vols commitment" — tag `sport_category = 'football-recruiting'` |
| Other Sports Recruiting | "Tennessee basketball recruiting", "Tennessee baseball recruiting", "Lady Vols recruiting" — tag `sport_category = 'other-recruiting'` |
| Other Sports | "Tennessee Volunteers soccer", "Tennessee Vols track", "Tennessee Volunteers volleyball" |

Edge Function calls the YouTube Data API v3 (`YOUTUBE_API_KEY`) for each query → applies quality filters: minimum view-count threshold, channel allowlist favoring official UT Athletics + major sports media, title keyword exclusion list rejecting unrelated team names unless Tennessee is also mentioned, must be published within last 14 days for Latest view, **plus a two-factor relevance check** (replaces an earlier, looser single-keyword check that let through off-topic matches — e.g. Tennessee Titans NFL content, cross-sport content, and in at least one case a completely unrelated international soccer video):

1. **Team-identity requirement**: title or description must contain "Vols," "Volunteers," or "Lady Vols" — **plain "Tennessee" alone no longer qualifies**, since it's too broad and matches the Tennessee Titans (NFL), Tennessee the state generally, and other unrelated Tennessee-based teams/topics.
2. **Sport-context requirement**: title or description must also contain at least one term matching that page's actual sport, so cross-sport leakage (e.g. a basketball video appearing on the Football page) is rejected even if it passes the team-identity check:
   - Football: "football," "Heupel," "Neyland," "SEC football," or similar football-specific terms
   - Basketball: "basketball," "hoops," "Barnes," or similar
   - Baseball: "baseball," "Lindsey Nelson," or similar
   - LV Basketball: "basketball," "Caldwell," or similar
   - LV Softball: "softball" or similar
   - Recruiting: "recruiting," "commit," "signee," or similar
   - Other Sports: the specific sport name (soccer, volleyball, tennis, track, cross country, swimming, rowing, golf)
3. **Explicit exclusion regardless of the above**: reject if the title/description matches an unrelated pro sports team by name (e.g. "Titans," "Grizzlies," "Predators") unless "Vols" or "Volunteers" is also clearly present as the subject (e.g. covering a former Vol's pro career is fine; general NFL/NBA/NHL content that merely happens to be Tennessee-based is not).

If a candidate video fails either factor, it's rejected — this is intentionally strict, since false negatives (missing a borderline-relevant video) are far less costly than false positives (off-topic content appearing on the live site). Upserts passing all checks go into `scraped_videos` with the matching `sport_category` tag and `channel_priority = NULL` (general/Tier 3). Note: YouTube's Search API has a limited free daily quota and search calls are quota-expensive — monitor usage in Google Cloud Console, especially with 8 pages × 2 runs/day. Since no automated filter is perfect, the Admin Dashboard's Scraped Content Review (§29) is the backstop for anything that still slips through.

**Part B — Channel-priority fetch for the Main Page (§17)**: rather than keyword search, this pulls the latest uploads directly from a fixed list of 11 specific channel IDs, using YouTube's "uploads playlist" endpoint for each channel (more reliable and quota-cheaper per-channel than repeated search queries). Look up and store each channel's ID once (channels are identified by handle/URL, e.g. `@Volquest`, resolved to a channel ID via the API's channel-lookup endpoint), then fetch each channel's recent uploads on every run.

- **Priority channels** (`channel_priority = 1`, all treated equally, no tiers): Volquest, Talkin' VAWLS Network, Rocky Top Talk / OffTheHookSports, Locked On Vols, TN Fan Talk, Bluechip Breakdown, Vol Freak, Sports Talk J, Tennessee Football Talk (Chat Sports), Matt Mitchell (SEC Roll Call), SEC Shorts.
- **Take each channel's latest 2 uploads only** — this is a hard cap per channel, not a ranking preference (see §17's finalized selection model). Videos from these channels skip the keyword-relevance requirement from Part A, since being from a trusted, purpose-built channel is itself sufficient relevance signal — SEC Roll Call and SEC Shorts in particular may cover multiple SEC teams, so their videos should still be reasonably Tennessee-relevant (title/thumbnail mentions Tennessee/Vols, or it's understood these channels are being pulled for their Tennessee-specific content specifically).
- Upserts into `scraped_videos` with `sport_category = 'main'`, `channel_priority = 1`, and `channel_name` set to the source channel.

**Part C — Extending channel-priority fetch to sport-specific pages, with per-video content classification (deferred item)**: the same 11 priority channels from Part B are reused to also feed the individual sport pages (§11) — but since most of these channels cover multiple sports (e.g. Volquest posts both football and basketball content), a video is **not** assigned to a sport page by which channel it came from. Instead, each fetched video is run through the sport-context check from Part A's two-factor filter **against each of the six sport categories in turn**, and placed into whichever category (or categories) it actually matches based on its title/description content. A single channel's uploads can and will land on multiple different sport pages depending on what each individual video is actually about.

- This supplements — doesn't replace — the existing keyword-search ingestion (Part A) for each sport page, which remains the fallback for any content this channel-based fetch doesn't cover.
- **LV Basketball and LV Softball have no known dedicated content creators at this time**, unlike Football/Basketball/Baseball which are well-covered by the Tier 1/Tier 2 channel list. These two categories will likely and legitimately show noticeably lower video volume than the other sport pages — this is an accurate reflection of the current sports-media landscape, not a filter bug to keep chasing. If dedicated Lady Vols channels are identified later, add them to the Tier 1/Tier 2 list and they'll flow through this same mechanism automatically.
- Priority/display ordering on sport pages (not just Main) should favor `channel_priority IS NOT NULL` (Tier 1/2) videos over `channel_priority IS NULL` (general keyword-scraped) ones, same principle as the Main Page, though without Main's specific tier-cap/diversity-cap mechanics — sport pages are single-category, not cross-sport curation, so a simpler "priority channels first, keyword-scraped fills remaining slots" ordering is sufficient.


**Job 2 — News Article Ingestion** (`pg_cron`, 2×/day, 6AM + 6PM EST):

**Critical architecture fix — two-step scraping, not single-page scraping.** An earlier version of this job scraped only each source's top-level page and treated the whole page as one "article" — this produced garbage results like an entry titled "TENNESSEE VOLUNTEERS | News, Scores, Highlights, Stats, Standings, and Rumors | Bleacher Report," which is just that site's homepage title, not a real story. Every source, priority or general, must use this two-step process instead:
1. **Crawl the section/list page** (Firecrawl) to extract a list of individual recent article URLs
2. **Scrape each individual article URL separately** to pull that specific article's real headline, thumbnail, and body content
3. LLM generates the 2-sentence summary from the real article body (not from a homepage/section page)
4. Upsert into `scraped_articles` with the correct `sport_category`, `source_name`, and the real individual article's `source_url` (so "Click to Read More" actually opens that specific story, not the site's homepage)

**Priority sources with confirmed per-sport section URLs** (direct `sport_category` tagging — no content-classification guessing needed, since the URL itself tells you the sport, mirroring Job 1's channel-priority model):

| Source | Football | Basketball | Baseball | Lady Vols | Recruiting |
|---|---|---|---|---|---|
| VolsWire (usatoday.com) | `volswire.usatoday.com/football/` | `volswire.usatoday.com/basketball/` | `volswire.usatoday.com/baseball/` | `volswire.usatoday.com/lady-vols/` | (check for a dedicated section; use general feed + content classification if none exists) |
| Rocky Top Insider | `rockytopinsider.com/category/football/` | `rockytopinsider.com/category/basketball/` | *(unconfirmed — likely `/category/baseball/`, verify before relying on it)* | *(unconfirmed — likely a Lady Vols or women's-basketball category, verify)* | *(unconfirmed, verify)* |
| Rocky Top Talk | `rockytoptalk.com/tennessee_volunteer_football` | *(unconfirmed — likely `/tennessee_volunteer_basketball`, verify)* | *(unconfirmed — likely `/tennessee_volunteers_baseball`, verify)* | *(unconfirmed — likely `/lady_vols_basketball`, verify)* | *(unconfirmed — likely `/tennessee_volunteers_recruiting`, verify)* |
| 247Sports Tennessee | `247sports.com/college/tennessee/news/?sport=football` | `247sports.com/college/tennessee/news/?sport=basketball` | *(unconfirmed — likely the same pattern with `?sport=baseball`, verify)* | *(unconfirmed — 247Sports may use `?sport=softball` or a separate women's basketball query, verify)* | *(likely a separate Recruiting tab rather than a `?sport=` query — verify actual URL)* |
| AllForTennessee.com | `allfortennessee.com/vols-football/` | `allfortennessee.com/vols-basketball/` | *(unconfirmed — likely `/vols-baseball/`, verify)* | `allfortennessee.com/vols-basketball/vols-womens-basketball/` | Football: `allfortennessee.com/vols-football/vols-football-recruiting/` — Basketball: `allfortennessee.com/vols-basketball/vols-basketball-recruiting/` (this source splits recruiting by sport rather than one combined page — more specific than the others) |
| AllForTennessee.com | `allfortennessee.com/vols-football/` | `allfortennessee.com/vols-basketball/` | *(unconfirmed — no confirmed baseball section, verify)* | `allfortennessee.com/vols-basketball/vols-womens-basketball/` (basketball only — no confirmed softball section) | Split per-sport, not combined: football recruiting at `allfortennessee.com/vols-football/vols-football-recruiting/`, basketball recruiting at `allfortennessee.com/vols-basketball/vols-basketball-recruiting/` |

For any unconfirmed URL above: attempt the pattern shown, verify the page actually loads and contains real sport-specific content before relying on it in production, and fall back to that source's general feed + content-based classification (same method as Part B below) for that specific sport if the guessed URL doesn't resolve.

**On3 Tennessee and utsports.com — a third pattern, label-based tagging**: two sources provide combined feeds that are already reliably labeled by sport per article, so neither needs a per-sport URL split (Part A) or full content classification (Part B) — just parse the visible label during the list-scrape step.

- **On3**: `on3.com/teams/tennessee-volunteers/news/` — each article is pre-labeled by contributing source + sport (e.g. "Volquest Basketball," "Volquest Football," "Volquest Baseball"). Match on the sport keyword within the label.
- **utsports.com**: `utsports.com/sports/football/archives` (the Story Archives page — despite the football-specific URL path, the "All Sports" filter on this page surfaces articles across every sport) — this is a structured table with an explicit **SPORT column/badge per row** (Football, Baseball, Men's Golf, Men's Basketball, Softball, General, etc.), even more reliable than On3's inline label since it's a dedicated field, not text to parse out of a longer label. Read the SPORT badge directly for `sport_category`; a row with multiple sport badges (e.g. both "Football" and "Softball" on one story) should be upserted once per matching `sport_category` if genuinely relevant to both, or assigned to the more specific/primary badge if one is clearly the main subject.

For both: cheaper and more reliable than content classification, since the site itself is already telling you the sport.

**Bleacher Report Tennessee Vols — removed from the source list.** Its Tennessee page is itself an aggregator, re-publishing headlines already sourced from Rocky Top Insider, AllForTennessee, and others (visible in its own bylines, e.g. "www.rockytopinsider.com," "allfortennessee.com"). Scraping it would just re-scrape the same original articles through a middleman, creating duplicates — better to source directly.

**With Bleacher Report removed, all remaining sources now have a confirmed, reliable sport-tagging method** — none currently require the fallback full-content-classification approach. That mechanism (team-identity + sport-context two-factor check, same as Job 1 Part A) stays documented and ready in case a future source needs it, but nothing in the current list actually uses it.

**Job 3 — Recruiting Data Sync** (`pg_cron`, 1×/day, 2AM EST):

**Initial scoped implementation** (deliberately narrower than the eventual full system — expand later once this works):
- **Source: 247Sports only** — On3 is deferred to a later pass, to avoid debugging two extraction sources simultaneously.
- **Sport: Football only** — other sports' recruiting sync is deferred to a later pass.
- **Class year: current cycle only** (2027 as of this writing) — historical backfill deferred.

**Confirmed URL**: `247sports.com/college/tennessee/season/{class_year}-football/commits/` (e.g. `247sports.com/college/tennessee/season/2027-football/commits/` for the current cycle — swap the year to extend to other classes later).

**Extraction method**: Firecrawl scrapes the page into markdown → an LLM call (same pattern already used for article summarization in Job 2) extracts structured fields from the markdown rather than relying on brittle CSS-selector scraping, since that breaks if the site's HTML structure changes — an LLM parsing markdown into structured JSON is more resilient. Extract per recruit: full name, position, hometown/high school, star rating (247Sports), national rank, commitment date, status (committed/decommitted). UPSERT into `recruits` (match on `full_name` + `scouting_year`), leaving `stars_on3` null for now. Also compute and UPSERT into `recruiting_class_rankings`: total commit count, average stars, and the class's 247Sports national/SEC rank if visible on the page — leave `rank_on3` null for now.

**Future expansion** (not part of this initial pass): add On3 as a second source using the confirmed URL `on3.com/college/tennessee-volunteers-24635/football/{class_year}/commits/`, following the same Firecrawl-scrape-then-LLM-extract pattern, populating the `stars_on3`/`rank_on3` fields that are left null today. Then extend to other sports (basketball, baseball, LV basketball, LV softball) and additional class years.

**Job 4 — CFBD Live Game Feed** (`pg_cron`, every 2-3 min on game days only — schedule can be conditionally active or simply check `live_games` for any row with `status IN ('pregame','live')` and no-op otherwise): `GET /games`, `/live/plays`, `/drives`, `/games/teams`, `/scoreboard` → updates `live_games` (via the same `SECURITY DEFINER` RPC pattern used by the admin test panel, not a raw insert) → Supabase Realtime propagates the change → frontend reacts.

**Job 5 — Rewards Fulfillment** (Database Webhook, not scheduled): fires on `live_games` UPDATE where `status` changes to `'calculated'` → Edge Function queries `game_leaderboard` rank 1 for that game → gets email from `profiles` → sends prize notification via an email API (e.g. Resend or Supabase's built-in email) — $50 UT Sports Store gift card per game; $200 season champion; $500 all-sport champion.

**Job 6 — Image Moderation** (Database Webhook on Storage upload, not scheduled): fires on new upload to forum attachments / avatars / banners buckets → Edge Function calls Sightengine API (`SIGHTENGINE_API_USER`/`SIGHTENGINE_API_SECRET`) → unsafe: delete asset + `profiles.moderation_strikes += 1`; safe: allow.

**Job 7 — Trivia Rotation** (`pg_cron`, midnight UTC): marks today's 5 questions active, archives yesterday's.

**Job 8 — Poll Rotation** (`pg_cron`, midnight UTC): advances `daily_polls.active_date`, resets vote counts.

**Job 9 — Badge Evaluator** (Database Webhook on `live_games` reaching `'calculated'`, not scheduled): checks all badge triggers, inserts new `user_badges` rows.

**Data Sync Health monitoring:** each job updates `last_successful_run` in `system_health` on completion; admin dashboard shows 🟢 Healthy / 🔴 Stalled (stalled = expected update window passed without a successful run). Since there's no separate platform to send a failure alert, a `pg_cron` job checking for stalled jobs and emailing the owner (via the same email API as Job 5) covers the same need Make.com's monitoring would have.

---

## 39. CFBD API INTEGRATION

Base URL: `https://api.collegefootballdata.com` — Auth: `Authorization: Bearer {CFBD_API_KEY}` on every request.

| Data needed | Endpoint |
|---|---|
| Game schedule/kickoff | `GET /games?year={yr}&team=Tennessee` |
| Live scoreboard | `GET /live/plays?gameId={id}` |
| Drive data | `GET /drives?seasonType=regular&year={yr}&team=Tennessee` |
| Team stats | `GET /games/teams?gameId={id}` |
| Box score/yards | `GET /games/teams?gameId={id}` |

### CFBD Field Mappings → UI

| CFBD field | UI element |
|---|---|
| `possession` | Ball possession indicator |
| `down`, `distance`, `yardline` | Down-and-distance strip |
| `period` | Quarter indicator |
| `clock` | Game clock |
| `offense_score`, `defense_score` | Scoreboard |
| `totalYards` | Team Performance Grid |
| `passingYards`, `rushingYards` | Passing/Rushing split |
| `thirdDownConversions` | 3rd-down efficiency % |
| `turnovers` | Turnover count (bold red if >0) |
| `penalties` | Penalty yards |
| `drive_result` | Maps to prediction outcomes (see §12.2) |

---

## 40. SUPABASE SCHEMA (execute in SQL editor — exact, complete, final)

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. USER PROFILES
-- =============================================
CREATE TABLE public.profiles (
  id                       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username                 VARCHAR(50) UNIQUE NOT NULL,
  username_is_default      BOOLEAN DEFAULT FALSE, -- TRUE only for auto-generated OAuth usernames pending user selection (see §5)
  avatar_url               TEXT,
  cover_photo_url          TEXT,
  tagline                  VARCHAR(100),
  hometown                 VARCHAR(100),
  threads_created_count    INTEGER DEFAULT 0,
  threads_replied_count    INTEGER DEFAULT 0,
  points_football          INTEGER DEFAULT 0,
  points_basketball        INTEGER DEFAULT 0,
  points_baseball          INTEGER DEFAULT 0,
  points_lady_vol          INTEGER DEFAULT 0,
  points_trivia            INTEGER DEFAULT 0,
  total_points             INTEGER DEFAULT 0,
  trivia_streak_current    INTEGER DEFAULT 0,
  trivia_streak_best       INTEGER DEFAULT 0,
  moderation_strikes       INTEGER DEFAULT 0,
  is_banned                BOOLEAN DEFAULT FALSE,
  ban_reason               TEXT,
  is_premium               BOOLEAN DEFAULT FALSE,
  is_admin                 BOOLEAN DEFAULT FALSE,
  hot_streak_active        BOOLEAN DEFAULT FALSE,
  current_streak_count     INTEGER DEFAULT 0,
  follower_count           INTEGER DEFAULT 0,
  following_count          INTEGER DEFAULT 0,
  privacy_hide_hometown     BOOLEAN DEFAULT FALSE,
  privacy_hide_points       BOOLEAN DEFAULT FALSE,
  privacy_hide_predictions  BOOLEAN DEFAULT FALSE,
  privacy_hide_activity     BOOLEAN DEFAULT FALSE,
  privacy_hide_followers    BOOLEAN DEFAULT FALSE,
  created_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'VolFan_' || substring(uuid_generate_v4()::text, 1, 8)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================
-- 2. CHAT MESSAGES
-- =============================================
CREATE TABLE public.chat_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  username       VARCHAR(50) NOT NULL,
  message_text   TEXT NOT NULL,
  room_category  VARCHAR(50) DEFAULT 'main',
  -- valid values: 'main','football','basketball','baseball','lv-basketball','lv-softball','other','recruiting'
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
CREATE INDEX idx_chat_messages_room_time ON public.chat_messages(room_category, created_at DESC);


-- =============================================
-- 3. PROFANITY / CONTENT FILTER
-- =============================================
CREATE TABLE public.bad_words_filter (
  id           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  blocked_word VARCHAR(100) UNIQUE NOT NULL,
  severity     VARCHAR(20) DEFAULT 'tier1' -- 'tier1' (mask) | 'tier3' (block+suspend)
);

CREATE OR REPLACE FUNCTION public.clean_and_verify_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  word_record  RECORD;
  user_banned  BOOLEAN;
BEGIN
  SELECT is_banned INTO user_banned FROM public.profiles WHERE id = NEW.user_id;
  IF user_banned = TRUE THEN
    RAISE EXCEPTION 'Your chat privileges have been suspended for violating the Code of Conduct.';
  END IF;
  FOR word_record IN SELECT blocked_word, severity FROM public.bad_words_filter LOOP
    IF NEW.message_text ILIKE '%' || word_record.blocked_word || '%' THEN
      IF word_record.severity = 'tier3' THEN
        UPDATE public.profiles SET moderation_strikes = moderation_strikes + 2 WHERE id = NEW.user_id;
        RAISE EXCEPTION 'Your submission was rejected for violating the Code of Conduct.';
      ELSE
        NEW.message_text := REGEXP_REPLACE(NEW.message_text, word_record.blocked_word, '****', 'gi');
      END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER chat_moderation_trigger
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.clean_and_verify_chat_message();


-- =============================================
-- 4. QUESTION OF THE DAY (discussion board prompts)
-- =============================================
CREATE TABLE public.questions_of_the_day (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question       TEXT NOT NULL,
  sport_category VARCHAR(50) NOT NULL, -- 'football'|'basketball'|'baseball'|'lady-vols'
  active_date    DATE,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- =============================================
-- 5. SCRAPED VIDEOS
-- =============================================
CREATE TABLE public.scraped_videos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  thumbnail_url   TEXT NOT NULL,
  video_url       TEXT NOT NULL,
  duration        VARCHAR(20),
  view_count      BIGINT DEFAULT 0,
  sport_category  VARCHAR(50) NOT NULL,
  channel_name    TEXT,              -- source channel, e.g. 'Volquest', 'SEC Shorts'
  channel_priority INTEGER,          -- 1 = priority channel (see §17's full list), NULL = general/scraped fallback — see §17
  is_hidden       BOOLEAN DEFAULT FALSE, -- admin-set via Scraped Content Review (§29); public queries must filter WHERE is_hidden = false
  is_pinned       BOOLEAN DEFAULT FALSE, -- admin toggle via Scraped Content Review (§29), on any video; guarantees grid placement but still subject to the normal 14-day expiry unless unpinned/deleted first
  published_at    TIMESTAMP WITH TIME ZONE, -- YouTube's real publish date (snippet.publishedAt from the API) — REQUIRED for all "Latest" sorting/filtering. Never sort the public-facing grid by ingested_at (scrape time), since videos are ingested in per-channel batches and ingested_at will cluster by channel regardless of true recency, producing incorrect grouped-looking results.
  ingested_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- internal bookkeeping only (when the scrape happened) — do not use for site-facing recency sorting
);

CREATE INDEX idx_videos_sport_published ON public.scraped_videos(sport_category, published_at DESC);
CREATE INDEX idx_videos_sport_views ON public.scraped_videos(sport_category, view_count DESC);
CREATE INDEX idx_videos_main_priority ON public.scraped_videos(channel_priority, ingested_at DESC) WHERE sport_category = 'main';


-- =============================================
-- 6. SCRAPED ARTICLES
-- =============================================
CREATE TABLE public.scraped_articles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  summary         TEXT NOT NULL,
  source_name     VARCHAR(100),
  source_url      TEXT NOT NULL,
  thumbnail_url   TEXT,
  sport_category  VARCHAR(50) NOT NULL,
  is_hidden       BOOLEAN DEFAULT FALSE, -- admin-set via Scraped Content Review (§29); public queries must filter WHERE is_hidden = false
  is_pinned       BOOLEAN DEFAULT FALSE, -- admin toggle via Scraped Content Review (§29), on any article; guarantees News Grid placement while pin_expires_at is in the future
  pin_expires_at  TIMESTAMP WITH TIME ZONE, -- set to NOW() + 14 days whenever is_pinned is set TRUE (via Add Article or the manual Pin toggle); NULL when not pinned. Guaranteed-placement queries must check is_pinned = TRUE AND pin_expires_at > NOW() — once expired, falls back to normal published_at sorting like any other article.
  published_at    TIMESTAMP WITH TIME ZONE, -- the article's REAL publish date/timestamp from its source page — REQUIRED for all sorting. Never sort by ingested_at (scrape time); same class of bug already caught and fixed for scraped_videos.
  ingested_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- internal bookkeeping only (when the scrape happened) — do not use for site-facing recency sorting
);

CREATE INDEX idx_articles_sport_published ON public.scraped_articles(sport_category, published_at DESC);


-- =============================================
-- 7. RECRUITS
-- =============================================
CREATE TABLE public.recruits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT NOT NULL,
  hometown        TEXT,
  position        VARCHAR(50),
  sport_category  VARCHAR(20) NOT NULL, -- 'football'|'basketball'|'baseball'|'lv-basketball'|'lv-softball'
  scouting_year   INT NOT NULL,
  stars_247       INTEGER,
  stars_on3       INTEGER,
  national_rank   INTEGER,
  status          VARCHAR(50), -- 'target','committed','portal', etc.
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.recruits;


-- =============================================
-- 8. RECRUITING CLASS RANKINGS
-- =============================================
CREATE TABLE public.recruiting_class_rankings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_category  VARCHAR(50) NOT NULL,
  scouting_year   INT NOT NULL,
  rank_247        INTEGER,
  rank_on3        INTEGER, -- nullable — On3 sourcing is deferred in the initial Job 3 implementation (247Sports only, see §38)
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.recruiting_class_rankings;


-- =============================================
-- 9. LIVE GAMES
-- =============================================
CREATE TABLE public.live_games (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cfbd_game_id      BIGINT UNIQUE NOT NULL,
  sport             VARCHAR(20) NOT NULL DEFAULT 'football',
  home_team         TEXT NOT NULL,
  away_team         TEXT NOT NULL,
  kickoff_time      TIMESTAMP WITH TIME ZONE NOT NULL,
  status            VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled'|'pregame'|'live'|'final'|'calculated'
  home_score        INTEGER DEFAULT 0,
  away_score        INTEGER DEFAULT 0,
  home_total_yards  INTEGER,
  away_total_yards  INTEGER,
  current_quarter   INTEGER,
  game_clock        TEXT,
  possession        TEXT,
  down              INTEGER,
  distance          INTEGER,
  yardline          INTEGER,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_games;


-- =============================================
-- 10. PRE-GAME PREDICTIONS
-- =============================================
CREATE TABLE public.pregame_predictions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id              UUID REFERENCES public.live_games(id) ON DELETE CASCADE,
  user_id              UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  predicted_winner     TEXT NOT NULL, -- 'home'|'away'
  predicted_home_score INTEGER NOT NULL,
  predicted_away_score INTEGER NOT NULL,
  predicted_home_yards INTEGER NOT NULL,
  predicted_away_yards INTEGER NOT NULL,
  winner_correct       BOOLEAN,
  home_score_points    INTEGER,  -- includes +50 exact bonus if applicable
  away_score_points    INTEGER,  -- includes +50 exact bonus if applicable
  home_yards_points    INTEGER,  -- includes +100 exact bonus if applicable
  away_yards_points    INTEGER,  -- includes +100 exact bonus if applicable
  total_pregame_points INTEGER,
  submitted_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, user_id)
);


-- =============================================
-- 11. DRIVE PREDICTIONS
-- =============================================
CREATE TABLE public.drive_predictions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id         UUID REFERENCES public.live_games(id) ON DELETE CASCADE,
  drive_number    INTEGER NOT NULL,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  cfbd_drive_id   TEXT,
  prediction      VARCHAR(30) NOT NULL,
  -- 'touchdown'|'field_goal'|'punt'|'turnover'|'safety'|'turnover_on_downs'|'end_of_quarter'
  points_possible INTEGER NOT NULL, -- 40-60, independent per button, set by server
  actual_outcome  VARCHAR(30),
  correct         BOOLEAN,
  multiplier      NUMERIC(4,2),     -- 1.00|1.25|1.50|2.00|3.00|4.00
  points_earned   INTEGER,          -- FLOOR(points_possible * multiplier) — server only
  status          VARCHAR(20) DEFAULT 'open', -- 'open'|'locked'|'resolved'
  submitted_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, drive_number, user_id)
);


-- =============================================
-- 12. GAME LEADERBOARD (materialized per game)
-- =============================================
CREATE TABLE public.game_leaderboard (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id             UUID REFERENCES public.live_games(id) ON DELETE CASCADE,
  user_id             UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  username            VARCHAR(50) NOT NULL,
  total_drive_points  INTEGER DEFAULT 0,
  pregame_points      INTEGER DEFAULT 0,
  total_game_points   INTEGER DEFAULT 0,
  home_yards_diff     INTEGER,
  away_yards_diff     INTEGER,
  rank                INTEGER,
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, user_id)
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.game_leaderboard;


-- =============================================
-- 13. BADGES / ACHIEVEMENTS
-- =============================================
CREATE TABLE public.user_badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_key   VARCHAR(80) NOT NULL, -- see §31 and VGD_Additional_Badges.md
  awarded_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_key)
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges;


-- =============================================
-- 14. FORUM THREADS (native Supabase — NOT XenForo)
-- =============================================
CREATE TABLE public.forum_threads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  username        VARCHAR(50),
  title           TEXT NOT NULL,
  body            TEXT,
  category        VARCHAR(50) NOT NULL,
  -- 'general'|'football'|'football_recruiting'|'basketball'|'basketball_recruiting'
  -- |'baseball'|'lady_vol_basketball'|'lady_vol_softball'|'other_sports'
  -- |'other_recruiting'|'tickets'
  reply_count     INTEGER DEFAULT 0,
  view_count      INTEGER DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_forum_threads_category_newest  ON public.forum_threads(category, created_at DESC);
CREATE INDEX idx_forum_threads_category_hot     ON public.forum_threads(category, view_count DESC, last_active_at DESC);
CREATE INDEX idx_forum_threads_category_popular ON public.forum_threads(category, view_count DESC);


-- =============================================
-- 15. FORUM POSTS (replies within a thread)
-- =============================================
CREATE TABLE public.forum_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       UUID REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  username        VARCHAR(50),
  body            TEXT NOT NULL,
  quoted_post_id  UUID REFERENCES public.forum_posts(id) ON DELETE SET NULL,
  edited_at       TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_forum_posts_thread ON public.forum_posts(thread_id, created_at ASC);


-- =============================================
-- 16. FORUM REACTIONS
-- =============================================
CREATE TABLE public.forum_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction    VARCHAR(20) NOT NULL,
  -- 'vol_love'|'fire'|'facts'|'funny'|'disagree'|'beer'|'big_brain'|'too_real'
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id, reaction)
);


-- =============================================
-- 17. DAILY TRIVIA
-- =============================================
CREATE TABLE public.trivia_questions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question         TEXT NOT NULL,
  option_a         TEXT NOT NULL,
  option_b         TEXT NOT NULL,
  option_c         TEXT NOT NULL,
  option_d         TEXT NOT NULL,
  correct_answer   CHAR(1) NOT NULL, -- 'A'|'B'|'C'|'D'
  difficulty       VARCHAR(20) NOT NULL, -- 'easy'|'medium'|'hard'
  category         VARCHAR(50) NOT NULL,
  scheduled_date   DATE NOT NULL,
  slot             INTEGER NOT NULL, -- 1-5, position within that day's 5-question set (Q1 Easy, Q2 Easy/Medium, Q3 Medium, Q4 Medium/Hard, Q5 Hard per §32)
  UNIQUE (scheduled_date, slot) -- exactly 5 rows per date, one per slot — the original UNIQUE(scheduled_date) alone was a bug, allowing only 1 question per day total
);

CREATE TABLE public.user_trivia_responses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  trivia_date         DATE NOT NULL,
  score               INTEGER NOT NULL DEFAULT 0,
  answers             JSONB,
  completed_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  time_taken_seconds  INTEGER,
  UNIQUE(user_id, trivia_date)
);


-- =============================================
-- 18. POLLS
-- =============================================
CREATE TABLE public.daily_polls (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question      TEXT NOT NULL,
  option_a      TEXT NOT NULL,
  option_b      TEXT NOT NULL,
  option_c      TEXT,
  option_d      TEXT,
  active_date   DATE UNIQUE NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.user_poll_responses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  poll_id          UUID REFERENCES public.daily_polls(id) ON DELETE CASCADE,
  selected_option  CHAR(1) NOT NULL,
  responded_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, poll_id)
);

CREATE TABLE public.fan_polls (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  question       TEXT NOT NULL,
  option_a       TEXT NOT NULL,
  option_b       TEXT NOT NULL,
  option_c       TEXT,
  option_d       TEXT,
  duration_hours INTEGER NOT NULL DEFAULT 24,
  closes_at      TIMESTAMP WITH TIME ZONE NOT NULL,
  vote_count     INTEGER DEFAULT 0,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.fan_poll_votes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id          UUID REFERENCES public.fan_polls(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  selected_option  CHAR(1) NOT NULL,
  voted_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);


-- =============================================
-- 19. FOLLOWING SYSTEM
-- =============================================
CREATE TABLE public.user_follows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);


-- =============================================
-- 20. CONTENT BLOCKLIST (permanent delete for scraped content)
-- =============================================
CREATE TABLE public.content_blocklist (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type  TEXT NOT NULL CHECK (content_type IN ('video','article')),
  external_id   TEXT NOT NULL, -- YouTube video ID for videos; normalized article URL (query params stripped) for articles
  blocked_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  blocked_by    UUID REFERENCES public.profiles(id),
  UNIQUE(content_type, external_id)
);

CREATE INDEX idx_blocklist_lookup ON public.content_blocklist(content_type, external_id);


-- =============================================
-- 21. REPORTS (chat + forum)
-- =============================================
CREATE TABLE public.reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_type   VARCHAR(20) NOT NULL, -- 'chat_message'|'forum_post'|'forum_thread'|'fan_poll'
  target_id     UUID NOT NULL,
  reason        TEXT,
  status        VARCHAR(20) DEFAULT 'open', -- 'open'|'dismissed'|'deleted'|'warned'|'struck'|'banned'
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at   TIMESTAMP WITH TIME ZONE
);


-- =============================================
-- 22. SYSTEM HEALTH MONITORING
-- =============================================
CREATE TABLE public.system_health (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name           VARCHAR(100) NOT NULL UNIQUE,
  -- '247sports_scrape'|'on3_scrape'|'youtube_ingestion'|'news_ingestion'|'cfbd_live_feed'
  last_successful_run   TIMESTAMP WITH TIME ZONE,
  status                VARCHAR(20) DEFAULT 'unknown' -- 'healthy'|'stalled'|'unknown'
);
```

### Row-Level Security (general rules)
- `profiles`: read all rows; update only own row.
- `chat_messages`: authenticated insert; all read.
- `pregame_predictions` / `drive_predictions`: authenticated insert own row; read own row only until game is `calculated`, then public read.
- `game_leaderboard`, `user_badges`: read-only for all; writes only via server/edge functions or triggers.
- `forum_threads`, `forum_posts`, `forum_reactions`: read all; authenticated insert.
- `daily_polls`, `fan_polls`, `trivia_questions`: public read; writes via admin/server only (except `fan_polls` insert, which is authenticated-user).
- `reports`: authenticated insert; read/update restricted to `is_admin = TRUE`.
- `system_health`: read restricted to `is_admin = TRUE`; writes via server/Edge Functions only (service role).
- `bad_words_filter`: `SELECT` restricted to `is_admin = TRUE` only. Never expose the blocked-word list to non-admin users — doing so would let people craft messages that evade the tier-1 mask. Writes (add/remove words) also admin-only, via the Admin Dashboard (§29).
- `content_blocklist`: no public read at all — this is an internal ingestion-check table, not user-facing data. `SELECT` restricted to `is_admin = TRUE` (so the Admin Dashboard can display it if needed) plus the service role (so Job 1/Job 2 Edge Functions can check it during ingestion). Writes admin-only, via the Scraped Content Review delete action (§29).
- `user_trivia_responses`: `SELECT` restricted to the owner's own rows only. The "Better than X% of fans today" stat on the trivia results screen (§32) requires an aggregate calculation across all users' same-day scores — this must be computed by a dedicated server-side RPC (`SECURITY DEFINER`, follows the zero-client-side-math rule in §0/§41) that returns only the calling user's percentile, not raw access to other users' rows.

---

## 41. FRONTEND RULES (NON-NEGOTIABLE)

1. **Never calculate points.** Never write arithmetic for predictions or multipliers in React/TypeScript. Read server-returned values only.
2. **Never show drive results until `status != 'open'`.** Check before rendering any outcome data.
3. **Never set `room_category` based on user input.** Always set programmatically based on current page route.
4. **Never assume ban status client-side.** Only the DB trigger's error response is authoritative.
5. **Article clicks never redirect the current page.** Always open external links in a new tab.
6. **Thread links always route to page 1** of that thread.
7. **Leaderboard fetches only on drive-end and game-end events.** No interval polling.
8. **All form submissions that touch predictions go through Supabase RPC**, not direct table inserts where avoidable.
9. **Countdown timers use server-provided `kickoff_time`**, not client system clock alone. Sync to UTC.
10. **Premium UI changes** (`is_premium = TRUE`): ad-free layout, neon chat text color, exclusive badge flairs — applied via CSS class on body/component when the profile flag is true.
11. **Never build any XenForo integration** — forums are native Supabase tables only.
12. **Drive button point values are independent** — never enforce or assume they sum to 100.
13. **Pre-game predictions and the live drive/leaderboard widgets render on the Main page only** — never duplicate them on the Football page or any sport page.
14. **Every route change scrolls to the top of the page.** React Router doesn't do this automatically — navigating to a new page (via nav links, thread links, "Back to Forums," etc.) must reset scroll position to top, not preserve the previous page's scroll position. This was found broken on the Recruiting pages but is a site-wide requirement, not page-specific.

---

## 42. PHASED BUILD ORDER

**Phase 1 — Core Platform (must be ready for kickoff):**
1. Global layout shell — header, footer, auth modal, color tokens, routing scaffold, **site-wide Hero Banner + Upcoming Game Card row (§3) — built once here since it appears on every page, not per-page**
2. Supabase setup — run full schema SQL (§40), enable RLS and Realtime on required tables
3. Auth flow — Google SSO + credential login, profile auto-creation trigger, session management
4. Main page — seven-layer structure (§9), Discussion Board, CFBD integration (Upcoming Game Card itself lives in the global shell per item 1, not built here)
5. Football page — shared sport-page template (Discussion Board, Video Grid, News Grid, Forum Tray); expanded in-page Live Game Stats panel and special 70/30 layout deferred until closer to football season (basic live status already covered by the global Banner+Game Card row)
6. Pregame Predictor widget — form, countdown lock at scheduled kickoff time (§8, no longer offset by 10 min), submission to Supabase, removed from the page at kickoff (picks then live behind the "My Picks" button, item 7)
7. Live Game Predictor widget — 7 buttons, server-set independent 40-60 point values, 60-second countdown lock, visible-but-inactive pre-kickoff then swaps to top of the Layer 3 column and activates at kickoff; include the "My Picks" button/modal (§12.2)
8. Point calculation RPCs — pregame (with exact-match bonuses) + drive (server only)
9. Live leaderboard — top 10, crowns, flames, movement arrows, odometer animation
10. Hot streak flame logic — profile Realtime subscription, CSS effects site-wide
11. Original 16 badge triggers
12. Victory fireworks — site-wide trigger, crowd roar audio
13. Code of Conduct, About, Contact form

**Phase 2 — Supporting Content (early August):**
14. Basketball, Baseball, LV Basketball, LV Softball, Other Sports pages (template, parameterized)
15. Football Recruiting page — full consolidated layout
16. Other Sports Recruiting page (tiered)
17. Forums page — 11 categories, 8 reactions, thread creation
18. Daily Trivia system — widget, countdown, results screen, share buttons (content database is production-ready — see §32 — no longer a QA gate)
19. Daily Evergreen Poll widget
20. Fan Polls system
21. Automation setup — all 9 Edge Functions + `pg_cron`/webhook triggers (§38)

**Phase 3 — Polish (mid-to-late August):**
22. User Profile page — full layout, privacy controls, following system
23. Admin dashboard — all sections including Data Sync Health
24. Additional badge triggers (remaining 52 badges)
25. Ad slot placeholders
26. Fan Shop affiliate link integration
27. Open Graph social sharing meta tags
28. Mobile optimization pass

**Post-launch (during season):** Following Feed, Basketball/Baseball prediction engines, Premium membership tier, Rocky Top licensing (if revenue justifies).

---

## 43. OPERATING COST REFERENCE

| Period | Monthly Cost |
|---|---|
| Off-season (Jan-Aug) | ~$45/month |
| In-season (Sep-Dec) | ~$164/month |

Note: these figures are reduced from earlier estimates (~$54 / ~$173) by dropping Make.com's ~$9/month, now replaced by Supabase Edge Functions + `pg_cron` at no additional cost. Remaining costs are Supabase (Pro tier likely needed for Edge Function/storage limits at scale), Firecrawl, Sightengine, CFBD (free), YouTube Data API (free quota), and an email API (e.g. Resend) for the new relay/notification jobs — worth a fresh pass on this table once real usage at each service is known.

**Annual prize pool:** $1,350 ($50 × 13 games + $200 season champion + $500 all-sport champion)

---

## 44. QUICK REFERENCE — KEY CONSTRAINTS

| Constraint | Rule |
|---|---|
| Drive button values | Independent, 40-60 pt range each — NOT constrained to sum to 100 |
| Pregame lock | At scheduled kickoff time — permanent, cannot unlock (§8 unified trigger; no longer offset by 10 minutes) |
| Drive lock | 60 seconds after previous drive ends — permanent per drive |
| Pregame max points | 1,000 (with +50/+100 exact-match bonuses) |
| Multiplier reset | Any wrong/missed drive pick resets streak to 0, multiplier to 1.00x |
| Hot streak threshold | 3+ consecutive correct picks = 🔥 active |
| Leaderboard refresh | Only at drive-end and game-end |
| Points storage | All sport points stored in `profiles`, updated only after `live_games.status = 'calculated'` |
| Chat rooms | main, football, basketball, baseball, lv-basketball, lv-softball, other, recruiting |
| Forum categories | 11 (see §23) |
| Forum reactions | 8 (see §23) |
| Username max length | 50 alphanumeric characters, no spaces |
| Thread title max length | 50 characters |
| Chat debounce | 1 message per 3 seconds |
| Video grid size | 3×8 (24 cards) — uniform on every page |
| News grid size | 3×10 (30 cards) — uniform on every page |
| Prediction engine location | Main page ONLY — never on Football or sport pages |
| Forums infrastructure | Native Supabase — never XenForo |
| Legal footer | On every single page — non-negotiable |
| Trivia database | **Production-ready** — 1,000 questions, 0 flags, see `VGD_Trivia_Questions_FULLY_REVISED.md` and §32 |

---

*End of GoVolsGameDay Master Specification (Claude Code Edition). Load this file at the start of every Claude Code session on this repo, and re-read it before any architectural, schema, or scoring-logic change.*
