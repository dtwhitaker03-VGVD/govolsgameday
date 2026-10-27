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
const weekday = (isoDate: string) => new Date(isoDate + "T12:00:00Z").getUTCDay(); // 0 = Sunday

/** The UTC instant of hour:minute Eastern on `isoDate`. */
function etInstant(isoDate: string, hour: number, minute = 0): Date {
  const want = hour * 60 + minute;
  let t = Date.parse(`${isoDate}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`) + 5 * 3600000; // assume EST, then correct
  for (let i = 0; i < 2; i++) {
    const p = etParts(new Date(t));
    const dayDiff = dayNumber(p.date) - dayNumber(isoDate);
    t -= (dayDiff * 1440 + (p.hour * 60 + p.minute - want)) * 60000;
  }
  return new Date(t);
}

/** "SAT, NOV 7 · 3:30 PM ET". Midnight ET is the placeholder for "time not announced yet", shown as TIME TBA. */
function kickoffText(iso: string): { text: string; known: boolean } {
  const d = new Date(iso);
  const p = etParts(d);
  const day = new Intl.DateTimeFormat("en-US", { timeZone: ET, weekday: "short", month: "short", day: "numeric" }).format(d);
  if (p.hour === 0 && p.minute === 0) return { text: `${day} · TIME TBA`.toUpperCase(), known: false };
  const time = new Intl.DateTimeFormat("en-US", { timeZone: ET, hour: "numeric", minute: "2-digit" }).format(d);
  return { text: `${day} · ${time} ET`.toUpperCase(), known: true };
}

/** "Saturday, Nov 7 at 3:30 PM ET" (or "Saturday, Nov 7, time to be announced"), for captions. */
function kickoffSentence(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-US", { timeZone: ET, weekday: "long", month: "short", day: "numeric" }).format(d);
  const k = kickoffText(iso);
  if (!k.known) return `${day}, time to be announced`;
  return `${day} at ${new Intl.DateTimeFormat("en-US", { timeZone: ET, hour: "numeric", minute: "2-digit" }).format(d)} ET`;
}

// ─── Schedule + candidates ───────────────────────────────────────────────────

interface ScheduleRow { id: string; kind: string; dow: number | null; hour: number; minute: number }

interface Candidate {
  kind: string;
  subject_key: string;
  game_id?: string;
  target: Date; // when the post should go out
  caption: string;
  payload: { template: string; data: Json };
}

const opponentOf = (g: Game) => (g.home_team === "Tennessee" ? g.away_team : g.home_team);
const tagFor = (sport: string) => (sport === "basketball" ? "#VolHoops" : "#VolFootball");
const GAME_COLS = "id, sport, home_team, away_team, kickoff_time, status, home_score, away_score, updated_at";

/** The next game for countdown/preview: soonest within `days`, football first when both sports qualify. */
async function nextGame(supabase: Client, now: Date, days: number): Promise<Game | null> {
  const { data } = await supabase
    .from("live_games").select(GAME_COLS).eq("status", "pregame")
    .in("sport", ["football", "basketball"])
    .gt("kickoff_time", now.toISOString())
    .lt("kickoff_time", new Date(now.getTime() + days * 86400000).toISOString())
    .order("kickoff_time", { ascending: true });
  const games = (data ?? []) as Game[];
  return games.find((g) => g.sport === "football") ?? games[0] ?? null;
}

const SITE_FEATURES = {
  trivia: { title: "Daily trivia and polls", text: "Five trivia questions and a new poll every day" },
  predict: { title: "Predict every drive live", text: "Call each drive's outcome as it happens" },
  picks: { title: "Make your pregame picks", text: "Winner, score and this week's prop bets, before kickoff" },
  board: { title: "Climb the leaderboard", text: "Earn points, build streaks, beat the other fans" },
  badges: { title: "Earn badges all season", text: "Unlock badges as your points and streaks grow" },
  chat: { title: "Talk Vols with the fans", text: "Live discussion board and fan forums" },
  news: { title: "Vol news and videos", text: "Headlines and the latest videos in one place" },
};

// Rotated by week so the Thursday promotion doesn't repeat itself.
const GENERAL_PROMOS: { headline: string; features: { title: string; text: string }[]; caption: string }[] = [
  { headline: "Your daily dose of Vols", features: [SITE_FEATURES.trivia, SITE_FEATURES.board, SITE_FEATURES.badges], caption: "Daily trivia, a new poll every day, and a leaderboard to climb. Play along at" },
  { headline: "Predict the Vols, every game", features: [SITE_FEATURES.picks, SITE_FEATURES.predict, SITE_FEATURES.board], caption: "Pregame picks, live drive-by-drive predictions and a leaderboard for every game. Play along at" },
  { headline: "The Vol fan hub", features: [SITE_FEATURES.chat, SITE_FEATURES.news, SITE_FEATURES.trivia], caption: "Fan chat, forums, Vol news, videos and daily trivia, all in one place:" },
  { headline: "Build your streak", features: [SITE_FEATURES.predict, SITE_FEATURES.badges, SITE_FEATURES.board], caption: "Nail drive after drive to build a hot streak, earn badges and climb the leaderboard:" },
];

type Builder = (supabase: Client, now: Date, today: string, row: ScheduleRow, target: Date) => Promise<Candidate[]>;

const BUILDERS: Record<string, Builder> = {
  // Saturday morning: promote the site; tied to today's game when there is one.
  async promo_pregame(supabase, now, today, _row, target) {
    const { data } = await supabase.from("live_games").select(GAME_COLS).eq("status", "pregame").in("sport", ["football", "basketball"]).gt("kickoff_time", now.toISOString()).order("kickoff_time", { ascending: true }).limit(8);
    const todays = ((data ?? []) as Game[]).filter((g) => etParts(new Date(g.kickoff_time)).date === today);
    const g = todays.find((x) => x.sport === "football") ?? todays[0];
    if (!g) return []; // no game today: nothing "pregame" to promote
    const k = kickoffText(g.kickoff_time);
    const home = g.home_team === "Tennessee";
    const sub = `TENNESSEE ${home ? "VS" : "AT"} ${opponentOf(g).toUpperCase()} · ${k.known ? k.text.split(" · ")[1] : "TIME TBA"}`;
    return [{
      kind: "promo_pregame", subject_key: `promo_pregame:${today}`, game_id: g.id, target,
      caption: `It's gameday! Tennessee ${home ? "hosts" : "visits"} ${opponentOf(g)}, ${kickoffSentence(g.kickoff_time)}.\n\nMake your pregame picks, then predict every drive live and climb the leaderboard at ${SITE}.\n\n${HASHTAGS} ${tagFor(g.sport)}`,
      payload: { template: "promo", data: { tag: "GAMEDAY", headline: "Gameday is on GoVolsGameDay.com", sub, features: [SITE_FEATURES.picks, SITE_FEATURES.predict, SITE_FEATURES.board] } },
    }];
  },

  async promo_general(_supabase, _now, today, _row, target) {
    const week = Math.floor(dayNumber(today) / 7);
    const p = GENERAL_PROMOS[week % GENERAL_PROMOS.length];
    return [{
      kind: "promo_general", subject_key: `promo_general:${today}`, target,
      caption: `${p.caption} ${SITE}\n\n${HASHTAGS}`,
      payload: { template: "promo", data: { tag: "GOVOLSGAMEDAY.COM", headline: p.headline, features: p.features } },
    }];
  },

  // Sunday: the player the admin picked for the most recent finished game.
  async player_of_game(supabase, now, today, _row, target) {
    const { data } = await supabase.from("live_games").select(GAME_COLS).in("status", ["final", "calculated"]).in("sport", ["football", "basketball"])
      .gt("kickoff_time", new Date(now.getTime() - 6 * 86400000).toISOString()).order("kickoff_time", { ascending: false }).limit(4);
    const out: Candidate[] = [];
    for (const g of (data ?? []) as Game[]) {
      const { data: pg } = await supabase.from("social_player_of_game").select("player_name, position, jersey, stats").eq("game_id", g.id).maybeSingle();
      if (!pg) continue;
      const home = g.home_team === "Tennessee";
      const tn = home ? g.home_score : g.away_score;
      const opp = home ? g.away_score : g.home_score;
      const resultLine = `${tn > opp ? "W" : tn < opp ? "L" : "T"} ${tn}-${opp}`;
      const stats = ((pg.stats ?? []) as { label: string; value: string }[]).filter((x) => x?.label && x?.value);
      const statText = stats.map((x) => `${x.value} ${x.label.toLowerCase()}`).join(", ");
      out.push({
        kind: "player_of_game", subject_key: `potg:${g.id}`, game_id: g.id, target,
        caption: `Player of the Game: ${pg.player_name}${pg.position ? ` (${pg.position})` : ""}.${statText ? `\n\n${statText}.` : ""}\n\nTennessee ${home ? "vs" : "at"} ${opponentOf(g)}, ${resultLine}.\n\n${HASHTAGS} ${tagFor(g.sport)}`,
        payload: { template: "potg", data: { name: pg.player_name, position: pg.position, jersey: pg.jersey, stats, opponent: opponentOf(g), home, resultLine } },
      });
    }
    return out;
  },

  async next_game_preview(supabase, now, today, _row, target) {
    const g = await nextGame(supabase, now, 10);
    if (!g) return [];
    const k = kickoffText(g.kickoff_time);
    const home = g.home_team === "Tennessee";
    const { data: prev } = await supabase.from("game_previews").select("content").eq("game_id", g.id).order("fetched_at", { ascending: false }).limit(1);
    const content = ((prev ?? [])[0]?.content ?? {}) as { subhead?: string; howToWatch?: string };
    // The preview's subhead is "No. 11 Tennessee (6-1) at South Carolina (3-3), Oct. 24 at 3:30 p.m. EDT.": keep the team line, drop the date.
    const context = content.subhead ? content.subhead.split(/,\s*[A-Z][a-z]{2,4}\.?\s+\d/)[0].replace(/\.$/, "") : null;
    const watch = content.howToWatch ?? null;
    return [{
      kind: "next_game_preview", subject_key: `preview:${g.id}:${today}`, game_id: g.id, target,
      caption: `Up next: Tennessee ${home ? "hosts" : "visits"} ${opponentOf(g)}, ${kickoffSentence(g.kickoff_time)}.${watch ? ` Watch on ${watch}.` : ""}\n\nGet your picks ready at ${SITE}.\n\n${HASHTAGS} ${tagFor(g.sport)}`,
      payload: { template: "preview", data: { sport: g.sport, opponent: opponentOf(g), home, whenText: k.text, context, watch } },
    }];
  },

  async countdown(supabase, now, today, _row, target) {
    const g = await nextGame(supabase, now, 7);
    if (!g) return [];
    const days = dayNumber(etParts(new Date(g.kickoff_time)).date) - dayNumber(today);
    if (days < 1) return [];
    const k = kickoffText(g.kickoff_time);
    const home = g.home_team === "Tennessee";
    const opp = opponentOf(g);
    const tip = g.sport === "basketball" ? "tip-off" : "kickoff";
    return [{
      kind: "countdown", subject_key: `countdown:${g.id}:${today}`, game_id: g.id, target,
      caption: `${days} ${days === 1 ? "day" : "days"} until ${tip}: Tennessee ${home ? "hosts" : "visits"} ${opp}, ${kickoffSentence(g.kickoff_time)}.\n\nMake your picks before ${tip} at ${SITE}.\n\n${HASHTAGS} ${tagFor(g.sport)}`,
      payload: { template: "countdown", data: { sport: g.sport, days, opponent: opp, home, kickoffText: k.text } },
    }];
  },

  async trivia_teaser(supabase, _now, today, _row, target) {
    const { data } = await supabase.from("trivia_questions").select("question, option_a, option_b, option_c, option_d").eq("scheduled_date", today).order("slot", { ascending: true }).limit(1);
    const q = (data ?? [])[0] as { question: string; option_a: string; option_b: string; option_c: string; option_d: string } | undefined;
    if (!q) return [];
    const options = [q.option_a, q.option_b, q.option_c, q.option_d];
    return [{
      kind: "trivia_teaser", subject_key: `trivia:${today}`, target,
      caption: `Today's Vols trivia:\n\n${q.question}\n\n${options.map((o, i) => `${"ABCD"[i]}) ${o}`).join("\n")}\n\nAnswer on ${SITE} and earn points.\n\n${HASHTAGS} #VolTrivia`,
      payload: { template: "teaser", data: { kind: "trivia", question: q.question, options } },
    }];
  },

  async poll_teaser(supabase, _now, today, _row, target) {
    const { data } = await supabase.from("daily_polls").select("question, option_a, option_b, option_c, option_d").eq("active_date", today).limit(1);
    const p = (data ?? [])[0] as { question: string; option_a: string; option_b: string; option_c: string; option_d: string } | undefined;
    if (!p) return [];
    const options = [p.option_a, p.option_b, p.option_c, p.option_d].filter(Boolean);
    return [{
      kind: "poll_teaser", subject_key: `poll:${today}`, target,
      caption: `Today's Vols poll:\n\n${p.question}\n\n${options.map((o, i) => `${"ABCD"[i]}) ${o}`).join("\n")}\n\nCast your vote at ${SITE}.\n\n${HASHTAGS} #VolPoll`,
      payload: { template: "teaser", data: { kind: "poll", question: p.question, options } },
    }];
  },
};

// ─── Post-game stats chart (event-driven: when a game is finalized) ──────────

const num = (v: unknown): number | null => {
  const n = parseFloat(String(v ?? "").replace("%", ""));
  return Number.isFinite(n) ? n : null;
};

function statRows(g: Record<string, unknown>, home: boolean): { label: string; tn: string; opp: string; tnVal: number; oppVal: number }[] {
  const rows: { label: string; tn: string; opp: string; tnVal: number; oppVal: number }[] = [];
  const push = (label: string, tnV: number | null, oppV: number | null, suffix = "") => {
    if (tnV === null || oppV === null) return;
    rows.push({ label, tn: `${tnV}${suffix}`, opp: `${oppV}${suffix}`, tnVal: tnV, oppVal: oppV });
  };
  const side = (k: string) => [num(g[`${home ? "home" : "away"}_${k}`]), num(g[`${home ? "away" : "home"}_${k}`])] as const;
  if (g.sport === "basketball") {
    const bb = (g.bb_stats ?? {}) as { home?: Record<string, string>; away?: Record<string, string> };
    const t = (home ? bb.home : bb.away) ?? {};
    const o = (home ? bb.away : bb.home) ?? {};
    push("Field goal %", num(t.fieldGoalPct), num(o.fieldGoalPct), "%");
    push("3-point %", num(t.threePointFieldGoalPct), num(o.threePointFieldGoalPct), "%");
    push("Rebounds", num(t.totalRebounds), num(o.totalRebounds));
    push("Assists", num(t.assists), num(o.assists));
    push("Turnovers", num(t.turnovers), num(o.turnovers));
  } else {
    push("Total yards", ...side("total_yards"));
    push("Rushing yards", ...side("rushing_yards"));
    push("Passing yards", ...side("passing_yards"));
    push("First downs", ...side("first_downs"));
    push("Turnovers", ...side("turnovers"));
  }
  return rows;
}

async function finalStatsCandidates(supabase: Client, now: Date): Promise<Candidate[]> {
  const { data } = await supabase
    .from("live_games")
    .select(`${GAME_COLS}, bb_stats, home_total_yards, away_total_yards, home_rushing_yards, away_rushing_yards, home_passing_yards, away_passing_yards, home_first_downs, away_first_downs, home_turnovers, away_turnovers`)
    .in("sport", ["football", "basketball"])
    .eq("status", "calculated") // finalized: scores and stats are settled, so the chart can't contradict the site
    .gt("updated_at", new Date(now.getTime() - 36 * 3600000).toISOString());
  const out: Candidate[] = [];
  for (const g of (data ?? []) as (Game & Record<string, unknown>)[]) {
    const home = g.home_team === "Tennessee";
    const tn = home ? g.home_score : g.away_score;
    const opp = home ? g.away_score : g.home_score;
    const rows = statRows(g, home);
    const { data: lb } = await supabase.from("game_leaderboard").select("username, total_game_points").eq("game_id", g.id).order("rank", { ascending: true }).limit(1);
    const top = ((lb ?? []) as { username: string; total_game_points: number }[])[0];
    const topLine = top ? `\n\nTop predictor: ${top.username} with ${top.total_game_points.toLocaleString("en-US")} points.` : "";
    const statLine = rows.slice(0, 3).map((r) => `${r.label}: Tennessee ${r.tn}, ${opponentOf(g)} ${r.opp}`).join("\n");
    out.push({
      kind: "final_stats", subject_key: `final_stats:${g.id}`, game_id: g.id, target: now,
      caption: `Final: Tennessee ${tn}, ${opponentOf(g)} ${opp}.${statLine ? `\n\n${statLine}` : ""}${topLine}\n\nFull game stats and the predictor leaderboard at ${SITE}.\n\n${HASHTAGS} ${tagFor(g.sport)}`,
      payload: { template: "final_stats", data: { sport: g.sport, tn, opp, opponent: opponentOf(g), home, rows } },
    });
  }
  return out;
}

// ─── Rendering ───────────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
function treeFor(payload: { template: string; data: any }): T.Node {
  switch (payload.template) {
    case "countdown": return T.countdown(payload.data);
    case "final_stats": return T.finalStats(payload.data);
    case "promo": return T.promo(payload.data);
    case "potg": return T.playerOfGame(payload.data);
    case "preview": return T.preview(payload.data);
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

Deno.serve(async (req: Request) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // Testing aid: { dry_run: true, now: "<ISO time>" } lists what would be created at that moment, writing nothing.
  const body = await req.json().catch(() => ({}));
  const { data: s } = await supabase.from("social_settings").select("enabled, mode, veto_hours").eq("id", true).maybeSingle();
  const settings = s as Settings | null;
  if (!settings?.enabled) return json({ ok: true, skipped: "disabled" });

  const now = body?.now ? new Date(body.now) : new Date();
  const lead = settings.mode === "veto" ? settings.veto_hours * 3600000 : 0;

  const today = etParts(now).date;
  const dow = weekday(today);
  const { data: sched } = await supabase.from("social_schedule").select("id, kind, dow, hour, minute").eq("enabled", true);
  const rows = (sched ?? []) as ScheduleRow[];

  const candidates: Candidate[] = [];
  for (const row of rows) {
    if (row.dow === null) {
      if (row.kind === "final_stats") candidates.push(...(await finalStatsCandidates(supabase, now)));
      continue;
    }
    if (row.dow !== dow) continue;
    const build = BUILDERS[row.kind];
    if (build) candidates.push(...(await build(supabase, now, today, row, etInstant(today, row.hour, row.minute))));
  }

  if (body?.dry_run === true) {
    return json({
      ok: true, dry_run: true, now: now.toISOString(),
      candidates: candidates.map((c) => ({ key: c.subject_key, kind: c.kind, target: c.target.toISOString(), caption: c.caption, template: c.payload.template })),
    });
  }

  // The post-game stats chart is meant to go out right after a game is finalized, so it only waits a short
  // 15 minutes (still cancelable) instead of the full veto window.
  const leadFor = (c: Candidate) => (c.kind === "final_stats" ? Math.min(lead, 15 * 60000) : lead);

  let created = 0;
  for (const c of candidates) {
    // Create when the veto window for its target time opens (or right away if that's already passed).
    if (now.getTime() < c.target.getTime() - leadFor(c)) continue;
    // Don't post a stale target (e.g. a 9 AM gameday post first noticed at 11 PM).
    if (now.getTime() - c.target.getTime() > 6 * 3600000 && c.kind !== "final_stats") continue;
    const scheduledFor = new Date(Math.max(c.target.getTime(), now.getTime() + leadFor(c)));
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
