import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// CFP RANKINGS SYNC. The College Football Playoff committee releases its rankings
// on Tuesday evenings (by 9 PM Central) in November and early December. This checks
// ESPN's rankings feed for the committee poll and, when the poll is new or has
// changed since the last check, refreshes everything on the site that shows it:
//   - cfbd-data's cached upcoming-game payload (the top Upcoming Game card's "CFP Ranking" row)
//   - the generated game previews (game-preview-generate)
// Idempotent: an unchanged poll is a cheap no-op. pg_cron calls it every 10 minutes
// on Tuesday evening Central, plus once a day as a catch-up (see the migration).
// Body: { force?: true } refreshes even when the poll hasn't changed.

const ESPN_RANKINGS = "https://site.api.espn.com/apis/site/v2/sports/football/college-football/rankings";
const CACHE_KEY = "cfp_rankings";
const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; GoVolsGameDay/1.0)", Accept: "application/json" };

const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { "Content-Type": "application/json" } });

async function call(fn: string, body: unknown, serviceKey: string): Promise<number> {
  try {
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });
    return res.status;
  } catch {
    return 0;
  }
}

Deno.serve(async (req: Request) => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  let force = false;
  try { force = (await req.json())?.force === true; } catch { /* empty body */ }

  let d;
  try {
    const res = await fetch(ESPN_RANKINGS, { headers: HEADERS });
    if (!res.ok) return json({ ok: false, error: `ESPN HTTP ${res.status}` }, 502);
    d = await res.json();
  } catch (e) {
    return json({ ok: false, error: String(e) }, 502);
  }

  // deno-lint-ignore no-explicit-any
  const poll = (d.rankings ?? []).find((r: any) => r.type === "cfp" || r.name === "Playoff Committee Rankings");
  if (!poll?.ranks?.length) return json({ ok: true, changed: false, reason: "no CFP poll published yet" });

  const week: string | null = poll.occurrence?.displayValue ?? null;
  // deno-lint-ignore no-explicit-any
  const ranks = poll.ranks.map((r: any) => [r.current, r.team?.id]);
  const signature = JSON.stringify({ week, ranks });

  const { data: prev } = await supabase.from("cfbd_cache").select("payload").eq("cache_key", CACHE_KEY).maybeSingle();
  if (!force && (prev?.payload as { signature?: string } | undefined)?.signature === signature) {
    return json({ ok: true, changed: false, week });
  }

  await supabase.from("cfbd_cache").upsert(
    { cache_key: CACHE_KEY, payload: { signature, week, ranks, updated_at: new Date().toISOString() }, fetched_at: new Date().toISOString() },
    { onConflict: "cache_key" },
  );

  const upcoming = await call("cfbd-data", { type: "upcoming", force: true }, serviceKey);
  const previews = await call("game-preview-generate", {}, serviceKey);
  return json({ ok: true, changed: true, week, refreshed: { upcomingCard: upcoming, previews } });
});
