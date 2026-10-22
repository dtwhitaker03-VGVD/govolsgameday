// Pure stretch planning for the basketball live predictor — no I/O, so it can be
// replayed against saved ESPN play-by-play.
//
// A "stretch" is the play between two boundaries. Boundaries are the start of
// the game, every official TV timeout, a team timeout that comes at least
// SHORT_TIMEOUT_MIN_SECONDS of game clock after the previous boundary (so a
// team timeout right next to a TV timeout doesn't cut a stretch to nothing),
// and the end of each period. Stretch n runs from boundary n-1 to boundary n,
// and is scored on who outscored whom between the two.

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

export const SHORT_TIMEOUT_MIN_SECONDS = 180;
const PERIOD_SECONDS = 1200; // men's college: two 20-minute halves
const OT_SECONDS = 300;

const NOT_PLAY = new Set([
  "jumpball", "substitution", "officialtvtimeout", "shorttimeout", "end period", "end game",
  "dead ball rebound",
]);

export function isLivePlay(p: BbPlay): boolean {
  const t = (p.type?.text ?? "").toLowerCase();
  if (NOT_PLAY.has(t)) return false;
  if (/challenge|review|timeout|technical/.test(t)) return false;
  return true;
}

function clockSeconds(display: string | undefined): number {
  const m = /^(\d+):(\d{2})/.exec(display ?? "");
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
}

/** Game seconds elapsed at a given period/clock. */
function elapsed(period: number, clock: string | undefined): number {
  const remaining = clockSeconds(clock);
  if (period <= 2) return (period - 1) * PERIOD_SECONDS + (PERIOD_SECONDS - remaining);
  return 2 * PERIOD_SECONDS + (period - 3) * OT_SECONDS + (OT_SECONDS - remaining);
}

/** The game cannot go on after this boundary. */
export function isTerminal(b: Boundary): boolean {
  return b.kind === "end" || (b.kind === "period" && b.period >= 2 && b.home !== b.away);
}

export function planBoundaries(plays: BbPlay[]): Boundary[] {
  const out: Boundary[] = [];
  if (plays.length === 0) return out;
  const first = plays[0];
  out.push({
    playId: first.id, kind: "start", period: first.period?.number ?? 1,
    clock: first.clock?.displayValue ?? "20:00", home: 0, away: 0, resumed: false,
  });

  for (const p of plays.slice(1)) {
    const last = out[out.length - 1];
    if (isTerminal(last)) break;
    if (isLivePlay(p)) {
      last.resumed = true;
      continue;
    }
    const t = (p.type?.text ?? "").toLowerCase();
    const kind: BoundaryKind | null =
      t === "officialtvtimeout" ? "tv" :
      t === "shorttimeout" ? "short" :
      t === "end period" ? "period" :
      t === "end game" ? "end" : null;
    if (!kind) continue;

    const period = p.period?.number ?? last.period;
    const clock = p.clock?.displayValue ?? last.clock;
    if (kind === "short" && elapsed(period, clock) - elapsed(last.period, last.clock) < SHORT_TIMEOUT_MIN_SECONDS) continue;
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
