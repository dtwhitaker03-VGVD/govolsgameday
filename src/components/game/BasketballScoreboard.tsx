import { DashboardCard } from '../ui/DashboardCard';
import type { LiveGame } from './LiveGameStatsPanel';

// Men's basketball scoreboard: score, period/clock and ESPN team box score
// (live_games.bb_stats, refreshed every 15s by live-espn-sync-bb).

const ROWS: { label: string; key: string }[] = [
  { label: 'FG', key: 'fieldGoalsMade-fieldGoalsAttempted' },
  { label: '3PT', key: 'threePointFieldGoalsMade-threePointFieldGoalsAttempted' },
  { label: 'FT', key: 'freeThrowsMade-freeThrowsAttempted' },
  { label: 'Rebounds', key: 'totalRebounds' },
  { label: 'Assists', key: 'assists' },
  { label: 'Steals', key: 'steals' },
  { label: 'Blocks', key: 'blocks' },
  { label: 'Turnovers', key: 'turnovers' },
  { label: 'Fouls', key: 'fouls' },
  { label: 'Pts in paint', key: 'pointsInPaint' },
];

function periodLabel(p: number | null): string {
  if (!p) return '';
  return p === 1 ? '1st half' : p === 2 ? '2nd half' : `OT${p > 3 ? p - 2 : ''}`;
}

export function BasketballScoreboard({ game }: { game: LiveGame }) {
  const started = game.status !== 'pregame';
  const stats = game.bb_stats;
  const tip = new Date(game.kickoff_time).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short',
  });
  const status = game.status === 'live'
    ? stats?.detail || `${periodLabel(game.current_quarter)} ${game.game_clock ?? ''}`
    : started ? 'FINAL' : tip;

  return (
    <DashboardCard
      title="🏀 SCOREBOARD"
      metadataTag={<span className="text-[10px] font-bold uppercase tracking-wider text-white">{status}</span>}
      statusDotColor={game.status === 'live' ? '#22c55e' : '#FF8200'}
      className="h-full"
    >
      <div className="p-4 space-y-3 overflow-y-auto">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center text-center gap-2">
          <span className="text-sm font-bold text-white">{game.away_team}</span>
          <span className="text-3xl font-black text-white tabular-nums">
            {started ? `${game.away_score} – ${game.home_score}` : 'vs'}
          </span>
          <span className="text-sm font-bold text-white">{game.home_team}</span>
        </div>

        {!started && (game.spread_line_tn != null || game.total_points_line != null) && (
          <p className="text-center text-[11px] text-white/70">
            {game.spread_line_tn != null && <>Tennessee {game.spread_line_tn > 0 ? '+' : ''}{game.spread_line_tn}</>}
            {game.spread_line_tn != null && game.total_points_line != null && ' · '}
            {game.total_points_line != null && <>O/U {game.total_points_line}</>}
          </p>
        )}

        {started && stats && (
          <div className="space-y-1">
            {ROWS.filter((r) => stats.home?.[r.key] != null || stats.away?.[r.key] != null).map((r) => (
              <div key={r.key} className="grid grid-cols-[1fr_auto_1fr] text-xs text-white py-1 border-b border-white/[0.05] tabular-nums">
                <span className="text-left font-semibold">{stats.away?.[r.key] ?? '–'}</span>
                <span className="text-white/50 text-[10px] uppercase tracking-wider px-3">{r.label}</span>
                <span className="text-right font-semibold">{stats.home?.[r.key] ?? '–'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
