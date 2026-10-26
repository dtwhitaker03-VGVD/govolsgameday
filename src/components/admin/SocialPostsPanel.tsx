import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardCard } from '../ui/DashboardCard';

// Admin view of the automated Facebook/Instagram pipeline (social-plan builds
// posts from real site data, social-publish sends them). Every post waits out a
// veto window first: cancel it here before it goes out, or send it now.

interface SocialSettings {
  enabled: boolean;
  test_mode: boolean;
  mode: 'veto' | 'auto';
  veto_hours: number;
  post_facebook: boolean;
  post_instagram: boolean;
}

interface SocialPost {
  id: string;
  kind: string;
  status: 'scheduled' | 'posting' | 'posted' | 'failed' | 'canceled' | 'test_ok';
  caption: string;
  image_url: string | null;
  scheduled_for: string;
  posted_at: string | null;
  fb_post_id: string | null;
  ig_media_id: string | null;
  error: string | null;
  attempts: number;
}

const KIND_LABEL: Record<string, string> = {
  countdown: 'Countdown',
  final_recap: 'Final recap',
  trivia_teaser: 'Trivia teaser',
  poll_teaser: 'Poll teaser',
  news: 'News',
  leaderboard: 'Leaderboard',
};

const STATUS_STYLE: Record<SocialPost['status'], string> = {
  scheduled: 'bg-vgd-orange/20 text-vgd-orange',
  posting: 'bg-blue-500/20 text-blue-300',
  posted: 'bg-green-500/20 text-green-400',
  failed: 'bg-vgd-red/20 text-vgd-red',
  canceled: 'bg-white/10 text-white/50',
  test_ok: 'bg-white/10 text-white/60',
};

const STATUS_LABEL: Record<SocialPost['status'], string> = {
  scheduled: 'Scheduled',
  posting: 'Posting…',
  posted: 'Posted',
  failed: 'Failed',
  canceled: 'Canceled',
  test_ok: 'Test (not sent)',
};

function whenText(iso: string, now: number): string {
  const d = new Date(iso);
  const clock = d.toLocaleString('en-US', {
    timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
  const ms = d.getTime() - now;
  if (ms <= 0) return clock;
  const mins = Math.round(ms / 60000);
  const rel = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  return `${clock} ET (in ${rel})`;
}

export function SocialPostsPanel() {
  const [settings, setSettings] = useState<SocialSettings | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from('social_settings').select('enabled, test_mode, mode, veto_hours, post_facebook, post_instagram').eq('id', true).maybeSingle(),
      supabase
        .from('social_posts')
        .select('id, kind, status, caption, image_url, scheduled_for, posted_at, fb_post_id, ig_media_id, error, attempts')
        .order('scheduled_for', { ascending: false })
        .limit(25),
    ]);
    setSettings((s as SocialSettings | null) ?? null);
    setPosts((p as SocialPost[] | null) ?? []);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  async function act(post: SocialPost, fn: 'admin_social_cancel' | 'admin_social_post_now', doneText: string) {
    setBusy(post.id);
    setMessage(null);
    const { error } = await supabase.rpc(fn, { p_id: post.id });
    setBusy(null);
    setMessage(error ? { ok: false, text: error.message } : { ok: true, text: doneText });
    load();
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    const { error } = await supabase.rpc('admin_social_update_settings', {
      p_enabled: settings.enabled,
      p_test_mode: settings.test_mode,
      p_mode: settings.mode,
      p_veto_hours: settings.veto_hours,
      p_post_facebook: settings.post_facebook,
      p_post_instagram: settings.post_instagram,
    });
    setSaving(false);
    setMessage(error ? { ok: false, text: error.message } : { ok: true, text: 'Settings saved.' });
    load();
  }

  const patch = (p: Partial<SocialSettings>) => setSettings((s) => (s ? { ...s, ...p } : s));

  const stateBanner = !settings ? null : !settings.enabled ? (
    <span className="text-white/60">PAUSED — nothing is being planned or posted</span>
  ) : settings.test_mode ? (
    <span className="text-yellow-300">TEST MODE — posts are built but never sent to Meta</span>
  ) : (
    <span className="text-green-400">LIVE — posts go to {[settings.post_facebook && 'Facebook', settings.post_instagram && 'Instagram'].filter(Boolean).join(' and ') || 'nowhere (both off)'}</span>
  );

  const check = (label: string, value: boolean, onChange: (v: boolean) => void) => (
    <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="accent-vgd-orange" />
      {label}
    </label>
  );

  return (
    <DashboardCard
      title="Social Posts — Facebook & Instagram"
      statusDotColor="#FF8200"
      headerExtra={
        <button onClick={load} className="text-white/50 hover:text-white" title="Refresh">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      }
    >
      <div className="p-4 space-y-4">
        {settings && (
          <div className="space-y-3">
            <p className="text-xs font-bold">{stateBanner}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
              {check('Posting enabled', settings.enabled, (v) => patch({ enabled: v }))}
              {check('Test mode (never send)', settings.test_mode, (v) => patch({ test_mode: v }))}
              <div />
              {check('Post to Facebook', settings.post_facebook, (v) => patch({ post_facebook: v }))}
              {check('Post to Instagram', settings.post_instagram, (v) => patch({ post_instagram: v }))}
              <div />
              <div>
                <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-0.5">Approval</label>
                <select
                  value={settings.mode}
                  onChange={(e) => patch({ mode: e.target.value as 'veto' | 'auto' })}
                  className="w-full bg-vgd-bg border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                >
                  <option value="veto">Veto window (I can cancel first)</option>
                  <option value="auto">Fully automatic</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-0.5">Veto window (hours)</label>
                <input
                  type="number" min={0} max={48} value={settings.veto_hours} disabled={settings.mode === 'auto'}
                  onChange={(e) => patch({ veto_hours: Math.max(0, Math.min(48, parseInt(e.target.value, 10) || 0)) })}
                  className="w-full bg-vgd-bg border border-white/10 rounded px-2 py-1.5 text-xs text-white disabled:opacity-40"
                />
              </div>
              <button
                onClick={saveSettings} disabled={saving}
                className="px-4 py-1.5 rounded bg-vgd-orange hover:bg-orange-500 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save settings'}
              </button>
            </div>
          </div>
        )}

        {message && <p className={`text-xs ${message.ok ? 'text-green-400' : 'text-vgd-red'}`}>{message.text}</p>}

        <div className="border-t border-white/[0.07] pt-3 space-y-3">
          {posts.length === 0 && <p className="text-xs text-white/50">No posts yet. The planner checks for new ones every 10 minutes.</p>}
          {posts.map((p) => (
            <div key={p.id} className="flex gap-3 bg-vgd-bg border border-white/[0.07] rounded-lg p-3">
              {p.image_url ? (
                <a href={p.image_url} target="_blank" rel="noreferrer" className="flex-shrink-0">
                  <img src={p.image_url} alt="" className="w-24 h-24 rounded object-cover" />
                </a>
              ) : (
                <div className="w-24 h-24 rounded bg-white/5 flex items-center justify-center text-[10px] text-white/40 flex-shrink-0">Rendering…</div>
              )}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${STATUS_STYLE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                  <span className="text-xs font-semibold text-white">{KIND_LABEL[p.kind] ?? p.kind}</span>
                  <span className="text-[11px] text-white/50">
                    {p.status === 'posted' && p.posted_at ? `sent ${whenText(p.posted_at, now)}` : whenText(p.scheduled_for, now)}
                  </span>
                </div>
                <details>
                  <summary className="text-xs text-white/70 cursor-pointer truncate">{p.caption.split('\n')[0]}</summary>
                  <p className="text-xs text-white/70 whitespace-pre-wrap mt-1">{p.caption}</p>
                </details>
                {p.error && p.status !== 'posted' && <p className="text-[11px] text-vgd-red break-words">{p.error}</p>}
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {p.status === 'scheduled' && (
                    <>
                      <button
                        onClick={() => act(p, 'admin_social_cancel', 'Post canceled — it will not go out.')}
                        disabled={busy === p.id}
                        className="px-3 py-1 rounded border border-vgd-red/50 text-vgd-red hover:bg-vgd-red/10 text-[11px] font-bold uppercase tracking-wider disabled:opacity-40"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => act(p, 'admin_social_post_now', 'Queued to send within 5 minutes.')}
                        disabled={busy === p.id || !p.image_url}
                        className="px-3 py-1 rounded border border-white/20 text-white hover:bg-white/10 text-[11px] font-bold uppercase tracking-wider disabled:opacity-40"
                      >
                        Send now
                      </button>
                    </>
                  )}
                  {p.fb_post_id && (
                    <a href={`https://www.facebook.com/${p.fb_post_id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-vgd-orange hover:underline">
                      Facebook <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {p.ig_media_id && <span className="text-[11px] text-white/40">Instagram ✓</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}
