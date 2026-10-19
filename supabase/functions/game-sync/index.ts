import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CFBD_BASE = "https://api.collegefootballdata.com";

// How far ahead of kickoff a game gets a live_games row — generous margin
// around the weekly sync windows below, not a tuning knob for call cost
// (the full schedule sync below only ever calls CFBD twice a week
// regardless; see getSyncWindow for the separate, lighter betting-line
// check that runs a third time midweek).
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

interface CfbdLineEntry {
  provider: string;
  spread: number | null;
  overUnder: number | null;
}
interface CfbdGameLines {
  id: number;
  homeTeam: string;
  awayTeam: string;
  lines: CfbdLineEntry[];
}

type Client = ReturnType<typeof createClient>;

// ─── ESPN source (free, no key) ──────────────────────────────────────────────
// ESPN is tried first for the schedule and the betting lines; CFBD is the
// fallback when ESPN fails or has nothing. ESPN's event ids are the same
// numbers as CFBD's game ids (live_games.cfbd_game_id) and its team
// "location" strings match the names already stored (e.g. "Georgia Tech",
// "Kennesaw State"), so existing rows line up with no remapping.
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/football/college-football";
const ESPN_HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; GoVolsGameDay/1.0)", Accept: "application/json" };
const TENNESSEE_ESPN_ID = 2633;

interface ScheduleGame extends CfbdGame {
  timeValid: boolean;
}

// deno-lint-ignore no-explicit-any
type Json = any;

async function espnGet(url: string): Promise<Json | null> {
  try {
    const res = await fetch(url, { headers: ESPN_HEADERS });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Tennessee's regular-season schedule from ESPN, in the shape syncSchedule uses. */
async function scheduleFromEspn(year: number): Promise<ScheduleGame[] | null> {
  const d = await espnGet(`${ESPN_BASE}/teams/${TENNESSEE_ESPN_ID}/schedule?season=${year}&seasontype=2`);
  const events: Json[] | undefined = d?.events;
  if (!Array.isArray(events) || events.length === 0) return null;

  const games: ScheduleGame[] = [];
  for (const e of events) {
    const c = e.competitions?.[0];
    const home = c?.competitors?.find((x: Json) => x.homeAway === "home");
    const away = c?.competitors?.find((x: Json) => x.homeAway === "away");
    const id = Number(e.id);
    if (!c || !home || !away || !Number.isFinite(id) || !e.date) return null; // unexpected shape: let CFBD handle it
    const pts = (x: Json) => {
      const v = typeof x.score === "object" ? x.score?.value : x.score;
      const n = Number(v);
      return v == null || !Number.isFinite(n) ? null : n;
    };
    games.push({
      id,
      startDate: new Date(e.date).toISOString(),
      completed: c.status?.type?.completed === true,
      homeTeam: home.team?.location ?? "",
      awayTeam: away.team?.location ?? "",
      homePoints: pts(home),
      awayPoints: pts(away),
      timeValid: c.timeValid !== false,
    });
  }
  return games.every((g) => g.homeTeam && g.awayTeam) ? games : null;
}

/**
 * Betting line for one game from ESPN's pickcenter (DraftKings, usually).
 * `spread` is HOME-relative, negative = home favored — same convention as
 * CFBD. It is only trusted when the provider's own home-favorite flag agrees
 * with the sign; anything inconsistent returns null so CFBD (or a manual
 * line) is used instead of guessing.
 */
async function lineFromEspn(eventId: number): Promise<{ spread: number | null; overUnder: number | null; provider: string } | null> {
  const d = await espnGet(`${ESPN_BASE}/summary?event=${eventId}`);
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

type SyncWindow = "weekly-upcoming" | "midweek-line-check" | "post-game-final" | null;

/**
 * Real CFBD calls only happen three times a week, gated on the current time
 * in America/New_York (so this stays correct across the DST change that
 * lands mid-season, unlike a fixed UTC cron time would):
 *  - Monday 12:00 AM ET ("weekly-upcoming"): pulls in the upcoming week's
 *    game (pregame row), refreshes the homepage banner's cache, and checks
 *    for a betting line.
 *  - Wednesday 12:00 AM ET ("midweek-line-check"): betting-line check only
 *    — catches a line that wasn't posted yet on Monday, or has moved since,
 *    without polling CFBD hourly for something that doesn't need to be
 *    real-time.
 *  - Saturday 11:00 PM ET ("post-game-final"): by then essentially every
 *    game has ended, so this locks in the real final score in live_games
 *    for display through Sunday, and also checks the line (a no-op for any
 *    game that already kicked off). It doesn't touch the banner cache — the
 *    final-score display reads live_games directly, not that cache, so
 *    refreshing it here would just prematurely show next week's game.
 * The cron that invokes this function still fires hourly, but every tick
 * outside these three windows is a no-op — no CFBD call, no writes.
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
  if (weekday === "Wed" && hour === 0) return "midweek-line-check";
  if (weekday === "Sat" && hour === 23) return "post-game-final";
  return null;
}

/**
 * Creates or updates one game, skipping it entirely once it's already
 * 'calculated'. An existing row keeps its stored team names (and its
 * kickoff time when the source says the time isn't set yet); a new row is
 * inserted and takes the column default for data_source (ESPN).
 */
async function upsertGame(
  supabase: Client,
  g: ScheduleGame,
  existingStatus: string | undefined
): Promise<"created" | "updated" | "skipped" | "error"> {
  if (existingStatus === "calculated") return "skipped";

  const now = Date.now();
  const kickoff = new Date(g.startDate).getTime();
  const status = g.completed ? "final" : kickoff <= now ? "live" : "pregame";

  if (existingStatus === undefined) {
    const { error } = await supabase.from("live_games").insert({
      cfbd_game_id: g.id,
      home_team: g.homeTeam,
      away_team: g.awayTeam,
      kickoff_time: g.startDate,
      status,
      home_score: g.homePoints ?? 0,
      away_score: g.awayPoints ?? 0,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error(`game-sync: insert failed for cfbd_game_id=${g.id}: ${error.message}`);
      return "error";
    }
    return "created";
  }

  const update: Record<string, unknown> = {
    status,
    home_score: g.homePoints ?? 0,
    away_score: g.awayPoints ?? 0,
    updated_at: new Date().toISOString(),
  };
  if (g.timeValid) update.kickoff_time = g.startDate;
  const { error } = await supabase.from("live_games").update(update).eq("cfbd_game_id", g.id);
  if (error) {
    console.error(`game-sync: update failed for cfbd_game_id=${g.id}: ${error.message}`);
    return "error";
  }
  return "updated";
}

async function existingStatusFor(supabase: Client, gameIds: number[]): Promise<Map<number, string>> {
  if (gameIds.length === 0) return new Map();
  const { data } = await supabase
    .from("live_games")
    .select("cfbd_game_id, status")
    .in("cfbd_game_id", gameIds);
  return new Map(((data as { cfbd_game_id: number; status: string }[]) ?? []).map((r) => [r.cfbd_game_id, r.status]));
}

async function syncSchedule(supabase: Client, apiKey: string | undefined) {
  const year = new Date().getFullYear();

  let source: "espn" | "cfbd" = "espn";
  let schedule = await scheduleFromEspn(year);
  if (!schedule) {
    // ESPN failed or looked wrong — fall back to CFBD.
    if (!apiKey) return { ok: false as const, error: "ESPN schedule unavailable and no CFBD API key configured" };
    source = "cfbd";
    const res = await fetch(
      `${CFBD_BASE}/games?year=${year}&team=Tennessee&seasonType=regular&division=fbs`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!res.ok) {
      return { ok: false as const, error: `ESPN schedule unavailable; CFBD API returned HTTP ${res.status}` };
    }
    schedule = ((await res.json()) as CfbdGame[]).map((g) => ({ ...g, timeValid: true }));
  }

  const now = Date.now();
  const relevant = schedule.filter((g) => {
    if (g.completed) return true;
    return new Date(g.startDate).getTime() - now < SYNC_WINDOW_MS;
  });

  if (relevant.length === 0) {
    return { ok: true as const, source, created: 0, updated: 0, skipped: 0 };
  }

  const existing = await existingStatusFor(supabase, relevant.map((g) => g.id));
  let created = 0, updated = 0, skipped = 0;

  for (const g of relevant) {
    const outcome = await upsertGame(supabase, g, existing.get(g.id));
    if (outcome === "created") created++;
    else if (outcome === "updated") updated++;
    else if (outcome === "skipped") skipped++;
  }

  return { ok: true as const, source, created, updated, skipped };
}

const PREFERRED_LINE_PROVIDERS = ["DraftKings", "consensus"];

function pickLine(lines: CfbdLineEntry[]): CfbdLineEntry | null {
  for (const name of PREFERRED_LINE_PROVIDERS) {
    const hit = lines.find((l) => l.provider === name && l.spread != null);
    if (hit) return hit;
  }
  return lines.find((l) => l.spread != null) ?? null;
}

/**
 * Betting-line check for every currently-pregame game — called only from
 * inside one of the three weekly sync windows (see getSyncWindow), not on
 * every hourly tick: a betting line doesn't need to be caught in real time,
 * so there's no separate staleness/lookahead tracking here — Monday,
 * Wednesday, and Saturday simply each re-fetch and overwrite whatever CFBD
 * currently reports for every pregame game.
 */
async function refreshLinesForUpcomingGames(supabase: Client, apiKey: string | undefined) {
  const { data: candidates } = await supabase
    .from("live_games")
    .select("id, cfbd_game_id, home_team, lines_manual")
    .eq("status", "pregame");

  const games = (candidates ?? []) as { id: string; cfbd_game_id: number; home_team: string; lines_manual: boolean | null }[];
  if (games.length === 0) {
    return { checked: 0, refreshed: 0 };
  }

  let refreshed = 0, viaEspn = 0, viaCfbd = 0, pinned = 0;
  for (const g of games) {
    // An admin pinned this game's lines (see lines_manual) — leave them be.
    if (g.lines_manual) {
      pinned++;
      continue;
    }
    try {
      let line = await lineFromEspn(g.cfbd_game_id);
      let source: "espn" | "cfbd" = "espn";

      if (!line && apiKey) {
        const res = await fetch(`${CFBD_BASE}/lines?gameId=${g.cfbd_game_id}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.ok) {
          const arr = (await res.json()) as CfbdGameLines[];
          const chosen = arr[0] ? pickLine(arr[0].lines ?? []) : null;
          if (chosen) {
            line = { spread: chosen.spread, overUnder: chosen.overUnder, provider: chosen.provider };
            source = "cfbd";
          }
        }
      }
      if (!line) continue;

      // Normalize to TN-relative (negative = TN favored). Both sources give a
      // home-team-relative spread, so flip the sign when TN is the away team.
      const spreadTnRelative =
        g.home_team === "Tennessee"
          ? line.spread
          : line.spread == null ? null : -line.spread;

      await supabase
        .from("live_games")
        .update({
          spread_line_tn: spreadTnRelative,
          total_points_line: line.overUnder,
          lines_provider: `${line.provider}${source === "espn" ? " (ESPN)" : ""}`,
          lines_captured_at: new Date().toISOString(),
        })
        .eq("id", g.id);
      refreshed++;
      if (source === "espn") viaEspn++; else viaCfbd++;
    } catch (err) {
      console.error(`game-sync: line refresh failed for cfbd_game_id=${g.cfbd_game_id}: ${err}`);
    }
  }
  return { checked: games.length, refreshed, viaEspn, viaCfbd, pinned };
}

/**
 * Keeps cfbd-data's cache (and therefore the homepage's Upcoming Game
 * banner) refreshed on this same twice-weekly schedule, instead of it
 * making its own separate CFBD calls whenever site traffic finds its
 * cache stale. cfbd-data only honors "force" for this service-role
 * -authenticated call — a public caller can't trigger a real API call.
 */
async function refreshUpcomingCache(serviceKey: string) {
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/cfbd-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ type: "upcoming", force: true }),
    });
  } catch (err) {
    console.error(`game-sync: cfbd-data refresh failed: ${err}`);
  }
}

/**
 * Keeps live_games in sync with Tennessee Football's real schedule (ESPN first, CFBD fallback) so
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
Deno.serve(async (req: Request) => {
  const supabase = getSupabaseClient();
  const apiKey = Deno.env.get("CFBC_API_KEY");
  let body: { force?: boolean } = {};
  try { body = await req.json(); } catch { /* empty body */ }
  // `force` lets an admin manually trigger a full sync (schedule + lines)
  // outside the three weekly windows — e.g. to backfill a missed run —
  // without opening up real-time CFBD polling. The hourly cron always
  // calls with an empty body, so this never affects its normal cadence.
  const window = getSyncWindow() ?? (body.force ? "weekly-upcoming" : null);

  if (!window) {
    return json({ ok: true, skipped: "not a sync window" });
  }

  // Betting-line check runs inside all three weekly windows (Mon/Wed/Sat) —
  // see refreshLinesForUpcomingGames.
  const linesResult: unknown = await refreshLinesForUpcomingGames(supabase, apiKey).catch((err) => ({ error: String(err) }));

  if (window === "midweek-line-check") {
    return json({ ok: true, window, lines: linesResult });
  }

  try {
    const result = await syncSchedule(supabase, apiKey);

    if (window === "weekly-upcoming") {
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (serviceKey) await refreshUpcomingCache(serviceKey);
    }

    await reportHealth(supabase, result.ok ? "healthy" : "stalled");
    return json({ ...result, window, lines: linesResult }, result.ok ? 200 : 502);
  } catch (err) {
    await reportHealth(supabase, "stalled");
    return json({ error: String(err) }, 500);
  }
});
