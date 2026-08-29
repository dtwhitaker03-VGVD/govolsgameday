import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ─── ONE-OFF LIVE TEST HARNESS (2026-08-29) ────────────────────────────────
// Wired up for a single non-Tennessee test game (TCU vs North Carolina,
// CFBD game 401856766) to dry-run the live drive predictor end-to-end
// against CFBD's real live/plays feed (requires Patreon Tier 2+). Polled
// client-side while a game's status is 'live'/'pregame' rather than via
// pg_cron, since this only needs to run for the lifetime of one game today.
// Reuses the existing open_drive_window/settle_drive_outcome RPCs so the
// odds math and scoring pipeline are untouched — this only replaces the
// manual admin data entry with real CFBD data.

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
  // "Missed Field Goal" must be checked before the general "Field Goal"
  // match, since it contains that substring.
  const r = result.toUpperCase().trim();
  if (r.includes("MISSED") && r.includes("FIELD GOAL")) return "turnover_on_downs";
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

  if (!body.game_id) return json({ error: "Missing game_id" }, 400);

  const supabase = getSupabaseClient();

  const { data: game, error: gameErr } = await supabase
    .from("live_games")
    .select("id, cfbd_game_id, home_team, away_team, status")
    .eq("id", body.game_id)
    .maybeSingle();

  if (gameErr || !game) return json({ error: "Game not found" }, 404);
  if (game.status === "final" || game.status === "calculated") {
    return json({ ok: true, skipped: `status is ${game.status}` });
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
    return json({ ok: true, skipped: "not started yet" });
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return json({ ok: false, error: `CFBD live/plays HTTP ${res.status}: ${text}` }, 502);
  }

  const live = (await res.json()) as LiveGame;

  const homeTeam = live.teams.find((t) => t.homeAway === "home");
  const awayTeam = live.teams.find((t) => t.homeAway === "away");
  const homeScore = homeTeam?.points ?? 0;
  const awayScore = awayTeam?.points ?? 0;

  const statusLower = (live.status ?? "").toLowerCase();
  const isFinal = statusLower.includes("final") || statusLower.includes("complete");
  const newStatus = isFinal ? "final" : "live";

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
      updated_at: new Date().toISOString(),
    })
    .eq("id", game.id);

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

  return json({
    ok: true,
    status: newStatus,
    homeScore,
    awayScore,
    driveCount: live.drives.length,
    opened,
    settled,
    settleErrors,
  });
});
