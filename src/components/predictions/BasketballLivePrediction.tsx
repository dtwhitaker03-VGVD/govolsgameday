import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { DashboardCard } from '../ui/DashboardCard';
import type { LiveGame } from '../game/LiveGameStatsPanel';

// Live "stretch" game: pick which team outscores the other from this TV
// timeout to the next. The server (live-espn-sync-bb) opens a window at each
// timeout and locks it when play resumes.

interface Win {
  id: string;
  window_number: number;
  status: 'open' | 'resolved' | 'void';
  window_locked_at: string;
  period: number | null;
  game_clock: string | null;
  start_home_score: number;
  start_away_score: number;
  end_home_score: number | null;
  end_away_score: number | null;
  pts_home: number;
  pts_away: number;
  pts_tie: number;
  actual_outcome: 'home' | 'away' | 'tie' | null;
}

interface MyPick {
  window_number: number;
  prediction: 'home' | 'away' | 'tie';
  correct: boolean | null;
  multiplier: number | null;
  points_earned: number | null;
  status: string;
}

function periodLabel(p: number | null): string {
  if (!p) return '';
  return p === 1 ? '1st half' : p === 2 ? '2nd half' : `OT${p > 3 ? p - 2 : ''}`;
}

export function BasketballLivePrediction({ game }: { game: LiveGame }) {
  const { session, openAuthModal } = useAuth();
  const [wins, setWins] = useState<Win[]>([]);
  const [picks, setPicks] = useState<Map<number, MyPick>>(new Map());
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('live_windows')
      .select('*')
      .eq('game_id', game.id)
      .order('window_number', { ascending: false })
      .limit(4);
    setWins((data as Win[]) ?? []);
    if (session) {
      const { data: mine } = await supabase
        .from('live_window_predictions')
        .select('window_number, prediction, correct, multiplier, points_earned, status')
        .eq('game_id', game.id)
        .eq('user_id', session.user.id);
      setPicks(new Map(((mine as MyPick[]) ?? []).map((p) => [p.window_number, p])));
    }
  }, [game.id, session]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`bb-live:${game.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_windows', filter: `game_id=eq.${game.id}` }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [game.id, load]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const current = wins[0];
  const open = current?.status === 'open' ? current : undefined;
  const msLeft = open ? new Date(open.window_locked_at).getTime() - now : 0;
  const canPick = !!open && msLeft > 0;
  const myPick = open ? picks.get(open.window_number) : undefined;
  const lastDone = wins.find((w) => w.status === 'resolved');
  const lastPick = lastDone ? picks.get(lastDone.window_number) : undefined;

  async function pick(choice: 'home' | 'away' | 'tie') {
    if (!open) return;
    if (!session) return openAuthModal('login');
    setBusy(true);
    setError('');
    const { error: err } = await supabase.rpc('submit_live_window_prediction', {
      p_game_id: game.id, p_window_number: open.window_number, p_prediction: choice,
    });
    setBusy(false);
    if (err) setError(err.message);
    else load();
  }

  const name = (o: 'home' | 'away' | 'tie') => (o === 'tie' ? 'Tie' : o === 'home' ? game.home_team : game.away_team);
  const options: { key: 'away' | 'tie' | 'home'; pts: number }[] = open
    ? [{ key: 'away', pts: open.pts_away }, { key: 'tie', pts: open.pts_tie }, { key: 'home', pts: open.pts_home }]
    : [];

  return (
    <DashboardCard
      title="🏀 LIVE STRETCH PREDICTOR"
      metadataTag={
        <span className="text-[10px] font-bold uppercase tracking-wider text-white">
          {periodLabel(game.current_quarter)} {game.game_clock}
        </span>
      }
      statusDotColor="#22c55e"
      className="h-full"
    >
      <div className="p-4 space-y-3 overflow-y-auto">
        <div className="flex items-center justify-center gap-4 text-white">
          <span className="text-xs font-semibold">{game.away_team}</span>
          <span className="text-2xl font-black tabular-nums">{game.away_score} – {game.home_score}</span>
          <span className="text-xs font-semibold">{game.home_team}</span>
        </div>

        {open ? (
          <>
            <p className="text-[11px] text-center text-white/80">
              Who outscores whom from now until the next TV timeout?{' '}
              <span className="text-white/50">(from {open.start_away_score}–{open.start_home_score})</span>
            </p>
            <p className={`text-center text-xs font-bold ${canPick ? 'text-vgd-orange' : 'text-vgd-red'}`}>
              {canPick ? `Locks when play resumes · ${Math.ceil(msLeft / 1000)}s max` : 'Locked — stretch in progress'}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {options.map(({ key, pts }) => (
                <button
                  key={key} type="button" disabled={!canPick || busy} onClick={() => pick(key)}
                  className={`flex flex-col items-center gap-0.5 py-2.5 rounded border text-[11px] font-bold transition-colors disabled:opacity-60 ${
                    myPick?.prediction === key ? 'bg-vgd-orange border-vgd-orange text-white' : 'border-white/10 text-white hover:border-white/30'
                  }`}
                >
                  <span className="truncate max-w-full px-1">{name(key)}</span>
                  <span className="text-[10px] font-normal opacity-80">{pts} pts</span>
                </button>
              ))}
            </div>
            {myPick && <p className="text-[10px] text-center text-green-400">Pick in: {name(myPick.prediction)}</p>}
          </>
        ) : (
          <p className="text-xs text-center text-white/70 py-3">
            {current ? 'Next window opens at the next TV timeout.' : 'First window opens at tip-off.'}
          </p>
        )}
        {error && <p className="text-xs text-center text-vgd-red">{error}</p>}

        {lastDone && (
          <div className="border-t border-white/[0.07] pt-3 text-center text-[11px] text-white/80">
            Last stretch ({lastDone.start_away_score}–{lastDone.start_home_score} → {lastDone.end_away_score}–{lastDone.end_home_score}):{' '}
            <span className="font-bold text-white">{lastDone.actual_outcome ? (lastDone.actual_outcome === 'tie' ? 'Tie' : `${name(stretchWinner(lastDone))} won it`) : ''}</span>
            {lastPick && (
              <span className={lastPick.correct ? ' text-green-400' : ' text-vgd-red'}>
                {' '}· {lastPick.correct ? `+${lastPick.points_earned} pts${lastPick.multiplier && lastPick.multiplier > 1 ? ` (×${lastPick.multiplier})` : ''}` : 'missed'}
              </span>
            )}
          </div>
        )}
      </div>
    </DashboardCard>
  );
}

function stretchWinner(w: Win): 'home' | 'away' {
  return w.actual_outcome === 'away' ? 'away' : 'home';
}
