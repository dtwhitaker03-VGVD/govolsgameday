import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CFBD_BASE = "https://api.collegefootballdata.com";

// How far ahead of kickoff a game gets a live_games row — generous margin
// around the weekly sync windows below, not a tuning knob for call cost
// (this job only ever calls CFBD twice a week regardless).
const SYNC_WINDOW_MS = 21 * 24 * 60 * 60 * 1000;

interface CfbdGame {
  id: number;
  startDate: string;
  completed: boolean;
  homeTeam: string;
  awayTeam: string;
  homePoints: number | null;
  awayPoints: number | null;
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

type SyncWindow = "weekly-upcoming" | "post-game-final" | null;

/**
 * Real CFBD calls only happen twice a week, gated on the current time in
 * America/New_York (so this stays correct across the DST change that
 * lands mid-season, unlike a fixed UTC cron time would):
 *  - Monday 12:00 AM ET ("weekly-upcoming"): pulls in the upcoming week's
 *    game (pregame row) and refreshes the homepage banner's cache.
 *  - Saturday 11:00 PM ET ("post-game-final"): by then essentially every
 *    game has ended, so this locks in the real final score in live_games
 *    for display through Sunday. It doesn't touch the banner cache — the
 *    final-score display reads live_games directly, not that cache, so
 *    refreshing it here would just prematurely show next week's game.
 * The cron that invokes this function still fires hourly, but every tick
 * outside those two windows is a no-op — no CFBD call, no writes.
 */
function getSyncWindow(): SyncWindow {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  if (weekday === "Mon" && hour === 0) return "weekly-upcoming";
  if (weekday === "Sat" && hour === 23) return "post-game-final";
  return null;
}

/** Upserts one game, skipping it entirely once it's already 'calculated'. */
async function upsertGame(
  supabase: Client,
  g: CfbdGame,
  existingStatus: string | undefined
): Promise<"created" | "updated" | "skipped" | "error"> {
  if (existingStatus === "calculated") return "skipped";

  const now = Date.now();
  const kickoff = new Date(g.startDate).getTime();
  const status = g.completed ? "final" : kickoff <= now ? "live" : "pregame";

  const { error } = await supabase.from("live_games").upsert(
    {
      cfbd_game_id: g.id,
      home_team: g.homeTeam,
      away_team: g.awayTeam,
      kickoff_time: g.startDate,
      status,
      home_score: g.homePoints ?? 0,
      away_score: g.awayPoints ?? 0,
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

async function syncFromCfbd(supabase: Client, apiKey: string) {
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
    return new Date(g.startDate).getTime() - now < SYNC_WINDOW_MS;
  });

  if (relevant.length === 0) {
    return { ok: true as const, created: 0, updated: 0, skipped: 0 };
  }

  const existing = await existingStatusFor(supabase, relevant.map((g) => g.id));
  let created = 0, updated = 0, skipped = 0;

  for (const g of relevant) {
    const outcome = await upsertGame(supabase, g, existing.get(g.id));
    if (outcome === "created") created++;
    else if (outcome === "updated") updated++;
    else if (outcome === "skipped") skipped++;
  }

  return { ok: true as const, created, updated, skipped };
}

/**
 * Keeps cfbd-proxy's cache (and therefore the homepage's Upcoming Game
 * banner) refreshed on this same twice-weekly schedule, instead of it
 * making its own separate CFBD calls whenever site traffic finds its
 * cache stale. cfbd-proxy only honors "force" for this service-role
 * -authenticated call — a public caller can't trigger a real API call.
 */
async function refreshUpcomingCache(serviceKey: string) {
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/cfbd-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ type: "upcoming", force: true }),
    });
  } catch (err) {
    console.error(`game-sync: cfbd-proxy refresh failed: ${err}`);
  }
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
 */
Deno.serve(async (_req: Request) => {
  const window = getSyncWindow();
  if (!window) {
    return json({ ok: true, skipped: "not a sync window" });
  }

  const supabase = getSupabaseClient();

  try {
    const apiKey = Deno.env.get("CFBC_API_KEY");
    if (!apiKey) {
      await reportHealth(supabase, "stalled");
      return json({ error: "CFBD API key not configured" }, 500);
    }

    const result = await syncFromCfbd(supabase, apiKey);

    if (window === "weekly-upcoming") {
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (serviceKey) await refreshUpcomingCache(serviceKey);
    }

    await reportHealth(supabase, result.ok ? "healthy" : "stalled");
    return json({ ...result, window }, result.ok ? 200 : 502);
  } catch (err) {
    await reportHealth(supabase, "stalled");
    return json({ error: String(err) }, 500);
  }
});
