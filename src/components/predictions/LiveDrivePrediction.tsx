import { useState, useEffect, useRef } from 'react';
import { Flame, Lock, CheckCircle, Clock, ListChecks } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { DashboardCard } from '../ui/DashboardCard';
import { MyPicksModal } from './MyPicksModal';
import type { LiveGame } from '../game/LiveGameStatsPanel';

// ─── Types ───────────────────────────────────────────────────────────────────

type DriveOutcome =
  | 'touchdown'
  | 'field_goal'
  | 'punt'
  | 'turnover'
  | 'safety'
  | 'turnover_on_downs'
  | 'end_of_quarter';

interface DriveWindow {
  id: string;
  game_id: string;
  drive_number: number;
  window_opened_at: string;
  window_locked_at: string;
  status: 'open' | 'locked' | 'resolved';
  actual_outcome: DriveOutcome | null;
  pts_touchdown: number;
  pts_field_goal: number;
  pts_punt: number;
  pts_turnover: number;
  pts_safety: number;
  pts_turnover_on_downs: number;
  pts_end_of_quarter: number;
  yardline: number | null;
  down: number | null;
  distance: number | null;
  score_differential: number | null;
  quarter: number | null;
  game_clock: string | null;
}

interface MyPick {
  prediction: DriveOutcome;
  points_earned: number | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OUTCOME_BUTTONS: { outcome: DriveOutcome; label: string; ptKey: keyof DriveWindow }[] = [
  { outcome: 'touchdown',         label: 'Touchdown',         ptKey: 'pts_touchdown' },
  { outcome: 'field_goal',        label: 'Field Goal',        ptKey: 'pts_field_goal' },
  { outcome: 'punt',              label: 'Punt',              ptKey: 'pts_punt' },
  { outcome: 'turnover',          label: 'Turnover',          ptKey: 'pts_turnover' },
  { outcome: 'safety',            label: 'Safety',            ptKey: 'pts_safety' },
  { outcome: 'turnover_on_downs', label: 'Turnover on Downs', ptKey: 'pts_turnover_on_downs' },
  { outcome: 'end_of_quarter',    label: 'End of Half/Game',  ptKey: 'pts_end_of_quarter' },
];

const MULTIPLIER_LABELS: Record<number, string> = {
  1: '1.00x',
  2: '1.25x',
  3: '1.50x',
  4: '2.00x',
  5: '3.00x',
};

function getMultiplierLabel(streak: number): string {
  if (streak >= 6) return '4.00x';
  return MULTIPLIER_LABELS[streak] ?? '1.00x';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

// ─── Outcome result badge ─────────────────────────────────────────────────────

function OutcomeTag({ outcome, correct }: { outcome: DriveOutcome; correct: boolean | null }) {
  const label = OUTCOME_BUTTONS.find(b => b.outcome === outcome)?.label ?? outcome;
  return (
    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
      correct === true
        ? 'bg-green-400/10 border-green-400/40 text-green-400'
        : correct === false
        ? 'bg-vgd-red/10 border-vgd-red/40 text-vgd-red'
        : 'bg-white/5 border-white/10 text-white/60'
    }`}>
      {label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props { game: LiveGame | null }

export function LiveDrivePrediction({ game }: Props) {
  const { session, profile, openAuthModal } = useAuth();

  // Non-gameday waiting state
  if (!game) {
    return (
      <DashboardCard
        title="DRIVE PREDICTION"
        metadataTag={
          <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">WAITING</span>
        }
        className="h-full"
      >
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center px-4">
          <div className="w-10 h-10 rounded-full border-2 border-white/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-vgd-muted" />
          </div>
          <p className="text-xs text-vgd-muted">No live game right now.</p>
          <p className="text-[10px] text-white/30">Drive predictions activate at kickoff.</p>
        </div>
      </DashboardCard>
    );
  }

  const [window_, setWindow] = useState<DriveWindow | null>(null);
  const [myPick, setMyPick]   = useState<MyPick | null>(null);
  const [secsLeft, setSecsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [recentResult, setRecentResult] = useState<{
    outcome: DriveOutcome;
    correct: boolean;
    pts: number;
  } | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showMyPicks, setShowMyPicks] = useState(false);

  // Tracks the currently-displayed window's id outside React's render cycle
  // so the Realtime handler below (set up once per game/session, not per
  // window) can tell a genuinely new drive from a redundant update to the
  // same still-open one — without this, any duplicate/no-op update to an
  // open window wipes the user's already-submitted pick.
  const windowIdRef = useRef<string | null>(null);
  useEffect(() => { windowIdRef.current = window_?.id ?? null; }, [window_?.id]);

  // ── Subscribe to latest open/locked drive window for this game ──────────────
  useEffect(() => {
    async function fetchLatest() {
      const { data } = await supabase
        .from('drive_windows')
        .select('*')
        .eq('game_id', game.id)
        .in('status', ['open', 'locked'])
        .order('drive_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      setWindow(data as DriveWindow | null);
    }

    fetchLatest();

    const channel = supabase
      .channel(`drive_windows:${game.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drive_windows',
          filter: `game_id=eq.${game.id}`,
        },
        (payload) => {
          const updated = payload.new as DriveWindow;
          if (updated.status === 'resolved') {
            // Show result briefly if user had a pick, then clear
            setWindow(prev => {
              if (prev?.id === updated.id) {
                return null; // remove the window — anti-spoiler handled by never rendering open outcome
              }
              return prev;
            });
            // Fetch user's pick result for this drive, then show it
            if (session) {
              supabase
                .from('drive_predictions')
                .select('prediction, points_earned')
                .eq('game_id', game.id)
                .eq('drive_number', updated.drive_number)
                .eq('user_id', session.user.id)
                .maybeSingle()
                .then(({ data }) => {
                  if (data) {
                    const correct = data.prediction === updated.actual_outcome;
                    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
                    setRecentResult({
                      outcome: updated.actual_outcome!,
                      correct,
                      pts: data.points_earned ?? 0,
                    });
                    resultTimerRef.current = setTimeout(() => setRecentResult(null), 8000);
                  }
                });
            }
            // After a short delay, try to fetch the next open window
            setTimeout(fetchLatest, 500);
            return;
          }
          setWindow(updated);
          // Only clear the user's pick/error when this is actually a new
          // drive's window — a redundant update to the same still-open
          // window (e.g. a re-run open call) must not wipe an already
          // submitted pick out from under the user.
          if (updated.id !== windowIdRef.current) {
            setMyPick(null);
            setSubmitError('');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, [game.id, session]);

  // ── Load user's existing pick for current window ────────────────────────────
  useEffect(() => {
    if (!session || !window_) { setMyPick(null); return; }
    supabase
      .from('drive_predictions')
      .select('prediction, points_earned')
      .eq('game_id', game.id)
      .eq('drive_number', window_.drive_number)
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setMyPick(data as MyPick | null));
  }, [session, window_?.id]);

  // ── Countdown from window_locked_at ─────────────────────────────────────────
  useEffect(() => {
    if (!window_ || window_.status !== 'open') { setSecsLeft(0); return; }
    const lockAt = new Date(window_.window_locked_at).getTime();
    const tick = () => {
      const rem = Math.max(0, lockAt - Date.now());
      setSecsLeft(Math.ceil(rem / 1000));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [window_?.id, window_?.status, window_?.window_locked_at]);

  // ── Submit pick ─────────────────────────────────────────────────────────────
  async function handlePick(outcome: DriveOutcome) {
    if (!session) return openAuthModal('register');
    if (!window_ || window_.status !== 'open') return;
    setSubmitting(true);
    setSubmitError('');
    const { error } = await supabase.rpc('submit_drive_prediction', {
      p_game_id: game.id,
      p_drive_number: window_.drive_number,
      p_prediction: outcome,
    });
    setSubmitting(false);
    if (error) {
      setSubmitError(error.message ?? 'Could not save pick.');
    } else {
      setMyPick({ prediction: outcome, points_earned: null });
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const isLocked = !window_ || window_.status === 'locked';
  const hasPick  = !!myPick;
  const streak   = profile?.current_streak ?? 0;
  const isHot    = profile?.hot_streak_active ?? false;

  const countdown = window_?.status === 'open' ? secsLeft : 0;
  const urgentCountdown = countdown <= 10 && countdown > 0;

  const metaTag = window_ ? (
    window_.status === 'open' ? (
      <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
        urgentCountdown ? 'text-vgd-red animate-pulse' : 'text-vgd-orange'
      }`}>
        <Clock className="w-3 h-3" /> {formatCountdown(countdown * 1000)}
      </span>
    ) : (
      <span className="flex items-center gap-1 text-[10px] text-vgd-muted font-bold uppercase tracking-wider">
        <Lock className="w-3 h-3" /> LOCKED
      </span>
    )
  ) : null;

  return (
    <>
    <DashboardCard
      title={
        <span className="flex items-center gap-2">
          DRIVE PREDICTION
          {isHot && (
            <span className="flex items-center gap-0.5 text-vgd-orange text-[10px] font-bold uppercase tracking-wide">
              <Flame className="w-3.5 h-3.5 text-vgd-orange drop-shadow-[0_0_6px_rgba(255,100,0,0.8)]" />
              HOT STREAK
            </span>
          )}
        </span>
      }
      headerExtra={
        <button
          onClick={() => setShowMyPicks(true)}
          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-vgd-orange/70 hover:text-vgd-orange border border-vgd-orange/20 hover:border-vgd-orange/40 rounded-md px-2 py-1 transition-colors"
          title="View your pregame picks"
        >
          <ListChecks className="w-3 h-3" />
          My Picks
        </button>
      }
      metadataTag={metaTag}
      className="h-full"
    >
      <div className="p-3 space-y-3">

        {/* Streak multiplier indicator */}
        {session && streak > 0 && (
          <div className="flex items-center justify-between bg-vgd-orange/10 border border-vgd-orange/20 rounded-lg px-3 py-1.5">
            <span className="text-[10px] text-vgd-orange/80 uppercase tracking-wider font-semibold">
              Streak: {streak} correct
            </span>
            <span className={`text-sm font-black ${isHot ? 'text-vgd-orange drop-shadow-[0_0_8px_rgba(255,100,0,0.6)]' : 'text-vgd-orange'}`}>
              {getMultiplierLabel(streak)}
            </span>
          </div>
        )}

        {/* Recent drive result flash */}
        {recentResult && (
          <div className={`flex items-center justify-between rounded-lg px-3 py-2 border text-xs font-semibold ${
            recentResult.correct
              ? 'bg-green-400/10 border-green-400/30 text-green-400'
              : 'bg-vgd-red/10 border-vgd-red/30 text-vgd-red'
          }`}>
            <span className="flex items-center gap-1.5">
              {recentResult.correct ? <CheckCircle className="w-3.5 h-3.5" /> : null}
              {recentResult.correct ? 'Correct!' : 'Incorrect'}
              <span className="text-white/50 font-normal text-[10px] ml-1">
                {OUTCOME_BUTTONS.find(b => b.outcome === recentResult.outcome)?.label}
              </span>
            </span>
            {recentResult.correct && recentResult.pts > 0 && (
              <span className="font-black">+{recentResult.pts} pts</span>
            )}
          </div>
        )}

        {/* No active window */}
        {!window_ ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-white/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-vgd-muted" />
            </div>
            <p className="text-xs text-vgd-muted">Waiting for next drive…</p>
          </div>
        ) : (
          <>
            {/* Drive prediction prompt */}
            <p className="text-[11px] text-white/60 font-semibold uppercase tracking-wider px-1">
              Drive {window_.drive_number} — What happens?
            </p>

            {/* Already picked — show locked-in pick */}
            {hasPick && window_.status === 'open' ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 bg-vgd-orange/10 border border-vgd-orange/30 rounded-lg px-3 py-2">
                  <CheckCircle className="w-4 h-4 text-vgd-orange flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-vgd-orange">
                      {OUTCOME_BUTTONS.find(b => b.outcome === myPick.prediction)?.label}
                    </p>
                    <p className="text-[10px] text-white/40">Pick locked in</p>
                  </div>
                  <span className="text-xs text-white/50">
                    {window_[OUTCOME_BUTTONS.find(b => b.outcome === myPick.prediction)!.ptKey] as number} pts
                    {streak > 0 ? ` × ${getMultiplierLabel(streak)}` : ''}
                  </span>
                </div>
                <p className="text-[10px] text-white/30 text-center">Pick submitted — awaiting drive result</p>
              </div>
            ) : window_.status === 'locked' ? (
              <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                <Lock className="w-4 h-4 text-vgd-muted flex-shrink-0" />
                <div>
                  <p className="text-xs text-white/60">Window closed</p>
                  {hasPick && (
                    <p className="text-[10px] text-vgd-orange">
                      Your pick: {OUTCOME_BUTTONS.find(b => b.outcome === myPick!.prediction)?.label}
                    </p>
                  )}
                  {!hasPick && (
                    <p className="text-[10px] text-white/30">No pick submitted — streak will reset</p>
                  )}
                </div>
              </div>
            ) : !session ? (
              /* Logged out — show buttons but disable */
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  {OUTCOME_BUTTONS.map((btn) => (
                    <button
                      key={btn.outcome}
                      onClick={() => openAuthModal('register')}
                      className="relative flex flex-col items-center justify-center py-2.5 px-2 rounded-lg border border-white/10 text-xs text-white/40 hover:border-white/20 hover:text-white/60 transition-all group"
                    >
                      <span className="font-semibold text-[11px]">{btn.label}</span>
                      <span className="text-[10px] text-vgd-orange/60 mt-0.5">
                        {window_[btn.ptKey] as number} pts
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-center text-[10px] text-vgd-muted">
                  <button onClick={() => openAuthModal('register')} className="text-vgd-orange hover:underline">
                    Sign in
                  </button>{' '}
                  to make drive predictions
                </p>
              </div>
            ) : (
              /* Active pick buttons */
              <div className="grid grid-cols-2 gap-1.5">
                {OUTCOME_BUTTONS.map((btn) => {
                  const pts = window_[btn.ptKey] as number;
                  return (
                    <button
                      key={btn.outcome}
                      onClick={() => handlePick(btn.outcome)}
                      disabled={submitting || isLocked}
                      className={`relative flex flex-col items-center justify-center py-2.5 px-2 rounded-lg border text-xs font-semibold transition-all group ${
                        urgentCountdown
                          ? 'border-vgd-red/30 hover:border-vgd-red/60 hover:bg-vgd-red/5 text-white hover:shadow-lg hover:shadow-vgd-red/10'
                          : 'border-white/10 hover:border-vgd-orange/50 hover:bg-vgd-orange/5 text-white hover:shadow-lg hover:shadow-vgd-orange/10'
                      } disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]`}
                    >
                      <span className="text-[11px] leading-tight text-center">{btn.label}</span>
                      <span className={`text-[10px] mt-0.5 font-black ${
                        urgentCountdown ? 'text-vgd-red/80' : 'text-vgd-orange/80'
                      }`}>
                        {pts} pts
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {submitError && (
              <p className="text-[10px] text-vgd-red text-center">{submitError}</p>
            )}
          </>
        )}
      </div>
    </DashboardCard>

      <MyPicksModal game={game} open={showMyPicks} onClose={() => setShowMyPicks(false)} />
    </>
  );
}
