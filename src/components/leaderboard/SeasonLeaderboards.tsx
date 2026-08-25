import { useState, useEffect } from 'react';
import { Crown, Trophy, Flame } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardCard } from '../ui/DashboardCard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeasonLeaderRow {
  user_id: string;
  username: string;
  points: number;
  hot_streak_active: boolean;
}

interface LastGameRow {
  user_id: string;
  username: string;
  total_game_points: number;
  rank: number | null;
  hot_streak_active: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-3.5 h-3.5 text-yellow-400 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" />;
  if (rank === 2) return <Crown className="w-3.5 h-3.5 text-slate-400" />;
  if (rank === 3) return <Crown className="w-3.5 h-3.5 text-amber-600" />;
  return null;
}

function rankClass(rank: number) {
  if (rank <= 3) return 'text-vgd-orange font-black';
  return 'text-white/40 font-bold';
}

function rowBg(rank: number) {
  if (rank === 1) return 'bg-yellow-500/5 border border-yellow-500/15';
  if (rank === 2) return 'bg-slate-400/5 border border-slate-400/15';
  if (rank === 3) return 'bg-amber-700/5 border border-amber-700/15';
  return 'border border-white/[0.04]';
}

function LeaderRow({ rank, username, points, hotStreak }: {
  rank: number;
  username: string;
  points: number;
  hotStreak: boolean;
}) {
  const icon = rankIcon(rank);

  return (
    <div className={`grid grid-cols-[22px_1fr_auto] items-center gap-x-2 px-3 py-2 rounded-lg ${rowBg(rank)}`}>
      {/* Rank */}
      <div className="flex items-center justify-end">
        {icon ?? (
          <span className={`text-xs ${rankClass(rank)}`}>#{rank}</span>
        )}
      </div>
      {/* Username */}
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-xs font-semibold text-white/90 truncate">{username}</span>
        {hotStreak && (
          <Flame className="w-3 h-3 text-vgd-orange flex-shrink-0 drop-shadow-[0_0_4px_rgba(255,100,0,0.6)]" />
        )}
      </div>
      {/* Points */}
      <span className="text-xs font-black text-vgd-orange tabular-nums">
        {points.toLocaleString()}
      </span>
    </div>
  );
}

function EmptyLeaderState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
      <Trophy className="w-5 h-5 text-vgd-muted/40" />
      <p className="text-xs text-white/30">{message}</p>
    </div>
  );
}

// ─── Last Game Leaders ────────────────────────────────────────────────────────

export function LastGameLeaders() {
  const [rows, setRows] = useState<LastGameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameLabel, setGameLabel] = useState('');

  useEffect(() => {
    async function load() {
      // Find the most recently calculated game
      const { data: games } = await supabase
        .from('live_games')
        .select('id, home_team, away_team, kickoff_time')
        .eq('status', 'calculated')
        .order('kickoff_time', { ascending: false })
        .limit(1);

      if (!games || games.length === 0) {
        setLoading(false);
        return;
      }

      const game = games[0] as { id: string; home_team: string; away_team: string; kickoff_time: string };
      setGameLabel(`vs ${game.away_team === 'Tennessee' ? game.home_team : game.away_team}`);

      const { data: lb } = await supabase
        .from('game_leaderboard')
        .select('user_id, total_game_points, rank')
        .eq('game_id', game.id)
        .order('rank', { ascending: true })
        .limit(10);

      if (!lb || lb.length === 0) { setLoading(false); return; }

      const userIds = (lb as { user_id: string }[]).map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, hot_streak_active')
        .in('id', userIds);

      const pMap = new Map(
        (profiles ?? []).map((p: { id: string; username: string; hot_streak_active: boolean }) => [p.id, p])
      );

      setRows((lb as { user_id: string; total_game_points: number; rank: number | null }[]).map((r, i) => ({
        user_id: r.user_id,
        username: pMap.get(r.user_id)?.username ?? 'Unknown',
        total_game_points: r.total_game_points,
        rank: r.rank ?? i + 1,
        hot_streak_active: pMap.get(r.user_id)?.hot_streak_active ?? false,
      })));
      setLoading(false);
    }
    load();
  }, []);

  return (
    <DashboardCard
      title="LAST GAME LEADERS"
      metadataTag={
        gameLabel ? (
          <span className="text-[10px] text-vgd-muted uppercase tracking-wide">{gameLabel}</span>
        ) : undefined
      }
    >
      <div className="p-3 space-y-1.5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 rounded-lg bg-white/[0.03] animate-pulse" />
          ))
        ) : rows.length === 0 ? (
          <EmptyLeaderState message="No completed games yet this season." />
        ) : (
          rows.map((r, i) => (
            <LeaderRow
              key={r.user_id}
              rank={r.rank ?? i + 1}
              username={r.username}
              points={r.total_game_points}
              hotStreak={r.hot_streak_active}
            />
          ))
        )}
      </div>
    </DashboardCard>
  );
}

// ─── Season Leaders — Football ────────────────────────────────────────────────

export function SeasonLeadersFootball() {
  const [rows, setRows] = useState<SeasonLeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, username, points_football, hot_streak_active')
      .order('points_football', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setRows(
          ((data ?? []) as { id: string; username: string; points_football: number; hot_streak_active: boolean }[])
            .filter(p => p.points_football > 0)
            .map(p => ({
              user_id: p.id,
              username: p.username,
              points: p.points_football,
              hot_streak_active: p.hot_streak_active,
            }))
        );
        setLoading(false);
      });
  }, []);

  const year = new Date().getFullYear();

  return (
    <DashboardCard
      title="SEASON LEADERS — FOOTBALL"
      metadataTag={<span className="text-[10px] text-vgd-muted">{year}</span>}
    >
      <div className="p-3 space-y-1.5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 rounded-lg bg-white/[0.03] animate-pulse" />
          ))
        ) : rows.length === 0 ? (
          <EmptyLeaderState message="No picks recorded this season yet." />
        ) : (
          rows.map((r, i) => (
            <LeaderRow
              key={r.user_id}
              rank={i + 1}
              username={r.username}
              points={r.points}
              hotStreak={r.hot_streak_active}
            />
          ))
        )}
      </div>
    </DashboardCard>
  );
}

// ─── All-Sport Leaders ────────────────────────────────────────────────────────

export function AllSportLeaders() {
  const [rows, setRows] = useState<SeasonLeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, username, total_points, hot_streak_active')
      .order('total_points', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setRows(
          ((data ?? []) as { id: string; username: string; total_points: number; hot_streak_active: boolean }[])
            .filter(p => p.total_points > 0)
            .map(p => ({
              user_id: p.id,
              username: p.username,
              points: p.total_points,
              hot_streak_active: p.hot_streak_active,
            }))
        );
        setLoading(false);
      });
  }, []);

  return (
    <DashboardCard
      title="ALL-SPORT LEADERS"
      metadataTag={<span className="text-[10px] text-vgd-muted">TOP 10</span>}
    >
      <div className="p-3 space-y-1.5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 rounded-lg bg-white/[0.03] animate-pulse" />
          ))
        ) : rows.length === 0 ? (
          <EmptyLeaderState message="No points recorded yet — be the first!" />
        ) : (
          rows.map((r, i) => (
            <LeaderRow
              key={r.user_id}
              rank={i + 1}
              username={r.username}
              points={r.points}
              hotStreak={r.hot_streak_active}
            />
          ))
        )}
      </div>
    </DashboardCard>
  );
}
