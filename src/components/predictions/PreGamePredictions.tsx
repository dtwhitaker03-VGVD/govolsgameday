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
  predicted_spread_pick: 'over' | 'under' | null;
  predicted_total_pick: 'over' | 'under' | null;
  predicted_tn_rushing_tds: number | null;
  predicted_tn_receiving_tds: number | null;
  predicted_tn_turnovers_forced: number | null;
  spread_pick_correct: boolean | null;
  spread_pick_points: number | null;
  total_pick_correct: boolean | null;
  total_pick_points: number | null;
  tn_rushing_tds_correct: boolean | null;
  tn_rushing_tds_points: number | null;
  tn_receiving_tds_correct: boolean | null;
  tn_receiving_tds_points: number | null;
  tn_turnovers_forced_correct: boolean | null;
  tn_turnovers_forced_points: number | null;
  total_pregame_points: number | null;
}

interface FormState {
  winner: 'home' | 'away' | '';
  tnScore: string;
  oppScore: string;
  tnYards: string;
  oppYards: string;
  spreadPick: 'over' | 'under' | '';
  totalPick: 'over' | 'under' | '';
  tnRushingTds: string;
  tnReceivingTds: string;
  tnTurnoversForced: string;
}

// Weekly player/team prop bets an admin configures per game (Admin Dashboard
// "Weekly Prop Bets") — separate from Spread/Total, which keep their own
// CFBD-sourced line columns on live_games, but rendered in the same unified
// Over/Under table since they're all the same "pick over or under a line"
// shape.
interface GameProp {
  id: string;
  description: string;
  line: number;
  points_value: number;
}

interface PropPick {
  prop_id: string;
  pick: 'over' | 'under';
  correct: boolean | null;
  points_earned: number;
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

function ScoringTooltip({ open, onClose, propCount, hasTennessee }: { open: boolean; onClose: () => void; propCount: number; hasTennessee: boolean }) {
  if (!open) return null;
  // Base categories (Winner, Score, Yards[, 3 TN stat guesses when this
  // game has a Tennessee side]) = 1,300 or 1,000, fixed.
  // Over/Unders = Spread + Total + this week's props, 100 pts each.
  const ouCount = 2 + propCount;
  const maxTotal = (hasTennessee ? 1300 : 1000) + ouCount * 100;
  return (
    <div className="absolute right-0 top-8 z-30 w-64 bg-vgd-bg border border-white/10 rounded-lg shadow-2xl p-3 text-xs text-white/80 space-y-1.5">
      <p className="font-bold text-vgd-orange text-[11px] uppercase tracking-wider mb-2">Scoring Rules</p>
      <div className="space-y-1">
        <div className="flex justify-between"><span>Winner (correct)</span><span className="text-vgd-orange font-bold">100 pts</span></div>
        <div className="flex justify-between"><span>Score (each side)</span><span className="text-vgd-orange font-bold">up to 100 pts</span></div>
        <div className="flex justify-between pl-3 text-white/50"><span>+50 bonus if exact</span><span>max 150</span></div>
        <div className="flex justify-between"><span>Yards (each side)</span><span className="text-vgd-orange font-bold">up to 200 pts</span></div>
        <div className="flex justify-between pl-3 text-white/50"><span>+100 bonus if exact</span><span>max 300</span></div>
        {hasTennessee && (
          <>
            <div className="flex justify-between"><span>TN Rushing TDs</span><span className="text-vgd-orange font-bold">100 pts</span></div>
            <div className="flex justify-between"><span>TN Receiving TDs</span><span className="text-vgd-orange font-bold">100 pts</span></div>
            <div className="flex justify-between"><span>TN Turnovers Forced</span><span className="text-vgd-orange font-bold">100 pts</span></div>
          </>
        )}
        <div className="flex justify-between"><span>Over/Unders</span><span className="text-vgd-orange font-bold">100 pts each</span></div>
      </div>
      <div className="border-t border-white/10 pt-1.5 flex justify-between font-bold">
        <span>Maximum total</span>
        <span className="text-vgd-orange">{maxTotal.toLocaleString()} pts</span>
      </div>
      <button onClick={onClose} className="absolute top-1 right-1 text-vgd-muted hover:text-white p-1">
        <XCircle className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Summary (post-game) ──────────────────────────────────────────────────────

function PredictionSummary({ pred, game, tnIsHome, gameProps, propPicks }: {
  pred: PregamePrediction;
  game: LiveGame;
  tnIsHome: boolean;
  gameProps: GameProp[];
  propPicks: PropPick[];
}) {
  const hasTennessee = game.home_team === 'Tennessee' || game.away_team === 'Tennessee';
  const tnName = tnIsHome ? game.home_team : game.away_team;
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
    {
      label: 'Spread O/U',
      predicted: pred.predicted_spread_pick ? pred.predicted_spread_pick.toUpperCase() : '—',
      actual: game.spread_line_tn != null ? `TN ${game.spread_line_tn > 0 ? '+' : ''}${game.spread_line_tn}` : 'N/A',
      pts: pred.spread_pick_points,
      max: 100,
    },
    {
      label: 'Total Points O/U',
      predicted: pred.predicted_total_pick ? pred.predicted_total_pick.toUpperCase() : '—',
      actual: game.total_points_line != null ? String(game.total_points_line) : 'N/A',
      pts: pred.total_pick_points,
      max: 100,
    },
    ...(hasTennessee ? [
      {
        label: 'TN Rushing TDs',
        predicted: String(pred.predicted_tn_rushing_tds ?? '—'),
        actual: game.tn_rushing_tds != null ? String(game.tn_rushing_tds) : 'N/A',
        pts: pred.tn_rushing_tds_points,
        max: 100,
      },
      {
        label: 'TN Receiving TDs',
        predicted: String(pred.predicted_tn_receiving_tds ?? '—'),
        actual: game.tn_receiving_tds != null ? String(game.tn_receiving_tds) : 'N/A',
        pts: pred.tn_receiving_tds_points,
        max: 100,
      },
      {
        label: 'TN Turnovers Forced',
        predicted: String(pred.predicted_tn_turnovers_forced ?? '—'),
        actual: game.tn_turnovers_forced != null ? String(game.tn_turnovers_forced) : 'N/A',
        pts: pred.tn_turnovers_forced_points,
        max: 100,
      },
    ] : []),
    ...gameProps.map((gp) => {
      const pick = propPicks.find((p) => p.prop_id === gp.id);
      return {
        label: gp.description,
        predicted: pick ? pick.pick.toUpperCase() : '—',
        actual: `line ${gp.line}`,
        pts: pick ? pick.points_earned : null,
        max: gp.points_value,
      };
    }),
  ];

  const total = pred.total_pregame_points ?? 0;
  const maxTotal = (hasTennessee ? 1300 : 1000) + (2 + gameProps.length) * 100;

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
        <span className="text-xl font-black text-vgd-orange">{total.toLocaleString()} <span className="text-xs font-normal text-vgd-muted">/ {maxTotal.toLocaleString()}</span></span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props { game: LiveGame | null }

export function PreGamePredictions({ game }: Props) {
  const { session, profile, openAuthModal } = useAuth();

  // "tn" naming throughout refers to whichever team is home — generalized
  // for the 2026-08-29 one-off live test (see live-cfbd-sync).
  const tnIsHome = true;

  const [existing, setExisting] = useState<PregamePrediction | null>(null);
  const [form, setForm] = useState<FormState>({
    winner: '', tnScore: '', oppScore: '', tnYards: '', oppYards: '',
    spreadPick: '', totalPick: '', tnRushingTds: '', tnReceivingTds: '', tnTurnoversForced: '',
  });
  const [isLocked, setIsLocked] = useState(false);
  const [timeUntilLock, setTimeUntilLock] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [gameProps, setGameProps] = useState<GameProp[]>([]);
  const [propPicks, setPropPicks] = useState<PropPick[]>([]);
  const [propForm, setPropForm] = useState<Record<string, 'over' | 'under'>>({});

  // All hooks below run unconditionally (even with no game scheduled) so
  // hook order never changes across renders — the "no game" waiting card
  // renders after all hooks, once game is known to be non-null.
  const isCalculated = game?.status === 'calculated';
  const lockAt = game ? lockTime(game.kickoff_time) : 0;

  // Load this week's admin-configured props for this game (Spread/Total
  // keep their own dedicated line columns — see GameProp comment above).
  useEffect(() => {
    if (!game) return;
    supabase
      .from('game_props')
      .select('id, description, line, points_value')
      .eq('game_id', game.id)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setGameProps((data as GameProp[]) ?? []));
  }, [game?.id]);

  // Load existing prediction
  useEffect(() => {
    if (!session || !game) return;
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
            spreadPick: d.predicted_spread_pick ?? '',
            totalPick: d.predicted_total_pick ?? '',
            tnRushingTds: d.predicted_tn_rushing_tds != null ? String(d.predicted_tn_rushing_tds) : '',
            tnReceivingTds: d.predicted_tn_receiving_tds != null ? String(d.predicted_tn_receiving_tds) : '',
            tnTurnoversForced: d.predicted_tn_turnovers_forced != null ? String(d.predicted_tn_turnovers_forced) : '',
          });
          setSubmitted(true);
          // Re-read winner field correctly
          setForm(prev => ({
            ...prev,
            winner: d.predicted_winner === (tnIsHome ? 'home' : 'away') ? 'home' : 'away'
          }));
        }
      });
  }, [session, game?.id, tnIsHome]);

  // Load the user's own prop picks (for pre-filling the form and, once
  // calculated, showing correctness/points in the summary).
  useEffect(() => {
    if (!session || !game) return;
    supabase
      .from('pregame_prop_picks')
      .select('prop_id, pick, correct, points_earned')
      .eq('game_id', game.id)
      .eq('user_id', session.user.id)
      .then(({ data }) => {
        const picks = (data as PropPick[]) ?? [];
        setPropPicks(picks);
        const prefill: Record<string, 'over' | 'under'> = {};
        for (const p of picks) prefill[p.prop_id] = p.pick;
        setPropForm(prefill);
      });
  }, [session, game?.id]);

  // Lock countdown
  useEffect(() => {
    if (!game || isCalculated) return;
    const tick = () => {
      const remaining = lockAt - Date.now();
      setTimeUntilLock(Math.max(0, remaining));
      setIsLocked(remaining <= 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [game, lockAt, isCalculated]);

  const setField = useCallback((field: keyof FormState, val: string) => {
    setForm(prev => ({ ...prev, [field]: val }));
    setSubmitError('');
  }, []);

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

  const tnName = game.home_team;
  const oppName  = tnIsHome ? game.away_team : game.home_team;
  const spreadAvailable = game.spread_line_tn != null;
  const totalAvailable = game.total_points_line != null;
  // The 3 TN stat guesses only make sense when Tennessee is actually
  // playing — an admin test game between two other teams skips them.
  const hasTennessee = game.home_team === 'Tennessee' || game.away_team === 'Tennessee';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return openAuthModal('register');
    if (isLocked) return;

    const tnScore  = parseInt(form.tnScore);
    const oppScore = parseInt(form.oppScore);
    const tnYards  = parseInt(form.tnYards);
    const oppYards = parseInt(form.oppYards);
    const tnRushingTds = parseInt(form.tnRushingTds);
    const tnReceivingTds = parseInt(form.tnReceivingTds);
    const tnTurnoversForced = parseInt(form.tnTurnoversForced);

    if (!form.winner) return setSubmitError('Pick a winner.');
    if (isNaN(tnScore)  || tnScore  < 0 || tnScore  > 99)  return setSubmitError(`${tnName} score: 0–99.`);
    if (isNaN(oppScore) || oppScore < 0 || oppScore > 99)  return setSubmitError(`${oppName} score: 0–99.`);
    if (isNaN(tnYards)  || tnYards  < 0 || tnYards  > 999) return setSubmitError(`${tnName} yards: 0–999.`);
    if (isNaN(oppYards) || oppYards < 0 || oppYards > 999) return setSubmitError(`${oppName} yards: 0–999.`);
    if (spreadAvailable && !form.spreadPick) return setSubmitError('Pick Over or Under for the spread.');
    if (totalAvailable && !form.totalPick) return setSubmitError('Pick Over or Under for total points.');
    if (hasTennessee) {
      if (isNaN(tnRushingTds) || tnRushingTds < 0 || tnRushingTds > 10) return setSubmitError('TN rushing TDs: 0–10.');
      if (isNaN(tnReceivingTds) || tnReceivingTds < 0 || tnReceivingTds > 10) return setSubmitError('TN receiving TDs: 0–10.');
      if (isNaN(tnTurnoversForced) || tnTurnoversForced < 0 || tnTurnoversForced > 10) return setSubmitError('TN turnovers forced: 0–10.');
    }
    for (const gp of gameProps) {
      if (!propForm[gp.id]) return setSubmitError(`Pick Over or Under for ${gp.description}.`);
    }

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
      p_spread_pick: spreadAvailable ? form.spreadPick : null,
      p_total_pick: totalAvailable ? form.totalPick : null,
      p_tn_rushing_tds: hasTennessee ? tnRushingTds : null,
      p_tn_receiving_tds: hasTennessee ? tnReceivingTds : null,
      p_tn_turnovers_forced: hasTennessee ? tnTurnoversForced : null,
      p_prop_picks: gameProps.map((gp) => ({ prop_id: gp.id, pick: propForm[gp.id] })),
    });
    setSubmitting(false);

    if (error) {
      setSubmitError(error.message ?? 'Something went wrong.');
    } else {
      setSubmitted(true);
      // Refresh existing prediction + prop picks
      supabase.from('pregame_predictions').select('*')
        .eq('game_id', game.id).eq('user_id', session.user.id)
        .maybeSingle().then(({ data }) => data && setExisting(data as PregamePrediction));
      supabase.from('pregame_prop_picks').select('prop_id, pick, correct, points_earned')
        .eq('game_id', game.id).eq('user_id', session.user.id)
        .then(({ data }) => setPropPicks((data as PropPick[]) ?? []));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const winnerLabel = form.winner === (tnIsHome ? 'home' : 'away') ? tnName
    : form.winner === (tnIsHome ? 'away' : 'home') ? oppName
    : '';
  const maxTotalPoints = (hasTennessee ? 1300 : 1000) + (2 + gameProps.length) * 100;

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
          <ScoringTooltip open={showTooltip} onClose={() => setShowTooltip(false)} propCount={gameProps.length} hasTennessee={hasTennessee} />
        </div>
      </div>

      {/* Post-game summary */}
      {isCalculated && existing ? (
        <PredictionSummary pred={existing} game={game} tnIsHome={tnIsHome} gameProps={gameProps} propPicks={propPicks} />
      ) : isCalculated && !existing ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-vgd-muted text-xs px-4 text-center">
          <p>You didn't submit predictions for this game.</p>
        </div>
      ) : !session ? (
        // Logged-out state
        <div className="flex flex-col items-center justify-center py-8 gap-3 px-4 text-center">
          <p className="text-xs text-vgd-muted">Sign in to submit pre-game picks and earn up to {maxTotalPoints.toLocaleString()} pts.</p>
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
                  {existing.predicted_winner === (tnIsHome ? 'home' : 'away') ? tnName : oppName}
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
              {existing.predicted_spread_pick && (
                <div className="flex justify-between">
                  <span>Spread O/U</span>
                  <span className="text-white font-semibold uppercase">{existing.predicted_spread_pick}</span>
                </div>
              )}
              {existing.predicted_total_pick && (
                <div className="flex justify-between">
                  <span>Total Points O/U</span>
                  <span className="text-white font-semibold uppercase">{existing.predicted_total_pick}</span>
                </div>
              )}
              {hasTennessee && (
                <>
                  <div className="flex justify-between">
                    <span>TN Rushing TDs</span>
                    <span className="text-white font-semibold">{existing.predicted_tn_rushing_tds}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TN Receiving TDs</span>
                    <span className="text-white font-semibold">{existing.predicted_tn_receiving_tds}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TN Turnovers Forced</span>
                    <span className="text-white font-semibold">{existing.predicted_tn_turnovers_forced}</span>
                  </div>
                </>
              )}
              {gameProps.map((gp) => {
                const pick = propPicks.find((p) => p.prop_id === gp.id);
                return pick ? (
                  <div key={gp.id} className="flex justify-between">
                    <span>{gp.description}</span>
                    <span className="text-white font-semibold uppercase">{pick.pick}</span>
                  </div>
                ) : null;
              })}
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
                { label: tnName, val: tnIsHome ? 'home' : 'away' as 'home' | 'away' },
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
                <p className="text-[9px] text-vgd-muted mb-0.5 truncate">{tnName}</p>
                <input type="number" min="0" max="99"
                  value={form.tnScore} onChange={e => setField('tnScore', e.target.value)}
                  disabled={isLocked}
                  className="w-full bg-vgd-bg border border-white/10 rounded text-white text-sm font-semibold px-2 py-1.5 text-center focus:outline-none focus:border-vgd-orange/50 disabled:opacity-50" />
              </div>
              <span className="text-vgd-muted text-sm font-bold">–</span>
              <div>
                <p className="text-[9px] text-vgd-muted mb-0.5 truncate">{oppName}</p>
                <input type="number" min="0" max="99"
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
                <p className="text-[9px] text-vgd-muted mb-0.5 truncate">{tnName}</p>
                <input type="number" min="0" max="999"
                  value={form.tnYards} onChange={e => setField('tnYards', e.target.value)}
                  disabled={isLocked}
                  className="w-full bg-vgd-bg border border-white/10 rounded text-white text-sm font-semibold px-2 py-1.5 text-center focus:outline-none focus:border-vgd-orange/50 disabled:opacity-50" />
              </div>
              <span className="text-vgd-muted text-sm font-bold">–</span>
              <div>
                <p className="text-[9px] text-vgd-muted mb-0.5 truncate">{oppName}</p>
                <input type="number" min="0" max="999"
                  value={form.oppYards} onChange={e => setField('oppYards', e.target.value)}
                  disabled={isLocked}
                  className="w-full bg-vgd-bg border border-white/10 rounded text-white text-sm font-semibold px-2 py-1.5 text-center focus:outline-none focus:border-vgd-orange/50 disabled:opacity-50" />
              </div>
            </div>
          </div>

          {/* TN Rushing / Receiving TDs / Turnovers Forced — only when
              Tennessee is actually one of the two teams. */}
          {hasTennessee && (
            <div>
              <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-1">
                TN Stat Guesses
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <p className="text-[9px] text-vgd-muted mb-0.5 truncate">Rush TDs</p>
                  <input type="number" min="0" max="10"
                    value={form.tnRushingTds} onChange={e => setField('tnRushingTds', e.target.value)}
                    disabled={isLocked}
                    className="w-full bg-vgd-bg border border-white/10 rounded text-white text-sm font-semibold px-2 py-1.5 text-center focus:outline-none focus:border-vgd-orange/50 disabled:opacity-50" />
                </div>
                <div>
                  <p className="text-[9px] text-vgd-muted mb-0.5 truncate">Rec TDs</p>
                  <input type="number" min="0" max="10"
                    value={form.tnReceivingTds} onChange={e => setField('tnReceivingTds', e.target.value)}
                    disabled={isLocked}
                    className="w-full bg-vgd-bg border border-white/10 rounded text-white text-sm font-semibold px-2 py-1.5 text-center focus:outline-none focus:border-vgd-orange/50 disabled:opacity-50" />
                </div>
                <div>
                  <p className="text-[9px] text-vgd-muted mb-0.5 truncate">Turnovers Forced</p>
                  <input type="number" min="0" max="10"
                    value={form.tnTurnoversForced} onChange={e => setField('tnTurnoversForced', e.target.value)}
                    disabled={isLocked}
                    className="w-full bg-vgd-bg border border-white/10 rounded text-white text-sm font-semibold px-2 py-1.5 text-center focus:outline-none focus:border-vgd-orange/50 disabled:opacity-50" />
                </div>
              </div>
            </div>
          )}

          {/* Unified Over/Under table: Spread, Total Points, and this
              week's admin-configured props all in one Description | Under |
              Line | Over list. */}
          {(spreadAvailable || totalAvailable || gameProps.length > 0) && (
            <div>
              <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-1">
                Over / Under Picks
              </label>
              <div className="border border-white/10 rounded-lg overflow-hidden bg-white/[0.015]">
                <div className="grid grid-cols-[1fr_44px_38px_44px] gap-1.5 items-center px-2.5 py-1.5 border-b border-white/[0.06]">
                  <span />
                  <span className="text-[8px] font-bold text-vgd-muted text-center tracking-wide">UNDER</span>
                  <span className="text-[8px] font-bold text-vgd-muted text-center tracking-wide">LINE</span>
                  <span className="text-[8px] font-bold text-vgd-muted text-center tracking-wide">OVER</span>
                </div>

                {spreadAvailable && (
                  <div className="grid grid-cols-[1fr_44px_38px_44px] gap-1.5 items-center px-2.5 py-1.5 border-b border-white/[0.05]">
                    <span className="text-[11px] font-bold text-white/85 truncate">Spread ({tnName})</span>
                    <button type="button" onClick={() => setField('spreadPick', 'under')} disabled={isLocked}
                      className={`py-1 rounded text-[9px] font-bold uppercase border transition-all ${
                        form.spreadPick === 'under' ? 'bg-vgd-orange border-vgd-orange text-white' : 'border-white/10 text-white/60 hover:border-white/30'
                      }`}>Under</button>
                    <span className="text-[11px] font-bold text-white/50 text-center">{game.spread_line_tn! > 0 ? '+' : ''}{game.spread_line_tn}</span>
                    <button type="button" onClick={() => setField('spreadPick', 'over')} disabled={isLocked}
                      className={`py-1 rounded text-[9px] font-bold uppercase border transition-all ${
                        form.spreadPick === 'over' ? 'bg-vgd-orange border-vgd-orange text-white' : 'border-white/10 text-white/60 hover:border-white/30'
                      }`}>Over</button>
                  </div>
                )}

                {totalAvailable && (
                  <div className="grid grid-cols-[1fr_44px_38px_44px] gap-1.5 items-center px-2.5 py-1.5 border-b border-white/[0.05]">
                    <span className="text-[11px] font-bold text-white/85 truncate">Total Points</span>
                    <button type="button" onClick={() => setField('totalPick', 'under')} disabled={isLocked}
                      className={`py-1 rounded text-[9px] font-bold uppercase border transition-all ${
                        form.totalPick === 'under' ? 'bg-vgd-orange border-vgd-orange text-white' : 'border-white/10 text-white/60 hover:border-white/30'
                      }`}>Under</button>
                    <span className="text-[11px] font-bold text-white/50 text-center">{game.total_points_line}</span>
                    <button type="button" onClick={() => setField('totalPick', 'over')} disabled={isLocked}
                      className={`py-1 rounded text-[9px] font-bold uppercase border transition-all ${
                        form.totalPick === 'over' ? 'bg-vgd-orange border-vgd-orange text-white' : 'border-white/10 text-white/60 hover:border-white/30'
                      }`}>Over</button>
                  </div>
                )}

                {gameProps.map((gp) => (
                  <div key={gp.id} className="grid grid-cols-[1fr_44px_38px_44px] gap-1.5 items-center px-2.5 py-1.5 border-b border-white/[0.05] last:border-0">
                    <span className="text-[11px] font-bold text-white/85 truncate">{gp.description}</span>
                    <button type="button" onClick={() => setPropForm(prev => ({ ...prev, [gp.id]: 'under' }))} disabled={isLocked}
                      className={`py-1 rounded text-[9px] font-bold uppercase border transition-all ${
                        propForm[gp.id] === 'under' ? 'bg-vgd-orange border-vgd-orange text-white' : 'border-white/10 text-white/60 hover:border-white/30'
                      }`}>Under</button>
                    <span className="text-[11px] font-bold text-white/50 text-center">{gp.line}</span>
                    <button type="button" onClick={() => setPropForm(prev => ({ ...prev, [gp.id]: 'over' }))} disabled={isLocked}
                      className={`py-1 rounded text-[9px] font-bold uppercase border transition-all ${
                        propForm[gp.id] === 'over' ? 'bg-vgd-orange border-vgd-orange text-white' : 'border-white/10 text-white/60 hover:border-white/30'
                      }`}>Over</button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
