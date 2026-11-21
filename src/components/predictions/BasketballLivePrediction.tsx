import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { DashboardCard } from '../ui/DashboardCard';
import type { LiveGame } from '../game/LiveGameStatsPanel';

// Live "stretch" game: at each TV timeout (men's) or quarter break (women's),
// guess Tennessee's numbers until the next one — points, 3s, 2s, turnovers
// forced, fouls. Each guess scores 50 minus 10 per miss. The server
// (live-espn-sync-bb) opens a window at each break and locks it when play resumes.

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
  actual_tn_pts: number | null;
  actual_threes: number | null;
  actual_twos: number | null;
  actual_turnovers_forced: number | null;
  actual_fouls: number | null;
  start_play_id: string | null;
}

// One number in the live ticker: briefly lights up when it goes up.
function FlashNum({ value }: { value: number }) {
  const prev = useRef(value);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (value > prev.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1200);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);
  return <span className={`transition-colors duration-500 ${flash ? 'text-vgd-orange' : 'text-white'}`}>{value}</span>;
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
  status: string;
}

type Field = 'pts' | 'threes' | 'twos' | 'turnovers' | 'fouls';

const FIELDS: { key: Field; label: string; short: string; hint: string; max: number }[] = [
  { key: 'pts', label: 'TN points', short: 'Pts', hint: 'scored', max: 60 },
  { key: 'threes', label: '3-pointers', short: '3PT', hint: 'TN makes', max: 20 },
  { key: 'twos', label: '2-pointers', short: '2PT', hint: 'TN makes', max: 30 },
  { key: 'turnovers', label: 'Turnovers forced', short: 'TO forced', hint: 'by TN', max: 20 },
  { key: 'fouls', label: 'Fouls', short: 'Fouls', hint: 'committed by TN', max: 20 },
];

// Starting values: about what a typical window holds (a quarter is longer than
// a TV-timeout stretch).
const START: Record<'stretch' | 'quarter', Record<Field, number>> = {
  stretch: { pts: 10, threes: 1, twos: 3, turnovers: 2, fouls: 2 },
  quarter: { pts: 18, threes: 2, twos: 5, turnovers: 4, fouls: 4 },
};

function periodLabel(p: number | null, quarters: boolean): string {
  if (!p) return '';
  if (quarters) return p <= 4 ? `Q${p}` : `OT${p > 5 ? p - 4 : ''}`;
  return p === 1 ? '1st half' : p === 2 ? '2nd half' : `OT${p > 3 ? p - 2 : ''}`;
}

export function BasketballLivePrediction({ game }: { game: LiveGame }) {
  const { session, openAuthModal } = useAuth();
  const quarters = game.sport === 'womens_basketball';
  const DEFAULTS = START[quarters ? 'quarter' : 'stretch'];
  const [wins, setWins] = useState<Win[]>([]);
  const [picks, setPicks] = useState<Map<number, MyPick>>(new Map());
  const [form, setForm] = useState<Record<Field, number>>(DEFAULTS);
  const [formWindow, setFormWindow] = useState<number | null>(null);
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
        .select('window_number, pick_pts, pick_threes, pick_twos, pick_turnovers, pick_fouls, points_earned, breakdown, status')
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
  const live = game.bb_stats?.live_stretch;
  const lastDone = wins.find((w) => w.status === 'resolved');
  // Game-clock span of the last stretch: it started at its own clock and ended where the next one began
  // (or at 0:00 if the period ended).
  const lastNext = lastDone ? wins.find((w) => w.window_number === lastDone.window_number + 1) : undefined;
  const lastEnd = !lastDone ? null
    : lastNext ? (lastNext.period === lastDone.period ? lastNext.game_clock : '0:00')
    : game.status !== 'live' ? '0:00' : null;
  const lastSpan = lastDone?.game_clock
    ? `${periodLabel(lastDone.period, quarters)} ${lastDone.game_clock}${lastEnd ? `–${lastEnd}` : ''}`.trim()
    : '';
  const lastPick = lastDone ? picks.get(lastDone.window_number) : undefined;
  const showSoFar = !!open && !canPick && !!live && live.start_play_id === open.start_play_id;

  // A new window starts from the user's saved pick for it, else the defaults.
  useEffect(() => {
    if (!open || formWindow === open.window_number) return;
    setFormWindow(open.window_number);
    setForm(myPick && myPick.pick_pts != null
      ? { pts: myPick.pick_pts, threes: myPick.pick_threes ?? 0, twos: myPick.pick_twos ?? 0, turnovers: myPick.pick_turnovers ?? 0, fouls: myPick.pick_fouls ?? 0 }
      : DEFAULTS);
  }, [open, formWindow, myPick, DEFAULTS]);

  function bump(key: Field, delta: number, max: number) {
    setForm((f) => ({ ...f, [key]: Math.min(max, Math.max(0, f[key] + delta)) }));
  }

  async function submit() {
    if (!open) return;
    if (!session) return openAuthModal('login');
    setBusy(true);
    setError('');
    const { error: err } = await supabase.rpc('submit_live_window_prediction', {
      p_game_id: game.id, p_window_number: open.window_number,
      p_pts: form.pts, p_threes: form.threes, p_twos: form.twos, p_turnovers: form.turnovers, p_fouls: form.fouls,
    });
    setBusy(false);
    if (err) setError(err.message);
    else load();
  }

  const actual = (w: Win): Record<Field, number | null> => ({
    pts: w.actual_tn_pts, threes: w.actual_threes, twos: w.actual_twos, turnovers: w.actual_turnovers_forced, fouls: w.actual_fouls,
  });
  const picked = (p: MyPick): Record<Field, number | null> => ({
    pts: p.pick_pts, threes: p.pick_threes, twos: p.pick_twos, turnovers: p.pick_turnovers, fouls: p.pick_fouls,
  });

  return (
    <DashboardCard
      title={quarters ? '🏀 LIVE QUARTER PREDICTOR' : '🏀 LIVE STRETCH PREDICTOR'}
      metadataTag={
        <span className="text-[10px] font-bold uppercase tracking-wider text-white">
          {periodLabel(game.current_quarter, quarters)} {game.game_clock}
        </span>
      }
      statusDotColor="#22c55e"
      className="h-full"
    >
      <div className="px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-center gap-4 text-white">
          <span className="text-xs font-semibold">{game.away_team}</span>
          <span className="text-xl font-black tabular-nums">{game.away_score} – {game.home_score}</span>
          <span className="text-xs font-semibold">{game.home_team}</span>
        </div>

        {open ? (
          <>
            <div className="text-center leading-snug">
              <p className="text-[10px] text-white/70">
                Tennessee from now until {quarters ? 'the end of the quarter' : 'the next TV timeout'} · 50 pts each: −10 per miss on points, −20 per miss on the rest
              </p>
              <p className={`text-xs font-bold ${canPick ? 'text-vgd-orange' : 'text-vgd-red'}`}>
                {canPick ? `Locks when play resumes · ${Math.ceil(msLeft / 1000)}s max` : 'Locked — stretch in progress'}
              </p>
            </div>
            {/* Two columns of steppers from sm up keeps the card short enough that the
                Game Leaderboard below it stays on screen during a live game. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1.5">
              {FIELDS.map((f) => (
                <div key={f.key} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-white truncate">{f.label}</div>
                    <div className="text-[10px] text-white/50 truncate">{f.hint}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button" disabled={!canPick || busy || form[f.key] <= 0} onClick={() => bump(f.key, -1, f.max)}
                      aria-label={`Fewer ${f.label}`}
                      className="w-7 h-7 rounded border border-white/10 text-white font-bold hover:border-white/30 disabled:opacity-40"
                    >−</button>
                    <span className="w-7 text-center text-base font-black tabular-nums text-white">{form[f.key]}</span>
                    <button
                      type="button" disabled={!canPick || busy || form[f.key] >= f.max} onClick={() => bump(f.key, 1, f.max)}
                      aria-label={`More ${f.label}`}
                      className="w-7 h-7 rounded border border-white/10 text-white font-bold hover:border-white/30 disabled:opacity-40"
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <button
                type="button" onClick={submit} disabled={!canPick || busy}
                className="w-full py-1.5 rounded bg-vgd-orange text-white text-xs font-black uppercase tracking-wider disabled:opacity-60"
              >
                {busy ? 'Saving…' : myPick ? 'Update picks' : session ? 'Lock in picks' : 'Sign in to pick'}
              </button>
              {myPick && <p className="text-[10px] text-center text-green-400">Picks in — you can change them until the window locks.</p>}
            </div>
          </>
        ) : (
          <p className="text-xs text-center text-white/70 py-2">
            {current ? (quarters ? 'Next window opens at the next quarter break.' : 'Next window opens at the next TV timeout.') : 'First window opens at tip-off.'}
          </p>
        )}
        {error && <p className="text-xs text-center text-vgd-red">{error}</p>}

        {/* "So far" and "last stretch" share one compact table: one header row of stat
            names, then a TN row and a "you" row per stretch. */}
        {(showSoFar || lastDone) && (
          <table className="w-full table-fixed border-t border-white/[0.07] text-[10px] text-white/70 tabular-nums">
            <thead>
              <tr>
                <th className="pt-2 w-8" />
                {FIELDS.map((f) => (
                  <th key={f.key} className="pt-2 font-normal text-white/50 text-center">{f.short}</th>
                ))}
              </tr>
            </thead>
            {showSoFar && open && live && (
              <tbody>
                <tr>
                  <td colSpan={6} className="pt-1.5 text-[11px] text-white/80">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse mr-1.5 align-middle" />
                    {quarters ? 'This quarter so far' : 'This stretch so far'}
                    {open.game_clock && <span className="text-white/50"> (from {periodLabel(open.period, quarters)} {open.game_clock})</span>}
                  </td>
                </tr>
                <tr className="text-sm font-black">
                  <td className="text-[10px] font-normal text-white/50">TN</td>
                  <td className="text-center"><FlashNum value={live.pts} /></td>
                  <td className="text-center"><FlashNum value={live.threes} /></td>
                  <td className="text-center"><FlashNum value={live.twos} /></td>
                  <td className="text-center"><FlashNum value={live.turnovers} /></td>
                  <td className="text-center"><FlashNum value={live.fouls} /></td>
                </tr>
                {myPick && (
                  <tr>
                    <td className="text-white/50">You</td>
                    {FIELDS.map((f) => <td key={f.key} className="text-center">{picked(myPick)[f.key] ?? '–'}</td>)}
                  </tr>
                )}
              </tbody>
            )}
            {lastDone && (
              <tbody>
                <tr>
                  <td colSpan={6} className="pt-1.5 text-[11px] text-white/80">
                    {quarters ? 'Last quarter' : 'Last stretch'}
                    {lastSpan && <span className="text-white/50"> ({lastSpan})</span>}
                    {lastPick && <span className="font-bold text-vgd-orange"> · +{lastPick.points_earned ?? 0} pts</span>}
                  </td>
                </tr>
                <tr className="text-sm font-black text-white">
                  <td className="text-[10px] font-normal text-white/50">TN</td>
                  {FIELDS.map((f) => <td key={f.key} className="text-center">{actual(lastDone)[f.key] ?? '–'}</td>)}
                </tr>
                {lastPick && (
                  <tr>
                    <td className="text-white/50">You</td>
                    {FIELDS.map((f) => <td key={f.key} className="text-center">{picked(lastPick)[f.key] ?? '–'}</td>)}
                  </tr>
                )}
              </tbody>
            )}
          </table>
        )}
      </div>
    </DashboardCard>
  );
}
