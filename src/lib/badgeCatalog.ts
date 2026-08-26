import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export interface BadgeDef {
  badge_key: string;
  label: string;
  description: string;
  icon: string;
  track: string;
  tier: 'standard' | 'legendary';
  sort_order: number;
}

// Module-level cache — the badge catalog is static reference data (68 rows),
// so every consumer on the page shares one fetch instead of re-querying.
let cachePromise: Promise<Record<string, BadgeDef>> | null = null;

async function loadCatalog(): Promise<Record<string, BadgeDef>> {
  const { data } = await supabase
    .from('badges')
    .select('badge_key, label, description, icon, track, tier, sort_order')
    .order('sort_order', { ascending: true });

  const byKey: Record<string, BadgeDef> = {};
  for (const row of (data as BadgeDef[]) ?? []) {
    byKey[row.badge_key] = row;
  }
  return byKey;
}

function fetchCatalog(): Promise<Record<string, BadgeDef>> {
  if (!cachePromise) {
    cachePromise = loadCatalog();
  }
  return cachePromise;
}

export function useBadgeCatalog(): { badges: Record<string, BadgeDef>; loading: boolean } {
  const [badges, setBadges] = useState<Record<string, BadgeDef>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchCatalog().then((byKey) => {
      if (!cancelled) {
        setBadges(byKey);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { badges, loading };
}

export function badgeLabel(key: string, catalog: Record<string, BadgeDef>): string {
  return catalog[key]?.label ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
