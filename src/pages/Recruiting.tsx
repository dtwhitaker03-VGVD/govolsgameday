import { useState, useEffect, useCallback } from 'react';
import {
  Trophy, Star, Search, Award, Users, TrendingUp, Clock,
  GraduationCap, ArrowRightLeft, Target, RefreshCw, MapPin,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DashboardCard } from '../components/ui/DashboardCard';
import { DiscussionBoard } from '../components/chat/DiscussionBoard';
import { VideoGrid } from '../components/video/VideoGrid';
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
  updated_at: string | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const CLASS_YEARS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  committed:    { label: 'Committed',   color: '#FF8200' },
  signed:       { label: 'Signed',      color: '#34d399' },
  decommitted: { label: 'Decommitted', color: '#D11919' },
  portal:       { label: 'In Portal',   color: '#f59e0b' },
  target:       { label: 'Target',      color: '#60a5fa' },
  on_roster:    { label: 'On Roster',   color: '#a78bfa' },
};

const PROSPECT_TABS = [
  { key: 'hs_commits', label: 'HS Commits', icon: GraduationCap, status: 'committed' },
  { key: 'transfer',   label: 'Transfer',  icon: ArrowRightLeft, status: 'portal' },
  { key: 'targets',    label: 'Targets',   icon: Target,         status: 'target' },
  { key: 'roster',     label: 'Roster',    icon: Users,          status: 'on_roster' },
] as const;

const SORT_OPTIONS = [
  { key: 'composite', label: 'Composite' },
  { key: '247',       label: '247Sports' },
  { key: 'on3',       label: 'On3' },
  { key: 'position',  label: 'Position' },
] as const;

// Tier 1: Men's Basketball — full treatment
const TIER1_SPORT = 'basketball';
const TIER1_LABEL = "Men's Basketball";

// Tier 2: minimal treatment sports
const TIER2_SPORTS = [
  { key: 'lv-basketball', label: 'LV Basketball' },
  { key: 'baseball',      label: 'Baseball' },
  { key: 'lv-softball',   label: 'LV Softball' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
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

function StarBadge({ stars, label }: { stars: number | null; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px] text-vgd-muted uppercase tracking-wider">{label}</span>
      <span className="text-xs text-vgd-orange font-bold">{stars ?? '—'}</span>
      {stars && <span className="text-[10px] text-vgd-orange">{'★'.repeat(stars)}</span>}
    </div>
  );
}

// ─── Class Year Tabs ──────────────────────────────────────────────────────────────

function ClassYearTabs({ year, onChange }: { year: number; onChange: (y: number) => void }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {CLASS_YEARS.map((y) => (
        <button
          key={y}
          onClick={() => onChange(y)}
          className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold transition-colors ${
            year === y
              ? 'bg-vgd-orange/20 border-vgd-orange/50 text-vgd-orange'
              : 'border-white/[0.08] text-white/40 hover:text-white/70'
          }`}
        >
          {y}
        </button>
      ))}
    </div>
  );
}

// ─── Class Rankings Banner (shared) ──────────────────────────────────────────────

function ClassRankingsBanner({ rankings, label }: { rankings: ClassRanking | null; label: string }) {
  return (
    <DashboardCard title={`${label.toUpperCase()} — CLASS RANKINGS`} statusDotColor="#34d399">
      {rankings ? (
        <div className="grid grid-cols-2 gap-0 divide-x divide-white/[0.07]">
          <div className="px-4 py-3.5 text-center">
            <div className="text-[10px] font-bold text-vgd-orange uppercase tracking-wider mb-2">247Sports</div>
            <div className="text-2xl font-black text-white">#{rankings.rank_247}</div>
            <div className="text-[9px] text-vgd-muted uppercase mt-0.5">National</div>
          </div>
          <div className="px-4 py-3.5 text-center">
            <div className="text-[10px] font-bold text-vgd-orange uppercase tracking-wider mb-2">On3</div>
            <div className="text-2xl font-black text-white">#{rankings.rank_on3}</div>
            <div className="text-[9px] text-vgd-muted uppercase mt-0.5">National</div>
          </div>
        </div>
      ) : (
        <EmptyState icon={Trophy} title="No class rankings yet" subtitle="Rankings sync from 247Sports and On3 twice daily." />
      )}
    </DashboardCard>
  );
}

// ─── Commit Tracker (Tier 1) ────────────────────────────────────────────────────

function CommitTracker({ recruits }: { recruits: Recruit[] }) {
  const commits = recruits.filter((r) => r.status === 'committed' || r.status === 'signed');
  const decommits = recruits.filter((r) => r.status === 'decommitted');
  const portal = recruits.filter((r) => r.status === 'portal');
  const recent = [...recruits].sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? '')).slice(0, 8);

  return (
    <DashboardCard
      title="LIVE COMMIT TRACKER"
      statusDotColor="#FF8200"
      metadataTag={<span className="text-[10px] text-vgd-muted">{commits.length}C · {decommits.length}D · {portal.length}P</span>}
    >
      {recent.length === 0 ? (
        <EmptyState icon={RefreshCw} title="No commit activity yet" subtitle="Commit, decommit, and portal activity will appear here." />
      ) : (
        <div className="divide-y divide-white/[0.05]">
          {recent.map((r) => {
            const isCommit = r.status === 'committed' || r.status === 'signed';
            const isDecommit = r.status === 'decommitted';
            const accentColor = isDecommit ? '#D11919' : isCommit ? '#FF8200' : '#f59e0b';
            return (
              <div key={r.id} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.02] transition-colors">
                <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: accentColor }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white/85 truncate">{r.full_name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-vgd-muted">{r.position || '—'}</span>
                    {r.hometown && <span className="text-[10px] text-vgd-muted truncate">· {r.hometown}</span>}
                  </div>
                </div>
                <StatusPill status={r.status} />
                <span className="text-[10px] text-vgd-muted flex-shrink-0">{timeAgo(r.updated_at)}</span>
              </div>
            );
          })}
        </div>
      )}
    </DashboardCard>
  );
}

// ─── Tabbed Prospect Database (Tier 1) ──────────────────────────────────────────

function ProspectDatabase({ recruits, loading }: { recruits: Recruit[]; loading: boolean }) {
  const [activeTab, setActiveTab] = useState<typeof PROSPECT_TABS[number]['key']>('hs_commits');
  const [search, setSearch] = useState('');

  const currentTab = PROSPECT_TABS.find((t) => t.key === activeTab)!;
  const filtered = recruits.filter((r) => {
    if (currentTab.key === 'hs_commits' && !(r.status === 'committed' || r.status === 'signed')) return false;
    if (currentTab.key === 'transfer' && r.status !== 'portal') return false;
    if (currentTab.key === 'targets' && r.status !== 'target') return false;
    if (currentTab.key === 'roster' && r.status !== 'on_roster') return false;
    if (search && !r.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <DashboardCard title="PROSPECT DATABASE" statusDotColor="#60a5fa">
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
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.05]">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-vgd-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prospects…"
            className="w-full bg-vgd-bg border border-white/[0.08] text-white placeholder-vgd-muted rounded-md pl-7 pr-2 py-1 text-[11px] focus:outline-none focus:border-vgd-orange/40"
          />
        </div>
      </div>
      {loading ? (
        <div className="p-3 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-white/[0.03] rounded animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No prospects found" subtitle="Adjust filters or wait for recruiting data ingestion." />
      ) : (
        <div className="divide-y divide-white/[0.05]">
          {filtered.map((r) => (
            <div key={r.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.02] transition-colors">
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

// ─── Player Rankings Module (Tier 1) ────────────────────────────────────────────

function PlayerRankings({ recruits, loading }: { recruits: Recruit[]; loading: boolean }) {
  const [sortBy, setSortBy] = useState<typeof SORT_OPTIONS[number]['key']>('composite');

  const sorted = [...recruits].sort((a, b) => {
    if (sortBy === '247') return (b.stars_247 ?? 0) - (a.stars_247 ?? 0);
    if (sortBy === 'on3') return (b.stars_on3 ?? 0) - (a.stars_on3 ?? 0);
    if (sortBy === 'position') return (a.position ?? 'zzz').localeCompare(b.position ?? 'zzz');
    const aAvg = ((a.stars_247 ?? 0) + (a.stars_on3 ?? 0)) / 2;
    const bAvg = ((b.stars_247 ?? 0) + (b.stars_on3 ?? 0)) / 2;
    return bAvg - aAvg;
  }).slice(0, 15);

  return (
    <DashboardCard
      title="PLAYER RANKINGS"
      statusDotColor="#a78bfa"
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
      {loading || sorted.length === 0 ? (
        <EmptyState icon={Award} title="No player rankings yet" subtitle="Recruit rankings will appear once data ingestion begins." />
      ) : (
        <div className="divide-y divide-white/[0.05]">
          {sorted.map((r, i) => (
            <div key={r.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.02] transition-colors">
              <span className="text-xs font-black text-vgd-orange w-6 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white/85 truncate">{r.full_name}</p>
                <span className="text-[10px] text-vgd-muted">{r.position || '—'} · {r.hometown || '—'}</span>
              </div>
              <StarBadge stars={r.stars_247} label="247" />
              <StarBadge stars={r.stars_on3} label="On3" />
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}

// ─── Team Rankings Comparison (Tier 1) ──────────────────────────────────────────

function TeamRankingsComparison({ rankings }: { rankings: ClassRanking | null }) {
  const secRivals = ['Kentucky', 'Arkansas', 'Florida', 'Alabama', 'Auburn', 'Missouri'];
  return (
    <DashboardCard title="TEAM RANKINGS — TN vs SEC" statusDotColor="#34d399">
      {rankings ? (
        <div className="divide-y divide-white/[0.05]">
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-vgd-orange/[0.06]">
            <span className="w-6 text-xs font-black text-vgd-orange text-right">#{rankings.rank_247}</span>
            <div className="flex-1">
              <p className="text-xs font-bold text-vgd-orange">Tennessee</p>
              <p className="text-[10px] text-vgd-muted">247: #{rankings.rank_247} · On3: #{rankings.rank_on3}</p>
            </div>
            <Trophy className="w-3.5 h-3.5 text-vgd-orange" />
          </div>
          {secRivals.map((rival) => (
            <div key={rival} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.02] transition-colors">
              <span className="w-6 text-xs font-bold text-white/30 text-right">—</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-white/60">{rival}</p>
                <p className="text-[10px] text-vgd-muted">Awaiting data</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={TrendingUp} title="No team rankings yet" subtitle="SEC rival comparison will appear once rankings sync." />
      )}
    </DashboardCard>
  );
}

// ─── Simple Prospect List (Tier 2) ──────────────────────────────────────────────

function SimpleProspectList({ recruits, loading, sportLabel }: { recruits: Recruit[]; loading: boolean; sportLabel: string }) {
  return (
    <DashboardCard title={`${sportLabel.toUpperCase()} — PROSPECTS`} statusDotColor="#60a5fa">
      {loading ? (
        <div className="p-3 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-white/[0.03] rounded animate-pulse" />)}
        </div>
      ) : recruits.length === 0 ? (
        <EmptyState icon={Users} title="No prospects yet" subtitle={`${sportLabel} recruiting data will appear here once ingestion begins.`} />
      ) : (
        <div className="divide-y divide-white/[0.05]">
          {recruits.map((r) => (
            <div key={r.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.02] transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white/85 truncate">{r.full_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-vgd-orange/70 font-medium">{r.position || '—'}</span>
                  {r.hometown && (
                    <span className="text-[10px] text-vgd-muted flex items-center gap-0.5 truncate">
                      <MapPin className="w-2.5 h-2.5" />{r.hometown}
                    </span>
                  )}
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

// ─── Tier 2 Section (minimal: rankings + prospect list + class year tabs) ────────

function Tier2Section({ sportKey, sportLabel, classYear, onClassYearChange }: {
  sportKey: string;
  sportLabel: string;
  classYear: number;
  onClassYearChange: (y: number) => void;
}) {
  const [recruits, setRecruits] = useState<Recruit[]>([]);
  const [rankings, setRankings] = useState<ClassRanking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from('recruits').select('*').eq('sport_category', sportKey).eq('scouting_year', classYear),
      supabase.from('recruiting_class_rankings').select('*').eq('sport_category', sportKey).eq('scouting_year', classYear).maybeSingle(),
    ]).then(([rRes, rkRes]) => {
      setRecruits((rRes.data as Recruit[]) ?? []);
      setRankings((rkRes.data as ClassRanking) ?? null);
      setLoading(false);
    });
  }, [sportKey, classYear]);

  return (
    <div className="space-y-4">
      <ClassYearTabs year={classYear} onChange={onClassYearChange} />
      <ClassRankingsBanner rankings={rankings} label={sportLabel} />
      <SimpleProspectList recruits={recruits} loading={loading} sportLabel={sportLabel} />
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────────

export default function Recruiting() {
  const [classYear, setClassYear] = useState(CURRENT_YEAR + 1);
  const [tier2Year, setTier2Year] = useState(CURRENT_YEAR + 1);

  // Tier 1: Men's Basketball data
  const [recruits, setRecruits] = useState<Recruit[]>([]);
  const [rankings, setRankings] = useState<ClassRanking | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTier1 = useCallback(async () => {
    setLoading(true);
    const [rRes, rkRes] = await Promise.all([
      supabase.from('recruits').select('*').eq('sport_category', TIER1_SPORT).eq('scouting_year', classYear),
      supabase.from('recruiting_class_rankings').select('*').eq('sport_category', TIER1_SPORT).eq('scouting_year', classYear).maybeSingle(),
    ]);
    setRecruits((rRes.data as Recruit[]) ?? []);
    setRankings((rkRes.data as ClassRanking) ?? null);
    setLoading(false);
  }, [classYear]);

  useEffect(() => {
    fetchTier1();
  }, [fetchTier1]);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ── Men's Basketball (full treatment) ───────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="w-1 h-6 rounded-full bg-vgd-orange" />
        <h2 className="text-sm font-bold text-white/90 uppercase tracking-wider">{TIER1_LABEL} Recruiting</h2>
      </div>

      <ClassYearTabs year={classYear} onChange={setClassYear} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ClassRankingsBanner rankings={rankings} label={TIER1_LABEL} />
        <TeamRankingsComparison rankings={rankings} />
      </div>

      <CommitTracker recruits={recruits} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProspectDatabase recruits={recruits} loading={loading} />
        <PlayerRankings recruits={recruits} loading={loading} />
      </div>

      {/* ── LV Basketball, Baseball, LV Softball (minimal) ────────────────────── */}
      <div className="flex items-center gap-2 pt-2">
        <div className="w-1 h-6 rounded-full bg-vgd-muted" />
        <h2 className="text-sm font-bold text-white/90 uppercase tracking-wider">Other Sports Recruiting</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {TIER2_SPORTS.map((sport) => (
          <Tier2Section
            key={sport.key}
            sportKey={sport.key}
            sportLabel={sport.label}
            classYear={tier2Year}
            onClassYearChange={setTier2Year}
          />
        ))}
      </div>

      {/* ── SHARED FOOTER ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 pt-2">
        <div className="w-1 h-6 rounded-full bg-vgd-orange" />
        <h2 className="text-sm font-bold text-white/90 uppercase tracking-wider">Community</h2>
      </div>

      {/* Recruiting Discussion Board */}
      <DiscussionBoard
        roomCategory="recruiting"
        title="RECRUITING DISCUSSION BOARD"
        qotdSportCategories={['basketball', 'baseball']}
        className="h-[700px]"
      />

      {/* 3×8 Recruiting Video Grid */}
      <VideoGrid
        sportCategory="other-recruiting"
        title="RECRUITING VIDEO HUB — YOUTUBE"
      />

      {/* 3×10 Recruiting News Grid */}
      <VolNewsWire sportCategory="other-recruiting" />

      {/* Three-Window Forum Tray */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <ForumThreadsPanel mode="new" category="other_recruiting" />
        <ForumThreadsPanel mode="popular" category="other_recruiting" />
        <ForumThreadsPanel mode="recruiting" recruitingCategory="other_recruiting" />
      </div>
    </div>
  );
}
