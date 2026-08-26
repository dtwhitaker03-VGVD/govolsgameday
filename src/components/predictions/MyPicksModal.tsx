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
  total_pregame_points: number | null;
}

interface Props {
  game: LiveGame;
  open: boolean;
  onClose: () => void;
}

export function MyPicksModal({ game, open, onClose }: Props) {
  const { session } = useAuth();
  const [pred, setPred] = useState<PregamePrediction | null>(null);
  const [loading, setLoading] = useState(true);

  const tnIsHome = game.home_team === 'Tennessee';
  const oppName = tnIsHome ? game.away_team : game.home_team;
  const isFinal = game.status === 'final' || game.status === 'calculated';

  useEffect(() => {
    if (!open || !session) return;
    setLoading(true);
    supabase
      .from('pregame_predictions')
      .select('*')
      .eq('game_id', game.id)
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setPred(data as PregamePrediction | null);
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
  ] : [];

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
                {rows.map((r, i) => (
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
                    <span className="text-xs font-normal text-vgd-muted"> / 1,000</span>
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
