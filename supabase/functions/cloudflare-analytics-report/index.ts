import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CF_ZONE_TAG = "81552eae419ebca314cf014f17da2783"; // govolsgameday.com -- not sensitive, a zone ID isn't a credential
const CF_GRAPHQL_URL = "https://api.cloudflare.com/client/v4/graphql";

type Client = ReturnType<typeof createClient>;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getSupabaseClient(): Client {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function reportHealth(supabase: Client, status: "healthy" | "stalled") {
  await supabase.from("system_health").upsert(
    { source_name: "cloudflare_analytics_report", last_successful_run: new Date().toISOString(), status },
    { onConflict: "source_name" }
  );
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function cfGraphQL(token: string, query: string, variables: Record<string, unknown>) {
  const res = await fetch(CF_GRAPHQL_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) {
    throw new Error(`Cloudflare GraphQL error: ${JSON.stringify(body.errors ?? body)}`);
  }
  return body.data;
}

interface DailyRow {
  date: string;
  requests: number;
  bytes: number;
  cachedRequests: number;
  threats: number;
  uniques: number;
}

/** Zone-level daily totals. httpRequests1dGroups tolerates a multi-day range on this plan. */
async function fetchWeeklyTotals(token: string, since: string, until: string) {
  const query = `
    query($zoneTag: string, $since: Date, $until: Date) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          totals: httpRequests1dGroups(limit: 1, filter: { date_geq: $since, date_leq: $until }) {
            sum { requests bytes cachedRequests cachedBytes threats pageViews }
            uniq { uniques }
          }
          daily: httpRequests1dGroups(limit: 31, orderBy: [date_ASC], filter: { date_geq: $since, date_leq: $until }) {
            dimensions { date }
            sum { requests bytes cachedRequests threats }
            uniq { uniques }
          }
        }
      }
    }
  `;
  const data = await cfGraphQL(token, query, { zoneTag: CF_ZONE_TAG, since, until });
  const zone = data.viewer.zones[0];
  const totals = zone.totals[0]?.sum ?? { requests: 0, bytes: 0, cachedRequests: 0, cachedBytes: 0, threats: 0, pageViews: 0 };
  const uniques = zone.totals[0]?.uniq?.uniques ?? 0;
  const daily: DailyRow[] = (zone.daily ?? []).map((d: any) => ({
    date: d.dimensions.date,
    requests: d.sum.requests,
    bytes: d.sum.bytes,
    cachedRequests: d.sum.cachedRequests,
    threats: d.sum.threats,
    uniques: d.uniq.uniques,
  }));
  return { totals, uniques, daily };
}

/**
 * Breakdown dimensions (country/status/device) via httpRequestsAdaptiveGroups
 * -- capped at a 1-day range on this account's plan (confirmed live against
 * the API, not assumed), so this loops one GraphQL call per day in the
 * window and merges counts client-side rather than a single wide query.
 */
async function fetchDayBreakdown(token: string, day: string) {
  const query = `
    query($zoneTag: string, $day: Date) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          countries: httpRequestsAdaptiveGroups(limit: 10, orderBy: [count_DESC], filter: { date: $day }) {
            count
            dim: dimensions { clientCountryName }
          }
          statuses: httpRequestsAdaptiveGroups(limit: 20, orderBy: [count_DESC], filter: { date: $day }) {
            count
            dim: dimensions { edgeResponseStatus }
          }
          devices: httpRequestsAdaptiveGroups(limit: 10, orderBy: [count_DESC], filter: { date: $day }) {
            count
            dim: dimensions { clientDeviceType }
          }
        }
      }
    }
  `;
  const data = await cfGraphQL(token, query, { zoneTag: CF_ZONE_TAG, day });
  return data.viewer.zones[0] as {
    countries: { count: number; dim: { clientCountryName: string } }[];
    statuses: { count: number; dim: { edgeResponseStatus: number } }[];
    devices: { count: number; dim: { clientDeviceType: string } }[];
  };
}

function mergeCounts(acc: Map<string, number>, rows: { count: number; dim: Record<string, string | number> }[], key: string) {
  for (const r of rows) {
    const k = String(r.dim[key]);
    acc.set(k, (acc.get(k) ?? 0) + r.count);
  }
}

interface EngagementMetrics {
  newSignups: number;
  triviaResponses: number;
  pollResponses: number;
  pregamePredictions: number;
  livePredictorParticipants: number;
}

/**
 * Site engagement counts for the same period_start..period_end window,
 * queried directly from the app's own tables (nothing to do with
 * Cloudflare). Verified column names -- user_poll_responses uses
 * responded_at, not created_at.
 */
async function fetchEngagementMetrics(supabase: Client, since: string, until: string): Promise<EngagementMetrics> {
  const [signups, trivia, polls, pregame, drives] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", `${since}T00:00:00Z`)
      .lt("created_at", `${until}T23:59:59.999Z`),
    supabase
      .from("user_trivia_responses")
      .select("id", { count: "exact", head: true })
      .gte("trivia_date", since)
      .lte("trivia_date", until),
    supabase
      .from("user_poll_responses")
      .select("id", { count: "exact", head: true })
      .gte("responded_at", `${since}T00:00:00Z`)
      .lt("responded_at", `${until}T23:59:59.999Z`),
    supabase
      .from("pregame_predictions")
      .select("id", { count: "exact", head: true })
      .gte("submitted_at", `${since}T00:00:00Z`)
      .lt("submitted_at", `${until}T23:59:59.999Z`),
    supabase
      .from("drive_predictions")
      .select("user_id")
      .gte("submitted_at", `${since}T00:00:00Z`)
      .lt("submitted_at", `${until}T23:59:59.999Z`),
  ]);

  const distinctDriveParticipants = new Set((drives.data ?? []).map((r: { user_id: string }) => r.user_id)).size;

  return {
    newSignups: signups.count ?? 0,
    triviaResponses: trivia.count ?? 0,
    pollResponses: polls.count ?? 0,
    pregamePredictions: pregame.count ?? 0,
    livePredictorParticipants: distinctDriveParticipants,
  };
}

function topN(m: Map<string, number>, n: number): { key: string; count: number }[] {
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([key, count]) => ({ key, count }));
}

/** Every calendar day from since..until inclusive, as YYYY-MM-DD strings. */
function eachDay(since: string, until: string): string[] {
  const out: string[] = [];
  const cur = new Date(since + "T00:00:00Z");
  const end = new Date(until + "T00:00:00Z");
  while (cur <= end) {
    out.push(ymd(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

/**
 * Pulls the prior Mon-Sun week's Cloudflare zone analytics for
 * govolsgameday.com and stores one snapshot row for the analytics-agent
 * subagent to read and turn into an actual written report. Read-only
 * against Cloudflare -- this function never writes anything back to
 * Cloudflare, only to cloudflare_analytics_snapshots.
 */
Deno.serve(async (_req: Request) => {
  const supabase = getSupabaseClient();

  try {
    const { data: token, error: tokenErr } = await supabase.rpc("get_cloudflare_api_token");
    if (tokenErr || !token) {
      await reportHealth(supabase, "stalled");
      return json({ error: "Cloudflare API token not configured" }, 500);
    }

    // Prior Mon-Sun week, computed in UTC (Cloudflare's `date` dimension is UTC-bucketed).
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0=Sun..6=Sat
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    const thisMonday = new Date(now);
    thisMonday.setUTCDate(now.getUTCDate() - daysSinceMonday);
    const periodEnd = new Date(thisMonday);
    periodEnd.setUTCDate(thisMonday.getUTCDate() - 1); // last Sunday
    const periodStart = new Date(periodEnd);
    periodStart.setUTCDate(periodEnd.getUTCDate() - 6); // Monday before that

    const since = ymd(periodStart);
    const until = ymd(periodEnd);

    const { totals, uniques, daily } = await fetchWeeklyTotals(token as string, since, until);
    const engagement = await fetchEngagementMetrics(supabase, since, until);

    const countryCounts = new Map<string, number>();
    const statusCounts = new Map<string, number>();
    const deviceCounts = new Map<string, number>();
    for (const day of eachDay(since, until)) {
      try {
        const b = await fetchDayBreakdown(token as string, day);
        mergeCounts(countryCounts, b.countries, "clientCountryName");
        mergeCounts(statusCounts, b.statuses, "edgeResponseStatus");
        mergeCounts(deviceCounts, b.devices, "clientDeviceType");
      } catch (err) {
        // One bad day shouldn't sink the whole week's report.
        console.error(`cloudflare-analytics-report: breakdown fetch failed for ${day}: ${err}`);
      }
    }

    const { error: upsertErr } = await supabase.from("cloudflare_analytics_snapshots").upsert(
      {
        period_start: since,
        period_end: until,
        total_requests: totals.requests,
        total_visits: uniques,
        total_page_views: totals.pageViews,
        cached_requests: totals.cachedRequests,
        total_bytes: totals.bytes,
        threats: totals.threats,
        daily_breakdown: daily,
        top_countries: topN(countryCounts, 10),
        status_breakdown: topN(statusCounts, 20),
        device_breakdown: topN(deviceCounts, 10),
        new_signups: engagement.newSignups,
        trivia_responses: engagement.triviaResponses,
        poll_responses: engagement.pollResponses,
        pregame_predictions: engagement.pregamePredictions,
        live_predictor_participants: engagement.livePredictorParticipants,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "period_start,period_end" }
    );

    if (upsertErr) {
      await reportHealth(supabase, "stalled");
      return json({ error: upsertErr.message }, 500);
    }

    await reportHealth(supabase, "healthy");
    return json({ ok: true, period_start: since, period_end: until, total_requests: totals.requests });
  } catch (err) {
    await reportHealth(supabase, "stalled");
    return json({ error: String(err) }, 500);
  }
});
