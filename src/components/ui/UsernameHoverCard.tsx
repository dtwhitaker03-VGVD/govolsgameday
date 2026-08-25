import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Trophy, Flame, MapPin, Calendar, UserPlus, UserX, Pencil } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HoverCardData {
  id: string;
  username: string;
  avatar_url: string | null;
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
}

interface UsernameHoverCardProps {
  userId: string;
  username: string;
  className?: string;
  children?: React.ReactNode;
}

// ─── Badge display map ───────────────────────────────────────────────────────

const BADGE_LABELS: Record<string, string> = {
  first_post: 'First Post',
  streak_3: '3-Day Streak',
  streak_7: '7-Day Streak',
  streak_30: '30-Day Streak',
  trivia_master: 'Trivia Master',
  perfect_prediction: 'Perfect Prediction',
  community_pillar: 'Community Pillar',
  top_predictor: 'Top Predictor',
  forum_legend: 'Forum Legend',
};

function badgeLabel(key: string): string {
  return BADGE_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Avatar helper ────────────────────────────────────────────────────────────

function Avatar({ url, username, size = 'md' }: { url: string | null; username: string; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'lg' ? 'w-14 h-14 text-lg' : size === 'md' ? 'w-10 h-10 text-sm' : 'w-7 h-7 text-[11px]';
  const initials = username.slice(0, 2).toUpperCase();

  if (url) {
    return <img src={url} alt={username} className={`${dims} rounded-full object-cover ring-2 ring-vgd-orange/40`} />;
  }
  return (
    <div className={`${dims} rounded-full bg-vgd-orange flex items-center justify-center text-white font-bold flex-shrink-0 ring-2 ring-vgd-orange/40`}>
      {initials}
    </div>
  );
}

// ─── Stat pill ──────────────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center bg-white/[0.04] rounded-lg px-2 py-1.5 min-w-0">
      <span className="text-white font-bold text-xs leading-tight truncate w-full text-center">{value}</span>
      <span className="text-vgd-muted text-[9px] uppercase tracking-wider leading-tight mt-0.5">{label}</span>
    </div>
  );
}

// ─── Card content (rendered into the portal) ────────────────────────────────────

function HoverCardContent({
  cardData,
  loading,
  isSelf,
  username,
  coords,
  position,
  onMouseEnter,
  onMouseLeave,
}: {
  cardData: HoverCardData | null;
  loading: boolean;
  isSelf: boolean;
  username: string;
  coords: { x: number; y: number; width: number };
  position: 'top' | 'bottom';
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const CARD_WIDTH = 288; // w-72 = 18rem = 288px
  const cardLeft = Math.min(coords.x, window.innerWidth - CARD_WIDTH - 16);
  const cardTop = position === 'top' ? coords.y - 8 : coords.y + 8;
  const transform = position === 'top' ? 'translateY(-100%)' : 'none';

  return (
    <div
      style={{
        position: 'fixed',
        left: `${cardLeft}px`,
        top: `${cardTop}px`,
        width: `${CARD_WIDTH}px`,
        transform,
        zIndex: 9999,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="bg-[#111827] border border-white/10 rounded-xl shadow-2xl overflow-hidden dropdown-enter">
        {loading ? (
          <div className="p-4 flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-vgd-orange/30 border-t-vgd-orange rounded-full animate-spin" />
          </div>
        ) : cardData ? (
          <>
            {/* Header: avatar + username + tagline */}
            <div className="p-3.5 border-b border-white/[0.07]">
              <div className="flex items-start gap-3">
                <Avatar url={cardData.avatar_url} username={cardData.username} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/profile/${cardData.username}`}
                      className="text-white font-bold text-sm truncate hover:text-vgd-orange transition-colors"
                    >
                      {cardData.username}
                    </Link>
                    {cardData.is_admin && (
                      <span className="text-[9px] font-bold uppercase bg-vgd-red/20 text-red-400 px-1.5 py-0.5 rounded">Admin</span>
                    )}
                    {cardData.is_premium && (
                      <span className="text-[9px] font-bold uppercase bg-vgd-orange/20 text-vgd-orange px-1.5 py-0.5 rounded">Pro</span>
                    )}
                  </div>
                  {cardData.tagline && (
                    <p className="text-vgd-muted text-xs mt-0.5 truncate">{cardData.tagline}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Info rows */}
            <div className="px-3.5 py-2.5 space-y-1.5 border-b border-white/[0.07]">
              {cardData.hometown && (
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <MapPin className="w-3 h-3 text-vgd-muted flex-shrink-0" />
                  <span className="truncate">{cardData.hometown}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-white/70">
                <Calendar className="w-3 h-3 text-vgd-muted flex-shrink-0" />
                <span>Member since {new Date(cardData.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              </div>
              {cardData.hot_streak_active && (
                <div className="flex items-center gap-2 text-xs text-orange-400">
                  <Flame className="w-3 h-3 flex-shrink-0" />
                  <span className="font-semibold">Hot Streak — {cardData.current_streak_count} in a row</span>
                </div>
              )}
              {cardData.most_active_sport && (
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <Trophy className="w-3 h-3 text-vgd-muted flex-shrink-0" />
                  <span>Top sport: {cardData.most_active_sport}</span>
                </div>
              )}
              {cardData.most_prestigious_badge && (
                <div className="flex items-center gap-2 text-xs text-vgd-orange">
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-vgd-orange/15 px-1.5 py-0.5 rounded">
                    {badgeLabel(cardData.most_prestigious_badge)}
                  </span>
                </div>
              )}
            </div>

            {/* Stats grid */}
            <div className="px-3.5 py-2.5 border-b border-white/[0.07]">
              <div className="grid grid-cols-3 gap-1.5">
                <StatPill label="Posts" value={cardData.total_posts} />
                <StatPill label="Reactions" value={cardData.total_reactions} />
                <StatPill
                  label="Points"
                  value={cardData.total_points !== null ? cardData.total_points.toLocaleString() : '—'}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="p-2.5 flex items-center gap-2">
              {isSelf ? (
                <Link
                  to={`/profile/${username}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Edit Profile
                </Link>
              ) : (
                <>
                  <button
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-vgd-orange hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    <UserPlus className="w-3 h-3" />
                    Follow
                  </button>
                  <button
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white/[0.06] hover:bg-white/[0.1] text-white/70 text-xs font-semibold rounded-lg transition-colors"
                  >
                    <UserX className="w-3 h-3" />
                    Ignore
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="p-4 text-center text-vgd-muted text-xs">Profile not found</div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

export function UsernameHoverCard({ userId, username, className = '', children }: UsernameHoverCardProps) {
  const { profile, openAuthModal } = useAuth();
  const [cardData, setCardData] = useState<HoverCardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const [coords, setCoords] = useState<{ x: number; y: number; width: number }>({ x: 0, y: 0, width: 0 });

  const containerRef = useRef<HTMLSpanElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fetchedRef = useRef<string | null>(null);

  const isSelf = profile?.id === userId;

  const fetchCardData = useCallback(async () => {
    if (fetchedRef.current === userId) return;
    fetchedRef.current = userId;
    setLoading(true);
    const { data } = await supabase.rpc('get_hover_card_data', { p_user_id: userId });
    setCardData(data as HoverCardData | null);
    setLoading(false);
  }, [userId]);

  const updateCoords = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPosition(rect.top > window.innerHeight / 2 ? 'bottom' : 'top');
    setCoords({ x: rect.left, y: rect.bottom, width: rect.width });
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearTimeout(closeTimer.current);
    hoverTimer.current = setTimeout(() => {
      updateCoords();
      setShowCard(true);
      fetchCardData();
    }, 300);
  }, [fetchCardData, updateCoords]);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(hoverTimer.current);
    closeTimer.current = setTimeout(() => setShowCard(false), 200);
  }, []);

  const handleCardMouseEnter = useCallback(() => {
    clearTimeout(closeTimer.current);
  }, []);

  const handleCardMouseLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => setShowCard(false), 200);
  }, []);

  // Mobile: tap-and-hold
  const touchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleTouchStart = useCallback(() => {
    touchTimer.current = setTimeout(() => {
      updateCoords();
      setShowCard(true);
      fetchCardData();
    }, 500);
  }, [fetchCardData, updateCoords]);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(touchTimer.current);
  }, []);

  // Close on scroll/resize
  useEffect(() => {
    if (!showCard) return;
    const close = () => setShowCard(false);
    window.addEventListener('scroll', close, { passive: true, capture: true });
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', close);
    };
  }, [showCard]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(hoverTimer.current);
      clearTimeout(closeTimer.current);
      clearTimeout(touchTimer.current);
    };
  }, []);

  return (
    <>
      <span
        ref={containerRef}
        className={`relative inline-block ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {children || (
          <Link
            to={`/profile/${username}`}
            className="text-vgd-orange hover:text-orange-400 font-semibold transition-colors duration-150"
          >
            {username}
          </Link>
        )}
      </span>

      {showCard && createPortal(
        <HoverCardContent
          cardData={cardData}
          loading={loading}
          isSelf={isSelf}
          username={username}
          coords={coords}
          position={position}
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
        />,
        document.body
      )}
    </>
  );
}
