import { useState, useEffect } from 'react';
import { Calendar, Loader2, Newspaper, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardCard } from '../ui/DashboardCard';
import { GamePreviewModal } from './GamePreviewModal';
import { shortTeamName } from '../../lib/teamNames';

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
  seconds: number;
  total: number;
}

// Matches the relevant slice of game-preview-sync's parsed ESPN content —
// CFBD's own season-stats endpoint doesn't expose points/yards allowed
// (see cfbd-data's buildTeamStats), so Scoring/Total Defense (and, this
// early in the season, often Scoring Offense too) stay "—" from that
// source. The Game Preview scrape already carries each team's national
// rank in these categories (the "(19th)" in "56 points per game (19th)"),
// so it doubles as the stat source here — this card shows that rank
// rather than the raw per-game number.
interface PreviewStatBlock {
  overall?: string;
  scoring?: string;
}

interface PreviewTeamKeyStats {
  team: string;
  offense: PreviewStatBlock;
  defense: PreviewStatBlock;
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
    seconds: secs % 60,
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

function ordinal(rank: number | null): string {
  if (!rank) return '—';
  if (rank >= 11 && rank <= 13) return `${rank}th`;
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = rank % 10;
  return `${rank}${suffixes[v <= 3 ? v : 0]}`;
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

// Pulls the national rank out of a Game Preview stat string, e.g.
// "56 points per game (19th)" -> 19, "221 yards per game (38th in FBS)" -> 38.
function parseRank(s: string | undefined): number | null {
  if (!s) return null;
  const m = s.match(/\((\d+)/);
  return m ? parseInt(m[1], 10) : null;
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
        className="object-contain rounded-md bg-white/5 flex-shrink-0"
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
    <div className="grid grid-cols-[1fr_auto_1fr] items-center py-0.5 border-b border-white/[0.05] last:border-0 gap-2">
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
  const [showPreview, setShowPreview] = useState(false);
  const [previewKeyStats, setPreviewKeyStats] = useState<PreviewTeamKeyStats[]>([]);

  useEffect(() => {
    supabase.functions
      .invoke('cfbd-data', { body: { type: 'upcoming' } })
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

  // Live countdown tick — ticking seconds is what makes the card read as
  // "live" rather than a static date, so this updates every second.
  useEffect(() => {
    if (!data?.game?.date) return;
    setCountdown(computeCountdown(data.game.date));
    const id = setInterval(() => {
      setCountdown(computeCountdown(data.game.date));
    }, 1000);
    return () => clearInterval(id);
  }, [data?.game?.date]);

  // Same lookup GamePreviewModal uses (by CFBD's numeric schedule id) — this
  // isn't the modal, just borrowing its already-scraped Scoring/Total
  // Defense numbers for the comparison table below.
  useEffect(() => {
    if (!data?.game?.id) return;
    supabase.functions
      .invoke('game-preview-sync', { body: { cfbd_game_id: data.game.id } })
      .then(({ data: res, error }) => {
        if (error || !res?.available || !res.content) return;
        setPreviewKeyStats((res.content.keyStats as PreviewTeamKeyStats[]) ?? []);
      });
  }, [data?.game?.id]);

  const metaTag = fetchState === 'ok' ? (
    <span className="flex items-center gap-1 text-vgd-orange text-[10px] font-bold uppercase tracking-wider">
      <Zap className="w-3 h-3" />
      UPCOMING
    </span>
  ) : null;

  const fmt = (v: number | null) => (v == null ? '—' : v % 1 === 0 ? v.toString() : v.toFixed(1));

  const findKeyStats = (team: string) => previewKeyStats.find((ks) => ks.team === team);
  const tnKeyStats = findKeyStats('Tennessee');
  const oppKeyStats = data ? findKeyStats(data.opponent.name) : undefined;

  const tnScoringOffRank = parseRank(tnKeyStats?.offense.scoring) ?? data?.tennessee.stats.scoringOffense?.rank ?? null;
  const oppScoringOffRank = parseRank(oppKeyStats?.offense.scoring) ?? data?.opponent.stats.scoringOffense?.rank ?? null;
  const tnScoringDefRank = parseRank(tnKeyStats?.defense.scoring) ?? data?.tennessee.stats.scoringDefense?.rank ?? null;
  const oppScoringDefRank = parseRank(oppKeyStats?.defense.scoring) ?? data?.opponent.stats.scoringDefense?.rank ?? null;
  const tnTotalDefRank = parseRank(tnKeyStats?.defense.overall) ?? data?.tennessee.stats.totalDefense?.rank ?? null;
  const oppTotalDefRank = parseRank(oppKeyStats?.defense.overall) ?? data?.opponent.stats.totalDefense?.rank ?? null;

  const headerExtra = fetchState === 'ok' && data ? (
    <button
      onClick={() => setShowPreview(true)}
      className="flex items-center gap-1 text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-vgd-muted hover:text-vgd-orange transition-colors border border-white/10 hover:border-vgd-orange/40 rounded px-1.5 py-0.5"
    >
      <Newspaper className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
      Game Preview
    </button>
  ) : undefined;

  return (
    <>
    <DashboardCard title="UPCOMING GAME" metadataTag={metaTag} headerExtra={headerExtra} className="w-full h-[220px] lg:h-[320px]">
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
          <div className="flex items-center justify-center gap-2 py-0.5 lg:py-1 flex-shrink-0">
            <TeamLogo src={data.tennessee.logo} name="TN" size={26} />
            <span className="text-white font-bold text-sm">Tennessee</span>
            <span className="text-vgd-muted text-xs font-bold uppercase tracking-wider mx-1">vs</span>
            <span className="text-white font-bold text-sm">{data.opponent.name}</span>
            <TeamLogo src={data.opponent.logo} name={shortTeamName(data.opponent.name)} size={26} />
          </div>

          {/* 2. Kickoff countdown — the headline stat on this card, so it
              gets a dedicated jumbotron-style banner instead of sharing a
              row with the date line (which now sits underneath it, small). */}
          {countdown && countdown.total > 0 ? (
            <div className="bg-gradient-to-b from-vgd-orange/[0.12] to-vgd-orange/[0.02] border border-vgd-orange/25 rounded-lg px-1 py-1.5 lg:py-2 mb-1 text-center flex-shrink-0">
              <div className="flex items-center justify-center gap-0.5">
                <span className="text-3xl lg:text-6xl font-black text-white leading-none tabular-nums">{countdown.days}</span>
                <span className="text-xl lg:text-4xl font-extrabold text-vgd-orange animate-pulse">:</span>
                <span className="text-3xl lg:text-6xl font-black text-white leading-none tabular-nums">{String(countdown.hours).padStart(2, '0')}</span>
                <span className="text-xl lg:text-4xl font-extrabold text-vgd-orange animate-pulse">:</span>
                <span className="text-3xl lg:text-6xl font-black text-white leading-none tabular-nums">{String(countdown.minutes).padStart(2, '0')}</span>
                <span className="text-xl lg:text-4xl font-extrabold text-vgd-orange animate-pulse">:</span>
                <span className="text-3xl lg:text-6xl font-black text-vgd-orange leading-none tabular-nums">{String(countdown.seconds).padStart(2, '0')}</span>
              </div>
              <p className="text-[8px] lg:text-[10px] text-vgd-muted mt-0.5 lg:mt-1 leading-tight">{formatGameDate(data.game.date)}</p>
            </div>
          ) : (
            <div className="flex items-center justify-center pb-2">
              <span className="text-[11px] text-vgd-muted">{formatGameDate(data.game.date)}</span>
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-white/[0.06] mb-1" />

          {/* 3. Six-row comparison table: label | TENN | opponent */}
          <div className="flex-1 flex flex-col justify-center">
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
              tnValue={ordinal(tnScoringOffRank)}
              oppValue={ordinal(oppScoringOffRank)}
            />
            <StatRow
              label="Total Off"
              tnValue={fmt(data.tennessee.stats.totalOffense?.value ?? null)}
              oppValue={fmt(data.opponent.stats.totalOffense?.value ?? null)}
            />
            <StatRow
              label="Scoring Def"
              tnValue={ordinal(tnScoringDefRank)}
              oppValue={ordinal(oppScoringDefRank)}
            />
            <StatRow
              label="Total Def"
              tnValue={ordinal(tnTotalDefRank)}
              oppValue={ordinal(oppTotalDefRank)}
            />
          </div>
        </div>
      ) : null}
    </DashboardCard>
    {showPreview && data && (
      <GamePreviewModal cfbdGameId={data.game.id} onClose={() => setShowPreview(false)} />
    )}
    </>
  );
}
