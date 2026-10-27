import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// BB GAME SYNC: keeps live_games in step with Tennessee men's and women's basketball's
// ESPN schedules (sport 'basketball' / 'womens_basketball'), and refreshes betting
// lines for upcoming games. Runs hourly (pg_cron
// -> invoke_bb_game_sync); cheap and idempotent. Basketball has no CFBD
// equivalent, so ESPN is the only source here.
//
// ESPN's event id is stored in live_games.cfbd_game_id (the column predates
// basketball; football ids and basketball ids never collide). Live in-game data
// is live-espn-sync-bb's job; this only creates games, keeps kickoff times
// current, records finals, and captures lines.

const LEAGUES = [
  { sport: "basketball", base: "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball" },
  { sport: "womens_basketball", base: "https://site.api.espn.com/apis/site/v2/sports/basketball/womens-college-basketball" },
] as const;
type League = (typeof LEAGUES)[number];
const ESPN_HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; GoVolsGameDay/1.0)", Accept: "application/json" };
const TENNESSEE_ESPN_ID = "2633";
const LOOKAHEAD_DAYS = 21; // scoreboard scan window only; the team schedule loads the whole season
const LINE_LOOKAHEAD_MS = 10 * 24 * 60 * 60 * 1000; // ESPN posts totals a few days out; re-checked hourly

// deno-lint-ignore no-explicit-any
type Json = any;
type Client = ReturnType<typeof getSupabaseClient>;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function getSupabaseClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function espnGet(url: string): Promise<Json | null> {
  try {
    const res = await fetch(url, { headers: ESPN_HEADERS });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

interface BbGame {
  id: number;
  startDate: string;
  completed: boolean;
  canceled: boolean;
  homeTeam: string;
  awayTeam: string;
  homePoints: number | null;
  awayPoints: number | null;
  timeValid: boolean;
}

function parseEvent(e: Json): BbGame | null {
  const c = e.competitions?.[0];
  const home = c?.competitors?.find((x: Json) => x.homeAway === "home");
  const away = c?.competitors?.find((x: Json) => x.homeAway === "away");
  const id = Number(e.id);
  if (!c || !home || !away || !Number.isFinite(id) || !e.date) return null;
  const pts = (x: Json) => {
    const v = typeof x.score === "object" ? x.score?.value : x.score;
    const n = Number(v);
    return v == null || v === "" || !Number.isFinite(n) ? null : n;
  };
  const statusName: string = c.status?.type?.name ?? "";
  const g: BbGame = {
    id,
    startDate: new Date(e.date).toISOString(),
    completed: c.status?.type?.completed === true,
    canceled: /CANCEL|POSTPONED/i.test(statusName),
    homeTeam: home.team?.location ?? "",
    awayTeam: away.team?.location ?? "",
    homePoints: pts(home),
    awayPoints: pts(away),
    timeValid: c.timeValid !== false,
  };
  return g.homeTeam && g.awayTeam ? g : null;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

/**
 * Tennessee's games: the team schedule once ESPN publishes it, otherwise the
 * daily scoreboards for the lookahead window (ESPN lists a game on the
 * scoreboard well before the team schedule page has the new season).
 */
async function fetchSchedule(league: League): Promise<BbGame[] | null> {
  const ESPN_BASE = league.base;
  const now = new Date();
  const seasonYear = now.getUTCMonth() >= 6 ? now.getUTCFullYear() + 1 : now.getUTCFullYear(); // 2026-27 season = 2027

  // seasontype is required: without it ESPN returns only preseason/empty for a new season.
  // 2 = regular season (incl. conference games), 3 = postseason (empty until it's set).
  const scheds = await Promise.all(
    [2, 3].map((t) => espnGet(`${ESPN_BASE}/teams/${TENNESSEE_ESPN_ID}/schedule?season=${seasonYear}&seasontype=${t}`))
  );
  const fromTeam: BbGame[] = scheds
    .flatMap((sc) => sc?.events ?? [])
    .map(parseEvent)
    .filter((g: BbGame | null): g is BbGame => !!g);

  // ESPN's basketball scoreboard rejects date ranges (HTTP 400), so scan one
  // day at a time, in parallel. groups=50 is Division I.
  const days: string[] = [];
  for (let i = -2; i <= LOOKAHEAD_DAYS; i++) days.push(ymd(new Date(now.getTime() + i * 86400000)));
  const boards = await Promise.all(days.map((d) => espnGet(`${ESPN_BASE}/scoreboard?dates=${d}&groups=50&limit=400`)));
  if (boards.every((b) => b === null) && fromTeam.length === 0) return null;
  const fromBoard: BbGame[] = boards
    .flatMap((b) => b?.events ?? [])
    .filter((e: Json) => e.competitions?.[0]?.competitors?.some((c: Json) => c.team?.id === TENNESSEE_ESPN_ID))
    .map(parseEvent)
    .filter((g: BbGame | null): g is BbGame => !!g);

  const byId = new Map<number, BbGame>();
  for (const g of fromTeam) byId.set(g.id, g);
  for (const g of fromBoard) byId.set(g.id, g); // the scoreboard is fresher for games in the window
  return [...byId.values()];
}

async function syncSchedule(supabase: Client, league: League) {
  const schedule = await fetchSchedule(league);
  if (!schedule) return { ok: false as const, error: "ESPN schedule unavailable" };

  const now = Date.now();
  const relevant = schedule.filter((g) => !g.canceled);
  if (relevant.length === 0) return { ok: true as const, created: 0, updated: 0, skipped: 0 };

  const { data: existingRows } = await supabase
    .from("live_games")
    .select("cfbd_game_id, status")
    .eq("sport", league.sport)
    .in("cfbd_game_id", relevant.map((g) => g.id));
  const existing = new Map<number, string>(
    ((existingRows ?? []) as { cfbd_game_id: number; status: string }[]).map((r) => [r.cfbd_game_id, r.status])
  );

  let created = 0, updated = 0, skipped = 0;
  for (const g of relevant) {
    const st = existing.get(g.id);
    if (st === "calculated") {
      skipped++;
      continue;
    }
    if (st === undefined) {
      const { error } = await supabase.from("live_games").insert({
        cfbd_game_id: g.id,
        sport: league.sport,
        home_team: g.homeTeam,
        away_team: g.awayTeam,
        kickoff_time: g.startDate,
        status: g.completed ? "final" : new Date(g.startDate).getTime() <= now ? "live" : "pregame",
        home_score: g.homePoints ?? 0,
        away_score: g.awayPoints ?? 0,
        updated_at: new Date().toISOString(),
      });
      if (error) console.error(`bb-game-sync: insert failed for ${g.id}: ${error.message}`);
      else created++;
      continue;
    }
    // Existing game: keep the kickoff time current, and record a final the live
    // sync may have missed. Never touch a live game's status or score here.
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (g.timeValid && st === "pregame") update.kickoff_time = g.startDate;
    if (g.completed && st !== "final") {
      update.status = "final";
      update.home_score = g.homePoints ?? 0;
      update.away_score = g.awayPoints ?? 0;
    }
    const { error } = await supabase.from("live_games").update(update).eq("sport", league.sport).eq("cfbd_game_id", g.id);
    if (error) console.error(`bb-game-sync: update failed for ${g.id}: ${error.message}`);
    else updated++;
  }
  return { ok: true as const, created, updated, skipped };
}

/**
 * Line from ESPN's pickcenter (DraftKings first). `spread` is HOME-relative,
 * negative = home favored. Trusted only when the provider's home-favorite flag
 * agrees with the sign; otherwise null (an admin can pin a line with
 * lines_manual — see keep_manual_lines()).
 */
async function lineFromEspn(base: string, eventId: number): Promise<{ spread: number; overUnder: number | null; provider: string } | null> {
  const d = await espnGet(`${base}/summary?event=${eventId}`);
  const picks: Json[] = d?.pickcenter ?? [];
  const pick = picks.find((p) => p.provider?.name === "DraftKings" && typeof p.spread === "number")
    ?? picks.find((p) => typeof p.spread === "number");
  if (!pick) return null;
  const homeFav = pick.homeTeamOdds?.favorite;
  if (typeof homeFav === "boolean" && ((pick.spread < 0 && !homeFav) || (pick.spread > 0 && homeFav))) return null;
  return {
    spread: pick.spread,
    overUnder: typeof pick.overUnder === "number" ? pick.overUnder : null,
    provider: pick.provider?.name ?? "ESPN",
  };
}

async function refreshLines(supabase: Client, league: League) {
  const soon = new Date(Date.now() + LINE_LOOKAHEAD_MS).toISOString();
  const { data } = await supabase
    .from("live_games")
    .select("id, cfbd_game_id, home_team, lines_manual, total_points_line")
    .eq("sport", league.sport)
    .eq("status", "pregame")
    .lte("kickoff_time", soon);
  const games = (data ?? []) as { id: string; cfbd_game_id: number; home_team: string; lines_manual: boolean | null; total_points_line: number | null }[];

  let refreshed = 0, pinned = 0;
  const missing: string[] = [];
  for (const g of games) {
    if (g.lines_manual) {
      pinned++;
      continue;
    }
    const line = await lineFromEspn(league.base, g.cfbd_game_id);
    if (!line) {
      if (g.total_points_line == null) missing.push(`${g.cfbd_game_id} (${g.home_team})`);
      continue;
    }
    const spreadTn = g.home_team === "Tennessee" ? line.spread : -line.spread;
    const { error } = await supabase
      .from("live_games")
      .update({
        spread_line_tn: spreadTn,
        total_points_line: line.overUnder,
        lines_provider: `${line.provider} (ESPN)`,
        lines_captured_at: new Date().toISOString(),
      })
      .eq("id", g.id);
    if (!error) refreshed++;
  }
  return { checked: games.length, refreshed, pinned, missing };
}

Deno.serve(async (_req: Request) => {
  const supabase = getSupabaseClient();
  try {
    const results: Record<string, unknown> = {};
    let ok = true;
    for (const league of LEAGUES) {
      const schedule = await syncSchedule(supabase, league);
      const lines = await refreshLines(supabase, league);
      results[league.sport] = { ...schedule, lines };
      if (!schedule.ok) ok = false;
    }
    return json({ ok, ...results }, ok ? 200 : 502);
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
});
