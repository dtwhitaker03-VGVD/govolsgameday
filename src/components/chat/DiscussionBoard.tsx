import { useState, useEffect, useRef, useCallback } from 'react';
import { Flag, Send, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { DashboardCard } from '../ui/DashboardCard';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  message_text: string;
  room_category: string;
  created_at: string;
}

interface QotD {
  id: string;
  question: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const USER_COLORS = [
  '#60a5fa', '#34d399', '#a78bfa', '#f472b6', '#fb923c',
  '#38bdf8', '#4ade80', '#c084fc', '#e879f9', '#22d3ee',
  '#86efac', '#93c5fd', '#fdba74', '#fca5a5', '#67e8f9',
];

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (Math.imul(31, hash) + userId.charCodeAt(i)) | 0;
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

function formatAge(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const MESSAGES_LIMIT = 100;
const SEND_DEBOUNCE_MS = 3_000;

// ─── Component ───────────────────────────────────────────────────────────────

interface DiscussionBoardProps {
  roomCategory: string;
  title: string;
  /** sport_category values to query for QotD, e.g. ['football'] */
  qotdSportCategories?: string[];
  /** Extra classes for the outer DashboardCard (e.g. a fixed height on standalone pages) */
  className?: string;
  /** Inline style for the outer DashboardCard (e.g. measured height from parent) */
  style?: React.CSSProperties;
}

export function DiscussionBoard({
  roomCategory,
  title,
  qotdSportCategories,
  className,
  style,
}: DiscussionBoardProps) {
  const { session, profile, openAuthModal } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [qotd, setQotd] = useState<QotD | null>(null);
  const [hotStreaks, setHotStreaks] = useState<Map<string, boolean>>(new Map());
  const [onlineCount, setOnlineCount] = useState(0);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [banned, setBanned] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<number>(0);

  // Report state: messageId being reported, or null
  const [reportedId, setReportedId] = useState<string | null>(null);

  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const atBottomRef = useRef(true);
  const prevSendingRef = useRef(false);

  // ── Auto-scroll logic ──────────────────────────────────────────────────────
  const scrollToBottom = useCallback((smooth = false) => {
    const el = feedRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const handleScroll = useCallback(() => {
    const el = feedRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('chat_messages')
      .select('id, user_id, username, message_text, room_category, created_at')
      .eq('room_category', roomCategory)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_LIMIT)
      .then(({ data }) => {
        if (data) {
          setMessages([...(data as ChatMessage[])].reverse());
          setTimeout(() => scrollToBottom(), 50);
        }
      });
  }, [roomCategory, scrollToBottom]);

  // ── Question of the Day ────────────────────────────────────────────────────
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    let query = supabase
      .from('questions_of_the_day')
      .select('id, question')
      .eq('active_date', today)
      .limit(1);

    if (qotdSportCategories && qotdSportCategories.length > 0) {
      query = query.in('sport_category', qotdSportCategories);
    }

    query.maybeSingle().then(({ data }) => {
      if (data) setQotd(data as QotD);
    });
  }, [qotdSportCategories]);

  // ── Realtime: new chat messages ────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${roomCategory}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_category=eq.${roomCategory}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => {
            // avoid duplicates (optimistic vs real)
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (atBottomRef.current) {
            setTimeout(() => scrollToBottom(true), 30);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomCategory, scrollToBottom]);

  // ── Realtime: hot streak profile updates ──────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('profiles:hot_streak')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          const updated = payload.new as { id: string; hot_streak_active: boolean };
          setHotStreaks((prev) =>
            new Map(prev).set(updated.id, updated.hot_streak_active)
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Supabase Presence for online count ────────────────────────────────────
  useEffect(() => {
    const presenceChannel = supabase.channel(`presence:${roomCategory}`, {
      config: { presence: { key: session?.user.id ?? `anon-${Math.random()}` } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        setOnlineCount(Object.keys(presenceChannel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ joined_at: Date.now() });
        }
      });

    return () => { supabase.removeChannel(presenceChannel); };
  }, [session?.user.id, roomCategory]);

  // ── Refocus input after send completes ──────────────────────────────────────
  // sending=true disables the textarea (stripping focus). When it flips back to
  // false, React re-enables the element in the DOM; this effect fires *after*
  // that commit, so focus() lands on a live, enabled node.
  useEffect(() => {
    if (prevSendingRef.current && !sending) {
      inputRef.current?.focus();
    }
    prevSendingRef.current = sending;
  }, [sending]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!session || !profile) return;
    const text = input.trim();
    if (!text) return;

    const now = Date.now();
    if (now - lastSentAt < SEND_DEBOUNCE_MS) return;

    setSending(true);
    setInput('');
    setLastSentAt(now);

    const { error } = await supabase.from('chat_messages').insert({
      user_id: session.user.id,
      username: profile.username,
      message_text: text,
      room_category: roomCategory,
    });

    setSending(false);

    if (error) {
      // Restore input so user doesn't lose their message (unless it was a ban)
      const isBanError =
        error.message?.toLowerCase().includes('suspended') ||
        error.message?.toLowerCase().includes('banned');
      if (isBanError) {
        setBanned(true);
      } else {
        setInput(text);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Report ────────────────────────────────────────────────────────────────
  const handleReport = async (messageId: string) => {
    if (!session) return;
    setReportedId(messageId);
    await supabase.from('reports').insert({
      reporter_id: session.user.id,
      target_type: 'chat_message',
      target_id: messageId,
    });
    setTimeout(() => setReportedId(null), 2000);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const canSend =
    !banned &&
    !sending &&
    input.trim().length > 0 &&
    Date.now() - lastSentAt >= SEND_DEBOUNCE_MS;

  const onlineLabel =
    onlineCount > 0 ? `${onlineCount.toLocaleString()} ONLINE` : 'LIVE';

  return (
    <DashboardCard title={title} metadataTag={onlineLabel} className={`flex flex-col ${className ?? ''}`} style={style}>
      <div className="flex flex-col flex-1 min-h-0">
        {/* Question of the Day */}
        {qotd && (
          <div className="px-3 py-2 bg-vgd-orange/10 border-b border-white/[0.06] flex items-start gap-2">
            <span className="text-vgd-orange font-bold text-[10px] uppercase tracking-wider mt-0.5 flex-shrink-0">
              QotD
            </span>
            <p className="text-white/80 text-xs leading-snug">{qotd.question}</p>
          </div>
        )}

        {/* Message feed — flex-grows to fill space, internal scroll only */}
        <div
          ref={feedRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-3 py-2 space-y-1 min-h-0"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-vgd-muted">
              <MessageSquare className="w-8 h-8 opacity-30" />
              <p className="text-xs">No messages yet. Be the first!</p>
            </div>
          )}

          {messages.map((msg) => {
            const isHot = hotStreaks.get(msg.user_id) ?? false;
            const color = getUserColor(msg.user_id);
            const isReported = reportedId === msg.id;

            return (
              <div
                key={msg.id}
                className="group flex items-start gap-2 rounded px-1 py-0.5 hover:bg-white/[0.03] transition-colors"
              >
                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <span
                    className="text-xs font-semibold mr-1.5"
                    style={{ color }}
                  >
                    {isHot && <span className="mr-0.5">🔥</span>}
                    {msg.username}
                  </span>
                  <span className="text-[10px] text-vgd-muted mr-1.5">
                    {formatAge(msg.created_at)}
                  </span>
                  <span className="text-sm text-white/90 break-words">
                    {msg.message_text}
                  </span>
                </div>

                {/* Report button (hover reveal, logged-in only) */}
                {session && (
                  <button
                    onClick={() => handleReport(msg.id)}
                    title="Report message"
                    className={`flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5
                      ${isReported ? 'text-vgd-orange opacity-100' : 'text-vgd-muted hover:text-vgd-red'}`}
                  >
                    <Flag className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

        </div>

        {/* Input area */}
        <div className="border-t border-white/[0.07] px-3 py-2">
          {banned ? (
            <div className="border border-vgd-red/60 rounded-lg px-3 py-2 bg-vgd-red/5">
              <p className="text-vgd-red text-xs leading-snug">
                Your chat privileges have been suspended for violating the Code of Conduct.
              </p>
            </div>
          ) : session ? (
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Say something…"
                maxLength={500}
                disabled={sending}
                className="flex-1 bg-vgd-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-vgd-muted focus:outline-none focus:border-vgd-orange/50 focus:ring-1 focus:ring-vgd-orange/20 resize-none transition-colors disabled:opacity-50"
                style={{ minHeight: '36px', maxHeight: '80px' }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = `${Math.min(el.scrollHeight, 80)}px`;
                }}
              />
              <button
                onClick={handleSend}
                disabled={!canSend}
                className="flex-shrink-0 w-9 h-9 rounded-lg bg-vgd-orange hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => openAuthModal('register')}
              className="w-full text-center text-xs text-vgd-muted hover:text-vgd-orange py-1.5 transition-colors"
            >
              Sign in to join the conversation
            </button>
          )}
        </div>
      </div>
    </DashboardCard>
  );
}
