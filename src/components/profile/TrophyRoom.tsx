import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardCard } from '../ui/DashboardCard';
import { useBadgeCatalog } from '../../lib/badgeCatalog';
import { getBadgeIcon } from '../../lib/badgeIcons';

export function TrophyRoom({ userId }: { userId: string }) {
  const { badges: catalog, loading: catalogLoading } = useBadgeCatalog();
  const [earnedKeys, setEarnedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

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
  const isLoading = loading || catalogLoading;

  return (
    <DashboardCard
      title="DIGITAL TROPHY ROOM"
      statusDotColor="#FF8200"
      metadataTag={!isLoading && <span>{earnedKeys.size} / {badgeList.length}</span>}
    >
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-vgd-orange/30 border-t-vgd-orange rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {badgeList.map((b) => {
              const earned = earnedKeys.has(b.badge_key);
              const Icon = getBadgeIcon(b.icon);
              const legendary = b.tier === 'legendary';
              return (
                <div
                  key={b.badge_key}
                  className="group relative flex flex-col items-center gap-1.5"
                  title={`${b.label} — ${b.description}${earned ? '' : ' (locked)'}`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${
                      earned
                        ? legendary
                          ? 'bg-gradient-to-br from-amber-300 via-vgd-orange to-fuchsia-500 border-transparent shadow-lg shadow-vgd-orange/30 badge-shimmer'
                          : 'bg-vgd-orange/15 border-vgd-orange/40'
                        : 'bg-white/[0.03] border-white/[0.07] opacity-40'
                    }`}
                  >
                    {earned ? (
                      <Icon className={`w-5 h-5 ${legendary ? 'text-white' : 'text-vgd-orange'}`} />
                    ) : (
                      <Lock className="w-4 h-4 text-vgd-muted" />
                    )}
                  </div>
                  <span className={`text-[9px] text-center leading-tight ${earned ? 'text-white/70' : 'text-vgd-muted'}`}>
                    {b.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
