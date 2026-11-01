import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// GAME PREVIEW GENERATE (football). Writes our own pregame preview, in the shape
// the site's Game Preview window already renders (same fields ESPN's preview
// gives: headline, subhead, how to watch, line, key stats, notes, leaders, last
// game, next game), instead of copying ESPN's page.
//
// Every number comes from ESPN's public data: records/rankings/line/TV/leaders
// from the game summary, national stat ranks (offense and defense) from ESPN's
// team-stats leaderboard, and everything else (defense, third downs, turnovers, last-game lines, series history) is
// computed here from the teams' box scores and schedules. The prose only
// restates those numbers; nothing is invented. Runs daily from pg_cron for
// games in the next 10 days (the line and kickoff time move during the week);
// also callable with { game_id }. A hand-entered preview (manual and not
// generated) is never overwritten.

const BASE = "https://site.api.espn.com/apis/site/v2/sports/football/college-football";
const TN = "2633";
const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; GoVolsGameDay/1.0)", Accept: "application/json" };

// deno-lint-ignore no-explicit-any
type Json = any;

const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { "Content-Type": "application/json" } });

async function getJson(url: string): Promise<Json | null> {
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (res.ok) return await res.json();
    } catch { /* retry */ }
  }
  return null;
}

// --- Formatting --------------------------------------------------------------

const AP_MONTH = ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];
const etDate = (iso: string) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { month: Number(p.month), day: Number(p.day), hour: Number(p.hour), minute: Number(p.minute) };
};
const dateText = (iso: string) => { const d = etDate(iso); return `${AP_MONTH[d.month - 1]} ${d.day}`; };
function whenText(iso: string): string {
  const d = etDate(iso);
  if (d.hour === 0 && d.minute === 0) return `${dateText(iso)} (time to be announced)`;
  const h12 = d.hour % 12 === 0 ? 12 : d.hour % 12;
  const mm = d.minute === 0 ? "" : `:${String(d.minute).padStart(2, "0")}`;
  return `${dateText(iso)} at ${h12}${mm} ${d.hour < 12 ? "a.m." : "p.m."} ET`;
}
const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};
const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
const num = (s: unknown) => { const n = parseFloat(String(s ?? "").replace(/,/g, "")); return Number.isFinite(n) ? n : 0; };
const one = (n: number) => n.toFixed(1);
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : null);

// --- ESPN data ---------------------------------------------------------------

interface SchedEvent { id: string; date: string; completed: boolean; home: string; away: string; homeId: string; awayId: string; homeScore: number; awayScore: number }

async function teamSchedule(teamId: string, season: number): Promise<SchedEvent[]> {
  const d = await getJson(`${BASE}/teams/${teamId}/schedule?season=${season}&seasontype=2`);
  return ((d?.events ?? []) as Json[]).map((e) => {
    const c = e.competitions?.[0];
    const h = c?.competitors?.find((x: Json) => x.homeAway === "home");
    const a = c?.competitors?.find((x: Json) => x.homeAway === "away");
    const sc = (x: Json) => num(typeof x?.score === "object" ? x.score?.displayValue : x?.score);
    return {
      id: String(e.id), date: e.date, completed: c?.status?.type?.completed === true,
      home: h?.team?.location ?? "", away: a?.team?.location ?? "", homeId: String(h?.team?.id ?? ""), awayId: String(a?.team?.id ?? ""),
      homeScore: sc(h), awayScore: sc(a),
    } as SchedEvent;
  }).sort((x, y) => x.date.localeCompare(y.date));
}

interface GameLine { event: SchedEvent; own: Record<string, string>; opp: Record<string, string>; summary: Json }

async function teamGames(teamId: string, sched: SchedEvent[]): Promise<GameLine[]> {
  const done = sched.filter((e) => e.completed);
  const sums = await Promise.all(done.map((e) => getJson(`${BASE}/summary?event=${e.id}`)));
  const out: GameLine[] = [];
  done.forEach((event, i) => {
    const s = sums[i];
    if (!s) return;
    const box: Record<string, Record<string, string>> = {};
    for (const t of s.boxscore?.teams ?? []) box[String(t.team?.id)] = Object.fromEntries((t.statistics ?? []).map((x: Json) => [x.name, x.displayValue]));
    const oppId = event.homeId === teamId ? event.awayId : event.homeId;
    if (box[teamId] && box[oppId]) out.push({ event, own: box[teamId], opp: box[oppId], summary: s });
  });
  return out;
}

const frac = (s: string | undefined): [number, number] => {
  const m = /^(\d+)-(\d+)$/.exec(s ?? "");
  return m ? [Number(m[1]), Number(m[2])] : [0, 0];
};

interface Agg {
  games: number; ppg: number; papg: number; yds: number; ydsAllowed: number; rush: number; rushAllowed: number;
  pass: number; passAllowed: number; giveaways: number; takeaways: number; thirdOff: [number, number]; thirdDef: [number, number];
}

function aggregate(teamId: string, games: GameLine[]): Agg | null {
  const n = games.length;
  if (n === 0) return null;
  const sum = (f: (g: GameLine) => number) => games.reduce((a, g) => a + f(g), 0);
  const pts = (g: GameLine) => (g.event.homeId === teamId ? [g.event.homeScore, g.event.awayScore] : [g.event.awayScore, g.event.homeScore]);
  const t3 = (pick: (g: GameLine) => string | undefined): [number, number] =>
    games.reduce((a, g) => { const [x, y] = frac(pick(g)); return [a[0] + x, a[1] + y] as [number, number]; }, [0, 0] as [number, number]);
  return {
    games: n,
    ppg: sum((g) => pts(g)[0]) / n, papg: sum((g) => pts(g)[1]) / n,
    yds: sum((g) => num(g.own.totalYards)) / n, ydsAllowed: sum((g) => num(g.opp.totalYards)) / n,
    rush: sum((g) => num(g.own.rushingYards)) / n, rushAllowed: sum((g) => num(g.opp.rushingYards)) / n,
    pass: sum((g) => num(g.own.netPassingYards)) / n, passAllowed: sum((g) => num(g.opp.netPassingYards)) / n,
    giveaways: sum((g) => num(g.own.turnovers)), takeaways: sum((g) => num(g.opp.turnovers)),
    thirdOff: t3((g) => g.own.thirdDownEff), thirdDef: t3((g) => g.opp.thirdDownEff),
  };
}

interface Ranked { value: number; rank: number | null }
interface TeamRanks { off: Record<string, Ranked>; def: Record<string, Ranked> }

// ESPN's national team-stats leaderboard (the same numbers and ranks as its stats pages):
// every FBS team, "Own" (split 0) and "Opponent" (split 900, i.e. what the defense allows).
// The previous per-team statistics feed had no usable defensive ranks.
async function teamRanks(season: number): Promise<Record<string, TeamRanks>> {
  const d = await getJson(`https://site.web.api.espn.com/apis/common/v3/sports/football/college-football/statistics/byteam?region=us&lang=en&contentorigin=espn&season=${season}&seasontype=2&limit=200`);
  const defs: Record<string, string[]> = {};
  for (const c of d?.categories ?? []) defs[c.name] = c.names;
  const out: Record<string, TeamRanks> = {};
  for (const t of d?.teams ?? []) {
    const r: TeamRanks = { off: {}, def: {} };
    for (const c of t.categories ?? []) {
      const side = c.splitId === "0" ? r.off : c.splitId === "900" ? r.def : null;
      if (!side) continue;
      (defs[c.name] ?? []).forEach((n, i) => {
        const rank = Number(c.ranks?.[i]);
        side[`${c.name}.${n}`] = { value: c.values?.[i], rank: Number.isFinite(rank) && rank > 0 ? rank : null };
      });
    }
    out[String(t.team?.id)] = r;
  }
  return out;
}

// --- Text builders -----------------------------------------------------------

const withRank = (s: { value: number; rank: number | null } | undefined, label: string, suffix = "") =>
  s ? `${one(s.value)} ${label}${s.rank ? ` (${ordinal(s.rank)}${suffix})` : ""}` : undefined;

function leaderLines(leaders: Json[] | undefined) {
  const find = (name: string) => (leaders ?? []).find((l) => l.name === name)?.leaders?.[0];
  const td = (n: number) => plural(n, "TD");
  const p = find("passingYards"), r = find("rushingYards"), c = find("receivingYards");
  let passing: string | undefined, rushing: string | undefined, receiving: string | undefined;
  const pm = /(\d+)\/(\d+), ([\d,]+) YDS, (\d+) TD, (\d+) INT/.exec(p?.displayValue ?? "");
  if (pm) passing = `${p.athlete.displayName}, ${pm[3]} yards, ${td(Number(pm[4]))}, ${plural(Number(pm[5]), "INT")}, ${((Number(pm[1]) / Number(pm[2])) * 100).toFixed(1)} completion percentage`;
  const rm = /(\d+) CAR, ([\d,]+) YDS, (\d+) TD/.exec(r?.displayValue ?? "");
  if (rm) rushing = `${r.athlete.displayName}, ${rm[2]} yards on ${rm[1]} carries, ${td(Number(rm[3]))}`;
  const cm = /(\d+) REC, ([\d,]+) YDS, (\d+) TD/.exec(c?.displayValue ?? "");
  if (cm) receiving = `${c.athlete.displayName}, ${cm[2]} yards on ${cm[1]} catches, ${td(Number(cm[3]))}`;
  return { passing, rushing, receiving };
}

function lastGameText(teamId: string, games: GameLine[]): string | null {
  const g = games[games.length - 1];
  if (!g) return null;
  const e = g.event;
  // Names come from the game itself.
  const names: Record<string, string> = { [e.homeId]: e.home, [e.awayId]: e.away };
  const own = e.homeId === teamId ? e.homeScore : e.awayScore;
  const opp = e.homeId === teamId ? e.awayScore : e.homeScore;
  const winner = own > opp ? teamId : (e.homeId === teamId ? e.awayId : e.homeId);
  const [w, l] = own > opp ? [own, opp] : [opp, own];
  const loserId = winner === e.homeId ? e.awayId : e.homeId;
  const parts = [`${names[winner]} ${own === opp ? "tied" : "beat"} ${names[loserId]} ${w}-${l} on ${dateText(e.date)}.`];

  const players = (g.summary.boxscore?.players ?? []).find((t: Json) => String(t.team?.id) === teamId);
  const cat = (name: string) => (players?.statistics ?? []).find((c: Json) => c.name === name);
  const rows = (name: string) => (cat(name)?.athletes ?? []).map((a: Json) => ({ name: a.athlete?.displayName as string, s: Object.fromEntries((cat(name)?.labels ?? []).map((lb: string, i: number) => [lb, a.stats?.[i]])) as Record<string, string> }));
  const qb = rows("passing")[0];
  if (qb?.s["C/ATT"]) {
    const [cmp, att] = String(qb.s["C/ATT"]).split("/");
    const tds = num(qb.s.TD), ints = num(qb.s.INT);
    const tail = tds === 0 && ints === 0 ? " with no touchdowns or interceptions"
      : `${tds > 0 ? ` and ${plural(tds, "touchdown")}` : ""}${ints === 0 ? " with no interceptions" : ` with ${plural(ints, "interception")}`}`;
    parts.push(`${qb.name} completed ${cmp} of ${att} passes for ${qb.s.YDS} yards${tail}.`);
  }
  const rb = rows("rushing");
  if (rb[0]) {
    const t = num(rb[0].s.TD);
    parts.push(`${rb[0].name} had ${rb[0].s.YDS} rushing yards on ${rb[0].s.CAR} carries${t > 0 ? ` and ${t === 1 ? "a touchdown" : plural(t, "touchdown")}` : ""}${rb[1] ? `, and ${rb[1].name} added ${rb[1].s.YDS} yards on ${rb[1].s.CAR} carries` : ""}.`);
  }
  const wr = rows("receiving");
  if (wr[0]) parts.push(`${wr[0].name} had ${plural(num(wr[0].s.REC), "reception")} for ${wr[0].s.YDS} yards${wr[1] ? ` and ${wr[1].name} ${num(wr[1].s.REC)} for ${wr[1].s.YDS}` : ""}.`);

  const a = num(g.own.totalYards), b = num(g.opp.totalYards);
  const ownName = names[teamId], oppName = names[teamId === e.homeId ? e.awayId : e.homeId];
  if (a !== b) parts.push(`${a > b ? ownName : oppName} outgained ${a > b ? oppName : ownName} ${Math.max(a, b)}-${Math.min(a, b)}.`);
  if (num(g.own.turnovers) === 0) parts.push(`${ownName} did not turn the ball over.`);
  return parts.join(" ");
}

// --- Build -------------------------------------------------------------------

async function buildPreview(game: { id: string; cfbd_game_id: number; home_team: string; away_team: string; kickoff_time: string }) {
  const summary = await getJson(`${BASE}/summary?event=${game.cfbd_game_id}`);
  const comp = summary?.header?.competitions?.[0];
  if (!comp) return { error: "ESPN summary unavailable" };

  const tnSide = game.home_team === "Tennessee" ? "home" : "away";
  const home = comp.competitors.find((c: Json) => c.homeAway === "home");
  const away = comp.competitors.find((c: Json) => c.homeAway === "away");
  const tnC = tnSide === "home" ? home : away;
  const oppC = tnSide === "home" ? away : home;
  const oppId = String(oppC.team.id);
  const kd = new Date(game.kickoff_time);
  const season = kd.getUTCMonth() <= 1 ? kd.getUTCFullYear() - 1 : kd.getUTCFullYear();
  const names: Record<string, string> = { [TN]: "Tennessee", [oppId]: oppC.team.location };

  const [tnSched, oppSched, ranks, tnTeam] = await Promise.all([
    teamSchedule(TN, season), teamSchedule(oppId, season), teamRanks(season), getJson(`${BASE}/teams/${TN}`),
  ]);
  const tnR = ranks[TN], oppR = ranks[oppId];
  const [tnGames, oppGames] = await Promise.all([teamGames(TN, tnSched), teamGames(oppId, oppSched)]);
  const tnA = aggregate(TN, tnGames), oppA = aggregate(oppId, oppGames);

  const rec = (c: Json, type: string) => (c.record ?? []).find((r: Json) => r.type === type)?.displayValue;
  const conf = comp.conferenceCompetition === true;
  const confAbbr = (/in (.+)$/.exec(tnTeam?.team?.standingSummary ?? "") ?? [])[1];
  const label = (c: Json, name: string) => {
    const r = c.rank && c.rank <= 25 ? `No. ${c.rank} ` : "";
    const total = rec(c, "total");
    const cr = conf && confAbbr ? rec(c, "vsconf") : null;
    return `${r}${name}${total ? ` (${total}${cr ? `, ${cr} ${confAbbr}` : ""})` : ""}`;
  };
  const subhead = `${label(tnC, "Tennessee")} ${tnSide === "home" ? "vs." : "at"} ${label(oppC, oppC.team.location)}, ${whenText(game.kickoff_time)}`.replace(/\.?$/, ".");

  const pick = (summary.pickcenter ?? []).find((p: Json) => p.provider?.name === "DraftKings" && typeof p.spread === "number") ?? (summary.pickcenter ?? []).find((p: Json) => typeof p.spread === "number");
  let openingLine: string | null = null;
  if (pick) {
    const fav = pick.homeTeamOdds?.favorite ? home : pick.awayTeamOdds?.favorite ? away : null;
    const ml = (o: Json) => (typeof o?.moneyLine === "number" ? (o.moneyLine > 0 ? `+${o.moneyLine}` : String(o.moneyLine)) : null);
    const mlH = ml(pick.homeTeamOdds), mlA = ml(pick.awayTeamOdds);
    openingLine = `${fav ? `${fav.team.location} by ${Math.abs(pick.spread)}.` : "Pick'em."}${typeof pick.overUnder === "number" ? ` Over/under ${pick.overUnder}.` : ""}${mlH && mlA ? ` Moneyline: ${home.team.location} ${mlH}, ${away.team.location} ${mlA} (${pick.provider?.name ?? "ESPN"}).` : ""}`;
  }
  const howToWatch = (comp.broadcasts ?? []).map((b: Json) => b.media?.shortName).filter(Boolean)[0] ?? null;

  // Ranked from ESPN's national leaderboard; falls back to our own box-score averages (no rank) if it is unavailable.
  const stat = (r: Record<string, Ranked> | undefined, key: string, label: string, suffix: string, fallback: number | undefined) =>
    withRank(r?.[key], label, suffix) ?? (fallback !== undefined ? `${one(fallback)} ${label}` : undefined);
  const offense = (r: TeamRanks | undefined, a: Agg | null) => ({
    overall: stat(r?.off, "passing.yardsPerGame", "yards per game", " in FBS", a?.yds),
    passing: stat(r?.off, "passing.passingYardsPerGame", "yards per game", "", a?.pass),
    rushing: stat(r?.off, "rushing.rushingYardsPerGame", "yards per game", "", a?.rush),
    scoring: stat(r?.off, "passing.totalPointsPerGame", "points per game", "", a?.ppg),
  });
  const defense = (r: TeamRanks | undefined, a: Agg | null) => ({
    overall: stat(r?.def, "passing.yardsPerGame", "yards per game", " in FBS", a?.ydsAllowed),
    passing: stat(r?.def, "passing.passingYardsPerGame", "yards per game", "", a?.passAllowed),
    rushing: stat(r?.def, "rushing.rushingYardsPerGame", "yards per game", "", a?.rushAllowed),
    scoring: stat(r?.def, "passing.totalPointsPerGame", "points per game", "", a?.papg),
  });
  const keyStats = [
    { team: "Tennessee", offense: offense(tnR, tnA), defense: defense(tnR, tnA) },
    { team: oppC.team.location, offense: offense(oppR, oppA), defense: defense(oppR, oppA) },
  ];

  // Notes: each restates numbers computed above.
  const notes: string[] = [];
  const kickoffMs = kd.getTime();
  const lastDay = (s: SchedEvent[]) => s.filter((e) => e.completed).map((e) => new Date(e.date).getTime()).pop();
  const bye = (s: SchedEvent[]) => { const t = lastDay(s); return t !== undefined && kickoffMs - t > 11 * 86400000; };
  const lastTxt = (id: string, g: GameLine[]) => {
    const l = g[g.length - 1];
    if (!l) return "";
    const e = l.event;
    const own = e.homeId === id ? e.homeScore : e.awayScore, o = e.homeId === id ? e.awayScore : e.homeScore;
    return `${names[id] ?? (e.homeId === id ? e.home : e.away)} ${own > o ? "beat" : own < o ? "lost to" : "tied"} ${e.homeId === id ? e.away : e.home} ${Math.max(own, o)}-${Math.min(own, o)} on ${dateText(e.date)}.`;
  };
  if (bye(tnSched) && bye(oppSched)) notes.push(`Both teams are coming off a bye week. ${lastTxt(TN, tnGames)} ${lastTxt(oppId, oppGames)}`);
  else if (bye(tnSched)) notes.push(`Tennessee is coming off a bye week. ${lastTxt(TN, tnGames)}`);
  else if (bye(oppSched)) notes.push(`${oppC.team.location} is coming off a bye week. ${lastTxt(oppId, oppGames)}`);

  if (tnA && oppA && tnA.thirdOff[1] >= 20 && oppA.thirdDef[1] >= 20) {
    notes.push(`Third down could swing it: ${oppC.team.location}'s defense has let opponents convert ${oppA.thirdDef[0]} of ${oppA.thirdDef[1]} third downs (${pct(...oppA.thirdDef)}), while Tennessee's offense converts ${pct(...tnA.thirdOff)}. Tennessee's defense has held opponents to ${pct(...tnA.thirdDef)} (${tnA.thirdDef[0]} of ${tnA.thirdDef[1]}).`);
  }
  if (tnA && oppA) {
    const r = tnR?.off["rushing.rushingYardsPerGame"], p = tnR?.off["passing.passingYardsPerGame"];
    notes.push(`Tennessee averages ${one(r?.value ?? tnA.rush)} rushing yards per game${r?.rank ? ` (${ordinal(r.rank)} in FBS)` : ""} against a ${oppC.team.location} run defense allowing ${one(oppA.rushAllowed)}. Through the air, the Vols average ${one(p?.value ?? tnA.pass)} passing yards${p?.rank ? ` (${ordinal(p.rank)})` : ""} and ${oppC.team.location} has allowed ${one(oppA.passAllowed)} per game.`);
  }
  const tnSacks = tnR?.def["passing.sacks"], sackLeader = (summary.leaders ?? []).find((t: Json) => String(t.team?.id) === TN)?.leaders?.find((l: Json) => l.name === "sacks")?.leaders?.[0];
  const oppQb = (summary.leaders ?? []).find((t: Json) => String(t.team?.id) === oppId)?.leaders?.find((l: Json) => l.name === "passingYards")?.leaders?.[0];
  const qm = /(\d+)\/(\d+), ([\d,]+) YDS, (\d+) TD, (\d+) INT/.exec(oppQb?.displayValue ?? "");
  if (tnSacks?.value && tnA && qm) notes.push(`Tennessee's defense has ${tnSacks.value} sacks through ${tnA.games} games (${one(tnSacks.value / tnA.games)} per game)${sackLeader ? `, led by ${sackLeader.athlete.displayName} with ${sackLeader.mainStat?.value ?? sackLeader.displayValue}` : ""}, and faces ${oppQb.athlete.displayName}, who has ${plural(Number(qm[4]), "touchdown pass", "touchdown passes")} and ${plural(Number(qm[5]), "interception")}.`);
  if (tnA && oppA) notes.push(`${oppC.team.location} has ${plural(oppA.giveaways, "giveaway")} and ${plural(oppA.takeaways, "takeaway")} in ${oppA.games} games. Tennessee has ${plural(tnA.giveaways, "giveaway")} and ${plural(tnA.takeaways, "takeaway")} in ${tnA.games}.`);

  // Series history: last ten seasons of Tennessee's schedules.
  const past = await Promise.all(Array.from({ length: 10 }, (_, i) => teamSchedule(TN, season - 1 - i)));
  const meetings = past.flat().filter((e) => e.completed && (e.homeId === oppId || e.awayId === oppId)).sort((a, b) => b.date.localeCompare(a.date));
  if (meetings.length >= 3) {
    const won = (e: SchedEvent) => (e.homeId === TN ? e.homeScore > e.awayScore : e.awayScore > e.homeScore);
    let streak = 0;
    for (const m of meetings) { if (won(m)) streak++; else break; }
    const last = meetings[0], t = last.homeId === TN ? [last.homeScore, last.awayScore] : [last.awayScore, last.homeScore];
    const where = last.homeId === TN ? "in Knoxville" : `at ${oppC.team.location}`;
    const wins = meetings.filter(won).length;
    const lastLine = `${won(last) ? "Tennessee won" : `${oppC.team.location} won`} last season's meeting ${Math.max(...t)}-${Math.min(...t)} ${where}.`;
    notes.push(streak >= 3
      ? `Tennessee has won the last ${streak === 5 ? "five" : streak} meetings and ${wins} of the last ${meetings.length}. ${lastLine}`
      : `Tennessee has won ${wins} of the last ${meetings.length} meetings. ${lastLine}`);
  }

  const lead = (id: string) => leaderLines((summary.leaders ?? []).find((t: Json) => String(t.team?.id) === id)?.leaders);
  const teamLeaders = [{ team: "Tennessee", ...lead(TN) }, { team: oppC.team.location, ...lead(oppId) }];
  const lastGame = [
    { team: "Tennessee", summary: lastGameText(TN, tnGames) },
    { team: oppC.team.location, summary: lastGameText(oppId, oppGames) },
  ].filter((x) => x.summary);

  const nextOf = (id: string, sched: SchedEvent[]) => {
    const n = sched.find((e) => !e.completed && e.id !== String(game.cfbd_game_id) && e.date > game.kickoff_time);
    if (!n) return null;
    const isHome = n.homeId === id;
    return `${names[id]}: ${isHome ? "vs." : "at"} ${isHome ? n.away : n.home}, ${dateText(n.date)}.`;
  };
  const nextGame = [nextOf(TN, tnSched), nextOf(oppId, oppSched)].filter(Boolean) as string[];

  return {
    content: {
      generated: true, manual: true, generatedAt: new Date().toISOString(),
      headline: `${away.team.displayName} @ ${home.team.displayName}`, subhead, howToWatch, openingLine,
      keyStats, keyStatsNotes: notes, teamLeaders, lastGame, nextGame,
    },
  };
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const body = await req.json().catch(() => ({}));
  let q = supabase.from("live_games").select("id, cfbd_game_id, home_team, away_team, kickoff_time").eq("sport", "football");
  if (body?.game_id) q = q.eq("id", body.game_id);
  else {
    q = q.eq("status", "pregame")
      .gte("kickoff_time", new Date(Date.now() - 4 * 3600000).toISOString())
      .lte("kickoff_time", new Date(Date.now() + 10 * 86400000).toISOString());
  }
  const { data: games, error } = await q.order("kickoff_time", { ascending: true });
  if (error) return json({ ok: false, error: error.message }, 500);

  const results: Record<string, unknown>[] = [];
  for (const g of (games ?? []) as { id: string; cfbd_game_id: number; home_team: string; away_team: string; kickoff_time: string }[]) {
    const { data: existing } = await supabase.from("game_previews").select("content").eq("game_id", g.id).maybeSingle();
    const c = existing?.content as { manual?: boolean; generated?: boolean } | undefined;
    if (c?.manual === true && c?.generated !== true) {
      results.push({ game: `${g.away_team} @ ${g.home_team}`, skipped: "hand-entered preview" });
      continue;
    }
    const built = await buildPreview(g);
    if ("error" in built) {
      results.push({ game: `${g.away_team} @ ${g.home_team}`, error: built.error });
      continue;
    }
    if (body?.dry_run === true) {
      results.push({ game: `${g.away_team} @ ${g.home_team}`, content: built.content });
      continue;
    }
    const { error: upErr } = await supabase.from("game_previews").upsert(
      { game_id: g.id, source_url: "generated", content: built.content, fetched_at: new Date().toISOString() },
      { onConflict: "game_id" },
    );
    results.push({ game: `${g.away_team} @ ${g.home_team}`, ok: !upErr, error: upErr?.message });
  }
  return json({ ok: true, results });
});
