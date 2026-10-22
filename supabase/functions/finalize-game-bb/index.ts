import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// FINALIZE GAME (BASKETBALL). Men's basketball counterpart of finalize-game:
// takes ESPN's final score, writes it to live_games, and runs finalize_game
// (which dispatches to finalize_game_bb for sport = 'basketball'): scores the
// pregame picks, credits profiles.points_basketball / total_points, awards
// badges, marks the game 'calculated'. Weekly props, if any, are graded by an
// admin (admin_grade_game_prop) before this runs. Body: { game_id, dry_run? }.
// Same access rule as finalize-game: the service-role key, or a signed-in admin.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const norm = (s: string) => s.trim().toLowerCase();

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!(serviceKey && authHeader === `Bearer ${serviceKey}`)) {
    const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Not authenticated" }, 401);
    const { data: profile } = await service.from("profiles").select("is_admin").eq("id", userData.user.id).maybeSingle();
    if (!profile?.is_admin) return json({ error: "Unauthorized: admin access required." }, 403);
  }

  let body: { game_id?: string; dry_run?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!body.game_id) return json({ error: "Missing game_id" }, 400);

  const { data: game } = await service
    .from("live_games")
    .select("id, cfbd_game_id, home_team, away_team, sport")
    .eq("id", body.game_id)
    .maybeSingle();
  if (!game) return json({ error: "Game not found" }, 404);
  if (game.sport !== "basketball") return json({ error: "Not a basketball game — use finalize-game." }, 400);

  const warnings: string[] = [];
  let homePoints: number | null = null;
  let awayPoints: number | null = null;
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=${game.cfbd_game_id}`,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; GoVolsGameDay/1.0)", Accept: "application/json" } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    const comp = d?.header?.competitions?.[0];
    if (!comp?.status?.type?.completed) {
      warnings.push("ESPN does not show this game as final yet.");
    } else {
      // deno-lint-ignore no-explicit-any
      const side = (ha: string) => comp.competitors.find((c: any) => c.homeAway === ha);
      const h = side("home"), a = side("away");
      if (!h || !a || norm(h.team.location ?? "") !== norm(game.home_team) || norm(a.team.location ?? "") !== norm(game.away_team)) {
        warnings.push("ESPN event teams don't match this game — ignored.");
      } else {
        const hp = parseInt(h.score, 10), ap = parseInt(a.score, 10);
        if (Number.isFinite(hp) && Number.isFinite(ap)) {
          homePoints = hp;
          awayPoints = ap;
        } else {
          warnings.push("ESPN returned no final score.");
        }
      }
    }
  } catch (e) {
    warnings.push(`ESPN summary unavailable: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (homePoints === null || awayPoints === null) {
    return json({ error: "No final score available — not finalizing.", warnings }, 409);
  }
  const stats = { home_score: homePoints, away_score: awayPoints };
  if (body.dry_run === true) return json({ ok: true, dry_run: true, source: "espn", stats, warnings });

  const { error: updateErr } = await service
    .from("live_games")
    .update({ ...stats, updated_at: new Date().toISOString() })
    .eq("id", game.id);
  if (updateErr) warnings.push(`Failed to write final score: ${updateErr.message}`);

  const { error: finalizeErr } = await service.rpc("finalize_game", { p_game_id: game.id });
  if (finalizeErr) return json({ error: finalizeErr.message, warnings }, 500);
  return json({ ok: true, source: "espn", stats, warnings });
});
