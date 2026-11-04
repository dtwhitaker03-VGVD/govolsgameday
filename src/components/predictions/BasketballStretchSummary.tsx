import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { LiveGame } from '../game/LiveGameStatsPanel';

// Post-game breakdown of the live stretch (men's) / quarter (women's) picks: for each
// one, the user's picks next to what actually happened and the points earned.

interface Win {
  window_number: number;
  period: number | null;
  game_clock: string | null;
  actual_tn_pts: number | null;
  actual_threes: number | null;
  actual_twos: number | null;
  actual_turnovers_forced: number | null;
  actual_fouls: number | null;
}
interface MyPick {
  window_number: number;
  pick_pts: number | null;
  pick_threes: number | null;
  pick_twos: number | null;
  pick_turnovers: number | null;
  pick_fouls: number | null;
  points_earned: number | null;
  breakdown: Record<string, number> | null;
}

function periodLabel(p: number | null, quarters: boolean): string {
  if (!p) return '';
  if (quarters) return p <= 4 ? `Q${p}` : `OT${p > 5 ? p - 4 : ''}`;
  return p === 1 ? '1st half' : p === 2 ? '2nd half' : `OT${p > 3 ? p - 2 : ''}`;
}

export function BasketballStretchSummary({ game, pregamePoints }: { game: LiveGame; pregamePoints: number | null }) {
  const { session } = useAuth();
  const quarters = game.sport === 'womens_basketball';
  const [wins, setWins] = useState<Win[]>([]);
  const [picks, setPicks] = useState<Map<number, MyPick>>(new Map());

  useEffect(() => {
    if (!session) return;
    supabase
      .from('live_windows')
      .select('window_number, period, game_clock, actual_tn_pts, actual_threes, actual_twos, actual_turnovers_forced, actual_fouls')
      .eq('game_id', game.id)
      .eq('status', 'resolved')
      .gt('window_number', 0)
      .order('window_number', { ascending: true })
      .then(({ data }) => setWins((data as unknown as Win[]) ?? []));
    supabase
      .from('live_window_predictions')
      .select('window_number, pick_pts, pick_threes, pick_twos, pick_turnovers, pick_fouls, points_earned, breakdown')
      .eq('game_id', game.id)
      .eq('user_id', session.user.id)
      .eq('status', 'resolved')
      .then(({ data }) => setPicks(new Map(((data as unknown as MyPick[]) ?? []).map((p) => [p.window_number, p]))));
  }, [session, game.id]);

  const mine = wins.filter((w) => picks.has(w.window_number));
  if (!session || mine.length === 0) return null;

  const liveTotal = mine.reduce((sum, w) => sum + (picks.get(w.window_number)?.points_earned ?? 0), 0);
  // A stretch ends where the next one began (0:00 when the period ended).
  const span = (w: Win) => {
    const next = wins.find((x) => x.window_number === w.window_number + 1);
    const end = next && next.period === w.period ? next.game_clock : '0:00';
    return `${periodLabel(w.period, quarters)} ${w.game_clock ?? ''}${end ? `–${end}` : ''}`.trim();
  };

  return (
    <div className="mt-3 pt-2 border-t border-white/[0.07]">
      <div className="text-[10px] font-bold uppercase tracking-wider text-white/60 pb-1">
        {quarters ? 'Live quarters' : 'Live stretches'} · points earned
      </div>
      {mine.map((w) => {
        const pts = picks.get(w.window_number)?.points_earned ?? 0;
        return (
          <div key={w.window_number} className="flex items-center justify-between text-xs py-1 border-b border-white/[0.05]">
            <span className="text-white/70">
              <span className="font-bold text-white">{wins.indexOf(w) + 1}</span> · {span(w)}
            </span>
            <span className={`font-bold tabular-nums ${pts > 0 ? 'text-green-400' : 'text-vgd-red'}`}>+{pts}</span>
          </div>
        );
      })}
      <div className="flex justify-between text-xs font-bold pt-1.5">
        <span className="text-white">{quarters ? 'Live quarters' : 'Live stretches'} total</span>
        <span className="text-vgd-orange">{liveTotal} pts</span>
      </div>
      {pregamePoints != null && (
        <div className="flex justify-between text-sm font-black pt-1">
          <span className="text-white">Game total</span>
          <span className="text-vgd-orange">{pregamePoints + liveTotal} pts</span>
        </div>
      )}
    </div>
  );
}
