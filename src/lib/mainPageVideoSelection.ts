export type MainPageTab = 'latest' | 'popular';

export interface MainPageVideoCandidate {
  id: string;
  channel_name?: string | null;
  published_at: string | null;
  view_count: number;
}

/**
 * The Main Page's channel-priority selection rules (§17): up to 2 videos per
 * channel from the priority set, sorted by the active tab, then filled to
 * `targetCount` from the keyword-scraped fallback. Shared between the public
 * VideoGrid and the admin review list so both always agree on exactly which
 * videos are "on the main page" — the admin list uses this to surface those
 * videos first, so a broken one is never harder to find there than it is to
 * spot on the live site.
 */
export function selectMainPageVideos<T extends MainPageVideoCandidate>(
  priority: T[],
  fallback: T[],
  tab: MainPageTab,
  targetCount = 24
): T[] {
  const seenIds = new Set<string>();
  const channelCounts = new Map<string, number>();
  const qualified: T[] = [];

  for (const v of priority) {
    if (seenIds.has(v.id)) continue;
    const ch = v.channel_name ?? '__unknown__';
    if ((channelCounts.get(ch) ?? 0) >= 2) continue;
    channelCounts.set(ch, (channelCounts.get(ch) ?? 0) + 1);
    seenIds.add(v.id);
    qualified.push(v);
  }

  if (tab === 'latest') {
    qualified.sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''));
  } else {
    qualified.sort((a, b) => b.view_count - a.view_count);
  }

  const result = qualified.slice(0, targetCount);
  for (const v of fallback) {
    if (result.length >= targetCount) break;
    if (!seenIds.has(v.id)) { seenIds.add(v.id); result.push(v); }
  }

  return result;
}
