import { useState, useEffect } from 'react';
import { Zap, Newspaper } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardCard } from '../ui/DashboardCard';
import { GamePreviewModal } from './GamePreviewModal';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LiveGame {
  id: string;
  cfbd_game_id: number;
  home_team: string;
  away_team: string;
  kickoff_time: string;
  status: string;
  updated_at?: string;
  home_score: number;
  away_score: number;
  home_total_yards: number | null;
  away_total_yards: number | null;
  home_rushing_yards: number | null;
  away_rushing_yards: number | null;
  home_passing_yards: number | null;
  away_passing_yards: number | null;
  home_turnovers: number | null;
  away_turnovers: number | null;
  home_timeouts_remaining: number | null;
  away_timeouts_remaining: number | null;
  current_quarter: number | null;
  game_clock: string | null;
  possession: string | null;
  down: number | null;
  distance: number | null;
  yardline: number | null;
  spread_line_tn: number | null;
  total_points_line: number | null;
  lines_captured_at: string | null;
  tn_rushing_tds: number | null;
  tn_receiving_tds: number | null;
  tn_turnovers_forced: number | null;
}

interface TeamStatRow {
  label: string;
  homeVal: string | number | null;
  awayVal: string | number | null;
  danger?: boolean; // bold red if awayVal (opponent) > 0
}

// One row per (team, stat_type) from ncaa_scoring_rankings — see
// scoring-rankings-sync, which syncs NCAA.com's Scoring Offense/Defense
// team stat pages daily.
interface ScoringStat {
  team: string;
  stat_type: 'offense' | 'defense';
  points_per_game: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function quarterLabel(q: number | null): string {
  if (!q) return '';
  if (q <= 4) return `Q${q}`;
  return 'OT';
}

function ordinal(n: number | null): string {
  if (!n) return '';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

// yardline is stored as 0-100 "progress toward the opponent's goal line"
// (see live-cfbd-sync / open_drive_window), so own-vs-opp is purely a
// function of which half of the field it's on — not of who has the ball
// or which team is home. <=50 is still the offense's own side; >50 is
// past midfield, described as yards from the opponent's goal line.
function yardlineStr(yardline: number | null): string {
  if (yardline === null) return '';
  return yardline <= 50 ? `own ${yardline}` : `opp ${100 - yardline}`;
}

// First-word-of-name (e.g. "Alabama" from "Alabama Crimson Tide") is the
// default short label above the stat rows, but it reads badly for teams
// whose common short form isn't their first word — "Georgia Tech" as just
// "Georgia" gets clipped to "Geor" in that narrow column and misreads as
// the University of Georgia. Known exceptions override the default.
const SHORT_TEAM_NAME: Record<string, string> = {
  'Georgia Tech': 'GT',
};

function shortTeamName(team: string): string {
  return SHORT_TEAM_NAME[team] ?? team.split(' ')[0];
}

// ─── Component ───────────────────────────────────────────────────────────────

interface LiveGameStatsPanelProps {
  initialGame: LiveGame;
}

export function LiveGameStatsPanel({ initialGame }: LiveGameStatsPanelProps) {
  const [game, setGame] = useState<LiveGame>(initialGame);
  const [scoringStats, setScoringStats] = useState<ScoringStat[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // When the parent resolves a different active game, sync local state so this
  // component doesn't stay frozen on the old game after an admin creates a new one.
  useEffect(() => {
    setGame(initialGame);
  }, [initialGame.id]);

  // Each team's season-long national Scoring Offense/Defense (points per
  // game) — context stats, not this-game box score numbers, so they're
  // fetched once per matchup rather than over the live Realtime channel below.
  useEffect(() => {
    const season = new Date().getFullYear();
    supabase
      .from('ncaa_scoring_rankings')
      .select('team, stat_type, points_per_game')
      .eq('season', season)
      .in('team', [initialGame.home_team, initialGame.away_team])
      .then(({ data }) => setScoringStats((data as ScoringStat[]) ?? []));
  }, [initialGame.home_team, initialGame.away_team]);

  // Subscribe to Realtime updates for this specific game row.
  // Dependency on game.id means the channel automatically re-attaches when the
  // active game switches (triggered by the effect above).
  useEffect(() => {
    const channel = supabase
      .channel(`live_game:${game.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_games',
          filter: `id=eq.${game.id}`,
        },
        (payload) => {
          setGame((prev) => ({ ...prev, ...(payload.new as LiveGame) }));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [game.id]);

  // Home/away, shown generically — not assumed to be Tennessee.
  const tnScore = game.home_score;
  const oppScore = game.away_score;
  const oppName = game.away_team;
  const tnYards = game.home_total_yards;
  const oppYards = game.away_total_yards;

  const isLive = game.status === 'live';
  const isFinal = game.status === 'final' || game.status === 'calculated';

  const statusLabel = isLive
    ? `${quarterLabel(game.current_quarter)} ${game.game_clock ?? ''}`
    : isFinal
    ? 'FINAL'
    : 'PREGAME';

  const downDistanceStr =
    game.down && game.distance
      ? `${ordinal(game.down)} & ${game.distance} — ${yardlineStr(game.yardline)}`
      : null;

  // Each team's own season scoring numbers — Scoring Offense shows a team's
  // own points-per-game, Scoring Defense shows its own points-allowed-per-
  // game, same "each side shows its own stat" shape as Rushing/Passing Yards.
  const findScoringStat = (team: string, statType: 'offense' | 'defense') =>
    scoringStats.find((s) => s.team === team && s.stat_type === statType)?.points_per_game;
  const homeOffensePpg = findScoringStat(game.home_team, 'offense');
  const awayOffensePpg = findScoringStat(game.away_team, 'offense');
  const homeDefensePpg = findScoringStat(game.home_team, 'defense');
  const awayDefensePpg = findScoringStat(game.away_team, 'defense');

  const statRows: TeamStatRow[] = [
    { label: 'Scoring Offense', homeVal: homeOffensePpg?.toFixed(1) ?? '—', awayVal: awayOffensePpg?.toFixed(1) ?? '—' },
    { label: 'Scoring Defense', homeVal: homeDefensePpg?.toFixed(1) ?? '—', awayVal: awayDefensePpg?.toFixed(1) ?? '—' },
    { label: 'Rushing Yards', homeVal: game.home_rushing_yards ?? '—', awayVal: game.away_rushing_yards ?? '—' },
    { label: 'Passing Yards', homeVal: game.home_passing_yards ?? '—', awayVal: game.away_passing_yards ?? '—' },
    { label: 'Total Yards', homeVal: tnYards ?? '—', awayVal: oppYards ?? '—' },
    { label: 'Turnovers', homeVal: game.home_turnovers ?? '—', awayVal: game.away_turnovers ?? '—', danger: true },
    { label: 'Timeouts Left', homeVal: game.home_timeouts_remaining ?? '—', awayVal: game.away_timeouts_remaining ?? '—' },
  ];

  const metaTag = isLive ? (
    <span className="flex items-center gap-1 text-vgd-orange text-[10px] font-bold uppercase tracking-wider animate-pulse">
      <Zap className="w-3 h-3" />
      LIVE
    </span>
  ) : isFinal ? (
    <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">FINAL</span>
  ) : (
    <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">PREGAME</span>
  );

  const headerExtra = (
    <button
      onClick={() => setShowPreview(true)}
      className="flex items-center gap-1 text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-vgd-muted hover:text-vgd-orange transition-colors border border-white/10 hover:border-vgd-orange/40 rounded px-1.5 py-0.5"
    >
      <Newspaper className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
      Game Preview
    </button>
  );

  return (
    <>
    <DashboardCard title="LIVE GAME STATS" headerExtra={headerExtra} metadataTag={metaTag} className="w-full h-[220px] lg:h-[320px]">
      <div className="px-3 py-1.5 lg:px-4 lg:py-2 flex-1 flex flex-col min-h-0 gap-1 lg:gap-1.5">
        {/* Scoreboard strip */}
        <div className="bg-vgd-bg rounded-lg px-2.5 py-1 lg:px-4 lg:py-1.5 flex-shrink-0">
          <div className="flex items-center justify-between gap-2 lg:gap-3">
            {/* Home team */}
            <div className="flex flex-col items-center gap-0 flex-1 min-w-0">
              <span className="text-white font-black text-xl lg:text-4xl leading-none">{tnScore}</span>
              <span className="text-[9px] lg:text-sm text-white/60 truncate max-w-full">{game.home_team}</span>
            </div>

            {/* Quarter / clock / down-distance — quarter and clock are
                deliberately styled differently (chip vs. plain digits) so
                they read as two distinct facts, not one run-on string.
                Possession is folded into the down-distance line instead
                of its own row, to keep this column to two lines. */}
            <div className="flex flex-col items-center gap-0.5 lg:gap-1 flex-shrink-0">
              <div className="flex items-center gap-1 lg:gap-1.5">
                {isLive ? (
                  <>
                    <span className="px-1.5 py-[1px] lg:px-2 lg:py-0.5 rounded bg-vgd-orange/15 text-vgd-orange text-[9px] lg:text-sm font-black uppercase tracking-wide">
                      {quarterLabel(game.current_quarter)}
                    </span>
                    <span className="text-white font-bold text-xs lg:text-2xl tabular-nums">{game.game_clock}</span>
                  </>
                ) : (
                  <span className="text-[10px] lg:text-sm font-bold uppercase tracking-wider text-vgd-muted">{statusLabel}</span>
                )}
              </div>
              {(downDistanceStr || (isLive && game.possession)) && (
                <span className="text-[9px] lg:text-xs text-white/50 font-semibold whitespace-nowrap">
                  {isLive && game.possession && (game.possession === game.home_team ? '◀ ' : '▶ ')}
                  {downDistanceStr}
                </span>
              )}
            </div>

            {/* Opponent */}
            <div className="flex flex-col items-center gap-0 flex-1 min-w-0">
              <span className="text-white font-black text-xl lg:text-4xl leading-none">{oppScore}</span>
              <span className="text-[9px] lg:text-sm text-white/60 truncate max-w-full">{oppName}</span>
            </div>
          </div>
        </div>

        {/* Team stat rows. justify-content: center (used here previously)
            overflows a too-tall flex child equally upward AND downward
            instead of just downward — with Scoring Offense/Defense added,
            7 rows no longer reliably fit the card's fixed height, and
            centering pushed the top rows up into the scoreboard strip
            above instead of just scrolling (DashboardCard's body already
            provides overflow-y-auto for exactly this case). */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="grid grid-cols-[1fr_auto_1fr] text-[9px] lg:text-xs text-vgd-muted uppercase tracking-wider pb-0.5 lg:pb-1 border-b border-white/[0.06] flex-shrink-0">
            <span className="text-right">{shortTeamName(game.home_team)}</span>
            <span className="text-center w-24 lg:w-32">Stat</span>
            <span className="text-left">{shortTeamName(oppName)}</span>
          </div>
          {statRows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[1fr_auto_1fr] items-center leading-tight py-[3px] lg:py-1 border-b border-white/[0.04] last:border-0"
            >
              <span
                className={`text-[11px] lg:text-base font-semibold text-right ${
                  row.danger && Number(row.homeVal) > 0 ? 'text-vgd-red' : 'text-white'
                }`}
              >
                {row.homeVal}
              </span>
              <span className="text-[9px] lg:text-xs text-vgd-muted w-24 lg:w-32 text-center">{row.label}</span>
              <span
                className={`text-[11px] lg:text-base font-semibold text-left ${
                  row.danger && Number(row.awayVal) > 0 ? 'text-vgd-red' : 'text-white'
                }`}
              >
                {row.awayVal}
              </span>
            </div>
          ))}
        </div>
      </div>
    </DashboardCard>
    {showPreview && <GamePreviewModal gameId={game.id} onClose={() => setShowPreview(false)} />}
    </>
  );
}
