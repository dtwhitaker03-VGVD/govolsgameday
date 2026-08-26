import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { DashboardCard } from '../components/ui/DashboardCard';
import { CheckCircle, AlertCircle, Loader, EyeOff, Trash2, RefreshCw, Pin, Plus, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveGame {
  id: string;
  cfbd_game_id: number;
  home_team: string;
  away_team: string;
  kickoff_time: string;
  status: string;
  home_score: number;
  away_score: number;
}

interface DriveWindow {
  id: string;
  game_id: string;
  drive_number: number;
  status: string;
  actual_outcome: string | null;
}

type OpStatus = 'idle' | 'loading' | 'ok' | 'error';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function OpResult({ status, message }: { status: OpStatus; message: string }) {
  if (status === 'idle') return null;
  if (status === 'loading') return (
    <div className="flex items-center gap-1.5 text-xs text-white/50 mt-1.5">
      <Loader className="w-3 h-3 animate-spin" /> Running…
    </div>
  );
  if (status === 'ok') return (
    <div className="flex items-center gap-1.5 text-xs text-green-400 mt-1.5">
      <CheckCircle className="w-3 h-3" /> {message}
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 text-xs text-vgd-red mt-1.5">
      <AlertCircle className="w-3 h-3" /> {message}
    </div>
  );
}

function LabelInput({
  label, value, onChange, type = 'text', placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-0.5">
        {label}
      </label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-vgd-bg border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-vgd-orange/50"
      />
    </div>
  );
}

function SelectInput({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-0.5">
        {label}
      </label>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-vgd-bg border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-vgd-orange/50"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function ActionButton({
  onClick, disabled, children,
}: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-1.5 rounded bg-vgd-orange hover:bg-orange-500 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

// ─── Panel: Create Test Game ──────────────────────────────────────────────────

function CreateGamePanel({ onCreated }: { onCreated: () => void }) {
  const [homeTeam, setHomeTeam] = useState('Tennessee');
  const [awayTeam, setAwayTeam] = useState('Alabama');
  const [kickoff, setKickoff] = useState(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() + 30);
    // Use local getters so the datetime-local input shows the user's actual clock time
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [status, setStatus] = useState<OpStatus>('idle');
  const [msg, setMsg] = useState('');

  async function create() {
    setStatus('loading');
    const { error } = await supabase.rpc('admin_create_test_game', {
      p_home_team: homeTeam,
      p_away_team: awayTeam,
      p_kickoff_time: new Date(kickoff).toISOString(),
    });
    if (error) {
      setStatus('error'); setMsg(error.message);
    } else {
      setStatus('ok'); setMsg(`Game created: ${homeTeam} vs ${awayTeam}`);
      onCreated();
    }
  }

  return (
    <DashboardCard title="Create Test Game">
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <LabelInput label="Home Team" value={homeTeam} onChange={setHomeTeam} />
          <LabelInput label="Away Team" value={awayTeam} onChange={setAwayTeam} />
        </div>
        <LabelInput label="Kickoff (local)" value={kickoff} onChange={setKickoff} type="datetime-local" />
        <ActionButton onClick={create} disabled={status === 'loading'}>Create Game</ActionButton>
        <OpResult status={status} message={msg} />
      </div>
    </DashboardCard>
  );
}

// ─── Panel: Game Status ───────────────────────────────────────────────────────

function GameStatusPanel({ games, onRefresh }: { games: LiveGame[]; onRefresh: () => void }) {
  const [gameId, setGameId] = useState('');
  const [newStatus, setNewStatus] = useState('pregame');
  const [homeScore, setHomeScore] = useState('0');
  const [awayScore, setAwayScore] = useState('0');
  const [status, setStatus] = useState<OpStatus>('idle');
  const [msg, setMsg] = useState('');

  const gameOptions = [{ value: '', label: 'Select game…' }, ...games.map(g => ({
    value: g.id,
    label: `${g.away_team} @ ${g.home_team} [${g.status}]`,
  }))];

  useEffect(() => {
    if (gameId) {
      const g = games.find(x => x.id === gameId);
      if (g) { setHomeScore(String(g.home_score)); setAwayScore(String(g.away_score)); setNewStatus(g.status); }
    }
  }, [gameId, games]);

  async function update() {
    if (!gameId) return;
    setStatus('loading');
    const { error } = await supabase.rpc('admin_update_game', {
      p_game_id: gameId,
      p_status: newStatus,
      p_home_score: parseInt(homeScore) || 0,
      p_away_score: parseInt(awayScore) || 0,
    });
    if (error) { setStatus('error'); setMsg(error.message); }
    else { setStatus('ok'); setMsg('Game updated.'); onRefresh(); }
  }

  async function finalize() {
    if (!gameId) return;
    setStatus('loading');
    const { error } = await supabase.rpc('finalize_game', { p_game_id: gameId });
    if (error) { setStatus('error'); setMsg(error.message); }
    else { setStatus('ok'); setMsg('Game finalized — pregame points calculated.'); onRefresh(); }
  }

  return (
    <DashboardCard title="Update Game Status">
      <div className="p-4 space-y-3">
        <SelectInput label="Game" value={gameId} onChange={setGameId} options={gameOptions} />
        <SelectInput label="Status" value={newStatus} onChange={setNewStatus} options={[
          { value: 'scheduled', label: 'scheduled' },
          { value: 'pregame', label: 'pregame' },
          { value: 'live', label: 'live' },
          { value: 'final', label: 'final' },
          { value: 'calculated', label: 'calculated' },
        ]} />
        <div className="grid grid-cols-2 gap-2">
          <LabelInput label="Home Score" value={homeScore} onChange={setHomeScore} type="number" />
          <LabelInput label="Away Score" value={awayScore} onChange={setAwayScore} type="number" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <ActionButton onClick={update} disabled={!gameId || status === 'loading'}>Update</ActionButton>
          <ActionButton onClick={finalize} disabled={!gameId || status === 'loading'}>Finalize Game</ActionButton>
        </div>
        <OpResult status={status} message={msg} />
      </div>
    </DashboardCard>
  );
}

// ─── Panel: Drive Window ──────────────────────────────────────────────────────

function DriveWindowPanel({ games }: { games: LiveGame[] }) {
  const [gameId, setGameId] = useState('');
  const [driveNum, setDriveNum] = useState('1');
  const [yardline, setYardline] = useState('25');
  const [quarter, setQuarter] = useState('1');
  const [clock, setClock] = useState('15:00');
  const [scoreDiff, setScoreDiff] = useState('0');
  const [down, setDown] = useState('1');
  const [distance, setDistance] = useState('10');
  const [status, setStatus] = useState<OpStatus>('idle');
  const [msg, setMsg] = useState('');

  const gameOptions = [{ value: '', label: 'Select game…' }, ...games.map(g => ({
    value: g.id,
    label: `${g.away_team} @ ${g.home_team} [${g.status}]`,
  }))];

  async function open() {
    if (!gameId) return;
    setStatus('loading');
    const { error } = await supabase.rpc('open_drive_window', {
      p_game_id: gameId,
      p_drive_number: parseInt(driveNum) || 1,
      p_yardline: parseInt(yardline) || 25,
      p_quarter: parseInt(quarter) || 1,
      p_game_clock: clock,
      p_score_diff: parseInt(scoreDiff) || 0,
      p_down: parseInt(down) || 1,
      p_distance: parseInt(distance) || 10,
      p_cfbd_drive_id: null,
    });
    if (error) { setStatus('error'); setMsg(error.message); }
    else { setStatus('ok'); setMsg(`Drive ${driveNum} window opened (60s).`); setDriveNum(String((parseInt(driveNum) || 1) + 1)); }
  }

  return (
    <DashboardCard title="Open Drive Window">
      <div className="p-4 space-y-3">
        <SelectInput label="Game" value={gameId} onChange={setGameId} options={gameOptions} />
        <div className="grid grid-cols-3 gap-2">
          <LabelInput label="Drive #" value={driveNum} onChange={setDriveNum} type="number" />
          <LabelInput label="Quarter" value={quarter} onChange={setQuarter} type="number" />
          <LabelInput label="Clock" value={clock} onChange={setClock} placeholder="15:00" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <LabelInput label="Yardline" value={yardline} onChange={setYardline} type="number" placeholder="25" />
          <LabelInput label="Down" value={down} onChange={setDown} type="number" />
          <LabelInput label="Distance" value={distance} onChange={setDistance} type="number" />
        </div>
        <LabelInput label="Score Diff (TN − Opp)" value={scoreDiff} onChange={setScoreDiff} type="number" placeholder="0" />
        <ActionButton onClick={open} disabled={!gameId || status === 'loading'}>Open Window</ActionButton>
        <OpResult status={status} message={msg} />
      </div>
    </DashboardCard>
  );
}

// ─── Panel: Settle Drive ─────────────────────────────────────────────────────

function SettleDrivePanel({ games }: { games: LiveGame[] }) {
  const [gameId, setGameId] = useState('');
  const [windows, setWindows] = useState<DriveWindow[]>([]);
  const [windowId, setWindowId] = useState('');
  const [outcome, setOutcome] = useState('touchdown');
  const [status, setStatus] = useState<OpStatus>('idle');
  const [msg, setMsg] = useState('');

  const gameOptions = [{ value: '', label: 'Select game…' }, ...games.map(g => ({
    value: g.id,
    label: `${g.away_team} @ ${g.home_team} [${g.status}]`,
  }))];

  function fetchWindows(id: string) {
    supabase
      .from('drive_windows')
      .select('id, game_id, drive_number, status, actual_outcome')
      .eq('game_id', id)
      .in('status', ['open', 'locked'])
      .order('drive_number', { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []) as DriveWindow[];
        setWindows(rows);
        if (rows.length > 0) setWindowId(rows[0].id);
        else setWindowId('');
      });
  }

  // Fetch open windows on game select, then subscribe to Realtime so the list
  // refreshes automatically when DriveWindowPanel opens a new window.
  useEffect(() => {
    if (!gameId) { setWindows([]); setWindowId(''); return; }
    fetchWindows(gameId);

    const channel = supabase
      .channel(`admin:drive_windows:${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drive_windows', filter: `game_id=eq.${gameId}` },
        () => fetchWindows(gameId)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [gameId]);

  async function settle() {
    if (!windowId) return;
    const win = windows.find(w => w.id === windowId);
    if (!win) return;
    setStatus('loading');
    const { error } = await supabase.rpc('settle_drive_outcome', {
      p_game_id: gameId,
      p_drive_number: win.drive_number,
      p_actual_outcome: outcome,
    });
    if (error) { setStatus('error'); setMsg(error.message); }
    else { setStatus('ok'); setMsg(`Drive ${win.drive_number} settled as ${outcome}.`); setWindows([]); setWindowId(''); }
  }

  const windowOptions = [
    { value: '', label: windows.length === 0 ? 'No open windows' : 'Select window…' },
    ...windows.map(w => ({ value: w.id, label: `Drive ${w.drive_number} [${w.status}]` })),
  ];

  return (
    <DashboardCard title="Settle Drive Outcome">
      <div className="p-4 space-y-3">
        <SelectInput label="Game" value={gameId} onChange={setGameId} options={gameOptions} />
        <SelectInput label="Drive Window" value={windowId} onChange={setWindowId} options={windowOptions} />
        <SelectInput label="Actual Outcome" value={outcome} onChange={setOutcome} options={[
          { value: 'touchdown', label: 'Touchdown' },
          { value: 'field_goal', label: 'Field Goal' },
          { value: 'punt', label: 'Punt' },
          { value: 'turnover', label: 'Turnover' },
          { value: 'safety', label: 'Safety' },
          { value: 'turnover_on_downs', label: 'Turnover on Downs' },
          { value: 'end_of_quarter', label: 'End of Quarter' },
        ]} />
        <ActionButton onClick={settle} disabled={!windowId || status === 'loading'}>Settle Drive</ActionButton>
        <OpResult status={status} message={msg} />
      </div>
    </DashboardCard>
  );
}

// ─── Panel: Scraped Content Review ───────────────────────────────────────────

interface ScrapedVideo {
  id: string;
  title: string;
  source_url?: string;
  youtube_video_id?: string;
  sport_category: string;
  channel_name?: string | null;
  ingested_at: string;
  is_hidden: boolean;
  is_pinned: boolean;
}

interface ScrapedArticle {
  id: string;
  title: string;
  source_url: string;
  source_name: string | null;
  sport_category: string;
  ingested_at: string;
  is_hidden: boolean;
  is_pinned: boolean;
}

type ContentTab = 'videos' | 'articles';

const SPORT_CATEGORIES = [
  { value: 'main', label: 'Main' },
  { value: 'football', label: 'Football' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'baseball', label: 'Baseball' },
  { value: 'lv-basketball', label: 'Lady Vols Basketball' },
  { value: 'lv-softball', label: 'Lady Vols Softball' },
  { value: 'football-recruiting', label: 'Football Recruiting' },
  { value: 'other-recruiting', label: 'Other Recruiting' },
  { value: 'other', label: 'Other' },
];

function stripQueryParams(url: string): string {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch {
    return url.split('?')[0];
  }
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([\w-]{11})/,
    /[?&]v=([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ScrapedContentReview() {
  const [tab, setTab] = useState<ContentTab>('videos');
  const [videos, setVideos] = useState<ScrapedVideo[]>([]);
  const [articles, setArticles] = useState<ScrapedArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addUrl, setAddUrl] = useState('');
  const [addCategory, setAddCategory] = useState('main');
  const [addStatus, setAddStatus] = useState<OpStatus>('idle');
  const [addMsg, setAddMsg] = useState('');

  async function loadVideos() {
    setLoading(true);
    const { data } = await supabase
      .from('scraped_videos')
      .select('id, title, source_url:video_url, youtube_video_id, sport_category, channel_name, ingested_at, is_hidden, is_pinned')
      .order('ingested_at', { ascending: false })
      .limit(100);
    setVideos((data ?? []) as ScrapedVideo[]);
    setLoading(false);
  }

  async function loadArticles() {
    setLoading(true);
    const { data } = await supabase
      .from('scraped_articles')
      .select('id, title, source_url, source_name, sport_category, ingested_at, is_hidden, is_pinned')
      .order('ingested_at', { ascending: false })
      .limit(100);
    setArticles((data ?? []) as ScrapedArticle[]);
    setLoading(false);
  }

  useEffect(() => {
    if (tab === 'videos') loadVideos();
    else loadArticles();
  }, [tab]);

  async function hideVideo(id: string) {
    const { error } = await supabase
      .from('scraped_videos')
      .update({ is_hidden: true })
      .eq('id', id);
    if (error) { setActionMsg(`Error: ${error.message}`); return; }
    setVideos((prev) => prev.map((v) => v.id === id ? { ...v, is_hidden: true } : v));
    setActionMsg('Video hidden from public view.');
  }

  async function deleteVideo(id: string) {
    const video = videos.find((v) => v.id === id);
    if (video?.youtube_video_id) {
      await supabase.from('content_blocklist').upsert({
        content_type: 'video',
        external_id: video.youtube_video_id,
      }, { onConflict: 'content_type,external_id' });
    }
    const { error } = await supabase.from('scraped_videos').delete().eq('id', id);
    if (error) { setActionMsg(`Error: ${error.message}`); return; }
    setVideos((prev) => prev.filter((v) => v.id !== id));
    setActionMsg('Video deleted and blocklisted.');
  }

  async function pinVideo(id: string, pinned: boolean) {
    const { error } = await supabase
      .from('scraped_videos')
      .update({ is_pinned: pinned })
      .eq('id', id);
    if (error) { setActionMsg(`Error: ${error.message}`); return; }
    setVideos((prev) => prev.map((v) => v.id === id ? { ...v, is_pinned: pinned } : v));
    setActionMsg(pinned ? 'Video pinned.' : 'Video unpinned.');
  }

  async function hideArticle(id: string) {
    const { error } = await supabase
      .from('scraped_articles')
      .update({ is_hidden: true })
      .eq('id', id);
    if (error) { setActionMsg(`Error: ${error.message}`); return; }
    setArticles((prev) => prev.map((a) => a.id === id ? { ...a, is_hidden: true } : a));
    setActionMsg('Article hidden from public view.');
  }

  async function deleteArticle(id: string) {
    const article = articles.find((a) => a.id === id);
    if (article?.source_url) {
      await supabase.from('content_blocklist').upsert({
        content_type: 'article',
        external_id: stripQueryParams(article.source_url),
      }, { onConflict: 'content_type,external_id' });
    }
    const { error } = await supabase.from('scraped_articles').delete().eq('id', id);
    if (error) { setActionMsg(`Error: ${error.message}`); return; }
    setArticles((prev) => prev.filter((a) => a.id !== id));
    setActionMsg('Article deleted and blocklisted.');
  }

  async function pinArticle(id: string, pinned: boolean) {
    const updates: Record<string, unknown> = { is_pinned: pinned };
    if (pinned) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 14);
      updates.pin_expires_at = expiry.toISOString();
    } else {
      updates.pin_expires_at = null;
    }
    const { error } = await supabase
      .from('scraped_articles')
      .update(updates)
      .eq('id', id);
    if (error) { setActionMsg(`Error: ${error.message}`); return; }
    setArticles((prev) => prev.map((a) => a.id === id ? { ...a, is_pinned: pinned } : a));
    setActionMsg(pinned ? 'Article pinned for 14 days.' : 'Article unpinned.');
  }

  async function handleAdd() {
    if (!addUrl.trim()) return;
    setAddStatus('loading');
    setAddMsg('');

    try {
      if (tab === 'videos') {
        const videoId = extractYouTubeId(addUrl.trim());
        if (!videoId) {
          setAddStatus('error');
          setAddMsg('Could not extract YouTube video ID from URL.');
          return;
        }

        const { data, error } = await supabase.functions.invoke('cfbd-proxy', {
          body: { type: 'youtube_lookup', videoId },
        });

        if (error || data?.error) {
          setAddStatus('error');
          setAddMsg(data?.message ?? error?.message ?? 'YouTube lookup failed.');
          return;
        }

        const v = data.video;
        const { error: insertError } = await supabase.from('scraped_videos').insert({
          youtube_video_id: videoId,
          title: v.title,
          thumbnail_url: v.thumbnail_url,
          video_url: `https://www.youtube.com/watch?v=${videoId}`,
          duration: v.duration,
          view_count: v.view_count ?? 0,
          sport_category: addCategory,
          published_at: v.published_at,
          ingested_at: new Date().toISOString(),
          is_pinned: true,
        });

        if (insertError) {
          setAddStatus('error');
          setAddMsg(insertError.message);
          return;
        }

        setAddStatus('ok');
        setAddMsg(`Added: ${v.title}`);
        setAddUrl('');
        loadVideos();
      } else {
        const { data, error } = await supabase.functions.invoke('cfbd-proxy', {
          body: { type: 'article_scrape', url: addUrl.trim(), sport_category: addCategory },
        });

        if (error || data?.error) {
          setAddStatus('error');
          setAddMsg(data?.message ?? error?.message ?? 'Article scrape failed.');
          return;
        }

        setAddStatus('ok');
        setAddMsg(`Added: ${data.article.title}`);
        setAddUrl('');
        loadArticles();
      }
    } catch (err) {
      setAddStatus('error');
      setAddMsg(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  const rows = tab === 'videos' ? videos : articles;

  return (
    <DashboardCard
      title="Scraped Content Review"
      metadataTag={
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTab('videos')}
            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
              tab === 'videos'
                ? 'bg-vgd-orange/20 border-vgd-orange/50 text-vgd-orange'
                : 'border-white/[0.08] text-white/40 hover:text-white/70'
            }`}
          >
            Videos
          </button>
          <button
            onClick={() => setTab('articles')}
            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
              tab === 'articles'
                ? 'bg-vgd-orange/20 border-vgd-orange/50 text-vgd-orange'
                : 'border-white/[0.08] text-white/40 hover:text-white/70'
            }`}
          >
            Articles
          </button>
          <button
            onClick={() => { setShowAdd((s) => !s); setAddStatus('idle'); setAddMsg(''); }}
            className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
              showAdd
                ? 'bg-vgd-orange/20 text-vgd-orange'
                : 'text-white/30 hover:text-white/70 hover:bg-white/[0.06]'
            }`}
            title={`Add ${tab === 'videos' ? 'Video' : 'Article'}`}
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={() => tab === 'videos' ? loadVideos() : loadArticles()}
            className="w-5 h-5 flex items-center justify-center rounded text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      }
    >
      {actionMsg && (
        <div className="mx-4 mt-3 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400 flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg('')} className="text-white/30 hover:text-white/60 ml-2 text-sm leading-none">&times;</button>
        </div>
      )}

      {showAdd && (
        <div className="mx-4 mt-3 p-3 bg-white/[0.03] border border-white/[0.08] rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-vgd-orange">
              Add {tab === 'videos' ? 'Video' : 'Article'}
            </span>
            <button
              onClick={() => { setShowAdd(false); setAddStatus('idle'); setAddMsg(''); }}
              className="w-4 h-4 flex items-center justify-center text-white/30 hover:text-white/60"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <input
            type="text"
            value={addUrl}
            onChange={(e) => setAddUrl(e.target.value)}
            placeholder={tab === 'videos' ? 'Paste YouTube URL…' : 'Paste article URL…'}
            className="w-full bg-vgd-bg border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-vgd-orange/50"
          />
          <SelectInput label="Sport Category" value={addCategory} onChange={setAddCategory} options={SPORT_CATEGORIES} />
          <ActionButton onClick={handleAdd} disabled={addStatus === 'loading' || !addUrl.trim()}>
            Add {tab === 'videos' ? 'Video' : 'Article'}
          </ActionButton>
          <OpResult status={addStatus} message={addMsg} />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-xs text-white/40">
          <Loader className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-white/30 text-center py-10">No {tab} ingested yet.</p>
      ) : (
        <div className="divide-y divide-white/[0.05] max-h-[500px] overflow-y-auto">
          {rows.map((row) => (
            <div
              key={row.id}
              className={`flex items-start gap-3 px-4 py-2.5 group ${row.is_hidden ? 'opacity-40' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-white/85 line-clamp-1 leading-snug">
                  {row.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[10px] text-vgd-orange/70 font-medium">
                    {tab === 'articles' ? (row as ScrapedArticle).source_name ?? row.sport_category : row.sport_category}
                  </span>
                  {tab === 'videos' && (row as ScrapedVideo).channel_name && (
                    <span className="text-[10px] text-vgd-muted truncate max-w-[140px]">
                      {(row as ScrapedVideo).channel_name}
                    </span>
                  )}
                  <span className="text-[10px] text-vgd-muted">{timeAgo(row.ingested_at)}</span>
                  {row.is_hidden && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-red-400/70 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                      Hidden
                    </span>
                  )}
                  {row.is_pinned && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-vgd-orange bg-vgd-orange/10 px-1.5 py-0.5 rounded-full">
                      Pinned
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => tab === 'videos'
                    ? pinVideo(row.id, !row.is_pinned)
                    : pinArticle(row.id, !row.is_pinned)}
                  title={row.is_pinned ? 'Unpin' : 'Pin to top'}
                  className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                    row.is_pinned
                      ? 'text-vgd-orange hover:bg-vgd-orange/20'
                      : 'text-white/30 hover:text-vgd-orange hover:bg-vgd-orange/10'
                  }`}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
                {!row.is_hidden && (
                  <button
                    onClick={() => tab === 'videos' ? hideVideo(row.id) : hideArticle(row.id)}
                    title="Hide from public"
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-yellow-500/20 text-white/30 hover:text-yellow-400 transition-colors"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => tab === 'videos' ? deleteVideo(row.id) : deleteArticle(row.id)}
                  title="Delete permanently"
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 text-white/30 hover:text-vgd-red transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Admin() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<LiveGame[]>([]);

  useEffect(() => {
    if (!loading && !profile?.is_admin) {
      navigate('/', { replace: true });
    }
  }, [loading, profile, navigate]);

  async function loadGames() {
    const { data } = await supabase
      .from('live_games')
      .select('id, cfbd_game_id, home_team, away_team, kickoff_time, status, home_score, away_score')
      .order('kickoff_time', { ascending: false })
      .limit(20);
    setGames((data ?? []) as LiveGame[]);
  }

  useEffect(() => {
    if (profile?.is_admin) loadGames();
  }, [profile?.is_admin]);

  if (loading || !profile?.is_admin) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-black text-white uppercase tracking-wide">Admin Dashboard</h1>
        <p className="text-xs text-vgd-muted mt-0.5">Dev test tools — admin only</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CreateGamePanel onCreated={loadGames} />
        <GameStatusPanel games={games} onRefresh={loadGames} />
        <DriveWindowPanel games={games} />
        <SettleDrivePanel games={games} />
      </div>

      <ScrapedContentReview />
    </div>
  );
}
