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

// ─── CFBD box-score shapes — confirmed against a real /games/teams and
// /games/players response (TCU @ North Carolina, gameId 401856766, 2026
// season) on 2026-09-05. Parsing stays case/spacing-defensive via
// normalize() regardless. ───────────────────────────────────────────────────

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

// ─── Weekly prop bet auto-grading ───────────────────────────────────────────
// Reuses the same /games/teams and /games/players responses already fetched
// above for the TD/turnover/yards lookups — no extra CFBD calls. A prop only
// gets auto-graded if it has stat_scope/stat_category (and, for player
// scope, stat_type + player_name) set; anything else (including every prop
// created before this feature existed) is left for admin_grade_game_prop as
// before. A miss (player not found, category/type not present, value isn't
// a plain number) is reported as a warning and left ungraded rather than
// guessed — a wrong auto-grade would corrupt real scoring.

interface GamePropRow {
  id: string;
  description: string;
  stat_scope: "player" | "team" | null;
  stat_category: string | null;
  stat_type: string | null;
  player_name: string | null;
  team_side: "home" | "away" | null;
}

function findTeamStatByCategory(
  entries: GameTeamStatsEntry[],
  teamName: string,
  category: string
): number | null {
  const game = entries[0];
  if (!game?.teams) return null;
  const team = game.teams.find((t) => normalize(t.team) === normalize(teamName));
  const stat = team?.stats.find((s) => normalize(s.category) === normalize(category));
  if (!stat) return null;
  const n = parseFloat(stat.stat);
  return Number.isFinite(n) ? n : null;
}

function findPlayerStatByName(
  entries: GamePlayerStatsEntry[],
  category: string,
  statType: string,
  playerName: string
): number | null {
  const game = entries[0];
  if (!game?.teams) return null;
  for (const team of game.teams) {
    const cat = team.categories?.find((c) => normalize(c.name) === normalize(category));
    const type = cat?.types.find((t) => normalize(t.name) === normalize(statType));
    const athlete = type?.athletes.find((a) => normalize(a.name) === normalize(playerName));
    if (athlete) {
      const n = parseFloat(athlete.stat);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

async function autoGradeProps(
  service: ReturnType<typeof getServiceClient>,
  gameId: string,
  homeTeam: string,
  awayTeam: string,
  teamsData: GameTeamStatsEntry[] | null,
  playersData: GamePlayerStatsEntry[] | null,
  warnings: string[]
): Promise<number> {
  const { data: props } = await service
    .from("game_props")
    .select("id, description, stat_scope, stat_category, stat_type, player_name, team_side")
    .eq("game_id", gameId)
    .is("actual_result", null);

  let graded = 0;
  for (const prop of (props ?? []) as GamePropRow[]) {
    if (!prop.stat_scope || !prop.stat_category) continue;

    let actualValue: number | null = null;

    if (prop.stat_scope === "team") {
      if (!teamsData) {
        warnings.push(`Prop "${prop.description}": no CFBD team stats available to auto-grade.`);
        continue;
      }
      if (!prop.team_side) {
        warnings.push(`Prop "${prop.description}": team scope but no team_side set — skipped.`);
        continue;
      }
      const teamName = prop.team_side === "home" ? homeTeam : awayTeam;
      actualValue = findTeamStatByCategory(teamsData, teamName, prop.stat_category);
      if (actualValue === null) {
        warnings.push(`Prop "${prop.description}": could not find team stat "${prop.stat_category}" for ${teamName} in CFBD data.`);
        continue;
      }
    } else {
      if (!playersData) {
        warnings.push(`Prop "${prop.description}": no CFBD player stats available to auto-grade.`);
        continue;
      }
      if (!prop.stat_type || !prop.player_name) {
        warnings.push(`Prop "${prop.description}": player scope but missing stat_type/player_name — skipped.`);
        continue;
      }
      actualValue = findPlayerStatByName(playersData, prop.stat_category, prop.stat_type, prop.player_name);
      if (actualValue === null) {
        warnings.push(`Prop "${prop.description}": could not find "${prop.player_name}" in CFBD's ${prop.stat_category}/${prop.stat_type} data — left for manual grading.`);
        continue;
      }
    }

    const { error } = await service.rpc("admin_grade_game_prop", {
      p_id: prop.id,
      p_actual_value: actualValue,
    });
    if (error) {
      warnings.push(`Prop "${prop.description}": auto-grade failed: ${error.message}`);
    } else {
      graded++;
    }
  }

  return graded;
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
    .select("id, cfbd_game_id, home_team, away_team, kickoff_time")
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
  let teamsData: GameTeamStatsEntry[] | null = null;
  let playersData: GamePlayerStatsEntry[] | null = null;

  if (!apiKey) {
    warnings.push("CFBD API key not configured — final score/yards and rushing/receiving TDs/turnovers-forced won't be updated from CFBD.");
  } else {
    // CFBD requires `year` on both endpoints, plus one of week/team/conference
    // — confirmed live 2026-09-05 (both previously 400'd with "year parameter
    // is required" on every call, meaning these lookups had never actually
    // succeeded). `team` uses the game's own home team so this works for any
    // game, not just a Tennessee one (e.g. an admin test game).
    const season = new Date(game.kickoff_time).getUTCFullYear();
    const teamParam = encodeURIComponent(game.home_team);
    const [teamsResult, playersResult] = await Promise.all([
      cfbdGet(`/games/teams?gameId=${game.cfbd_game_id}&year=${season}&team=${teamParam}`, apiKey),
      cfbdGet(`/games/players?gameId=${game.cfbd_game_id}&year=${season}&team=${teamParam}`, apiKey),
    ]);

    if (teamsResult.ok) {
      teamsData = teamsResult.data as GameTeamStatsEntry[];
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
      playersData = playersResult.data as GamePlayerStatsEntry[];
      tnRushingTds = sumCategoryTds(playersData, "rushing");
      tnReceivingTds = sumCategoryTds(playersData, "receiving");
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

  // Grade any auto-gradeable weekly prop bets BEFORE finalize_game, since
  // finalize_game runs calculate_pregame_points internally, which sums
  // pregame_prop_picks.points_earned off whatever game_props.actual_result
  // already is at that moment — a prop graded after finalize_game would
  // never get credited without a second run.
  const propsGraded = await autoGradeProps(service, gameId, game.home_team, game.away_team, teamsData, playersData, warnings);

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
    props_auto_graded: propsGraded,
    warnings,
  });
});
