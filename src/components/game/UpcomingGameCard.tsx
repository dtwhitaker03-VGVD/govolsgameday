import { useState, useEffect } from 'react';
import { Calendar, Loader2, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardCard } from '../ui/DashboardCard';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TeamRecord { wins: number; losses: number }

interface TeamStatValue { value: number; rank: number }

interface TeamStats {
  scoringOffense: TeamStatValue | null;
  totalOffense: TeamStatValue | null;
  scoringDefense: TeamStatValue | null;
  totalDefense: TeamStatValue | null;
}

interface TeamInfo {
  record: TeamRecord | null;
  ranking_ap: number | null;
  ranking_coaches: number | null;
  logo: string | null;
  stats: TeamStats;
}

interface UpcomingGameData {
  game: {
    id: number;
    date: string;
    homeTeam: string;
    awayTeam: string;
    venue: string;
    neutralSite: boolean;
  };
  tennesseeIsHome: boolean;
  tennessee: TeamInfo;
  opponent: TeamInfo & { name: string };
}

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  total: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeCountdown(dateStr: string): Countdown {
  const total = Math.max(0, new Date(dateStr).getTime() - Date.now());
  const secs = Math.floor(total / 1000);
  return {
    total,
    days: Math.floor(secs / 86400),
    hours: Math.floor((secs % 86400) / 3600),
    minutes: Math.floor((secs % 3600) / 60),
  };
}

function formatGameDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
    timeZoneName: 'short',
  });
}

function rankSuffix(rank: number | null): string {
  if (!rank) return 'NR';
  if (rank >= 11 && rank <= 13) return `#${rank}th`;
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = rank % 10;
  return `#${rank}${suffixes[v <= 3 ? v : 0]}`;
}

function recordStr(record: TeamRecord | null): string {
  if (!record) return '—';
  return `${record.wins}-${record.losses}`;
}

function combinedRanking(ap: number | null, coaches: number | null): string {
  if (!ap && !coaches) return '—';
  const parts: string[] = [];
  if (ap) parts.push(`#${ap}`);
  if (coaches) parts.push(`#${coaches}`);
  return parts.join(' / ');
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TeamLogo({ src, name, size = 28 }: { src: string | null; name: string; size?: number }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="object-contain rounded-full bg-white/5 flex-shrink-0"
        style={{ width: size, height: size }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-vgd-orange/20 flex items-center justify-center text-vgd-orange font-black flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function StatRow({
  label,
  tnValue,
  oppValue,
}: {
  label: string;
  tnValue: string;
  oppValue: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center py-1 border-b border-white/[0.05] last:border-0 gap-2">
      <span className="text-white text-xs font-semibold text-right">{tnValue}</span>
      <span className="text-center text-[9px] text-vgd-muted uppercase tracking-wider w-24">{label}</span>
      <span className="text-white text-xs font-semibold text-left">{oppValue}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function UpcomingGameCard() {
  const [data, setData] = useState<UpcomingGameData | null | undefined>(undefined);
  const [fetchState, setFetchState] = useState<'loading' | 'ok' | 'no_games' | 'api_error'>('loading');
  const [apiErrorMsg, setApiErrorMsg] = useState('');
  const [countdown, setCountdown] = useState<Countdown | null>(null);

  useEffect(() => {
    supabase.functions
      .invoke('cfbd-proxy', { body: { type: 'upcoming' } })
      .then(({ data: res, error }) => {
        if (error) {
          setFetchState('api_error');
          setApiErrorMsg(error.message ?? 'Unknown error');
          return;
        }
        if (res?.reason === 'api_error') {
          setFetchState('api_error');
          setApiErrorMsg(res.message ?? `CFBD API error (HTTP ${res.apiStatus ?? '?'})`);
          return;
        }
        if (!res?.upcoming) {
          setFetchState('no_games');
          return;
        }
        setData(res.upcoming as UpcomingGameData);
        setFetchState('ok');
      });
  }, []);

  // Live countdown tick — updates every minute (no seconds needed)
  useEffect(() => {
    if (!data?.game?.date) return;
    setCountdown(computeCountdown(data.game.date));
    const id = setInterval(() => {
      setCountdown(computeCountdown(data.game.date));
    }, 60000);
    return () => clearInterval(id);
  }, [data?.game?.date]);

  const metaTag = fetchState === 'ok' ? (
    <span className="flex items-center gap-1 text-vgd-orange text-[10px] font-bold uppercase tracking-wider">
      <Zap className="w-3 h-3" />
      UPCOMING
    </span>
  ) : null;

  const fmt = (v: number | null) => (v == null ? '—' : v % 1 === 0 ? v.toString() : v.toFixed(1));

  return (
    <DashboardCard title="UPCOMING GAME" metadataTag={metaTag} className="w-full h-[220px] lg:h-[320px]">
      {fetchState === 'loading' ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-5 h-5 text-vgd-orange animate-spin" />
        </div>
      ) : fetchState === 'api_error' ? (
        <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
          <Zap className="w-6 h-6 text-vgd-red/50" />
          <p className="text-xs text-white/70">Unable to load game data.</p>
          <p className="text-[10px] text-vgd-muted/60">{apiErrorMsg}</p>
        </div>
      ) : fetchState === 'no_games' ? (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-vgd-muted px-4 text-center">
          <Calendar className="w-8 h-8 opacity-30" />
          <p className="text-xs">No upcoming game scheduled.</p>
        </div>
      ) : data ? (
        <div className="px-3 py-2 flex flex-col h-full">
          {/* 1. Matchup line — centered: [TN logo] Tennessee vs [Opp] [Opp logo] */}
          <div className="flex items-center justify-center gap-2 py-1.5">
            <TeamLogo src={data.tennessee.logo} name="TN" size={28} />
            <span className="text-white font-bold text-sm">Tennessee</span>
            <span className="text-vgd-muted text-xs font-bold uppercase tracking-wider mx-1">vs</span>
            <span className="text-white font-bold text-sm">{data.opponent.name}</span>
            <TeamLogo src={data.opponent.logo} name={data.opponent.name.slice(0, 2)} size={28} />
          </div>

          {/* 2. Date line — centered, one line: date/time + countdown inline */}
          <div className="flex items-center justify-center gap-2 pb-2">
            <span className="text-[11px] text-vgd-muted">
              {formatGameDate(data.game.date)}
            </span>
            {countdown && countdown.total > 0 && (
              <span className="text-[10px] font-bold text-vgd-orange bg-vgd-orange/10 px-1.5 py-0.5 rounded">
                {countdown.days > 0 ? `${countdown.days}d ` : ''}{countdown.hours}h {countdown.minutes}m
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.06] mb-1" />

          {/* 3. Six-row comparison table: label | TENN | opponent */}
          <div className="flex-1 flex flex-col justify-center">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_auto_1fr] text-[9px] text-vgd-muted uppercase tracking-wider pb-0.5 border-b border-white/[0.06] gap-2">
              <span className="text-right font-bold text-vgd-orange">TENN</span>
              <span className="text-center w-24" />
              <span className="text-left font-bold">{data.opponent.name.slice(0, 4).toUpperCase()}</span>
            </div>

            <StatRow
              label="Record"
              tnValue={recordStr(data.tennessee.record)}
              oppValue={recordStr(data.opponent.record)}
            />
            <StatRow
              label="AP / Coaches"
              tnValue={combinedRanking(data.tennessee.ranking_ap, data.tennessee.ranking_coaches)}
              oppValue={combinedRanking(data.opponent.ranking_ap, data.opponent.ranking_coaches)}
            />
            <StatRow
              label="Scoring Off"
              tnValue={fmt(data.tennessee.stats.scoringOffense?.value ?? null)}
              oppValue={fmt(data.opponent.stats.scoringOffense?.value ?? null)}
            />
            <StatRow
              label="Total Off"
              tnValue={fmt(data.tennessee.stats.totalOffense?.value ?? null)}
              oppValue={fmt(data.opponent.stats.totalOffense?.value ?? null)}
            />
            <StatRow
              label="Scoring Def"
              tnValue={fmt(data.tennessee.stats.scoringDefense?.value ?? null)}
              oppValue={fmt(data.opponent.stats.scoringDefense?.value ?? null)}
            />
            <StatRow
              label="Total Def"
              tnValue={fmt(data.tennessee.stats.totalDefense?.value ?? null)}
              oppValue={fmt(data.opponent.stats.totalDefense?.value ?? null)}
            />
          </div>
        </div>
      ) : null}
    </DashboardCard>
  );
}
