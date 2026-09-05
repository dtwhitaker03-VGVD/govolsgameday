import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { UpcomingGameCard } from '../game/UpcomingGameCard';
import { LiveGameStatsPanel, type LiveGame } from '../game/LiveGameStatsPanel';

// Calendar-day difference in America/New_York, not raw elapsed hours — a
// Saturday night game should still count as "recent" through all of the
// following Sunday regardless of what time it kicked off.
function daysAgoInET(dateStr: string): number {
  const dateOnly = (d: Date) =>
    new Date(
      `${new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d)}T00:00:00Z`
    ).getTime();
  return Math.round((dateOnly(new Date()) - dateOnly(new Date(dateStr))) / 86400000);
}

// How long a 'pregame' game still counts as "current" after its own kickoff
// time passes — covers the real gap between actual kickoff and live-cfbd-sync
// detecting the game as live via CFBD (which only starts polling every 15s in
// the hour before kickoff, and needs CFBD's /live/plays feed to actually
// report data). Without this, a game sitting in 'pregame' for even a couple
// minutes past its own kickoff drops out of the "upcoming" filter (kickoff no
// longer >= now) while not yet qualifying as 'live' either, so the picker
// falls through to the NEXT scheduled game — the banner appears to skip the
// game that's actually about to start. Long enough to cover a full game plus
// startup delay margin; a game still stuck in 'pregame' after that is a
// system_health issue, not something to keep showing as "current" forever.
const KICKOFF_PASSED_GRACE_MS = 4 * 60 * 60 * 1000;

/**
 * Picks the game the banner should show: live first, else the soonest
 * upcoming game, else a game that finished today or yesterday (ET) — so a
 * Saturday final score keeps showing through all of Sunday, not just the
 * day of the game.
 */
function pickBannerGame(games: LiveGame[]): LiveGame | null {
  const live = games.find((g) => g.status === 'live');
  if (live) return live;

  const now = Date.now();
  const upcoming = games
    .filter((g) => {
      if (g.status !== 'pregame') return false;
      const kickoffMs = new Date(g.kickoff_time).getTime();
      return kickoffMs >= now || now - kickoffMs <= KICKOFF_PASSED_GRACE_MS;
    })
    .sort((a, b) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime())[0];
  if (upcoming) return upcoming;

  const finishedRecently = games
    .filter((g) => ['final', 'calculated'].includes(g.status) && daysAgoInET(g.kickoff_time) <= 1)
    .sort((a, b) => new Date(b.kickoff_time).getTime() - new Date(a.kickoff_time).getTime())[0];
  return finishedRecently ?? null;
}

/**
 * Site-wide two-column row that sits above the header on every page.
 * Left: hero banner image. Right: Upcoming Game Card (pre-kickoff) or
 * Live Game Stats Panel (from kickoff onward). Always shows Tennessee
 * Football regardless of which page the user is on.
 *
 * The card swap fires at the exact scheduled kickoff_time — not based
 * on CFBD's detected live status, which can lag by several minutes.
 */
export function GameDayBanner() {
  const [liveGame, setLiveGame] = useState<LiveGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [pastKickoff, setPastKickoff] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchActiveGame = useCallback(() => {
    return supabase
      .from('live_games')
      .select(
        'id, cfbd_game_id, home_team, away_team, kickoff_time, status, home_score, away_score, ' +
        'home_total_yards, away_total_yards, current_quarter, game_clock, possession, ' +
        'down, distance, yardline'
      )
      .in('status', ['pregame', 'live', 'final', 'calculated'])
      .order('kickoff_time', { ascending: true })
      .limit(20)
      .then(({ data }) => {
        const picked = pickBannerGame((data as LiveGame[]) ?? []);
        setLiveGame(picked);
        setPastKickoff(picked ? new Date(picked.kickoff_time).getTime() <= Date.now() : false);
      });
  }, []);

  // Fetch the active Tennessee Football game for the banner
  useEffect(() => {
    fetchActiveGame().then(() => setLoading(false));
  }, [fetchActiveGame]);

  // Subscribe to any live_games change — not just the currently-shown row,
  // since game-sync's weekly runs create a brand-new row for the next game
  // rather than updating the old one.
  useEffect(() => {
    const channel = supabase
      .channel('gameday-banner:live_games')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_games' },
        () => { fetchActiveGame(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchActiveGame]);

  // Countdown timer to check if we've crossed kickoff
  useEffect(() => {
    if (!liveGame || pastKickoff) return;

    const check = () => {
      if (new Date(liveGame.kickoff_time).getTime() <= Date.now()) {
        setPastKickoff(true);
        if (tickRef.current) {
          clearInterval(tickRef.current);
          tickRef.current = null;
        }
      }
    };

    check();
    tickRef.current = setInterval(check, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [liveGame?.kickoff_time, pastKickoff]);

  return (
    <div className="w-full bg-vgd-bg">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-3 lg:gap-3 items-stretch">
          {/* Left: Banner image — column fills full 50%, image centered within */}
          <div className="flex items-center justify-center min-h-0 w-full">
            <img
              src="/GoVolsGameDayBanner2100x1000.png"
              alt="GoVolsGameDay — Tennessee Volunteers fan platform"
              className="w-full max-h-[220px] lg:max-h-[320px] object-contain"
              draggable={false}
            />
          </div>

          {/* Right: Game card — fills full 50% of the row */}
          <div className="w-full flex">
            {loading ? (
              <div className="w-full bg-vgd-card border border-white/[0.07] rounded-lg h-[220px] lg:h-[320px] animate-pulse" />
            ) : pastKickoff && liveGame ? (
              <LiveGameStatsPanel initialGame={liveGame} />
            ) : (
              <UpcomingGameCard />
            )}
          </div>
        </div>
      </div>
      {/* Blend bottom edge into page background */}
      <div className="h-4 bg-gradient-to-t from-vgd-bg to-transparent pointer-events-none" />
    </div>
  );
}
