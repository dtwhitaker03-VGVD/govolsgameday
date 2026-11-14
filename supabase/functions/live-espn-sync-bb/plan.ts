// Pure stretch planning for the basketball live predictor — no I/O, so it can be
// replayed against saved ESPN play-by-play.
//
// A "stretch" is the play between two boundaries. Boundaries are the start of
// the game, each TV (media) timeout, and the end of each period. Stretch n runs
// from boundary n-1 to boundary n.
//
// ESPN's labels can't be trusted to find the TV timeouts: when a team calls its timeout
// as the media timeout, ESPN logs only "<Team> Timeout" (ShortTimeOut) and no
// OfficialTVTimeOut, and it sometimes tags an ordinary short stoppage as a TV timeout.
// So the TV timeouts are found by the schedule instead. Each half has four media timeouts,
// at the 16:00, 12:00, 8:00 and 4:00 marks; each is the FIRST timeout of any kind at or
// below its mark. A timeout above the next mark (an ordinary team timeout) or one after
// the half's four are spent is not a boundary. This matched every TV break in the Wofford,
// Radford and Tennessee State games. Overtime has no media timeouts, so there only
// ESPN's own OfficialTVTimeOut label counts.
// Women's games play four quarters and are cut by quarter instead (mode
// 'quarter'): boundaries are only the start and the end of each period, and
// regulation is four periods, not two halves.

export interface BbPlay {
  id: string;
  type?: { text?: string };
  text?: string;
  period?: { number?: number };
  clock?: { displayValue?: string };
  homeScore?: number;
  awayScore?: number;
}

export type BoundaryKind = "start" | "tv" | "short" | "period" | "end";

export interface Boundary {
  playId: string;
  kind: BoundaryKind;
  period: number;
  clock: string;
  home: number;
  away: number;
  /** A live-ball play has happened since this boundary (the next stretch has begun). */
  resumed: boolean;
}

const NOT_PLAY = new Set([
  "jumpball", "substitution", "officialtvtimeout", "shorttimeout", "end period", "end game",
  "dead ball rebound",
]);

// Media timeouts per half, as seconds on the clock.
const MEDIA_MARKS = [960, 720, 480, 240];

function clockSeconds(display: string | undefined): number {
  const m = /^(\d+):(\d{2})/.exec(display ?? "");
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
}

export function isLivePlay(p: BbPlay): boolean {
  const t = (p.type?.text ?? "").toLowerCase();
  if (NOT_PLAY.has(t)) return false;
  if (/challenge|review|timeout|technical/.test(t)) return false;
  return true;
}

export type PlanMode = "stretch" | "quarter";

/** The game cannot go on after this boundary. */
export function isTerminal(b: Boundary, mode: PlanMode = "stretch"): boolean {
  const regulation = mode === "quarter" ? 4 : 2;
  return b.kind === "end" || (b.kind === "period" && b.period >= regulation && b.home !== b.away);
}

export function planBoundaries(plays: BbPlay[], mode: PlanMode = "stretch"): Boundary[] {
  const out: Boundary[] = [];
  if (plays.length === 0) return out;
  const first = plays[0];
  out.push({
    playId: first.id, kind: "start", period: first.period?.number ?? 1,
    clock: first.clock?.displayValue ?? "20:00", home: 0, away: 0, resumed: false,
  });

  // Which of a half's four media-timeout slots are used up (or skipped), by period.
  const slotsUsed = new Map<number, boolean[]>();
  // A timeout at `clock` fills the latest unused slot whose mark it is at or below (any slots
  // before it are skipped as missed). Returns false when it is an ordinary timeout.
  const claimMediaSlot = (period: number, clock: string): boolean => {
    if (period > 2) return false;
    const sec = clockSeconds(clock);
    const used = slotsUsed.get(period) ?? MEDIA_MARKS.map(() => false);
    let pick = -1;
    for (let k = MEDIA_MARKS.length - 1; k >= 0; k--) {
      if (!used[k] && MEDIA_MARKS[k] >= sec) { pick = k; break; }
    }
    if (pick < 0) return false;
    for (let k = 0; k <= pick; k++) used[k] = true;
    slotsUsed.set(period, used);
    return true;
  };

  for (const p of plays.slice(1)) {
    const last = out[out.length - 1];
    if (isTerminal(last, mode)) break;
    if (isLivePlay(p)) {
      last.resumed = true;
      continue;
    }
    const t = (p.type?.text ?? "").toLowerCase();
    const isTimeout = /timeout/.test(t);
    let kind: BoundaryKind | null =
      t === "end period" ? "period" :
      t === "end game" ? "end" : null;
    if (isTimeout && mode !== "quarter") {
      const tp = p.period?.number ?? last.period;
      const tc = p.clock?.displayValue ?? last.clock;
      if (tp > 2) {
        if (t === "officialtvtimeout") kind = "tv";
      } else if (claimMediaSlot(tp, tc)) {
        kind = "tv";
      }
    }
    if (!kind) continue;

    const period = p.period?.number ?? last.period;
    const clock = p.clock?.displayValue ?? last.clock;
    // Nothing was played since the last boundary: no stretch to cut (a TV
    // timeout straight after a period ends, a repeated horn). Keep the later
    // end-of-game marker only as a terminal flag.
    if (!last.resumed && kind !== "end") continue;
    if (!last.resumed && kind === "end") {
      if (last.kind !== "start") last.kind = "end";
      continue;
    }
    out.push({
      playId: p.id, kind, period, clock,
      home: p.homeScore ?? last.home, away: p.awayScore ?? last.away, resumed: false,
    });
  }
  return out;
}

export interface StretchStats {
  threes: number;
  twos: number;
  turnoversForced: number;
  fouls: number;
}

interface StatPlay extends BbPlay {
  scoringPlay?: boolean;
  scoreValue?: number;
  team?: { id?: string };
}

/**
 * Tennessee's numbers over one stretch: the plays strictly after `fromPlayId`
 * (the boundary that opens it) up to, not including, `toPlayId` (the boundary
 * that closes it; null = the end of the play log).
 *   threes / twos  made field goals by Tennessee (free throws are scoreValue 1)
 *   turnoversForced  turnovers committed by the opponent
 *   fouls          fouls committed by Tennessee (ESPN attributes a foul play to the fouler's team)
 */
export function stretchStats(plays: BbPlay[], fromPlayId: string, toPlayId: string | null, tnTeamId: string): StretchStats {
  const out: StretchStats = { threes: 0, twos: 0, turnoversForced: 0, fouls: 0 };
  const start = plays.findIndex((p) => p.id === fromPlayId);
  if (start < 0) return out;
  for (let i = start + 1; i < plays.length; i++) {
    const p = plays[i] as StatPlay;
    if (toPlayId !== null && p.id === toPlayId) break;
    const team = p.team?.id;
    if (!team) continue;
    const t = (p.type?.text ?? "").toLowerCase();
    const mine = team === tnTeamId;
    if (p.scoringPlay && mine && p.scoreValue === 3) out.threes++;
    else if (p.scoringPlay && mine && p.scoreValue === 2) out.twos++;
    else if (/turnover/.test(t) && !mine) out.turnoversForced++;
    else if (/foul/.test(t) && !/technical/.test(t) && mine) out.fouls++;
  }
  return out;
}
