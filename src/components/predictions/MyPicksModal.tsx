import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { LiveGame } from '../game/LiveGameStatsPanel';

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

interface PropPick {
  pick: 'over' | 'under';
  correct: boolean | null;
  points_earned: number | null;
  game_props: {
    description: string;
    line: number;
    points_value: number;
    actual_value: number | null;
    actual_result: string | null;
  } | null;
}

interface Props {
  game: LiveGame;
  open: boolean;
  onClose: () => void;
}

export function MyPicksModal({ game, open, onClose }: Props) {
  const { session } = useAuth();
  const [pred, setPred] = useState<PregamePrediction | null>(null);
  const [propPicks, setPropPicks] = useState<PropPick[]>([]);
  const [loading, setLoading] = useState(true);

  const tnIsHome = game.home_team === 'Tennessee';
  const oppName = tnIsHome ? game.away_team : game.home_team;
  const isFinal = game.status === 'final' || game.status === 'calculated';

  useEffect(() => {
    if (!open || !session) return;
    setLoading(true);
    Promise.all([
      supabase
        .from('pregame_predictions')
        .select('*')
        .eq('game_id', game.id)
        .eq('user_id', session.user.id)
        .maybeSingle(),
      supabase
        .from('pregame_prop_picks')
        .select('pick, correct, points_earned, game_props(description, line, points_value, actual_value, actual_result)')
        .eq('game_id', game.id)
        .eq('user_id', session.user.id),
    ]).then(([predRes, propRes]) => {
      setPred(predRes.data as PregamePrediction | null);
      setPropPicks((propRes.data as unknown as PropPick[] | null) ?? []);
      setLoading(false);
    });
  }, [open, session, game.id]);

  if (!open) return null;

  const actualTnScore = tnIsHome ? game.home_score : game.away_score;
  const actualOppScore = tnIsHome ? game.away_score : game.home_score;
  const actualTnYards = tnIsHome ? game.home_total_yards : game.away_total_yards;
  const actualOppYards = tnIsHome ? game.away_total_yards : game.home_total_yards;
  const actualTnWon = game.home_score > game.away_score ? tnIsHome : !tnIsHome;

  const predTnScore = pred ? (tnIsHome ? pred.predicted_home_score : pred.predicted_away_score) : 0;
  const predOppScore = pred ? (tnIsHome ? pred.predicted_away_score : pred.predicted_home_score) : 0;
  const predTnYards = pred ? (tnIsHome ? pred.predicted_home_yards : pred.predicted_away_yards) : 0;
  const predOppYards = pred ? (tnIsHome ? pred.predicted_away_yards : pred.predicted_home_yards) : 0;
  const predTnWon = pred ? (pred.predicted_winner === 'home') === tnIsHome : false;

  const rows = pred ? [
    {
      label: 'Winner',
      predicted: predTnWon ? 'Tennessee' : oppName,
      actual: isFinal ? (actualTnWon ? 'Tennessee' : oppName) : null,
      correct: isFinal ? pred.winner_correct : null,
      pts: isFinal ? (pred.winner_correct ? 100 : 0) : null,
    },
    {
      label: 'TN Score',
      predicted: String(predTnScore),
      actual: isFinal ? String(actualTnScore) : null,
      pts: isFinal ? (tnIsHome ? pred.home_score_points : pred.away_score_points) : null,
    },
    {
      label: `${oppName} Score`,
      predicted: String(predOppScore),
      actual: isFinal ? String(actualOppScore) : null,
      pts: isFinal ? (!tnIsHome ? pred.home_score_points : pred.away_score_points) : null,
    },
    {
      label: 'TN Yards',
      predicted: String(predTnYards),
      actual: isFinal ? (actualTnYards != null ? String(actualTnYards) : '—') : null,
      pts: isFinal ? (tnIsHome ? pred.home_yards_points : pred.away_yards_points) : null,
    },
    {
      label: `${oppName} Yards`,
      predicted: String(predOppYards),
      actual: isFinal ? (actualOppYards != null ? String(actualOppYards) : '—') : null,
      pts: isFinal ? (!tnIsHome ? pred.home_yards_points : pred.away_yards_points) : null,
    },
    {
      label: 'Spread O/U',
      predicted: pred.predicted_spread_pick ? pred.predicted_spread_pick.toUpperCase() : '—',
      actual: isFinal ? (game.spread_line_tn != null ? `TN ${game.spread_line_tn > 0 ? '+' : ''}${game.spread_line_tn}` : 'N/A') : null,
      pts: isFinal ? pred.spread_pick_points : null,
    },
    {
      label: 'Total Points O/U',
      predicted: pred.predicted_total_pick ? pred.predicted_total_pick.toUpperCase() : '—',
      actual: isFinal ? (game.total_points_line != null ? String(game.total_points_line) : 'N/A') : null,
      pts: isFinal ? pred.total_pick_points : null,
    },
    {
      label: 'TN Rushing TDs',
      predicted: String(pred.predicted_tn_rushing_tds ?? '—'),
      actual: isFinal ? (game.tn_rushing_tds != null ? String(game.tn_rushing_tds) : 'N/A') : null,
      pts: isFinal ? pred.tn_rushing_tds_points : null,
    },
    {
      label: 'TN Receiving TDs',
      predicted: String(pred.predicted_tn_receiving_tds ?? '—'),
      actual: isFinal ? (game.tn_receiving_tds != null ? String(game.tn_receiving_tds) : 'N/A') : null,
      pts: isFinal ? pred.tn_receiving_tds_points : null,
    },
    {
      label: 'TN Turnovers Forced',
      predicted: String(pred.predicted_tn_turnovers_forced ?? '—'),
      actual: isFinal ? (game.tn_turnovers_forced != null ? String(game.tn_turnovers_forced) : 'N/A') : null,
      pts: isFinal ? pred.tn_turnovers_forced_points : null,
    },
  ] : [];

  // Weekly prop bets — a separate table (pregame_prop_picks/game_props) from
  // the fixed pregame_predictions columns above, so they need their own rows
  // rather than showing up for free in `rows`.
  const propRows = propPicks
    .filter((p): p is PropPick & { game_props: NonNullable<PropPick['game_props']> } => !!p.game_props)
    .map((p) => ({
      label: `${p.game_props.description} (O/U ${p.game_props.line})`,
      predicted: p.pick.toUpperCase(),
      actual: isFinal ? (p.game_props.actual_result ? p.game_props.actual_result.toUpperCase() : 'N/A') : null,
      correct: isFinal ? p.correct : null,
      pts: isFinal ? p.points_earned : null,
    }));

  const allRows = [...rows, ...propRows];

  // Base fields max out at 1,500 (100 winner + 150 each score + 300 each
  // yards + 100 each spread/total/rushing-TD/receiving-TD/turnovers) —
  // props add their own points_value on top, only for the ones this user
  // actually picked.
  const maxPoints = 1500 + propPicks.reduce((sum, p) => sum + (p.game_props?.points_value ?? 0), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-vgd-card border border-white/10 rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-4 h-4 text-vgd-orange" />
            My Pregame Picks
          </h2>
          <button onClick={onClose} className="text-vgd-muted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-vgd-orange/30 border-t-vgd-orange rounded-full animate-spin" />
            </div>
          ) : !pred ? (
            <div className="text-center py-6">
              <p className="text-sm text-vgd-muted">You didn't submit pregame predictions for this game.</p>
            </div>
          ) : (
            <>
              {/* Game info */}
              <div className="text-center mb-3">
                <p className="text-xs text-white/50">
                  Tennessee vs {oppName}
                </p>
              </div>

              {/* Picks table */}
              <div className="space-y-1.5">
                {allRows.map((r, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center text-xs py-2 px-3 rounded-lg bg-white/[0.03] border border-white/[0.05]"
                  >
                    <span className="text-white/60 font-medium">{r.label}</span>
                    <span className="text-white/80 font-semibold">{r.predicted}</span>
                    {isFinal ? (
                      <>
                        <span className="text-white/50">→ {r.actual}</span>
                        <span className="flex items-center gap-1 w-16 justify-end">
                          {r.correct === true && <CheckCircle className="w-3 h-3 text-green-400" />}
                          {r.correct === false && <XCircle className="w-3 h-3 text-vgd-red" />}
                          {r.pts != null && (
                            <span className={`font-bold ${r.pts > 0 ? 'text-vgd-orange' : 'text-white/40'}`}>
                              +{r.pts}
                            </span>
                          )}
                        </span>
                      </>
                    ) : (
                      <span className="text-white/30 text-[10px] col-span-2">Unlocks post-game</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Total */}
              {isFinal && (
                <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/10">
                  <span className="text-xs text-white/60 font-semibold">Total Pregame Points</span>
                  <span className="text-lg font-black text-vgd-orange">
                    {pred.total_pregame_points ?? 0}
                    <span className="text-xs font-normal text-vgd-muted"> / {maxPoints.toLocaleString()}</span>
                  </span>
                </div>
              )}

              {!isFinal && (
                <p className="text-center text-[10px] text-white/30 pt-2">
                  Comparison unlocks after the game ends.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
