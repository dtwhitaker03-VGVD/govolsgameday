import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, Eye, Flame, TrendingUp, X, Loader2, AlertCircle, Image as ImageIcon, Beer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { UsernameHoverCard } from '../components/ui/UsernameHoverCard';

// ─── Constants ─────────────────────────────────────────────────────────────────

interface CategoryDef {
  key: string;
  label: string;
  icon: string;
}

const CATEGORIES: CategoryDef[] = [
  { key: 'general', label: 'General', icon: 'MessageSquare' },
  { key: 'football', label: 'Football', icon: 'MessageSquare' },
  { key: 'football_recruiting', label: 'Football Recruiting', icon: 'MessageSquare' },
  { key: 'basketball', label: 'Basketball', icon: 'MessageSquare' },
  { key: 'basketball_recruiting', label: 'Basketball Recruiting', icon: 'MessageSquare' },
  { key: 'baseball', label: 'Baseball', icon: 'MessageSquare' },
  { key: 'lady_vol_basketball', label: 'Lady Vol Basketball', icon: 'MessageSquare' },
  { key: 'lady_vol_softball', label: 'Lady Vol Softball', icon: 'MessageSquare' },
  { key: 'other_sports', label: 'Other Sports', icon: 'MessageSquare' },
  { key: 'other_recruiting', label: 'Other Recruiting', icon: 'MessageSquare' },
  { key: 'tickets', label: 'Tickets', icon: 'MessageSquare' },
];

const CATEGORY_COLORS: Record<string, string> = {
  general: '#60a5fa',
  football: '#FF8200',
  football_recruiting: '#fb923c',
  basketball: '#34d399',
  basketball_recruiting: '#22d3ee',
  baseball: '#4ade80',
  lady_vol_basketball: '#f472b6',
  lady_vol_softball: '#e879f9',
  other_sports: '#a78bfa',
  other_recruiting: '#c084fc',
  tickets: '#fdba74',
};

const TITLE_MAX = 50;
const THREADS_PER_CATEGORY = 10;

// ─── Types ───────────────────────────────────────────────────────────────────────

interface ForumThread {
  id: string;
  user_id: string | null;
  username: string | null;
  title: string;
  body: string | null;
  category: string;
  reply_count: number;
  view_count: number;
  created_at: string;
  last_active_at: string;
  last_reply_username: string | null;
  last_reply_at: string | null;
  has_questionable_take: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function formatAge(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// Page-number pills: estimate pages from reply_count (10 per page)
function pagePills(replyCount: number): number[] {
  const pages = Math.ceil(replyCount / 10);
  if (pages <= 1) return [];
  return Array.from({ length: Math.min(pages, 4) }, (_, i) => i + 1);
}

// Hot Thread: >20 replies in last 24h; Going Viral: >100 views
function isHotThread(thread: ForumThread): boolean {
  const ageHrs = (Date.now() - new Date(thread.created_at).getTime()) / 3_600_000;
  return thread.reply_count >= 20 && ageHrs <= 24;
}

function isGoingViral(thread: ForumThread): boolean {
  return thread.view_count >= 100;
}

// ─── Thread Row ──────────────────────────────────────────────────────────────────

function ThreadRow({ thread }: { thread: ForumThread }) {
  const navigate = useNavigate();
  const pills = pagePills(thread.reply_count);
  const hot = isHotThread(thread);
  const viral = isGoingViral(thread);
  const categoryColor = CATEGORY_COLORS[thread.category] || '#58595B';

  return (
    <div
      onClick={() => navigate(`/forums/${thread.id}`)}
      className="group flex items-start gap-2.5 px-3 py-2 hover:bg-white/[0.03] transition-colors rounded-md cursor-pointer"
    >
      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm text-white font-medium truncate group-hover:text-vgd-orange transition-colors">
            {thread.title}
          </span>
          {hot && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">
              <Flame className="w-2.5 h-2.5" />
              Hot
            </span>
          )}
          {viral && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
              <TrendingUp className="w-2.5 h-2.5" />
              Viral
            </span>
          )}
          {thread.has_questionable_take && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
              <Beer className="w-2.5 h-2.5" />
              Questionable Take
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {thread.username && thread.user_id ? (
            <UsernameHoverCard userId={thread.user_id} username={thread.username}>
              <span className="text-xs text-vgd-orange hover:text-orange-400 font-medium transition-colors cursor-pointer">
                {thread.username}
              </span>
            </UsernameHoverCard>
          ) : (
            <span className="text-xs text-vgd-muted">Anonymous</span>
          )}
          <span className="text-[10px] text-vgd-muted">{formatAge(thread.created_at)}</span>
          {/* Category tag */}
          <span
            className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
          >
            {CATEGORIES.find((c) => c.key === thread.category)?.label || thread.category}
          </span>
        </div>
      </div>

      {/* Page pills */}
      {pills.length > 0 && (
        <div className="hidden sm:flex items-center gap-0.5 flex-shrink-0 mt-0.5">
          {pills.map((p) => (
            <span
              key={p}
              className="text-[9px] text-vgd-muted hover:text-vgd-orange hover:bg-white/[0.06] px-1 py-0.5 rounded transition-colors cursor-pointer"
            >
              {p}
            </span>
          ))}
        </div>
      )}

      {/* Reply / view counts */}
      <div className="flex items-center gap-3 flex-shrink-0 mt-0.5 text-right">
        <div className="flex flex-col items-center">
          <span className="text-xs text-white/80 font-medium">{formatCount(thread.reply_count)}</span>
          <span className="text-[8px] text-vgd-muted uppercase">replies</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-white/80 font-medium">{formatCount(thread.view_count)}</span>
          <span className="text-[8px] text-vgd-muted uppercase">views</span>
        </div>
      </div>

      {/* Last reply */}
      {thread.last_reply_username && (
        <div className="hidden lg:block flex-shrink-0 text-right min-w-[100px] mt-0.5">
          <div className="text-[10px] text-vgd-muted">Last reply</div>
          <div className="text-xs text-white/70 truncate">{thread.last_reply_username}</div>
          <div className="text-[10px] text-vgd-muted">{formatAge(thread.last_reply_at || thread.last_active_at)}</div>
        </div>
      )}
    </div>
  );
}

// ─── Category Card ───────────────────────────────────────────────────────────────

function CategoryCard({
  category,
  threads,
  onNewThread,
}: {
  category: CategoryDef;
  threads: ForumThread[];
  onNewThread: (categoryKey: string) => void;
}) {
  const color = CATEGORY_COLORS[category.key] || '#58595B';

  return (
    <div className="bg-vgd-card border border-white/[0.07] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/90 truncate">
            {category.label}
          </span>
          <span className="text-[10px] text-vgd-muted flex-shrink-0">{threads.length}</span>
        </div>
        <button
          onClick={() => onNewThread(category.key)}
          className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-vgd-muted hover:text-vgd-orange hover:bg-white/[0.06] transition-colors"
          title={`New thread in ${category.label}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Threads */}
      <div className="py-1">
        {threads.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-vgd-muted">No threads yet</p>
            <button
              onClick={() => onNewThread(category.key)}
              className="mt-2 text-[11px] text-vgd-orange hover:text-orange-400 font-medium transition-colors"
            >
              Start the conversation
            </button>
          </div>
        ) : (
          threads.map((t) => <ThreadRow key={t.id} thread={t} />)
        )}
      </div>
    </div>
  );
}

// ─── Thread Creation Modal ──────────────────────────────────────────────────────

function CreateThreadModal({
  preselectedCategory,
  onClose,
  onCreated,
}: {
  preselectedCategory: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { session, profile, openAuthModal } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState(preselectedCategory || 'general');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [embeds, setEmbeds] = useState<string[]>([]);

  // If not signed in, prompt auth
  useEffect(() => {
    if (!session) {
      openAuthModal('register');
      onClose();
    }
  }, [session, openAuthModal, onClose]);

  const remaining = TITLE_MAX - title.length;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        setEmbeds((prev) => [...prev, url]);
      }
    }
  }, []);

  const handleSubmit = async () => {
    if (!session || !profile) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please enter a title.');
      return;
    }
    if (trimmedTitle.length > TITLE_MAX) {
      setError(`Title must be ${TITLE_MAX} characters or fewer.`);
      return;
    }

    setSubmitting(true);
    setError('');

    let finalBody = body.trim();
    if (embeds.length > 0) {
      const embedMarkdown = embeds.map((url) => `\n\n[embed](${url})`).join('');
      finalBody += embedMarkdown;
    }

    const { data: threadData, error: insertError } = await supabase.from('forum_threads').insert({
      user_id: session.user.id,
      username: profile.username,
      title: trimmedTitle,
      body: finalBody || null,
      category,
    }).select('id').single();

    if (insertError || !threadData) {
      setSubmitting(false);
      const msg = (insertError?.message || '').toLowerCase();
      if (msg.includes('suspended') || msg.includes('banned')) {
        setError('Your posting privileges have been suspended.');
      } else if (msg.includes('code of conduct')) {
        setError('Your submission was rejected for violating the Code of Conduct.');
      } else {
        setError('Something went wrong. Please try again.');
      }
      return;
    }

    // Create the OP post row so reactions and quotes can attach to a real post ID
    await supabase.from('forum_posts').insert({
      thread_id: threadData.id,
      user_id: session.user.id,
      username: profile.username,
      body: finalBody || trimmedTitle,
      is_op: true,
    });

    setSubmitting(false);
    onCreated();
    onClose();
  };

  if (!session) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-lg bg-vgd-card border border-white/10 rounded-xl shadow-2xl modal-enter max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07] sticky top-0 bg-vgd-card z-10">
          <h2 className="text-lg font-bold text-white">Create New Thread</h2>
          <button onClick={onClose} className="p-1 text-vgd-muted hover:text-white transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 bg-vgd-red/10 border border-vgd-red/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-vgd-red flex-shrink-0 mt-0.5" />
              <p className="text-sm text-vgd-red leading-snug">{error}</p>
            </div>
          )}

          {/* Category select */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={submitting}
              className="w-full bg-vgd-bg border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-vgd-orange/60 focus:ring-1 focus:ring-vgd-orange/30 transition-all disabled:opacity-50"
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
              disabled={submitting}
              placeholder="Thread title…"
              className="w-full bg-vgd-bg border border-white/10 text-white placeholder-vgd-muted rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-vgd-orange/60 focus:ring-1 focus:ring-vgd-orange/30 transition-all disabled:opacity-50"
            />
            <div className="flex justify-end mt-1">
              <span className={`text-xs ${remaining < 10 ? 'text-vgd-red' : 'text-vgd-muted'}`}>
                {remaining} characters left
              </span>
            </div>
          </div>

          {/* Body with drag-and-drop */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">Body</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`relative rounded-lg border-2 border-dashed transition-colors ${
                dragOver ? 'border-vgd-orange/60 bg-vgd-orange/5' : 'border-white/10'
              }`}
            >
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={submitting}
                placeholder="Write your post…  Drag and drop images, GIFs, or videos to embed them."
                rows={5}
                className="w-full bg-transparent text-white placeholder-vgd-muted px-3.5 py-2.5 text-sm focus:outline-none resize-y min-h-[120px] disabled:opacity-50"
              />
              {embeds.length > 0 && (
                <div className="px-3 pb-2.5 flex flex-wrap gap-2">
                  {embeds.map((url, i) => (
                    <div key={i} className="relative group">
                      {url.match(/\.(mp4|webm|mov)/i) ? (
                        <video src={url} className="w-16 h-16 rounded object-cover" />
                      ) : (
                        <img src={url} alt="embed" className="w-16 h-16 rounded object-cover" />
                      )}
                      <button
                        onClick={() => setEmbeds((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-vgd-red rounded-full flex items-center justify-center text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="absolute bottom-2 right-2.5 flex items-center gap-1 text-[10px] text-vgd-muted pointer-events-none">
                <ImageIcon className="w-3 h-3" />
                Drop to embed
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-white/[0.07] sticky bottom-0 bg-vgd-card">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm text-vgd-muted hover:text-white font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !title.trim()}
            className="px-5 py-2 rounded-lg bg-vgd-orange hover:bg-orange-500 text-white font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Post Thread
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Forums Page ─────────────────────────────────────────────────────────────

export default function Forums() {
  const { session, openAuthModal } = useAuth();
  const [threadsByCategory, setThreadsByCategory] = useState<Record<string, ForumThread[]>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [preselectedCategory, setPreselectedCategory] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch threads for all 11 categories
  useEffect(() => {
    setLoading(true);
    Promise.all(
      CATEGORIES.map((cat) =>
        supabase.rpc('get_forum_threads_by_category', {
          p_category: cat.key,
          p_limit: THREADS_PER_CATEGORY,
        }).then(({ data }) => ({
          category: cat.key,
          threads: (data || []) as ForumThread[],
        }))
      )
    ).then((results) => {
      const map: Record<string, ForumThread[]> = {};
      for (const r of results) {
        map[r.category] = r.threads;
      }
      setThreadsByCategory(map);
      setLoading(false);
    });
  }, [refreshKey]);

  const handleNewThread = useCallback((categoryKey: string | null) => {
    if (!session) {
      openAuthModal('register');
      return;
    }
    setPreselectedCategory(categoryKey);
    setShowCreateModal(true);
  }, [session, openAuthModal]);

  const handleThreadCreated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Forums</h1>
          <p className="text-vgd-muted text-sm mt-0.5">Browse discussions across all categories</p>
        </div>
        <button
          onClick={() => handleNewThread(null)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-vgd-orange hover:bg-orange-500 text-white font-bold text-sm transition-colors shadow-lg shadow-vgd-orange/20"
        >
          <Plus className="w-4 h-4" />
          Create New Forum
        </button>
      </div>

      {/* Category grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => (
            <div key={cat.key} className="bg-vgd-card border border-white/[0.07] rounded-lg h-64 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => (
            <CategoryCard
              key={cat.key}
              category={cat}
              threads={threadsByCategory[cat.key] || []}
              onNewThread={handleNewThread}
            />
          ))}
        </div>
      )}

      {/* Create thread modal */}
      {showCreateModal && (
        <CreateThreadModal
          preselectedCategory={preselectedCategory}
          onClose={() => { setShowCreateModal(false); setPreselectedCategory(null); }}
          onCreated={handleThreadCreated}
        />
      )}
    </div>
  );
}
