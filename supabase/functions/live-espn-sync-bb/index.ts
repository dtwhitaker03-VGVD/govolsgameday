import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { type BbPlay, type Boundary, type PlanMode, isTerminal, planBoundaries, stretchStats } from "./plan.ts";

// ─── LIVE ESPN SYNC (BASKETBALL) ────────────────────────────────────────────
// Drives the men's and women's basketball scoreboards and the live predictor
// (men's: TV-timeout stretches; women's: quarters) from ESPN's public game summary. The football poller (live-espn-sync) ignores
// basketball rows and this one ignores football rows (live_games.sport).
//
// A stretch runs from one TV timeout to the next (see plan.ts for the exact
// boundary rules). A window opens the moment the boundary that starts it shows up
// as the newest one in the feed and locks early as soon as the first live-ball play
// after the timeout appears (or at its fallback lock time). It settles on the score
// at the next boundary. Windows are matched to boundaries by play id, so a timeout ESPN
// logs late (it has inserted one minutes after later ones) can't shift the others.
// Because a score can be corrected, a stretch is only settled after ESPN
// has reported the same end score on two polls at least CONFIRM_SECONDS apart
// (the final stretch settles straight away once the game is over).
//
// Once a game is over (ESPN says completed) and every window is settled, it is
// finalized automatically FINALIZE_DELAY_SECONDS later (finalize-game-bb: scores the
// pregame picks, credits points, awards badges, marks the game 'calculated'), unless
// the game is under manual_control. The delay lets ESPN's final score/box score settle.
//
// ESPN's event id is stored in live_games.cfbd_game_id.

const ESPN_SUMMARY: Record<string, string> = {
  basketball: "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=",
  womens_basketball: "https://site.api.espn.com/apis/site/v2/sports/basketball/womens-college-basketball/summary?event=",
};
const CONFIRM_SECONDS = 30;
const TIMEOUT_LOCK_SECONDS = 150; // fallback; the first live play after the timeout locks it sooner
const START_LOCK_SECONDS = 120;
const HALFTIME_LOCK_SECONDS = 1500;
const FINALIZE_DELAY_SECONDS = 180;
const FINAL_LOOKBACK_MS = 12 * 60 * 60 * 1000; // keep polling a final game this long, waiting to finalize it

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
  sport: string;
  home_team: string;
  away_team: string;
  status: string;
  manual_control: boolean;
  bb_stats?: Json;
}

const sameTeam = (a: string, b: string) => {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  return x === y || x.startsWith(y) || y.startsWith(x);
};

let lastFetchError = "";

async function fetchSummary(eventId: number, sport: string): Promise<Json | null> {
  try {
    const res = await fetch(`${ESPN_SUMMARY[sport] ?? ESPN_SUMMARY.basketball}${eventId}`, {
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
  const d = await fetchSummary(game.cfbd_game_id, game.sport);
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
  const mode: PlanMode = game.sport === "womens_basketball" ? "quarter" : "stretch";
  const boundaries = planBoundaries(plays, mode);
  const tnTeamId: string = game.home_team === "Tennessee" ? home.team.id : away.team.id;

  // ── Windows first, so the game is never marked final with a stretch unsettled ──
  // A window belongs to the boundary that opens it (live_windows.start_play_id), NOT to its
  // position in the boundary list: ESPN sometimes logs a TV timeout minutes late, so a
  // boundary can appear in the middle of the list after later ones were already seen, and
  // positional numbering would then settle the wrong stretches. window_number is just a unique
  // counter (next = highest + 1).
  let opened = 0, locked = 0, settled = 0, confirming = 0;
  const errors: string[] = [];

  if (!game.manual_control && boundaries.length > 0) {
    const { data: winRows } = await supabase
      .from("live_windows")
      .select("window_number, status, window_locked_at, start_play_id")
      .eq("game_id", game.id);
    const rows = (winRows ?? []) as Json[];
    const byStart = new Map<string, { num: number; status: string; locked: string }>();
    let maxNum = 0;
    for (const w of rows) {
      if (w.window_number > maxNum) maxNum = w.window_number;
      if (w.start_play_id && w.window_number > 0) byStart.set(w.start_play_id, { num: w.window_number, status: w.status, locked: w.window_locked_at });
    }
    const { data: candRows, error: candErr } = await supabase
      .from("drive_settle_candidates")
      .select("drive_number, outcome, first_seen_at")
      .eq("game_id", game.id);
    const cands = new Map<number, { outcome: string; first_seen_at: string }>(
      ((candRows ?? []) as Json[]).map((c) => [c.drive_number, c])
    );

    // Finished stretches: the stretch that opens at boundary i ends at the next boundary in the feed.
    for (let i = 0; i + 1 < boundaries.length; i++) {
      const w = byStart.get(boundaries[i].playId);
      if (!w || w.status !== "open") continue;
      const b = boundaries[i + 1];
      const key = `${b.home}-${b.away}`;
      if (!candErr && !over) {
        const cand = cands.get(w.num);
        const age = cand ? Date.now() - new Date(cand.first_seen_at).getTime() : 0;
        if (!cand || cand.outcome !== key) {
          const { error } = await supabase
            .from("drive_settle_candidates")
            .upsert({ game_id: game.id, drive_number: w.num, outcome: key, first_seen_at: new Date().toISOString() }, { onConflict: "game_id,drive_number" });
          if (!error) {
            confirming++;
            continue;
          }
          errors.push(`candidate ${w.num}: ${error.message} — settling without confirmation`);
        } else if (age < CONFIRM_SECONDS * 1000) {
          confirming++;
          continue;
        }
      }
      const st = stretchStats(plays, boundaries[i].playId, b.playId, tnTeamId);
      const { error } = await supabase.rpc("settle_live_window", {
        p_game_id: game.id, p_window_number: w.num, p_end_home_score: b.home, p_end_away_score: b.away, p_end_play_id: b.playId,
        p_threes: st.threes, p_twos: st.twos, p_turnovers: st.turnoversForced, p_fouls: st.fouls,
      });
      if (error) errors.push(`settle ${w.num}: ${error.message}`);
      else {
        settled++;
        w.status = "resolved";
        if (cands.delete(w.num)) await supabase.from("drive_settle_candidates").delete().eq("game_id", game.id).eq("drive_number", w.num);
      }
    }

    // The stretch in progress: it opens at the last boundary in the feed.
    const n = boundaries.length;
    const startB: Boundary = boundaries[n - 1];
    const terminal = isTerminal(startB, mode);
    const cur = byStart.get(startB.playId);

    if (over) {
      // Game over: score the stretch in progress (or the one that ended at a terminal
      // boundary, handled above) against the final score.
      if (cur?.status === "open") {
        const st = stretchStats(plays, startB.playId, null, tnTeamId);
        const { error } = await supabase.rpc("settle_live_window", {
          p_game_id: game.id, p_window_number: cur.num, p_end_home_score: homeScore, p_end_away_score: awayScore, p_end_play_id: null,
          p_threes: st.threes, p_twos: st.twos, p_turnovers: st.turnoversForced, p_fouls: st.fouls,
        });
        if (error) errors.push(`settle ${cur.num} (final): ${error.message}`);
        else settled++;
      }
    } else if (!terminal && state === "in") {
      if (!cur) {
        // Only open a window for a stretch that hasn't started (otherwise the picks would
        // come after the play); a missed boundary just means no window for that stretch.
        if (!startB.resumed) {
          const lockSeconds = startB.kind === "start" ? START_LOCK_SECONDS
            : startB.kind === "period" && startB.period === (mode === "quarter" ? 2 : 1) ? HALFTIME_LOCK_SECONDS : TIMEOUT_LOCK_SECONDS;
          const { error } = await supabase.rpc("open_live_window", {
            p_game_id: game.id, p_window_number: maxNum + 1, p_start_play_id: startB.playId, p_period: startB.period,
            p_clock: startB.clock, p_home_score: startB.home, p_away_score: startB.away, p_lock_seconds: lockSeconds,
          });
          if (error) errors.push(`open ${maxNum + 1}: ${error.message}`);
          else opened++;
        }
      } else if (cur.status === "open" && startB.resumed && new Date(cur.locked).getTime() > Date.now()) {
        const { error } = await supabase.rpc("lock_live_window", { p_game_id: game.id, p_window_number: cur.num });
        if (error) errors.push(`lock ${cur.num}: ${error.message}`);
        else locked++;
      }
    }
  }

  // ── Scoreboard ──
  const detail: string = comp.status.type.detail ?? "";
  const period: number | null = comp.status.period ?? null;
  // Bookkeeping flags kept inside bb_stats across polls.
  const finalSeenAt: string | null = over ? (game.bb_stats?.final_seen_at ?? new Date().toISOString()) : null;
  const finalizingAt: string | null = game.bb_stats?.finalizing_at ?? null;
  const update: Record<string, unknown> = {
    status: over ? "final" : "live",
    home_score: homeScore,
    away_score: awayScore,
    current_quarter: over ? null : period,
    game_clock: over ? "" : comp.status.displayClock ?? null,
    bb_stats: { home: teamStats(d, home.team.id), away: teamStats(d, away.team.id), detail, stretches: Math.max(0, boundaries.length - 1),
      ...(finalSeenAt ? { final_seen_at: finalSeenAt } : {}), ...(finalizingAt ? { finalizing_at: finalizingAt } : {}) },
    updated_at: new Date().toISOString(),
  };
  await supabase.from("live_games").update(update).eq("id", game.id);

  // ── Auto-finalize ──
  let finalize: string | undefined;
  if (over && finalSeenAt && !game.manual_control && !finalizingAt && errors.length === 0) {
    const waited = Date.now() - new Date(finalSeenAt).getTime();
    const { count: openWins } = await supabase
      .from("live_windows").select("id", { count: "exact", head: true }).eq("game_id", game.id).eq("status", "open");
    if (waited < FINALIZE_DELAY_SECONDS * 1000) finalize = "waiting for ESPN's final to settle";
    else if (openWins) finalize = "waiting on unsettled windows";
    else {
      // Claim it: only one overlapping poll may finalize (finalize_game_bb credits points every call).
      const stats = update.bb_stats as Record<string, unknown>;
      const { data: claimed } = await supabase
        .from("live_games")
        .update({ bb_stats: { ...stats, finalizing_at: new Date().toISOString() } })
        .eq("id", game.id).eq("status", "final").is("bb_stats->>finalizing_at", null)
        .select("id");
      if (claimed && claimed.length > 0) {
        let failure = "";
        try {
          const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/finalize-game-bb`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({ game_id: game.id }),
          });
          if (!res.ok) failure = `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`;
        } catch (e) {
          failure = e instanceof Error ? e.message : String(e);
        }
        if (failure) {
          // Nothing was credited (finalize_game_bb is one transaction): release the claim so the next poll retries.
          await supabase.from("live_games").update({ bb_stats: stats }).eq("id", game.id).eq("status", "final");
          finalize = `failed, will retry: ${failure}`;
          errors.push(`finalize: ${failure}`);
        } else finalize = "finalized";
      }
    }
  }

  return {
    game_id: game.id, ok: true, status: update.status, homeScore, awayScore, boundaries: boundaries.length,
    opened, locked, confirming, settled, errors, finalize,
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

  // 'live' games, 'pregame' games within an hour of tip-off, and recently 'final' games awaiting auto-finalize.
  const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const since = new Date(Date.now() - FINAL_LOOKBACK_MS).toISOString();
  const { data: games, error } = await supabase
    .from("live_games")
    .select("id, cfbd_game_id, sport, home_team, away_team, status, manual_control, bb_stats")
    .in("sport", ["basketball", "womens_basketball"])
    .or(`status.eq.live,and(status.eq.pregame,kickoff_time.lte.${soon}),and(status.eq.final,kickoff_time.gte.${since})`);
  if (error) return json({ error: error.message }, 500);

  const results = [];
  for (const game of (games ?? []) as GameRow[]) results.push(await syncGame(supabase, game));
  return json({ ok: true, gamesSynced: results.length, results });
});
