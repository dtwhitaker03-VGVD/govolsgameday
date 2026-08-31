import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CFBD_BASE = "https://api.collegefootballdata.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ─── CFBD box-score shapes (see the "verify CFBD field shapes" step in the
// plan — the exact category/type strings below are the CFBD OpenAPI spec's
// documented names; parsing is defensive against reasonable case/spacing
// variants since this session had no live API key to confirm a real
// response against) ────────────────────────────────────────────────────────

interface TeamStatEntry { category: string; stat: string }
interface GameTeamStatsTeam { team: string; homeAway: "home" | "away"; points: number | null; stats: TeamStatEntry[] }
interface GameTeamStatsEntry { teams: GameTeamStatsTeam[] }

interface PlayerStatAthlete { name: string; stat: string }
interface PlayerStatType { name: string; athletes: PlayerStatAthlete[] }
interface PlayerStatCategory { name: string; types: PlayerStatType[] }
interface GamePlayerStatsTeam { team: string; categories: PlayerStatCategory[] }
interface GamePlayerStatsEntry { teams: GamePlayerStatsTeam[] }

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

async function cfbdGet(path: string, apiKey: string): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
  try {
    const res = await fetch(`${CFBD_BASE}${path}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) return { ok: false, message: `CFBD API returned HTTP ${res.status} for ${path}` };
    return { ok: true, data: await res.json() };
  } catch (err) {
    return { ok: false, message: `Network error fetching ${path}: ${String(err)}` };
  }
}

// Final score + total yards per team, straight from /games/teams — CFBD's
// canonical post-game numbers. Written unconditionally on finalize so a
// manually-controlled game (live-cfbd-sync skipped it entirely — see
// live_games.manual_control) still ends up with real values instead of
// whatever was last typed in by hand, and so a normal game's numbers get
// reconciled against CFBD's final tally rather than trusting live tracking.
// "totalYards" matches CFBD's documented category vocabulary but, like
// findTurnoversForced below, hasn't been confirmed against a live response
// in this codebase — normalize() guards against reasonable case variants.
function findTeamPointsAndYards(entries: GameTeamStatsEntry[]): {
  homePoints: number | null;
  awayPoints: number | null;
  homeYards: number | null;
  awayYards: number | null;
} {
  const game = entries[0];
  const empty = { homePoints: null, awayPoints: null, homeYards: null, awayYards: null };
  if (!game?.teams) return empty;

  const home = game.teams.find((t) => t.homeAway === "home");
  const away = game.teams.find((t) => t.homeAway === "away");

  function yardsFor(team: GameTeamStatsTeam | undefined): number | null {
    const stat = team?.stats.find((s) => normalize(s.category) === "totalyards");
    if (!stat) return null;
    const n = parseInt(stat.stat, 10);
    return Number.isFinite(n) ? n : null;
  }

  return {
    homePoints: home?.points ?? null,
    awayPoints: away?.points ?? null,
    homeYards: yardsFor(home),
    awayYards: yardsFor(away),
  };
}

function findTurnoversForced(entries: GameTeamStatsEntry[]): number | null {
  const game = entries[0];
  if (!game?.teams) return null;
  const opponent = game.teams.find((t) => normalize(t.team) !== "tennessee");
  if (!opponent?.stats) return null;
  const stat = opponent.stats.find((s) => normalize(s.category) === "turnovers");
  if (!stat) return null;
  const n = parseInt(stat.stat, 10);
  return Number.isFinite(n) ? n : null;
}

function sumCategoryTds(entries: GamePlayerStatsEntry[], categoryName: string): number | null {
  const game = entries[0];
  if (!game?.teams) return null;
  const tnTeam = game.teams.find((t) => normalize(t.team) === "tennessee");
  if (!tnTeam?.categories) return null;
  const category = tnTeam.categories.find((c) => normalize(c.name) === categoryName);
  if (!category?.types) return null;
  const tdType = category.types.find((t) => normalize(t.name) === "td");
  if (!tdType?.athletes) return null;
  let total = 0;
  for (const athlete of tdType.athletes) {
    const n = parseInt(athlete.stat, 10);
    if (Number.isFinite(n)) total += n;
  }
  return total;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Missing Authorization header" }, 401);
  }

  const service = getServiceClient();

  // Resolve the caller's identity from their own JWT (not the service-role
  // key), then check admin status server-side — finalize_game itself has
  // no admin gate, so this edge function is the enforcement point.
  const callerClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: userData, error: userErr } = await callerClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ error: "Not authenticated" }, 401);
  }

  const { data: profile } = await service
    .from("profiles")
    .select("is_admin")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return json({ error: "Unauthorized: admin access required." }, 403);
  }

  let body: { game_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const gameId = body.game_id;
  if (!gameId) {
    return json({ error: "Missing game_id" }, 400);
  }

  const { data: game, error: gameErr } = await service
    .from("live_games")
    .select("id, cfbd_game_id")
    .eq("id", gameId)
    .maybeSingle();
  if (gameErr || !game) {
    return json({ error: "Game not found" }, 404);
  }

  const apiKey = Deno.env.get("CFBC_API_KEY");
  const warnings: string[] = [];
  let tnTurnoversForced: number | null = null;
  let tnRushingTds: number | null = null;
  let tnReceivingTds: number | null = null;
  let homePoints: number | null = null;
  let awayPoints: number | null = null;
  let homeYards: number | null = null;
  let awayYards: number | null = null;

  if (!apiKey) {
    warnings.push("CFBD API key not configured — final score/yards and rushing/receiving TDs/turnovers-forced won't be updated from CFBD.");
  } else {
    const [teamsResult, playersResult] = await Promise.all([
      cfbdGet(`/games/teams?gameId=${game.cfbd_game_id}`, apiKey),
      cfbdGet(`/games/players?gameId=${game.cfbd_game_id}`, apiKey),
    ]);

    if (teamsResult.ok) {
      const teamsData = teamsResult.data as GameTeamStatsEntry[];
      tnTurnoversForced = findTurnoversForced(teamsData);
      if (tnTurnoversForced === null) warnings.push("Could not find opponent turnovers stat in CFBD /games/teams response.");

      const pointsAndYards = findTeamPointsAndYards(teamsData);
      homePoints = pointsAndYards.homePoints;
      awayPoints = pointsAndYards.awayPoints;
      homeYards = pointsAndYards.homeYards;
      awayYards = pointsAndYards.awayYards;
      if (homePoints === null || awayPoints === null) warnings.push("Could not find final score in CFBD /games/teams response — left live_games score untouched.");
      if (homeYards === null || awayYards === null) warnings.push("Could not find total yards in CFBD /games/teams response — left live_games yards untouched.");
    } else {
      warnings.push(teamsResult.message);
    }

    if (playersResult.ok) {
      tnRushingTds = sumCategoryTds(playersResult.data as GamePlayerStatsEntry[], "rushing");
      tnReceivingTds = sumCategoryTds(playersResult.data as GamePlayerStatsEntry[], "receiving");
      if (tnRushingTds === null) warnings.push("Could not find TN rushing TDs in CFBD /games/players response.");
      if (tnReceivingTds === null) warnings.push("Could not find TN receiving TDs in CFBD /games/players response.");
    } else {
      warnings.push(playersResult.message);
    }
  }

  // Score/yards only get written when CFBD actually returned a value —
  // unlike the tn_* prop stats below (which only ever come from this
  // function), score/yards may already be correctly populated by game-sync
  // or live-cfbd-sync, so a failed/missing CFBD lookup here must never wipe
  // out already-good data.
  const scoreAndYardsUpdate: Record<string, number> = {};
  if (homePoints !== null) scoreAndYardsUpdate.home_score = homePoints;
  if (awayPoints !== null) scoreAndYardsUpdate.away_score = awayPoints;
  if (homeYards !== null) scoreAndYardsUpdate.home_total_yards = homeYards;
  if (awayYards !== null) scoreAndYardsUpdate.away_total_yards = awayYards;

  const { error: updateErr } = await service
    .from("live_games")
    .update({
      ...scoreAndYardsUpdate,
      tn_rushing_tds: tnRushingTds,
      tn_receiving_tds: tnReceivingTds,
      tn_turnovers_forced: tnTurnoversForced,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gameId);
  if (updateErr) {
    warnings.push(`Failed to write actual stats to live_games: ${updateErr.message}`);
  }

  const { error: finalizeErr } = await service.rpc("finalize_game", { p_game_id: gameId });
  if (finalizeErr) {
    return json({ error: finalizeErr.message, warnings }, 500);
  }

  return json({
    ok: true,
    stats: {
      home_score: homePoints, away_score: awayPoints,
      home_total_yards: homeYards, away_total_yards: awayYards,
      tn_rushing_tds: tnRushingTds, tn_receiving_tds: tnReceivingTds, tn_turnovers_forced: tnTurnoversForced,
    },
    warnings,
  });
});
