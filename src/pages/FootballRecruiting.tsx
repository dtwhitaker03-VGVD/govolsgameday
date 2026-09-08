import { useState, useEffect, useCallback } from 'react';
import {
  Trophy, TrendingUp, Users, Search,
  GraduationCap, ArrowRightLeft, Target, Clock,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DashboardCard } from '../components/ui/DashboardCard';
import { DiscussionBoard } from '../components/chat/DiscussionBoard';
import { VolNewsWire } from '../components/news/VolNewsWire';
import { ForumThreadsPanel } from '../components/forums/ForumThreadsPanel';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Recruit {
  id: string;
  full_name: string;
  hometown: string | null;
  position: string | null;
  sport_category: string;
  scouting_year: number;
  stars_247: number | null;
  stars_on3: number | null;
  national_rank: number | null;
  status: string | null;
  updated_at: string | null;
}

interface ClassRanking {
  id: string;
  sport_category: string;
  scouting_year: number;
  rank_247: number;
  rank_on3: number;
  sec_rank: number;
  updated_at: string | null;
}

// Shared shape for both stat_type='offense' and stat_type='defense' rows
// from ncaa_scoring_rankings.
interface ScoringRankingRow {
  id: string;
  team: string;
  rank: number;
  games: number;
  points: number;
  points_per_game: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const CLASS_YEARS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P', 'ATH'];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  committed:    { label: 'Committed',    color: '#FF8200' },
  signed:       { label: 'Signed',       color: '#34d399' },
  decommitted: { label: 'Decommitted',  color: '#D11919' },
  portal:       { label: 'In Portal',    color: '#f59e0b' },
  target:       { label: 'Target',       color: '#60a5fa' },
  on_roster:    { label: 'On Roster',    color: '#a78bfa' },
};

const PROSPECT_TABS = [
  { key: 'hs_commits', label: 'HS Commits',    icon: GraduationCap, status: 'committed' },
  { key: 'transfer',   label: 'Transfer',     icon: ArrowRightLeft, status: 'portal' },
  { key: 'targets',    label: 'Targets',      icon: Target,         status: 'target' },
  { key: 'roster',     label: 'Roster',       icon: Users,          status: 'on_roster' },
] as const;

const SORT_OPTIONS = [
  { key: 'composite', label: 'Composite' },
  { key: '247',       label: '247Sports' },
  { key: 'on3',       label: 'On3' },
  { key: 'position',  label: 'Position' },
] as const;

// ─── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function avgStars(recruits: Recruit[], source: '247' | 'on3'): string {
  const key = source === '247' ? 'stars_247' : 'stars_on3';
  const valid = recruits.filter((r) => r[key] !== null);
  if (valid.length === 0) return '—';
  const avg = valid.reduce((sum, r) => sum + (r[key] as number), 0) / valid.length;
  return avg.toFixed(1);
}

// ─── Empty State ─────────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2.5 text-center px-4">
      <div className="w-11 h-11 rounded-full bg-white/[0.04] flex items-center justify-center">
        <Icon className="w-5 h-5 text-vgd-muted" />
      </div>
      <div>
        <p className="text-xs font-semibold text-white/50">{title}</p>
        <p className="text-[10px] text-white/30 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Star Display ────────────────────────────────────────────────────────────────

function StarBadge({ stars, label }: { stars: number | null; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px] text-vgd-muted uppercase tracking-wider">{label}</span>
      <span className="text-xs text-vgd-orange font-bold">{stars ?? '—'}</span>
      {stars && <span className="text-[10px] text-vgd-orange">{'★'.repeat(stars)}</span>}
    </div>
  );
}

function StatusPill({ status }: { status: string | null }) {
  const cfg = status ? STATUS_LABELS[status] : null;
  if (!cfg) return <span className="text-[10px] text-vgd-muted">—</span>;
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Section 1: Header Stats Bar ──────────────────────────────────────────────────

function HeaderStatsBar({
  classYear,
  onClassYearChange,
  rankings,
  recruits,
  lastUpdated,
  industryToggle,
  onIndustryToggle,
}: {
  classYear: number;
  onClassYearChange: (y: number) => void;
  rankings: ClassRanking | null;
  recruits: Recruit[];
  lastUpdated: string | null;
  industryToggle: '247' | 'on3';
  onIndustryToggle: (t: '247' | 'on3') => void;
}) {
  const commits = recruits.filter((r) => r.status === 'committed' || r.status === 'signed');
  const rank = industryToggle === '247' ? rankings?.rank_247 : rankings?.rank_on3;
  const avgStr = industryToggle === '247' ? avgStars(commits, '247') : avgStars(commits, 'on3');

  return (
    <DashboardCard
      title="RECRUITING DASHBOARD"
      metadataTag={
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-vgd-muted" />
          <span className="text-[10px] text-vgd-muted">
            {lastUpdated ? `Updated ${timeAgo(lastUpdated)}` : 'Awaiting data'}
          </span>
        </div>
      }
    >
      <div className="px-4 py-3.5">
        {/* Class year selector + industry toggle */}
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-1">
            {CLASS_YEARS.map((y) => (
              <button
                key={y}
                onClick={() => onClassYearChange(y)}
                className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold transition-colors ${
                  classYear === y
                    ? 'bg-vgd-orange/20 border-vgd-orange/50 text-vgd-orange'
                    : 'border-white/[0.08] text-white/40 hover:text-white/70'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-vgd-muted uppercase tracking-wider mr-1">Source:</span>
            <button
              onClick={() => onIndustryToggle('247')}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                industryToggle === '247'
                  ? 'bg-vgd-orange/20 border-vgd-orange/50 text-vgd-orange'
                  : 'border-white/[0.08] text-white/40 hover:text-white/70'
              }`}
            >
              247Sports
            </button>
            <button
              onClick={() => onIndustryToggle('on3')}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                industryToggle === 'on3'
                  ? 'bg-vgd-orange/20 border-vgd-orange/50 text-vgd-orange'
                  : 'border-white/[0.08] text-white/40 hover:text-white/70'
              }`}
            >
              On3
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white/[0.04] rounded-lg px-3 py-2.5">
            <div className="text-[9px] text-vgd-muted uppercase tracking-wider mb-0.5">National Rank</div>
            <div className="text-lg font-bold text-white">
              {rank ? `#${rank}` : '—'}
            </div>
          </div>
          <div className="bg-white/[0.04] rounded-lg px-3 py-2.5">
            <div className="text-[9px] text-vgd-muted uppercase tracking-wider mb-0.5">SEC Rank</div>
            <div className="text-lg font-bold text-white">
              {rankings?.sec_rank ? `#${rankings.sec_rank}` : '—'}
            </div>
          </div>
          <div className="bg-white/[0.04] rounded-lg px-3 py-2.5">
            <div className="text-[9px] text-vgd-muted uppercase tracking-wider mb-0.5">Total Commits</div>
            <div className="text-lg font-bold text-white">{commits.length}</div>
          </div>
          <div className="bg-white/[0.04] rounded-lg px-3 py-2.5">
            <div className="text-[9px] text-vgd-muted uppercase tracking-wider mb-0.5">Avg Stars</div>
            <div className="text-lg font-bold text-vgd-orange">{avgStr}</div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

// ─── Section 2: Tabbed Prospect Database ──────────────────────────────────────────
// Doubles as the ranking view — a separate "Player Rankings" module used to sit
// next to this and just re-listed the same recruits sorted differently, which
// read as duplicated information. Sorting now lives here instead, applied on
// top of whichever tab/filters are active, with a rank number per row.

function ProspectDatabase({ recruits, transferRecruits, loading }: { recruits: Recruit[]; transferRecruits: Recruit[]; loading: boolean }) {
  const [activeTab, setActiveTab] = useState<typeof PROSPECT_TABS[number]['key']>('hs_commits');
  const [posFilter, setPosFilter] = useState<string>('');
  const [starFilter, setStarFilter] = useState<number>(0);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<typeof SORT_OPTIONS[number]['key']>('composite');

  const currentTab = PROSPECT_TABS.find((t) => t.key === activeTab)!;
  // Transfers live under the current transfer-portal season, which is a
  // different vintage than the selected HS recruiting class year (see
  // recruiting_sources.transfers_scouting_year) — so the Transfer tab reads
  // from its own year-independent fetch instead of the classYear-scoped list.
  const sourceRecruits = currentTab.key === 'transfer' ? transferRecruits : recruits;
  const filtered = sourceRecruits.filter((r) => {
    if (currentTab.key === 'hs_commits' && !(r.status === 'committed' || r.status === 'signed')) return false;
    if (currentTab.key === 'transfer' && r.status !== 'portal') return false;
    if (currentTab.key === 'targets' && r.status !== 'target') return false;
    if (currentTab.key === 'roster' && r.status !== 'on_roster') return false;
    if (posFilter && r.position !== posFilter) return false;
    if (starFilter && r.stars_247 !== starFilter) return false;
    if (search && !r.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === '247') return (b.stars_247 ?? 0) - (a.stars_247 ?? 0);
    if (sortBy === 'on3') return (b.stars_on3 ?? 0) - (a.stars_on3 ?? 0);
    if (sortBy === 'position') return (a.position ?? 'zzz').localeCompare(b.position ?? 'zzz');
    // composite: average of both
    const aAvg = ((a.stars_247 ?? 0) + (a.stars_on3 ?? 0)) / 2;
    const bAvg = ((b.stars_247 ?? 0) + (b.stars_on3 ?? 0)) / 2;
    return bAvg - aAvg;
  });

  return (
    <DashboardCard
      title="PROSPECT DATABASE"
      statusDotColor="#60a5fa"
      metadataTag={
        <div className="flex items-center gap-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                sortBy === opt.key
                  ? 'bg-vgd-orange/20 border-vgd-orange/50 text-vgd-orange'
                  : 'border-white/[0.08] text-white/40 hover:text-white/70'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      }
    >
      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 pt-3 border-b border-white/[0.07] pb-2">
        {PROSPECT_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-t-md font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'text-vgd-orange border-b-2 border-vgd-orange'
                  : 'text-white/40 hover:text-white/70 border-b-2 border-transparent'
              }`}
            >
              <Icon className="w-3 h-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.05] flex-wrap">
        <div className="relative flex-1 min-w-[120px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-vgd-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prospects…"
            className="w-full bg-vgd-bg border border-white/[0.08] text-white placeholder-vgd-muted rounded-md pl-7 pr-2 py-1 text-[11px] focus:outline-none focus:border-vgd-orange/40"
          />
        </div>
        <select
          value={posFilter}
          onChange={(e) => setPosFilter(e.target.value)}
          className="bg-vgd-bg border border-white/[0.08] text-white/70 rounded-md px-2 py-1 text-[11px] focus:outline-none focus:border-vgd-orange/40"
        >
          <option value="">All Positions</option>
          {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={starFilter}
          onChange={(e) => setStarFilter(Number(e.target.value))}
          className="bg-vgd-bg border border-white/[0.08] text-white/70 rounded-md px-2 py-1 text-[11px] focus:outline-none focus:border-vgd-orange/40"
        >
          <option value={0}>All Stars</option>
          {[5, 4, 3].map((s) => <option key={s} value={s}>{s}★+</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-3 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-white/[0.03] rounded animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState icon={Search} title="No prospects found" subtitle="Adjust filters or wait for recruiting data ingestion." />
      ) : (
        <div className="divide-y divide-white/[0.05]">
          {sorted.map((r, i) => (
            <div key={r.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.02] transition-colors">
              <span className="text-xs font-black text-vgd-orange w-5 text-right flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white/85 truncate">{r.full_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-vgd-orange/70 font-medium">{r.position || '—'}</span>
                  {r.hometown && <span className="text-[10px] text-vgd-muted truncate">{r.hometown}</span>}
                </div>
              </div>
              <StarBadge stars={r.stars_247} label="247" />
              <StarBadge stars={r.stars_on3} label="On3" />
              <StatusPill status={r.status} />
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}

// ─── Section 3: Team Rankings — Scoring Offense + Scoring Defense, side by side ────
// Sourced from NCAA.com's own team stat pages rather than a recruiting
// metric — this is where Tennessee actually ranks nationally on the field.
// Tennessee sits at its real rank in the list, highlighted, rather than
// pulled out to a pinned top row — except when its rank falls outside the
// top 25 shown here, in which case its row is appended after a divider so
// it's never simply missing from its own team's rankings panel.
const RANKING_DISPLAY_LIMIT = 25;

function topRowsWithTennessee(rows: ScoringRankingRow[]): { top: ScoringRankingRow[]; pinnedTennessee: ScoringRankingRow | null } {
  const sorted = [...rows].sort((a, b) => a.rank - b.rank);
  const top = sorted.slice(0, RANKING_DISPLAY_LIMIT);
  if (top.some((r) => r.team === 'Tennessee')) return { top, pinnedTennessee: null };
  const tnRow = sorted.find((r) => r.team === 'Tennessee') ?? null;
  return { top, pinnedTennessee: tnRow };
}

function RankingRow({ r, statSuffix }: { r: ScoringRankingRow; statSuffix: string }) {
  const isTN = r.team === 'Tennessee';
  return (
    <div className={`flex items-center gap-2 px-3 py-2 transition-colors ${isTN ? 'bg-vgd-orange/[0.08]' : 'hover:bg-white/[0.02]'}`}>
      <span className={`w-6 text-xs font-black text-right flex-shrink-0 ${isTN ? 'text-vgd-orange' : 'text-white/30'}`}>
        #{r.rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold truncate ${isTN ? 'text-vgd-orange' : 'text-white/60'}`}>{r.team}</p>
        <p className="text-[10px] text-vgd-muted">{r.points_per_game.toFixed(1)} {statSuffix}</p>
      </div>
      {isTN && <Trophy className="w-3.5 h-3.5 text-vgd-orange flex-shrink-0" />}
    </div>
  );
}

function RankingColumn({ label, statSuffix, rows }: { label: string; statSuffix: string; rows: ScoringRankingRow[] }) {
  if (rows.length === 0) {
    return (
      <div>
        <div className="px-3 py-2 text-[10px] font-bold text-vgd-orange uppercase tracking-wider border-b border-white/[0.07]">{label}</div>
        <EmptyState icon={TrendingUp} title="No rankings yet" subtitle="Syncs from NCAA.com daily." />
      </div>
    );
  }

  const { top, pinnedTennessee } = topRowsWithTennessee(rows);

  return (
    <div>
      <div className="px-3 py-2 text-[10px] font-bold text-vgd-orange uppercase tracking-wider border-b border-white/[0.07]">{label}</div>
      <div className="divide-y divide-white/[0.05]">
        {top.map((r) => <RankingRow key={r.id} r={r} statSuffix={statSuffix} />)}
        {pinnedTennessee && (
          <>
            <div className="px-3 py-1 text-center text-[10px] text-vgd-muted">···</div>
            <RankingRow key={pinnedTennessee.id} r={pinnedTennessee} statSuffix={statSuffix} />
          </>
        )}
      </div>
    </div>
  );
}

function TeamRankingsComparison({
  offenseRankings,
  defenseRankings,
}: {
  offenseRankings: ScoringRankingRow[];
  defenseRankings: ScoringRankingRow[];
}) {
  return (
    <DashboardCard title="TEAM RANKINGS" statusDotColor="#34d399">
      <div className="grid grid-cols-2 divide-x divide-white/[0.07]">
        <RankingColumn label="Scoring Offense" statSuffix="PPG" rows={offenseRankings} />
        <RankingColumn label="Scoring Defense" statSuffix="PPG allowed" rows={defenseRankings} />
      </div>
    </DashboardCard>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────────

export default function FootballRecruiting() {
  const [classYear, setClassYear] = useState(CURRENT_YEAR + 1);
  const [industryToggle, setIndustryToggle] = useState<'247' | 'on3'>('247');
  const [recruits, setRecruits] = useState<Recruit[]>([]);
  const [transferRecruits, setTransferRecruits] = useState<Recruit[]>([]);
  const [rankings, setRankings] = useState<ClassRanking | null>(null);
  const [offenseRankings, setOffenseRankings] = useState<ScoringRankingRow[]>([]);
  const [defenseRankings, setDefenseRankings] = useState<ScoringRankingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [recruitsRes, transfersRes, rankingsRes, offenseRes, defenseRes] = await Promise.all([
      supabase
        .from('recruits')
        .select('*')
        .eq('sport_category', 'football')
        .eq('scouting_year', classYear),
      // Portal transfers live under the current transfer season, a different
      // vintage than the selected HS class year, so this fetch is scoped by
      // status only rather than classYear.
      supabase
        .from('recruits')
        .select('*')
        .eq('sport_category', 'football')
        .eq('status', 'portal'),
      supabase
        .from('recruiting_class_rankings')
        .select('*')
        .eq('sport_category', 'football')
        .eq('scouting_year', classYear)
        .maybeSingle(),
      // Scoring Offense/Defense are current-season on-field stats, not tied
      // to the HS recruiting class year selector above — so these fetch the
      // full current-season list (topRowsWithTennessee caps for display and
      // pins Tennessee's row separately if it falls outside that cap).
      supabase
        .from('ncaa_scoring_rankings')
        .select('*')
        .eq('stat_type', 'offense')
        .eq('season', CURRENT_YEAR),
      supabase
        .from('ncaa_scoring_rankings')
        .select('*')
        .eq('stat_type', 'defense')
        .eq('season', CURRENT_YEAR),
    ]);
    setRecruits((recruitsRes.data as Recruit[]) ?? []);
    setTransferRecruits((transfersRes.data as Recruit[]) ?? []);
    setRankings((rankingsRes.data as ClassRanking) ?? null);
    setOffenseRankings((offenseRes.data as ScoringRankingRow[]) ?? []);
    setDefenseRankings((defenseRes.data as ScoringRankingRow[]) ?? []);
    setLoading(false);
  }, [classYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const lastUpdated = recruits.length > 0
    ? recruits.reduce((latest, r) => (r.updated_at && (!latest || r.updated_at > latest) ? r.updated_at : latest), null as string | null)
    : rankings?.updated_at ?? null;

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Section 1: Header Stats Bar */}
      <HeaderStatsBar
        classYear={classYear}
        onClassYearChange={setClassYear}
        rankings={rankings}
        recruits={recruits}
        lastUpdated={lastUpdated}
        industryToggle={industryToggle}
        onIndustryToggle={setIndustryToggle}
      />

      {/* Section 2 & 3: Team Rankings + Prospect Database, side by side. Each
          row in Team Rankings is just a team name and one short stat line —
          full page width left most of each row empty, so it shares a row
          with Prospect Database instead (whose own "Player Rankings" sort
          now lives in its header, rather than a separate duplicate list). */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <TeamRankingsComparison offenseRankings={offenseRankings} defenseRankings={defenseRankings} />
        <ProspectDatabase recruits={recruits} transferRecruits={transferRecruits} loading={loading} />
      </div>

      {/* Section 4: Football Recruiting Discussion Board */}
      <DiscussionBoard
        roomCategory="football-recruiting"
        title="FOOTBALL RECRUITING DISCUSSION BOARD"
        qotdSportCategories={['football']}
        className="h-[700px]"
      />

      {/* Section 5: News Grid */}
      <VolNewsWire sportCategory="football-recruiting" />

      {/* Section 6: Three-Window Forum Tray */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <ForumThreadsPanel mode="new" category="football_recruiting" />
        <ForumThreadsPanel mode="popular" category="football_recruiting" />
        <ForumThreadsPanel mode="recruiting" recruitingCategory="football_recruiting" />
      </div>
    </div>
  );
}
