import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { DashboardCard } from '../ui/DashboardCard';

// Admin picks the Player of the Game for a finished game; the Sunday post is
// built from exactly what is entered here (nothing is invented). Pick it before
// the scheduled Sunday time or that week's post is skipped.

interface FinishedGame {
  id: string;
  sport: string;
  home_team: string;
  away_team: string;
  kickoff_time: string;
  home_score: number;
  away_score: number;
  status: string;
}

interface StatRow { label: string; value: string }

const EMPTY_STATS: StatRow[] = [
  { label: '', value: '' }, { label: '', value: '' }, { label: '', value: '' }, { label: '', value: '' },
];

const field = 'w-full bg-vgd-bg border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-vgd-orange/50';
const lbl = 'block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-0.5';

export function PlayerOfGamePanel() {
  const [games, setGames] = useState<FinishedGame[]>([]);
  const [gameId, setGameId] = useState('');
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [jersey, setJersey] = useState('');
  const [stats, setStats] = useState<StatRow[]>(EMPTY_STATS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const [{ data: g }, { data: p }] = await Promise.all([
      supabase
        .from('live_games')
        .select('id, sport, home_team, away_team, kickoff_time, home_score, away_score, status')
        .in('status', ['final', 'calculated'])
        .order('kickoff_time', { ascending: false })
        .limit(6),
      supabase.from('social_player_of_game').select('game_id'),
    ]);
    const list = (g as FinishedGame[] | null) ?? [];
    setGames(list);
    setExisting(new Set(((p as { game_id: string }[] | null) ?? []).map((x) => x.game_id)));
    setGameId((cur) => cur || list[0]?.id || '');
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load what's already saved for the selected game.
  useEffect(() => {
    if (!gameId) return;
    supabase
      .from('social_player_of_game')
      .select('player_name, position, jersey, stats')
      .eq('game_id', gameId)
      .maybeSingle()
      .then(({ data }) => {
        const d = data as { player_name: string; position: string | null; jersey: string | null; stats: StatRow[] } | null;
        setName(d?.player_name ?? '');
        setPosition(d?.position ?? '');
        setJersey(d?.jersey ?? '');
        const s = [...(d?.stats ?? []), ...EMPTY_STATS].slice(0, 4);
        setStats(s);
      });
  }, [gameId]);

  async function save() {
    setSaving(true);
    setMessage(null);
    const { error } = await supabase.rpc('admin_social_set_potg', {
      p_game_id: gameId,
      p_name: name,
      p_position: position,
      p_jersey: jersey,
      p_stats: stats.filter((s) => s.label.trim() && s.value.trim()).map((s) => ({ label: s.label.trim(), value: s.value.trim() })),
    });
    setSaving(false);
    if (error) setMessage({ ok: false, text: error.message });
    else {
      setMessage({ ok: true, text: 'Saved. The Sunday post will use this.' });
      load();
    }
  }

  const label = (g: FinishedGame) => {
    const tnHome = g.home_team === 'Tennessee';
    const tn = tnHome ? g.home_score : g.away_score;
    const opp = tnHome ? g.away_score : g.home_score;
    const date = new Date(g.kickoff_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });
    return `${g.sport === 'basketball' || g.sport === 'womens_basketball' ? '🏀 ' : ''}${tnHome ? 'vs' : 'at'} ${tnHome ? g.away_team : g.home_team} · ${tn > opp ? 'W' : 'L'} ${tn}-${opp} · ${date}${existing.has(g.id) ? ' ✓' : ''}`;
  };

  return (
    <DashboardCard title="Social Posts — Player of the Game" statusDotColor="#FF8200">
      <div className="p-4 space-y-3">
        <p className="text-[11px] text-white/50">
          Pick the player and enter the stat lines to show (up to 4, for example "120" / "Rushing yards"). ✓ marks games that already have a pick.
        </p>
        {games.length === 0 ? (
          <p className="text-xs text-white/50">No finished games yet.</p>
        ) : (
          <>
            <div>
              <label className={lbl}>Game</label>
              <select value={gameId} onChange={(e) => setGameId(e.target.value)} className={field}>
                {games.map((g) => <option key={g.id} value={g.id}>{label(g)}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-[1fr_90px_90px] gap-3">
              <div><label className={lbl}>Player name</label><input value={name} onChange={(e) => setName(e.target.value)} className={field} placeholder="DeSean Bishop" /></div>
              <div><label className={lbl}>Position</label><input value={position} onChange={(e) => setPosition(e.target.value)} className={field} placeholder="RB" /></div>
              <div><label className={lbl}>Jersey #</label><input value={jersey} onChange={(e) => setJersey(e.target.value)} className={field} placeholder="18" /></div>
            </div>
            <div className="space-y-2">
              <label className={lbl}>Stat lines</label>
              {stats.map((s, i) => (
                <div key={i} className="grid grid-cols-[90px_1fr] gap-3">
                  <input value={s.value} maxLength={10} onChange={(e) => setStats((a) => a.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} className={field} placeholder="120" />
                  <input value={s.label} maxLength={22} onChange={(e) => setStats((a) => a.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className={field} placeholder="Rushing yards" />
                </div>
              ))}
            </div>
            <button
              onClick={save} disabled={saving || !gameId || !name.trim()}
              className="px-4 py-1.5 rounded bg-vgd-orange hover:bg-orange-500 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save Player of the Game'}
            </button>
            {message && <p className={`text-xs ${message.ok ? 'text-green-400' : 'text-vgd-red'}`}>{message.text}</p>}
          </>
        )}
      </div>
    </DashboardCard>
  );
}
