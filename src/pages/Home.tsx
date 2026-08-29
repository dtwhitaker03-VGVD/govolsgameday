import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DiscussionBoard } from '../components/chat/DiscussionBoard';
import { PreGamePredictions } from '../components/predictions/PreGamePredictions';
import { LiveDrivePrediction } from '../components/predictions/LiveDrivePrediction';
import { GameLeaderboard } from '../components/predictions/GameLeaderboard';
import { VideoGrid } from '../components/video/VideoGrid';
import { VolNewsWire } from '../components/news/VolNewsWire';
import { ForumThreadsPanel } from '../components/forums/ForumThreadsPanel';
import { DailyTrivia } from '../components/trivia/DailyTrivia';
import { DailyPoll } from '../components/polls/DailyPoll';
import { LastGameLeaders, SeasonLeadersFootball, AllSportLeaders } from '../components/leaderboard/SeasonLeaderboards';
import type { LiveGame } from '../components/game/LiveGameStatsPanel';

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

/**
 * Picks the single Tennessee game the predictor column should track — the
 * same "upcoming game" concept the GameDayBanner/UpcomingGameCard uses,
 * not just whatever happens to kick off today. Priority: a game in
 * progress, else the soonest not-yet-started game, else a game that
 * finished today or yesterday (ET), so a Saturday final score — and its
 * pregame-prediction summary — keeps showing through all of Sunday.
 */
function pickActiveGame(games: LiveGame[]): LiveGame | null {
  const live = games.find((g) => g.status === 'live');
  if (live) return live;

  const now = Date.now();
  const upcoming = games
    .filter((g) => g.status === 'pregame' && new Date(g.kickoff_time).getTime() >= now)
    .sort((a, b) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime())[0];
  if (upcoming) return upcoming;

  const finishedRecently = games
    .filter((g) => ['final', 'calculated'].includes(g.status) && daysAgoInET(g.kickoff_time) <= 1)
    .sort((a, b) => new Date(b.kickoff_time).getTime() - new Date(a.kickoff_time).getTime())[0];
  return finishedRecently ?? null;
}

export default function Home() {
  const [liveGame, setLiveGame] = useState<LiveGame | null>(null);
  const [layoutReady, setLayoutReady] = useState(false);
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
        const active = pickActiveGame((data as LiveGame[]) ?? []);
        setLiveGame(active);
        setPastKickoff(active ? new Date(active.kickoff_time).getTime() <= Date.now() : false);
      });
  }, []);

  useEffect(() => {
    fetchActiveGame().then(() => setLayoutReady(true));
  }, [fetchActiveGame]);

  useEffect(() => {
    const channel = supabase
      .channel('home:live_games')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_games' },
        () => { fetchActiveGame(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchActiveGame]);

  // Countdown to kickoff for the predictor swap
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

  // One-off live-game test harness (2026-08-29): actively pulls real CFBD
  // live data into live_games/drive_windows while this page is open, in
  // place of manual admin entry. See supabase/functions/live-cfbd-sync.
  useEffect(() => {
    if (!liveGame) return;
    if (liveGame.status !== 'pregame' && liveGame.status !== 'live') return;
    const poll = () => {
      supabase.functions.invoke('live-cfbd-sync', { body: { game_id: liveGame.id } });
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, [liveGame?.id, liveGame?.status]);

  const isGameday = layoutReady && liveGame !== null;

  // ── Measure right column height so the chat card matches it ──────────────
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const [chatHeight, setChatHeight] = useState<number | null>(null);

  const measureRightColumn = useCallback(() => {
    const el = rightColumnRef.current;
    if (el) setChatHeight(el.offsetHeight);
  }, []);

  useEffect(() => {
    const el = rightColumnRef.current;
    if (!el) return;

    measureRightColumn();

    const observer = new ResizeObserver(() => measureRightColumn());
    observer.observe(el);
    return () => observer.disconnect();
  }, [measureRightColumn, layoutReady, isGameday, pastKickoff]);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ── Layer 3: Discussion Board + Predictor Column ─────────────────────
          The right column ALWAYS shows the predictor pair, regardless of
          gameday state. At kickoff, the top/bottom swap per §9/§12/§13. */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 items-start">
        <DiscussionBoard
          roomCategory="main"
          title="VOL DISCUSSION BOARD"
          qotdSportCategories={['football', 'basketball', 'baseball', 'lady-vols']}
          className={chatHeight ? '' : 'h-[700px]'}
          style={chatHeight ? { height: `${chatHeight}px` } : undefined}
        />

        {!layoutReady ? (
          <div ref={rightColumnRef} className="bg-vgd-card border border-white/[0.07] rounded-lg h-[200px] animate-pulse" />
        ) : (
          <div ref={rightColumnRef} className="flex flex-col gap-4">
            {pastKickoff && liveGame ? (
              <>
                {/* At kickoff: Live Drive Predictor on top, Leaderboard on bottom */}
                <LiveDrivePrediction game={liveGame} />
                <GameLeaderboard game={liveGame} />
              </>
            ) : liveGame ? (
              <>
                {/* Before kickoff: Pregame Predictor on top, Live Drive Predictor dimmed on bottom */}
                <PreGamePredictions game={liveGame} />
                <div className="opacity-40 pointer-events-none">
                  <LiveDrivePrediction game={liveGame} />
                </div>
              </>
            ) : (
              <>
                {/* Non-gameday: both predictors in waiting state */}
                <PreGamePredictions game={null} />
                <div className="opacity-40 pointer-events-none">
                  <LiveDrivePrediction game={null} />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Layer 4: Daily Trivia + Daily Poll (always, side by side) ──────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <DailyTrivia />
        <DailyPoll />
      </div>

      {/* ── Video Grid (§17) — curated cross-sport selection ────────────────── */}
      <VideoGrid sportCategory="main" mainPageMode />

      {/* ── News Wire + Forum Threads ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <VolNewsWire crossSport />
        <ForumThreadsPanel mode="new" />
        <ForumThreadsPanel mode="popular" />
      </div>

      {/* ── Season Leaderboards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <LastGameLeaders />
        <SeasonLeadersFootball />
        <AllSportLeaders />
      </div>
    </div>
  );
}
