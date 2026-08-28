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
  /** On3 commits page for the same team/class — used to backfill stars_on3
   *  and rank_on3 by matching full_name against what 247 already upserted. */
  on3_url: string;
  /** 247Sports "targets" (not-yet-committed prospects) page, if available. */
  targets_url?: string;
  /** On3 incoming transfer-portal page, if available. Transfers are dated by
   *  the season the transfer joins the roster for (e.g. "2026"), which is a
   *  different vintage than the HS recruiting class (e.g. "2027") — so they're
   *  stored under transfers_scouting_year rather than scouting_year. */
  transfers_url?: string;
  transfers_scouting_year?: number;
  /** On3's industry-composite team rankings page filtered to the team's
   *  conference (e.g. "?conference=sec") — gives the real conference-only
   *  rank, unlike guessing one from the national rank. */
  sec_rankings_url?: string;
}

// Sources live in the recruiting_sources table (not hardcoded here) so a new
// URL, a corrected one, or a scouting-year bump is a data change — no code
// deploy required. See migration create_recruiting_sources.
async function loadSources(supabase: ReturnType<typeof createClient>): Promise<SourceConfig[]> {
  const { data, error } = await supabase
    .from("recruiting_sources")
    .select("sport_category, scouting_year, target_url, on3_url, targets_url, transfers_url, transfers_scouting_year, sec_rankings_url")
    .eq("active", true)
    .order("sport_category");

  if (error) throw new Error(`Failed to load recruiting_sources: ${error.message}`);

  return (data ?? []).map((row) => ({
    sport_category: row.sport_category,
    scouting_year: row.scouting_year,
    target_url: row.target_url,
    on3_url: row.on3_url,
    targets_url: row.targets_url ?? undefined,
    transfers_url: row.transfers_url ?? undefined,
    transfers_scouting_year: row.transfers_scouting_year ?? undefined,
    sec_rankings_url: row.sec_rankings_url ?? undefined,
  }));
}

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
    };
  }

  return null;
}

// ─── On3 extraction ─────────────────────────────────────────────────────────
// On3 team commits page markdown structure per recruit (distinct link host/
// path from 247's, so this needs its own scan):
//   [Player Name](https://www.on3.com/rivals/player-name-id/)
//   School (City, ST)
//   POS·H-W/ WT
//   POS
//   ★★★★★NN.NN                  ← On3's own 0-100 rating (stars glyphs are
//                                  decorative and always render as 5, not a
//                                  real count — the trailing number is real)
//   NNNatl·NNPos·NNSt
//   [Team logo link] C|S|E MM/DD/YY   ← status letter: Committed/Signed/Enrolled

interface On3Recruit {
  full_name: string;
  rating: number;
  status: string;
}

function extractOn3Recruits(markdown: string): On3Recruit[] {
  const recruits: On3Recruit[] = [];
  const lines = markdown.split("\n");
  const seenNames = new Set<string>();

  const playerLinkRe = /\[([A-Z][a-zA-Z.'’\-]+(?: [A-Z][a-zA-Z.'’\-]+){1,3})\]\(https:\/\/www\.on3\.com\/rivals\/[^)]+\)/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(playerLinkRe);
    if (!match) continue;

    const fullName = decodeHtmlEntities(match[1].trim());
    if (seenNames.has(fullName)) continue;
    if (fullName.length < 5 || fullName.length > 60) continue;

    const contextEnd = Math.min(lines.length, i + 20);
    const contextLines = lines.slice(i, contextEnd);

    let rating = 0;
    for (const cl of contextLines) {
      const ratingMatch = cl.trim().match(/^★+([\d.]+)$/);
      if (ratingMatch) {
        rating = parseFloat(ratingMatch[1]);
        break;
      }
    }
    if (rating <= 0) continue;

    let status = "committed";
    for (const cl of contextLines) {
      const statusMatch = cl.match(/\]\([^)]*\)\s*([CSE])\d{2}\/\d{2}\/\d{2}/);
      if (statusMatch) {
        status = statusMatch[1] === "S" ? "signed" : "committed";
        break;
      }
    }

    seenNames.add(fullName);
    recruits.push({ full_name: fullName, rating, status });
  }

  return recruits;
}

// "National Rank\\\\\n19th" — On3's markdown escapes the line break inside
// the link label with two literal backslashes before the newline.
function extractOn3TeamRank(markdown: string): number | null {
  const m = markdown.match(/National\s*Rank\\*\s*\n+\s*(\d{1,3})(?:st|nd|rd|th)/i);
  return m ? parseInt(m[1]) : null;
}

// ─── On3 conference (SEC) team-rankings extraction ───────────────────────────
// On3's industry-composite team rankings page, filtered to one conference
// (e.g. .../rankings/industry-team/football/2027/?conference=sec), lists each
// team as a numbered row in its main table:
//   09
//   ![Tennessee](...)
//   [Tennessee](https://www.on3.com/college/tennessee-volunteers/football/2027/industry-comparison-commits/)
//   SEC
//   1711                         ← star-count breakdown (5/4/3), digits run
//                                  together with no separator — not parsed
//   19
//   88.58
//   89.565
//   Total
//   19                           ← total commits, unambiguous (labeled)
//   Avg
//   88.58                        ← avg rating, unambiguous (labeled)
// The page also renders the top 3 as "Leader/Challenger/Contender" cards
// first, where the rank glues to a label on one line ("01Leader") rather than
// standing alone — so the scan starts at the "Rank Team ... Score" table
// header to skip those and only match standalone two-digit rank lines.
interface On3TeamRanking {
  rank: number;
  team: string;
  total_commits: number;
  avg_rating: number;
}

function extractOn3ConferenceTeamRankings(markdown: string): On3TeamRanking[] {
  const tableStart = markdown.search(/Rank\s*Team\s*Stars/i);
  const lines = (tableStart >= 0 ? markdown.slice(tableStart) : markdown).split("\n");
  const teamLinkRe = /^\[([^\]]+)\]\(https:\/\/www\.on3\.com\/college\/[^)]+\)$/;

  const rankings: On3TeamRanking[] = [];
  let currentRank: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    const rankMatch = trimmed.match(/^(\d{1,2})$/);
    if (rankMatch) {
      currentRank = parseInt(rankMatch[1], 10);
      continue;
    }

    const teamMatch = trimmed.match(teamLinkRe);
    if (!teamMatch || currentRank === null) continue;

    const team = decodeHtmlEntities(teamMatch[1].trim());
    let totalCommits = 0;
    let avgRating = 0;

    // "Total" and "Avg" labels sit a couple of blank lines before their
    // value, and are unambiguous (unlike the glued-together star counts).
    for (let j = i + 1; j < Math.min(lines.length, i + 20); j++) {
      const label = lines[j].trim();
      if (label !== "Total" && label !== "Avg") continue;
      for (let k = j + 1; k < Math.min(lines.length, j + 4); k++) {
        const value = lines[k].trim();
        if (value === "") continue;
        if (label === "Total") totalCommits = parseInt(value, 10) || 0;
        else avgRating = parseFloat(value) || 0;
        break;
      }
      if (label === "Avg") break; // "Avg" is the last labeled field per row
    }

    rankings.push({ rank: currentRank, team, total_commits: totalCommits, avg_rating: avgRating });
    currentRank = null;
  }

  return rankings;
}

// ─── On3 transfer portal extraction ──────────────────────────────────────────
// On3 team transfers page markdown structure per incoming transfer:
//   [Player Name](https://www.on3.com/rivals/player-name-id/)
//   Previous School (City, ST)
//   POS·H-W/ WT[CLASS]
//   POS
//   TP                            ← "Transfer Portal" rating section marker
//   ★★★★★NN.NN                  ← the player's transfer-portal rating (used
//                                  here, not their older HS rating that follows)
//   HS— or HS\n★★★★★NN.NN       ← original HS rating, sometimes absent
//   Committed | Enrolled | Signed
//   [previous school logo(s)][destination logo]
// This only covers "Portal In" (players joining Tennessee) — the page's
// static markdown doesn't include the "Portal Out" tab's content.

interface On3Transfer {
  full_name: string;
  hometown: string;
  position: string;
  rating: number;
}

function extractOn3Transfers(markdown: string): On3Transfer[] {
  const transfers: On3Transfer[] = [];
  const lines = markdown.split("\n");
  const seenNames = new Set<string>();

  const playerLinkRe = /\[([A-Z][a-zA-Z.'’\-]+(?: [A-Z][a-zA-Z.'’\-]+){1,3})\]\(https:\/\/www\.on3\.com\/rivals\/[^)]+\)/;
  const schoolCityRe = /^([A-Z][a-zA-Z.'\s]+)\s*\(([A-Z][a-zA-Z.'\s]+,\s*[A-Z]{2})\)$/;
  const positionRe = /^(QB|RB|WR|TE|OL|OT|OG|IOL|C|DL|DE|DT|LB|ILB|OLB|CB|S|K|P|ATH|EDGE|FB|LS)$/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(playerLinkRe);
    if (!match) continue;

    const fullName = decodeHtmlEntities(match[1].trim());
    if (seenNames.has(fullName)) continue;
    if (fullName.length < 5 || fullName.length > 60) continue;

    const contextEnd = Math.min(lines.length, i + 25);
    const contextLines = lines.slice(i, contextEnd);

    let hometown = "";
    for (const cl of contextLines) {
      const scMatch = cl.trim().match(schoolCityRe);
      if (scMatch) {
        hometown = `${scMatch[2].trim()} | ${scMatch[1].trim()}`;
        break;
      }
    }

    let position = "";
    for (const cl of contextLines) {
      if (positionRe.test(cl.trim())) {
        position = cl.trim();
        break;
      }
    }

    // The transfer-portal rating is the ★ line immediately following the
    // "TP" marker — not the HS rating that may follow it further down.
    let rating = 0;
    let sawTP = false;
    for (const cl of contextLines) {
      const trimmed = cl.trim();
      if (trimmed === "TP") {
        sawTP = true;
        continue;
      }
      if (sawTP) {
        const ratingMatch = trimmed.match(/^★+([\d.]+)$/);
        if (ratingMatch) {
          rating = parseFloat(ratingMatch[1]);
          break;
        }
      }
    }
    if (rating <= 0) continue;

    seenNames.add(fullName);
    transfers.push({ full_name: fullName, hometown, position, rating });
  }

  return transfers;
}

// ─── Per-source sync ────────────────────────────────────────────────────────

interface SourceResult {
  sport_category: string;
  ok: boolean;
  recruits_upserted: number;
  targets_upserted: number;
  transfers_upserted: number;
  class_stats_upserted: boolean;
  recruits_sample: ExtractedRecruit[];
  class_stats: ExtractedClassStats | null;
  sec_rank: number | null;
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

  // On3: backfill stars_on3 per recruit (matched by exact full_name — a few
  // recruits go unmatched when On3 lists a nickname 247 doesn't, e.g. "Chris"
  // vs "Christopher" — those just keep stars_on3 null rather than guessing)
  // and get On3's real team National Rank for rank_on3.
  let on3Rank: number | null = null;
  try {
    const on3Markdown = await scrapePage(source.on3_url);
    on3Rank = extractOn3TeamRank(on3Markdown);
    const on3Recruits = extractOn3Recruits(on3Markdown);
    for (const r of on3Recruits) {
      const stars = ratingToStars(Math.floor(r.rating));
      if (stars <= 0) continue;
      const { error } = await supabase
        .from("recruits")
        .update({ stars_on3: stars })
        .eq("full_name", r.full_name)
        .eq("scouting_year", source.scouting_year)
        .eq("sport_category", source.sport_category);
      if (error) errors.push(`On3 stars update error for ${r.full_name}: ${error.message}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`On3 scrape failed (non-fatal, stars_on3/rank_on3 unchanged): ${msg}`);
  }

  // On3 conference (SEC) team rankings — a separate page from the team's own
  // On3 commits page above, giving the real conference-only rank instead of
  // guessing one from the national rank. Every team's row is stored too, to
  // back the "Team Rankings — TN vs SEC" comparison (previously hardcoded to
  // a few rival names with no data source ever populating them).
  let secRank: number | null = null;
  if (source.sec_rankings_url) {
    try {
      const secMarkdown = await scrapePage(source.sec_rankings_url);
      const conferenceRankings = extractOn3ConferenceTeamRankings(secMarkdown);
      secRank = conferenceRankings.find((t) => t.team === "Tennessee")?.rank ?? null;
      if (secRank === null) errors.push("SEC rankings page scraped but Tennessee's row wasn't found");

      if (conferenceRankings.length > 0) {
        const now = new Date().toISOString();
        const rows = conferenceRankings.map((t) => ({
          sport_category: source.sport_category,
          scouting_year: source.scouting_year,
          team: t.team,
          rank: t.rank,
          total_commits: t.total_commits,
          avg_rating: t.avg_rating,
          updated_at: now,
        }));
        const { error } = await supabase
          .from("sec_team_rankings")
          .upsert(rows, { onConflict: "sport_category,scouting_year,team" });
        if (error) errors.push(`SEC team rankings upsert error: ${error.message}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`SEC rankings scrape failed (non-fatal, sec_rank unchanged): ${msg}`);
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
        rank_on3: on3Rank ?? 0,
        sec_rank: secRank ?? 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: "sport_category,scouting_year" });

    if (error) {
      errors.push(`Class rankings upsert error: ${error.message}`);
    } else {
      classStatsUpserted = true;
    }
  }

  // 247 Targets: prospects not yet committed. The targets page also lists
  // some already-committed recruits (their own board still tracks them), so
  // never let this downgrade someone this run already confirmed as
  // committed/signed — only insert names that aren't in that set.
  let targetsUpserted = 0;
  if (source.targets_url) {
    try {
      const committedNames = new Set(recruits.map((r) => r.full_name));
      const targetsMarkdown = await scrapePage(source.targets_url);
      const targetRecruits = extractRecruits(targetsMarkdown).filter((r) => !committedNames.has(r.full_name));
      if (targetRecruits.length > 0) {
        const now = new Date().toISOString();
        const rows = targetRecruits.map((r) => ({
          full_name: r.full_name,
          hometown: r.hometown || null,
          position: r.position || null,
          sport_category: source.sport_category,
          scouting_year: source.scouting_year,
          stars_247: r.stars_247 || null,
          national_rank: r.national_rank || null,
          status: "target",
          updated_at: now,
        }));
        const { error } = await supabase
          .from("recruits")
          .upsert(rows, { onConflict: "full_name,scouting_year" });
        if (error) errors.push(`Targets upsert error: ${error.message}`);
        else targetsUpserted = rows.length;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Targets scrape failed (non-fatal): ${msg}`);
    }
  }

  // On3 incoming transfer portal: stored under transfers_scouting_year since
  // a transfer's season vintage differs from the HS recruiting class's.
  let transfersUpserted = 0;
  if (source.transfers_url) {
    try {
      const transfersMarkdown = await scrapePage(source.transfers_url);
      const transfers = extractOn3Transfers(transfersMarkdown);
      if (transfers.length > 0) {
        const now = new Date().toISOString();
        const rows = transfers.map((t) => ({
          full_name: t.full_name,
          hometown: t.hometown || null,
          position: t.position || null,
          sport_category: source.sport_category,
          scouting_year: source.transfers_scouting_year ?? source.scouting_year,
          stars_on3: ratingToStars(Math.floor(t.rating)) || null,
          status: "portal",
          updated_at: now,
        }));
        const { error } = await supabase
          .from("recruits")
          .upsert(rows, { onConflict: "full_name,scouting_year" });
        if (error) errors.push(`Transfers upsert error: ${error.message}`);
        else transfersUpserted = rows.length;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Transfers scrape failed (non-fatal): ${msg}`);
    }
  }

  return {
    sport_category: source.sport_category,
    ok: errors.length === 0,
    recruits_upserted: recruitsUpserted,
    targets_upserted: targetsUpserted,
    transfers_upserted: transfersUpserted,
    class_stats_upserted: classStatsUpserted,
    recruits_sample: recruits.slice(0, 5),
    class_stats,
    sec_rank: secRank,
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
  const mapMode = urlObj.searchParams.get("map") === "1";
  if (debug && mapMode && urlParam) {
    const res = await fetch("https://api.firecrawl.dev/v1/map", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${FIRECRAWL_API_KEY}` },
      body: JSON.stringify({ url: urlParam, search: urlObj.searchParams.get("search") || undefined }),
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (debug) {
    const sources = await loadSources(supabase);
    const targetUrl = urlParam
      ? urlParam
      : (sportParam ? sources.find((s) => s.sport_category === sportParam)?.target_url : sources[0]?.target_url);
    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: `Unknown sport "${sportParam}". Known: ${sources.map((s) => s.sport_category).join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const markdown = await scrapePage(targetUrl);
    const previewLen = Math.min(markdown.length, parseInt(urlObj.searchParams.get("len") || "8000", 10) || 8000);
    return new Response(
      JSON.stringify({ target_url: targetUrl, markdown_length: markdown.length, markdown_preview: markdown.slice(0, previewLen) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const results: SourceResult[] = [];
  const fatalErrors: string[] = [];
  const sources = await loadSources(supabase);

  for (const source of sources) {
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
