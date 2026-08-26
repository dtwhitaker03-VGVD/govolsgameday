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
  home_score: number;
  away_score: number;
  home_total_yards: number | null;
  away_total_yards: number | null;
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

function yardlineStr(yardline: number | null, possession: string | null, homeTeam: string): string {
  if (!yardline || !possession) return '';
  const side = possession === homeTeam ? 'own' : 'opp';
  return `${side} ${yardline}`;
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

  const isTennesseeHome = game.home_team === 'Tennessee';
  const tnScore = isTennesseeHome ? game.home_score : game.away_score;
  const oppScore = isTennesseeHome ? game.away_score : game.home_score;
  const oppName = isTennesseeHome ? game.away_team : game.home_team;
  const tnYards = isTennesseeHome ? game.home_total_yards : game.away_total_yards;
  const oppYards = isTennesseeHome ? game.away_total_yards : game.home_total_yards;

  const isLive = game.status === 'live';
  const isFinal = game.status === 'final' || game.status === 'calculated';

  const statusLabel = isLive
    ? `${quarterLabel(game.current_quarter)} ${game.game_clock ?? ''}`
    : isFinal
    ? 'FINAL'
    : 'PREGAME';

  const downDistanceStr =
    game.down && game.distance
      ? `${ordinal(game.down)} & ${game.distance} — ${yardlineStr(game.yardline, game.possession, game.home_team)}`
      : null;

  const statRows: TeamStatRow[] = [
    { label: 'Total Yards', homeVal: tnYards ?? '—', awayVal: oppYards ?? '—' },
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
      <div className="px-4 py-4 space-y-4">
        {/* Scoreboard strip */}
        <div className="bg-vgd-bg rounded-lg p-3">
          <div className="flex items-center justify-between gap-2">
            {/* Tennessee */}
            <div className="flex flex-col items-center gap-0.5 flex-1">
              <div className="w-9 h-9 rounded-full bg-vgd-orange/20 flex items-center justify-center">
                <span className="text-vgd-orange font-black text-xs">TN</span>
              </div>
              <span className="text-white font-black text-3xl leading-none">{tnScore}</span>
              <span className="text-xs text-white/60">Tennessee</span>
            </div>

            {/* Clock / status */}
            <div className="flex flex-col items-center gap-1">
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  isLive ? 'text-vgd-orange' : 'text-vgd-muted'
                }`}
              >
                {statusLabel}
              </span>
              {isLive && game.possession && (
                <span className="text-[10px] text-white/40">
                  {game.possession === game.home_team ? '◀' : '▶'} Possession
                </span>
              )}
            </div>

            {/* Opponent */}
            <div className="flex flex-col items-center gap-0.5 flex-1">
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-white/70 font-black text-xs">
                  {oppName.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <span className="text-white font-black text-3xl leading-none">{oppScore}</span>
              <span className="text-xs text-white/60">{oppName}</span>
            </div>
          </div>
        </div>

        {/* Down / distance */}
        {downDistanceStr && (
          <p className="text-center text-xs text-white/70 font-semibold">
            {downDistanceStr}
          </p>
        )}

        {/* Team stat rows */}
        <div className="space-y-0">
          <div className="grid grid-cols-[1fr_auto_1fr] text-[10px] text-vgd-muted uppercase tracking-wider pb-1 border-b border-white/[0.06]">
            <span className="text-right">TN</span>
            <span className="text-center w-28">Stat</span>
            <span className="text-left">{oppName.split(' ')[0]}</span>
          </div>
          {statRows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[1fr_auto_1fr] items-center py-1.5 border-b border-white/[0.04] last:border-0"
            >
              <span className="text-white text-sm font-semibold text-right">{row.homeVal}</span>
              <span className="text-[10px] text-vgd-muted w-28 text-center">{row.label}</span>
              <span
                className={`text-sm font-semibold text-left ${
                  row.danger && Number(row.awayVal) > 0 ? 'text-vgd-red' : 'text-white'
                }`}
              >
                {row.awayVal}
              </span>
            </div>
          ))}
        </div>

        <p className="text-center text-[10px] text-vgd-muted/50">
          Full game stats • play-by-play coming in next build
        </p>
      </div>
    </DashboardCard>
  );
}
