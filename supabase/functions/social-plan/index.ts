import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { renderJpeg } from "./render.ts";
import * as T from "./templates.ts";

// SOCIAL PLAN: decides which Facebook/Instagram posts should exist, creates a
// social_posts row for each (idempotent by subject_key), and renders the image
// for rows that don't have one yet. social-publish does the actual posting.
//
// Every fact in a post comes from a row queried here: kickoff times, final
// scores and leaderboard points from live_games/game_leaderboard, and
// question/option text from trivia_questions/daily_polls (never the answer).
// Runs every 10 minutes (pg_cron). Renders at most ONE image per run: a render
// is ~1-2s of CPU, which is close to an edge function's CPU budget.
//
// Timing: each post has a target time. In 'veto' mode the row is created
// veto_hours BEFORE its target so the owner can cancel it; in 'auto' mode it's
// created at the target.

const SITE = "govolsgameday.com";
const HASHTAGS = "#Vols #GoVols #VolNation #Tennessee";

type Json = Record<string, unknown>;
// deno-lint-ignore no-explicit-any
type Client = any;

interface Settings { enabled: boolean; mode: "veto" | "auto"; veto_hours: number }
interface Game {
  id: string; sport: string; home_team: string; away_team: string;
  kickoff_time: string; status: string; home_score: number; away_score: number; updated_at: string;
}

const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { "Content-Type": "application/json" } });

// ─── Eastern-time helpers ────────────────────────────────────────────────────

const ET = "America/New_York";
const etParts = (d: Date) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: ET, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), minute: Number(p.minute) };
};
const dayNumber = (isoDate: string) => Math.round(Date.parse(isoDate + "T00:00:00Z") / 86400000);

/** The UTC instant of `hour`:00 Eastern on `isoDate`. */
function etInstant(isoDate: string, hour: number): Date {
  let t = Date.parse(`${isoDate}T${String(hour).padStart(2, "0")}:00:00Z`) + 5 * 3600000; // assume EST, then correct
  for (let i = 0; i < 2; i++) {
    const p = etParts(new Date(t));
    const dayDiff = dayNumber(p.date) - dayNumber(isoDate);
    t -= (dayDiff * 24 + (p.hour - hour)) * 3600000;
  }
  return new Date(t);
}

function kickoffText(iso: string): string | null {
  const d = new Date(iso);
  const p = etParts(d);
  if (p.hour === 0 && p.minute === 0) return null; // midnight ET is the placeholder for "time not announced yet"
  const day = new Intl.DateTimeFormat("en-US", { timeZone: ET, weekday: "short", month: "short", day: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: ET, hour: "numeric", minute: "2-digit" }).format(d);
  return `${day} · ${time} ET`.toUpperCase();
}

// ─── Candidates ──────────────────────────────────────────────────────────────

interface Candidate {
  kind: string;
  subject_key: string;
  game_id?: string;
  target: Date; // when the post should go out
  caption: string;
  payload: { template: string; data: Json };
}

const opponentOf = (g: Game) => (g.home_team === "Tennessee" ? g.away_team : g.home_team);
const sportWord = (s: string) => (s === "basketball" ? "men's basketball" : "football");

async function countdownCandidates(supabase: Client, now: Date): Promise<Candidate[]> {
  const { data } = await supabase
    .from("live_games")
    .select("id, sport, home_team, away_team, kickoff_time, status, home_score, away_score, updated_at")
    .eq("status", "pregame")
    .gt("kickoff_time", now.toISOString())
    .lt("kickoff_time", new Date(now.getTime() + 4 * 86400000).toISOString());
  const out: Candidate[] = [];
  const today = etParts(now).date;
  for (const g of (data ?? []) as Game[]) {
    const when = kickoffText(g.kickoff_time);
    if (!when) continue;
    const days = dayNumber(etParts(new Date(g.kickoff_time)).date) - dayNumber(today);
    if (![3, 1, 0].includes(days)) continue;
    const hour = days === 0 ? 9 : 12;
    const target = etInstant(today, hour);
    const home = g.home_team === "Tennessee";
    const opp = opponentOf(g);
    const tip = g.sport === "basketball" ? "tip-off" : "kickoff";
    const lead = days === 0 ? `It's gameday! Tennessee ${home ? "hosts" : "visits"} ${opp}.` : `${days} ${days === 1 ? "day" : "days"} until ${tip}: Tennessee ${home ? "hosts" : "visits"} ${opp}.`;
    out.push({
      kind: "countdown", subject_key: `countdown:${g.id}:${days}`, game_id: g.id, target,
      caption: `${lead} ${when.replace(" · ", " at ")}.\n\nMake your free picks before ${tip} at ${SITE}.\n\n${HASHTAGS} ${g.sport === "basketball" ? "#VolHoops" : "#VolFootball"}`,
      payload: { template: "countdown", data: { sport: g.sport, days, opponent: opp, home, kickoffText: when } },
    });
  }
  return out;
}

async function finalCandidates(supabase: Client, now: Date): Promise<Candidate[]> {
  const { data } = await supabase
    .from("live_games")
    .select("id, sport, home_team, away_team, kickoff_time, status, home_score, away_score, updated_at")
    .eq("status", "calculated") // finalized: scores are settled, so the recap can't contradict the site
    .gt("updated_at", new Date(now.getTime() - 36 * 3600000).toISOString());
  const out: Candidate[] = [];
  for (const g of (data ?? []) as Game[]) {
    const home = g.home_team === "Tennessee";
    const tn = home ? g.home_score : g.away_score;
    const opp = home ? g.away_score : g.home_score;
    const { data: lb } = await supabase.from("game_leaderboard").select("username, total_game_points").eq("game_id", g.id).order("rank", { ascending: true }).limit(3);
    const top = ((lb ?? []) as { username: string; total_game_points: number }[]).map((r) => ({ name: r.username, points: r.total_game_points }));
    const result = tn > opp ? "win" : "loss";
    const topLine = top.length ? `\n\nTop predictor: ${top[0].name} with ${top[0].points.toLocaleString("en-US")} points.` : "";
    out.push({
      kind: "final_recap", subject_key: `final:${g.id}`, game_id: g.id, target: now,
      caption: `Final: Tennessee ${tn}, ${opponentOf(g)} ${opp} (${result === "win" ? "Vols win" : "tough one"}).${topLine}\n\nThink you can beat them? Play free at ${SITE}.\n\n${HASHTAGS} ${g.sport === "basketball" ? "#VolHoops" : "#VolFootball"}`,
      payload: { template: "final", data: { sport: g.sport, tn, opp, opponent: opponentOf(g), home, top } },
    });
  }
  return out;
}

async function dailyCandidates(supabase: Client, now: Date): Promise<Candidate[]> {
  const today = etParts(now).date;
  const out: Candidate[] = [];
  const { data: trivia } = await supabase.from("trivia_questions").select("question, option_a, option_b, option_c, option_d").eq("scheduled_date", today).order("slot", { ascending: true }).limit(1);
  const q = (trivia ?? [])[0] as { question: string; option_a: string; option_b: string; option_c: string; option_d: string } | undefined;
  if (q) {
    const options = [q.option_a, q.option_b, q.option_c, q.option_d];
    out.push({
      kind: "trivia_teaser", subject_key: `trivia:${today}`, target: etInstant(today, 10),
      caption: `Today's Vols trivia:\n\n${q.question}\n\n${options.map((o, i) => `${"ABCD"[i]}) ${o}`).join("\n")}\n\nAnswer on ${SITE} and earn points.\n\n${HASHTAGS} #VolTrivia`,
      payload: { template: "teaser", data: { kind: "trivia", question: q.question, options } },
    });
  }
  const { data: polls } = await supabase.from("daily_polls").select("question, option_a, option_b, option_c, option_d").eq("active_date", today).limit(1);
  const p = (polls ?? [])[0] as { question: string; option_a: string; option_b: string; option_c: string; option_d: string } | undefined;
  if (p) {
    const options = [p.option_a, p.option_b, p.option_c, p.option_d].filter(Boolean);
    out.push({
      kind: "poll_teaser", subject_key: `poll:${today}`, target: etInstant(today, 17),
      caption: `Today's Vols poll:\n\n${p.question}\n\n${options.map((o, i) => `${"ABCD"[i]}) ${o}`).join("\n")}\n\nCast your vote at ${SITE}.\n\n${HASHTAGS} #VolNation`,
      payload: { template: "teaser", data: { kind: "poll", question: p.question, options } },
    });
  }
  return out;
}

// ─── Rendering ───────────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
function treeFor(payload: { template: string; data: any }): T.Node {
  switch (payload.template) {
    case "countdown": return T.countdown(payload.data);
    case "final": return T.finalRecap(payload.data);
    case "teaser": return T.teaser(payload.data);
    case "news": return T.news(payload.data);
    default: throw new Error(`unknown template ${payload.template}`);
  }
}

async function renderOne(supabase: Client): Promise<Json | null> {
  const { data } = await supabase
    .from("social_posts")
    .select("id, kind, payload, status, scheduled_for")
    .is("image_url", null)
    .eq("status", "scheduled")
    .order("scheduled_for", { ascending: true })
    .limit(1);
  const row = (data ?? [])[0] as { id: string; kind: string; payload: { template: string; data: unknown } } | undefined;
  if (!row) return null;
  try {
    const jpg = await renderJpeg(treeFor(row.payload as { template: string; data: never }));
    const path = `${row.kind}/${row.id}.jpg`;
    const { error: upErr } = await supabase.storage.from("social").upload(path, jpg, { contentType: "image/jpeg", upsert: true });
    if (upErr) throw new Error(`upload: ${upErr.message}`);
    const { data: pub } = supabase.storage.from("social").getPublicUrl(path);
    await supabase.from("social_posts").update({ image_path: path, image_url: pub.publicUrl, error: null }).eq("id", row.id);
    return { rendered: row.id, bytes: jpg.length };
  } catch (e) {
    await supabase.from("social_posts").update({ error: `render: ${e instanceof Error ? e.message : String(e)}` }).eq("id", row.id);
    return { renderFailed: row.id, error: String(e) };
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: s } = await supabase.from("social_settings").select("enabled, mode, veto_hours").eq("id", true).maybeSingle();
  const settings = s as Settings | null;
  if (!settings?.enabled) return json({ ok: true, skipped: "disabled" });

  const now = new Date();
  const lead = settings.mode === "veto" ? settings.veto_hours * 3600000 : 0;

  const candidates = [
    ...(await countdownCandidates(supabase, now)),
    ...(await finalCandidates(supabase, now)),
    ...(await dailyCandidates(supabase, now)),
  ];

  let created = 0;
  for (const c of candidates) {
    // Create when the veto window for its target time opens (or right away if that's already passed).
    if (now.getTime() < c.target.getTime() - lead) continue;
    // Don't post a stale target (e.g. a 9 AM gameday post first noticed at 11 PM).
    if (now.getTime() - c.target.getTime() > 6 * 3600000 && c.kind !== "final_recap") continue;
    const scheduledFor = new Date(Math.max(c.target.getTime(), now.getTime() + lead));
    const { error } = await supabase.from("social_posts").insert({
      kind: c.kind, subject_key: c.subject_key, game_id: c.game_id ?? null, caption: c.caption,
      payload: c.payload, scheduled_for: scheduledFor.toISOString(),
    });
    if (!error) created++;
    else if (!/duplicate key/i.test(error.message)) console.error(`social-plan insert ${c.subject_key}: ${error.message}`);
  }

  const rendered = await renderOne(supabase);
  return json({ ok: true, candidates: candidates.length, created, rendered });
});
