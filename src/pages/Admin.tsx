import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { DashboardCard } from '../components/ui/DashboardCard';
import { CheckCircle, AlertCircle, Loader, EyeOff, Trash2, RefreshCw, Pin, Plus, X, Search, Pencil, Play, Check } from 'lucide-react';
import { selectMainPageVideos } from '../lib/mainPageVideoSelection';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveGame {
  id: string;
  cfbd_game_id: number;
  home_team: string;
  away_team: string;
  kickoff_time: string;
  status: string;
  home_score: number;
  away_score: number;
  manual_control: boolean;
}

type OpStatus = 'idle' | 'loading' | 'ok' | 'error';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function OpResult({ status, message }: { status: OpStatus; message: string }) {
  if (status === 'idle') return null;
  if (status === 'loading') return (
    <div className="flex items-center gap-1.5 text-xs text-white/50 mt-1.5">
      <Loader className="w-3 h-3 animate-spin" /> Running…
    </div>
  );
  if (status === 'ok') return (
    <div className="flex items-center gap-1.5 text-xs text-green-400 mt-1.5">
      <CheckCircle className="w-3 h-3" /> {message}
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 text-xs text-vgd-red mt-1.5">
      <AlertCircle className="w-3 h-3" /> {message}
    </div>
  );
}

function LabelInput({
  label, value, onChange, type = 'text', placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-0.5">
        {label}
      </label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-vgd-bg border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-vgd-orange/50"
      />
    </div>
  );
}

function SelectInput({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-0.5">
        {label}
      </label>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-vgd-bg border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-vgd-orange/50"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function ActionButton({
  onClick, disabled, children,
}: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-1.5 rounded bg-vgd-orange hover:bg-orange-500 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

// ─── Panel: Live Drive Control ─────────────────────────────────────────────────
//
// Replaces the old "Open Drive Window" + "Settle Drive Outcome" test-harness
// panels with a real manual operator console: prep a drive's situation, hit
// Active when you're ready to open the pick window for users (choosing how
// long it stays open), then pick the outcome and Submit once the drive
// actually ends. Activating and submitting are deliberately separate actions
// so the admin controls exactly when users see the next window — right away
// for a fast possession change, or after a commercial break/halftime.
//
// Gated behind live_games.manual_control so this never races the automatic
// live-cfbd-sync poller for the same game (see admin_set_manual_control).

interface DriveWindowRow {
  id: string;
  drive_number: number;
  status: string;
  actual_outcome: string | null;
  yardline: number;
  quarter: number;
  game_clock: string;
  window_locked_at: string;
}

const DRIVE_OUTCOMES: { key: string; label: string; polarity: 'pos' | 'neg' | 'neu' }[] = [
  { key: 'touchdown', label: 'Touchdown', polarity: 'pos' },
  { key: 'field_goal', label: 'Field Goal', polarity: 'pos' },
  { key: 'punt', label: 'Punt', polarity: 'neu' },
  { key: 'turnover', label: 'Turnover', polarity: 'neg' },
  { key: 'safety', label: 'Safety', polarity: 'neg' },
  { key: 'turnover_on_downs', label: 'Turnover on Downs', polarity: 'neg' },
  { key: 'end_of_quarter', label: 'End of Half/Game', polarity: 'neu' },
];

function outcomeLabel(key: string): string {
  return DRIVE_OUTCOMES.find(o => o.key === key)?.label ?? key;
}

function outcomeClasses(polarity: 'pos' | 'neg' | 'neu', selected: boolean): string {
  if (selected) return 'bg-vgd-orange border-vgd-orange text-white';
  if (polarity === 'pos') return 'bg-green-400/10 border-green-400/30 text-green-400';
  if (polarity === 'neg') return 'bg-vgd-red/10 border-vgd-red/30 text-vgd-red';
  return 'bg-white/[0.03] border-white/10 text-white/50';
}

// Field position is stored as a single 0-100 "progress toward the opponent's
// goal line" number (see open_drive_window). The broadcast-style own/opp
// label is fully recoverable from that one number by convention: describe
// it from whichever goal line is nearer.
function fieldPositionLabel(progress: number): string {
  return progress <= 50 ? `Own ${progress}` : `Opp ${100 - progress}`;
}

function zoneLabel(progress: number): string {
  if (progress >= 80) return 'Red Zone';
  if (progress >= 60) return 'Opponent Territory';
  if (progress >= 40) return 'Midfield';
  if (progress <= 20) return 'Own End (backed up)';
  return '';
}

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

const LOW_CLOCK_TEXT = '1:00';
const NORMAL_CLOCK_TEXT = '10:00';

function LiveDriveControlPanel({ games, onRefresh }: { games: LiveGame[]; onRefresh: () => void }) {
  const [gameId, setGameId] = useState('');
  const [windows, setWindows] = useState<DriveWindowRow[]>([]);
  const [now, setNow] = useState(Date.now());

  const [quarter, setQuarter] = useState('1');
  const [yardline, setYardline] = useState('25');
  const [yardlineSide, setYardlineSide] = useState<'own' | 'opp'>('own');
  const [lowClock, setLowClock] = useState(false);
  const [durationChoice, setDurationChoice] = useState(30);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [editingHistoryDrive, setEditingHistoryDrive] = useState<number | null>(null);

  const [opStatus, setOpStatus] = useState<OpStatus>('idle');
  const [opMsg, setOpMsg] = useState('');
  const [manualStatus, setManualStatus] = useState<OpStatus>('idle');

  const gameOptions = [{ value: '', label: 'Select game…' }, ...games.map(g => ({
    value: g.id,
    label: `${g.away_team} @ ${g.home_team} [${g.status}]`,
  }))];
  const selectedGame = games.find(g => g.id === gameId);

  function fetchWindows(id: string) {
    supabase
      .from('drive_windows')
      .select('id, drive_number, status, actual_outcome, yardline, quarter, game_clock, window_locked_at')
      .eq('game_id', id)
      .order('drive_number', { ascending: false })
      .then(({ data }) => setWindows((data ?? []) as DriveWindowRow[]));
  }

  useEffect(() => {
    if (!gameId) { setWindows([]); return; }
    fetchWindows(gameId);
    const channel = supabase
      .channel(`admin:live-drive:${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drive_windows', filter: `game_id=eq.${gameId}` },
        () => fetchWindows(gameId)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [gameId]);

  // Live-ticking clock for the countdown display — reads window_locked_at
  // directly rather than keeping a local timer, so it's correct across
  // refreshes/multiple admin tabs.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const sorted = [...windows].sort((a, b) => b.drive_number - a.drive_number);
  const top = sorted[0];
  const isNewDrive = !top || top.status === 'resolved';
  const currentDriveNumber = isNewDrive ? (top?.drive_number ?? 0) + 1 : top.drive_number;
  const currentRow = isNewDrive ? null : top;
  const history = isNewDrive ? sorted : sorted.slice(1);

  // Reset the prep form whenever a new drive number comes into focus (fresh
  // selection, or right after Submit advances past the drive currentRow was on).
  useEffect(() => {
    setQuarter('1');
    setYardline('25');
    setYardlineSide('own');
    setLowClock(false);
    setSelectedOutcome(null);
  }, [gameId, currentDriveNumber]);

  const windowLockedAtMs = currentRow ? new Date(currentRow.window_locked_at).getTime() : 0;
  const windowStatus: 'pending' | 'active' | 'closed' = !currentRow ? 'pending' : (windowLockedAtMs > now ? 'active' : 'closed');
  const remainingSeconds = currentRow ? Math.max(0, Math.round((windowLockedAtMs - now) / 1000)) : 0;

  const fieldsDisabled = windowStatus !== 'pending';
  const displayQuarter = currentRow ? String(currentRow.quarter) : quarter;
  const displayYardlineNum = currentRow
    ? (currentRow.yardline <= 50 ? currentRow.yardline : 100 - currentRow.yardline)
    : (parseInt(yardline, 10) || 0);
  const displaySide: 'own' | 'opp' = currentRow ? (currentRow.yardline <= 50 ? 'own' : 'opp') : yardlineSide;
  const displayLowClock = currentRow ? currentRow.game_clock === LOW_CLOCK_TEXT : lowClock;

  const progress = displaySide === 'own' ? displayYardlineNum : 100 - displayYardlineNum;
  const zone = zoneLabel(progress);

  const manualControlOn = !!selectedGame?.manual_control;

  async function toggleManualControl() {
    if (!selectedGame) return;
    setManualStatus('loading');
    const { error } = await supabase.rpc('admin_set_manual_control', {
      p_game_id: selectedGame.id,
      p_manual_control: !selectedGame.manual_control,
    });
    if (error) { setManualStatus('error'); setOpMsg(error.message); }
    else { setManualStatus('idle'); onRefresh(); }
  }

  // Advances pregame -> live -> final. A manually-controlled game's status
  // never gets touched by live-cfbd-sync (it skips manual_control games
  // entirely), and game-sync's automatic pregame->live flip only runs
  // inside its three weekly windows — so without this, a manually-driven
  // game can sit stuck on "pregame" past kickoff with nothing showing on
  // the live site. 'calculated' is deliberately not selectable here — that
  // transition only ever happens through Finalize Game.
  async function setGameStatus(newStatus: string) {
    if (!selectedGame) return;
    setManualStatus('loading');
    const { error } = await supabase.rpc('admin_update_game', {
      p_game_id: selectedGame.id,
      p_status: newStatus,
      p_home_score: selectedGame.home_score,
      p_away_score: selectedGame.away_score,
    });
    if (error) { setManualStatus('error'); setOpMsg(error.message); }
    else { setManualStatus('idle'); onRefresh(); }
  }

  async function activate() {
    if (!gameId || !manualControlOn || windowStatus !== 'pending') return;
    setOpStatus('loading');
    const y = parseInt(yardline, 10) || 25;
    const p = yardlineSide === 'own' ? y : 100 - y;
    const { error } = await supabase.rpc('open_drive_window', {
      p_game_id: gameId,
      p_drive_number: currentDriveNumber,
      p_yardline: p,
      p_quarter: parseInt(quarter, 10) || 1,
      p_game_clock: lowClock ? LOW_CLOCK_TEXT : NORMAL_CLOCK_TEXT,
      p_window_seconds: durationChoice,
    });
    if (error) { setOpStatus('error'); setOpMsg(error.message); }
    else { setOpStatus('ok'); setOpMsg(`Drive ${currentDriveNumber} window active.`); fetchWindows(gameId); }
  }

  async function reset() {
    if (!gameId || !manualControlOn || !currentRow) return;
    setOpStatus('loading');
    const { error } = await supabase.rpc('open_drive_window', {
      p_game_id: gameId,
      p_drive_number: currentDriveNumber,
      p_yardline: currentRow.yardline,
      p_quarter: currentRow.quarter,
      p_game_clock: currentRow.game_clock,
      p_window_seconds: durationChoice,
    });
    if (error) { setOpStatus('error'); setOpMsg(error.message); }
    else { setOpStatus('ok'); setOpMsg(`Drive ${currentDriveNumber} timer reset.`); fetchWindows(gameId); }
  }

  async function submit() {
    if (!gameId || !manualControlOn || !selectedOutcome) return;
    setOpStatus('loading');

    if (!currentRow) {
      // Never activated — a drive that resolved too fast to open a window
      // for. Open (with a 1s window so nothing lingers visible to users)
      // then immediately settle.
      const y = parseInt(yardline, 10) || 25;
      const p = yardlineSide === 'own' ? y : 100 - y;
      const { error: openErr } = await supabase.rpc('open_drive_window', {
        p_game_id: gameId,
        p_drive_number: currentDriveNumber,
        p_yardline: p,
        p_quarter: parseInt(quarter, 10) || 1,
        p_game_clock: lowClock ? LOW_CLOCK_TEXT : NORMAL_CLOCK_TEXT,
        p_window_seconds: 1,
      });
      if (openErr) { setOpStatus('error'); setOpMsg(openErr.message); return; }
    }

    const { error } = await supabase.rpc('settle_drive_outcome', {
      p_game_id: gameId,
      p_drive_number: currentDriveNumber,
      p_actual_outcome: selectedOutcome,
    });
    if (error) { setOpStatus('error'); setOpMsg(error.message); }
    else {
      setOpStatus('ok');
      setOpMsg(`Drive ${currentDriveNumber} settled as ${outcomeLabel(selectedOutcome)}.`);
      fetchWindows(gameId);
    }
  }

  async function correctHistoryOutcome(driveNumber: number, key: string) {
    if (!gameId) return;
    setOpStatus('loading');
    const { error } = await supabase.rpc('settle_drive_outcome', {
      p_game_id: gameId,
      p_drive_number: driveNumber,
      p_actual_outcome: key,
    });
    if (error) { setOpStatus('error'); setOpMsg(error.message); }
    else {
      setOpStatus('ok');
      setOpMsg(`Drive ${driveNumber} outcome corrected to ${outcomeLabel(key)} — already-awarded points/streaks are unchanged.`);
      setEditingHistoryDrive(null);
      fetchWindows(gameId);
    }
  }

  const durationOptions: { value: number; label: string }[] = [
    { value: 30, label: '30s' },
    { value: 60, label: '1m' },
    { value: 120, label: '2m' },
  ];

  return (
    <DashboardCard title="Live Drive Control" statusDotColor="#FF8200">
      <div className="p-4 space-y-4">
        <SelectInput label="Game" value={gameId} onChange={setGameId} options={gameOptions} />

        {selectedGame && selectedGame.status !== 'calculated' && (
          <div className="flex items-center justify-between gap-3 px-3 py-2 rounded border border-white/10 bg-vgd-bg">
            <span className="text-[11px] text-white/50">
              Status: <span className="font-bold text-white/80 uppercase">{selectedGame.status}</span>
            </span>
            {selectedGame.status === 'pregame' && (
              <button
                onClick={() => setGameStatus('live')}
                disabled={manualStatus === 'loading'}
                className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-vgd-orange hover:bg-orange-500 text-white transition-colors disabled:opacity-40"
              >
                Set Live
              </button>
            )}
            {selectedGame.status === 'live' && (
              <button
                onClick={() => setGameStatus('final')}
                disabled={manualStatus === 'loading'}
                className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-white/15 text-white/70 hover:border-white/30 transition-colors disabled:opacity-40"
              >
                Set Final
              </button>
            )}
          </div>
        )}

        {selectedGame && !manualControlOn && (
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded border border-vgd-red/30 bg-vgd-red/5">
            <p className="text-[11px] text-vgd-red/90">
              Manual control is off — the automatic CFBD sync may still touch this game's drives.
            </p>
            <button
              onClick={toggleManualControl}
              disabled={manualStatus === 'loading'}
              className="flex-shrink-0 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-vgd-red/20 text-vgd-red hover:bg-vgd-red/30 transition-colors disabled:opacity-40"
            >
              Turn On
            </button>
          </div>
        )}
        {selectedGame && manualControlOn && (
          <div className="flex items-center justify-between gap-3 px-3 py-2 rounded border border-vgd-orange/30 bg-vgd-orange/5">
            <p className="text-[11px] text-vgd-orange/90">Manual control is on — auto sync is skipping this game.</p>
            <button
              onClick={toggleManualControl}
              disabled={manualStatus === 'loading'}
              className="flex-shrink-0 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-white/15 text-white/60 hover:text-white/80 transition-colors disabled:opacity-40"
            >
              Turn Off
            </button>
          </div>
        )}

        {selectedGame && (
          <>
            {/* Drive number + status pill + Submit */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-vgd-muted">Drive</span>
                  <span className="text-2xl font-black text-white leading-none">{currentDriveNumber}</span>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                  windowStatus === 'active'
                    ? 'bg-vgd-orange/10 border-vgd-orange/40 text-vgd-orange'
                    : windowStatus === 'closed'
                    ? 'bg-vgd-red/10 border-vgd-red/30 text-vgd-red'
                    : 'bg-white/[0.03] border-white/10 text-white/40'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full bg-current ${windowStatus === 'active' ? 'animate-pulse' : ''}`} />
                  {windowStatus === 'active' ? `Active · ${formatCountdown(remainingSeconds)}` : windowStatus === 'closed' ? 'Closed — awaiting result' : 'Pending'}
                </span>
              </div>
              <ActionButton onClick={submit} disabled={!manualControlOn || !selectedOutcome || opStatus === 'loading'}>
                <span className="flex items-center gap-1.5"><Check className="w-3 h-3" /> Submit</span>
              </ActionButton>
            </div>

            {/* Prep fields */}
            <div className="grid grid-cols-2 gap-2">
              <LabelInput label="Quarter" value={displayQuarter} onChange={setQuarter} type="number" />
              <div>
                <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-0.5">Yardline</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={displayYardlineNum}
                    onChange={e => setYardline(e.target.value)}
                    disabled={fieldsDisabled}
                    className="w-16 bg-vgd-bg border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-vgd-orange/50 disabled:opacity-50"
                  />
                  <div className="flex flex-1 rounded border border-white/10 overflow-hidden">
                    <button
                      onClick={() => setYardlineSide('own')}
                      disabled={fieldsDisabled}
                      className={`flex-1 text-[10px] font-bold border-r border-white/10 disabled:opacity-50 ${displaySide === 'own' ? 'bg-vgd-orange text-white' : 'bg-vgd-bg text-white/50'}`}
                    >
                      OWN
                    </button>
                    <button
                      onClick={() => setYardlineSide('opp')}
                      disabled={fieldsDisabled}
                      className={`flex-1 text-[10px] font-bold disabled:opacity-50 ${displaySide === 'opp' ? 'bg-vgd-orange text-white' : 'bg-vgd-bg text-white/50'}`}
                    >
                      OPP
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setLowClock(v => !v)}
              disabled={fieldsDisabled}
              className={`flex items-center gap-2 self-start px-3 py-1.5 rounded border text-[11px] font-semibold disabled:opacity-50 ${
                displayLowClock ? 'bg-vgd-orange/10 border-vgd-orange/40 text-vgd-orange' : 'bg-vgd-bg border-white/15 text-white/60'
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${displayLowClock ? 'border-vgd-orange' : 'border-white/40'}`}>
                {displayLowClock && <Check className="w-2.5 h-2.5" />}
              </span>
              Under 2:00 left in the quarter
            </button>

            {zone && (
              <p className="text-[11px] text-vgd-orange">Field position: {fieldPositionLabel(progress)} — {zone} — this shifts the point odds below.</p>
            )}

            {/* Window activation */}
            <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-white/[0.06]">
              <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Window</span>
              <div className="flex rounded border border-white/10 overflow-hidden">
                {durationOptions.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setDurationChoice(d.value)}
                    disabled={fieldsDisabled}
                    className={`px-2.5 py-1 text-[11px] font-bold border-r border-white/10 last:border-r-0 disabled:opacity-50 ${
                      durationChoice === d.value ? 'bg-vgd-orange text-white' : 'bg-vgd-bg text-white/50'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <button
                onClick={activate}
                disabled={!manualControlOn || fieldsDisabled || opStatus === 'loading'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-vgd-orange hover:bg-orange-500 text-white text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-3 h-3" /> Active
              </button>
              <button
                onClick={reset}
                disabled={!manualControlOn || !currentRow || opStatus === 'loading'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/15 text-white/70 text-[11px] font-bold uppercase tracking-wider hover:border-white/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            </div>

            {/* Outcome picker */}
            <div>
              <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Outcome</label>
              <div className="grid grid-cols-3 gap-1.5">
                {DRIVE_OUTCOMES.map(o => (
                  <button
                    key={o.key}
                    onClick={() => setSelectedOutcome(o.key)}
                    className={`py-2 px-1.5 rounded border text-[11px] font-bold transition-colors ${outcomeClasses(o.polarity, selectedOutcome === o.key)}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {!selectedOutcome && <p className="text-[10px] text-vgd-muted mt-1.5">Select an outcome to enable Submit.</p>}
            </div>

            <OpResult status={opStatus} message={opMsg} />
          </>
        )}
      </div>

      {selectedGame && (
        <div className="border-t border-white/[0.07]">
          <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Drive History</span>
            <span className="text-[10px] text-vgd-muted">{history.length} drives</span>
          </div>
          {history.length === 0 ? (
            <p className="px-4 pb-4 text-[11px] text-vgd-muted">No settled drives yet.</p>
          ) : (
            <div>
              {history.map(h => {
                const progressH = h.yardline;
                const editing = editingHistoryDrive === h.drive_number;
                return (
                  <div key={h.id} className="flex items-center justify-between gap-3 px-4 py-2 border-b border-white/[0.05] last:border-0">
                    <div className="flex items-baseline gap-2.5 min-w-0">
                      <span className="text-xs font-bold text-white/70 whitespace-nowrap">Drive {h.drive_number}</span>
                      <span className="text-[11px] text-white/30 whitespace-nowrap">
                        Q{h.quarter} · {fieldPositionLabel(progressH)}{h.game_clock === LOW_CLOCK_TEXT ? ' · <2:00 left' : ''}
                      </span>
                    </div>
                    {editing ? (
                      <div className="flex flex-wrap items-center gap-1 justify-end">
                        {DRIVE_OUTCOMES.map(o => (
                          <button
                            key={o.key}
                            onClick={() => correctHistoryOutcome(h.drive_number, o.key)}
                            className={`px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${outcomeClasses(o.polarity, o.key === h.actual_outcome)}`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${outcomeClasses(DRIVE_OUTCOMES.find(o => o.key === h.actual_outcome)?.polarity ?? 'neu', false)}`}>
                          {h.actual_outcome ? outcomeLabel(h.actual_outcome) : '—'}
                        </span>
                        <button
                          onClick={() => setEditingHistoryDrive(h.drive_number)}
                          className="w-5 h-5 flex items-center justify-center rounded text-white/30 hover:text-white/60"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {editingHistoryDrive !== null && (
                <p className="px-4 py-2 text-[10px] text-vgd-muted border-t border-white/[0.05]">
                  Corrects the recorded outcome only — points/streaks already awarded for that drive are not recalculated.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </DashboardCard>
  );
}

// ─── Panel: Weekly Prop Bets ────────────────────────────────────────────────────
//
// Configures each week's player/team prop lines (e.g. "DeSean Bishop TDs
// 2.5") that render in PreGamePredictions' unified Over/Under table
// alongside Spread and Total Points. Also where the actual result gets
// entered after the game — CFBD's box score doesn't cover most of these
// (tackles, receptions), so grading is manual.

interface GamePropRow {
  id: string;
  description: string;
  line: number;
  actual_value: number | null;
  actual_result: string | null;
}

function WeeklyPropBetsPanel({ games }: { games: LiveGame[] }) {
  const [gameId, setGameId] = useState('');
  const [props, setProps] = useState<GamePropRow[]>([]);
  const [newDescription, setNewDescription] = useState('');
  const [newLine, setNewLine] = useState('');
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<OpStatus>('idle');
  const [msg, setMsg] = useState('');

  const gameOptions = [{ value: '', label: 'Select game…' }, ...games.map(g => ({
    value: g.id,
    label: `${g.away_team} @ ${g.home_team} [${g.status}]`,
  }))];

  function fetchProps(id: string) {
    supabase
      .from('game_props')
      .select('id, description, line, actual_value, actual_result')
      .eq('game_id', id)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setProps((data as GamePropRow[]) ?? []));
  }

  useEffect(() => {
    if (!gameId) { setProps([]); return; }
    fetchProps(gameId);
  }, [gameId]);

  async function addProp() {
    if (!gameId || !newDescription.trim() || !newLine) return;
    setStatus('loading');
    const { error } = await supabase.rpc('admin_upsert_game_prop', {
      p_game_id: gameId,
      p_description: newDescription.trim(),
      p_line: parseFloat(newLine),
      p_sort_order: props.length,
    });
    if (error) { setStatus('error'); setMsg(error.message); }
    else {
      setStatus('idle');
      setNewDescription('');
      setNewLine('');
      fetchProps(gameId);
    }
  }

  async function deleteProp(id: string) {
    setStatus('loading');
    const { error } = await supabase.rpc('admin_delete_game_prop', { p_id: id });
    if (error) { setStatus('error'); setMsg(error.message); }
    else { setStatus('idle'); fetchProps(gameId); }
  }

  async function gradeProp(id: string) {
    const val = gradeInputs[id];
    if (!val) return;
    setStatus('loading');
    const { error } = await supabase.rpc('admin_grade_game_prop', {
      p_id: id,
      p_actual_value: parseFloat(val),
    });
    if (error) { setStatus('error'); setMsg(error.message); }
    else { setStatus('idle'); fetchProps(gameId); }
  }

  return (
    <DashboardCard title="Weekly Prop Bets" statusDotColor="#FF8200">
      <div className="p-4 space-y-3">
        <SelectInput label="Game" value={gameId} onChange={setGameId} options={gameOptions} />

        {gameId && (
          <>
            {props.length > 0 && (
              <div className="border border-white/10 rounded-lg overflow-hidden">
                {props.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/[0.05] last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white/85 truncate">{p.description} <span className="text-white/40">(O/U {p.line})</span></p>
                      {p.actual_result ? (
                        <p className="text-[10px] text-vgd-orange mt-0.5">
                          Graded: {p.actual_value} — {p.actual_result.toUpperCase()}
                        </p>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            type="number" placeholder="Actual value" value={gradeInputs[p.id] ?? ''}
                            onChange={e => setGradeInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                            className="w-24 bg-vgd-bg border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-vgd-orange/50"
                          />
                          <button
                            onClick={() => gradeProp(p.id)}
                            disabled={!gradeInputs[p.id] || status === 'loading'}
                            className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-vgd-orange/20 text-vgd-orange hover:bg-vgd-orange/30 disabled:opacity-40"
                          >
                            Grade
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => deleteProp(p.id)}
                      disabled={status === 'loading'}
                      className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-white/30 hover:text-vgd-red disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-[1fr_80px_auto] gap-2 items-end">
              <LabelInput label="Description" value={newDescription} onChange={setNewDescription} placeholder="Player Stat" />
              <LabelInput label="Line" value={newLine} onChange={setNewLine} type="number" placeholder="2.5" />
              <ActionButton onClick={addProp} disabled={!newDescription.trim() || !newLine || status === 'loading'}>
                <span className="flex items-center gap-1"><Plus className="w-3 h-3" /> Add</span>
              </ActionButton>
            </div>

            <OpResult status={status} message={msg} />
          </>
        )}
      </div>
    </DashboardCard>
  );
}

// ─── Panel: Finalized Game Stats ───────────────────────────────────────────────
//
// The one deliberate action that scores pregame predictions and credits real
// points (see finalize_game() / CLAUDE.md) — never automatic. finalize-game
// itself now pulls the final score and each team's total yards from CFBD
// (on top of the TN rushing/receiving TDs and turnovers-forced it already
// fetched), so this stays a single button: no manual score entry needed,
// even for a manually-controlled game that live-cfbd-sync never touched.
// Player-level prop-bet stats (not yet a built feature) will get their own
// manual-entry UI once that scoring category exists — nothing to add here yet.

function FinalizedGameStatsPanel({ games, onRefresh }: { games: LiveGame[]; onRefresh: () => void }) {
  const [gameId, setGameId] = useState('');
  const [status, setStatus] = useState<OpStatus>('idle');
  const [msg, setMsg] = useState('');

  const gameOptions = [
    { value: '', label: 'Select game…' },
    ...games.filter(g => g.status !== 'calculated').map(g => ({
      value: g.id,
      label: `${g.away_team} @ ${g.home_team} [${g.status}]`,
    })),
  ];

  async function finalize() {
    if (!gameId) return;
    setStatus('loading');
    const { data, error } = await supabase.functions.invoke('finalize-game', {
      body: { game_id: gameId },
    });
    if (error) { setStatus('error'); setMsg(error.message); }
    else {
      setStatus('ok');
      const warn = data?.warnings?.length ? ` (warnings: ${data.warnings.join('; ')})` : '';
      setMsg(`Game finalized — final score/yards pulled from CFBD, pregame points calculated.${warn}`);
      setGameId('');
      onRefresh();
    }
  }

  return (
    <DashboardCard title="Finalized Game Stats" statusDotColor="#FF8200">
      <div className="p-4 space-y-3">
        <SelectInput label="Game" value={gameId} onChange={setGameId} options={gameOptions} />
        <ActionButton onClick={finalize} disabled={!gameId || status === 'loading'}>Finalize Game</ActionButton>
        <OpResult status={status} message={msg} />
      </div>
    </DashboardCard>
  );
}

// ─── Panel: Scraped Content Review ───────────────────────────────────────────

interface ScrapedVideo {
  id: string;
  title: string;
  source_url?: string;
  youtube_video_id?: string;
  sport_category: string;
  channel_name?: string | null;
  published_at: string | null;
  view_count: number;
  ingested_at: string;
  is_hidden: boolean;
  is_pinned: boolean;
}

const VIDEO_COLS =
  'id, title, source_url:video_url, youtube_video_id, sport_category, channel_name, published_at, view_count, ingested_at, is_hidden, is_pinned';

interface ScrapedArticle {
  id: string;
  title: string;
  source_url: string;
  source_name: string | null;
  sport_category: string;
  ingested_at: string;
  is_hidden: boolean;
  is_pinned: boolean;
}

type ContentTab = 'videos' | 'articles';

const SPORT_CATEGORIES = [
  { value: 'main', label: 'Main' },
  { value: 'football', label: 'Football' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'baseball', label: 'Baseball' },
  { value: 'lv-basketball', label: 'Lady Vols Basketball' },
  { value: 'lv-softball', label: 'Lady Vols Softball' },
  { value: 'football-recruiting', label: 'Football Recruiting' },
  { value: 'basketball-recruiting', label: 'Basketball Recruiting' },
  { value: 'other', label: 'Other' },
];

function stripQueryParams(url: string): string {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch {
    return url.split('?')[0];
  }
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([\w-]{11})/,
    /[?&]v=([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ScrapedContentReview() {
  const [tab, setTab] = useState<ContentTab>('videos');
  const [videos, setVideos] = useState<ScrapedVideo[]>([]);
  const [articles, setArticles] = useState<ScrapedArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addUrl, setAddUrl] = useState('');
  const [addCategory, setAddCategory] = useState('main');
  const [addStatus, setAddStatus] = useState<OpStatus>('idle');
  const [addMsg, setAddMsg] = useState('');
  const [search, setSearch] = useState('');
  const [mainPageIds, setMainPageIds] = useState<Set<string>>(new Set());

  // Runs the exact same priority/fallback queries and selection rules as the
  // public Main Page's "Latest" view (see selectMainPageVideos), so this
  // always agrees with what a visitor actually sees there right now.
  async function loadMainPageVideos(): Promise<ScrapedVideo[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const cutoffISO = cutoff.toISOString();

    const [priorityRes, fallbackRes] = await Promise.all([
      supabase
        .from('scraped_videos')
        .select(VIDEO_COLS)
        .in('channel_priority', [1, 2])
        .eq('is_hidden', false)
        .gte('published_at', cutoffISO)
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(200),
      supabase
        .from('scraped_videos')
        .select(VIDEO_COLS)
        .eq('sport_category', 'main')
        .is('channel_priority', null)
        .eq('is_hidden', false)
        .gte('published_at', cutoffISO)
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(24),
    ]);

    const priority = (priorityRes.data ?? []) as ScrapedVideo[];
    const fallback = (fallbackRes.data ?? []) as ScrapedVideo[];
    return selectMainPageVideos(priority, fallback, 'latest');
  }

  // The default recent-100-by-ingested_at view only shows what's just been
  // (re-)ingested — an older row that hasn't been touched by a recent scrape
  // silently falls out of it even though it's still live on the public site
  // (public queries filter by published_at, not ingested_at). Search bypasses
  // that cap entirely so any row can still be found and moderated. Outside of
  // search, the videos currently on the Main Page are pinned to the front of
  // the list — regardless of ingested_at — so a broken one is always exactly
  // as easy to find here as it is to spot on the live site.
  async function loadVideos(term = search) {
    setLoading(true);

    if (term.trim()) {
      const { data } = await supabase
        .from('scraped_videos')
        .select(VIDEO_COLS)
        .ilike('title', `%${term.trim()}%`)
        .order('ingested_at', { ascending: false })
        .limit(200);
      setVideos((data ?? []) as ScrapedVideo[]);
      setMainPageIds(new Set());
      setLoading(false);
      return;
    }

    const [mainPage, recentRes] = await Promise.all([
      loadMainPageVideos(),
      supabase.from('scraped_videos').select(VIDEO_COLS).order('ingested_at', { ascending: false }).limit(100),
    ]);
    const recent = (recentRes.data ?? []) as ScrapedVideo[];
    const mainPageIdSet = new Set(mainPage.map((v) => v.id));
    const rest = recent.filter((v) => !mainPageIdSet.has(v.id));
    setVideos([...mainPage, ...rest]);
    setMainPageIds(mainPageIdSet);
    setLoading(false);
  }

  async function loadArticles(term = search) {
    setLoading(true);
    let query = supabase
      .from('scraped_articles')
      .select('id, title, source_url, source_name, sport_category, ingested_at, is_hidden, is_pinned');
    query = term.trim()
      ? query.ilike('title', `%${term.trim()}%`).order('ingested_at', { ascending: false }).limit(200)
      : query.order('ingested_at', { ascending: false }).limit(100);
    const { data } = await query;
    setArticles((data ?? []) as ScrapedArticle[]);
    setLoading(false);
  }

  useEffect(() => {
    if (tab === 'videos') loadVideos();
    else loadArticles();
  }, [tab]);

  const isFirstSearch = useRef(true);
  useEffect(() => {
    if (isFirstSearch.current) { isFirstSearch.current = false; return; }
    const timer = setTimeout(() => {
      if (tab === 'videos') loadVideos(search);
      else loadArticles(search);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function hideVideo(id: string) {
    const { error } = await supabase
      .from('scraped_videos')
      .update({ is_hidden: true })
      .eq('id', id);
    if (error) { setActionMsg(`Error: ${error.message}`); return; }
    setVideos((prev) => prev.map((v) => v.id === id ? { ...v, is_hidden: true } : v));
    setActionMsg('Video hidden from public view.');
  }

  async function deleteVideo(id: string) {
    const video = videos.find((v) => v.id === id);
    if (video?.youtube_video_id) {
      await supabase.from('content_blocklist').upsert({
        content_type: 'video',
        external_id: video.youtube_video_id,
      }, { onConflict: 'content_type,external_id' });
    }
    const { error } = await supabase.from('scraped_videos').delete().eq('id', id);
    if (error) { setActionMsg(`Error: ${error.message}`); return; }
    setVideos((prev) => prev.filter((v) => v.id !== id));
    setActionMsg('Video deleted and blocklisted.');
  }

  async function pinVideo(id: string, pinned: boolean) {
    const { error } = await supabase
      .from('scraped_videos')
      .update({ is_pinned: pinned })
      .eq('id', id);
    if (error) { setActionMsg(`Error: ${error.message}`); return; }
    setVideos((prev) => prev.map((v) => v.id === id ? { ...v, is_pinned: pinned } : v));
    setActionMsg(pinned ? 'Video pinned.' : 'Video unpinned.');
  }

  async function hideArticle(id: string) {
    const { error } = await supabase
      .from('scraped_articles')
      .update({ is_hidden: true })
      .eq('id', id);
    if (error) { setActionMsg(`Error: ${error.message}`); return; }
    setArticles((prev) => prev.map((a) => a.id === id ? { ...a, is_hidden: true } : a));
    setActionMsg('Article hidden from public view.');
  }

  async function deleteArticle(id: string) {
    const article = articles.find((a) => a.id === id);
    if (article?.source_url) {
      await supabase.from('content_blocklist').upsert({
        content_type: 'article',
        external_id: stripQueryParams(article.source_url),
      }, { onConflict: 'content_type,external_id' });
    }
    const { error } = await supabase.from('scraped_articles').delete().eq('id', id);
    if (error) { setActionMsg(`Error: ${error.message}`); return; }
    setArticles((prev) => prev.filter((a) => a.id !== id));
    setActionMsg('Article deleted and blocklisted.');
  }

  async function pinArticle(id: string, pinned: boolean) {
    const updates: Record<string, unknown> = { is_pinned: pinned };
    if (pinned) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 14);
      updates.pin_expires_at = expiry.toISOString();
    } else {
      updates.pin_expires_at = null;
    }
    const { error } = await supabase
      .from('scraped_articles')
      .update(updates)
      .eq('id', id);
    if (error) { setActionMsg(`Error: ${error.message}`); return; }
    setArticles((prev) => prev.map((a) => a.id === id ? { ...a, is_pinned: pinned } : a));
    setActionMsg(pinned ? 'Article pinned for 14 days.' : 'Article unpinned.');
  }

  async function handleAdd() {
    if (!addUrl.trim()) return;
    setAddStatus('loading');
    setAddMsg('');

    try {
      if (tab === 'videos') {
        const videoId = extractYouTubeId(addUrl.trim());
        if (!videoId) {
          setAddStatus('error');
          setAddMsg('Could not extract YouTube video ID from URL.');
          return;
        }

        const { data, error } = await supabase.functions.invoke('cfbd-data', {
          body: { type: 'youtube_lookup', videoId },
        });

        if (error || data?.error) {
          setAddStatus('error');
          setAddMsg(data?.message ?? error?.message ?? 'YouTube lookup failed.');
          return;
        }

        const v = data.video;
        const { error: insertError } = await supabase.from('scraped_videos').insert({
          youtube_video_id: videoId,
          title: v.title,
          thumbnail_url: v.thumbnail_url,
          video_url: `https://www.youtube.com/watch?v=${videoId}`,
          duration: v.duration,
          view_count: v.view_count ?? 0,
          sport_category: addCategory,
          published_at: v.published_at,
          ingested_at: new Date().toISOString(),
          is_pinned: true,
        });

        if (insertError) {
          setAddStatus('error');
          setAddMsg(insertError.message);
          return;
        }

        setAddStatus('ok');
        setAddMsg(`Added: ${v.title}`);
        setAddUrl('');
        loadVideos();
      } else {
        const { data, error } = await supabase.functions.invoke('cfbd-data', {
          body: { type: 'article_scrape', url: addUrl.trim(), sport_category: addCategory },
        });

        if (error || data?.error) {
          setAddStatus('error');
          setAddMsg(data?.message ?? error?.message ?? 'Article scrape failed.');
          return;
        }

        setAddStatus('ok');
        setAddMsg(`Added: ${data.article.title}`);
        setAddUrl('');
        loadArticles();
      }
    } catch (err) {
      setAddStatus('error');
      setAddMsg(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  const rows = tab === 'videos' ? videos : articles;

  return (
    <DashboardCard
      title="Scraped Content Review"
      metadataTag={
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTab('videos')}
            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
              tab === 'videos'
                ? 'bg-vgd-orange/20 border-vgd-orange/50 text-vgd-orange'
                : 'border-white/[0.08] text-white/40 hover:text-white/70'
            }`}
          >
            Videos
          </button>
          <button
            onClick={() => setTab('articles')}
            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
              tab === 'articles'
                ? 'bg-vgd-orange/20 border-vgd-orange/50 text-vgd-orange'
                : 'border-white/[0.08] text-white/40 hover:text-white/70'
            }`}
          >
            Articles
          </button>
          <button
            onClick={() => { setShowAdd((s) => !s); setAddStatus('idle'); setAddMsg(''); }}
            className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
              showAdd
                ? 'bg-vgd-orange/20 text-vgd-orange'
                : 'text-white/30 hover:text-white/70 hover:bg-white/[0.06]'
            }`}
            title={`Add ${tab === 'videos' ? 'Video' : 'Article'}`}
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={() => tab === 'videos' ? loadVideos() : loadArticles()}
            className="w-5 h-5 flex items-center justify-center rounded text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      }
    >
      {actionMsg && (
        <div className="mx-4 mt-3 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400 flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg('')} className="text-white/30 hover:text-white/60 ml-2 text-sm leading-none">&times;</button>
        </div>
      )}

      <div className="mx-4 mt-3 relative">
        <Search className="w-3.5 h-3.5 text-white/30 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${tab} by title… (bypasses the recent-100 view)`}
          className="w-full bg-vgd-bg border border-white/10 rounded px-2 py-1.5 pl-8 text-xs text-white focus:outline-none focus:border-vgd-orange/50"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {showAdd && (
        <div className="mx-4 mt-3 p-3 bg-white/[0.03] border border-white/[0.08] rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-vgd-orange">
              Add {tab === 'videos' ? 'Video' : 'Article'}
            </span>
            <button
              onClick={() => { setShowAdd(false); setAddStatus('idle'); setAddMsg(''); }}
              className="w-4 h-4 flex items-center justify-center text-white/30 hover:text-white/60"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <input
            type="text"
            value={addUrl}
            onChange={(e) => setAddUrl(e.target.value)}
            placeholder={tab === 'videos' ? 'Paste YouTube URL…' : 'Paste article URL…'}
            className="w-full bg-vgd-bg border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-vgd-orange/50"
          />
          <SelectInput label="Sport Category" value={addCategory} onChange={setAddCategory} options={SPORT_CATEGORIES} />
          <ActionButton onClick={handleAdd} disabled={addStatus === 'loading' || !addUrl.trim()}>
            Add {tab === 'videos' ? 'Video' : 'Article'}
          </ActionButton>
          <OpResult status={addStatus} message={addMsg} />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-xs text-white/40">
          <Loader className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-white/30 text-center py-10">
          {search ? `No ${tab} match "${search}".` : `No ${tab} ingested yet.`}
        </p>
      ) : (
        <div className="divide-y divide-white/[0.05] max-h-[500px] overflow-y-auto">
          {rows.map((row, i) => {
            const isMainPage = tab === 'videos' && mainPageIds.has(row.id);
            const prevIsMainPage = i > 0 && tab === 'videos' && mainPageIds.has(rows[i - 1].id);
            const showMainHeader = tab === 'videos' && !search && i === 0 && mainPageIds.size > 0;
            const showOtherHeader = tab === 'videos' && !search && i > 0 && prevIsMainPage && !isMainPage;
            return (
              <div key={row.id}>
                {showMainHeader && (
                  <div className="px-4 pt-2.5 pb-1 text-[9px] font-bold uppercase tracking-wider text-green-400/80">
                    On Main Page Right Now ({mainPageIds.size})
                  </div>
                )}
                {showOtherHeader && (
                  <div className="px-4 pt-2.5 pb-1 text-[9px] font-bold uppercase tracking-wider text-white/30">
                    Other Recent Videos
                  </div>
                )}
                <div
                  className={`flex items-start gap-3 px-4 py-2.5 group ${row.is_hidden ? 'opacity-40' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-white/85 line-clamp-1 leading-snug">
                      {row.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-vgd-orange/70 font-medium">
                        {tab === 'articles' ? (row as ScrapedArticle).source_name ?? row.sport_category : row.sport_category}
                      </span>
                      {tab === 'videos' && (row as ScrapedVideo).channel_name && (
                        <span className="text-[10px] text-vgd-muted truncate max-w-[140px]">
                          {(row as ScrapedVideo).channel_name}
                        </span>
                      )}
                      <span className="text-[10px] text-vgd-muted">{timeAgo(row.ingested_at)}</span>
                      {isMainPage && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full">
                          On Main Page
                        </span>
                      )}
                      {row.is_hidden && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-red-400/70 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                          Hidden
                        </span>
                      )}
                      {row.is_pinned && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-vgd-orange bg-vgd-orange/10 px-1.5 py-0.5 rounded-full">
                          Pinned
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => tab === 'videos'
                        ? pinVideo(row.id, !row.is_pinned)
                        : pinArticle(row.id, !row.is_pinned)}
                      title={row.is_pinned ? 'Unpin' : 'Pin to top'}
                      className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                        row.is_pinned
                          ? 'text-vgd-orange hover:bg-vgd-orange/20'
                          : 'text-white/30 hover:text-vgd-orange hover:bg-vgd-orange/10'
                      }`}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    {!row.is_hidden && (
                      <button
                        onClick={() => tab === 'videos' ? hideVideo(row.id) : hideArticle(row.id)}
                        title="Hide from public"
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-yellow-500/20 text-white/30 hover:text-yellow-400 transition-colors"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => tab === 'videos' ? deleteVideo(row.id) : deleteArticle(row.id)}
                      title="Delete permanently"
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 text-white/30 hover:text-vgd-red transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardCard>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Admin() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<LiveGame[]>([]);

  useEffect(() => {
    if (!loading && !profile?.is_admin) {
      navigate('/', { replace: true });
    }
  }, [loading, profile, navigate]);

  async function loadGames() {
    const { data } = await supabase
      .from('live_games')
      .select('id, cfbd_game_id, home_team, away_team, kickoff_time, status, home_score, away_score, manual_control')
      .order('kickoff_time', { ascending: false })
      .limit(20);
    setGames((data ?? []) as LiveGame[]);
  }

  useEffect(() => {
    if (profile?.is_admin) loadGames();
  }, [profile?.is_admin]);

  if (loading || !profile?.is_admin) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-black text-white uppercase tracking-wide">Admin Dashboard</h1>
        <p className="text-xs text-vgd-muted mt-0.5">Dev test tools — admin only</p>
      </div>

      <LiveDriveControlPanel games={games} onRefresh={loadGames} />
      <WeeklyPropBetsPanel games={games} />
      <FinalizedGameStatsPanel games={games} onRefresh={loadGames} />

      <ScrapedContentReview />
    </div>
  );
}
