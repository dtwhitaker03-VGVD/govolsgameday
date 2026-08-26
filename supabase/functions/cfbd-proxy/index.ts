import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CFBD_BASE = "https://api.collegefootballdata.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Freshness of the "upcoming game" data is guaranteed by game-sync's
// twice-weekly schedule (Monday 12am ET and Saturday 11pm ET), which calls
// this function with force=true to refresh the cache in lockstep. Regular
// (non-forced) requests just serve whatever's cached, however old — no
// separate CFBD call gets triggered by ordinary site traffic. The only
// exception is a real fetch as a one-time bootstrap if nothing has ever
// been cached yet.
interface RequestBody {
  type?: string;
  videoId?: string;
  url?: string;
  sport_category?: string;
  force?: boolean;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const apiKey = Deno.env.get("CFBC_API_KEY");
  if (!apiKey) {
    return json({ error: "CFBD API key not configured" }, 500);
  }

  let body: RequestBody = {};
  try {
    body = await req.json();
  } catch {
    const url = new URL(req.url);
    body = { type: url.searchParams.get("type") ?? "" };
  }

  if (body.type === "upcoming") {
    // "force" bypasses the cache to make a real CFBD call — only honored
    // when the caller authenticates as the service role (game-sync's own
    // scheduled calls), so a public caller can't spam real API calls.
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const isPrivileged = !!serviceKey && req.headers.get("Authorization") === `Bearer ${serviceKey}`;
    return await getUpcomingGame(apiKey, body.force === true && isPrivileged);
  }

  if (body.type === "youtube_lookup") {
    return await youtubeLookup(body.videoId);
  }

  if (body.type === "article_scrape") {
    return await articleScrape(body.url, body.sport_category);
  }

  return json({ error: "Unknown request type" }, 400);
});

// ─── YouTube single-video lookup (Add Video tool) ─────────────────────────────

async function youtubeLookup(videoId: string) {
  const ytKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!ytKey) return json({ error: "YouTube API key not configured" }, 500);
  if (!videoId) return json({ error: "Missing videoId" }, 400);

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({
        part: "snippet,statistics,contentDetails",
        id: videoId,
        key: ytKey,
      })}`
    );
    if (!res.ok) {
      return json({ error: `YouTube API error (HTTP ${res.status})` }, res.status);
    }
    const data = await res.json() as {
      items?: Array<{
        snippet: {
          title: string;
          publishedAt: string;
          channelTitle: string;
          thumbnails: { high?: { url: string }; medium?: { url: string } };
        };
        statistics: { viewCount?: string };
        contentDetails: { duration: string };
      }>;
    };

    if (!data.items?.length) {
      return json({ error: "Video not found or is private/deleted" }, 404);
    }

    const item = data.items[0];
    const thumb =
      item.snippet.thumbnails?.high?.url ??
      item.snippet.thumbnails?.medium?.url ??
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    return json({
      video: {
        title: item.snippet.title,
        thumbnail_url: thumb,
        duration: parseDuration(item.contentDetails.duration),
        view_count: parseInt(item.statistics.viewCount ?? "0"),
        published_at: item.snippet.publishedAt,
        channel_name: item.snippet.channelTitle,
      },
    });
  } catch (err) {
    return json({ error: `YouTube lookup failed: ${String(err)}` }, 500);
  }
}

function parseDuration(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "";
  const h = parseInt(m[1] ?? "0");
  const min = parseInt(m[2] ?? "0");
  const s = parseInt(m[3] ?? "0");
  const mm = h > 0 ? String(min).padStart(2, "0") : String(min);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ─── Article scrape via Firecrawl (Add Article tool) ──────────────────────────

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function normalizeUrl(url: string): string {
  return url.replace(/#.*$/, "").replace(/\/+$/, "");
}

function generateSummary(body: string, title: string): string {
  const clean = body
    .replace(/#{1,6}\s*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")
    // Strip byline/date/share-widget boilerplate wherever it appears — not
    // just when it forms its own clean sentence, since abbreviations like
    // "No." or "Aug." can otherwise split it mid-block and let fragments
    // leak into the summary.
    .replace(/\bUpdated\s+[A-Za-z]+\.?\s*\d{0,2}(,?\s*\d{4})?\.?\s*(ET)?\b/gi, "")
    .replace(/Share\s+to\s+(Twitter|Facebook|X|Reddit|LinkedIn|Pinterest|WhatsApp)/gi, "")
    .replace(/Share\s+by\s+email/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) =>
      s.length > 30 &&
      !/^https?:\/\//.test(s) &&
      !s.startsWith("|") &&
      !s.startsWith("Advertisement") &&
      !s.startsWith("More Stories") &&
      !s.startsWith("Related") &&
      !s.startsWith("See More") &&
      !s.startsWith("Popular Topics")
    );

  if (sentences.length >= 2) return sentences.slice(0, 2).join(" ");
  if (sentences.length === 1) return sentences[0];
  return `${title}. Read the full story for the latest Tennessee Volunteers coverage and analysis.`;
}

function extractPublishDate(metadata: { publishedAt?: string }, sourceUrl: string): string | null {
  if (metadata?.publishedAt) {
    const d = new Date(metadata.publishedAt);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  try {
    const u = new URL(sourceUrl);
    const pathMatch = u.pathname.match(/\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
    if (pathMatch) {
      const d = new Date(`${pathMatch[1]}-${pathMatch[2].padStart(2, "0")}-${pathMatch[3].padStart(2, "0")}T12:00:00Z`);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  } catch { /* ignore */ }
  return null;
}

async function articleScrape(url: string, sportCategory: string) {
  const fcKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!fcKey) return json({ error: "Firecrawl API key not configured" }, 500);
  if (!url) return json({ error: "Missing URL" }, 400);

  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${fcKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        timeout: 15000,
      }),
    });

    if (!res.ok) {
      return json({ error: `Firecrawl scrape failed (HTTP ${res.status})` }, res.status);
    }

    const data = await res.json() as {
      success: boolean;
      data?: {
        markdown: string;
        metadata?: {
          title?: string;
          ogImage?: string;
          sourceURL?: string;
          publishedAt?: string;
        };
      };
    };

    if (!data.success || !data.data) {
      return json({ error: "Firecrawl returned no content" }, 422);
    }

    const title = data.data.metadata?.title
      ? decodeHtmlEntities(data.data.metadata.title.trim())
      : "Untitled";
    const thumbnail = data.data.metadata?.ogImage ?? null;
    const publishedAt = extractPublishDate(data.data.metadata ?? {}, url);
    const summary = generateSummary(data.data.markdown, title);

    let sourceName = "Manual";
    try {
      const u = new URL(url);
      sourceName = u.hostname.replace(/^www\./, "").split(".")[0];
      sourceName = sourceName.charAt(0).toUpperCase() + sourceName.slice(1);
    } catch { /* keep default */ }

    const article = {
      title,
      summary,
      source_name: sourceName,
      source_url: normalizeUrl(url),
      thumbnail_url: thumbnail,
      sport_category: sportCategory || "main",
      published_at: publishedAt,
    };

    const supabase = getSupabaseClient();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 14);

    const { error } = await supabase.from("scraped_articles").insert({
      ...article,
      ingested_at: new Date().toISOString(),
      is_pinned: true,
      pin_expires_at: expiry.toISOString(),
    });

    if (error) {
      return json({ error: `DB insert failed: ${error.message}` }, 500);
    }

    return json({ article });
  } catch (err) {
    return json({ error: `Article scrape failed: ${String(err)}` }, 500);
  }
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function getCachedAny(supabase: ReturnType<typeof getSupabaseClient>, key: string) {
  const { data } = await supabase
    .from("cfbd_cache")
    .select("payload")
    .eq("cache_key", key)
    .maybeSingle();
  return (data?.payload as Record<string, unknown> | undefined) ?? null;
}

async function setCached(
  supabase: ReturnType<typeof getSupabaseClient>,
  key: string,
  payload: Record<string, unknown>
) {
  await supabase
    .from("cfbd_cache")
    .upsert({ cache_key: key, payload, fetched_at: new Date().toISOString() }, { onConflict: "cache_key" });
}

// ─── CFBD fetch helpers ──────────────────────────────────────────────────────

async function cfbdFetch(path: string, apiKey: string): Promise<unknown[]> {
  try {
    const res = await fetch(`${CFBD_BASE}${path}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function cfbdFetchCritical(
  path: string,
  apiKey: string
): Promise<{ ok: true; data: unknown[] } | { ok: false; status: number; message: string }> {
  try {
    const res = await fetch(`${CFBD_BASE}${path}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      let message = `CFBD API returned HTTP ${res.status}`;
      if (res.status === 401) message = "CFBD API key invalid or missing (HTTP 401)";
      else if (res.status === 403) message = "CFBD API key lacks required permissions (HTTP 403)";
      else if (res.status === 429) message = "CFBD API rate limit exceeded (HTTP 429)";
      else if (res.status >= 500) message = `CFBD API server error (HTTP ${res.status})`;
      return { ok: false, status: res.status, message };
    }
    const data = await res.json().catch(() => null);
    if (!Array.isArray(data)) {
      return { ok: false, status: 200, message: "CFBD returned unexpected schedule shape" };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, status: 0, message: `Network error reaching CFBD: ${String(err)}` };
  }
}

// ─── Main logic ──────────────────────────────────────────────────────────────

async function getUpcomingGame(apiKey: string, force: boolean) {
  const supabase = getSupabaseClient();
  const cacheKey = "upcoming_game";

  if (!force) {
    // Not a scheduled refresh — serve whatever's cached regardless of age.
    // Only fall through to a real fetch if nothing has ever been cached
    // (first-ever run, before game-sync has synced anything yet).
    const cached = await getCachedAny(supabase, cacheKey);
    if (cached) {
      return json({ ...cached, cached: true });
    }
  }

  // Real fetch — either a forced, scheduled refresh, or a one-time bootstrap.
  const year = new Date().getFullYear();
  const todayIso = new Date().toISOString();

  // Schedule is the critical call
  const scheduleResult = await cfbdFetchCritical(
    `/games?year=${year}&team=Tennessee&seasonType=regular&division=fbs`,
    apiKey
  );

  if (!scheduleResult.ok) {
    // If we have a stale cache entry, serve it rather than showing an error
    const { data: stale } = await supabase
      .from("cfbd_cache")
      .select("payload")
      .eq("cache_key", cacheKey)
      .maybeSingle();

    if (stale?.payload) {
      return json({ ...stale.payload, cached: true, stale: true });
    }

    return json(
      {
        upcoming: null,
        reason: "api_error",
        apiStatus: scheduleResult.status,
        message: scheduleResult.message,
      },
      502
    );
  }

  const schedule = scheduleResult.data;

  // Find next game after today
  const future = (schedule as GameEntry[])
    .filter((g) => !g.completed && g.startDate > todayIso)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  if (future.length === 0) {
    const payload = { upcoming: null, reason: "no_games" };
    await setCached(supabase, cacheKey, payload);
    return json(payload);
  }

  const game = future[0];
  const tennesseeIsHome = game.homeTeam === "Tennessee";
  const opponentName = tennesseeIsHome ? game.awayTeam : game.homeTeam;

  // 3. Fetch supplementary data — only 2 parallel calls instead of 6:
  //    - Teams (for logos, both TN + opponent in one call each)
  //    - Records (for current season)
  //    Skip rankings and stats during pre-season (they're empty anyway)
  const hasSeasonStarted = schedule.some((g) => g.completed);

  const [records, tnTeam, opponentTeam] = await Promise.all([
    cfbdFetch(`/records?year=${year}`, apiKey),
    cfbdFetch(`/teams?team=Tennessee`, apiKey),
    cfbdFetch(`/teams?team=${encodeURIComponent(opponentName)}`, apiKey),
  ]);

  // Only fetch rankings/stats if the season has actually started
  let rankings: RankingWeek[] = [];
  let stats: StatEntry[] = [];
  if (hasSeasonStarted) {
    [rankings, stats] = await Promise.all([
      cfbdFetch(`/rankings?year=${year}&seasonType=regular`, apiKey),
      cfbdFetch(`/stats/season?year=${year}`, apiKey),
    ]) as [RankingWeek[], StatEntry[]];
  }

  // Records
  const getRecord = (team: string) => {
    const r = (records as RecordEntry[]).find((x) => x.team === team);
    return r ? { wins: r.total.wins, losses: r.total.losses } : null;
  };

  // Rankings
  const latestWeek = rankings.length > 0
    ? rankings.sort((a, b) => b.week - a.week)[0]
    : null;

  const getRanking = (team: string, pollName: string): number | null => {
    if (!latestWeek) return null;
    const poll = latestWeek.polls?.find((p) => p.poll === pollName);
    if (!poll) return null;
    const entry = poll.ranks?.find((r) => r.school === team);
    return entry?.rank ?? null;
  };

  // Stats
  const buildStatRank = (team: string, statName: string, ascending = false) => {
    const entries = stats
      .filter((s) => s.statName === statName && s.statValue != null)
      .sort((a, b) => ascending ? a.statValue - b.statValue : b.statValue - a.statValue);
    const idx = entries.findIndex((s) => s.team === team);
    if (idx < 0) return null;
    return { value: entries[idx].statValue, rank: idx + 1 };
  };

  const buildTeamStats = (team: string) => ({
    scoringOffense: buildStatRank(team, "points", false),
    totalOffense: buildStatRank(team, "totalYards", false),
    passingYards: buildStatRank(team, "netPassingYards", false),
    rushingYards: buildStatRank(team, "rushingYards", false),
    // Defensive stats — CFBD doesn't provide "points allowed" or "yards allowed"
    // in the basic season stats endpoint, so these will be null pre-season.
    // The card shows em dashes for null values per spec.
    scoringDefense: null as { value: number; rank: number } | null,
    totalDefense: null as { value: number; rank: number } | null,
  });

  // Logo — CFBD's /teams doesn't reliably filter server-side, and each
  // entry's logos are plain URL strings (not {href} objects), so match by
  // school name client-side and take the string directly.
  const getLogo = (teamArr: TeamEntry[], team: string) => {
    const t = teamArr.find((x) => x.school === team) ?? teamArr[0];
    return t?.logos?.[0] ?? null;
  };

  const payload = {
    upcoming: {
      game: {
        id: game.id,
        date: game.startDate,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        venue: game.venue,
        neutralSite: game.neutralSite ?? false,
      },
      tennesseeIsHome,
      tennessee: {
        record: getRecord("Tennessee"),
        ranking_ap: getRanking("Tennessee", "AP Top 25"),
        ranking_coaches: getRanking("Tennessee", "Coaches Poll"),
        logo: getLogo(tnTeam as TeamEntry[], "Tennessee"),
        stats: buildTeamStats("Tennessee"),
      },
      opponent: {
        name: opponentName,
        record: getRecord(opponentName),
        ranking_ap: getRanking(opponentName, "AP Top 25"),
        ranking_coaches: getRanking(opponentName, "Coaches Poll"),
        logo: getLogo(opponentTeam as TeamEntry[], opponentName),
        stats: buildTeamStats(opponentName),
      },
    },
  };

  // Cache the result
  await setCached(supabase, cacheKey, payload);

  return json({ ...payload, cached: false });
}

// ---- Type shapes ----

interface GameEntry {
  id: number;
  startDate: string;
  completed: boolean;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  neutralSite?: boolean;
}

interface RecordEntry {
  team: string;
  total: { wins: number; losses: number };
}

interface RankingWeek {
  season: number;
  week: number;
  seasonType: string;
  polls: Array<{
    poll: string;
    ranks: Array<{ rank: number; school: string }>;
  }>;
}

interface StatEntry {
  team: string;
  statName: string;
  statValue: number;
}

interface TeamEntry {
  school: string;
  logos?: string[];
}
