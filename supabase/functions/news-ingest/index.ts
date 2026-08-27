import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ─── Config ──────────────────────────────────────────────────────────────────

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY")!;
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ─── Source Definitions ───────────────────────────────────────────────────────
// Each source has a tagging method:
//   "url"   — the URL itself determines sport_category (per-sport section URLs)
//   "label" — parse a visible per-article label (e.g. "Volquest Basketball") to determine sport
//   "column" — read an explicit SPORT column/badge per row

type TagMethod = "url" | "label" | "column";
type SportCategory = "football" | "basketball" | "baseball" | "lv-basketball" | "lv-softball" | "football-recruiting" | "basketball-recruiting" | "other";

interface SourceSection {
  url: string;
  sport_category: SportCategory;
}

interface SourceDef {
  source_name: string;
  tag_method: TagMethod;
  // For "url" method: list of {url, sport_category} pairs
  sections?: SourceSection[];
  // For "label" or "column" method: single URL to scrape
  feed_url?: string;
  // For "label" method: function to parse sport from article label text
  labelToSport?: (label: string) => SportCategory | null;
  // Max articles to extract per section/feed
  maxPerSection?: number;
}

const SOURCES: SourceDef[] = [
  // ── VolsWire — per-sport URLs ──────────────────────────────────────────────
  {
    source_name: "Vols Wire",
    tag_method: "url",
    sections: [
      { url: "https://volswire.usatoday.com/football/",     sport_category: "football" },
      { url: "https://volswire.usatoday.com/basketball/",   sport_category: "basketball" },
      { url: "https://volswire.usatoday.com/baseball/",     sport_category: "baseball" },
      { url: "https://volswire.usatoday.com/lady-vols/",    sport_category: "lv-basketball" },
    ],
    maxPerSection: 3,
  },

  // ── 247Sports Tennessee — per-sport URLs via ?sport= query ──────────────────
  // football and basketball confirmed; baseball and softball query params don't
  // reliably filter, so we use the general feed + content classification for those.
  {
    source_name: "247Sports Tennessee",
    tag_method: "url",
    sections: [
      { url: "https://247sports.com/college/tennessee/news/?sport=football",   sport_category: "football" },
      { url: "https://247sports.com/college/tennessee/news/?sport=basketball", sport_category: "basketball" },
    ],
    maxPerSection: 3,
  },

  // ── AllForTennessee — per-sport URLs including recruiting sub-pages ──────────
  {
    source_name: "All For Tennessee",
    tag_method: "url",
    sections: [
      { url: "https://allfortennessee.com/vols-football/",                            sport_category: "football" },
      { url: "https://allfortennessee.com/vols-basketball/",                           sport_category: "basketball" },
      { url: "https://allfortennessee.com/vols-basketball/vols-womens-basketball/",    sport_category: "lv-basketball" },
      { url: "https://allfortennessee.com/vols-baseball/",                             sport_category: "baseball" },
      { url: "https://allfortennessee.com/vols-football/vols-football-recruiting/",    sport_category: "football-recruiting" },
      { url: "https://allfortennessee.com/vols-basketball/vols-basketball-recruiting/", sport_category: "basketball-recruiting" },
    ],
    maxPerSection: 3,
  },

  // ── Rocky Top Insider — /category/[sport]/ URLs ──────────────────────────────
  // football, basketball, baseball confirmed. lady-vols category page exists but
  // returned empty content, so we skip it and rely on other sources for lady-vols.
  {
    source_name: "Rocky Top Insider",
    tag_method: "url",
    sections: [
      { url: "https://rockytopinsider.com/category/football/",   sport_category: "football" },
      { url: "https://rockytopinsider.com/category/basketball/", sport_category: "basketball" },
      { url: "https://rockytopinsider.com/category/baseball/",   sport_category: "baseball" },
    ],
    maxPerSection: 3,
  },

  // ── Rocky Top Talk — per-sport URLs (verified patterns) ──────────────────────
  {
    source_name: "Rocky Top Talk",
    tag_method: "url",
    sections: [
      { url: "https://www.rockytoptalk.com/tennessee_volunteer_football",  sport_category: "football" },
      { url: "https://www.rockytoptalk.com/basketball",                     sport_category: "basketball" },
      { url: "https://www.rockytoptalk.com/tennessee-volunteers-baseball",  sport_category: "baseball" },
      { url: "https://www.rockytoptalk.com/lady_vols_basketball",           sport_category: "lv-basketball" },
    ],
    maxPerSection: 3,
  },

  // ── On3 Tennessee — single feed, label-based tagging ─────────────────────────
  // Each article has a visible label like "Volquest Basketball" or "Volquest Football"
  {
    source_name: "On3 Tennessee",
    tag_method: "label",
    feed_url: "https://on3.com/teams/tennessee-volunteers/news/",
    maxPerSection: 5,
    labelToSport: (label: string): SportCategory | null => {
      const lower = label.toLowerCase();
      if (lower.includes("football")) return "football";
      if (lower.includes("baseball")) return "baseball";
      if (lower.includes("basketball") || lower.includes("wbb") || lower.includes("womens basketball")) return "basketball";
      if (lower.includes("softball")) return "lv-softball";
      // On3 doesn't clearly separate Lady Vols basketball from men's in labels,
      // so "basketball" defaults to men's. Only return if we got a match.
      return null;
    },
  },

  // ── On3 Tennessee Football Recruiting — dedicated category page ─────────────
  // On3's own football-recruiting category feed, separate from the general
  // "On3 Tennessee" label-tagged source above (which only catches articles
  // whose visible label happens to say "football"/"recruiting" explicitly).
  {
    source_name: "On3 Tennessee Recruiting",
    tag_method: "url",
    sections: [
      { url: "https://www.on3.com/teams/tennessee-volunteers/category/football-recruiting/news/", sport_category: "football-recruiting" },
    ],
    maxPerSection: 5,
  },

  // ── utsports.com — Story Archives with explicit SPORT column ─────────────────
  {
    source_name: "UT Sports",
    tag_method: "column",
    feed_url: "https://utsports.com/sports/football/archives",
    maxPerSection: 5,
  },
];

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
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// Strip URL fragments (#comments) and trailing slashes for consistent dedup
function normalizeUrl(url: string): string {
  return url.replace(/#.*$/, "").replace(/\/+$/, "");
}

// ─── Firecrawl helpers ────────────────────────────────────────────────────────

// Firecrawl free plan: ~20 req/min. We track requests and throttle to stay under the limit.
let firecrawlRequestCount = 0;
const FIRECRAWL_RATE_LIMIT = 18; // leave headroom under 20
const FIRECRAWL_RATE_WINDOW_MS = 60_000;
const requestTimestamps: number[] = [];

async function throttleFirecrawl(): Promise<void> {
  const now = Date.now();
  // Prune timestamps older than the rate window
  while (requestTimestamps.length > 0 && now - requestTimestamps[0] > FIRECRAWL_RATE_WINDOW_MS) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= FIRECRAWL_RATE_LIMIT) {
    const waitMs = FIRECRAWL_RATE_WINDOW_MS - (now - requestTimestamps[0]) + 1000;
    console.log(`Rate limit reached, waiting ${Math.ceil(waitMs / 1000)}s...`);
    await new Promise((r) => setTimeout(r, waitMs));
    // Prune again after waiting
    const after = Date.now();
    while (requestTimestamps.length > 0 && after - requestTimestamps[0] > FIRECRAWL_RATE_WINDOW_MS) {
      requestTimestamps.shift();
    }
  }
  requestTimestamps.push(Date.now());
  firecrawlRequestCount++;
}

interface FirecrawlScrapeResult {
  markdown: string;
  metadata?: {
    title?: string;
    description?: string;
    ogImage?: string;
    sourceURL?: string;
    publishedAt?: string;
  };
  links?: Array<{ url: string; text?: string }>;
}

interface FirecrawlMapResult {
  links?: string[];
}

// Step 1: Scrape a list/section page to get markdown + links
async function scrapeListPage(url: string): Promise<FirecrawlScrapeResult | null> {
  await throttleFirecrawl();
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "links"],
      onlyMainContent: true,
      timeout: 15000,
    }),
  });

  if (!res.ok) {
    throw new Error(`Firecrawl scrape failed for ${url}: ${res.status} ${await res.text()}`);
  }
  const data = await res.json() as { success: boolean; data?: FirecrawlScrapeResult };
  return data.success ? (data.data ?? null) : null;
}

// Step 2: Scrape an individual article URL for real headline, thumbnail, body, publish date
async function scrapeArticle(url: string): Promise<FirecrawlScrapeResult | null> {
  await throttleFirecrawl();
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
      timeout: 15000,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json() as { success: boolean; data?: FirecrawlScrapeResult };
  return data.success ? (data.data ?? null) : null;
}

// ─── Article URL extraction from list pages ───────────────────────────────────

interface CandidateArticle {
  url: string;
  title?: string;
  label?: string;   // For label-based sources (On3)
  sportBadge?: string; // For column-based sources (utsports)
}

// Reject articles older than 60 days (prevents "Most Popular" sidebar articles from being ingested)
function isTooOld(publishedAt: string | null): boolean {
  if (!publishedAt) return false; // If we can't determine the date, keep the article
  const d = new Date(publishedAt);
  if (isNaN(d.getTime())) return false;
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  return d < sixtyDaysAgo;
}

// Determine if a URL looks like an individual article (not a category/tag/author/homepage page)
function isArticleUrl(url: string, baseUrl: string): boolean {
  try {
    const u = new URL(url);
    const b = new URL(baseUrl);
    if (!u.hostname.includes(b.hostname.replace(/^www\./, ""))) return false;
    const path = u.pathname;
    if (path === "/" || path === "") return false;
    // Reject non-article pages: tags, authors, categories, pagination, join/subscribe, user profiles
    if (/\/(tag|tags|author|authors|category|categories|page|news\/?$|archives\/?$)/i.test(path)) return false;
    if (/\/(join|subscribe|signup|login|account|user\/|profile)/i.test(path)) return false;
    if (path.split("/").filter(Boolean).length < 2) return false;
    // Reject 247Sports user profile and longform landing pages
    if (/\/user\//i.test(path)) return false;
    if (/\/(longformarticle)\//i.test(path) === false && /\/(article|story|news)\//i.test(path) === false) {
      // For 247Sports, only accept longformarticle and article URLs
      if (u.hostname.includes("247sports")) return false;
      // For On3, article URLs contain /teams/tennessee-volunteers/ or /articles/
      if (u.hostname.includes("on3")) {
        if (!/\/(articles|teams)\//i.test(path)) return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

// Extract candidate article URLs from a scraped list page's markdown + links.
// Returns up to `maxResults` candidates with titles where available.
function extractArticleUrlsFromMarkdown(
  result: FirecrawlScrapeResult,
  baseUrl: string,
  maxResults: number,
): CandidateArticle[] {
  const candidates: CandidateArticle[] = [];
  const seen = new Set<string>();
  const lines = result.markdown.split("\n");

  // Pattern: "### [Title](url)" or "## [Title](url)" — heading with inline link
  const headingLinkRe = /^#{1,4}\s+\[(.+?)\]\((https?:\/\/[^\s)]+)\)/;
  // Pattern: "[Title](url)" — any markdown link with meaningful text. The
  // capture excludes newlines: some sources (On3) wrap each thumbnail as
  // "[![alt](imgurl)](pageurl)" — a link-wrapped image — and a capture group
  // that could span lines greedily eats through the alt text's own closing
  // "]" looking for the outer one, mismatching imgurl as the article URL and
  // desyncing the scan for every real title link that follows on the page.
  const linkRe = /\[([^\]\n]{10,200})\]\((https?:\/\/[^\s)]+)\)/g;

  // First pass: extract from heading-link lines (highest quality)
  for (const line of lines) {
    if (candidates.length >= maxResults) break;
    const trimmed = line.trim();
    const hlMatch = trimmed.match(headingLinkRe);
    if (hlMatch) {
      const title = decodeHtmlEntities(hlMatch[1].trim());
      const url = hlMatch[2];
      if (!seen.has(url) && isArticleUrl(url, baseUrl)) {
        seen.add(url);
        candidates.push({ url, title });
      }
    }
  }

  // Second pass: extract from any markdown links (catches links not in headings)
  if (candidates.length < maxResults) {
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(result.markdown)) !== null && candidates.length < maxResults) {
      const title = decodeHtmlEntities(m[1].trim());
      const url = m[2];
      if (!seen.has(url) && isArticleUrl(url, baseUrl) && title.length > 15) {
        // Skip navigation/UI text patterns
        if (/^(home|about|contact|advertise|subscribe|login|sign up|see more|read more|load more)$/i.test(title)) continue;
        seen.add(url);
        candidates.push({ url, title });
      }
    }
  }

  // Third pass: use raw links if we still don't have enough
  if (candidates.length < maxResults && result.links) {
    for (const link of result.links) {
      if (candidates.length >= maxResults) break;
      const url = typeof link === "string" ? link : link.url;
      if (!seen.has(url) && isArticleUrl(url, baseUrl)) {
        seen.add(url);
        const text = typeof link === "string" ? undefined : link.text;
        candidates.push({ url, title: text ? decodeHtmlEntities(text.trim()) : undefined });
      }
    }
  }

  return candidates;
}

// For On3: extract article URLs with their visible sport labels.
// On3's markdown has articles with labels like "Volquest Basketball" near each title.
function extractOn3Articles(
  result: FirecrawlScrapeResult,
  baseUrl: string,
  maxResults: number,
  labelToSport: (label: string) => SportCategory | null,
): CandidateArticle[] {
  const candidates: CandidateArticle[] = [];
  const seen = new Set<string>();
  const lines = result.markdown.split("\n");

  // On3 articles appear as "### [Title](url)" preceded by a label line
  // or the label is embedded in surrounding text. We scan for heading links
  // and look at nearby text for sport keywords.
  const headingLinkRe = /^#{1,4}\s+\[(.+?)\]\((https?:\/\/[^\s)]+)\)/;

  for (let i = 0; i < lines.length && candidates.length < maxResults; i++) {
    const line = lines[i].trim();
    const match = line.match(headingLinkRe);
    if (match) {
      const title = decodeHtmlEntities(match[1].trim());
      const url = match[2];
      if (!seen.has(url) && isArticleUrl(url, baseUrl)) {
        seen.add(url);
        // Look at surrounding lines (2 before, 2 after) for sport label text
        const context = lines.slice(Math.max(0, i - 2), i + 3).join(" ");
        candidates.push({ url, title, label: context });
      }
    }
  }

  return candidates;
}

// For utsports.com: extract article URLs with their SPORT badge from the archives table.
// The archives page has a table-like structure: Date | Headline (link) | Sport
function extractUtsportsArticles(
  result: FirecrawlScrapeResult,
  baseUrl: string,
  maxResults: number,
): CandidateArticle[] {
  const candidates: CandidateArticle[] = [];
  const seen = new Set<string>();
  const lines = result.markdown.split("\n");

  // The archives page renders as markdown table rows or heading+link patterns.
  // We look for heading links and try to find sport keywords in nearby text.
  const headingLinkRe = /^#{1,4}\s+\[(.+?)\]\((https?:\/\/[^\s)]+)\)/;
  const linkRe = /\[([^\]]{10,200})\]\((https?:\/\/[^\s)]+)\)/g;

  // utsports article URLs contain the sport in the path, e.g. /news/2026/7/9/football-...
  // We can parse the sport from the URL slug itself.
  function sportFromUrl(url: string): string | null {
    try {
      const u = new URL(url);
      const slug = u.pathname.split("/").pop() || "";
      if (slug.startsWith("football")) return "Football";
      if (slug.startsWith("mens-basketball") || slug.includes("mbb")) return "Men's Basketball";
      if (slug.startsWith("womens-basketball") || slug.includes("wbb")) return "Women's Basketball";
      if (slug.startsWith("baseball")) return "Baseball";
      if (slug.startsWith("softball")) return "Softball";
      if (slug.startsWith("mens-golf")) return "Men's Golf";
      if (slug.startsWith("womens-golf")) return "Women's Golf";
      if (slug.startsWith("soccer")) return "Soccer";
      if (slug.startsWith("volleyball")) return "Volleyball";
      if (slug.startsWith("tennis")) return "Tennis";
      if (slug.startsWith("track")) return "Track & Field";
      if (slug.startsWith("swimming")) return "Swimming & Diving";
      if (slug.startsWith("rowing")) return "Rowing";
      if (slug.startsWith("general")) return "General";
      return null;
    } catch {
      return null;
    }
  }

  // First pass: heading links
  for (let i = 0; i < lines.length && candidates.length < maxResults; i++) {
    const line = lines[i].trim();
    const match = line.match(headingLinkRe);
    if (match) {
      const title = decodeHtmlEntities(match[1].trim());
      const url = match[2];
      if (!seen.has(url) && isArticleUrl(url, baseUrl)) {
        seen.add(url);
        const sportBadge = sportFromUrl(url);
        if (sportBadge) {
          candidates.push({ url, title, sportBadge });
        }
      }
    }
  }

  // Second pass: any links
  if (candidates.length < maxResults) {
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(result.markdown)) !== null && candidates.length < maxResults) {
      const title = decodeHtmlEntities(m[1].trim());
      const url = m[2];
      if (!seen.has(url) && isArticleUrl(url, baseUrl) && title.length > 15) {
        if (/^(home|about|contact|advertise)$/i.test(title)) continue;
        seen.add(url);
        const sportBadge = sportFromUrl(url);
        if (sportBadge) {
          candidates.push({ url, title, sportBadge });
        }
      }
    }
  }

  return candidates;
}

// ─── Sport mapping helpers ────────────────────────────────────────────────────

function utsportsBadgeToCategory(badge: string): SportCategory | null {
  const lower = badge.toLowerCase();
  if (lower.includes("football")) return "football";
  if (lower.includes("men's basketball") || lower.includes("mens basketball") || lower === "mbb") return "basketball";
  if (lower.includes("women's basketball") || lower.includes("womens basketball") || lower === "wbb") return "lv-basketball";
  if (lower.includes("baseball")) return "baseball";
  if (lower.includes("softball")) return "lv-softball";
  // Other sports go to "other"
  if (lower.includes("golf") || lower.includes("soccer") || lower.includes("volleyball") ||
      lower.includes("tennis") || lower.includes("track") || lower.includes("swimming") ||
      lower.includes("rowing") || lower.includes("cross country")) return "other";
  if (lower === "general") return "other";
  return null;
}

// ─── Publish date extraction ──────────────────────────────────────────────────

// Two ways a stray, unrelated date can outrank the real one in article text:
//  - Wire-service stock photos (Imagn/USA Today Sports style) carry their own
//    caption as the very first text in the article body — "Aug 30, 2025;
//    Atlanta, Georgia, USA; ... Mandatory Credit: ..." — often an old file
//    photo. A caption date is always immediately followed by ";", which a
//    real byline date never is.
//  - CMS image CDN URLs embed their upload path as .../cms/2025/09/01.../,
//    which happens to match the ISO date pattern. That path date is always
//    immediately preceded by "/", which a real prose date never is.
// Both are old-file-photo artifacts unrelated to when the article was
// actually published, so skip matches like that and keep scanning.
function firstPlausibleDateMatch(
  text: string,
  dateRe: RegExp,
  isSuspicious: (text: string, index: number, matchLength: number) => boolean,
): RegExpMatchArray | null {
  const globalRe = new RegExp(dateRe.source, dateRe.flags.includes("g") ? dateRe.flags : dateRe.flags + "g");
  let m: RegExpExecArray | null;
  while ((m = globalRe.exec(text)) !== null) {
    if (!isSuspicious(text, m.index, m[0].length)) return m;
  }
  return null;
}

const isCaptionDate = (text: string, index: number, matchLength: number) => text[index + matchLength] === ";";
// Suspicious if glued directly onto a URL/filename slug (e.g. ".../cms/2026/05/06.../"
// or "design-2026-05-06T..."), rather than standing on its own the way a real
// prose or metadata date would (preceded by whitespace, punctuation, or nothing).
const isUrlPathDate = (text: string, index: number) => index > 0 && /[A-Za-z0-9/-]/.test(text[index - 1]);

// Try to extract a publish date from the article's markdown or metadata.
function extractPublishDate(result: FirecrawlScrapeResult, sourceUrl?: string): string | null {
  // 1. Firecrawl metadata.publishedAt (if available)
  if (result.metadata?.publishedAt) {
    const d = new Date(result.metadata.publishedAt);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // 2. Try extracting date from the article URL itself (e.g. /2026/07/13/article-slug)
  if (sourceUrl) {
    try {
      const u = new URL(sourceUrl);
      const pathMatch = u.pathname.match(/\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
      if (pathMatch) {
        const d = new Date(`${pathMatch[1]}-${pathMatch[2].padStart(2, "0")}-${pathMatch[3].padStart(2, "0")}T12:00:00Z`);
        if (!isNaN(d.getTime())) return d.toISOString();
      }
    } catch { /* ignore URL parse errors */ }
  }

  const text = result.markdown;
  // 3. Look for common date patterns in the first ~1000 chars (byline area)
  const headerText = text.slice(0, 1500);

  // Pattern: "July 13, 2026" or "Jul 13, 2026" or "July 13 2026"
  const longDateRe = /(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i;
  const longMatch = firstPlausibleDateMatch(headerText, longDateRe, isCaptionDate);
  if (longMatch) {
    const d = new Date(`${longMatch[0]}`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Pattern: "2026-07-13" or "2026/07/13"
  const isoDateRe = /(\d{4})[-/](\d{2})[-/](\d{2})/;
  const isoMatch = firstPlausibleDateMatch(headerText, isoDateRe, isUrlPathDate);
  if (isoMatch) {
    const d = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T12:00:00Z`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Pattern: "X days ago" / "X hours ago" — convert to approximate date
  const agoRe = /(\d+)\s+(day|hour|minute)s?\s+ago/i;
  const agoMatch = headerText.match(agoRe);
  if (agoMatch) {
    const num = parseInt(agoMatch[1]);
    const unit = agoMatch[2].toLowerCase();
    const d = new Date();
    if (unit === "day") d.setDate(d.getDate() - num);
    else if (unit === "hour") d.setHours(d.getHours() - num);
    else d.setMinutes(d.getMinutes() - num);
    return d.toISOString();
  }

  // 4. Look for date patterns deeper in the article (up to 5000 chars)
  const fullText = text.slice(0, 5000);
  const deepMatch = firstPlausibleDateMatch(fullText, longDateRe, isCaptionDate);
  if (deepMatch) {
    const d = new Date(deepMatch[0]);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // 5. Try ISO date deeper in text
  const deepIsoMatch = firstPlausibleDateMatch(fullText, isoDateRe, isUrlPathDate);
  if (deepIsoMatch) {
    const d = new Date(`${deepIsoMatch[1]}-${deepIsoMatch[2]}-${deepIsoMatch[3]}T12:00:00Z`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  return null;
}

// ─── Summary generation ───────────────────────────────────────────────────────

// Generate a 3-5 sentence extractive summary from article body text.
function generateSummary(body: string, title: string): string {
  const clean = body
    .replace(/#{1,6}\s*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")
    // Strip leading section labels (FOOTBALL, MEN'S BASKETBALL, LADY VOLS, BASEBALL, etc.)
    .replace(/^(FOOTBALL|MEN'?S BASKETBALL|BASKETBALL|LADY VOLS|BASEBALL|SOFTBALL|VOL QUEST|VOLQUEST)\s+/i, "")
    // Strip "Skip to main content" and navigation text at the start
    .replace(/^Skip to main content.*?(?=\b[A-Z][a-z])/s, "")
    .replace(/^(Home|Schedule|Football|Basketball|Baseball|Lady Vols|SEC Sports|Odds|Newsletter)\s*[-–]\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) =>
      s.length > 30 &&
      !/^https?:\/\//.test(s) &&
      !/^!\[/.test(s) &&
      !s.startsWith("|") &&  // skip table rows
      !s.startsWith("Advertisement") &&
      !s.startsWith("More Stories") &&
      !s.startsWith("Related") &&
      !s.startsWith("See More") &&
      !s.startsWith("Popular Topics") &&
      !s.startsWith("50% off") &&  // skip 247Sports subscription promos
      !s.startsWith("Stay up to date") &&  // skip generic site descriptions
      !/^(Dan Harralson|Tucker Harlin|Ken Lay)\s/i.test(s) && // skip bylines
      !/^Updated .+\.?\s/i.test(s) // skip "Updated July 13..." lines
    );

  if (sentences.length >= 5) {
    return sentences.slice(0, 5).join(" ");
  }
  if (sentences.length >= 3) {
    return sentences.slice(0, Math.min(sentences.length, 5)).join(" ");
  }
  if (sentences.length >= 1) {
    return sentences.slice(0, Math.min(sentences.length, 5)).join(" ");
  }
  return `${title}. Read the full story for the latest Tennessee Volunteers coverage and analysis.`;
}

// ─── Main ingestion logic ─────────────────────────────────────────────────────

interface IngestedArticle {
  title: string;
  summary: string;
  source_name: string;
  source_url: string;
  thumbnail_url: string | null;
  sport_category: string;
  published_at: string | null;
}

async function processUrlSection(
  source: SourceDef,
  section: SourceSection,
  errors: string[],
): Promise<IngestedArticle[]> {
  const articles: IngestedArticle[] = [];
  const maxArts = source.maxPerSection ?? 10;

  // Step 1: Crawl the list/section page
  const listResult = await scrapeListPage(section.url);
  if (!listResult) return articles;

  // Extract candidate article URLs
  let candidates = extractArticleUrlsFromMarkdown(listResult, section.url, maxArts);
  if (candidates.length === 0) return articles;

  // For VolsWire: validate that the article URL path matches the expected sport.
  // VolsWire list pages have "More Stories" sections that include links from other sports.
  if (source.source_name === "Vols Wire") {
    const sportPathMap: Record<string, string[]> = {
      "football":       ["football"],
      "basketball":     ["mens-basketball"],
      "baseball":       ["baseball"],
      "lv-basketball":  ["lady-vols"],
      "lv-softball":    ["softball"],
    };
    const expectedPaths = sportPathMap[section.sport_category] || [];
    if (expectedPaths.length > 0) {
      candidates = candidates.filter((c) => {
        try {
          const u = new URL(c.url);
          return expectedPaths.some((p) => u.pathname.includes(`/${p}/`));
        } catch { return false; }
      });
    }
  }

  // Step 2: Scrape individual articles sequentially (rate-limit safe)
  for (const cand of candidates) {
    try {
      const articleResult = await scrapeArticle(cand.url);
      if (!articleResult) {
        errors.push(`${source.source_name} (skipped): article scrape returned no content for ${cand.url}`);
        continue;
      }

      const title = articleResult.metadata?.title
        ? decodeHtmlEntities(articleResult.metadata.title.trim())
        : cand.title
          ? decodeHtmlEntities(cand.title.trim())
          : "Untitled";

      if (title.length > 150 || /^(Home|Welcome to)/i.test(title)) {
        errors.push(`${source.source_name} (skipped): rejected title "${title.slice(0, 80)}" for ${cand.url}`);
        continue;
      }

      const thumbnail = articleResult.metadata?.ogImage ?? null;
      const publishedAt = extractPublishDate(articleResult, cand.url);
      if (isTooOld(publishedAt)) {
        errors.push(`${source.source_name} (skipped): too old (${publishedAt}) for ${cand.url}`);
        continue;
      }
      const summary = generateSummary(articleResult.markdown, title);

      articles.push({
        title,
        summary,
        source_name: source.source_name,
        source_url: normalizeUrl(cand.url),
        thumbnail_url: thumbnail,
        sport_category: section.sport_category,
        published_at: publishedAt,
      } as IngestedArticle);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${source.source_name} (skipped): exception for ${cand.url}: ${msg}`);
    }
  }

  return articles;
}

async function processLabelSource(source: SourceDef): Promise<IngestedArticle[]> {
  if (!source.feed_url || !source.labelToSport) return [];
  const articles: IngestedArticle[] = [];
  const maxArts = source.maxPerSection ?? 20;

  const listResult = await scrapeListPage(source.feed_url);
  if (!listResult) return articles;

  const candidates = extractArticleUrlsFromMarkdown(listResult, source.feed_url, maxArts);
  if (candidates.length === 0) return articles;

  for (const cand of candidates) {
    try {
      const sport = source.labelToSport!(cand.title || "");
      if (!sport) continue;

      const articleResult = await scrapeArticle(cand.url);
      if (!articleResult) continue;

      const title = articleResult.metadata?.title
        ? decodeHtmlEntities(articleResult.metadata.title.trim())
        : cand.title
          ? decodeHtmlEntities(cand.title.trim())
          : "Untitled";

      if (title.length > 150 || /^(Home|Welcome to)/i.test(title)) continue;

      const thumbnail = articleResult.metadata?.ogImage ?? null;
      const publishedAt = extractPublishDate(articleResult, cand.url);
      if (isTooOld(publishedAt)) continue;
      const summary = generateSummary(articleResult.markdown, title);

      articles.push({
        title,
        summary,
        source_name: source.source_name,
        source_url: normalizeUrl(cand.url),
        thumbnail_url: thumbnail,
        sport_category: sport,
        published_at: publishedAt,
      } as IngestedArticle);
    } catch { /* skip failed article */ }
  }

  return articles;
}

async function processColumnSource(source: SourceDef): Promise<IngestedArticle[]> {
  if (!source.feed_url) return [];
  const articles: IngestedArticle[] = [];
  const maxArts = source.maxPerSection ?? 25;

  const listResult = await scrapeListPage(source.feed_url);
  if (!listResult) return articles;

  const candidates = extractUtsportsArticles(listResult, source.feed_url, maxArts);
  if (candidates.length === 0) return articles;

  for (const cand of candidates) {
    try {
      if (!cand.sportBadge) continue;
      const sport = utsportsBadgeToCategory(cand.sportBadge);
      if (!sport) continue;

      const articleResult = await scrapeArticle(cand.url);
      if (!articleResult) continue;

      const title = articleResult.metadata?.title
        ? decodeHtmlEntities(articleResult.metadata.title.trim())
        : cand.title
          ? decodeHtmlEntities(cand.title.trim())
          : "Untitled";

      if (title.length > 150 || /^(Home|Welcome to)/i.test(title)) continue;

      const thumbnail = articleResult.metadata?.ogImage ?? null;
      const publishedAt = extractPublishDate(articleResult, cand.url);
      if (isTooOld(publishedAt)) continue;
      const summary = generateSummary(articleResult.markdown, title);

      articles.push({
        title,
        summary,
        source_name: source.source_name,
        source_url: normalizeUrl(cand.url),
        thumbnail_url: thumbnail,
        sport_category: sport,
        published_at: publishedAt,
      } as IngestedArticle);
    } catch { /* skip failed article */ }
  }

  return articles;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // ── Load blocklist so deleted articles are never re-ingested ────────────────
  const { data: blocklistRows } = await supabase
    .from("content_blocklist")
    .select("external_id")
    .eq("content_type", "article");
  const blocklist = new Set((blocklistRows ?? []).map((r: { external_id: string }) => r.external_id));

  const errors: string[] = [];
  let totalUpserted = 0;

  // Support ?source=<name> query param for testing individual sources
  const urlObj = new URL(req.url);
  const filterSource = urlObj.searchParams.get("source");

  for (const source of SOURCES) {
    // Skip sources not matching the filter (if provided)
    if (filterSource && source.source_name !== filterSource) continue;

    try {
      let articles: IngestedArticle[] = [];

      if (source.tag_method === "url" && source.sections) {
        // Process each per-sport section URL
        for (const section of source.sections) {
          try {
            const sectionArts = await processUrlSection(source, section, errors);
            articles.push(...sectionArts);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`Section ${section.url} failed: ${msg}`);
          }
        }
      } else if (source.tag_method === "label") {
        articles = await processLabelSource(source);
      } else if (source.tag_method === "column") {
        articles = await processColumnSource(source);
      }

      if (articles.length === 0) {
        errors.push(`No articles extracted from ${source.source_name}`);
        continue;
      }

      // Deduplicate by source_url (same article may appear in multiple sections)
      // Normalize URLs to strip fragments like #comments before dedup
      const seen = new Set<string>();
      const unique = articles.filter((a) => {
        const normalized = normalizeUrl(a.source_url);
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      }).map((a) => ({
        ...a,
        source_url: normalizeUrl(a.source_url),
      })).filter((a) => {
        // Skip blocklisted articles (query-param-stripped comparison)
        let stripped: string;
        try {
          const u = new URL(a.source_url);
          stripped = u.origin + u.pathname;
        } catch {
          stripped = a.source_url.split("?")[0];
        }
        return !blocklist.has(stripped);
      });

      // Add ingested_at for each article
      const now = new Date().toISOString();
      const rows = unique.map((a) => ({
        ...a,
        ingested_at: now,
      }));

      const { error } = await supabase
        .from("scraped_articles")
        .upsert(rows, { onConflict: "source_url", ignoreDuplicates: false });

      if (error) {
        errors.push(`DB upsert error for ${source.source_name}: ${error.message}`);
      } else {
        totalUpserted += rows.length;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Source ${source.source_name} failed: ${msg}`);
      console.error(msg);
    }

    // Brief pause between sources
    await new Promise((r) => setTimeout(r, 200));
  }

  // Update system_health
  await supabase
    .from("system_health")
    .upsert(
      {
        source_name: "news_ingestion",
        last_successful_run: new Date().toISOString(),
        status: "healthy",
      },
      { onConflict: "source_name" },
    );

  const body = {
    ok: true,
    upserted: totalUpserted,
    errors: errors.length,
    error_details: errors,
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
