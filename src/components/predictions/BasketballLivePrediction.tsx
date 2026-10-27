import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { DashboardCard } from '../ui/DashboardCard';
import type { LiveGame } from '../game/LiveGameStatsPanel';

// Live "stretch" game: at each TV timeout, guess Tennessee's numbers for the
// stretch until the next one — points, 3s, 2s, turnovers forced, fouls. Each
// guess scores 50 minus 5 per miss. The server (live-espn-sync-bb) opens a
// window at each timeout and locks it when play resumes.

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

const FIELDS: { key: Field; label: string; hint: string; max: number; start: number }[] = [
  { key: 'pts', label: 'TN points', hint: 'scored this stretch', max: 60, start: 10 },
  { key: 'threes', label: '3-pointers', hint: 'TN makes', max: 20, start: 1 },
  { key: 'twos', label: '2-pointers', hint: 'TN makes', max: 30, start: 3 },
  { key: 'turnovers', label: 'Turnovers forced', hint: 'by TN', max: 20, start: 2 },
  { key: 'fouls', label: 'Fouls', hint: 'committed by TN', max: 20, start: 2 },
];

const DEFAULTS: Record<Field, number> = Object.fromEntries(FIELDS.map((f) => [f.key, f.start])) as Record<Field, number>;

function periodLabel(p: number | null): string {
  if (!p) return '';
  return p === 1 ? '1st half' : p === 2 ? '2nd half' : `OT${p > 3 ? p - 2 : ''}`;
}

export function BasketballLivePrediction({ game }: { game: LiveGame }) {
  const { session, openAuthModal } = useAuth();
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
  const lastDone = wins.find((w) => w.status === 'resolved');
  const lastPick = lastDone ? picks.get(lastDone.window_number) : undefined;

  // A new window starts from the user's saved pick for it, else the defaults.
  useEffect(() => {
    if (!open || formWindow === open.window_number) return;
    setFormWindow(open.window_number);
    setForm(myPick && myPick.pick_pts != null
      ? { pts: myPick.pick_pts, threes: myPick.pick_threes ?? 0, twos: myPick.pick_twos ?? 0, turnovers: myPick.pick_turnovers ?? 0, fouls: myPick.pick_fouls ?? 0 }
      : DEFAULTS);
  }, [open, formWindow, myPick]);

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
              Tennessee from now until the next TV timeout · 50 pts each, minus 5 per miss
            </p>
            <p className={`text-center text-xs font-bold ${canPick ? 'text-vgd-orange' : 'text-vgd-red'}`}>
              {canPick ? `Locks when play resumes · ${Math.ceil(msLeft / 1000)}s max` : 'Locked — stretch in progress'}
            </p>
            <div className="space-y-1.5">
              {FIELDS.map((f) => (
                <div key={f.key} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-white">{f.label}</div>
                    <div className="text-[10px] text-white/50">{f.hint}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button" disabled={!canPick || busy || form[f.key] <= 0} onClick={() => bump(f.key, -1, f.max)}
                      aria-label={`Fewer ${f.label}`}
                      className="w-8 h-8 rounded border border-white/10 text-white font-bold hover:border-white/30 disabled:opacity-40"
                    >−</button>
                    <span className="w-8 text-center text-lg font-black tabular-nums text-white">{form[f.key]}</span>
                    <button
                      type="button" disabled={!canPick || busy || form[f.key] >= f.max} onClick={() => bump(f.key, 1, f.max)}
                      aria-label={`More ${f.label}`}
                      className="w-8 h-8 rounded border border-white/10 text-white font-bold hover:border-white/30 disabled:opacity-40"
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button" onClick={submit} disabled={!canPick || busy}
              className="w-full py-2 rounded bg-vgd-orange text-white text-xs font-black uppercase tracking-wider disabled:opacity-60"
            >
              {busy ? 'Saving…' : myPick ? 'Update picks' : session ? 'Lock in picks' : 'Sign in to pick'}
            </button>
            {myPick && <p className="text-[10px] text-center text-green-400">Picks in — you can change them until the window locks.</p>}
          </>
        ) : (
          <p className="text-xs text-center text-white/70 py-3">
            {current ? 'Next window opens at the next TV timeout.' : 'First window opens at tip-off.'}
          </p>
        )}
        {error && <p className="text-xs text-center text-vgd-red">{error}</p>}

        {lastDone && (
          <div className="border-t border-white/[0.07] pt-3 space-y-1.5">
            <div className="text-center text-[11px] text-white/80">
              Last stretch ({lastDone.start_away_score}–{lastDone.start_home_score} → {lastDone.end_away_score}–{lastDone.end_home_score})
              {lastPick && <span className="font-bold text-vgd-orange"> · +{lastPick.points_earned ?? 0} pts</span>}
            </div>
            <div className="grid grid-cols-5 gap-1 text-center">
              {FIELDS.map((f) => (
                <div key={f.key} className="text-[10px] text-white/70">
                  <div className="text-white/50">{f.label}</div>
                  <div className="text-sm font-black tabular-nums text-white">{actual(lastDone)[f.key] ?? '–'}</div>
                  {lastPick && <div className="text-[10px]">you: {picked(lastPick)[f.key] ?? '–'}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
