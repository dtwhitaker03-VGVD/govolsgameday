import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// WBB SCHEDULE SYNC: keeps womens_basketball_games in step with Tennessee
// women's basketball's ESPN schedule (the full season, regular + postseason).
// Display-only for now: women's basketball has no prediction pipeline, so
// these rows are not in live_games. Runs daily (pg_cron -> invoke_wbb_schedule_sync).

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/womens-college-basketball";
const ESPN_HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; GoVolsGameDay/1.0)", Accept: "application/json" };
const TENNESSEE_ESPN_ID = "2633";

// deno-lint-ignore no-explicit-any
type Json = any;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

async function espnGet(url: string): Promise<Json | null> {
  try {
    const res = await fetch(url, { headers: ESPN_HEADERS });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

function parseEvent(e: Json) {
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
  const status = /CANCEL|POSTPONED/i.test(statusName)
    ? "canceled"
    : c.status?.type?.completed === true ? "final"
    : c.status?.type?.state === "in" ? "live" : "pregame";
  return {
    espn_id: id,
    kickoff_time: new Date(e.date).toISOString(),
    time_valid: c.timeValid !== false,
    home_team: home.team?.location ?? "",
    away_team: away.team?.location ?? "",
    home_score: pts(home),
    away_score: pts(away),
    status,
    updated_at: new Date().toISOString(),
  };
}

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date();
    const seasonYear = now.getUTCMonth() >= 6 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
    const scheds = await Promise.all(
      [2, 3].map((t) => espnGet(`${ESPN_BASE}/teams/${TENNESSEE_ESPN_ID}/schedule?season=${seasonYear}&seasontype=${t}`))
    );
    if (scheds.every((s) => s === null)) return json({ ok: false, error: "ESPN schedule unavailable" }, 502);
    const rows = scheds
      .flatMap((s) => s?.events ?? [])
      .map(parseEvent)
      .filter((r: ReturnType<typeof parseEvent>): r is NonNullable<ReturnType<typeof parseEvent>> => !!r && !!r.home_team && !!r.away_team);
    if (rows.length === 0) return json({ ok: true, upserted: 0 });
    const { error } = await supabase.from("womens_basketball_games").upsert(rows, { onConflict: "espn_id" });
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true, upserted: rows.length });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
});
