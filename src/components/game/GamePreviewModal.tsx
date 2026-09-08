import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Matches the shape game-preview-sync returns — see its parsePreview().
interface StatBlock {
  overall?: string;
  passing?: string;
  rushing?: string;
  scoring?: string;
}

interface TeamKeyStats {
  team: string;
  offense: StatBlock;
  defense: StatBlock;
}

interface TeamLeaders {
  team: string;
  passing?: string;
  rushing?: string;
  receiving?: string;
}

interface PreviewContent {
  headline: string;
  subhead: string | null;
  openingLine: string | null;
  howToWatch: string | null;
  keyStats: TeamKeyStats[];
  keyStatsNotes: string[];
  teamLeaders: TeamLeaders[];
  lastGame: { team: string; summary: string }[];
  nextGame: string[];
}

const STAT_LABELS: Record<keyof StatBlock, string> = {
  overall: 'Overall',
  passing: 'Passing',
  rushing: 'Rushing',
  scoring: 'Scoring',
};

function StatBlockList({ label, stats }: { label: string; stats: StatBlock }) {
  const entries = (Object.keys(STAT_LABELS) as (keyof StatBlock)[]).filter((k) => stats[k]);
  if (entries.length === 0) return null;
  return (
    <div>
      <p className="text-[9px] text-vgd-muted uppercase tracking-wider mb-0.5">{label}</p>
      {entries.map((k) => (
        <div key={k} className="flex justify-between gap-2 text-[11px] py-0.5">
          <span className="text-vgd-muted flex-shrink-0">{STAT_LABELS[k]}</span>
          <span className="text-white/85 text-right">{stats[k]}</span>
        </div>
      ))}
    </div>
  );
}

export function GamePreviewModal({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [available, setAvailable] = useState(true);
  const [content, setContent] = useState<PreviewContent | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMsg('');
    supabase.functions
      .invoke('game-preview-sync', { body: { game_id: gameId } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || data?.error) {
          setErrorMsg('Could not load the game preview.');
        } else {
          setAvailable(!!data.available);
          setContent(data.content ?? null);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [gameId]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-2xl bg-vgd-card border border-white/10 rounded-xl shadow-2xl modal-enter max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07] sticky top-0 bg-vgd-card z-10">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-vgd-orange flex-shrink-0" />
            <h2 className="text-[11px] font-bold text-white/90 uppercase tracking-[0.12em]">Game Preview</h2>
          </div>
          <button onClick={onClose} className="p-1 text-vgd-muted hover:text-white transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="py-14 flex justify-center">
              <Loader2 className="w-6 h-6 text-vgd-orange animate-spin" />
            </div>
          ) : errorMsg ? (
            <p className="text-sm text-vgd-red text-center py-10">{errorMsg}</p>
          ) : !available || !content ? (
            <p className="text-sm text-vgd-muted text-center py-10">No preview available for this game yet.</p>
          ) : (
            <div className="space-y-5">
              {/* Headline */}
              <div>
                <h3 className="text-lg font-black text-white leading-snug">{content.headline}</h3>
                {content.subhead && <p className="text-xs text-vgd-muted mt-1">{content.subhead}</p>}
              </div>

              {/* Opening line / how to watch */}
              {(content.openingLine || content.howToWatch) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {content.openingLine && (
                    <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                      <p className="text-[9px] text-vgd-muted uppercase tracking-wider mb-0.5">Opening Line</p>
                      <p className="text-xs text-white/85">{content.openingLine}</p>
                    </div>
                  )}
                  {content.howToWatch && (
                    <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                      <p className="text-[9px] text-vgd-muted uppercase tracking-wider mb-0.5">How to Watch</p>
                      <p className="text-xs text-white/85">{content.howToWatch}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Key stats */}
              {content.keyStats.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-vgd-orange uppercase tracking-wider mb-2">Key Stats</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {content.keyStats.map((ks) => (
                      <div key={ks.team} className="border border-white/10 rounded-lg overflow-hidden">
                        <div className="px-3 py-1.5 bg-white/[0.04] text-xs font-bold text-white">{ks.team}</div>
                        <div className="p-3 space-y-2">
                          <StatBlockList label="Offense" stats={ks.offense} />
                          <StatBlockList label="Defense" stats={ks.defense} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {content.keyStatsNotes.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {content.keyStatsNotes.map((n, i) => (
                        <li key={i} className="text-[11px] text-white/70 leading-snug">{n}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Team leaders */}
              {content.teamLeaders.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-vgd-orange uppercase tracking-wider mb-2">Team Leaders</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {content.teamLeaders.map((tl) => (
                      <div key={tl.team} className="border border-white/10 rounded-lg overflow-hidden">
                        <div className="px-3 py-1.5 bg-white/[0.04] text-xs font-bold text-white">{tl.team}</div>
                        <div className="p-3 space-y-1.5">
                          {(['passing', 'rushing', 'receiving'] as const).map((k) => tl[k] && (
                            <p key={k} className="text-[11px] text-white/80 leading-snug">
                              <span className="text-[9px] text-vgd-orange/80 uppercase font-bold tracking-wider mr-1">
                                {k}
                              </span>
                              {tl[k]}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Last game */}
              {content.lastGame.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-vgd-orange uppercase tracking-wider mb-2">Last Game</p>
                  <div className="space-y-2">
                    {content.lastGame.map((lg, i) => (
                      <p key={i} className="text-[11px] text-white/75 leading-relaxed">{lg.summary}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Next game */}
              {content.nextGame.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-vgd-orange uppercase tracking-wider mb-2">Next Game</p>
                  {content.nextGame.map((n, i) => (
                    <p key={i} className="text-[11px] text-white/75 leading-relaxed">{n}</p>
                  ))}
                </div>
              )}

              <p className="text-[9px] text-vgd-muted/60 text-right pt-2 border-t border-white/[0.05]">
                Source: ESPN
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
