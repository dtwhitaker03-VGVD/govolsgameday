import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Eye, Flame, Loader2, AlertCircle, Send, Flag, Quote, Reply,
  Pencil, Share2, Smile, X, MessageSquare, Trophy, MapPin, Calendar, CheckCircle2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { UsernameHoverCard } from '../components/ui/UsernameHoverCard';

// ─── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: Record<string, string> = {
  general: 'General',
  football: 'Football',
  football_recruiting: 'Football Recruiting',
  basketball: 'Basketball',
  basketball_recruiting: 'Basketball Recruiting',
  baseball: 'Baseball',
  lady_vol_basketball: 'Lady Vol Basketball',
  lady_vol_softball: 'Lady Vol Softball',
  other_sports: 'Other Sports',
  other_recruiting: 'Other Recruiting',
  tickets: 'Tickets',
};

const CATEGORY_COLORS: Record<string, string> = {
  general: '#60a5fa', football: '#FF8200', football_recruiting: '#fb923c',
  basketball: '#34d399', basketball_recruiting: '#22d3ee', baseball: '#4ade80',
  lady_vol_basketball: '#f472b6', lady_vol_softball: '#e879f9',
  other_sports: '#a78bfa', other_recruiting: '#c084fc', tickets: '#fdba74',
};

const REACTIONS: { key: string; emoji: string; label: string }[] = [
  { key: 'vol_love', emoji: '🧡', label: 'Vol Love' },
  { key: 'fire', emoji: '🔥', label: 'Fire Take' },
  { key: 'facts', emoji: '💯', label: 'Facts' },
  { key: 'funny', emoji: '😂', label: 'Funny' },
  { key: 'disagree', emoji: '👎', label: 'Disagree' },
  { key: 'beer', emoji: '🍺', label: 'What Are You Drinking' },
  { key: 'big_brain', emoji: '🧠', label: 'Big Brain' },
  { key: 'too_real', emoji: '💔', label: 'Too Real' },
];

const REPORT_REASONS = [
  { key: 'spam', label: 'Spam or promotional content' },
  { key: 'harassment', label: 'Harassment or personal attacks' },
  { key: 'hate_speech', label: 'Hate speech or slurs' },
  { key: 'threats', label: 'Threats or inciting violence' },
  { key: 'doxxing', label: 'Sharing private information' },
  { key: 'sexual_content', label: 'Sexual content' },
  { key: 'impersonation', label: 'Impersonation' },
  { key: 'other', label: 'Other (specify below)' },
];

const POSTS_PER_PAGE = 10;

// ─── Types ───────────────────────────────────────────────────────────────────────

interface ThreadData {
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
}

interface PostData {
  id: string;
  user_id: string | null;
  username: string | null;
  body: string;
  quoted_post_id: string | null;
  edited_at: string | null;
  created_at: string;
  reactions: Record<string, number>;
}

interface AuthorCache {
  [userId: string]: {
    avatar_url: string | null;
    username: string;
    tagline: string | null;
    hometown: string | null;
    created_at: string;
    total_points: number | null;
    hot_streak_active: boolean;
    current_streak_count: number;
    threads_created_count: number;
    threads_replied_count: number;
    total_posts: number;
    total_reactions: number;
    most_prestigious_badge: string | null;
    most_active_sport: string | null;
    is_premium: boolean;
    is_admin: boolean;
  };
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

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Author Sidebar ──────────────────────────────────────────────────────────────

function AuthorSidebar({ userId, username }: { userId: string; username: string }) {
  const [data, setData] = useState<AuthorCache[string] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.rpc('get_hover_card_data', { p_user_id: userId }).then(({ data }) => {
      if (cancelled) return;
      setData(data as AuthorCache[string]);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [userId]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-5 h-5 border-2 border-vgd-orange/30 border-t-vgd-orange rounded-full animate-spin" />
      </div>
    );
  }

  const initials = data.username.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col items-center text-center px-2 py-2">
      {data.avatar_url ? (
        <img src={data.avatar_url} alt={data.username} className="w-14 h-14 rounded-full object-cover ring-2 ring-vgd-orange/40 mb-2" />
      ) : (
        <div className="w-14 h-14 rounded-full bg-vgd-orange flex items-center justify-center text-white font-bold text-lg ring-2 ring-vgd-orange/40 mb-2">
          {initials}
        </div>
      )}

      <div className="flex items-center gap-1">
        <UsernameHoverCard userId={userId} username={data.username}>
          <span className="text-sm text-vgd-orange hover:text-orange-400 font-bold transition-colors cursor-pointer">
            {data.username}
          </span>
        </UsernameHoverCard>
        {data.hot_streak_active && <Flame className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />}
      </div>

      {data.tagline && <p className="text-[11px] text-vgd-muted mt-0.5 italic truncate w-full">"{data.tagline}"</p>}

      <div className="flex items-center gap-1 text-[10px] text-vgd-muted mt-1.5">
        <Calendar className="w-2.5 h-2.5" />
        {formatDate(data.created_at)}
      </div>

      {data.hometown && (
        <div className="flex items-center gap-1 text-[10px] text-vgd-muted mt-0.5">
          <MapPin className="w-2.5 h-2.5" />
          {data.hometown}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5 mt-2.5 w-full">
        <div className="bg-white/[0.04] rounded px-1.5 py-1">
          <div className="text-xs text-white font-bold">{data.total_posts}</div>
          <div className="text-[8px] text-vgd-muted uppercase">Posts</div>
        </div>
        <div className="bg-white/[0.04] rounded px-1.5 py-1">
          <div className="text-xs text-white font-bold">{data.total_reactions}</div>
          <div className="text-[8px] text-vgd-muted uppercase">Reactions</div>
        </div>
        <div className="bg-white/[0.04] rounded px-1.5 py-1">
          <div className="text-xs text-vgd-orange font-bold flex items-center justify-center gap-0.5">
            <Trophy className="w-2.5 h-2.5" />
            {data.total_points !== null ? data.total_points.toLocaleString() : '—'}
          </div>
          <div className="text-[8px] text-vgd-muted uppercase">Points</div>
        </div>
        <div className="bg-white/[0.04] rounded px-1.5 py-1">
          <div className="text-xs text-white font-bold">{data.threads_created_count}</div>
          <div className="text-[8px] text-vgd-muted uppercase">Threads</div>
        </div>
      </div>

      {data.most_prestigious_badge && (
        <div className="mt-2 text-[9px] font-bold uppercase tracking-wider bg-vgd-orange/15 text-vgd-orange px-2 py-1 rounded">
          {data.most_prestigious_badge.replace(/_/g, ' ')}
        </div>
      )}

      {data.most_active_sport && (
        <div className="mt-1.5 text-[10px] text-vgd-muted">
          Top sport: <span className="text-white/70">{data.most_active_sport}</span>
        </div>
      )}
    </div>
  );
}

// ─── Reaction Picker ──────────────────────────────────────────────────────────────

function ReactionPicker({
  postId,
  onReacted,
}: {
  postId: string;
  onReacted: () => void;
}) {
  const { session, openAuthModal } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleReact = async (reactionKey: string) => {
    if (!session) {
      openAuthModal('register');
      return;
    }
    setSubmitting(reactionKey);
    const { error } = await supabase.from('forum_reactions').insert({
      post_id: postId,
      user_id: session.user.id,
      reaction: reactionKey,
    });
    setSubmitting(null);
    if (!error) {
      onReacted();
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[11px] text-vgd-muted hover:text-vgd-orange transition-colors px-1.5 py-1 rounded hover:bg-white/[0.04]"
        title="Reactions"
      >
        <Smile className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">React</span>
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 left-0 z-30 bg-[#111827] border border-white/10 rounded-lg shadow-2xl p-1.5 flex gap-0.5 dropdown-enter">
          {REACTIONS.map((r) => (
            <button
              key={r.key}
              onClick={() => handleReact(r.key)}
              disabled={submitting === r.key}
              title={r.label}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/[0.08] transition-colors text-lg disabled:opacity-50"
            >
              {submitting === r.key ? <Loader2 className="w-3.5 h-3.5 animate-spin text-vgd-muted" /> : r.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Reaction Display ─────────────────────────────────────────────────────────────

function ReactionDisplay({ reactions }: { reactions: Record<string, number> }) {
  const entries = Object.entries(reactions).filter(([, count]) => count > 0);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([key, count]) => {
        const r = REACTIONS.find((x) => x.key === key);
        if (!r) return null;
        return (
          <span
            key={key}
            className="inline-flex items-center gap-1 text-[10px] bg-white/[0.06] text-white/70 px-1.5 py-0.5 rounded-full"
            title={r.label}
          >
            <span>{r.emoji}</span>
            <span className="font-medium">{count}</span>
          </span>
        );
      })}
    </div>
  );
}

// ─── Report Modal ────────────────────────────────────────────────────────────────

function ReportModal({
  post,
  onClose,
  onSubmitted,
}: {
  post: PostData;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { session, openAuthModal } = useAuth();
  const [reasonKey, setReasonKey] = useState('');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!session) {
      openAuthModal('register');
      return;
    }
    if (!reasonKey) {
      setError('Please select a reason for reporting.');
      return;
    }
    setSubmitting(true);
    setError('');
    const reasonLabel = REPORT_REASONS.find((r) => r.key === reasonKey)?.label || reasonKey;
    const fullReason = detail.trim() ? `${reasonLabel}: ${detail.trim()}` : reasonLabel;

    const { error: insertError } = await supabase.from('reports').insert({
      reporter_id: session.user.id,
      target_type: 'forum_post',
      target_id: post.id,
      reason: fullReason,
    });

    setSubmitting(false);

    if (insertError) {
      setError('Failed to submit report. Please try again.');
      return;
    }

    onSubmitted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md bg-vgd-card border border-white/10 rounded-xl shadow-2xl modal-enter max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07]">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Flag className="w-4 h-4 text-vgd-red" />
            Report Post
          </h2>
          <button onClick={onClose} className="p-1 text-vgd-muted hover:text-white transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-xs text-vgd-muted bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
            <span className="text-white/60 font-medium">{post.username || 'Anonymous'}</span> wrote:
            <p className="mt-1 line-clamp-3 text-white/50 italic">"{post.body}"</p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 bg-vgd-red/10 border border-vgd-red/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-vgd-red flex-shrink-0 mt-0.5" />
              <p className="text-sm text-vgd-red leading-snug">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wider">Reason</label>
            <div className="space-y-1.5">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setReasonKey(r.key)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors border ${
                    reasonKey === r.key
                      ? 'bg-vgd-orange/15 border-vgd-orange/40 text-vgd-orange'
                      : 'bg-white/[0.03] border-white/[0.06] text-white/70 hover:bg-white/[0.06]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {reasonKey === 'other' && (
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">Details</label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                disabled={submitting}
                placeholder="Please describe the issue…"
                rows={3}
                className="w-full bg-vgd-bg border border-white/10 text-white placeholder-vgd-muted rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-vgd-orange/60 focus:ring-1 focus:ring-vgd-orange/30 transition-all resize-none disabled:opacity-50"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-white/[0.07]">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm text-vgd-muted hover:text-white font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !reasonKey}
            className="px-5 py-2 rounded-lg bg-vgd-red hover:bg-red-600 text-white font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Post Action Bar ──────────────────────────────────────────────────────────────

function PostActions({
  post,
  isOwn,
  onQuote,
  onReply,
  onRefresh,
  onReport,
}: {
  post: PostData;
  isOwn: boolean;
  onQuote: () => void;
  onReply: () => void;
  onRefresh: () => void;
  onReport: () => void;
}) {
  const [shareCopied, setShareCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href + `#post-${post.id}`);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <ReactionPicker postId={post.id} onReacted={onRefresh} />
      <button
        onClick={onReply}
        className="flex items-center gap-1 text-[11px] text-vgd-muted hover:text-vgd-orange transition-colors px-1.5 py-1 rounded hover:bg-white/[0.04]"
      >
        <Reply className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Reply</span>
      </button>
      <button
        onClick={onQuote}
        className="flex items-center gap-1 text-[11px] text-vgd-muted hover:text-vgd-orange transition-colors px-1.5 py-1 rounded hover:bg-white/[0.04]"
      >
        <Quote className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Quote</span>
      </button>
      <button
        onClick={onReport}
        className="flex items-center gap-1 text-[11px] text-vgd-muted hover:text-vgd-red transition-colors px-1.5 py-1 rounded hover:bg-white/[0.04]"
      >
        <Flag className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Report</span>
      </button>
      <button
        onClick={handleShare}
        className="flex items-center gap-1 text-[11px] text-vgd-muted hover:text-vgd-orange transition-colors px-1.5 py-1 rounded hover:bg-white/[0.04]"
      >
        <Share2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{shareCopied ? 'Copied!' : 'Share'}</span>
      </button>
      {isOwn && (
        <button className="flex items-center gap-1 text-[11px] text-vgd-muted hover:text-vgd-orange transition-colors px-1.5 py-1 rounded hover:bg-white/[0.04]">
          <Pencil className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Edit</span>
        </button>
      )}
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────────

function PostCard({
  post,
  isOP,
  isOwn,
  onQuote,
  onReply,
  onRefresh,
  onReport,
}: {
  post: PostData;
  isOP: boolean;
  isOwn: boolean;
  onQuote: () => void;
  onReply: () => void;
  onRefresh: () => void;
  onReport: () => void;
}) {
  return (
    <div
      id={`post-${post.id}`}
      className={`flex gap-3 ${isOP ? 'border-vgd-orange/20' : 'border-white/[0.05]'} border-b last:border-b-0 py-3`}
    >
      {/* Left sidebar: author info */}
      <div className="flex-shrink-0 w-28 sm:w-32 hidden sm:block">
        {post.user_id && post.username && <AuthorSidebar userId={post.user_id} username={post.username} />}
      </div>

      {/* Mobile author row */}
      <div className="flex-1 min-w-0">
        <div className="sm:hidden flex items-center gap-2 mb-2">
          {post.user_id && post.username && (
            <UsernameHoverCard userId={post.user_id} username={post.username}>
              <span className="text-xs text-vgd-orange font-semibold cursor-pointer">{post.username}</span>
            </UsernameHoverCard>
          )}
          <span className="text-[10px] text-vgd-muted">{formatAge(post.created_at)}</span>
          {isOP && <span className="text-[9px] font-bold uppercase bg-vgd-orange/20 text-vgd-orange px-1.5 py-0.5 rounded">OP</span>}
        </div>

        {/* Body */}
        <div className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap break-words">
          {post.body}
          {post.edited_at && (
            <span className="text-[10px] text-vgd-muted italic ml-2">(edited)</span>
          )}
        </div>

        {/* Reactions */}
        {Object.keys(post.reactions).length > 0 && (
          <div className="mt-2">
            <ReactionDisplay reactions={post.reactions} />
          </div>
        )}

        {/* Actions */}
        <div className="mt-2">
          <PostActions
            post={post}
            isOwn={isOwn}
            onQuote={onQuote}
            onReply={onReply}
            onRefresh={onRefresh}
            onReport={onReport}
          />
        </div>
      </div>

      {/* Desktop timestamp */}
      <div className="hidden sm:block flex-shrink-0 w-16 text-right">
        <span className="text-[10px] text-vgd-muted">{formatAge(post.created_at)}</span>
      </div>
    </div>
  );
}

// ─── Auto-expanding Textarea ──────────────────────────────────────────────────────

function AutoTextarea({
  value,
  onChange,
  onKeyDown,
  disabled,
  placeholder,
  inputRef,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  disabled: boolean;
  placeholder: string;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}) {
  const innerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = inputRef.current ?? innerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 120) + 'px';
  }, [value, inputRef]);

  return (
    <textarea
      ref={(node) => {
        if (inputRef) (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
        (innerRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      }}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      disabled={disabled}
      placeholder={placeholder}
      className="flex-1 bg-vgd-bg border border-white/10 text-white placeholder-vgd-muted rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-vgd-orange/60 focus:ring-1 focus:ring-vgd-orange/30 transition-all resize-none disabled:opacity-50 overflow-hidden"
      style={{ minHeight: '120px' }}
    />
  );
}

// ─── Reply Input ───────────────────────────────────────────────────────────────────

function ReplyInput({
  threadId,
  quotedPost,
  onReplySubmitted,
  onCancelQuote,
  replyRef,
}: {
  threadId: string;
  quotedPost: PostData | null;
  onReplySubmitted: () => void;
  onCancelQuote: () => void;
  replyRef: React.RefObject<HTMLTextAreaElement>;
}) {
  const { session, profile, openAuthModal } = useAuth();
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (quotedPost) {
      const quotedText = quotedPost.body.split('\n').slice(0, 3).join('\n');
      setBody((prev) => prev || `> ${quotedText}\n\n`);
      replyRef.current?.focus();
    }
  }, [quotedPost, replyRef]);

  const handleSubmit = async () => {
    if (!session || !profile) {
      openAuthModal('register');
      return;
    }
    if (!body.trim()) {
      setError('Reply cannot be empty.');
      return;
    }

    setSubmitting(true);
    setError('');

    const { error: insertError } = await supabase.from('forum_posts').insert({
      thread_id: threadId,
      user_id: session.user.id,
      username: profile.username,
      body: body.trim(),
      quoted_post_id: quotedPost?.id || null,
    });

    setSubmitting(false);

    if (insertError) {
      const msg = insertError.message.toLowerCase();
      if (msg.includes('suspended') || msg.includes('banned')) {
        setError('Your posting privileges have been suspended.');
      } else if (msg.includes('code of conduct')) {
        setError('Your reply was rejected for violating the Code of Conduct.');
      } else {
        setError('Something went wrong. Please try again.');
      }
      return;
    }

    setBody('');
    onCancelQuote();
    onReplySubmitted();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!session) {
    return (
      <div className="border-t border-white/[0.07] bg-vgd-card px-4 py-3">
        <button
          onClick={() => openAuthModal('register')}
          className="w-full py-2.5 rounded-lg bg-vgd-orange/10 border border-vgd-orange/30 text-vgd-orange font-semibold text-sm hover:bg-vgd-orange/20 transition-colors"
        >
          Sign in to reply
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-white/[0.07] bg-vgd-card px-4 py-3 sticky bottom-0 z-20">
      {quotedPost && (
        <div className="flex items-center gap-2 mb-2 text-xs text-vgd-muted">
          <Quote className="w-3 h-3" />
          <span className="truncate flex-1">Quoting {quotedPost.username}</span>
          <button onClick={onCancelQuote} className="text-vgd-muted hover:text-white">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-vgd-red/10 border border-vgd-red/30 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 text-vgd-red flex-shrink-0" />
          <p className="text-xs text-vgd-red">{error}</p>
        </div>
      )}
      <div className="flex items-end gap-2">
        <AutoTextarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={submitting}
          placeholder="Write a reply…  (Cmd+Enter to send)"
          inputRef={replyRef}
        />
        <button
          onClick={handleSubmit}
          disabled={submitting || !body.trim()}
          className="flex-shrink-0 w-10 h-10 rounded-lg bg-vgd-orange hover:bg-orange-500 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Pagination ────────────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 py-3">
      {page > 1 && (
        <button onClick={() => onPageChange(page - 1)} className="px-3 py-1.5 text-xs text-vgd-muted hover:text-vgd-orange border border-white/10 rounded hover:border-vgd-orange/30 transition-colors">
          Prev
        </button>
      )}
      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
        const p = i + 1;
        return (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-8 h-8 text-xs rounded transition-colors ${
              p === page
                ? 'bg-vgd-orange text-white font-bold'
                : 'text-vgd-muted hover:text-vgd-orange hover:bg-white/[0.04]'
            }`}
          >
            {p}
          </button>
        );
      })}
      {page < totalPages && (
        <button onClick={() => onPageChange(page + 1)} className="px-3 py-1.5 text-xs text-vgd-muted hover:text-vgd-orange border border-white/10 rounded hover:border-vgd-orange/30 transition-colors">
          Next
        </button>
      )}
    </div>
  );
}

// ─── Main Thread Page ──────────────────────────────────────────────────────────────

export default function ThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [thread, setThread] = useState<ThreadData | null>(null);
  const [opPost, setOpPost] = useState<PostData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quotedPost, setQuotedPost] = useState<PostData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reportingPost, setReportingPost] = useState<PostData | null>(null);
  const [reportToast, setReportToast] = useState(false);
  const viewIncremented = useRef(false);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const fetchThread = useCallback(async () => {
    if (!threadId) return;
    setLoading(true);
    setError('');

    if (!viewIncremented.current) {
      viewIncremented.current = true;
      supabase.rpc('increment_thread_view', { p_thread_id: threadId });
    }

    const { data, error: rpcError } = await supabase.rpc('get_thread_page', {
      p_thread_id: threadId,
      p_page: page,
      p_per_page: POSTS_PER_PAGE,
    });

    if (rpcError || !data) {
      setError('Thread not found.');
      setLoading(false);
      return;
    }

    setThread(data.thread as ThreadData);
    setOpPost(data.op_post as PostData | null);
    setPosts(data.posts as PostData[]);
    setLoading(false);
  }, [threadId, page]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread, refreshKey]);

  const handleQuote = useCallback((post: PostData) => {
    setQuotedPost(post);
  }, []);

  const handleReply = useCallback(() => {
    setQuotedPost(null);
    replyRef.current?.focus();
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleReport = useCallback((post: PostData) => {
    setReportingPost(post);
  }, []);

  const handleReportSubmitted = useCallback(() => {
    setReportingPost(null);
    setReportToast(true);
    setTimeout(() => setReportToast(false), 3000);
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-vgd-orange animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <button onClick={() => navigate('/forums')} className="flex items-center gap-1.5 text-sm text-vgd-muted hover:text-vgd-orange transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Forums
        </button>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="w-10 h-10 text-vgd-muted mb-3" />
          <p className="text-vgd-muted">{error || 'Thread not found.'}</p>
        </div>
      </div>
    );
  }

  const categoryColor = CATEGORY_COLORS[thread.category] || '#58595B';
  const totalPages = Math.ceil(thread.reply_count / POSTS_PER_PAGE) || 1;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {/* Back link */}
      <button onClick={() => navigate('/forums')} className="flex items-center gap-1.5 text-sm text-vgd-muted hover:text-vgd-orange transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Forums
      </button>

      {/* Thread header */}
      <div className="bg-vgd-card border border-white/[0.07] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
            >
              {CATEGORIES[thread.category] || thread.category}
            </span>
            <span className="text-[10px] text-vgd-muted flex items-center gap-1">
              <Eye className="w-3 h-3" /> {thread.view_count} views
            </span>
            <span className="text-[10px] text-vgd-muted flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> {thread.reply_count} replies
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">{thread.title}</h1>
        </div>

        {/* Posts: OP first (real post from RPC), then all replies */}
        <div className="px-4 sm:px-5">
          {/* Original post — rendered through the same PostCard as replies */}
          {opPost && (
            <PostCard
              post={opPost}
              isOP={true}
              isOwn={opPost.user_id === session?.user?.id}
              onQuote={() => handleQuote(opPost)}
              onReply={handleReply}
              onRefresh={handleRefresh}
              onReport={() => handleReport(opPost)}
            />
          )}

          {/* Replies */}
          {posts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-vgd-muted">No replies yet. Be the first to respond!</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isOP={false}
                isOwn={post.user_id === session?.user?.id}
                onQuote={() => handleQuote(post)}
                onReply={handleReply}
                onRefresh={handleRefresh}
                onReport={() => handleReport(post)}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Reply input pinned to bottom */}
      <div className="sticky bottom-0">
        <ReplyInput
          threadId={thread.id}
          quotedPost={quotedPost}
          onReplySubmitted={handleRefresh}
          onCancelQuote={() => setQuotedPost(null)}
          replyRef={replyRef}
        />
      </div>

      {/* Report modal */}
      {reportingPost && (
        <ReportModal
          post={reportingPost}
          onClose={() => setReportingPost(null)}
          onSubmitted={handleReportSubmitted}
        />
      )}

      {/* Report submitted toast */}
      {reportToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[90] bg-vgd-card border border-vgd-orange/30 rounded-lg shadow-2xl px-4 py-3 flex items-center gap-2.5 dropdown-enter">
          <CheckCircle2 className="w-4 h-4 text-vgd-orange" />
          <span className="text-sm text-white font-medium">Report submitted. Thank you.</span>
        </div>
      )}
    </div>
  );
}
