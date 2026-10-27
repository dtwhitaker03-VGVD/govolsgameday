import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { LiveGame } from './LiveGameStatsPanel';

type Sport = 'football' | 'basketball' | 'womens_basketball';
type CardSport = Sport;

interface Props {
  /** The game each predictor panel is currently showing; its card jumps to that panel. */
  shownGameIds: Partial<Record<Sport, string | null>>;
  /** DOM id of the shared predictor panel. */
  panelId: string;
  /** Switches the panel to this sport before scrolling to it. */
  onPick: (sport: Sport) => void;
}

const SPORT_LABEL: Record<CardSport, string> = { football: 'Football', basketball: "Men's Basketball", womens_basketball: "Women's Basketball" };
// Both basketball teams play home games in the same arena.
const VENUE: Record<CardSport, string> = { football: 'Neyland Stadium', basketball: 'Food City Center', womens_basketball: 'Food City Center' };

const etParts = (iso: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).formatToParts(new Date(iso));

const part = (ps: Intl.DateTimeFormatPart[], t: string) => ps.find((p) => p.type === t)?.value ?? '';

function formatWhen(iso: string) {
  const ps = etParts(iso);
  const date = `${part(ps, 'weekday')}, ${part(ps, 'month')} ${part(ps, 'day')}`;
  // Midnight ET is the "time not announced yet" placeholder.
  const tba = part(ps, 'hour') === '12' && part(ps, 'minute') === '00' && part(ps, 'dayPeriod') === 'AM';
  return { date, time: tba ? 'Time TBA' : `${part(ps, 'hour')}:${part(ps, 'minute')} ${part(ps, 'dayPeriod')} ET` };
}

function daysUntil(iso: string): number {
  const day = (d: Date) =>
    new Date(`${new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d)}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((day(new Date(iso)) - day(new Date())) / 86400000));
}

/** Ticks every second so the card's countdown runs live. */
function useNow(): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const pad = (n: number) => String(n).padStart(2, '0');

function opponentOf(g: { home_team: string; away_team: string }) {
  const home = g.home_team === 'Tennessee';
  return { name: home ? g.away_team : g.home_team, home };
}

const monogram = (name: string) => name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

export function UpcomingGamesStrip({ shownGameIds, panelId, onPick }: Props) {
  const [games, setGames] = useState<Partial<Record<Sport, LiveGame>>>({});

  useEffect(() => {
    supabase
      .from('live_games')
      .select('id, sport, home_team, away_team, kickoff_time, status')
      .eq('status', 'pregame')
      .gte('kickoff_time', new Date(Date.now() - 4 * 3600 * 1000).toISOString())
      .order('kickoff_time', { ascending: true })
      .limit(80)
      .then(({ data }) => {
        const rows = (data as unknown as LiveGame[]) ?? [];
        setGames({
          football: rows.find((g) => g.sport !== 'basketball' && g.sport !== 'womens_basketball'),
          basketball: rows.find((g) => g.sport === 'basketball'),
          womens_basketball: rows.find((g) => g.sport === 'womens_basketball'),
        });
      });
  }, []);

  const jump = (sport: Sport) => {
    onPick(sport);
    document.getElementById(panelId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const sports: Sport[] = ['football', 'basketball', 'womens_basketball'];

  return (
    <section aria-label="Upcoming games" className="space-y-3">
      <h2 className="text-sm font-extrabold tracking-[0.12em] uppercase text-white">Upcoming Games</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sports.map((sport) => {
          const g = games[sport];
          if (!g) return <PlaceholderCard key={sport} label={SPORT_LABEL[sport]} status="No game scheduled" />;
          // Only offer the jump when the panel is showing this very game;
          // otherwise (e.g. last night's game still on the panel) it would
          // scroll to picks for a different game.
          const canPick = shownGameIds[sport] === g.id;
          return (
            <GameCard
              key={sport}
              sport={sport}
              game={g}
              status={canPick ? 'Picks open' : 'Up next'}
              onPick={canPick ? () => jump(sport) : undefined}
            />
          );
        })}
      </div>
    </section>
  );
}

function GameCard({
  sport, game, status, onPick,
}: {
  sport: CardSport;
  game: { kickoff_time: string; home_team: string; away_team: string };
  status: string;
  onPick?: () => void;
}) {
  const { name, home } = opponentOf(game);
  const when = formatWhen(game.kickoff_time);
  const now = useNow();
  // A midnight ET kickoff is the "time not announced" placeholder: count whole
  // calendar days only, since an hours/minutes timer would be counting to nothing.
  const timeKnown = when.time !== 'Time TBA';
  const msLeft = Math.max(0, new Date(game.kickoff_time).getTime() - now);
  const days = timeKnown ? Math.floor(msLeft / 86400000) : daysUntil(game.kickoff_time);
  const rem = Math.floor((msLeft % 86400000) / 1000);
  const clock = `${pad(Math.floor(rem / 3600))}:${pad(Math.floor((rem % 3600) / 60))}:${pad(rem % 60)}`;
  return (
    <div className="bg-vgd-card border border-white/[0.07] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/[0.07]">
        <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-white">{SPORT_LABEL[sport]}</span>
        <span className="text-[10px] font-bold text-vgd-orange">{status}</span>
      </div>
      <div className="p-3.5 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-vgd-orange text-vgd-bg font-black text-xs flex items-center justify-center flex-shrink-0">UT</div>
          <span className="text-[10px] font-extrabold text-white/60">{home ? 'VS' : 'AT'}</span>
          <div className="w-9 h-9 rounded-lg bg-white text-vgd-bg font-black text-[11px] flex items-center justify-center flex-shrink-0">{monogram(name)}</div>
          <div className="text-lg font-extrabold leading-tight min-w-0 truncate text-white">{name}</div>
        </div>
        <div className="text-xs text-white/70 space-y-1">
          <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-vgd-orange" /><span className="font-bold text-white">{when.date}</span></div>
          <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-vgd-orange" />{when.time}</div>
          {home && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-vgd-orange" />{VENUE[sport]}</div>}
        </div>
        <div className="flex items-center justify-between gap-3">
          {/* "11:05:33:22" — days in orange, then hh:mm:ss. With no kickoff time yet it's the day count alone. */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-vgd-orange leading-none tabular-nums">{days}</span>
            {timeKnown ? (
              <span className="text-2xl font-black text-white leading-none tabular-nums">:{clock}</span>
            ) : (
              <span className="text-[10px] font-bold tracking-widest uppercase text-white/60">{days === 1 ? 'day' : 'days'}</span>
            )}
          </div>
          {onPick && (
            <button
              onClick={onPick}
              className="px-3.5 py-2 rounded-lg bg-vgd-orange text-vgd-bg text-xs font-extrabold hover:bg-orange-400 transition-colors"
            >
              Make your picks
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PlaceholderCard({ label, status }: { label: string; status: string }) {
  return (
    <div className="bg-vgd-card border border-white/[0.07] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/[0.07]">
        <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-white">{label}</span>
        <span className="text-[10px] font-bold text-vgd-orange">{status}</span>
      </div>
      <div className="p-3.5 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-vgd-orange text-vgd-bg font-black text-xs flex items-center justify-center flex-shrink-0">UT</div>
        <div className="w-9 h-9 rounded-lg border-2 border-dashed border-white/35 text-white/60 font-black flex items-center justify-center flex-shrink-0">?</div>
        <span className="text-sm text-white/60">Schedule not connected yet</span>
      </div>
    </div>
  );
}
