import { useState, useEffect, useRef } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { DashboardCard } from '../ui/DashboardCard';

interface DailyPoll {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
  active_date: string;
}

interface OptionInfo {
  letter: 'A' | 'B' | 'C' | 'D';
  text: string;
}

function getOptions(poll: DailyPoll): OptionInfo[] {
  const opts: OptionInfo[] = [
    { letter: 'A', text: poll.option_a },
    { letter: 'B', text: poll.option_b },
  ];
  if (poll.option_c) opts.push({ letter: 'C', text: poll.option_c });
  if (poll.option_d) opts.push({ letter: 'D', text: poll.option_d });
  return opts;
}

function getTodayDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

export function DailyPoll() {
  const { session, openAuthModal } = useAuth();
  const [poll, setPoll] = useState<DailyPoll | null>(null);
  const [loading, setLoading] = useState(true);
  const [userVote, setUserVote] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState('');
  const [percentages, setPercentages] = useState<Record<string, number>>({});
  const [yesterdayLine, setYesterdayLine] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Load today's poll + user's existing vote ─────────────────────────────────
  useEffect(() => {
    const today = getTodayDate();

    supabase
      .from('daily_polls')
      .select('*')
      .eq('active_date', today)
      .maybeSingle()
      .then(({ data: pollData, error }) => {
        if (error) {
          console.error('[DailyPoll] Query error:', error);
        }
        if (pollData) {
          const p = pollData as DailyPoll;
          setPoll(p);
          fetchPercentages(p.id);

          if (session) {
            supabase
              .from('user_poll_responses')
              .select('selected_option')
              .eq('poll_id', p.id)
              .eq('user_id', session.user.id)
              .maybeSingle()
              .then(({ data: voteData }) => {
                if (voteData) {
                  setUserVote((voteData as { selected_option: 'A' | 'B' | 'C' | 'D' }).selected_option);
                }
              });
          }
        } else {
          console.warn('[DailyPoll] No poll found for date:', today);
        }
        setLoading(false);
      });
  }, [session]);

  // ── Fetch vote percentages (server-side aggregate) ───────────────────────────
  async function fetchPercentages(pollId: string) {
    const { data } = await supabase
      .from('user_poll_responses')
      .select('selected_option')
      .eq('poll_id', pollId);

    if (!data || data.length === 0) {
      setPercentages({});
      return;
    }

    const counts: Record<string, number> = {};
    data.forEach((row: { selected_option: string }) => {
      counts[row.selected_option] = (counts[row.selected_option] || 0) + 1;
    });
    const total = data.length;
    const pcts: Record<string, number> = {};
    for (const key of Object.keys(counts)) {
      pcts[key] = Math.round((counts[key] / total) * 100);
    }
    setPercentages(pcts);
  }

  // ── Realtime subscription for live percentage updates ────────────────────────
  useEffect(() => {
    if (!poll) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`poll:${poll.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_poll_responses',
          filter: `poll_id=eq.${poll.id}`,
        },
        () => {
          fetchPercentages(poll.id);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [poll?.id]);

  // ── Fetch yesterday's poll result line ───────────────────────────────────────
  useEffect(() => {
    async function loadYesterday() {
      const yesterday = getYesterdayDate();
      const { data: yPoll } = await supabase
        .from('daily_polls')
        .select('id, question, option_a, option_b, option_c, option_d')
        .eq('active_date', yesterday)
        .maybeSingle();

      if (!yPoll) {
        setYesterdayLine(null);
        return;
      }

      const { data: votes } = await supabase
        .from('user_poll_responses')
        .select('selected_option')
        .eq('poll_id', (yPoll as DailyPoll).id);

      if (!votes || votes.length === 0) {
        setYesterdayLine(null);
        return;
      }

      const counts: Record<string, number> = {};
      votes.forEach((row: { selected_option: string }) => {
        counts[row.selected_option] = (counts[row.selected_option] || 0) + 1;
      });
      const total = votes.length;
      let bestLetter = 'A';
      let bestPct = 0;
      for (const key of Object.keys(counts)) {
        const pct = Math.round((counts[key] / total) * 100);
        if (pct > bestPct) {
          bestPct = pct;
          bestLetter = key;
        }
      }

      const yPollData = yPoll as DailyPoll;
      const optKey = `option_${bestLetter.toLowerCase()}` as keyof DailyPoll;
      const optText = yPollData[optKey] as string;
      setYesterdayLine(`Yesterday: ${bestPct}% said ${optText}`);
    }

    loadYesterday();
  }, []);

  // ── Handle vote ──────────────────────────────────────────────────────────────
  async function handleVote(letter: 'A' | 'B' | 'C' | 'D') {
    if (!session) {
      openAuthModal('register');
      return;
    }
    if (userVote || !poll) return;

    setVoting(true);
    setVoteError('');

    const { error } = await supabase.from('user_poll_responses').insert({
      user_id: session.user.id,
      poll_id: poll.id,
      selected_option: letter,
    });

    setVoting(false);

    if (error) {
      // UNIQUE constraint violation = already voted
      if (error.code === '23505') {
        setUserVote(letter);
      } else {
        setVoteError('Could not submit your vote. Try again.');
      }
      return;
    }

    setUserVote(letter);
    fetchPercentages(poll.id);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardCard title="DAILY POLL" statusDotColor="#FF8200">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-vgd-orange animate-spin" />
        </div>
      </DashboardCard>
    );
  }

  if (!poll) {
    return (
      <DashboardCard title="DAILY POLL" statusDotColor="#FF8200">
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center px-4">
          <BarChart3 className="w-8 h-8 text-vgd-muted/40" />
          <p className="text-xs text-vgd-muted">No poll today. Check back tomorrow!</p>
        </div>
      </DashboardCard>
    );
  }

  const options = getOptions(poll);
  const hasVoted = userVote !== null;

  return (
    <DashboardCard
      title="DAILY POLL"
      statusDotColor="#FF8200"
      metadataTag={
        hasVoted ? (
          <span className="flex items-center gap-1 text-[10px] text-vgd-muted">
            <BarChart3 className="w-3 h-3" />
            VOTED
          </span>
        ) : (
          <span className="text-[10px] text-vgd-orange font-bold uppercase tracking-wider">
            OPEN
          </span>
        )
      }
    >
      <div className="px-4 py-3 space-y-3">
        {/* Question */}
        <p className="text-sm font-medium text-white/90 leading-snug">
          {poll.question}
        </p>

        {/* Option rows */}
        <div className="space-y-1.5">
          {options.map((opt) => {
            const pct = percentages[opt.letter] ?? 0;
            return (
              <div
                key={opt.letter}
                className="relative overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02]"
              >
                {/* Fill bar (only after voted) */}
                {hasVoted && (
                  <div
                    className="absolute inset-y-0 left-0 bg-white/[0.06] transition-all duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                )}
                {/* Content */}
                {hasVoted ? (
                  <div className="relative flex items-center justify-between px-3 py-2.5">
                    <span className="text-xs text-white/80">{opt.text}</span>
                    <span className="text-xs font-bold text-white/60 tabular-nums">{pct}%</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleVote(opt.letter)}
                    disabled={voting}
                    className="relative w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="flex-shrink-0 w-5 h-5 rounded-full border border-white/15 flex items-center justify-center text-[10px] font-bold text-white/50">
                      {opt.letter}
                    </span>
                    <span className="text-xs text-white/80">{opt.text}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Vote error */}
        {voteError && (
          <p className="text-[10px] text-vgd-red text-center">{voteError}</p>
        )}

        {/* Yesterday's result */}
        {yesterdayLine && (
          <p className="text-[10px] text-vgd-muted text-center pt-1">{yesterdayLine}</p>
        )}
      </div>
    </DashboardCard>
  );
}
