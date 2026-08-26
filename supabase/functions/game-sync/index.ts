import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CFBD_BASE = "https://api.collegefootballdata.com";

// How far ahead of kickoff a game gets a live_games row so predictions can
// open early. Games further out than this are ignored — no need to hold a
// row (and re-fetch it every run) for a game months away.
const SYNC_WINDOW_MS = 21 * 24 * 60 * 60 * 1000;

interface CfbdGame {
  id: number;
  start_date: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  home_points: number | null;
  away_points: number | null;
}

interface ExistingRow {
  cfbd_game_id: number;
  status: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function reportHealth(
  supabase: ReturnType<typeof getSupabaseClient>,
  status: "healthy" | "stalled"
) {
  await supabase.from("system_health").upsert(
    {
      source_name: "game_sync",
      last_successful_run: new Date().toISOString(),
      status,
    },
    { onConflict: "source_name" }
  );
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
  const apiKey = Deno.env.get("CFBC_API_KEY");
  const supabase = getSupabaseClient();

  if (!apiKey) {
    await reportHealth(supabase, "stalled");
    return json({ error: "CFBD API key not configured" }, 500);
  }

  try {
    const year = new Date().getFullYear();
    const res = await fetch(
      `${CFBD_BASE}/games?year=${year}&team=Tennessee&seasonType=regular&division=fbs`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    if (!res.ok) {
      await reportHealth(supabase, "stalled");
      return json({ error: `CFBD API returned HTTP ${res.status}` }, 502);
    }

    const schedule = (await res.json()) as CfbdGame[];
    const now = Date.now();

    const relevant = schedule.filter((g) => {
      if (g.completed) return true;
      const kickoff = new Date(g.start_date).getTime();
      return kickoff - now < SYNC_WINDOW_MS;
    });

    if (relevant.length === 0) {
      await reportHealth(supabase, "healthy");
      return json({ ok: true, created: 0, updated: 0, skipped: 0 });
    }

    const { data: existingRows } = await supabase
      .from("live_games")
      .select("cfbd_game_id, status")
      .in("cfbd_game_id", relevant.map((g) => g.id));

    const existingByGameId = new Map(
      ((existingRows as ExistingRow[]) ?? []).map((r) => [r.cfbd_game_id, r.status])
    );

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const g of relevant) {
      const existingStatus = existingByGameId.get(g.id);

      // Never touch a game that's already been manually finalized.
      if (existingStatus === "calculated") {
        skipped++;
        continue;
      }

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
        continue;
      }

      existingStatus === undefined ? created++ : updated++;
    }

    await reportHealth(supabase, "healthy");
    return json({ ok: true, created, updated, skipped });
  } catch (err) {
    await reportHealth(supabase, "stalled");
    return json({ error: String(err) }, 500);
  }
});
