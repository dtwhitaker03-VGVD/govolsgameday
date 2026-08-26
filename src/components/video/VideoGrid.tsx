import { useState, useEffect, useRef } from 'react';
import { Play, Clock, Video, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardCard } from '../ui/DashboardCard';
import { trackVideoOpen } from '../../lib/analytics';

interface ScrapedVideo {
  id: string;
  title: string;
  thumbnail_url: string;
  video_url: string;
  duration: string | null;
  view_count: number;
  published_at: string;
  channel_name?: string | null;
}

interface VideoGridProps {
  sportCategory: string;
  title?: string;
  /** When true, uses the curated cross-sport Main Page query instead of filtering by sportCategory */
  mainPageMode?: boolean;
}

type Tab = 'latest' | 'popular';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function youtubeEmbedUrl(videoUrl: string): string {
  try {
    const u = new URL(videoUrl);
    const id = u.searchParams.get('v') ?? u.pathname.split('/').pop() ?? '';
    return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
  } catch {
    return videoUrl;
  }
}

// ─── Video modal (theater-style) ──────────────────────────────────────────────

function VideoModal({
  video,
  onClose,
}: {
  video: ScrapedVideo;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-vgd-card border border-white/[0.1] rounded-xl overflow-hidden shadow-2xl w-[85vw] max-w-[1400px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-3.5 border-b border-white/[0.07]">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white/90 line-clamp-1 leading-snug">
              {video.title}
            </p>
            {video.channel_name && (
              <p className="text-[11px] text-vgd-muted mt-0.5">{video.channel_name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.07] hover:bg-white/[0.15] transition-colors"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        {/* YouTube iframe — true 16:9 */}
        <div className="relative w-full aspect-video bg-black">
          <iframe
            src={youtubeEmbedUrl(video.video_url)}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Video card ───────────────────────────────────────────────────────────────

function VideoCard({
  video,
  onPlay,
}: {
  video: ScrapedVideo;
  onPlay: (v: ScrapedVideo) => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      onClick={() => onPlay(video)}
      className="group flex flex-col gap-1 text-left w-full"
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-white/[0.05] rounded-md overflow-hidden">
        {!imgError ? (
          <img
            src={video.thumbnail_url}
            alt=""
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/[0.04]">
            <Play className="w-8 h-8 text-vgd-orange/50" />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/30">
          <div className="w-10 h-10 rounded-full bg-vgd-orange/90 flex items-center justify-center">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>
        {/* Duration pill */}
        {video.duration && (
          <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
            {video.duration}
          </div>
        )}
      </div>
      {/* Title */}
      <p className="text-[11px] font-medium text-white/80 group-hover:text-white transition-colors line-clamp-2 leading-snug mt-0.5">
        {video.title}
      </p>
      {/* Channel name */}
      {video.channel_name && (
        <p className="text-[10px] text-vgd-muted truncate">{video.channel_name}</p>
      )}
    </button>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyVideoState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center">
        <Video className="w-6 h-6 text-vgd-muted" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white/60">No videos yet</p>
        <p className="text-xs text-white/30 mt-0.5">
          Video ingestion runs twice daily — check back soon.
        </p>
      </div>
    </div>
  );
}

// ─── Main Page channel-priority query (§17 finalized model) ──────────────────
// Priority channels (Tier 1 + Tier 2), up to 2 per channel = 22 max.
// Qualified set is re-sorted by toggle before display.
// Fallback keyword-scraped content fills remaining slots to 24.

async function fetchMainPageVideos(tab: Tab): Promise<ScrapedVideo[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (tab === 'latest' ? 14 : 30));
  const cutoffISO = cutoff.toISOString();

  const [priorityRes, fallbackRes] = await Promise.all([
    // Priority channels — Tier 1 (priority=1) and Tier 2 (priority=2)
    supabase
      .from('scraped_videos')
      .select('id, title, thumbnail_url, video_url, duration, view_count, published_at, channel_name')
      .in('channel_priority', [1, 2])
      .eq('is_hidden', false)
      .gte('published_at', cutoffISO)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(200),

    // Keyword-scraped fallback (Tier 3)
    supabase
      .from('scraped_videos')
      .select('id, title, thumbnail_url, video_url, duration, view_count, published_at, channel_name')
      .eq('sport_category', 'main')
      .is('channel_priority', null)
      .eq('is_hidden', false)
      .gte('published_at', cutoffISO)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(24),
  ]);

  const priority = (priorityRes.data ?? []) as ScrapedVideo[];
  const fallback  = (fallbackRes.data ?? []) as ScrapedVideo[];

  // Step 1: select qualifying videos — up to 2 per channel
  const seenIds       = new Set<string>();
  const channelCounts = new Map<string, number>();
  const qualified: ScrapedVideo[] = [];

  for (const v of priority) {
    if (seenIds.has(v.id)) continue;
    const ch = v.channel_name ?? '__unknown__';
    if ((channelCounts.get(ch) ?? 0) >= 2) continue;
    channelCounts.set(ch, (channelCounts.get(ch) ?? 0) + 1);
    seenIds.add(v.id);
    qualified.push(v);
  }

  // Step 2: sort the qualified set by the active toggle (spec §17)
  if (tab === 'latest') {
    qualified.sort((a, b) => b.published_at.localeCompare(a.published_at));
  } else {
    qualified.sort((a, b) => b.view_count - a.view_count);
  }

  // Step 3: fill remaining slots to 24 from fallback
  const result = qualified.slice(0, 24);
  for (const v of fallback) {
    if (result.length >= 24) break;
    if (!seenIds.has(v.id)) { seenIds.add(v.id); result.push(v); }
  }

  return result;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VideoGrid({
  sportCategory,
  title = 'VOL VIDEO HUB — YOUTUBE',
  mainPageMode = false,
}: VideoGridProps) {
  const [tab,     setTab]     = useState<Tab>('latest');
  const [videos,  setVideos]  = useState<ScrapedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [active,  setActive]  = useState<ScrapedVideo | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);

    if (mainPageMode) {
      fetchMainPageVideos(tab).then((data) => {
        setVideos(data);
        setLoading(false);
      });
      return;
    }

    // Standard single-category query (3×8 = 24 cards)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (tab === 'latest' ? 14 : 30));

    supabase
      .from('scraped_videos')
      .select('id, title, thumbnail_url, video_url, duration, view_count, published_at, channel_name')
      .eq('sport_category', sportCategory)
      .eq('is_hidden', false)
      .gte('published_at', cutoff.toISOString())
      .order(tab === 'latest' ? 'published_at' : 'view_count', { ascending: false, nullsFirst: false })
      .limit(24)
      .then(({ data }) => {
        setVideos((data as ScrapedVideo[]) ?? []);
        setLoading(false);
      });
  }, [sportCategory, tab, mainPageMode]);

  function handlePlay(v: ScrapedVideo) {
    setActive(v);
    trackVideoOpen(v.title, v.channel_name ?? undefined);
  }

  return (
    <>
      <DashboardCard
        title={title}
        metadataTag={
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTab('latest')}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                tab === 'latest'
                  ? 'bg-vgd-orange/20 border-vgd-orange/50 text-vgd-orange'
                  : 'border-white/[0.08] text-white/40 hover:text-white/70'
              }`}
            >
              Latest
            </button>
            <button
              onClick={() => setTab('popular')}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                tab === 'popular'
                  ? 'bg-vgd-orange/20 border-vgd-orange/50 text-vgd-orange'
                  : 'border-white/[0.08] text-white/40 hover:text-white/70'
              }`}
            >
              Popular
            </button>
          </div>
        }
      >
        {loading ? (
          <div className="p-4 grid grid-cols-4 md:grid-cols-8 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="w-full aspect-video bg-white/[0.04] rounded-md animate-pulse" />
                <div className="h-3 bg-white/[0.04] rounded animate-pulse w-3/4" />
                <div className="h-2.5 bg-white/[0.04] rounded animate-pulse w-1/2" />
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <EmptyVideoState />
        ) : (
          <>
            {/* Desktop: 3 rows × 8 columns */}
            <div className="hidden sm:grid grid-cols-4 md:grid-cols-8 gap-3 p-4">
              {videos.map((v) => (
                <VideoCard key={v.id} video={v} onPlay={handlePlay} />
              ))}
            </div>

            {/* Mobile: dual-column swipeable carousel */}
            <div
              ref={containerRef}
              className="sm:hidden flex gap-3 p-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide"
            >
              {Array.from({ length: Math.ceil(videos.length / 2) }).map((_, col) => {
                const top    = videos[col * 2];
                const bottom = videos[col * 2 + 1];
                return (
                  <div key={col} className="flex-none w-40 snap-start flex flex-col gap-3">
                    {top    && <VideoCard video={top}    onPlay={handlePlay} />}
                    {bottom && <VideoCard video={bottom} onPlay={handlePlay} />}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Source note */}
        <div className="flex items-center gap-1.5 px-4 pb-3 pt-1">
          <Clock className="w-3 h-3 text-vgd-muted" />
          <span className="text-[10px] text-vgd-muted">
            {tab === 'latest' ? 'Published within 14 days' : 'Published within 30 days'} · Updated twice daily
          </span>
        </div>
      </DashboardCard>

      {active && <VideoModal video={active} onClose={() => setActive(null)} />}
    </>
  );
}
