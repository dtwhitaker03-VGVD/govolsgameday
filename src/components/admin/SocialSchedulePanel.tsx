import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { DashboardCard } from '../ui/DashboardCard';

// The weekly Facebook/Instagram posting schedule (what social-plan builds and
// when). Times are Eastern. A row with no weekday is event-driven: the post-game
// stats chart goes out when a game is finalized.

interface Row {
  id: string;
  label: string;
  kind: string;
  dow: number | null;
  hour: number;
  minute: number;
  enabled: boolean;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = (n: number) => String(n).padStart(2, '0');

export function SocialSchedulePanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('social_schedule').select('id, label, kind, dow, hour, minute, enabled');
    const list = (data as Row[] | null) ?? [];
    // Event-driven first, then Sunday..Saturday by time.
    list.sort((a, b) => (a.dow ?? -1) - (b.dow ?? -1) || a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
    setRows(list);
  }, []);

  useEffect(() => { load(); }, [load]);

  const patch = (id: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  async function save(r: Row) {
    setSaving(r.id);
    setMessage(null);
    const { error } = await supabase.rpc('admin_social_update_schedule', {
      p_id: r.id, p_enabled: r.enabled, p_hour: r.hour, p_minute: r.minute,
    });
    setSaving(null);
    setMessage(error ? { ok: false, text: error.message } : { ok: true, text: `Saved: ${r.label}` });
  }

  return (
    <DashboardCard title="Social Posts — Weekly Schedule" statusDotColor="#FF8200">
      <div className="p-4 space-y-2">
        <p className="text-[11px] text-white/50">
          Times are Eastern. Every post still waits out the veto window set above before it goes out; the post-game chart waits at most 15 minutes.
        </p>
        {message && <p className={`text-xs ${message.ok ? 'text-green-400' : 'text-vgd-red'}`}>{message.text}</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 bg-vgd-bg border border-white/[0.07] rounded-lg px-3 py-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={r.enabled} onChange={(e) => patch(r.id, { enabled: e.target.checked })} className="accent-vgd-orange" />
            </label>
            <span className="w-24 text-xs font-bold text-vgd-orange">{r.dow === null ? 'After game' : DAYS[r.dow]}</span>
            <span className="flex-1 min-w-[180px] text-xs text-white">{r.label}</span>
            {r.dow !== null ? (
              <input
                type="time" value={`${pad(r.hour)}:${pad(r.minute)}`}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(':').map((x) => parseInt(x, 10));
                  if (Number.isFinite(h) && Number.isFinite(m)) patch(r.id, { hour: h, minute: m });
                }}
                className="bg-vgd-card border border-white/10 rounded px-2 py-1 text-xs text-white"
              />
            ) : (
              <span className="text-[11px] text-white/40 w-[88px]">when finalized</span>
            )}
            <button
              onClick={() => save(r)} disabled={saving === r.id}
              className="px-3 py-1 rounded border border-white/20 text-white hover:bg-white/10 text-[11px] font-bold uppercase tracking-wider disabled:opacity-40"
            >
              {saving === r.id ? 'Saving…' : 'Save'}
            </button>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
