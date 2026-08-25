import { useState, useEffect, useRef } from 'react';
import { Crown, TrendingUp, TrendingDown, Minus, Flame } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { DashboardCard } from '../ui/DashboardCard';
import type { LiveGame } from '../game/LiveGameStatsPanel';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaderboardRow {
  user_id: string;
  username: string;
  rank_position: number;
  total_points: number;
  drive_correct: number;
  drive_total: number;
  hot_streak_active: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Odometer: animates a number from old to new value
function useOdometer(target: number, duration = 600) {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const rafRef  = useRef<number>(0);

  useEffect(() => {
    const start = prevRef.current;
    if (start === target) return;
    const startTime = performance.now();
    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (target - start) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
      else prevRef.current = target;
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

// OdometerCell wraps the hook for each row
function AnimatedPoints({ pts }: { pts: number }) {
  const displayed = useOdometer(pts);
  return <>{displayed.toLocaleString()}</>;
}

// Movement arrow — fades after 10 seconds
function MovementArrow({ delta }: { delta: number }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const id = setTimeout(() => setVisible(false), 10_000);
    return () => clearTimeout(id);
  }, [delta]);

  if (!visible || delta === 0) return <Minus className="w-3 h-3 text-white/20" />;
  if (delta > 0) return <TrendingUp className="w-3 h-3 text-green-400" />;
  return <TrendingDown className="w-3 h-3 text-vgd-red" />;
}

// Tier styling
function tierStyle(rank: number): {
  rowClass: string;
  rankClass: string;
  icon: React.ReactNode | null;
} {
  if (rank === 1) return {
    rowClass: 'bg-yellow-500/5 border-yellow-500/20',
    rankClass: 'text-yellow-400',
    icon: <Crown className="w-3.5 h-3.5 text-yellow-400 drop-shadow-[0_0_6px_rgba(234,179,8,0.6)]" />,
  };
  if (rank === 2) return {
    rowClass: 'bg-slate-400/5 border-slate-400/20',
    rankClass: 'text-slate-300',
    icon: <Crown className="w-3.5 h-3.5 text-slate-400" />,
  };
  if (rank === 3) return {
    rowClass: 'bg-amber-700/5 border-amber-700/20',
    rankClass: 'text-amber-600',
    icon: <Crown className="w-3.5 h-3.5 text-amber-600" />,
  };
  if (rank <= 5) return {
    rowClass: 'border-white/[0.05]',
    rankClass: 'text-vgd-orange',
    icon: <span className="w-3.5 h-3.5 rounded-full bg-vgd-orange/30 border border-vgd-orange/40 inline-block" />,
  };
  return {
    rowClass: 'border-white/[0.04]',
    rankClass: 'text-white/40',
    icon: null,
  };
}

// ─── Row component ─────────────────────────────────────────────────────────────

function LeaderRow({
  row,
  prevRank,
  isMe,
  isPinned,
}: {
  row: LeaderboardRow;
  prevRank: number | undefined;
  isMe: boolean;
  isPinned: boolean;
}) {
  const { rowClass, rankClass, icon } = tierStyle(row.rank_position);
  const delta = prevRank !== undefined ? prevRank - row.rank_position : 0;

  return (
    <div
      className={`grid grid-cols-[28px_16px_1fr_auto_20px] items-center gap-x-2 px-3 py-2 rounded-lg border transition-colors ${
        isPinned
          ? 'bg-vgd-orange/10 border-vgd-orange/25'
          : isMe
          ? 'bg-vgd-orange/10 border-vgd-orange/25'
          : rowClass + ' border'
      }`}
    >
      {/* Rank */}
      <span className={`text-xs font-black text-right ${rankClass}`}>
        {icon ? (
          <span className="flex items-center justify-end gap-0.5">{icon}</span>
        ) : (
          `#${row.rank_position}`
        )}
      </span>

      {/* Movement */}
      <MovementArrow delta={delta} />

      {/* Username */}
      <div className="flex items-center gap-1 min-w-0">
        <span className={`text-xs font-semibold truncate ${isMe ? 'text-vgd-orange' : 'text-white/90'}`}>
          {row.username}
        </span>
        {row.hot_streak_active && (
          <Flame className="w-3 h-3 text-vgd-orange flex-shrink-0 drop-shadow-[0_0_4px_rgba(255,100,0,0.7)]" />
        )}
        {isPinned && !isMe && (
          <span className="text-[9px] text-vgd-muted">(you)</span>
        )}
      </div>

      {/* Points */}
      <span className={`text-xs font-black tabular-nums ${isMe || isPinned ? 'text-vgd-orange' : 'text-white/80'}`}>
        <AnimatedPoints pts={row.total_points} />
      </span>

      {/* Accuracy */}
      <span className="text-[9px] text-white/30 text-right tabular-nums">
        {row.drive_total > 0 ? `${row.drive_correct}/${row.drive_total}` : '—'}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props { game: LiveGame | null }

export function GameLeaderboard({ game }: Props) {
  const { session, profile } = useAuth();

  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [myRow, setMyRow] = useState<LeaderboardRow | null>(null);
  const [loading, setLoading] = useState(true);
  const prevRanksRef = useRef<Map<string, number>>(new Map());

  // Non-gameday waiting state
  if (!game) {
    return (
      <DashboardCard
        title="GAME LEADERBOARD"
        metadataTag={
          <span className="text-[10px] text-white/30 font-medium uppercase tracking-wider">WAITING</span>
        }
        className="h-full"
      >
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-4">
          <p className="text-xs text-vgd-muted">No active game leaderboard.</p>
          <p className="text-[10px] text-white/30">Leaderboard populates at kickoff.</p>
        </div>
      </DashboardCard>
    );
  }

  async function fetchLeaderboard() {
    const { data } = await supabase
      .from('game_leaderboard')
      .select(
        'user_id, rank_position, total_points, drive_correct, drive_total'
      )
      .eq('game_id', game.id)
      .order('rank_position', { ascending: true })
      .limit(10);

    if (!data) return;

    // Fetch usernames and streak status from profiles
    const userIds = (data as { user_id: string }[]).map(r => r.user_id);
    const { data: profiles } = userIds.length
      ? await supabase
          .from('profiles')
          .select('id, username, hot_streak_active')
          .in('id', userIds)
      : { data: [] };

    const profileMap = new Map(
      (profiles ?? []).map((p: { id: string; username: string; hot_streak_active: boolean }) => [p.id, p])
    );

    const enriched: LeaderboardRow[] = (data as {
      user_id: string;
      rank_position: number;
      total_points: number;
      drive_correct: number;
      drive_total: number;
    }[]).map(r => ({
      ...r,
      username: profileMap.get(r.user_id)?.username ?? 'Unknown',
      hot_streak_active: profileMap.get(r.user_id)?.hot_streak_active ?? false,
    }));

    setRows(enriched);
    setLoading(false);

    // Check if current user is in top 10
    const meInTop = session
      ? enriched.find(r => r.user_id === session.user.id) ?? null
      : null;

    if (session && !meInTop) {
      // Fetch user's own row
      const { data: myData } = await supabase
        .from('game_leaderboard')
        .select('user_id, rank_position, total_points, drive_correct, drive_total')
        .eq('game_id', game.id)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (myData) {
        const p = profileMap.get(session.user.id) ?? { username: profile?.username ?? 'You', hot_streak_active: false };
        setMyRow({
          ...(myData as { user_id: string; rank_position: number; total_points: number; drive_correct: number; drive_total: number }),
          username: p.username,
          hot_streak_active: p.hot_streak_active,
        });
      }
    } else {
      setMyRow(null);
    }
  }

  // Initial fetch + Realtime subscription
  useEffect(() => {
    fetchLeaderboard();

    const channel = supabase
      .channel(`leaderboard:${game.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_leaderboard',
          filter: `game_id=eq.${game.id}`,
        },
        () => {
          // Store prev ranks before update
          const prev = new Map<string, number>();
          rows.forEach(r => prev.set(r.user_id, r.rank_position));
          prevRanksRef.current = prev;
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [game.id, session?.user.id]);

  const myUserId = session?.user.id;
  const topUserIds = new Set(rows.map(r => r.user_id));
  const myRowIsInTop = myUserId ? topUserIds.has(myUserId) : false;

  return (
    <DashboardCard
      title="GAME LEADERBOARD"
      metadataTag={
        <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">
          {game.status === 'live' ? 'LIVE' : game.status === 'final' || game.status === 'calculated' ? 'FINAL' : 'PREGAME'}
        </span>
      }
      className="h-full"
    >
      <div className="p-3 space-y-1.5">
        {loading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <p className="text-xs text-vgd-muted">No picks submitted yet.</p>
            <p className="text-[10px] text-white/30">Be the first on the board!</p>
          </div>
        ) : (
          <>
            {/* Header labels */}
            <div className="grid grid-cols-[28px_16px_1fr_auto_20px] gap-x-2 px-3 pb-0.5">
              <span className="text-[9px] text-white/25 text-right">#</span>
              <span />
              <span className="text-[9px] text-white/25">PLAYER</span>
              <span className="text-[9px] text-white/25 text-right">PTS</span>
              <span className="text-[9px] text-white/25 text-right">ACC</span>
            </div>

            {rows.map(row => (
              <LeaderRow
                key={row.user_id}
                row={row}
                prevRank={prevRanksRef.current.get(row.user_id)}
                isMe={row.user_id === myUserId}
                isPinned={false}
              />
            ))}

            {/* Pinned user row (outside top 10) */}
            {!myRowIsInTop && myRow && (
              <>
                <div className="flex items-center gap-2 my-1 px-1">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-[9px] text-white/25">YOU</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>
                <LeaderRow
                  row={myRow}
                  prevRank={prevRanksRef.current.get(myRow.user_id)}
                  isMe={true}
                  isPinned={true}
                />
              </>
            )}
          </>
        )}
      </div>
    </DashboardCard>
  );
}
