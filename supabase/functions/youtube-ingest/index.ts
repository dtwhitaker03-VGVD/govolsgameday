import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ─── Config ──────────────────────────────────────────────────────────────────

const YOUTUBE_API_KEY  = Deno.env.get("YOUTUBE_API_KEY")!;
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MIN_VIEW_COUNT = 500;
const PUBLISHED_DAYS = 14;

// ─── Part B — Tier 1 and Tier 2 priority channels (§17, §38 Part B) ──────────

interface ChannelConfig {
  name: string;
  handle: string;
  channelId?: string;
  priority: 1 | 2;
}

const PRIORITY_CHANNELS: ChannelConfig[] = [
  // ── Tier 1 ──
  { name: "Volquest",                      handle: "@TennesseeVolunteersFootball",                                  priority: 1 },
  { name: "Talkin' VAWLS Network",         handle: "@TalkinVAWLSNetwork",                                          priority: 1 },
  { name: "OffTheHookSports",              handle: "@offthehooksports",  channelId: "UCWXTi2Dix66omkfcmcUCH5w",    priority: 1 },
  { name: "Locked On Vols",               handle: "@LockedOnVols",      channelId: "UCOUPSMo-PS5kU5CrWh5WFqg",    priority: 1 },
  { name: "TN Fan Talk",                   handle: "@tnfantalk",                                                    priority: 1 },
  { name: "Bluechip Breakdown",            handle: "@bluechipbreakdown",                                            priority: 1 },
  { name: "Vol Freak",                     handle: "@volfreak",          channelId: "UCH9YFd-kZe4jscnWfDyRU_Q",    priority: 1 },
  { name: "Sports Talk J",                 handle: "@sportstalkj5110",   channelId: "UCe0hcOQ9ACndfZL0hxYfJLA",    priority: 1 },
  { name: "Tennessee Football Talk",       handle: "@volstalk",          channelId: "UCWOngCoRZqm3sNd_XKT5Tkw",    priority: 1 },
  // ── Tier 2 ──
  { name: "Matt Mitchell (SEC Roll Call)", handle: "@alostrich",         channelId: "UCRAoLjIeDYFOSuXFImfecqg",    priority: 2 },
  { name: "SEC Shorts",                    handle: "@SECShorts",                                                    priority: 2 },
];

// Channels permanently blocked from all ingestion paths.
const CHANNEL_DENYLIST = new Set([
  "UCDGjAh6DJ_DgpKiC3kFaPKg", // WVLT News
  "UCCXmwylX3eAUZ4Ul4gHfdBw", // WVLT News alternate
  "UCD9UkxpIo5W16Ou3eo4eZbA", // Tennessee Athletics / Vol Network
]);

// ─── Part A — keyword-search configs ─────────────────────────────────────────
// Two-factor filter applied to every result:
//   1. Team-identity: must contain "vols", "volunteers", or "lady vols"
//      ("tennessee" alone no longer qualifies — too broad, matches Titans etc.)
//   2. Sport-context: must contain a term from sportTerms for that category
//   3. Pro-team exclusion: reject if a pro/rival team name is in the title
//      unless "vols"/"volunteers" is clearly the subject

const QUERY_CONFIGS: Array<{
  queries: string[];
  sport_category: string;
  sportTerms: string[];
  excludeTerms?: string[];
}> = [
  {
    sport_category: "main",
    queries: ["Tennessee Volunteers 2026", "Tennessee Vols highlights"],
    sportTerms: ["vols", "volunteers", "lady vols"],
  },
  {
    sport_category: "football",
    queries: ["Tennessee Vols football", "Tennessee Football highlights", "Josh Heupel"],
    sportTerms: ["football", "heupel", "gridiron", "sec football", "offense", "defense",
                 "quarterback", "touchdown", "recruiting"],
    excludeTerms: ["basketball", "baseball", "softball"],
  },
  {
    sport_category: "basketball",
    queries: ["Tennessee Vols basketball", "Rick Barnes Tennessee"],
    sportTerms: ["basketball", "barnes", "hoops", "sec basketball", "ncaa tournament",
                 "march madness", "point guard", "dunk"],
    excludeTerms: ["football", "baseball", "softball"],
  },
  {
    sport_category: "baseball",
    queries: ["Tennessee Vols baseball", "Lindsey Nelson Stadium"],
    sportTerms: ["baseball", "lindsey nelson", "pitcher", "home run", "college world series",
                 "cws", "innings", "strikeout"],
    excludeTerms: ["football", "basketball"],
  },
  {
    sport_category: "lv-basketball",
    queries: ["Lady Vols basketball", "Kim Caldwell press conference"],
    sportTerms: ["basketball", "caldwell", "lady vols", "women's basketball", "wnit", "ncaa women"],
  },
  {
    sport_category: "lv-softball",
    queries: ["Lady Vols softball", "Tennessee softball SEC"],
    sportTerms: ["softball", "lady vols softball", "womens softball"],
  },
  {
    sport_category: "football-recruiting",
    queries: [
      "Tennessee football recruiting",
      "Tennessee Vols football commitment",
      "Tennessee football signing class",
      "Tennessee Vols QB recruit",
      "Tennessee Vols running back recruit",
    ],
    sportTerms: ["recruit", "commitment", "commit", "signing", "decommit", "portal",
                 "transfer", "class of", "five-star", "four-star", "football",
                 "quarterback", "running back", "wide receiver", "offensive line",
                 "defensive", "linebacker", "cornerback", "safety", "kicker",
                 "fall camp", "nil", "flip"],
    excludeTerms: ["basketball", "baseball", "softball", "lady vols"],
  },
  {
    sport_category: "other-recruiting",
    queries: [
      "Tennessee basketball recruiting",
      "Tennessee Vols basketball commitment",
      "Tennessee basketball signing class",
      "Lady Vols basketball recruiting",
      "Tennessee softball recruiting",
    ],
    sportTerms: ["recruit", "commitment", "commit", "signing", "decommit", "portal",
                 "transfer", "class of", "five-star", "four-star",
                 "basketball", "baseball", "softball", "lady vols",
                 "point guard", "center", "forward", "pitcher", "catcher"],
    excludeTerms: ["football", "quarterback", "running back", "linebacker",
                   "cornerback", "fall camp"],
  },
  {
    sport_category: "other",
    queries: [
      "Tennessee Volunteers soccer",
      "Tennessee Vols track",
      "Tennessee Volunteers volleyball",
    ],
    sportTerms: ["soccer", "track", "volleyball", "swimming", "tennis", "cross country",
                 "rowing", "golf", "diving"],
  },
];

// ─── Filter helpers ───────────────────────────────────────────────────────────

// Team-identity terms — "tennessee" alone excluded (matches Titans, etc.)
const TEAM_IDENTITY_TERMS = ["vols", "volunteers", "lady vols"];

// Pro/rival team names that should never be the primary subject of a result.
const PRO_TEAM_EXCLUSIONS = [
  "titans", "grizzlies", "predators", "memphis tigers",
  "vanderbilt", "alabama", "clemson", "ohio state", "georgia", "lsu",
  "florida gators", "kentucky wildcats", "michigan wolverines",
  "notre dame", "oklahoma sooners",
  "netherlands", "tunisia", "premier league", "bundesliga", "serie a", "la liga",
];

function passesStrictRelevanceFilter(
  title: string,
  description: string,
  sportTerms: string[],
): boolean {
  const combined = (title + " " + description).toLowerCase();
  const titleLower = title.toLowerCase();

  // Factor 1: must contain a UT team-identity term
  if (!TEAM_IDENTITY_TERMS.some((t) => combined.includes(t))) return false;

  // Factor 2: must contain a sport-context term for this category
  if (!sportTerms.some((t) => combined.includes(t))) return false;

  // Factor 3: reject if a pro/rival name appears in title without Vols context
  const isVolsInTitle = TEAM_IDENTITY_TERMS.some((t) => titleLower.includes(t));
  for (const proTeam of PRO_TEAM_EXCLUSIONS) {
    if (titleLower.includes(proTeam) && !isVolsInTitle) return false;
  }

  return true;
}

function passesExclusionFilter(title: string, excludeTerms?: string[]): boolean {
  if (!excludeTerms) return true;
  const lower = title.toLowerCase();
  const isVolsInTitle = TEAM_IDENTITY_TERMS.some((t) => lower.includes(t));
  for (const term of excludeTerms) {
    if (lower.includes(term) && !isVolsInTitle) return false;
  }
  return true;
}

// ─── Shared types ─────────────────────────────────────────────────────────────

interface VideoResult {
  youtube_video_id: string;
  title:            string;
  thumbnail_url:    string;
  video_url:        string;
  duration:         string;
  view_count:       number;
  sport_category:   string;
  published_at:     string;   // YouTube snippet.publishedAt — always captured
  channel_name?:    string;
  channel_priority?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function publishedAfterISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
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

// ─── Part A: keyword search ───────────────────────────────────────────────────

async function searchVideos(
  query: string,
  sport_category: string,
  sportTerms: string[],
  excludeTerms?: string[],
): Promise<VideoResult[]> {
  const params = new URLSearchParams({
    part: "snippet", q: query, type: "video",
    publishedAfter: publishedAfterISO(PUBLISHED_DAYS),
    maxResults: "25", order: "viewCount", key: YOUTUBE_API_KEY,
  });

  const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (!searchRes.ok) throw new Error(`YouTube search failed for "${query}": ${await searchRes.text()}`);

  const searchData = await searchRes.json() as {
    items?: Array<{
      id: { videoId: string };
      snippet: {
        title: string; description: string; channelId: string;
        publishedAt: string;   // YouTube's real publish date
        thumbnails: { high?: { url: string }; medium?: { url: string } };
      };
    }>;
  };

  const items = (searchData.items ?? []).filter((item) => {
    if (CHANNEL_DENYLIST.has(item.snippet.channelId)) return false;
    const title = decodeHtmlEntities(item.snippet.title);
    return (
      passesExclusionFilter(title, excludeTerms) &&
      passesStrictRelevanceFilter(title, item.snippet.description ?? "", sportTerms)
    );
  });
  if (items.length === 0) return [];

  const ids = items.map((i) => i.id.videoId).join(",");
  const statsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({
      part: "statistics,contentDetails", id: ids, key: YOUTUBE_API_KEY,
    })}`
  );
  if (!statsRes.ok) throw new Error(`YouTube stats fetch failed: ${await statsRes.text()}`);

  const statsData = await statsRes.json() as {
    items?: Array<{ id: string; statistics: { viewCount?: string }; contentDetails: { duration: string } }>;
  };
  const statsMap = new Map((statsData.items ?? []).map((s) => [s.id, s]));

  const results: VideoResult[] = [];
  for (const item of items) {
    const videoId = item.id.videoId;
    const stats = statsMap.get(videoId);
    if (!stats) continue;
    const views = parseInt(stats.statistics.viewCount ?? "0");
    if (views < MIN_VIEW_COUNT) continue;
    const thumb =
      item.snippet.thumbnails?.high?.url ??
      item.snippet.thumbnails?.medium?.url ??
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    results.push({
      youtube_video_id: videoId,
      title: decodeHtmlEntities(item.snippet.title),
      thumbnail_url: thumb,
      video_url: `https://www.youtube.com/watch?v=${videoId}`,
      duration: parseDuration(stats.contentDetails.duration),
      view_count: views,
      sport_category,
      published_at: item.snippet.publishedAt,
      // channel_name and channel_priority intentionally omitted —
      // stays NULL so video lands in Tier 3 for the Main Page.
    });
  }
  return results;
}

// ─── Part B: channel-priority uploads-playlist fetch ─────────────────────────

async function fetchChannelVideos(channel: ChannelConfig): Promise<VideoResult[]> {
  const channelParams = new URLSearchParams({
    part: "contentDetails",
    key:  YOUTUBE_API_KEY,
    ...(channel.channelId
      ? { id: channel.channelId }
      : { forHandle: channel.handle }),
  });

  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?${channelParams}`
  );
  if (!channelRes.ok) {
    throw new Error(`Channel lookup failed for ${channel.handle}: ${await channelRes.text()}`);
  }
  const channelData = await channelRes.json() as {
    items?: Array<{
      id: string;
      contentDetails: { relatedPlaylists: { uploads: string } };
    }>;
  };
  if (!channelData.items?.length) {
    throw new Error(`No channel found for ${channel.channelId ?? channel.handle}`);
  }
  const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PUBLISHED_DAYS);

  const playlistRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?${new URLSearchParams({
      part: "snippet", playlistId: uploadsPlaylistId, maxResults: "10", key: YOUTUBE_API_KEY,
    })}`
  );
  if (!playlistRes.ok) {
    throw new Error(`Playlist fetch failed for ${channel.name}: ${await playlistRes.text()}`);
  }
  const playlistData = await playlistRes.json() as {
    items?: Array<{
      snippet: {
        publishedAt: string;
        title: string;
        resourceId: { videoId: string };
        thumbnails: { high?: { url: string }; medium?: { url: string } };
      };
    }>;
  };

  const recentItems = (playlistData.items ?? []).filter(
    (item) => new Date(item.snippet.publishedAt) >= cutoff
  );
  if (recentItems.length === 0) return [];

  const videoIds = recentItems.map((i) => i.snippet.resourceId.videoId).join(",");
  const statsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({
      part: "statistics,contentDetails", id: videoIds, key: YOUTUBE_API_KEY,
    })}`
  );
  if (!statsRes.ok) throw new Error(`Stats fetch failed for ${channel.name}`);
  const statsData = await statsRes.json() as {
    items?: Array<{ id: string; statistics: { viewCount?: string }; contentDetails: { duration: string } }>;
  };
  const statsMap = new Map((statsData.items ?? []).map((s) => [s.id, s]));

  const results: VideoResult[] = [];
  for (const item of recentItems) {
    const videoId = item.snippet.resourceId.videoId;
    const stats = statsMap.get(videoId);
    if (!stats) continue;

    const thumb =
      item.snippet.thumbnails?.high?.url ??
      item.snippet.thumbnails?.medium?.url ??
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    results.push({
      youtube_video_id:  videoId,
      title:             decodeHtmlEntities(item.snippet.title),
      thumbnail_url:     thumb,
      video_url:         `https://www.youtube.com/watch?v=${videoId}`,
      duration:          parseDuration(stats.contentDetails.duration),
      view_count:        parseInt(stats.statistics.viewCount ?? "0"),
      sport_category:    "main",
      published_at:      item.snippet.publishedAt,
      channel_name:      channel.name,
      channel_priority:  channel.priority,
    });
  }
  return results;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // ── Load blocklist so deleted videos are never re-ingested ──────────────────
  const { data: blocklistRows } = await supabase
    .from("content_blocklist")
    .select("external_id")
    .eq("content_type", "video");
  const blocklist = new Set((blocklistRows ?? []).map((r: { external_id: string }) => r.external_id));

  const errors: string[] = [];
  let totalUpserted = 0;

  // ── Part A: keyword search — feeds all sport pages + Main Page Tier 3 ──────
  for (const config of QUERY_CONFIGS) {
    for (const query of config.queries) {
      try {
        const videos = await searchVideos(
          query,
          config.sport_category,
          config.sportTerms,
          config.excludeTerms,
        );
        if (videos.length === 0) continue;

        const filtered = videos.filter((v) => !blocklist.has(v.youtube_video_id));
        if (filtered.length === 0) continue;

        const { error } = await supabase
          .from("scraped_videos")
          .upsert(
            filtered.map((v) => ({
              youtube_video_id: v.youtube_video_id,
              title:            v.title,
              thumbnail_url:    v.thumbnail_url,
              video_url:        v.video_url,
              duration:         v.duration,
              view_count:       v.view_count,
              sport_category:   v.sport_category,
              published_at:     v.published_at,
              ingested_at:      new Date().toISOString(),
              // channel_name and channel_priority deliberately omitted:
              // ON CONFLICT they will not overwrite values set by Part B.
            })),
            { onConflict: "youtube_video_id", ignoreDuplicates: false }
          );

        if (error) errors.push(`DB upsert error for "${query}": ${error.message}`);
        else totalUpserted += filtered.length;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Query "${query}" failed: ${msg}`);
        console.error(msg);
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // ── Part B: channel-priority fetch — feeds Main Page Tier 1 and Tier 2 ─────
  for (const channel of PRIORITY_CHANNELS) {
    try {
      const videos = await fetchChannelVideos(channel);
      if (videos.length === 0) continue;

      const { error } = await supabase
        .from("scraped_videos")
        .upsert(
          videos.map((v) => ({
            youtube_video_id: v.youtube_video_id,
            title:            v.title,
            thumbnail_url:    v.thumbnail_url,
            video_url:        v.video_url,
            duration:         v.duration,
            view_count:       v.view_count,
            sport_category:   v.sport_category,
            published_at:     v.published_at,
            channel_name:     v.channel_name,
            channel_priority: v.channel_priority,
            ingested_at:      new Date().toISOString(),
          })),
          { onConflict: "youtube_video_id", ignoreDuplicates: false }
        );

      if (error) errors.push(`DB upsert error for channel "${channel.name}": ${error.message}`);
      else totalUpserted += filtered.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Channel "${channel.name}" failed: ${msg}`);
      console.error(msg);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  // ── Update system_health ──────────────────────────────────────────────────
  await supabase
    .from("system_health")
    .upsert(
      {
        source_name:         "youtube_ingestion",
        last_successful_run: new Date().toISOString(),
        status:              errors.length === 0 ? "healthy" : "stalled",
      },
      { onConflict: "source_name" }
    );

  return new Response(
    JSON.stringify({ ok: true, upserted: totalUpserted, errors: errors.length, error_details: errors }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
