import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ─── Config ──────────────────────────────────────────────────────────────────

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SourceConfig {
  sport_category: string;
  scouting_year: number;
  target_url: string;
}

const SOURCES: SourceConfig[] = [
  {
    sport_category: "football",
    scouting_year: 2027,
    target_url: "https://247sports.com/college/tennessee/season/2027-football/commits/",
  },
  {
    sport_category: "basketball",
    scouting_year: 2026,
    target_url: "https://247sports.com/college/tennessee/season/2026-basketball/commits/",
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExtractedRecruit {
  full_name: string;
  position: string;
  hometown: string;
  stars_247: number;
  national_rank: number;
  commitment_date: string;
  status: string;
}

interface ExtractedClassStats {
  total_commits: number;
  average_stars: number;
  national_rank: number | null;
  sec_rank: number | null;
}

// ─── Firecrawl scrape ──────────────────────────────────────────────────────────

async function scrapePage(url: string): Promise<string> {
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
      timeout: 20000,
    }),
  });

  if (!res.ok) {
    throw new Error(`Firecrawl scrape failed for ${url}: ${res.status} ${await res.text()}`);
  }

  const data = await res.json() as { success: boolean; data?: { markdown: string } };
  if (!data.success || !data.data?.markdown) {
    throw new Error(`Firecrawl returned no markdown for ${url}`);
  }
  return data.data.markdown;
}

// ─── HTML entity decode ───────────────────────────────────────────────────────

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

// ─── Rating → Stars conversion ────────────────────────────────────────────────
// 247Sports composite rating → star rating:
//   0.98+ = 5-star, 0.89-0.97 = 4-star, 0.79-0.88 = 3-star, 0.70-0.78 = 2-star
function ratingToStars(rating: number): number {
  if (rating >= 98) return 5;
  if (rating >= 89) return 4;
  if (rating >= 79) return 3;
  if (rating >= 70) return 2;
  return 0;
}

// ─── Recruit extraction ────────────────────────────────────────────────────────
// 247Sports commits page markdown structure per recruit:
//   - ![Player Name](image_url)
//   [Player Name](https://247sports.com/Player/...) School (City, ST)
//   6-0 / 210
//   98                          ← rating
//   [11] [2] [1]                ← national rank, position rank, state rank
//   Commit 7/22/2026
//   RB                          ← position

function extractRecruits(markdown: string): ExtractedRecruit[] {
  const recruits: ExtractedRecruit[] = [];
  const lines = markdown.split("\n");
  const seenNames = new Set<string>();

  // Match player links: [Name](https://247sports.com/Player/slug-id/)
  const playerLinkRe = /\[([A-Z][a-zA-Z.'\u2019\-]+(?: [A-Z][a-zA-Z.'\u2019\-]+){1,3})\]\(https:\/\/247sports\.com\/Player\/[^)]+\)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(playerLinkRe);
    if (!match) continue;

    const fullName = decodeHtmlEntities(match[1].trim());
    if (seenNames.has(fullName)) continue;
    if (fullName.length < 5 || fullName.length > 60) continue;

    // The same line or the text after the link contains school and hometown:
    // "Baylor School (Chattanooga, TN)"
    const afterLink = line.slice(match.index! + match[0].length).trim();
    let hometown = "";
    const schoolCityRe = /([A-Z][a-zA-Z.'\s]+)\s*\(([A-Z][a-zA-Z.'\s]+,\s*[A-Z]{2})\)/;
    const scMatch = afterLink.match(schoolCityRe);
    if (scMatch) {
      hometown = `${scMatch[2].trim()} | ${scMatch[1].trim()}`;
    } else {
      // Try just city, state
      const cityStateRe = /\(([A-Z][a-zA-Z.'\s]+,\s*[A-Z]{2})\)/;
      const csMatch = afterLink.match(cityStateRe);
      if (csMatch) {
        hometown = csMatch[1].trim();
      }
    }

    // Scan the next ~40 lines for rating, ranks, commit date, and position.
    // 247Sports markdown has many blank lines between fields — each recruit
    // block spans ~30-35 lines from name to position.
    const contextEnd = Math.min(lines.length, i + 40);
    const contextLines = lines.slice(i, contextEnd);
    const context = contextLines.join("\n");

    // Rating: a standalone number 70-99 on its own line
    let rating = 0;
    for (const cl of contextLines) {
      const trimmed = cl.trim();
      if (/^\d{2}$/.test(trimmed)) {
        const num = parseInt(trimmed);
        if (num >= 70 && num <= 99) {
          rating = num;
          break;
        }
      }
    }

    // National rank: first number in brackets [NN] from the ranks line
    let nationalRank = 0;
    const ranksLineMatch = context.match(/\[(\d{1,4})\]\s*\[(\d{1,3})\]\s*\[(\d{1,3})\]/);
    if (ranksLineMatch) {
      nationalRank = parseInt(ranksLineMatch[1]);
    } else {
      // Try single bracket
      const singleRankMatch = context.match(/\[(\d{1,4})\]/);
      if (singleRankMatch) {
        nationalRank = parseInt(singleRankMatch[1]);
      }
    }

    // Commitment date: "Commit 7/22/2026" or "Commit 7/22/26"
    let commitDate = "";
    const commitRe = /Commit\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i;
    const commitMatch = context.match(commitRe);
    if (commitMatch) {
      const parts = commitMatch[1].split("/");
      let year = parseInt(parts[2]);
      if (year < 100) year += 2000;
      const d = new Date(year, parseInt(parts[0]) - 1, parseInt(parts[1]));
      if (!isNaN(d.getTime())) {
        commitDate = d.toISOString().split("T")[0];
      }
    }

    // Position: appears as a standalone position abbreviation after the commit date
    // Look in the last few lines of the context block. Includes both football
    // and basketball position abbreviations since both sports share this parser.
    let position = "";
    const positionRe = /^(QB|RB|WR|TE|OL|OT|OG|C|DL|DE|DT|LB|ILB|OLB|CB|S|K|P|ATH|EDGE|FB|LS|SNAP|WDE|SDE|APB|PG|SG|SF|PF)$/i;
    for (const cl of contextLines) {
      const trimmed = cl.trim();
      if (positionRe.test(trimmed)) {
        position = trimmed.toUpperCase();
        break;
      }
    }

    // Status: 247Sports labels each recruit "Enrolled" or "Signed" (basketball's
    // Enrollees/Signed Letter of Intent sections) rather than always showing a
    // commit date (football's plain commits list). Fall back to "committed" —
    // matches prior football-only behavior when neither word appears.
    let status = "committed";
    const statusRe = /^(Enrolled|Signed|Committed)$/i;
    for (const cl of contextLines) {
      const trimmed = cl.trim();
      if (statusRe.test(trimmed)) {
        status = trimmed.toLowerCase() === "signed" ? "signed" : "committed";
        break;
      }
    }

    // Convert rating to stars
    const stars = rating > 0 ? ratingToStars(rating) : 0;

    // Only add if we got at least a name and some data
    if (position || stars > 0 || rating > 0 || nationalRank > 0) {
      seenNames.add(fullName);
      recruits.push({
        full_name: fullName,
        position,
        hometown,
        stars_247: stars,
        national_rank: nationalRank,
        commitment_date: commitDate,
        status,
      });
    }
  }

  return recruits;
}

// ─── Class stats extraction ─────────────────────────────────────────────────────

function extractClassStats(markdown: string, recruitCount: number): ExtractedClassStats | null {
  // "### Overall Rank\n\n22" — national rank
  let nationalRank: number | null = null;
  const overallRankRe = /###\s*Overall\s*Rank\s*\n+\s*(\d{1,3})/i;
  const overallMatch = markdown.match(overallRankRe);
  if (overallMatch) {
    nationalRank = parseInt(overallMatch[1]);
  }

  // "Hard Commits (19)" — total commits
  let totalCommits = recruitCount;
  const hardCommitsRe = /Hard\s*Commits\s*\((\d+)\)/i;
  const hcMatch = markdown.match(hardCommitsRe);
  if (hcMatch) {
    totalCommits = parseInt(hcMatch[1]);
  }

  // SEC rank — not directly visible in the markdown structure; check for it
  let secRank: number | null = null;
  const secRankRe = /SEC\s*Rank\s*:?\s*#?(\d{1,2})/i;
  const secMatch = markdown.match(secRankRe);
  if (secMatch) {
    secRank = parseInt(secMatch[1]);
  }

  // Average stars — compute from recruits if not visible
  let avgStars = 0;
  const avgRe = /(?:Avg|Average)\s*(?:Stars?)?\s*:?\s*(\d\.\d{1,2})/i;
  const avgMatch = markdown.match(avgRe);
  if (avgMatch) {
    avgStars = parseFloat(avgMatch[1]);
  }

  if (nationalRank !== null || totalCommits > 0) {
    return {
      total_commits: totalCommits,
      average_stars: avgStars,
      national_rank: nationalRank,
      sec_rank: secRank,
    };
  }

  return null;
}

// ─── Per-source sync ────────────────────────────────────────────────────────

interface SourceResult {
  sport_category: string;
  ok: boolean;
  recruits_upserted: number;
  class_stats_upserted: boolean;
  recruits_sample: ExtractedRecruit[];
  class_stats: ExtractedClassStats | null;
  errors: string[];
}

async function syncSource(supabase: ReturnType<typeof createClient>, source: SourceConfig): Promise<SourceResult> {
  const errors: string[] = [];

  console.log(`Scraping ${source.target_url}...`);
  const markdown = await scrapePage(source.target_url);

  if (markdown.length < 500) {
    throw new Error(`Scraped markdown is suspiciously short for ${source.sport_category} — page may not have loaded properly`);
  }

  console.log(`Extracting ${source.sport_category} recruit data via regex parser...`);
  const recruits = extractRecruits(markdown);

  if (recruits.length === 0) {
    errors.push("No recruits extracted from the page");
  }

  // UPSERT recruits
  let recruitsUpserted = 0;
  if (recruits.length > 0) {
    const now = new Date().toISOString();
    const rows = recruits.map((r) => ({
      full_name: r.full_name,
      hometown: r.hometown || null,
      position: r.position || null,
      sport_category: source.sport_category,
      scouting_year: source.scouting_year,
      stars_247: r.stars_247 || null,
      stars_on3: null,
      national_rank: r.national_rank || null,
      status: r.status,
      updated_at: now,
    }));

    const { error } = await supabase
      .from("recruits")
      .upsert(rows, { onConflict: "full_name,scouting_year" });

    if (error) {
      errors.push(`Recruits upsert error: ${error.message}`);
    } else {
      recruitsUpserted = rows.length;
    }
  }

  // UPSERT class rankings
  const class_stats = extractClassStats(markdown, recruits.length);
  let classStatsUpserted = false;
  if (class_stats) {
    const { error } = await supabase
      .from("recruiting_class_rankings")
      .upsert({
        sport_category: source.sport_category,
        scouting_year: source.scouting_year,
        rank_247: class_stats.national_rank ?? 0,
        rank_on3: 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: "sport_category,scouting_year" });

    if (error) {
      errors.push(`Class rankings upsert error: ${error.message}`);
    } else {
      classStatsUpserted = true;
    }
  }

  return {
    sport_category: source.sport_category,
    ok: errors.length === 0,
    recruits_upserted: recruitsUpserted,
    class_stats_upserted: classStatsUpserted,
    recruits_sample: recruits.slice(0, 5),
    class_stats,
    errors,
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const urlObj = new URL(req.url);
  const debug = urlObj.searchParams.get("debug") === "1";
  const sportParam = urlObj.searchParams.get("sport");

  // Debug mode previews raw Firecrawl markdown without touching the database
  // — used to verify a source's real page structure before trusting a
  // parser. `?url=` scrapes any arbitrary URL directly (for reconnaissance
  // on new sources); otherwise picks a configured source by `?sport=`
  // (defaults to the first configured source).
  const urlParam = urlObj.searchParams.get("url");
  if (debug) {
    const targetUrl = urlParam
      ? urlParam
      : (sportParam ? SOURCES.find((s) => s.sport_category === sportParam)?.target_url : SOURCES[0].target_url);
    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: `Unknown sport "${sportParam}". Known: ${SOURCES.map((s) => s.sport_category).join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const markdown = await scrapePage(targetUrl);
    return new Response(
      JSON.stringify({ target_url: targetUrl, markdown_length: markdown.length, markdown_preview: markdown.slice(0, 8000) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const results: SourceResult[] = [];
  const fatalErrors: string[] = [];

  for (const source of SOURCES) {
    try {
      results.push(await syncSource(supabase, source));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${source.sport_category}: ${msg}`);
      fatalErrors.push(`${source.sport_category}: ${msg}`);
    }
  }

  const allOk = fatalErrors.length === 0 && results.every((r) => r.ok);

  await supabase
    .from("system_health")
    .upsert({
      source_name: "recruiting_sync",
      last_successful_run: new Date().toISOString(),
      status: allOk ? "healthy" : "stalled",
    }, { onConflict: "source_name" });

  return new Response(
    JSON.stringify({ ok: allOk, sources: results, fatal_errors: fatalErrors }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
