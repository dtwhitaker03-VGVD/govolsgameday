import { useState, useEffect } from 'react';
import { Lock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { DashboardCard } from '../ui/DashboardCard';
import type { LiveGame } from '../game/LiveGameStatsPanel';

// Men's basketball pregame picks. Same tables as football (pregame_predictions,
// game_props, pregame_prop_picks) but its own RPC and no yardage guesses.
// Picks lock 10 minutes before tip (enforced by submit_pregame_prediction_bb).

const LOCK_BEFORE_TIP_MS = 10 * 60 * 1000;

interface Pick {
  predicted_winner: 'home' | 'away';
  predicted_home_score: number;
  predicted_away_score: number;
  predicted_spread_pick: 'over' | 'under' | null;
  predicted_total_pick: 'over' | 'under' | null;
  winner_correct: boolean | null;
  home_score_points: number | null;
  away_score_points: number | null;
  spread_pick_points: number | null;
  total_pick_points: number | null;
  total_pregame_points: number | null;
}

interface GameProp { id: string; description: string; line: number; points_value: number; actual_value: number | string | null }
interface PropPick { prop_id: string; pick: 'over' | 'under'; correct: boolean | null; points_earned: number }

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const t = Math.floor(ms / 1000);
  const d = Math.floor(t / 86400), h = Math.floor((t % 86400) / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  if (d > 0) return `${d}d ${h}h ${String(m).padStart(2, '0')}m`;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const toggle = (on: boolean) =>
  `px-2 py-1.5 rounded border text-[11px] font-bold transition-colors disabled:opacity-60 ${
    on ? 'bg-vgd-orange border-vgd-orange text-white' : 'border-white/10 text-white hover:border-white/30'
  }`;

export function BasketballPregamePredictions({ game }: { game: LiveGame }) {
  const { session, openAuthModal } = useAuth();
  const [winner, setWinner] = useState<'home' | 'away' | ''>('');
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [totalPick, setTotalPick] = useState<'over' | 'under' | ''>('');
  const [propForm, setPropForm] = useState<Record<string, 'over' | 'under'>>({});
  const [existing, setExisting] = useState<Pick | null>(null);
  const [gameProps, setGameProps] = useState<GameProp[]>([]);
  const [propPicks, setPropPicks] = useState<PropPick[]>([]);
  const [now, setNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const lockAt = new Date(game.kickoff_time).getTime() - LOCK_BEFORE_TIP_MS;
  const isCalculated = game.status === 'calculated';
  const isLocked = now >= lockAt || game.status !== 'pregame';

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    supabase
      .from('game_props')
      .select('id, description, line, points_value, actual_value')
      .eq('game_id', game.id)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setGameProps((data as GameProp[]) ?? []));
  }, [game.id]);

  useEffect(() => {
    if (!session) { setExisting(null); return; }
    supabase
      .from('pregame_predictions')
      .select('*')
      .eq('game_id', game.id)
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const d = data as Pick;
        setExisting(d);
        setWinner(d.predicted_winner);
        setHomeScore(String(d.predicted_home_score));
        setAwayScore(String(d.predicted_away_score));
        setTotalPick(d.predicted_total_pick ?? '');
      });
    supabase
      .from('pregame_prop_picks')
      .select('prop_id, pick, correct, points_earned')
      .eq('game_id', game.id)
      .eq('user_id', session.user.id)
      .then(({ data }) => {
        const picks = (data as PropPick[]) ?? [];
        setPropPicks(picks);
        setPropForm(Object.fromEntries(picks.map((p) => [p.prop_id, p.pick])));
      });
  }, [session, game.id]);

  const total = game.total_points_line;

  async function submit() {
    setError('');
    if (!session) return openAuthModal('login');
    if (!winner) return setError('Pick a winner.');
    const hs = parseInt(homeScore, 10), as = parseInt(awayScore, 10);
    if (!Number.isFinite(hs) || !Number.isFinite(as)) return setError('Enter both final scores.');
    if ((winner === 'home' && hs <= as) || (winner === 'away' && as <= hs)) {
      return setError('Your scores must agree with your winner.');
    }
    if (total != null && !totalPick) return setError('Pick Over or Under on the total.');
    setSubmitting(true);
    const { error: err } = await supabase.rpc('submit_pregame_prediction_bb', {
      p_game_id: game.id,
      p_predicted_winner: winner,
      p_home_score: hs,
      p_away_score: as,
      p_spread_pick: null,
      p_total_pick: total != null ? totalPick : null,
      p_prop_picks: Object.entries(propForm).map(([prop_id, pick]) => ({ prop_id, pick })),
    });
    setSubmitting(false);
    if (err) return setError(err.message);
    setExisting({
      predicted_winner: winner, predicted_home_score: hs, predicted_away_score: as,
      predicted_spread_pick: null,
      predicted_total_pick: total != null ? (totalPick as 'over' | 'under') : null,
      winner_correct: null, home_score_points: null, away_score_points: null,
      spread_pick_points: null, total_pick_points: null, total_pregame_points: null,
    });
  }

  const header = (
    <span className={`text-[10px] font-bold uppercase tracking-wider ${isLocked ? 'text-vgd-red' : 'text-white'}`}>
      {isCalculated ? 'FINAL' : isLocked ? 'LOCKED' : `LOCKS IN ${formatCountdown(lockAt - now)}`}
    </span>
  );

  // Post-game / locked summary of the user's own picks.
  if (isLocked) {
    const row = (label: string, value: string, pts: number | null, ok?: boolean | null) => (
      <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.05]">
        <span className="text-white/70">{label}</span>
        <span className="flex items-center gap-2 text-white font-semibold">
          {value}
          {isCalculated && pts != null && <span className={pts > 0 ? 'text-green-400' : 'text-vgd-red'}>{pts > 0 ? `+${pts}` : '0'}</span>}
          {isCalculated && ok === true && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
          {isCalculated && ok === false && <XCircle className="w-3.5 h-3.5 text-vgd-red" />}
        </span>
      </div>
    );
    return (
      <DashboardCard title="🏀 PRE-GAME PREDICTIONS" metadataTag={header} className="h-full">
        <div className="p-4 overflow-y-auto">
          {!existing ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Lock className="w-5 h-5 text-vgd-muted" />
              <p className="text-xs text-white">Picks are closed{session ? ' and you did not make any for this game.' : '.'}</p>
            </div>
          ) : (
            <>
              {row('Winner', existing.predicted_winner === 'home' ? game.home_team : game.away_team, null, existing.winner_correct)}
              {row(`${game.home_team} score`, String(existing.predicted_home_score), existing.home_score_points)}
              {row(`${game.away_team} score`, String(existing.predicted_away_score), existing.away_score_points)}
              {existing.predicted_total_pick && row('Total', existing.predicted_total_pick.toUpperCase(), existing.total_pick_points)}
              {gameProps.map((gp) => {
                const pp = propPicks.find((p) => p.prop_id === gp.id);
                if (!pp) return null;
                return row(gp.description, `${pp.pick.toUpperCase()} ${gp.line}${gp.actual_value != null ? ` (actual ${gp.actual_value})` : ''}`, isCalculated ? pp.points_earned : null, pp.correct);
              })}
              {isCalculated && existing.total_pregame_points != null && (
                <div className="flex justify-between pt-3 text-sm font-black">
                  <span className="text-white">Pre-game total</span>
                  <span className="text-vgd-orange">{existing.total_pregame_points} pts</span>
                </div>
              )}
            </>
          )}
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title="🏀 PRE-GAME PREDICTIONS" metadataTag={header} className="h-full">
      <div className="p-4 space-y-4 overflow-y-auto">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1.5">Winner · 100 pts</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={toggle(winner === 'away')} onClick={() => setWinner('away')}>{game.away_team}</button>
            <button type="button" className={toggle(winner === 'home')} onClick={() => setWinner('home')}>{game.home_team}</button>
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1.5">Final score · 100 pts, minus 5 per point off · +50 if exact</p>
          <div className="grid grid-cols-2 gap-2">
            {([[game.away_team, awayScore, setAwayScore], [game.home_team, homeScore, setHomeScore]] as const).map(([name, val, set]) => (
              <label key={name} className="text-[10px] text-white/70">
                {name}
                <input
                  type="number" inputMode="numeric" min={0} max={199} value={val}
                  onChange={(e) => { set(e.target.value); setError(''); }}
                  className="mt-1 w-full bg-vgd-bg border border-white/10 rounded px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-vgd-orange"
                />
              </label>
            ))}
          </div>
        </div>

        {(total != null || gameProps.length > 0) && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1.5">Over / Under · 100 pts each</p>
            <div className="space-y-2">
              {total != null && (
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <button type="button" className={toggle(totalPick === 'under')} onClick={() => setTotalPick('under')}>Under</button>
                  <span className="text-[11px] font-bold text-white text-center">Total {total}</span>
                  <button type="button" className={toggle(totalPick === 'over')} onClick={() => setTotalPick('over')}>Over</button>
                </div>
              )}
              {gameProps.map((gp) => (
                <div key={gp.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <button type="button" className={toggle(propForm[gp.id] === 'under')} onClick={() => setPropForm((f) => ({ ...f, [gp.id]: 'under' }))}>Under</button>
                  <span className="text-[11px] font-bold text-white text-center max-w-[120px]">{gp.description} {gp.line}</span>
                  <button type="button" className={toggle(propForm[gp.id] === 'over')} onClick={() => setPropForm((f) => ({ ...f, [gp.id]: 'over' }))}>Over</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-xs text-vgd-red">{error}</p>}
        <button
          type="button" onClick={submit} disabled={submitting}
          className="w-full py-2 rounded bg-vgd-orange text-white text-xs font-black uppercase tracking-wider disabled:opacity-60"
        >
          {submitting ? 'Saving…' : existing ? 'Update picks' : session ? 'Lock in picks' : 'Sign in to pick'}
        </button>
        {existing && !error && <p className="text-[10px] text-green-400 text-center">Your picks are saved — you can change them until lock.</p>}
      </div>
    </DashboardCard>
  );
}
