import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Flame, MapPin, Calendar, UserPlus, UserCheck, Settings, MessageSquare,
  MessagesSquare, EyeOff, Eye as EyeIcon,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { DashboardCard } from '../components/ui/DashboardCard';
import { Avatar } from '../components/ui/Avatar';
import { TrophyRoom } from '../components/profile/TrophyRoom';
import { useBadgeCatalog, badgeLabel } from '../lib/badgeCatalog';
import { ComingSoon } from '../components/ui/ComingSoon';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProfilePageData {
  id: string;
  username: string;
  avatar_url: string | null;
  cover_photo_url: string | null;
  tagline: string | null;
  hometown: string | null;
  created_at: string;
  is_own_profile: boolean;
  is_following: boolean;
  follower_count: number | null;
  following_count: number | null;
  total_points: number | null;
  points_football: number | null;
  points_basketball: number | null;
  points_baseball: number | null;
  points_lady_vol: number | null;
  points_trivia: number | null;
  threads_created_count: number;
  threads_replied_count: number;
  total_posts: number;
  total_reactions: number;
  hot_streak_active: boolean;
  current_streak_count: number;
  most_prestigious_badge: string | null;
  is_premium: boolean;
  is_admin: boolean;
  show_predictions: boolean;
  show_activity: boolean;
  privacy_hide_hometown: boolean;
  privacy_hide_points: boolean;
  privacy_hide_predictions: boolean;
  privacy_hide_activity: boolean;
  privacy_hide_followers: boolean;
}

interface PredictionRow {
  id: string;
  predicted_winner: string;
  predicted_home_score: number;
  predicted_away_score: number;
  predicted_home_yards: number;
  predicted_away_yards: number;
  winner_correct: boolean | null;
  total_pregame_points: number | null;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  kickoff_time: string;
  status: string;
}

interface ActivityRow {
  id: string;
  kind: 'thread' | 'post';
  title: string;
  created_at: string;
  thread_id: string;
}

const POINT_LEDGER: { key: keyof ProfilePageData; label: string; color: string }[] = [
  { key: 'points_football', label: 'Football', color: '#FF8200' },
  { key: 'points_basketball', label: 'Basketball', color: '#60a5fa' },
  { key: 'points_baseball', label: 'Baseball', color: '#34d399' },
  { key: 'points_lady_vol', label: 'Lady Vols', color: '#f472b6' },
  { key: 'points_trivia', label: 'Trivia', color: '#a78bfa' },
];

// ─── Privacy toggle row ───────────────────────────────────────────────────────

function PrivacyToggle({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
    >
      <span className="flex items-center gap-2 text-xs text-white/80">
        {checked ? <EyeOff className="w-3.5 h-3.5 text-vgd-muted" /> : <EyeIcon className="w-3.5 h-3.5 text-vgd-orange" />}
        {label}
      </span>
      <span className={`text-[10px] font-bold uppercase tracking-wider ${checked ? 'text-vgd-muted' : 'text-vgd-orange'}`}>
        {checked ? 'Hidden' : 'Visible'}
      </span>
    </button>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { session, profile: myProfile } = useAuth();
  const { badges: badgeCatalog } = useBadgeCatalog();

  const [data, setData] = useState<ProfilePageData | null | undefined>(undefined); // undefined = loading
  const [predictions, setPredictions] = useState<PredictionRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [followBusy, setFollowBusy] = useState(false);

  const load = useCallback(async () => {
    if (!username) return;
    const { data: page } = await supabase.rpc('get_profile_page_data', { p_username: username });
    setData(page as ProfilePageData | null);

    if (page) {
      const p = page as ProfilePageData;
      if (p.show_predictions || p.is_own_profile) {
        const { data: hist } = await supabase.rpc('get_profile_prediction_history', { p_user_id: p.id });
        setPredictions((hist as PredictionRow[]) ?? []);
      }
      if (p.show_activity || p.is_own_profile) {
        const [threadsRes, postsRes] = await Promise.all([
          supabase.from('forum_threads').select('id, title, created_at').eq('user_id', p.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('forum_posts').select('id, body, created_at, thread_id, is_op').eq('user_id', p.id).eq('is_op', false).order('created_at', { ascending: false }).limit(5),
        ]);
        const rows: ActivityRow[] = [
          ...((threadsRes.data ?? []).map((t) => ({ id: t.id, kind: 'thread' as const, title: t.title, created_at: t.created_at, thread_id: t.id }))),
          ...((postsRes.data ?? []).map((post) => ({ id: post.id, kind: 'post' as const, title: post.body.slice(0, 80), created_at: post.created_at, thread_id: post.thread_id }))),
        ].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8);
        setActivity(rows);
      }
    }
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFollow = async () => {
    if (!session || !data) return;
    setFollowBusy(true);
    const { data: nowFollowing, error } = await supabase.rpc('toggle_follow', { p_target_user_id: data.id });
    if (!error) {
      setData((prev) => prev ? {
        ...prev,
        is_following: nowFollowing as boolean,
        follower_count: prev.follower_count === null ? null : prev.follower_count + (nowFollowing ? 1 : -1),
      } : prev);
    }
    setFollowBusy(false);
  };

  const handlePrivacyToggle = async (field: keyof ProfilePageData, value: boolean) => {
    if (!session || !data) return;
    setData((prev) => prev ? { ...prev, [field]: value } : prev);
    await supabase.from('profiles').update({ [field]: value }).eq('id', session.user.id);
    load();
  };

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-vgd-orange/30 border-t-vgd-orange rounded-full animate-spin" />
      </div>
    );
  }

  if (data === null) {
    return <ComingSoon title="Fan not found" description={`No profile exists for @${username}.`} />;
  }

  const isSelf = myProfile?.id === data.id;
  const ledgerMax = Math.max(1, ...POINT_LEDGER.map((l) => (data[l.key] as number | null) ?? 0));

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-4">
      {/* Header */}
      <div className="bg-vgd-card border border-white/[0.07] rounded-lg overflow-hidden">
        <div
          className="h-32 sm:h-40 bg-gradient-to-br from-vgd-orange/20 to-transparent"
          style={data.cover_photo_url ? { backgroundImage: `url(${data.cover_photo_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        />
        <div className="px-5 pb-5">
          <div className="flex items-end gap-4 -mt-12">
            <Avatar url={data.avatar_url} username={data.username} size="xl" className="border-4 border-vgd-card" />
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-white">{data.username}</h1>
                {data.hot_streak_active && <Flame className="w-5 h-5 text-orange-400 animate-pulse" />}
                {data.is_admin && <span className="text-[9px] font-bold uppercase bg-vgd-red/20 text-red-400 px-1.5 py-0.5 rounded">Admin</span>}
                {data.is_premium && <span className="text-[9px] font-bold uppercase bg-vgd-orange/20 text-vgd-orange px-1.5 py-0.5 rounded">Pro</span>}
              </div>
              {data.tagline && <p className="text-sm text-white/70 mt-0.5">{data.tagline}</p>}
            </div>
            <div className="pb-1 flex-shrink-0">
              {isSelf ? (
                <span className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/[0.06] text-white text-xs font-semibold">
                  <Settings className="w-3.5 h-3.5" />
                  This is you
                </span>
              ) : session ? (
                <button
                  onClick={handleFollow}
                  disabled={followBusy}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-60 ${
                    data.is_following ? 'bg-white/[0.08] text-white hover:bg-white/[0.12]' : 'bg-vgd-orange hover:bg-orange-500 text-white'
                  }`}
                >
                  {data.is_following ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                  {data.is_following ? 'Following' : 'Follow'}
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-vgd-muted">
            {data.hometown && (
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{data.hometown}</span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Member since {new Date(data.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
            {data.follower_count !== null && (
              <span>{data.follower_count} followers · {data.following_count} following</span>
            )}
            {data.most_prestigious_badge && (
              <span className="text-vgd-orange font-semibold">{badgeLabel(data.most_prestigious_badge, badgeCatalog)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-vgd-card border border-white/[0.07] rounded-lg px-4 py-3 text-center">
          <div className="text-lg font-black text-vgd-orange">{data.total_points !== null ? data.total_points.toLocaleString() : '—'}</div>
          <div className="text-[10px] text-vgd-muted uppercase tracking-wider mt-0.5">Total Points</div>
        </div>
        <div className="bg-vgd-card border border-white/[0.07] rounded-lg px-4 py-3 text-center">
          <div className="text-lg font-black text-white">{data.threads_created_count}</div>
          <div className="text-[10px] text-vgd-muted uppercase tracking-wider mt-0.5">Threads</div>
        </div>
        <div className="bg-vgd-card border border-white/[0.07] rounded-lg px-4 py-3 text-center">
          <div className="text-lg font-black text-white">{data.threads_replied_count}</div>
          <div className="text-[10px] text-vgd-muted uppercase tracking-wider mt-0.5">Replies</div>
        </div>
        <div className="bg-vgd-card border border-white/[0.07] rounded-lg px-4 py-3 text-center">
          <div className="text-lg font-black text-white">{data.total_reactions}</div>
          <div className="text-[10px] text-vgd-muted uppercase tracking-wider mt-0.5">Reactions</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Point ledger */}
        <DashboardCard title="POINT LEDGER" statusDotColor="#FF8200">
          <div className="p-4">
            {data.total_points === null ? (
              <p className="text-xs text-vgd-muted text-center py-4">This fan's point breakdown is private.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {POINT_LEDGER.map((l) => {
                  const val = (data[l.key] as number | null) ?? 0;
                  return (
                    <div key={l.key}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-white/70">{l.label}</span>
                        <span className="font-bold text-white">{val.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${(val / ledgerMax) * 100}%`, backgroundColor: l.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DashboardCard>

        {/* Prediction history */}
        <DashboardCard title="PREDICTION HISTORY" statusDotColor="#60a5fa">
          <div className="divide-y divide-white/[0.05] max-h-72 overflow-y-auto">
            {!data.show_predictions && !isSelf ? (
              <p className="text-xs text-vgd-muted text-center py-8">This fan's prediction history is private.</p>
            ) : predictions.length === 0 ? (
              <p className="text-xs text-vgd-muted text-center py-8">No finished-game predictions yet.</p>
            ) : (
              predictions.map((p) => (
                <div key={p.id} className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="text-white/85 truncate">{p.home_team} vs {p.away_team}</p>
                    <p className="text-vgd-muted text-[10px] mt-0.5">
                      {new Date(p.kickoff_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ·{' '}
                      Picked {p.predicted_winner === 'home' ? p.home_team : p.away_team}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={p.winner_correct ? 'text-green-400' : 'text-vgd-red'}>
                      {p.winner_correct ? '✓' : '✗'}
                    </span>
                    <span className="font-bold text-vgd-orange">{p.total_pregame_points ?? 0} pts</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DashboardCard>
      </div>

      {/* Trophy room */}
      <TrophyRoom userId={data.id} />

      {/* Recent activity */}
      <DashboardCard title="RECENT ACTIVITY" statusDotColor="#34d399">
        <div className="divide-y divide-white/[0.05]">
          {!data.show_activity && !isSelf ? (
            <p className="text-xs text-vgd-muted text-center py-8">This fan's activity feed is private.</p>
          ) : activity.length === 0 ? (
            <p className="text-xs text-vgd-muted text-center py-8">No recent forum activity.</p>
          ) : (
            activity.map((a) => (
              <a
                key={`${a.kind}-${a.id}`}
                href={`/forums/${a.thread_id}`}
                className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
              >
                {a.kind === 'thread' ? (
                  <MessageSquare className="w-3.5 h-3.5 text-vgd-orange flex-shrink-0" />
                ) : (
                  <MessagesSquare className="w-3.5 h-3.5 text-vgd-muted flex-shrink-0" />
                )}
                <span className="text-xs text-white/80 truncate flex-1">
                  {a.kind === 'thread' ? 'Started a thread: ' : 'Replied: '}{a.title}
                </span>
                <span className="text-[10px] text-vgd-muted flex-shrink-0">
                  {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </a>
            ))
          )}
        </div>
      </DashboardCard>

      {/* Privacy settings — own profile only */}
      {isSelf && (
        <DashboardCard title="PRIVACY SETTINGS" statusDotColor="#58595B">
          <div className="p-4 flex flex-col gap-2">
            <PrivacyToggle label="Hometown" checked={data.privacy_hide_hometown} onChange={(v) => handlePrivacyToggle('privacy_hide_hometown', v)} />
            <PrivacyToggle label="Point ledger" checked={data.privacy_hide_points} onChange={(v) => handlePrivacyToggle('privacy_hide_points', v)} />
            <PrivacyToggle label="Prediction history" checked={data.privacy_hide_predictions} onChange={(v) => handlePrivacyToggle('privacy_hide_predictions', v)} />
            <PrivacyToggle label="Recent activity" checked={data.privacy_hide_activity} onChange={(v) => handlePrivacyToggle('privacy_hide_activity', v)} />
            <PrivacyToggle label="Follower / following counts" checked={data.privacy_hide_followers} onChange={(v) => handlePrivacyToggle('privacy_hide_followers', v)} />
          </div>
        </DashboardCard>
      )}
    </div>
  );
}
