// Pure stretch planning for the basketball live predictor — no I/O, so it can be
// replayed against saved ESPN play-by-play.
//
// A "stretch" is the play between two boundaries. Boundaries are the start of
// the game, every official TV timeout (ESPN type OfficialTVTimeOut), and the end
// of each period. Team timeouts (ShortTimeOut, e.g. "Wofford Timeout") are NOT
// boundaries: ESPN reliably posts the TV timeouts, and cutting at a team timeout
// opened a pick window mid-stretch. Stretch n runs from boundary n-1 to boundary n.
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

  for (const p of plays.slice(1)) {
    const last = out[out.length - 1];
    if (isTerminal(last, mode)) break;
    if (isLivePlay(p)) {
      last.resumed = true;
      continue;
    }
    const t = (p.type?.text ?? "").toLowerCase();
    const kind: BoundaryKind | null =
      mode === "quarter" && (t === "officialtvtimeout" || t === "shorttimeout") ? null :
      t === "officialtvtimeout" ? "tv" :
      t === "end period" ? "period" :
      t === "end game" ? "end" : null;
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
