import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardCard } from '../ui/DashboardCard';

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

// ─── Component ───────────────────────────────────────────────────────────────

interface LiveGameStatsPanelProps {
  initialGame: LiveGame;
}

export function LiveGameStatsPanel({ initialGame }: LiveGameStatsPanelProps) {
  const [game, setGame] = useState<LiveGame>(initialGame);

  // When the parent resolves a different active game, sync local state so this
  // component doesn't stay frozen on the old game after an admin creates a new one.
  useEffect(() => {
    setGame(initialGame);
  }, [initialGame.id]);

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

  const statRows: TeamStatRow[] = [
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

  return (
    <DashboardCard title="LIVE GAME STATS" metadataTag={metaTag} className="w-full h-[220px] lg:h-[320px]">
      <div className="px-3 py-1.5 flex-1 flex flex-col min-h-0 gap-1">
        {/* Scoreboard strip */}
        <div className="bg-vgd-bg rounded-lg px-2.5 py-1 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            {/* Home team */}
            <div className="flex flex-col items-center gap-0 flex-1 min-w-0">
              <span className="text-white font-black text-xl leading-none">{tnScore}</span>
              <span className="text-[9px] text-white/60 truncate max-w-full">{game.home_team}</span>
            </div>

            {/* Quarter / clock / down-distance — quarter and clock are
                deliberately styled differently (chip vs. plain digits) so
                they read as two distinct facts, not one run-on string.
                Possession is folded into the down-distance line instead
                of its own row, to keep this column to two lines. */}
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
              <div className="flex items-center gap-1">
                {isLive ? (
                  <>
                    <span className="px-1.5 py-[1px] rounded bg-vgd-orange/15 text-vgd-orange text-[9px] font-black uppercase tracking-wide">
                      {quarterLabel(game.current_quarter)}
                    </span>
                    <span className="text-white font-bold text-xs tabular-nums">{game.game_clock}</span>
                  </>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-vgd-muted">{statusLabel}</span>
                )}
              </div>
              {(downDistanceStr || (isLive && game.possession)) && (
                <span className="text-[9px] text-white/50 font-semibold whitespace-nowrap">
                  {isLive && game.possession && (game.possession === game.home_team ? '◀ ' : '▶ ')}
                  {downDistanceStr}
                </span>
              )}
            </div>

            {/* Opponent */}
            <div className="flex flex-col items-center gap-0 flex-1 min-w-0">
              <span className="text-white font-black text-xl leading-none">{oppScore}</span>
              <span className="text-[9px] text-white/60 truncate max-w-full">{oppName}</span>
            </div>
          </div>
        </div>

        {/* Team stat rows */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="grid grid-cols-[1fr_auto_1fr] text-[9px] text-vgd-muted uppercase tracking-wider pb-0.5 border-b border-white/[0.06] flex-shrink-0">
            <span className="text-right">{game.home_team.split(' ')[0]}</span>
            <span className="text-center w-24">Stat</span>
            <span className="text-left">{oppName.split(' ')[0]}</span>
          </div>
          {statRows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[1fr_auto_1fr] items-center leading-tight py-[3px] border-b border-white/[0.04] last:border-0"
            >
              <span
                className={`text-[11px] font-semibold text-right ${
                  row.danger && Number(row.homeVal) > 0 ? 'text-vgd-red' : 'text-white'
                }`}
              >
                {row.homeVal}
              </span>
              <span className="text-[9px] text-vgd-muted w-24 text-center">{row.label}</span>
              <span
                className={`text-[11px] font-semibold text-left ${
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
  );
}
