import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// NCAA.com stat category IDs (27 = Scoring Offense, 28 = Scoring Defense) are
// stable identifiers in NCAA's own URL scheme, not something that changes
// per season the way the On3/247 recruiting source URLs do — fine hardcoded
// here rather than in a sources table.
const STAT_PAGES: { statType: "offense" | "defense"; category: number }[] = [
  { statType: "offense", category: 27 },
  { statType: "defense", category: 28 },
];

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// Each page lists ~50 teams (/team/27, /team/27/p2, /team/27/p3, ...). FBS
// has ~134 teams, so 3 pages covers the whole field.
const MAX_PAGES = 3;

interface Row {
  stat_type: "offense" | "defense";
  season: number;
  team: string;
  rank: number;
  games: number;
  points: number;
  points_per_game: number;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .trim();
}

function stripTags(cell: string): string {
  return decodeEntities(cell.replace(/<[^>]+>/g, ""));
}

async function fetchStatPage(category: number, page: number): Promise<string> {
  const url = page === 1
    ? `https://www.ncaa.com/stats/football/fbs/current/team/${category}`
    : `https://www.ncaa.com/stats/football/fbs/current/team/${category}/p${page}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`NCAA.com fetch failed (${res.status}) for ${url}`);
  return await res.text();
}

// NCAA's table only prints a rank number on the first team at that rank,
// leaving tied rows blank ("-"), so the real rank has to carry forward
// across rows (and across pages, via startRank).
function parseRows(
  html: string,
  statType: "offense" | "defense",
  season: number,
  startRank: number | null,
): { rows: Row[]; lastRank: number | null; teamsSeen: string[] } {
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) return { rows: [], lastRank: startRank, teamsSeen: [] };
  const trMatches = tbodyMatch[1].match(/<tr>[\s\S]*?<\/tr>/g) ?? [];

  const rows: Row[] = [];
  const teamsSeen: string[] = [];
  let lastRank = startRank;

  for (const tr of trMatches) {
    const cells = (tr.match(/<td>[\s\S]*?<\/td>/g) ?? []).map(stripTags);
    if (cells.length < 4) continue;
    const [rankCell, teamCell, gamesCell] = cells;
    const pointsCell = cells[cells.length - 2];
    const perGameCell = cells[cells.length - 1];

    if (rankCell !== "-") {
      const n = parseInt(rankCell, 10);
      if (!isNaN(n)) lastRank = n;
    }
    if (lastRank == null || !teamCell) continue;

    teamsSeen.push(teamCell);
    rows.push({
      stat_type: statType,
      season,
      team: teamCell,
      rank: lastRank,
      games: parseInt(gamesCell, 10) || 0,
      points: parseFloat(pointsCell) || 0,
      points_per_game: parseFloat(perGameCell) || 0,
    });
  }

  return { rows, lastRank, teamsSeen };
}

async function syncStat(
  statType: "offense" | "defense",
  category: number,
  season: number,
): Promise<{ rows: Row[]; pagesFetched: number; foundTennessee: boolean }> {
  const allRows: Row[] = [];
  let lastRank: number | null = null;
  let foundTennessee = false;
  let pagesFetched = 0;

  // Fetches every page (all ~134 FBS teams) rather than stopping once
  // Tennessee's own row is found — the Live Game Stats panel needs
  // whichever team Tennessee is playing that week too, and that opponent
  // could rank anywhere in the field, not just within Tennessee's own
  // top ~50.
  for (let page = 1; page <= MAX_PAGES; page++) {
    const html = await fetchStatPage(category, page);
    pagesFetched++;
    const { rows, lastRank: newLastRank, teamsSeen } = parseRows(html, statType, season, lastRank);
    if (rows.length === 0) break; // ran out of pages
    allRows.push(...rows);
    lastRank = newLastRank;
    if (teamsSeen.includes("Tennessee")) foundTennessee = true;
  }

  return { rows: allRows, pagesFetched, foundTennessee };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const season = new Date().getFullYear();

  const results: Record<string, unknown>[] = [];
  const fatalErrors: string[] = [];

  for (const { statType, category } of STAT_PAGES) {
    try {
      const { rows, pagesFetched, foundTennessee } = await syncStat(statType, category, season);
      if (rows.length === 0) {
        fatalErrors.push(`${statType}: no rows parsed`);
        continue;
      }
      const { error } = await supabase
        .from("ncaa_scoring_rankings")
        .upsert(rows, { onConflict: "stat_type,season,team" });
      if (error) {
        fatalErrors.push(`${statType} upsert error: ${error.message}`);
        continue;
      }
      results.push({
        stat_type: statType,
        ok: true,
        rows_upserted: rows.length,
        pages_fetched: pagesFetched,
        tennessee_found: foundTennessee,
        tennessee: rows.find((r) => r.team === "Tennessee") ?? null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      fatalErrors.push(`${statType}: ${msg}`);
    }
  }

  const allOk = fatalErrors.length === 0;

  await supabase
    .from("system_health")
    .upsert({
      source_name: "scoring_rankings_sync",
      last_successful_run: new Date().toISOString(),
      status: allOk ? "healthy" : "stalled",
    }, { onConflict: "source_name" });

  return new Response(
    JSON.stringify({ ok: allOk, results, fatal_errors: fatalErrors }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
