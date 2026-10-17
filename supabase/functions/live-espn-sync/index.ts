import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ─── LIVE ESPN SYNC ─────────────────────────────────────────────────────────
// ESPN-fed twin of live-cfbd-sync: drives the live scoreboard and the live
// drive predictor from ESPN's public game summary instead of CFBD's live/plays
// feed. Only games with live_games.data_source = 'espn' are handled here;
// live-cfbd-sync skips those, so flipping the column switches a game's feed.
// ESPN's event id is the same number as live_games.cfbd_game_id and its drive
// ids match CFBD's, so a window opened by either poller is recognised by the
// other (drive_windows.cfbd_drive_id).
//
// Same RPCs as the CFBD poller (open_drive_window / settle_drive_outcome), so
// odds and scoring are untouched. Same rules: a window is 30s when the drive
// starts off a kickoff and 60s otherwise, there's no post-drive pause, and a
// window only ever opens at the drive's real starting spot.
//
// What ESPN gives us that CFBD's live feed doesn't: a live box score (team
// yards, turnovers, first downs, time of possession), the receiving team and
// resulting spot of every kickoff, and the end spot of every play.
//
// Early opening: when a drive ends in a punt, turnover, missed FG or downs,
// the next window opens right away from the last play's end spot (see
// earlyNextStart), keyed "pending:<prev drive id>" until ESPN creates the next
// drive at its first snap, then re-keyed to it. If the next drive turns out
// not to match (a kickoff, the other team), the early window and its picks are
// dropped — nothing has been scored — and the drive opens normally.
//
// dry_run (with a game_id) plans every drive from ESPN's data without writing
// anything and compares the plan against the windows already in the database
// — used to replay finished games.

const ESPN_SUMMARY = "https://site.api.espn.com/apis/site/v2/sports/football/college-football/summary?event=";
const KICKOFF_WINDOW_SECONDS = 30;
const DEFAULT_WINDOW_SECONDS = 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ─── ESPN shapes (only the fields used) ─────────────────────────────────────

interface EspnSpot {
  down?: number;
  distance?: number;
  yardsToEndzone?: number;
  possessionText?: string;
  team?: { id?: string };
}

interface EspnPlay {
  id: string;
  type?: { text?: string };
  text?: string;
  period?: { number?: number };
  clock?: { displayValue?: string };
  start?: EspnSpot;
  end?: EspnSpot;
}

interface EspnDrive {
  id: string;
  team?: { id?: string };
  displayResult?: string;
  start?: { period?: { number?: number }; clock?: { displayValue?: string }; yardLine?: number };
  plays?: EspnPlay[];
}

interface EspnCompetitor {
  id: string;
  homeAway: "home" | "away";
  score?: string;
  possession?: boolean;
  team: { id: string; location?: string; displayName?: string };
}

interface EspnSummary {
  header: {
    competitions: {
      competitors: EspnCompetitor[];
      status: {
        period?: number;
        displayClock?: string;
        type: { state: string; completed?: boolean; detail?: string };
      };
    }[];
  };
  drives?: { previous?: EspnDrive[]; current?: EspnDrive };
  boxscore?: { teams?: { team: { id: string }; statistics?: { name: string; displayValue?: string }[] }[] };
}

// ─── Result mapping (same vocabulary rules as live-cfbd-sync) ────────────────
// ESPN's displayResult is one of: Touchdown, Field Goal, Missed FG, Punt, Punt
// Touchdown (a punt returned for a score — still a punt for the offense),
// Fumble, Interception, Downs, End Of Half / End of Game. Unmapped results are
// left unsettled rather than guessed, since a wrong settlement corrupts scoring.
function mapDriveResult(result: string): string | null {
  const r = result.toUpperCase().trim();
  if (r.includes("MISSED") && (r.includes("FIELD GOAL") || r.includes("FG"))) return "turnover_on_downs";
  if (r.includes("PUNT")) return "punt";
  if ((r.includes("FUMBLE") && !r.includes("OWN")) || r.includes("INTERCEPTION") || r === "INT") return "turnover";
  if (r.includes("FIELD GOAL") || r === "FG") return "field_goal";
  if (r.includes("TOUCHDOWN") || r === "TD") return "touchdown";
  if (r.includes("DOWNS")) return "turnover_on_downs";
  if (r.includes("SAFETY")) return "safety";
  if (r.includes("END OF")) return "end_of_quarter";
  return null;
}

// ─── Planning (pure: ESPN data in, what-to-do out) ───────────────────────────

const isRealSpot = (y: number | null | undefined): y is number => y != null && y > 0 && y < 100;

function isKickoffPlay(p: EspnPlay): boolean {
  return /kickoff|onside/i.test(p.type?.text ?? "") || /\bkickoff\b/i.test(p.text ?? "");
}

// Where the receiving team starts after a kickoff, and who it is. ESPN's
// kickoff play carries the receiving team and the resulting spot in `end`, but
// the rules are more reliable than the feed for the odd cases: a touchback or
// fair catch is the 25, a kick out of bounds is the 35 (ESPN's own spot says
// the 1-5 yard line). A returned kick takes ESPN's end spot, cross-checked
// against the spot the text names. Penalties, onside kicks, fumbles and return
// touchdowns are never guessed (null = wait for the first snap).
function kickoffStart(p: EspnPlay): { ytg: number; receiverId: string } | null {
  const text = p.text ?? "";
  const receiverId = p.end?.team?.id;
  if (!text || !receiverId) return null;
  if (/penalty|onside|fumble|touchdown|\bTD\b/i.test(text)) return null;
  if (/touchback/i.test(text) || /fair catch/i.test(text)) return { ytg: 75, receiverId };
  if (/out of bounds/i.test(text)) return { ytg: 65, receiverId };
  const m = text.match(/\breturn\s+(?:for\s+)?(\d+)\s+yards?\s+to\s+the\s+[A-Za-z]+(\d+)/i);
  const endYtg = p.end?.yardsToEndzone;
  if (!m || !isRealSpot(endYtg)) return null;
  const named = parseInt(m[2], 10);
  return endYtg === 100 - named || endYtg === named ? { ytg: endYtg, receiverId } : null;
}

// Where the NEXT drive will start, read from the last play of a drive that
// just ended in a change of possession — so the next pick window can open
// before the next drive exists in ESPN's feed (it isn't created until the
// first snap). ESPN's end spot is right about 90% of replayed cases; the
// misses are penalties, a fair catch (end spot 0) and an interception whose
// end spot ignores the return. So accept it only when it is a real spot, the
// ball changed hands, no penalty is mentioned, and it agrees with the spot the
// play text itself names. Anything else returns null and the window opens at
// the first snap, as before.
function earlyNextStart(v: EspnDrive, outcome: string | null, rawResult: string): { ytg: number; offenseId: string } | null {
  if (outcome !== "punt" && outcome !== "turnover" && outcome !== "turnover_on_downs") return null;
  if (/touchdown|safety|end of/i.test(rawResult)) return null;
  const last = [...(v.plays ?? [])].reverse().find((p) => !/timeout|end period|end of|official/i.test(p.type?.text ?? ""));
  if (!last) return null;
  const text = last.text ?? "";
  // A DECLINED penalty doesn't change the spot (e.g. "punt 38 yards to the
  // BAMA50 PENALTY TENN Running Into The Kicker declined"), so ignore it;
  // an accepted, offsetting or unlabelled one still blocks the early read.
  const textNoDeclined = text.replace(/\bpenalty\b[^()]*?\bdeclined\b/gi, "");
  if (/penalty|no play|touchdown|safety|\bTD\b/i.test(textNoDeclined) || /penalty/i.test(last.type?.text ?? "")) return null;
  const e = last.end;
  if (!e || !isRealSpot(e.yardsToEndzone) || !e.team?.id || e.team.id === v.team?.id) return null;
  const spots = [...text.matchAll(/\b(?:to|at)\s+(?:the\s+)?[A-Za-z]*?(\d{1,2})\b/g)];
  if (spots.length > 0) {
    const named = parseInt(spots[spots.length - 1][1], 10);
    if (e.yardsToEndzone !== named && e.yardsToEndzone !== 100 - named) return null;
  }
  return { ytg: e.yardsToEndzone, offenseId: e.team.id };
}

interface PlannedOpen {
  ytg: number;
  down: number;
  distance: number;
  quarter: number;
  clock: string;
  offenseId: string;
  seconds: number;
}

interface PlannedDrive {
  id: string;
  inProgress: boolean;
  offenseId: string | null;
  open: PlannedOpen | null; // null = starting spot not known yet
  outcome: string | null; // mapped outcome of a finished drive
  rawResult: string; // ESPN's displayResult ("" while in progress)
  startsWithKickoff: boolean;
  next: { ytg: number; offenseId: string } | null; // early read of the following drive's start
}

function allDrives(d: EspnSummary): EspnDrive[] {
  const seen = new Map<string, EspnDrive>();
  for (const v of d.drives?.previous ?? []) seen.set(v.id, v);
  if (d.drives?.current) seen.set(d.drives.current.id, d.drives.current);
  return [...seen.values()];
}

function planDrive(v: EspnDrive, fallbackClock: string): PlannedDrive {
  const plays = v.plays ?? [];
  const scrimmage = plays.filter((p) => !isKickoffPlay(p));
  const kickoff = plays.find(isKickoffPlay);
  const rawResult = (v.displayResult ?? "").trim();
  const inProgress = rawResult === "";

  // The drive's FIRST scrimmage play with a real spot gives the starting
  // spot, down and distance — never a later play, which would record a
  // mid-drive spot if the window opens a few plays in.
  const first = scrimmage.find((p) => isRealSpot(p.start?.yardsToEndzone));
  let ytg: number | null = null;
  let down = 1;
  let distance = 10;
  let offenseId: string | null = v.team?.id ?? null;

  if (first) {
    ytg = first.start!.yardsToEndzone!;
    down = first.start?.down ?? 1;
    distance = first.start?.distance ?? 10;
    offenseId = first.start?.team?.id ?? offenseId;
  } else if (kickoff && scrimmage.length === 0) {
    // A kickoff-only drive is labelled with the KICKING team until the first
    // snap — the receiving team comes from the kickoff play itself.
    const ks = kickoffStart(kickoff);
    if (ks) {
      ytg = ks.ytg;
      offenseId = ks.receiverId;
    }
  }
  if (ytg === null && !inProgress && isRealSpot(v.start?.yardLine)) {
    ytg = v.start!.yardLine!; // catch-up path for a drive already over
  }

  const firstPlay = plays[0];
  const open: PlannedOpen | null = ytg === null || offenseId === null ? null : {
    ytg,
    down,
    distance,
    quarter: v.start?.period?.number ?? firstPlay?.period?.number ?? 1,
    clock: v.start?.clock?.displayValue ?? firstPlay?.clock?.displayValue ?? fallbackClock,
    offenseId,
    seconds: kickoff ? KICKOFF_WINDOW_SECONDS : DEFAULT_WINDOW_SECONDS,
  };

  const outcome = inProgress ? null : mapDriveResult(rawResult);
  return {
    id: v.id,
    inProgress,
    offenseId,
    open,
    outcome,
    rawResult,
    startsWithKickoff: !!kickoff,
    next: inProgress ? null : earlyNextStart(v, outcome, rawResult),
  };
}

// ─── Scoreboard pieces ───────────────────────────────────────────────────────

const toInt = (s: string | undefined): number | null => {
  if (s == null) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
};

function teamBoxStats(d: EspnSummary, teamId: string) {
  const stats = d.boxscore?.teams?.find((t) => t.team.id === teamId)?.statistics ?? [];
  const get = (name: string) => stats.find((s) => s.name === name)?.displayValue;
  const rushing = toInt(get("rushingYards"));
  const passing = toInt(get("netPassingYards"));
  return {
    rushingYards: rushing,
    passingYards: passing,
    totalYards: toInt(get("totalYards")) ?? (rushing != null && passing != null ? rushing + passing : null),
    turnovers: toInt(get("turnovers")),
    firstDowns: toInt(get("firstDowns")),
    possessionTime: get("possessionTime") ?? null,
  };
}

// Timeouts remaining reset each half (periods 1-2 vs 3-4+); OT is lumped into
// the second half, as in the CFBD poller.
function timeoutsRemaining(d: EspnSummary, teamLocation: string, currentPeriod: number): number {
  const half = (p: number) => (p <= 2 ? 1 : 2);
  let used = 0;
  for (const v of allDrives(d)) {
    for (const p of v.plays ?? []) {
      if (!/timeout/i.test(p.type?.text ?? "")) continue;
      if (half(p.period?.number ?? 1) !== half(currentPeriod)) continue;
      const m = (p.text ?? "").match(/^Timeout\s+(.+?),\s*clock/i);
      if (m && m[1].trim().toLowerCase() === teamLocation.trim().toLowerCase()) used++;
    }
  }
  return Math.max(0, 3 - used);
}

function parseStatus(status: EspnSummary["header"]["competitions"][0]["status"]) {
  const detail = status.type.detail ?? "";
  const clockMatch = detail.match(/^(\d{1,2}:\d{2})/);
  const periodMatch = detail.match(/(\d)(?:st|nd|rd|th)\s+Quarter/i);
  return {
    period: status.period ?? (periodMatch ? parseInt(periodMatch[1], 10) : null),
    clock: status.displayClock ?? (clockMatch ? clockMatch[1] : null),
  };
}

// ─── Per-game sync ───────────────────────────────────────────────────────────

type SupabaseClient = ReturnType<typeof getSupabaseClient>;

interface GameRow {
  id: string;
  cfbd_game_id: number;
  home_team: string;
  away_team: string;
  status: string;
  manual_control: boolean;
}

const sameTeam = (a: string, b: string) => {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  return x === y || x.startsWith(y) || y.startsWith(x);
};

let lastFetchError = "";

async function fetchSummary(eventId: number): Promise<EspnSummary | null> {
  try {
    const res = await fetch(`${ESPN_SUMMARY}${eventId}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GoVolsGameDay/1.0)", Accept: "application/json" },
    });
    if (!res.ok) {
      lastFetchError = `HTTP ${res.status}`;
      return null;
    }
    return (await res.json()) as EspnSummary;
  } catch (e) {
    lastFetchError = e instanceof Error ? e.message : String(e);
    return null;
  }
}

async function syncGame(supabase: SupabaseClient, game: GameRow, dryRun: boolean) {
  const d = await fetchSummary(game.cfbd_game_id);
  if (!d?.header?.competitions?.[0]) {
    return { game_id: game.id, ok: false, error: `ESPN summary unavailable: ${lastFetchError || "unexpected shape"}` };
  }
  const comp = d.header.competitions[0];
  const home = comp.competitors.find((c) => c.homeAway === "home");
  const away = comp.competitors.find((c) => c.homeAway === "away");
  if (!home || !away || !sameTeam(home.team.location ?? "", game.home_team) || !sameTeam(away.team.location ?? "", game.away_team)) {
    return {
      game_id: game.id,
      ok: false,
      error: `ESPN event ${game.cfbd_game_id} is ${away?.team.location} @ ${home?.team.location}, not ${game.away_team} @ ${game.home_team} — not syncing`,
    };
  }

  const state = comp.status.type.state; // 'pre' | 'in' | 'post'
  const { period, clock } = parseStatus(comp.status);
  const homeScore = toInt(home.score) ?? 0;
  const awayScore = toInt(away.score) ?? 0;
  const nameOf = (id: string | null) =>
    id === home.team.id ? home.team.location ?? "" : id === away.team.id ? away.team.location ?? "" : "";

  const plans = allDrives(d).map((v) => planDrive(v, clock ?? "15:00"));

  if (dryRun) {
    const { data: windows } = await supabase
      .from("drive_windows")
      .select("cfbd_drive_id, drive_number, yardline, down, distance, score_differential, actual_outcome")
      .eq("game_id", game.id);
    const byId = new Map((windows ?? []).map((w) => [w.cfbd_drive_id as string, w]));
    return {
      game_id: game.id,
      ok: true,
      dry_run: true,
      espnState: state,
      drives: plans.map((p) => {
        const w = byId.get(p.id);
        const plannedYard = p.open ? 100 - p.open.ytg : null;
        const offenseIsHome = p.open ? p.open.offenseId === home.team.id : null;
        const scoreDiffNow = p.open ? (offenseIsHome ? homeScore - awayScore : awayScore - homeScore) : null;
        return {
          id: p.id,
          offense: nameOf(p.open?.offenseId ?? p.offenseId),
          raw: p.rawResult,
          outcome: p.outcome,
          plannedYardline: plannedYard,
          plannedSeconds: p.open?.seconds ?? null,
          earlyNext: p.next ? { yardline: 100 - p.next.ytg, offense: nameOf(p.next.offenseId) } : null,
          existing: w ? { n: w.drive_number, yardline: w.yardline, outcome: w.actual_outcome, scoreDiff: w.score_differential } : null,
          yardlineMatch: w && plannedYard != null ? w.yardline === plannedYard : null,
          outcomeMatch: w && p.outcome ? w.actual_outcome === p.outcome : null,
          scoreDiffNow,
        };
      }),
    };
  }

  if (state === "pre") return { game_id: game.id, ok: true, skipped: "not started yet" };

  // ── Scoreboard ──
  const lastEnd = [...allDrives(d)].flatMap((v) => v.plays ?? []).reverse().map((p) => p.end).find((e) => e && isRealSpot(e.yardsToEndzone) && e.down != null);
  const possessing = comp.competitors.find((c) => c.possession);
  const hb = teamBoxStats(d, home.team.id);
  const ab = teamBoxStats(d, away.team.id);
  const allDone = plans.every((p) => !p.inProgress);
  const newStatus = state === "post" && comp.status.type.completed && allDone ? "final" : "live";

  const update: Record<string, unknown> = {
    status: newStatus,
    home_score: homeScore,
    away_score: awayScore,
    current_quarter: state === "post" ? null : period,
    game_clock: state === "post" ? "" : clock,
    possession: possessing?.team.location ?? null,
    down: lastEnd?.down ?? null,
    distance: lastEnd?.distance ?? null,
    yardline: lastEnd?.yardsToEndzone != null ? 100 - lastEnd.yardsToEndzone : null,
    home_timeouts_remaining: timeoutsRemaining(d, home.team.location ?? "", period ?? 1),
    away_timeouts_remaining: timeoutsRemaining(d, away.team.location ?? "", period ?? 1),
    updated_at: new Date().toISOString(),
  };
  const setIf = (k: string, v: unknown) => { if (v != null) update[k] = v; };
  setIf("home_rushing_yards", hb.rushingYards); setIf("away_rushing_yards", ab.rushingYards);
  setIf("home_passing_yards", hb.passingYards); setIf("away_passing_yards", ab.passingYards);
  setIf("home_total_yards", hb.totalYards); setIf("away_total_yards", ab.totalYards);
  setIf("home_turnovers", hb.turnovers); setIf("away_turnovers", ab.turnovers);
  setIf("home_first_downs", hb.firstDowns); setIf("away_first_downs", ab.firstDowns);
  setIf("home_possession_time", hb.possessionTime); setIf("away_possession_time", ab.possessionTime);

  await supabase.from("live_games").update(update).eq("id", game.id);

  if (game.manual_control) {
    return { game_id: game.id, ok: true, status: newStatus, homeScore, awayScore, driveSyncSkipped: "manual control active" };
  }

  const { data: existingWindows } = await supabase
    .from("drive_windows")
    .select("drive_number, cfbd_drive_id, status")
    .eq("game_id", game.id);
  type WinRow = { drive_number: number; cfbd_drive_id: string | null; status: string };
  const byId = new Map<string, WinRow>(
    (existingWindows ?? []).filter((w) => w.cfbd_drive_id).map((w) => [w.cfbd_drive_id as string, w as WinRow])
  );
  let nextDriveNumber = Math.max(0, ...(existingWindows ?? []).map((w) => w.drive_number)) + 1;

  let opened = 0;
  let settled = 0;
  let openedEarly = 0;
  let rekeyed = 0;
  let voided = 0;
  const settleErrors: string[] = [];
  const resolvedIds = new Set<string>();

  const scoreDiffFor = (offenseId: string) => (offenseId === home.team.id ? homeScore - awayScore : awayScore - homeScore);

  const openAt = async (driveNumber: number, cfbdId: string, o: PlannedOpen) => {
    const { error } = await supabase.rpc("open_drive_window", {
      p_game_id: game.id,
      p_drive_number: driveNumber,
      p_yardline: 100 - o.ytg,
      p_quarter: o.quarter,
      p_game_clock: o.clock,
      p_score_diff: scoreDiffFor(o.offenseId),
      p_down: o.down,
      p_distance: o.distance,
      p_cfbd_drive_id: cfbdId,
      p_window_seconds: o.seconds,
    });
    if (error) settleErrors.push(`open ${cfbdId}: ${error.message}`);
    else opened++;
    nextDriveNumber = Math.max(nextDriveNumber, driveNumber + 1);
    return !error;
  };

  // Early windows are keyed "pending:<previous drive id>" until the real next
  // drive shows up in ESPN's feed, then re-keyed to its id (same drive number,
  // so picks already made carry over).
  const pendingKey = (prevId: string) => `pending:${prevId}`;

  for (let i = 0; i < plans.length; i++) {
    const p = plans[i];
    let existing = byId.get(p.id);

    if (!existing && i > 0) {
      const prev = plans[i - 1];
      const pend = byId.get(pendingKey(prev.id));
      if (pend) {
        if (!p.open && p.inProgress) continue; // real start not known yet — keep the early window
        if (p.open && !p.startsWithKickoff && prev.next && p.open.offenseId === prev.next.offenseId) {
          // Same team has the ball: the early window was for this drive.
          const { error } = await supabase
            .from("drive_windows")
            .update({ cfbd_drive_id: p.id })
            .eq("game_id", game.id)
            .eq("drive_number", pend.drive_number);
          if (error) {
            settleErrors.push(`rekey ${p.id}: ${error.message}`);
            continue;
          }
          existing = { ...pend, cfbd_drive_id: p.id };
          byId.delete(pendingKey(prev.id));
          byId.set(p.id, existing);
          rekeyed++;
        } else {
          // The next drive isn't the one we predicted (a kickoff, the other
          // team, nothing played). Nothing was scored yet, so drop the early
          // window and its picks and open this drive the normal way.
          await supabase.from("drive_predictions").delete().eq("game_id", game.id).eq("drive_number", pend.drive_number).in("status", ["open", "locked"]);
          await supabase.from("drive_windows").delete().eq("game_id", game.id).eq("drive_number", pend.drive_number).neq("status", "resolved");
          byId.delete(pendingKey(prev.id));
          nextDriveNumber = Math.min(nextDriveNumber, pend.drive_number);
          voided++;
        }
      }
    }

    const driveNumber = existing ? existing.drive_number : nextDriveNumber;
    if (existing?.status === "resolved") resolvedIds.add(p.id);

    if (p.inProgress) {
      if (existing || !p.open) continue; // already open, or spot not known yet — wait
      await openAt(driveNumber, p.id, p.open);
    } else if (!existing || existing.status !== "resolved") {
      if (!existing) {
        if (!p.open) {
          settleErrors.push(`drive ${p.id}: finished but no starting spot to open a window with`);
          continue;
        }
        await openAt(driveNumber, p.id, p.open);
      }
      if (p.outcome) {
        const { error } = await supabase.rpc("settle_drive_outcome", {
          p_game_id: game.id,
          p_drive_number: driveNumber,
          p_actual_outcome: p.outcome,
        });
        if (error) settleErrors.push(`drive ${driveNumber}: ${error.message}`);
        else {
          settled++;
          resolvedIds.add(p.id);
        }
      } else {
        settleErrors.push(`drive ${driveNumber}: unrecognized result "${p.rawResult}"`);
      }
    }
  }

  // Early open: the latest drive just ended in a change of possession and the
  // next one isn't in the feed yet. Not at a half/quarter break or after the
  // game, where the "next drive" may never be played.
  const lastPlan = plans[plans.length - 1];
  const detail = comp.status.type.detail ?? "";
  if (
    lastPlan?.next && state === "in" && !/half|end of|final/i.test(detail) &&
    resolvedIds.has(lastPlan.id) && !byId.has(pendingKey(lastPlan.id))
  ) {
    const ok = await openAt(nextDriveNumber, pendingKey(lastPlan.id), {
      ytg: lastPlan.next.ytg,
      down: 1,
      distance: Math.min(10, lastPlan.next.ytg),
      quarter: period ?? 1,
      clock: clock ?? "15:00",
      offenseId: lastPlan.next.offenseId,
      seconds: DEFAULT_WINDOW_SECONDS,
    });
    if (ok) openedEarly++;
  }

  return {
    game_id: game.id,
    ok: true,
    status: newStatus,
    homeScore,
    awayScore,
    driveCount: plans.length,
    opened,
    openedEarly,
    rekeyed,
    voided,
    settled,
    settleErrors,
  };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  let body: { game_id?: string; dry_run?: boolean } = {};
  try {
    body = await req.json();
  } catch { /* empty body */ }

  const supabase = getSupabaseClient();

  if (body.game_id) {
    // Single-game mode — manual/debug calls (and dry_run replays of finished games).
    const { data: game, error: gameErr } = await supabase
      .from("live_games")
      .select("*")
      .eq("id", body.game_id)
      .maybeSingle();
    if (gameErr || !game) return json({ error: "Game not found" }, 404);
    const result = await syncGame(supabase, game as GameRow, body.dry_run === true);
    return json(result, result.ok ? 200 : 502);
  }

  // Only games assigned to ESPN, and — as in the CFBD poller — only 'live'
  // games and 'pregame' games within an hour of kickoff.
  const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const { data: games, error: gamesErr } = await supabase
    .from("live_games")
    .select("id, cfbd_game_id, home_team, away_team, status, manual_control")
    .eq("data_source", "espn")
    .or(`status.eq.live,and(status.eq.pregame,kickoff_time.lte.${soon})`);
  if (gamesErr) return json({ error: gamesErr.message }, 500);

  const results = [];
  for (const game of (games ?? []) as GameRow[]) {
    results.push(await syncGame(supabase, game, false));
  }
  return json({ ok: true, gamesSynced: results.length, results });
});
