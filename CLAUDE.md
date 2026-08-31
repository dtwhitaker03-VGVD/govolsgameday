# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — production build (runs `vite build`, outputs to `dist/client`)
- `npm run typecheck` — `tsc --noEmit -p tsconfig.app.json`; run this before committing frontend changes
- `npm run lint` — ESLint over the whole project
- `npm run preview` — preview the production build locally

There is no test suite in this repo (no test runner configured).

## Architecture

**Stack:** React 18 + TypeScript, Vite, Tailwind CSS, React Router v7 (client-side routes, all declared in `src/App.tsx` and wrapped in `RootLayout`). Deployed as a Cloudflare Worker (`wrangler.jsonc`, `main: worker/index.ts`) that serves the built SPA as static assets and does an http→https redirect — `worker/index.ts` has no other logic. Data, auth, realtime, and background jobs are all Supabase.

**Frontend layout:** `src/pages/*` are route-level components; `src/components/<domain>/` groups feature components (`auth`, `chat`, `forums`, `game`, `layout`, `leaderboard`, `news`, `polls`, `predictions`, `profile`, `trivia`, `ui`, `video`). `src/components/ui/DashboardCard.tsx` is the shared card shell (header bar + body slot) that most panels on the site are built from. `src/context/AuthContext.tsx` provides the `useAuth()` hook (session + `profiles` row); most components that need the current user pull from it rather than calling `supabase.auth` directly.

`src/lib/supabase.ts` sanitizes `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` before creating the client — strips non-ASCII characters that can silently sneak into build-time env values (smart quotes, BOM) and otherwise surface as an opaque "Headers" network error deep in supabase-js.

**Supabase is the source of truth for schema and business logic.** `supabase/migrations/*.sql` (timestamp-prefixed, applied in order) define tables, RLS policies, and a large set of `SECURITY DEFINER` Postgres functions that the frontend calls via `supabase.rpc(...)` instead of doing multi-step writes from the client. `supabase/functions/*` are Deno edge functions, deployed independently of the Cloudflare build — an edge function change takes effect immediately on deploy, with no relationship to the frontend's build/deploy cycle.

**Background sync pattern:** recurring jobs are `pg_cron` schedules calling a SQL `invoke_X()` function, which reads the project URL and service-role key from Vault secrets and POSTs to the corresponding edge function (e.g. `invoke_game_sync` → `game-sync`, similarly for `recruiting-sync`, `youtube-ingest`, `news-ingest`). `game-sync` itself only calls the CFBD API inside specific weekly time windows (see `getSyncWindow()` in `supabase/functions/game-sync/index.ts`) to keep API usage low, and is scoped to `team=Tennessee` only.

**Prediction/scoring pipeline** (the core feature, spanning `live_games`, `drive_windows`, `drive_predictions`, `pregame_predictions`, `game_leaderboard`, `profiles`, `user_badges`):
- `live_games.status` moves `pregame` → `live` → `final` → `calculated`. `game-sync` advances `pregame`/`live`/`final` from CFBD's schedule endpoint automatically, but deliberately never touches a `'calculated'` game and never calls `finalize_game()` itself — that stays a deliberate action (an Admin Dashboard button) since it's the point where predictions get scored and real points get credited.
- During a live game, `open_drive_window`/`settle_drive_outcome` (RPCs) open a pick window for the current drive and later resolve it, updating `drive_predictions` and `game_leaderboard.total_drive_points` together with streak/multiplier bookkeeping.
- `calculate_pregame_points` scores `pregame_predictions` (winner, score, yards, spread/total O/U, TN-specific stat guesses) once final stats are known, and upserts into `game_leaderboard.pregame_points`.
- `finalize_game(game_id)` runs `calculate_pregame_points`, flips the game to `'calculated'`, credits `profiles.points_football`/`total_points` from `game_leaderboard.total_game_points`, and awards `user_badges` (streaks, point thresholds, perfect picks, leaderboard placement, etc.).
- RLS on `drive_predictions` intentionally restricts a user to their own rows while a game is live (`auth.uid() = user_id`), opening up to everyone once the game is `'calculated'` — so any aggregate stat needed while a game is still live (e.g. leaderboard pick-accuracy) has to be maintained on `game_leaderboard` itself rather than queried live from `drive_predictions`, or it will only ever reflect the currently-signed-in user.
