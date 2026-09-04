import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ─── LIVE CFBD SYNC ─────────────────────────────────────────────────────────
// Pulls CFBD's real live/plays feed for in-progress games and drives the
// live drive predictor from it (requires Patreon Tier 2+). Originally built
// as a one-off harness for a single test game on 2026-08-29, polled
// client-side; now runs on a single server-side pg_cron schedule
// (invoke_live_cfbd_sync, every 15s) so CFBD call volume doesn't scale with
// concurrent viewers. Pass a game_id to sync just that game (used for
// manual/debug calls); omit it to sync every currently-eligible game.
// Reuses the existing open_drive_window/settle_drive_outcome RPCs so the
// odds math and scoring pipeline are untouched — this only replaces the
// manual admin data entry with real CFBD data.
//
// manual_control only gates the DRIVE predictor (open_drive_window /
// settle_drive_outcome) — an admin driving drives by hand from the Admin
// Dashboard needs this poller to back off so the two never race each
// other for the same drive. The scoreboard fields on live_games (score,
// quarter, clock, possession, down/distance, yards, turnovers, timeouts)
// are a different concern with no such conflict, so they sync from CFBD
// unconditionally, manual_control or not — an admin test game still gets
// a real, live-updating scoreboard.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// Maps CFBD's real observed driveResult vocabulary to this app's
// drive_windows.actual_outcome enum. Unmapped/unrecognized results are
// left unsettled (returns null) rather than guessed, since a wrong
// settlement would corrupt user scoring.
function mapDriveResult(result: string): string | null {
  // CFBD's historical /drives endpoint uses abbreviations ("FG", "TD") but
  // the live/plays endpoint spells results out ("Field Goal", "Touchdown")
  // — matched live against drive 1 of today's TCU/UNC game returning
  // "Field Goal" unrecognized by the abbreviation-only version of this
  // function. Match on substring so both vocabularies work. Order matters:
  // a missed-FG variant must be checked before the general "Field Goal"
  // match, since it contains that substring. CFBD isn't even consistent
  // with itself here — drive 18 of the same game returned "Missed FG"
  // (abbreviated), a THIRD variant distinct from both "Missed Field Goal"
  // (full) and "FG"/"Field Goal" (makes) — this left drive 18 permanently
  // stuck unresolved (mapDriveResult returned null every poll) until this
  // fix. Check both "FIELD GOAL" and bare "FG" alongside "MISSED".
  const r = result.toUpperCase().trim();
  if (r.includes("MISSED") && (r.includes("FIELD GOAL") || r.includes("FG"))) return "turnover_on_downs";
  if (r.includes("FIELD GOAL") || r === "FG") return "field_goal";
  if (r.includes("TOUCHDOWN") || r === "TD") return "touchdown";
  if (r === "PUNT") return "punt";
  if (r.includes("FUMBLE") || r.includes("INTERCEPTION") || r === "INT") return "turnover";
  if (r.includes("DOWNS")) return "turnover_on_downs";
  if (r.includes("SAFETY")) return "safety";
  if (r.includes("END OF")) return "end_of_quarter";
  return null;
}

interface LiveGameTeam {
  team: string;
  homeAway: "home" | "away";
  points: number;
}

interface LiveGamePlay {
  down: number;
  distance: number;
  yardsGained: number | null;
  rushPass: string | null;
  playType: string | null;
  team: string;
  period: number | null;
}

interface LiveGameDrive {
  id: string;
  offense: string;
  startPeriod: number;
  startClock: string | null;
  startYardsToGoal: number;
  endYardsToGoal: number | null;
  result: string;
  plays: LiveGamePlay[];
}

interface LiveGame {
  id: number;
  status: string;
  period: number | null;
  clock: string;
  possession: string;
  down: number | null;
  distance: number | null;
  yardsToGoal: number | null;
  teams: LiveGameTeam[];
  drives: LiveGameDrive[];
}

// Rushing/passing yards come from each play's rushPass classification, with
// one override: CFBD tags sacks (playType "Sack") as rushPass "pass", but
// ESPN's convention (matched here) charges sack yardage to rushing since the
// play never leaves the backfield as a throw. Turnovers count drives whose
// result mentions a fumble or interception, charged to that drive's
// offense. Timeouts remaining resets each half (periods 1-2 vs 3-4+) since
// NCAA timeouts don't carry over — OT periods are lumped into "half 2" as a
// simplification, not exact NCAA OT timeout rules.
interface TeamStats {
  rushingYards: number;
  passingYards: number;
  turnovers: number;
  timeoutsUsedThisHalf: number;
}

function halfOf(period: number | null | undefined): number {
  return (period ?? 1) <= 2 ? 1 : 2;
}

function computeTeamStats(live: LiveGame, teamName: string): TeamStats {
  let rushingYards = 0;
  let passingYards = 0;
  let turnovers = 0;
  let timeoutsUsedThisHalf = 0;
  const currentHalf = halfOf(live.period);

  for (const drive of live.drives) {
    for (const play of drive.plays) {
      if (play.team !== teamName) continue;
      if (play.playType === "Sack") rushingYards += play.yardsGained ?? 0;
      else if (play.rushPass === "rush") rushingYards += play.yardsGained ?? 0;
      else if (play.rushPass === "pass") passingYards += play.yardsGained ?? 0;
      if (play.playType === "Timeout" && halfOf(play.period) === currentHalf) {
        timeoutsUsedThisHalf++;
      }
    }
    if (drive.offense === teamName && drive.result) {
      const r = drive.result.toUpperCase();
      if (r.includes("FUMBLE") || r.includes("INTERCEPTION")) turnovers++;
    }
  }

  return { rushingYards, passingYards, turnovers, timeoutsUsedThisHalf };
}

type SupabaseClient = ReturnType<typeof getSupabaseClient>;

interface GameRow {
  id: string;
  cfbd_game_id: number;
  home_team: string;
  away_team: string;
  status: string;
  manual_control: boolean;
}

async function syncGame(supabase: SupabaseClient, apiKey: string, game: GameRow) {
  if (game.status === "final" || game.status === "calculated") {
    return { game_id: game.id, ok: true, skipped: `status is ${game.status}` };
  }

  const res = await fetch(
    `https://api.collegefootballdata.com/live/plays?gameId=${game.cfbd_game_id}`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );

  // Fire-and-forget request log so CFBD call volume is visible without
  // slowing down the sync itself — see cfbd_request_log.
  supabase
    .from("cfbd_request_log")
    .insert({ endpoint: "/live/plays", status_code: res.status, source: "live-cfbd-sync" })
    .then(() => {});

  if (res.status === 400) {
    // Game hasn't started yet — no plays available.
    return { game_id: game.id, ok: true, skipped: "not started yet" };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { game_id: game.id, ok: false, error: `CFBD live/plays HTTP ${res.status}: ${text}` };
  }

  const live = (await res.json()) as LiveGame;

  const homeTeam = live.teams.find((t) => t.homeAway === "home");
  const awayTeam = live.teams.find((t) => t.homeAway === "away");
  const homeScore = homeTeam?.points ?? 0;
  const awayScore = awayTeam?.points ?? 0;

  const statusLower = (live.status ?? "").toLowerCase();
  const isFinal = statusLower.includes("final") || statusLower.includes("complete");
  const newStatus = isFinal ? "final" : "live";

  const homeStats = computeTeamStats(live, homeTeam?.team ?? "");
  const awayStats = computeTeamStats(live, awayTeam?.team ?? "");

  // Scoreboard sync — always runs, manual_control or not. This is the real
  // live scoreboard (Live Game Stats on the main page); it has no overlap
  // with the drive predictor's manual controls below.
  await supabase
    .from("live_games")
    .update({
      status: newStatus,
      home_score: homeScore,
      away_score: awayScore,
      current_quarter: live.period,
      game_clock: live.clock,
      possession: live.possession,
      down: live.down,
      distance: live.distance,
      yardline: live.yardsToGoal != null ? 100 - live.yardsToGoal : null,
      home_rushing_yards: homeStats.rushingYards,
      away_rushing_yards: awayStats.rushingYards,
      home_passing_yards: homeStats.passingYards,
      away_passing_yards: awayStats.passingYards,
      home_total_yards: homeStats.rushingYards + homeStats.passingYards,
      away_total_yards: awayStats.rushingYards + awayStats.passingYards,
      home_turnovers: homeStats.turnovers,
      away_turnovers: awayStats.turnovers,
      home_timeouts_remaining: Math.max(0, 3 - homeStats.timeoutsUsedThisHalf),
      away_timeouts_remaining: Math.max(0, 3 - awayStats.timeoutsUsedThisHalf),
      updated_at: new Date().toISOString(),
    })
    .eq("id", game.id);

  if (game.manual_control) {
    // An admin is manually driving this game's drive windows from the
    // Admin Dashboard — back off the drive predictor entirely so this
    // poller never races open_drive_window / settle_drive_outcome
    // against a manual call for the same drive. The scoreboard sync
    // above already ran regardless.
    return {
      game_id: game.id,
      ok: true,
      status: newStatus,
      homeScore,
      awayScore,
      driveSyncSkipped: "manual control active",
    };
  }

  // Fetch existing drive_windows for this game so we know what's already
  // open/resolved and don't clobber resolved history.
  const { data: existingWindows } = await supabase
    .from("drive_windows")
    .select("drive_number, status, actual_outcome")
    .eq("game_id", game.id);

  const windowByNumber = new Map(
    (existingWindows ?? []).map((w) => [w.drive_number, w])
  );

  let opened = 0;
  let settled = 0;
  const settleErrors: string[] = [];

  for (let i = 0; i < live.drives.length; i++) {
    const drive = live.drives[i];
    const driveNumber = i + 1; // stable 1-based index into CFBD's append-only drives array
    const existing = windowByNumber.get(driveNumber);
    const hasResult = !!drive.result;
    const lastPlay = drive.plays[drive.plays.length - 1];

    if (!hasResult) {
      // Drive still in progress. open_drive_window upserts and resets
      // status back to 'open' (clearing actual_outcome) every time it
      // runs, which the frontend reacts to as a fresh window — so only
      // call it once, the first time this drive is seen, not on every
      // poll while the same drive continues. Score differential is
      // offense-relative (offense's own score minus the opponent's),
      // matching how open_drive_window's odds heuristics are written.
      if (existing) continue;

      const offenseIsHome = drive.offense === homeTeam?.team;
      const offenseScore = offenseIsHome ? homeScore : awayScore;
      const defenseScore = offenseIsHome ? awayScore : homeScore;

      const { error } = await supabase.rpc("open_drive_window", {
        p_game_id: game.id,
        p_drive_number: driveNumber,
        p_yardline: 100 - (lastPlay?.yardsToGoal ?? drive.startYardsToGoal),
        p_quarter: drive.startPeriod,
        p_game_clock: drive.startClock ?? live.clock,
        p_score_diff: offenseScore - defenseScore,
        p_down: lastPlay?.down ?? 1,
        p_distance: lastPlay?.distance ?? 10,
        p_cfbd_drive_id: drive.id,
      });
      if (!error) opened++;
    } else if (!existing || existing.status !== "resolved") {
      // Drive already ended by the time we saw it (possible if a poll is
      // missed) — open its window with the drive's starting situation
      // first so settle_drive_outcome has a row to resolve against.
      if (!existing) {
        await supabase.rpc("open_drive_window", {
          p_game_id: game.id,
          p_drive_number: driveNumber,
          p_yardline: 100 - drive.startYardsToGoal,
          p_quarter: drive.startPeriod,
          p_game_clock: drive.startClock ?? "15:00",
          p_score_diff: 0,
          p_down: 1,
          p_distance: 10,
          p_cfbd_drive_id: drive.id,
        });
      }

      const outcome = mapDriveResult(drive.result);
      if (outcome) {
        const { error } = await supabase.rpc("settle_drive_outcome", {
          p_game_id: game.id,
          p_drive_number: driveNumber,
          p_actual_outcome: outcome,
        });
        if (error) settleErrors.push(`drive ${driveNumber}: ${error.message}`);
        else settled++;
      } else {
        settleErrors.push(`drive ${driveNumber}: unrecognized result "${drive.result}"`);
      }
    }
  }

  return {
    game_id: game.id,
    ok: true,
    status: newStatus,
    homeScore,
    awayScore,
    driveCount: live.drives.length,
    opened,
    settled,
    settleErrors,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const apiKey = Deno.env.get("CFBC_API_KEY");
  if (!apiKey) return json({ error: "CFBD API key not configured" }, 500);

  let body: { game_id?: string } = {};
  try {
    body = await req.json();
  } catch { /* empty body */ }

  const supabase = getSupabaseClient();

  if (body.game_id) {
    // Single-game mode — used for manual/debug calls.
    const { data: game, error: gameErr } = await supabase
      .from("live_games")
      .select("id, cfbd_game_id, home_team, away_team, status, manual_control")
      .eq("id", body.game_id)
      .maybeSingle();

    if (gameErr || !game) return json({ error: "Game not found" }, 404);

    const result = await syncGame(supabase, apiKey, game as GameRow);
    return json(result, result.ok ? 200 : 502);
  }

  // No game_id — sync every currently-eligible game. Only 'live' games
  // and 'pregame' games within an hour of kickoff are polled, so a game
  // scheduled weeks out doesn't get hit every 15s once it gets a
  // live_games row (the actual driver of CFBD call volume this guards
  // against — see cfbd_request_log).
  const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const { data: games, error: gamesErr } = await supabase
    .from("live_games")
    .select("id, cfbd_game_id, home_team, away_team, status, kickoff_time, manual_control")
    .or(`status.eq.live,and(status.eq.pregame,kickoff_time.lte.${soon})`);

  if (gamesErr) return json({ error: gamesErr.message }, 500);

  const results = [];
  for (const game of (games ?? []) as GameRow[]) {
    results.push(await syncGame(supabase, apiKey, game));
  }

  return json({ ok: true, gamesSynced: results.length, results });
});
