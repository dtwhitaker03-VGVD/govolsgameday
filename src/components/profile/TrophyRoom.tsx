import { useEffect, useState } from 'react';
import { Lock, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardCard } from '../ui/DashboardCard';
import { useBadgeCatalog, type BadgeDef } from '../../lib/badgeCatalog';
import { getBadgeIcon } from '../../lib/badgeIcons';

function BadgeTile({ badge, earned }: { badge: BadgeDef; earned: boolean }) {
  const Icon = getBadgeIcon(badge.icon);
  const legendary = badge.tier === 'legendary';

  return (
    <div
      title={`${badge.label} — ${badge.description}${earned ? '' : ' (locked)'}`}
      className={`relative flex flex-col items-center gap-2 rounded-lg border px-3 py-4 transition-all ${
        earned
          ? legendary
            ? 'border-vgd-orange/50 bg-gradient-to-b from-vgd-orange/10 to-transparent'
            : 'border-white/[0.1] bg-white/[0.03]'
          : 'border-white/[0.05] bg-white/[0.015]'
      }`}
    >
      {!earned && <Lock className="absolute top-2 right-2 w-3 h-3 text-vgd-muted/60" />}
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center ${
          earned
            ? legendary
              ? 'bg-gradient-to-br from-amber-300 via-vgd-orange to-fuchsia-500 shadow-lg shadow-vgd-orange/30 badge-shimmer'
              : 'bg-vgd-orange/15'
            : 'bg-white/[0.04]'
        }`}
      >
        <Icon className={`w-5 h-5 ${earned ? (legendary ? 'text-white' : 'text-vgd-orange') : 'text-vgd-muted/50'}`} />
      </div>
      <span className={`text-[10px] text-center leading-tight font-medium ${earned ? 'text-white/80' : 'text-vgd-muted'}`}>
        {badge.label}
      </span>
    </div>
  );
}

function AllBadgesModal({
  badgeList,
  earnedKeys,
  onClose,
}: {
  badgeList: BadgeDef[];
  earnedKeys: Set<string>;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-vgd-card border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-vgd-card">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            All Badges — {earnedKeys.size} / {badgeList.length}
          </h2>
          <button onClick={onClose} className="text-vgd-muted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {badgeList.map((b) => (
            <BadgeTile key={b.badge_key} badge={b} earned={earnedKeys.has(b.badge_key)} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TrophyRoom({ userId }: { userId: string }) {
  const { badges: catalog, loading: catalogLoading } = useBadgeCatalog();
  const [earnedKeys, setEarnedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from('user_badges')
      .select('badge_key')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (cancelled) return;
        setEarnedKeys(new Set((data ?? []).map((r) => r.badge_key as string)));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const badgeList = Object.values(catalog).sort((a, b) => a.sort_order - b.sort_order);
  const earnedBadges = badgeList.filter((b) => earnedKeys.has(b.badge_key));
  const isLoading = loading || catalogLoading;

  return (
    <DashboardCard
      title="DIGITAL TROPHY ROOM"
      statusDotColor="#FF8200"
      metadataTag={!isLoading && <span>{earnedKeys.size} / {badgeList.length}</span>}
      headerExtra={
        !isLoading && (
          <button
            onClick={() => setShowAll(true)}
            className="text-[10px] font-semibold uppercase tracking-wider text-vgd-orange hover:text-vgd-orange/80 transition-colors border border-vgd-orange/30 rounded-full px-2.5 py-1"
          >
            See All Badges
          </button>
        )
      }
    >
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-vgd-orange/30 border-t-vgd-orange rounded-full animate-spin" />
          </div>
        ) : earnedBadges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <Lock className="w-5 h-5 text-vgd-muted/40" />
            <p className="text-xs text-white/40">No badges earned yet.</p>
            <button
              onClick={() => setShowAll(true)}
              className="text-[10px] font-semibold uppercase tracking-wider text-vgd-orange hover:text-vgd-orange/80 transition-colors"
            >
              See All Badges
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {earnedBadges.map((b) => (
              <BadgeTile key={b.badge_key} badge={b} earned />
            ))}
          </div>
        )}
      </div>
      {showAll && (
        <AllBadgesModal badgeList={badgeList} earnedKeys={earnedKeys} onClose={() => setShowAll(false)} />
      )}
    </DashboardCard>
  );
}
