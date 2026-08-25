import { useState, useEffect } from 'react';
import { Newspaper, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardCard } from '../ui/DashboardCard';

interface ScrapedArticle {
  id: string;
  title: string;
  summary: string;
  source_name: string | null;
  source_url: string;
  thumbnail_url: string | null;
  published_at: string | null;
  ingested_at: string;
  is_pinned: boolean;
  pin_expires_at: string | null;
}

interface VolNewsWireProps {
  sportCategory: string;
  /** When true, fetch the 15 most recent articles across ALL sport categories (Main Page mode per §18). */
  crossSport?: boolean;
}

function ArticleModal({
  article,
  onClose,
}: {
  article: ScrapedArticle;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-vgd-card border border-white/[0.1] rounded-xl max-w-lg w-full overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {article.thumbnail_url && (
          <div className="relative h-40 bg-white/[0.04]">
            <img
              src={article.thumbnail_url}
              alt=""
              className="w-full h-full object-cover"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
        <div className="p-5">
          {article.source_name && (
            <p className="text-[10px] font-semibold text-vgd-orange uppercase tracking-wider mb-2">
              {article.source_name}
            </p>
          )}
          <h3 className="text-sm font-bold text-white leading-snug mb-3">{article.title}</h3>
          <p className="text-xs text-white/60 leading-relaxed mb-4">{article.summary}</p>
          <a
            href={article.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-vgd-orange hover:bg-vgd-orange/90 text-white text-xs font-bold rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Click to Read More
          </a>
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso: string | null, fallback: string): string {
  if (!iso) return fallback;
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function VolNewsWire({ sportCategory, crossSport = false }: VolNewsWireProps) {
  const [articles, setArticles] = useState<ScrapedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ScrapedArticle | null>(null);

  useEffect(() => {
    let query = supabase
      .from('scraped_articles')
      .select('id, title, summary, source_name, source_url, thumbnail_url, published_at, ingested_at, is_pinned, pin_expires_at')
      .eq('is_hidden', false);

    if (!crossSport) {
      query = query.eq('sport_category', sportCategory);
    }

    query
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(30)
      .then(({ data }) => {
        const now = Date.now();
        const sorted = ((data as ScrapedArticle[]) ?? []).sort((a, b) => {
          const aPinned = a.is_pinned && (!a.pin_expires_at || new Date(a.pin_expires_at).getTime() > now);
          const bPinned = b.is_pinned && (!b.pin_expires_at || new Date(b.pin_expires_at).getTime() > now);
          if (aPinned !== bPinned) return aPinned ? -1 : 1;
          return 0;
        }).slice(0, 15);
        setArticles(sorted);
        setLoading(false);
      });
  }, [sportCategory, crossSport]);

  return (
    <>
      <DashboardCard
        title="VOL NEWS WIRE"
        metadataTag={
          articles.length > 0 ? (
            <span className="text-[10px] text-vgd-muted">{articles.length} SOURCES</span>
          ) : undefined
        }
      >
        {loading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-2">
                <div className="w-12 h-9 bg-white/[0.04] rounded flex-shrink-0 animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-2.5 bg-white/[0.04] rounded animate-pulse w-full" />
                  <div className="h-2.5 bg-white/[0.04] rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-vgd-muted" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white/50">No articles yet</p>
              <p className="text-[10px] text-white/30 mt-0.5">News ingestion runs twice daily.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {articles.map((a, i) => (
              <button
                key={a.id}
                onClick={() => setActive(a)}
                className="w-full flex gap-2.5 px-3 py-2.5 hover:bg-white/[0.03] transition-colors text-left group"
              >
                {/* Source badge or thumbnail */}
                <div className="flex-shrink-0 w-5 text-[11px] font-black text-vgd-orange text-right pt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-white/85 group-hover:text-white transition-colors line-clamp-2 leading-snug">
                    {a.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {a.source_name && (
                      <span className="text-[10px] text-vgd-orange/70 font-medium truncate max-w-[80px]">
                        {a.source_name}
                      </span>
                    )}
                    <span className="text-[10px] text-vgd-muted">
                      {timeAgo(a.published_at, timeAgo(a.ingested_at, 'Recently'))}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3 h-3 text-white/20 flex-shrink-0 mt-0.5 group-hover:text-white/50 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </DashboardCard>

      {active && <ArticleModal article={active} onClose={() => setActive(null)} />}
    </>
  );
}
