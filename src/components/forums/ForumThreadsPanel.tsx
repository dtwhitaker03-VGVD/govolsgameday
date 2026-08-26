import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Eye, Flame } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardCard } from '../ui/DashboardCard';

interface ForumThread {
  id: string;
  username: string | null;
  title: string;
  category: string;
  reply_count: number;
  view_count: number;
  created_at: string;
  last_active_at: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    general: 'General',
    football: 'Football',
    football_recruiting: 'FB Recruiting',
    basketball: 'Basketball',
    basketball_recruiting: 'BB Recruiting',
    baseball: 'Baseball',
    lady_vol_basketball: 'LV Basketball',
    lady_vol_softball: 'LV Softball',
    other_sports: 'Other Sports',
    other_recruiting: 'Other Recruiting',
    tickets: 'Tickets',
  };
  return map[cat] ?? cat;
}

function ThreadRow({ thread }: { thread: ForumThread }) {
  const navigate = useNavigate();
  const isHot = thread.view_count > 1000;
  const isViral = thread.view_count > 10000;

  return (
    <div
      onClick={() => navigate(`/forums/${thread.id}`)}
      className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-white/[0.03] transition-colors border-b border-white/[0.05] last:border-0 cursor-pointer group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5 mb-1">
          <p className="text-[11px] font-semibold text-white/85 group-hover:text-white transition-colors line-clamp-2 leading-snug flex-1">
            {thread.title}
          </p>
          {isViral && (
            <span className="flex-shrink-0 text-[9px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded px-1 py-0.5 mt-0.5">
              VIRAL
            </span>
          )}
          {!isViral && isHot && (
            <Flame className="flex-shrink-0 w-3 h-3 text-vgd-orange mt-0.5" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-vgd-orange/70 font-medium truncate max-w-[80px]">
            {thread.username ?? 'Unknown'}
          </span>
          <span className="text-[10px] text-vgd-muted">
            {timeAgo(thread.created_at)}
          </span>
          <span className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-0.5 text-[10px] text-white/30">
              <MessageSquare className="w-2.5 h-2.5" />
              {thread.reply_count}
            </span>
            <span className="flex items-center gap-0.5 text-[10px] text-white/30">
              <Eye className="w-2.5 h-2.5" />
              {thread.view_count >= 1000
                ? `${(thread.view_count / 1000).toFixed(1)}k`
                : thread.view_count}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyThreads() {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-4">
      <MessageSquare className="w-6 h-6 text-vgd-muted/50" />
      <p className="text-xs font-semibold text-white/40">No threads yet</p>
      <p className="text-[10px] text-white/25">Be the first to post!</p>
    </div>
  );
}

type PanelMode = 'new' | 'popular' | 'recruiting';

interface ForumThreadsPanelProps {
  mode: PanelMode;
  /** When provided, filters threads to this forum category. */
  category?: string;
  /** Recruiting category override (e.g. 'football_recruiting'). Required when mode='recruiting'. */
  recruitingCategory?: string;
}

export function ForumThreadsPanel({ mode, category, recruitingCategory }: ForumThreadsPanelProps) {
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [popularRange, setPopularRange] = useState<'48hr' | 'all'>('48hr');

  useEffect(() => {
    setLoading(true);

    const query = supabase
      .from('forum_threads')
      .select('id, username, title, category, reply_count, view_count, created_at, last_active_at')
      .limit(10);

    if (mode === 'recruiting') {
      const rc = recruitingCategory ?? 'football_recruiting';
      query.eq('category', rc).order('last_active_at', { ascending: false });
    } else if (mode === 'new') {
      if (category) query.eq('category', category);
      query.order('created_at', { ascending: false });
    } else {
      // popular
      if (category) query.eq('category', category);
      if (popularRange === '48hr') {
        const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
        query.gte('created_at', cutoff);
      }
      query.order('view_count', { ascending: false });
    }

    query.then(({ data }) => {
      setThreads((data as ForumThread[]) ?? []);
      setLoading(false);
    });
  }, [mode, category, recruitingCategory, popularRange]);

  const title =
    mode === 'new'
      ? 'NEW THREADS'
      : mode === 'recruiting'
      ? 'RECRUITING THREADS'
      : 'MOST POPULAR THREADS';

  const meta =
    mode === 'popular' ? (
      <div className="flex items-center gap-1">
        <button
          onClick={() => setPopularRange('48hr')}
          className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
            popularRange === '48hr'
              ? 'bg-vgd-orange/20 border-vgd-orange/50 text-vgd-orange'
              : 'border-white/[0.08] text-white/40 hover:text-white/70'
          }`}
        >
          48HR
        </button>
        <button
          onClick={() => setPopularRange('all')}
          className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
            popularRange === 'all'
              ? 'bg-vgd-orange/20 border-vgd-orange/50 text-vgd-orange'
              : 'border-white/[0.08] text-white/40 hover:text-white/70'
          }`}
        >
          All Time
        </button>
      </div>
    ) : undefined;

  return (
    <DashboardCard title={title} metadataTag={meta}>
      {loading ? (
        <div className="p-3 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-white/[0.03] rounded animate-pulse" />
          ))}
        </div>
      ) : threads.length === 0 ? (
        <EmptyThreads />
      ) : (
        <div>
          {threads.map(t => (
            <ThreadRow key={t.id} thread={t} />
          ))}
        </div>
      )}
    </DashboardCard>
  );
}
