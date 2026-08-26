import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { UpcomingGameCard } from '../game/UpcomingGameCard';
import { LiveGameStatsPanel, type LiveGame } from '../game/LiveGameStatsPanel';

function isTodayInET(dateStr: string): boolean {
  const kickoffDate = new Date(dateStr).toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
  });
  const today = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
  });
  return kickoffDate === today;
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

  // Fetch today's active Tennessee Football game (pregame or live today)
  useEffect(() => {
    let cancelled = false;

    supabase
      .from('live_games')
      .select(
        'id, cfbd_game_id, home_team, away_team, kickoff_time, status, home_score, away_score, ' +
        'home_total_yards, away_total_yards, current_quarter, game_clock, possession, ' +
        'down, distance, yardline'
      )
      .in('status', ['pregame', 'live', 'final'])
      .order('kickoff_time', { ascending: true })
      .limit(20)
      .then(({ data }) => {
        if (cancelled) return;

        if (data && data.length > 0) {
          // Find a Tennessee game whose kickoff is today in ET
          const tnGameToday = (data as LiveGame[]).find(
            (g) =>
              (g.home_team === 'Tennessee' || g.away_team === 'Tennessee') &&
              isTodayInET(g.kickoff_time)
          );
          if (tnGameToday) {
            setLiveGame(tnGameToday);
            setPastKickoff(new Date(tnGameToday.kickoff_time).getTime() <= Date.now());
          }
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // Subscribe to realtime updates for the active game
  useEffect(() => {
    if (!liveGame) return;

    const channel = supabase
      .channel(`gameday-banner:${liveGame.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_games',
          filter: `id=eq.${liveGame.id}`,
        },
        (payload) => {
          const updated = payload.new as LiveGame;
          setLiveGame(updated);
          setPastKickoff(new Date(updated.kickoff_time).getTime() <= Date.now());
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [liveGame?.id]);

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
              alt="VolGameday — Tennessee Volunteers fan platform"
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
