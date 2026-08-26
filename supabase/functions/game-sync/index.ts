import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CFBD_BASE = "https://api.collegefootballdata.com";

// How far ahead of kickoff a game gets a live_games row so predictions can
// open early. Games further out than this are ignored — no need to hold a
// row (and re-fetch it every run) for a game months away.
const SYNC_WINDOW_MS = 21 * 24 * 60 * 60 * 1000;

// cfbd-proxy already fetches + caches the upcoming game for the homepage
// banner (cfbd_cache, key "upcoming_game"). Reusing that cache — instead of
// making our own CFBD call every run — means this job costs zero extra API
// calls whenever any site traffic has kept that cache warm. Matches
// cfbd-proxy's own TTL so we never read something it would itself refetch.
const SHARED_CACHE_TTL_SECONDS = 6 * 60 * 60;

interface CfbdGame {
  id: number;
  start_date: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  home_points: number | null;
  away_points: number | null;
}

interface CachedUpcomingPayload {
  upcoming: {
    game: { id: number; date: string; homeTeam: string; awayTeam: string };
  } | null;
}

type Client = ReturnType<typeof createClient>;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getSupabaseClient(): Client {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function reportHealth(supabase: Client, status: "healthy" | "stalled") {
  await supabase.from("system_health").upsert(
    { source_name: "game_sync", last_successful_run: new Date().toISOString(), status },
    { onConflict: "source_name" }
  );
}

/** Upserts one game, skipping it entirely once it's already 'calculated'. */
async function upsertGame(
  supabase: Client,
  g: CfbdGame,
  existingStatus: string | undefined
): Promise<"created" | "updated" | "skipped" | "error"> {
  if (existingStatus === "calculated") return "skipped";

  const now = Date.now();
  const kickoff = new Date(g.start_date).getTime();
  const status = g.completed ? "final" : kickoff <= now ? "live" : "pregame";

  const { error } = await supabase.from("live_games").upsert(
    {
      cfbd_game_id: g.id,
      home_team: g.home_team,
      away_team: g.away_team,
      kickoff_time: g.start_date,
      status,
      home_score: g.home_points ?? 0,
      away_score: g.away_points ?? 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "cfbd_game_id" }
  );

  if (error) {
    console.error(`game-sync: upsert failed for cfbd_game_id=${g.id}: ${error.message}`);
    return "error";
  }
  return existingStatus === undefined ? "created" : "updated";
}

async function existingStatusFor(supabase: Client, gameIds: number[]): Promise<Map<number, string>> {
  if (gameIds.length === 0) return new Map();
  const { data } = await supabase
    .from("live_games")
    .select("cfbd_game_id, status")
    .in("cfbd_game_id", gameIds);
  return new Map(((data as { cfbd_game_id: number; status: string }[]) ?? []).map((r) => [r.cfbd_game_id, r.status]));
}

/** Path 1: piggyback on cfbd-proxy's existing cache — zero CFBD calls. */
async function tryFromSharedCache(supabase: Client) {
  const { data } = await supabase
    .from("cfbd_cache")
    .select("payload, fetched_at")
    .eq("cache_key", "upcoming_game")
    .maybeSingle();

  if (!data) return null;
  const ageSeconds = (Date.now() - new Date(data.fetched_at as string).getTime()) / 1000;
  if (ageSeconds >= SHARED_CACHE_TTL_SECONDS) return null;

  const game = (data.payload as CachedUpcomingPayload)?.upcoming?.game;
  if (!game) return null;

  const existing = await existingStatusFor(supabase, [game.id]);
  const outcome = await upsertGame(
    supabase,
    {
      id: game.id,
      start_date: game.date,
      completed: false, // "upcoming" cache only ever holds a not-yet-played game
      home_team: game.homeTeam,
      away_team: game.awayTeam,
      home_points: null,
      away_points: null,
    },
    existing.get(game.id)
  );

  return { source: "cache" as const, created: outcome === "created" ? 1 : 0, updated: outcome === "updated" ? 1 : 0, skipped: outcome === "skipped" ? 1 : 0 };
}

/** Path 2: fallback when the shared cache is stale/missing — one direct CFBD call. */
async function syncFromCfbdDirect(supabase: Client, apiKey: string) {
  const year = new Date().getFullYear();
  const res = await fetch(
    `${CFBD_BASE}/games?year=${year}&team=Tennessee&seasonType=regular&division=fbs`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );

  if (!res.ok) {
    return { ok: false as const, error: `CFBD API returned HTTP ${res.status}` };
  }

  const schedule = (await res.json()) as CfbdGame[];
  const now = Date.now();
  const relevant = schedule.filter((g) => {
    if (g.completed) return true;
    return new Date(g.start_date).getTime() - now < SYNC_WINDOW_MS;
  });

  if (relevant.length === 0) {
    return { ok: true as const, source: "cfbd" as const, created: 0, updated: 0, skipped: 0 };
  }

  const existing = await existingStatusFor(supabase, relevant.map((g) => g.id));
  let created = 0, updated = 0, skipped = 0;

  for (const g of relevant) {
    const outcome = await upsertGame(supabase, g, existing.get(g.id));
    if (outcome === "created") created++;
    else if (outcome === "updated") updated++;
    else if (outcome === "skipped") skipped++;
  }

  return { ok: true as const, source: "cfbd" as const, created, updated, skipped };
}

/**
 * Keeps live_games in sync with Tennessee Football's real CFBD schedule so
 * the pregame predictor has a row to attach picks to without anyone
 * manually re-creating it via the Admin Dashboard every week.
 *
 * Scope: creates/updates the game's status (pregame → live → final) and
 * final score. It deliberately does NOT touch a game once its status is
 * 'calculated' (finalize_game() already ran — points/badges are awarded,
 * and re-syncing must never disturb that), and it does NOT auto-invoke
 * finalize_game() itself — scoring predictions and crediting real points
 * stays a deliberate admin action (the "Finalize Game" button). It also
 * does NOT track live in-game detail (quarter/clock/down/distance/
 * possession) — CFBD's schedule endpoint doesn't carry that; the Admin
 * Dashboard's existing "Update Game Status" / drive-window tools remain
 * how that gets entered during a live game.
 *
 * API usage: tries the cache cfbd-proxy already maintains first (free);
 * only makes its own CFBD call as a fallback when that cache is stale,
 * which only happens if no one has visited the site in the last several
 * hours.
 */
Deno.serve(async (_req: Request) => {
  const supabase = getSupabaseClient();

  try {
    const cached = await tryFromSharedCache(supabase);
    if (cached) {
      await reportHealth(supabase, "healthy");
      return json({ ok: true, ...cached });
    }

    const apiKey = Deno.env.get("CFBC_API_KEY");
    if (!apiKey) {
      await reportHealth(supabase, "stalled");
      return json({ error: "CFBD API key not configured" }, 500);
    }

    const result = await syncFromCfbdDirect(supabase, apiKey);
    await reportHealth(supabase, result.ok ? "healthy" : "stalled");
    return json(result, result.ok ? 200 : 502);
  } catch (err) {
    await reportHealth(supabase, "stalled");
    return json({ error: String(err) }, 500);
  }
});
