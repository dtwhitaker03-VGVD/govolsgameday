import { useState, useEffect, useRef, useCallback } from 'react';
import { HelpCircle, Lock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { DashboardCard } from '../ui/DashboardCard';
import type { LiveGame } from '../game/LiveGameStatsPanel';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PregamePrediction {
  id: string;
  predicted_winner: 'home' | 'away';
  predicted_home_score: number;
  predicted_away_score: number;
  predicted_home_yards: number;
  predicted_away_yards: number;
  winner_correct: boolean | null;
  home_score_points: number | null;
  away_score_points: number | null;
  home_yards_points: number | null;
  away_yards_points: number | null;
  total_pregame_points: number | null;
}

interface FormState {
  winner: 'home' | 'away' | '';
  tnScore: string;
  oppScore: string;
  tnYards: string;
  oppYards: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function lockTime(kickoffIso: string): number {
  return new Date(kickoffIso).getTime();
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSecs = Math.floor(ms / 1000);
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (d > 0) return `${d}d ${h}h ${String(m).padStart(2, '0')}m`;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function ptColor(pts: number | null, max: number): string {
  if (pts === null) return 'text-vgd-muted';
  if (pts >= max) return 'text-green-400';
  if (pts >= max * 0.5) return 'text-vgd-orange';
  return 'text-vgd-red';
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function ScoringTooltip({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="absolute right-0 top-8 z-30 w-64 bg-vgd-bg border border-white/10 rounded-lg shadow-2xl p-3 text-xs text-white/80 space-y-1.5">
      <p className="font-bold text-vgd-orange text-[11px] uppercase tracking-wider mb-2">Scoring Rules</p>
      <div className="space-y-1">
        <div className="flex justify-between"><span>Winner (correct)</span><span className="text-vgd-orange font-bold">100 pts</span></div>
        <div className="flex justify-between"><span>Score (each side)</span><span className="text-vgd-orange font-bold">up to 100 pts</span></div>
        <div className="flex justify-between pl-3 text-white/50"><span>+50 bonus if exact</span><span>max 150</span></div>
        <div className="flex justify-between"><span>Yards (each side)</span><span className="text-vgd-orange font-bold">up to 200 pts</span></div>
        <div className="flex justify-between pl-3 text-white/50"><span>+100 bonus if exact</span><span>max 300</span></div>
      </div>
      <div className="border-t border-white/10 pt-1.5 flex justify-between font-bold">
        <span>Maximum total</span>
        <span className="text-vgd-orange">1,000 pts</span>
      </div>
      <button onClick={onClose} className="absolute top-1 right-1 text-vgd-muted hover:text-white p-1">
        <XCircle className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Summary (post-game) ──────────────────────────────────────────────────────

function PredictionSummary({ pred, game, tnIsHome }: {
  pred: PregamePrediction;
  game: LiveGame;
  tnIsHome: boolean;
}) {
  const tnName = 'Tennessee';
  const oppName = tnIsHome ? game.away_team : game.home_team;
  const actualTnScore  = tnIsHome ? game.home_score : game.away_score;
  const actualOppScore = tnIsHome ? game.away_score : game.home_score;
  const actualTnYards  = tnIsHome ? game.home_total_yards : game.away_total_yards;
  const actualOppYards = tnIsHome ? game.away_total_yards : game.home_total_yards;
  const predTnWon = (pred.predicted_winner === 'home') === tnIsHome;
  const actualTnWon = (game.home_score > game.away_score) === tnIsHome;

  const rows = [
    {
      label: 'Winner',
      predicted: predTnWon ? tnName : oppName,
      actual: actualTnWon ? tnName : oppName,
      correct: pred.winner_correct,
      pts: pred.winner_correct ? 100 : 0,
      max: 100,
    },
    {
      label: `${tnName} Score`,
      predicted: String(tnIsHome ? pred.predicted_home_score : pred.predicted_away_score),
      actual: String(actualTnScore),
      pts: tnIsHome ? pred.home_score_points : pred.away_score_points,
      max: 150,
    },
    {
      label: `${oppName} Score`,
      predicted: String(!tnIsHome ? pred.predicted_home_score : pred.predicted_away_score),
      actual: String(actualOppScore),
      pts: !tnIsHome ? pred.home_score_points : pred.away_score_points,
      max: 150,
    },
    {
      label: `${tnName} Yards`,
      predicted: String(tnIsHome ? pred.predicted_home_yards : pred.predicted_away_yards),
      actual: String(actualTnYards ?? '—'),
      pts: tnIsHome ? pred.home_yards_points : pred.away_yards_points,
      max: 300,
    },
    {
      label: `${oppName} Yards`,
      predicted: String(!tnIsHome ? pred.predicted_home_yards : pred.predicted_away_yards),
      actual: String(actualOppYards ?? '—'),
      pts: !tnIsHome ? pred.home_yards_points : pred.away_yards_points,
      max: 300,
    },
  ];

  const total = pred.total_pregame_points ?? 0;

  return (
    <div className="p-3 space-y-2">
      <div className="space-y-1">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 items-center text-xs py-0.5 border-b border-white/[0.05] last:border-0">
            <span className="text-white/60">{r.label}</span>
            <span className="text-white/50">{r.predicted}</span>
            <span className="text-white/80">→ {r.actual}</span>
            <span className={`font-bold text-right w-10 ${ptColor(r.pts ?? null, r.max)}`}>
              {r.pts !== null && r.pts !== undefined ? `+${r.pts}` : '—'}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-white/10">
        <span className="text-xs text-white/60">Total earned</span>
        <span className="text-xl font-black text-vgd-orange">{total.toLocaleString()} <span className="text-xs font-normal text-vgd-muted">/ 1,000</span></span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props { game: LiveGame | null }

export function PreGamePredictions({ game }: Props) {
  const { session, profile, openAuthModal } = useAuth();

  // Non-gameday waiting state — no game scheduled today
  if (!game) {
    return (
      <DashboardCard
        title="PRE-GAME PREDICTIONS"
        metadataTag={
          <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">WAITING</span>
        }
        className="h-full"
      >
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center px-4">
          <div className="w-10 h-10 rounded-full border-2 border-white/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-vgd-muted" />
          </div>
          <p className="text-xs text-vgd-muted">No game scheduled today.</p>
          <p className="text-[10px] text-white/30">Pregame predictions open when a game is scheduled.</p>
        </div>
      </DashboardCard>
    );
  }

  const tnIsHome = game.home_team === 'Tennessee';
  const oppName  = tnIsHome ? game.away_team : game.home_team;

  const [existing, setExisting] = useState<PregamePrediction | null>(null);
  const [form, setForm] = useState<FormState>({
    winner: '', tnScore: '', oppScore: '', tnYards: '', oppYards: '',
  });
  const [isLocked, setIsLocked] = useState(false);
  const [timeUntilLock, setTimeUntilLock] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const isCalculated = game.status === 'calculated';
  const lockAt = lockTime(game.kickoff_time);

  // Load existing prediction
  useEffect(() => {
    if (!session) return;
    supabase
      .from('pregame_predictions')
      .select('*')
      .eq('game_id', game.id)
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as PregamePrediction;
          setExisting(d);
          const tnWinner = tnIsHome ? 'home' : 'away';
          const oppWinner = tnIsHome ? 'away' : 'home';
          setForm({
            winner: d.predicted_winner === tnWinner ? 'tn' as unknown as 'home' : 'opp' as unknown as 'away',
            tnScore: String(tnIsHome ? d.predicted_home_score : d.predicted_away_score),
            oppScore: String(!tnIsHome ? d.predicted_home_score : d.predicted_away_score),
            tnYards: String(tnIsHome ? d.predicted_home_yards : d.predicted_away_yards),
            oppYards: String(!tnIsHome ? d.predicted_home_yards : d.predicted_away_yards),
          });
          setSubmitted(true);
          // Re-read winner field correctly
          setForm(prev => ({
            ...prev,
            winner: d.predicted_winner === (tnIsHome ? 'home' : 'away') ? 'home' : 'away'
          }));
        }
      });
  }, [session, game.id, tnIsHome]);

  // Lock countdown
  useEffect(() => {
    if (isCalculated) return;
    const tick = () => {
      const remaining = lockAt - Date.now();
      setTimeUntilLock(Math.max(0, remaining));
      setIsLocked(remaining <= 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockAt, isCalculated]);

  const setField = useCallback((field: keyof FormState, val: string) => {
    setForm(prev => ({ ...prev, [field]: val }));
    setSubmitError('');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return openAuthModal('register');
    if (isLocked) return;

    const tnScore  = parseInt(form.tnScore);
    const oppScore = parseInt(form.oppScore);
    const tnYards  = parseInt(form.tnYards);
    const oppYards = parseInt(form.oppYards);

    if (!form.winner) return setSubmitError('Pick a winner.');
    if (isNaN(tnScore)  || tnScore  < 0 || tnScore  > 99)  return setSubmitError('Tennessee score: 0–99.');
    if (isNaN(oppScore) || oppScore < 0 || oppScore > 99)  return setSubmitError(`${oppName} score: 0–99.`);
    if (isNaN(tnYards)  || tnYards  < 0 || tnYards  > 999) return setSubmitError('Tennessee yards: 0–999.');
    if (isNaN(oppYards) || oppYards < 0 || oppYards > 999) return setSubmitError(`${oppName} yards: 0–999.`);

    // Map UI winner to DB 'home'/'away'
    const predWinner = form.winner; // 'home' | 'away' — already in DB format
    const homeScore = tnIsHome ? tnScore : oppScore;
    const awayScore = tnIsHome ? oppScore : tnScore;
    const homeYards = tnIsHome ? tnYards : oppYards;
    const awayYards = tnIsHome ? oppYards : tnYards;

    setSubmitting(true);
    setSubmitError('');
    const { error } = await supabase.rpc('submit_pregame_prediction', {
      p_game_id: game.id,
      p_predicted_winner: predWinner,
      p_home_score: homeScore,
      p_away_score: awayScore,
      p_home_yards: homeYards,
      p_away_yards: awayYards,
    });
    setSubmitting(false);

    if (error) {
      setSubmitError(error.message ?? 'Something went wrong.');
    } else {
      setSubmitted(true);
      // Refresh existing prediction
      supabase.from('pregame_predictions').select('*')
        .eq('game_id', game.id).eq('user_id', session.user.id)
        .maybeSingle().then(({ data }) => data && setExisting(data as PregamePrediction));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const winnerLabel = form.winner === (tnIsHome ? 'home' : 'away') ? 'Tennessee'
    : form.winner === (tnIsHome ? 'away' : 'home') ? oppName
    : '';

  const metaTag = isCalculated ? (
    <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">FINAL</span>
  ) : isLocked ? (
    <span className="flex items-center gap-1 text-[10px] text-vgd-muted font-bold uppercase tracking-wider">
      <Lock className="w-3 h-3" /> LOCKED
    </span>
  ) : (
    <span className="text-[10px] text-vgd-orange font-bold uppercase tracking-wider">
      LOCKS {formatCountdown(timeUntilLock)}
    </span>
  );

  return (
    <DashboardCard
      title="PRE-GAME PREDICTIONS"
      metadataTag={metaTag}
      className="h-full"
    >
      <div className="relative">
        {/* Tooltip toggle */}
        <button
          onClick={() => setShowTooltip(v => !v)}
          className="absolute top-2 right-3 z-20 text-vgd-muted hover:text-vgd-orange transition-colors"
          title="Scoring rules"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
        <div className="relative">
          <ScoringTooltip open={showTooltip} onClose={() => setShowTooltip(false)} />
        </div>
      </div>

      {/* Post-game summary */}
      {isCalculated && existing ? (
        <PredictionSummary pred={existing} game={game} tnIsHome={tnIsHome} />
      ) : isCalculated && !existing ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-vgd-muted text-xs px-4 text-center">
          <p>You didn't submit predictions for this game.</p>
        </div>
      ) : !session ? (
        // Logged-out state
        <div className="flex flex-col items-center justify-center py-8 gap-3 px-4 text-center">
          <p className="text-xs text-vgd-muted">Sign in to submit pre-game picks and earn up to 1,000 pts.</p>
          <button onClick={() => openAuthModal('register')}
            className="text-xs text-vgd-orange hover:underline">
            Sign in / Register
          </button>
        </div>
      ) : isLocked ? (
        // Locked state
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 bg-white/5 rounded-lg p-3 border border-white/10">
            <Lock className="w-4 h-4 text-vgd-muted flex-shrink-0" />
            <p className="text-xs text-white/60">Predictions are locked at kickoff.</p>
          </div>
          {existing && (
            <div className="space-y-1 text-xs text-white/70">
              <p className="text-vgd-orange font-semibold mb-1">Your picks (locked in):</p>
              <div className="flex justify-between">
                <span>Winner</span>
                <span className="text-white font-semibold">
                  {existing.predicted_winner === (tnIsHome ? 'home' : 'away') ? 'Tennessee' : oppName}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Final Score</span>
                <span className="text-white font-semibold">
                  {tnIsHome ? existing.predicted_home_score : existing.predicted_away_score} –{' '}
                  {tnIsHome ? existing.predicted_away_score : existing.predicted_home_score}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Yards</span>
                <span className="text-white font-semibold">
                  {tnIsHome ? existing.predicted_home_yards : existing.predicted_away_yards} –{' '}
                  {tnIsHome ? existing.predicted_away_yards : existing.predicted_home_yards}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Active form
        <form onSubmit={handleSubmit} noValidate className="p-3 space-y-3">
          {/* Winner toggle */}
          <div>
            <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-1">
              Winner
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'Tennessee', val: tnIsHome ? 'home' : 'away' as 'home' | 'away' },
                { label: oppName,     val: tnIsHome ? 'away' : 'home' as 'home' | 'away' },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setField('winner', opt.val)}
                  disabled={isLocked}
                  className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                    form.winner === opt.val
                      ? 'bg-vgd-orange border-vgd-orange text-white shadow-lg shadow-vgd-orange/20'
                      : 'border-white/10 text-white/60 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scores */}
          <div>
            <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-1">
              Final Score
            </label>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 items-center">
              <div>
                <p className="text-[9px] text-vgd-muted mb-0.5">TN</p>
                <input type="number" min="0" max="99" placeholder="35"
                  value={form.tnScore} onChange={e => setField('tnScore', e.target.value)}
                  disabled={isLocked}
                  className="w-full bg-vgd-bg border border-white/10 rounded text-white text-sm font-semibold px-2 py-1.5 text-center focus:outline-none focus:border-vgd-orange/50 disabled:opacity-50" />
              </div>
              <span className="text-vgd-muted text-sm font-bold">–</span>
              <div>
                <p className="text-[9px] text-vgd-muted mb-0.5 truncate">{oppName}</p>
                <input type="number" min="0" max="99" placeholder="21"
                  value={form.oppScore} onChange={e => setField('oppScore', e.target.value)}
                  disabled={isLocked}
                  className="w-full bg-vgd-bg border border-white/10 rounded text-white text-sm font-semibold px-2 py-1.5 text-center focus:outline-none focus:border-vgd-orange/50 disabled:opacity-50" />
              </div>
            </div>
          </div>

          {/* Yards */}
          <div>
            <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-1">
              Total Yards
            </label>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 items-center">
              <div>
                <p className="text-[9px] text-vgd-muted mb-0.5">TN</p>
                <input type="number" min="0" max="999" placeholder="420"
                  value={form.tnYards} onChange={e => setField('tnYards', e.target.value)}
                  disabled={isLocked}
                  className="w-full bg-vgd-bg border border-white/10 rounded text-white text-sm font-semibold px-2 py-1.5 text-center focus:outline-none focus:border-vgd-orange/50 disabled:opacity-50" />
              </div>
              <span className="text-vgd-muted text-sm font-bold">–</span>
              <div>
                <p className="text-[9px] text-vgd-muted mb-0.5 truncate">{oppName}</p>
                <input type="number" min="0" max="999" placeholder="310"
                  value={form.oppYards} onChange={e => setField('oppYards', e.target.value)}
                  disabled={isLocked}
                  className="w-full bg-vgd-bg border border-white/10 rounded text-white text-sm font-semibold px-2 py-1.5 text-center focus:outline-none focus:border-vgd-orange/50 disabled:opacity-50" />
              </div>
            </div>
          </div>

          {submitError && <p className="text-xs text-vgd-red">{submitError}</p>}

          <button
            type="submit"
            disabled={submitting || isLocked}
            className="w-full py-2.5 rounded-lg bg-vgd-orange hover:bg-orange-500 text-white font-bold text-sm uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-vgd-orange/20"
          >
            {submitted ? (
              <><CheckCircle className="w-4 h-4" /> Update Picks</>
            ) : (
              'Lock In Picks'
            )}
          </button>
          {submitted && (
            <p className="text-center text-[10px] text-green-400">Picks saved — you can update until kickoff</p>
          )}
        </form>
      )}
    </DashboardCard>
  );
}
