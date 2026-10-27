import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { type BbPlay, type Boundary, isTerminal, planBoundaries, stretchStats } from "./plan.ts";

// ─── LIVE ESPN SYNC (BASKETBALL) ────────────────────────────────────────────
// Drives the men's basketball scoreboard and the live "stretch" predictor from
// ESPN's public game summary. The football poller (live-espn-sync) ignores
// basketball rows and this one ignores football rows (live_games.sport).
//
// A stretch runs from one TV timeout to the next (see plan.ts for the exact
// boundary rules). Window n opens the moment boundary n-1 shows up in the
// feed and locks early as soon as the first live-ball play after the timeout
// appears (or at its fallback lock time). It settles on the score at boundary
// n. Because a score can be corrected, a stretch is only settled after ESPN
// has reported the same end score on two polls at least CONFIRM_SECONDS apart
// (the final stretch settles straight away once the game is over).
//
// ESPN's event id is stored in live_games.cfbd_game_id.

const ESPN_SUMMARY = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=";
const CONFIRM_SECONDS = 30;
const TIMEOUT_LOCK_SECONDS = 150; // fallback; the first live play after the timeout locks it sooner
const START_LOCK_SECONDS = 120;
const HALFTIME_LOCK_SECONDS = 1500;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function getSupabaseClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

// deno-lint-ignore no-explicit-any
type Json = any;
type SupabaseClient = ReturnType<typeof getSupabaseClient>;

interface GameRow {
  id: string;
  cfbd_game_id: number;
  home_team: string;
  away_team: string;
  status: string;
  manual_control: boolean;
}

const sameTeam = (a: string, b: string) => {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  return x === y || x.startsWith(y) || y.startsWith(x);
};

let lastFetchError = "";

async function fetchSummary(eventId: number): Promise<Json | null> {
  try {
    const res = await fetch(`${ESPN_SUMMARY}${eventId}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GoVolsGameDay/1.0)", Accept: "application/json" },
    });
    if (!res.ok) {
      lastFetchError = `HTTP ${res.status}`;
      return null;
    }
    return await res.json();
  } catch (e) {
    lastFetchError = e instanceof Error ? e.message : String(e);
    return null;
  }
}

const toInt = (v: unknown): number | null => {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : null;
};

/** Team box score as { statName: displayValue } for the scoreboard panel. */
function teamStats(d: Json, teamId: string): Record<string, string> {
  const t = (d.boxscore?.teams ?? []).find((x: Json) => x.team?.id === teamId);
  const out: Record<string, string> = {};
  for (const s of t?.statistics ?? []) if (s.name && s.displayValue != null) out[s.name] = String(s.displayValue);
  return out;
}

async function syncGame(supabase: SupabaseClient, game: GameRow) {
  const d = await fetchSummary(game.cfbd_game_id);
  const comp = d?.header?.competitions?.[0];
  if (!comp) return { game_id: game.id, ok: false, error: `ESPN summary unavailable: ${lastFetchError || "unexpected shape"}` };

  const home = comp.competitors.find((c: Json) => c.homeAway === "home");
  const away = comp.competitors.find((c: Json) => c.homeAway === "away");
  if (!home || !away || !sameTeam(home.team.location ?? "", game.home_team) || !sameTeam(away.team.location ?? "", game.away_team)) {
    return {
      game_id: game.id,
      ok: false,
      error: `ESPN event ${game.cfbd_game_id} is ${away?.team.location} @ ${home?.team.location}, not ${game.away_team} @ ${game.home_team} — not syncing`,
    };
  }

  const state: string = comp.status.type.state; // 'pre' | 'in' | 'post'
  if (state === "pre") return { game_id: game.id, ok: true, skipped: "not started yet" };

  const homeScore = toInt(home.score) ?? 0;
  const awayScore = toInt(away.score) ?? 0;
  const over = state === "post" && comp.status.type.completed === true;
  const plays: BbPlay[] = d.plays ?? [];
  const boundaries = planBoundaries(plays);
  const tnTeamId: string = game.home_team === "Tennessee" ? home.team.id : away.team.id;

  // ── Windows first, so the game is never marked final with a stretch unsettled ──
  let opened = 0, locked = 0, settled = 0, confirming = 0;
  const errors: string[] = [];

  if (!game.manual_control && boundaries.length > 0) {
    const { data: winRows } = await supabase
      .from("live_windows")
      .select("window_number, status, window_locked_at")
      .eq("game_id", game.id);
    const wins = new Map<number, { status: string; locked: string }>(
      ((winRows ?? []) as Json[]).map((w) => [w.window_number, { status: w.status, locked: w.window_locked_at }])
    );
    const { data: candRows, error: candErr } = await supabase
      .from("drive_settle_candidates")
      .select("drive_number, outcome, first_seen_at")
      .eq("game_id", game.id);
    const cands = new Map<number, { outcome: string; first_seen_at: string }>(
      ((candRows ?? []) as Json[]).map((c) => [c.drive_number, c])
    );

    // Finished stretches: stretch k ends at boundary k.
    for (let k = 1; k < boundaries.length; k++) {
      if (wins.get(k)?.status !== "open") continue;
      const b = boundaries[k];
      const key = `${b.home}-${b.away}`;
      if (!candErr && !over) {
        const cand = cands.get(k);
        const age = cand ? Date.now() - new Date(cand.first_seen_at).getTime() : 0;
        if (!cand || cand.outcome !== key) {
          const { error } = await supabase
            .from("drive_settle_candidates")
            .upsert({ game_id: game.id, drive_number: k, outcome: key, first_seen_at: new Date().toISOString() }, { onConflict: "game_id,drive_number" });
          if (!error) {
            confirming++;
            continue;
          }
          errors.push(`candidate ${k}: ${error.message} — settling without confirmation`);
        } else if (age < CONFIRM_SECONDS * 1000) {
          confirming++;
          continue;
        }
      }
      const st = stretchStats(plays, boundaries[k - 1].playId, b.playId, tnTeamId);
      const { error } = await supabase.rpc("settle_live_window", {
        p_game_id: game.id, p_window_number: k, p_end_home_score: b.home, p_end_away_score: b.away, p_end_play_id: b.playId,
        p_threes: st.threes, p_twos: st.twos, p_turnovers: st.turnoversForced, p_fouls: st.fouls,
      });
      if (error) errors.push(`settle ${k}: ${error.message}`);
      else {
        settled++;
        wins.set(k, { status: "resolved", locked: "" });
        if (cands.delete(k)) await supabase.from("drive_settle_candidates").delete().eq("game_id", game.id).eq("drive_number", k);
      }
    }

    // The stretch in progress: stretch n starts at boundary n-1.
    const n = boundaries.length;
    const startB: Boundary = boundaries[n - 1];
    const terminal = isTerminal(startB);

    if (over) {
      // Game over: score the stretch in progress (or the one that ended at a terminal
      // boundary, handled above) against the final score, and void anything left.
      if (wins.get(n)?.status === "open") {
        const st = stretchStats(plays, boundaries[n - 1].playId, null, tnTeamId);
        const { error } = await supabase.rpc("settle_live_window", {
          p_game_id: game.id, p_window_number: n, p_end_home_score: homeScore, p_end_away_score: awayScore, p_end_play_id: null,
          p_threes: st.threes, p_twos: st.twos, p_turnovers: st.turnoversForced, p_fouls: st.fouls,
        });
        if (error) errors.push(`settle ${n} (final): ${error.message}`);
        else settled++;
      }
    } else if (!terminal && state === "in") {
      const w = wins.get(n);
      if (!w) {
        // Only open a window for a stretch that hasn't started (otherwise the picks would
        // come after the play); a missed boundary just means no window for that stretch.
        if (!startB.resumed) {
          const lockSeconds = startB.kind === "start" ? START_LOCK_SECONDS
            : startB.kind === "period" && startB.period === 1 ? HALFTIME_LOCK_SECONDS : TIMEOUT_LOCK_SECONDS;
          const { error } = await supabase.rpc("open_live_window", {
            p_game_id: game.id, p_window_number: n, p_start_play_id: startB.playId, p_period: startB.period,
            p_clock: startB.clock, p_home_score: startB.home, p_away_score: startB.away, p_lock_seconds: lockSeconds,
          });
          if (error) errors.push(`open ${n}: ${error.message}`);
          else opened++;
        }
      } else if (w.status === "open" && startB.resumed && new Date(w.locked).getTime() > Date.now()) {
        const { error } = await supabase.rpc("lock_live_window", { p_game_id: game.id, p_window_number: n });
        if (error) errors.push(`lock ${n}: ${error.message}`);
        else locked++;
      }
    }
  }

  // ── Scoreboard ──
  const detail: string = comp.status.type.detail ?? "";
  const period: number | null = comp.status.period ?? null;
  const update: Record<string, unknown> = {
    status: over ? "final" : "live",
    home_score: homeScore,
    away_score: awayScore,
    current_quarter: over ? null : period,
    game_clock: over ? "" : comp.status.displayClock ?? null,
    bb_stats: { home: teamStats(d, home.team.id), away: teamStats(d, away.team.id), detail, stretches: Math.max(0, boundaries.length - 1) },
    updated_at: new Date().toISOString(),
  };
  await supabase.from("live_games").update(update).eq("id", game.id);

  return {
    game_id: game.id, ok: true, status: update.status, homeScore, awayScore, boundaries: boundaries.length,
    opened, locked, confirming, settled, errors,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  let body: { game_id?: string } = {};
  try {
    body = await req.json();
  } catch { /* empty body */ }

  const supabase = getSupabaseClient();

  if (body.game_id) {
    const { data: game } = await supabase.from("live_games").select("*").eq("id", body.game_id).maybeSingle();
    if (!game) return json({ error: "Game not found" }, 404);
    const result = await syncGame(supabase, game as GameRow);
    return json(result, result.ok ? 200 : 502);
  }

  // 'live' games, and 'pregame' games within an hour of tip-off.
  const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const { data: games, error } = await supabase
    .from("live_games")
    .select("id, cfbd_game_id, home_team, away_team, status, manual_control")
    .eq("sport", "basketball")
    .or(`status.eq.live,and(status.eq.pregame,kickoff_time.lte.${soon})`);
  if (error) return json({ error: error.message }, 500);

  const results = [];
  for (const game of (games ?? []) as GameRow[]) results.push(await syncGame(supabase, game));
  return json({ ok: true, gamesSynced: results.length, results });
});
