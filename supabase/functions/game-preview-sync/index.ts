import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// A preview page's content is fixed once ESPN publishes it (a few days
// before kickoff), so this is generous just to avoid re-scraping on every
// button click within the same sitting.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// ─── Firecrawl scrape ───────────────────────────────────────────────────────
// A plain fetch of an ESPN preview page gets a 202 "challenge" response from
// their bot-detection WAF with no content — Firecrawl's own fetching gets
// through and returns real markdown.
async function scrapePage(url: string): Promise<string> {
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({ url, formats: ["markdown"] }),
  });
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(`Firecrawl scrape failed: ${data?.error ?? res.status}`);
  }
  return data.data?.markdown ?? "";
}

// ─── Parsing ────────────────────────────────────────────────────────────────
// ESPN's auto-generated (Data Skrive) preview pages follow a consistent
// shape: a header block (matchup, records, opening line, how to watch),
// then a series of markdown-italic `_Section Name_` headers (Key stats,
// Team leaders, Last game, Next game) each with their own line pattern.
// Parsing is intentionally line-based and tolerant — an unrecognized line
// is either dropped or bucketed as a freeform note rather than throwing,
// since this is best-effort reformatting of someone else's page, not a
// contract we control.

interface StatBlock {
  overall?: string;
  passing?: string;
  rushing?: string;
  scoring?: string;
}

interface TeamKeyStats {
  team: string;
  offense: StatBlock;
  defense: StatBlock;
}

interface TeamLeaders {
  team: string;
  passing?: string;
  rushing?: string;
  receiving?: string;
}

interface PreviewContent {
  headline: string;
  subhead: string | null;
  openingLine: string | null;
  howToWatch: string | null;
  keyStats: TeamKeyStats[];
  keyStatsNotes: string[];
  teamLeaders: TeamLeaders[];
  lastGame: { team: string; summary: string }[];
  nextGame: string[];
}

function splitSections(ls: string[]): { header: string[]; sections: Record<string, string[]> } {
  const header: string[] = [];
  const sections: Record<string, string[]> = {};
  let current: string[] | null = null;
  const sectionRe = /^_(.+)_$/;

  for (const line of ls) {
    const m = line.match(sectionRe);
    if (m) {
      current = [];
      sections[m[1]] = current;
      continue;
    }
    (current ?? header).push(line);
  }

  return { header, sections };
}

function parseHeader(header: string[]) {
  const headline = header.find((l) => l.startsWith("## "))?.replace(/^##\s*/, "") ?? null;
  const subhead = header.find(
    (l) => /\d\s*(a|p)\.m\./i.test(l) && !l.startsWith("[") && !l.startsWith("!"),
  ) ?? null;
  const openingLine = header.find((l) => l.startsWith("Opening Line:"))?.replace(/^Opening Line:\s*/, "") ?? null;
  const howToWatch = header.find((l) => l.startsWith("How to watch:"))?.replace(/^How to watch:\s*/, "") ?? null;
  return { headline, subhead, openingLine, howToWatch };
}

function stripMarkdownLinks(s: string): string {
  return s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

function parseKeyStats(ls: string[], teamNames: string[]): { keyStats: TeamKeyStats[]; notes: string[] } {
  const byTeam: Record<string, TeamKeyStats> = {};
  const notes: string[] = [];
  let currentTeam: string | null = null;
  let currentSide: "offense" | "defense" | null = null;
  const headerRe = /^(.+?)\s+(Offense|Defense)$/;
  const statRe = /^(Overall|Passing|Rushing|Scoring):\s*(.+)$/;

  for (const line of ls) {
    const hm = line.match(headerRe);
    if (hm && teamNames.includes(hm[1])) {
      currentTeam = hm[1];
      currentSide = hm[2].toLowerCase() as "offense" | "defense";
      byTeam[currentTeam] ??= { team: currentTeam, offense: {}, defense: {} };
      continue;
    }
    const sm = line.match(statRe);
    if (sm && currentTeam && currentSide) {
      const key = sm[1].toLowerCase() as keyof StatBlock;
      byTeam[currentTeam][currentSide][key] = sm[2];
      continue;
    }
    currentTeam = null;
    currentSide = null;
    notes.push(line);
  }

  return { keyStats: teamNames.map((t) => byTeam[t]).filter((x): x is TeamKeyStats => !!x), notes };
}

function parseTeamLeaders(ls: string[], teamNames: string[]): TeamLeaders[] {
  const result: TeamLeaders[] = [];
  let current: TeamLeaders | null = null;
  const statRe = /^(Passing|Rushing|Receiving):\s*(.+)$/;

  for (const line of ls) {
    if (teamNames.includes(line)) {
      current = { team: line };
      result.push(current);
      continue;
    }
    const sm = line.match(statRe);
    if (sm && current) {
      const key = sm[1].toLowerCase() as "passing" | "rushing" | "receiving";
      current[key] = stripMarkdownLinks(sm[2]);
    }
  }

  return result;
}

function parseLastGame(ls: string[], teamNames: string[]): { team: string; summary: string }[] {
  return ls
    .filter((l) => l.length > 0)
    .map((line) => ({ team: teamNames.find((t) => line.startsWith(t)) ?? "", summary: line }));
}

// The last section on the page (usually "Next game") isn't bounded by
// another `_Section_` marker, so it runs straight into ESPN's page footer
// (nav links, the gambling disclaimer, copyright). Cut it off at the first
// line that looks like that footer rather than real preview content.
function stripFooterJunk(ls: string[]): string[] {
  const junkStart = ls.findIndex(
    (l) => /^!\[/.test(l) || /^-\s\[/.test(l) || /^Copyright:/.test(l) || /GAMBLING PROBLEM/.test(l),
  );
  return junkStart === -1 ? ls : ls.slice(0, junkStart);
}

function parsePreview(markdown: string, homeTeam: string, awayTeam: string): PreviewContent {
  const ls = markdown.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const { header, sections } = splitSections(ls);
  const teamNames = [awayTeam, homeTeam];

  const { headline, subhead, openingLine, howToWatch } = parseHeader(header);
  const { keyStats, notes } = parseKeyStats(sections["Key stats"] ?? [], teamNames);
  const teamLeaders = parseTeamLeaders(sections["Team leaders"] ?? [], teamNames);
  const lastGame = parseLastGame(sections["Last game"] ?? [], teamNames);
  const nextGame = stripFooterJunk(sections["Next game"] ?? []);

  return {
    headline: headline ?? `${awayTeam} @ ${homeTeam}`,
    subhead,
    openingLine,
    howToWatch,
    keyStats,
    keyStatsNotes: notes,
    teamLeaders,
    lastGame,
    nextGame,
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  let gameId: string | undefined;
  let cfbdGameId: number | undefined;
  try {
    const body = await req.json();
    gameId = body?.game_id;
    cfbdGameId = body?.cfbd_game_id;
  } catch {
    // no body
  }
  if (!gameId && !cfbdGameId) {
    return new Response(JSON.stringify({ error: "game_id or cfbd_game_id is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // UpcomingGameCard (pregame, before a live_games row's UUID is known to the
  // client) only has CFBD's own numeric schedule id — the same value
  // game-sync stores as live_games.cfbd_game_id — so look up by whichever
  // identifier the caller has.
  const gameQuery = supabase
    .from("live_games")
    .select("id, home_team, away_team, espn_preview_url");
  const { data: game, error: gameError } = await (
    gameId ? gameQuery.eq("id", gameId) : gameQuery.eq("cfbd_game_id", cfbdGameId!)
  ).maybeSingle();

  // Cache lookups/writes below key off the live_games UUID regardless of
  // which identifier the caller sent.
  gameId = game?.id ?? gameId;

  if (gameError || !game) {
    return new Response(JSON.stringify({ error: gameError?.message ?? "game not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!game.espn_preview_url) {
    return new Response(JSON.stringify({ available: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: cached } = await supabase
    .from("game_previews")
    .select("content, fetched_at")
    .eq("game_id", gameId)
    .maybeSingle();

  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS) {
    return new Response(JSON.stringify({ available: true, content: cached.content, cached: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const markdown = await scrapePage(game.espn_preview_url);
    const content = parsePreview(markdown, game.home_team, game.away_team);

    const { error: upsertError } = await supabase
      .from("game_previews")
      .upsert(
        { game_id: gameId, source_url: game.espn_preview_url, content, fetched_at: new Date().toISOString() },
        { onConflict: "game_id" },
      );
    if (upsertError) throw new Error(`Cache upsert failed: ${upsertError.message}`);

    return new Response(JSON.stringify({ available: true, content, cached: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Fall back to a stale cache entry rather than a hard failure, if one exists.
    if (cached) {
      return new Response(
        JSON.stringify({ available: true, content: cached.content, cached: true, stale: true, error: msg }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
