import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Brain, Clock, Check, X, Trophy, Facebook, Twitter,
  MessageSquare, Copy, Sparkles,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { DashboardCard } from '../ui/DashboardCard';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TriviaQuestion {
  id: string;
  slot: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  difficulty: string;
  category: string;
}

type Phase = 'loading' | 'available' | 'playing' | 'submitting' | 'completed' | 'no-trivia';

interface AnswerRecord {
  slot: number;
  selected: string;
  correct: boolean;
}

interface StoredAnswer {
  slot: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  selected: string;
  correct: boolean;
  difficulty: string;
  category: string;
  points: number;
}

interface SubmitResult {
  score: number;
  correct: number;
  total: number;
  already_completed: boolean;
  answers: { questions: StoredAnswer[]; correct: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const QUESTION_TIME = 12;

function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getSecondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#34d399',
  medium: '#f59e0b',
  hard: '#D11919',
};

// ─── Trivia Modal ─────────────────────────────────────────────────────────────

function TriviaModal({
  phase,
  questions,
  currentQ,
  selected,
  locked,
  timeLeft,
  result,
  percentile,
  countdown,
  copied,
  onClose,
  onLockAnswer,
  onShareDiscussion,
  onShareFacebook,
  onShareTwitter,
  onCopy,
}: {
  phase: Phase;
  questions: TriviaQuestion[];
  currentQ: number;
  selected: string | null;
  locked: boolean;
  timeLeft: number;
  result: SubmitResult | null;
  percentile: number | null;
  countdown: number;
  copied: boolean;
  onClose: () => void;
  onLockAnswer: (choice: string) => void;
  onShareDiscussion: () => void;
  onShareFacebook: () => void;
  onShareTwitter: () => void;
  onCopy: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-vgd-card border border-white/[0.1] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07]">
          <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-vgd-orange" />
              <span className="text-sm font-bold text-white/90 uppercase tracking-wide">Daily Vol Trivia</span>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.07] hover:bg-white/[0.15] transition-colors"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 max-h-[75vh] overflow-y-auto">
          {/* ── Playing state ──────────────────────────────────────────────────── */}
          {phase === 'playing' && questions[currentQ] && (
            <div className="flex flex-col gap-4">
              {/* Progress bar */}
              <div className="flex items-center gap-2">
                {questions.map((q, i) => (
                  <div
                    key={q.id}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < currentQ ? 'bg-vgd-orange' : i === currentQ ? 'bg-vgd-orange/60' : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>

              {/* Question number + difficulty */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-vgd-muted uppercase tracking-wider">
                  Q{currentQ + 1} / {questions.length}
                </span>
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: `${DIFFICULTY_COLORS[questions[currentQ].difficulty] ?? '#666'}20`,
                    color: DIFFICULTY_COLORS[questions[currentQ].difficulty] ?? '#666',
                  }}
                >
                  {questions[currentQ].difficulty}
                </span>
              </div>

              {/* Timer */}
              <div className="flex items-center justify-center gap-2">
                <Clock className={`w-4 h-4 ${timeLeft <= 3 ? 'text-vgd-red' : 'text-vgd-orange'} ${timeLeft <= 3 ? 'animate-pulse' : ''}`} />
                <span
                  className={`text-2xl font-black tabular-nums ${timeLeft <= 3 ? 'text-vgd-red' : 'text-vgd-orange'}`}
                >
                  {timeLeft}
                </span>
              </div>

              {/* Question text */}
              <p className="text-sm font-semibold text-white/90 text-center leading-snug px-2">
                {questions[currentQ].question}
              </p>

              {/* Options */}
              <div className="flex flex-col gap-2">
                {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                  const optionText = questions[currentQ][`option_${letter.toLowerCase()}` as keyof TriviaQuestion] as string;
                  const isSelected = selected === letter;
                  const isCorrect = locked && letter === questions[currentQ].correct_answer;
                  const isWrong = locked && isSelected && letter !== questions[currentQ].correct_answer;

                  return (
                    <button
                      key={letter}
                      onClick={() => onLockAnswer(letter)}
                      disabled={locked}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                        isCorrect
                          ? 'bg-green-500/15 border-green-500/50'
                          : isWrong
                          ? 'bg-vgd-red/15 border-vgd-red/50'
                          : isSelected
                          ? 'bg-vgd-orange/15 border-vgd-orange/50'
                          : locked
                          ? 'bg-white/[0.03] border-white/[0.06] opacity-50'
                          : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07] hover:border-white/15'
                      }`}
                    >
                      <span
                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCorrect
                            ? 'bg-green-500 text-white'
                            : isWrong
                            ? 'bg-vgd-red text-white'
                            : isSelected
                            ? 'bg-vgd-orange text-white'
                            : 'bg-white/10 text-white/60'
                        }`}
                      >
                        {isCorrect ? <Check className="w-3.5 h-3.5" /> : isWrong ? <X className="w-3.5 h-3.5" /> : letter}
                      </span>
                      <span className="text-xs text-white/85 flex-1">{optionText}</span>
                    </button>
                  );
                })}
              </div>

              {/* Timeout indicator */}
              {locked && !selected && (
                <p className="text-center text-xs text-vgd-red font-semibold">
                  Time's up! 0 points
                </p>
              )}
            </div>
          )}

          {/* ── Submitting state ──────────────────────────────────────────────── */}
          {phase === 'submitting' && (
            <div className="flex items-center justify-center py-12 gap-3">
              <div className="w-5 h-5 border-2 border-vgd-orange/30 border-t-vgd-orange rounded-full animate-spin" />
              <span className="text-xs text-vgd-muted">Calculating your score…</span>
            </div>
          )}

          {/* ── Completed / Results state ─────────────────────────────────────── */}
          {phase === 'completed' && result && (
            <div className="flex flex-col gap-4">
              {/* Score badge */}
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-vgd-orange/15 flex items-center justify-center">
                    <Trophy className="w-9 h-9 text-vgd-orange" />
                  </div>
                  <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-vgd-orange animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="text-3xl font-black text-vgd-orange tabular-nums">
                    {result.score}
                    <span className="text-lg text-vgd-muted">/100</span>
                  </p>
                  <p className="text-xs text-white/60 mt-0.5">
                    {result.correct}/{result.total} correct
                  </p>
                </div>
              </div>

              {/* Percentile */}
              {percentile !== null && (
                <div className="bg-vgd-orange/10 rounded-lg px-3 py-2 text-center">
                  <p className="text-xs text-white/80">
                    Better than <span className="font-bold text-vgd-orange">{percentile}%</span> of fans today
                  </p>
                </div>
              )}

              {/* Points added animation */}
              {result.score > 0 && !result.already_completed && (
                <div className="text-center">
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-green-400 animate-bounce">
                    +{result.score} points added!
                  </span>
                </div>
              )}

              {/* All questions with answers */}
              {result.answers?.questions && (
                <div className="space-y-2">
                  {result.answers.questions.map((q, i) => (
                    <div key={i} className="bg-white/[0.03] rounded-lg px-3 py-2 border border-white/[0.05]">
                      <div className="flex items-start gap-2">
                        <span
                          className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            q.correct ? 'bg-green-500/20 text-green-400' : 'bg-vgd-red/20 text-vgd-red'
                          }`}
                        >
                          {q.correct ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-white/80 leading-snug">{q.question}</p>
                            <span className={`flex-shrink-0 text-[10px] font-bold ${q.correct ? 'text-green-400' : 'text-vgd-muted'}`}>
                              {q.correct ? `+${q.points ?? 10 + (q.slot - 1) * 5}` : '0'} pts
                            </span>
                          </div>
                          <p className="text-[10px] text-vgd-muted mt-1">
                            Your answer: <span className={q.correct ? 'text-green-400' : 'text-vgd-red'}>
                              {q.selected ? `(${q.selected}) ${q[`option_${q.selected.toLowerCase()}` as keyof StoredAnswer] as string}` : 'No answer'}
                            </span>
                          </p>
                          {!q.correct && (
                            <p className="text-[10px] text-green-400 mt-0.5">
                              Correct: ({q.correct_answer}) {q[`option_${q.correct_answer.toLowerCase()}` as keyof StoredAnswer] as string}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Come back tomorrow + countdown */}
              <div className="bg-white/[0.04] rounded-lg px-3 py-2.5 text-center">
                <p className="text-xs text-white/60 font-semibold">Come back tomorrow!</p>
                <p className="text-lg font-black text-vgd-orange tabular-nums mt-1">
                  {formatCountdown(countdown)}
                </p>
              </div>

              {/* Share buttons */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] text-vgd-muted uppercase tracking-wider text-center">Share your result</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={onShareDiscussion}
                    className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-white/[0.05] hover:bg-vgd-orange/15 border border-white/[0.08] hover:border-vgd-orange/30 text-xs text-white/70 hover:text-vgd-orange transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Discussion</span>
                    <span className="sm:hidden">Post</span>
                  </button>
                  <button
                    onClick={onShareFacebook}
                    className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-white/[0.05] hover:bg-blue-500/15 border border-white/[0.08] hover:border-blue-500/30 text-xs text-white/70 hover:text-blue-400 transition-colors"
                  >
                    <Facebook className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Facebook</span>
                    <span className="sm:hidden">FB</span>
                  </button>
                  <button
                    onClick={onShareTwitter}
                    className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-white/[0.05] hover:bg-sky-500/15 border border-white/[0.08] hover:border-sky-500/30 text-xs text-white/70 hover:text-sky-400 transition-colors"
                  >
                    <Twitter className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">X / Twitter</span>
                    <span className="sm:hidden">X</span>
                  </button>
                  <button
                    onClick={onCopy}
                    className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/[0.08] hover:border-white/20 text-xs text-white/70 hover:text-white transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
                    <span className="sm:hidden">{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DailyTrivia() {
  const { session, openAuthModal } = useAuth();

  const [phase, setPhase] = useState<Phase>('loading');
  const [modalOpen, setModalOpen] = useState(false);
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [percentile, setPercentile] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(getSecondsUntilMidnight());
  const [copied, setCopied] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Check for existing completion + load questions ──────────────────────────
  useEffect(() => {
    if (!session) {
      setPhase('available');
      return;
    }

    const today = getTodayDate();

    supabase
      .from('user_trivia_responses')
      .select('score, answers')
      .eq('user_id', session.user.id)
      .eq('trivia_date', today)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const stored = data as { score: number; answers: { questions: StoredAnswer[]; correct: number } };
          setResult({
            score: data.score,
            correct: stored.answers?.correct ?? 0,
            total: 5,
            already_completed: true,
            answers: stored.answers,
          });
          setPhase('completed');
        } else {
          setPhase('available');
        }
      });
  }, [session]);

  // ── Load today's questions ──────────────────────────────────────────────────
  useEffect(() => {
    const today = getTodayDate();
    supabase
      .from('trivia_questions')
      .select('id, slot, question, option_a, option_b, option_c, option_d, correct_answer, difficulty, category')
      .eq('scheduled_date', today)
      .order('slot', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setQuestions(data as TriviaQuestion[]);
        }
      });
  }, []);

  // ── Midnight countdown (for completed state) + rollover ─────────────────────
  useEffect(() => {
    if (phase !== 'completed') return;
    const interval = setInterval(() => {
      const remaining = getSecondsUntilMidnight();
      setCountdown(remaining);
      if (remaining <= 0) {
        setResult(null);
        setPercentile(null);
        setPhase('available');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // ── Question timer ──────────────────────────────────────────────────────────
  const advanceQuestion = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSelected(null);
    setLocked(false);
    setTimeLeft(QUESTION_TIME);
    setCurrentQ((prev) => prev + 1);
  }, []);

  const submitTrivia = useCallback(async (finalAnswers?: AnswerRecord[]) => {
    if (!session) return;
    setPhase('submitting');

    const today = getTodayDate();
    const answersToSubmit = finalAnswers ?? answers;
    const answersPayload = answersToSubmit.map((a) => ({ slot: a.slot, selected: a.selected }));

    const { data, error } = await supabase.rpc('submit_trivia_answers', {
      p_trivia_date: today,
      p_answers: answersPayload,
    });

    if (error || !data) {
      console.error('Trivia submit failed:', error);
      setPhase('available');
      setModalOpen(false);
      return;
    }

    const res = data as SubmitResult;
    setResult(res);
    setPhase('completed');

    // Fetch percentile
    const { data: pctData } = await supabase.rpc('get_trivia_percentile', {
      p_trivia_date: today,
    });
    if (pctData) {
      setPercentile((pctData as { percentile: number }).percentile);
    }
  }, [session, answers]);

  const lockAnswer = useCallback((choice: string | null) => {
    setLocked(true);
    setSelected(choice);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const q = questions[currentQ];
    if (!q) return;

    const isCorrect = choice !== null && choice === q.correct_answer;
    const newAnswer: AnswerRecord = { slot: q.slot, selected: choice ?? '', correct: isCorrect };
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    // Auto-advance after showing the result for 1.5s
    setTimeout(() => {
      if (currentQ + 1 >= questions.length) {
        submitTrivia(updatedAnswers);
      } else {
        advanceQuestion();
      }
    }, 1500);
  }, [questions, currentQ, answers, advanceQuestion, submitTrivia]);

  // Start timer when a new question is shown
  useEffect(() => {
    if (phase !== 'playing' || locked) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          lockAnswer(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, locked, currentQ, lockAnswer]);

  // ── Start trivia ────────────────────────────────────────────────────────────
  const startTrivia = () => {
    if (!session) {
      openAuthModal('register');
      return;
    }
    if (questions.length === 0) return;
    setCurrentQ(0);
    setAnswers([]);
    setSelected(null);
    setLocked(false);
    setTimeLeft(QUESTION_TIME);
    setPhase('playing');
    setModalOpen(true);
  };

  // ── Reopen modal to review results ──────────────────────────────────────────
  const reviewResults = () => {
    setModalOpen(true);
  };

  // ── Close modal ──────────────────────────────────────────────────────────────
  const closeModal = () => {
    setModalOpen(false);
    // If we were mid-quiz and closed, reset to available
    if (phase === 'playing' || phase === 'submitting') {
      setPhase(result ? 'completed' : 'available');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // ── Share handlers ──────────────────────────────────────────────────────────
  const shareText = result
    ? `I scored ${result.score}/100 on today's VolGameday Trivia! Can you beat me?`
    : '';
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const shareToDiscussion = async () => {
    if (!session) return;
    await supabase.from('chat_messages').insert({
      user_id: session.user.id,
      username: (await supabase.from('profiles').select('username').eq('id', session.user.id).single()).data?.username ?? 'VolFan',
      message_text: `Trivia result: ${result?.score}/100 — ${result?.correct}/${result?.total} correct! Beat me at ${shareUrl}`,
      room_category: 'main',
    });
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`, '_blank');
  };

  const shareToTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  const hasQuestions = questions.length > 0;

  return (
    <>
      <DashboardCard
        title="DAILY VOL TRIVIA"
        statusDotColor="#FF8200"
        metadataTag={
          hasQuestions ? (
            <span className="flex items-center gap-1 text-[10px] text-vgd-muted">
              <Brain className="w-3 h-3" />
              5 QUESTIONS
            </span>
          ) : (
            <span className="text-[10px] text-vgd-muted">STARTS SEPT 1</span>
          )
        }
      >
        <div className="px-4 py-4">
          {/* ── Loading state ─────────────────────────────────────────────────── */}
          {phase === 'loading' && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-vgd-orange/30 border-t-vgd-orange rounded-full animate-spin" />
            </div>
          )}

          {/* ── No trivia available ────────────────────────────────────────────── */}
          {phase === 'no-trivia' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <Brain className="w-10 h-10 text-vgd-muted/40" />
              <div>
                <p className="text-sm font-semibold text-white/50">No trivia today</p>
                <p className="text-xs text-vgd-muted mt-1">Trivia starts September 1. Come back then!</p>
              </div>
            </div>
          )}

          {/* ── Available state (compact card) ─────────────────────────────────── */}
          {phase === 'available' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 rounded-full bg-vgd-orange/15 flex items-center justify-center">
                <Brain className="w-7 h-7 text-vgd-orange" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white/90">
                  {hasQuestions ? "Today's Trivia is Ready!" : 'Trivia Starts September 1'}
                </p>
                <p className="text-xs text-vgd-muted mt-1.5 max-w-xs">
                  {hasQuestions
                    ? '5 questions, 12 seconds each. Max 100 points. Think you know the Vols?'
                    : '5 Vol-themed questions every day. Max 100 points toward your total.'}
                </p>
              </div>
              <button
                onClick={startTrivia}
                disabled={!hasQuestions}
                className="px-6 py-2.5 rounded-lg bg-vgd-orange hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors flex items-center gap-2"
              >
                <Brain className="w-4 h-4" />
                Take Today's Trivia
              </button>
              {!session && hasQuestions && (
                <p className="text-[10px] text-vgd-muted">Sign in to play and earn points</p>
              )}
            </div>
          )}

          {/* ── Completed state (compact card on page) ─────────────────────────── */}
          {phase === 'completed' && result && (
            <button
              onClick={reviewResults}
              className="w-full flex flex-col items-center gap-3 py-4 text-left group"
            >
              <div className="w-14 h-14 rounded-full bg-vgd-orange/15 flex items-center justify-center group-hover:bg-vgd-orange/25 transition-colors">
                <Trophy className="w-7 h-7 text-vgd-orange" />
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-vgd-orange tabular-nums">
                  {result.score}<span className="text-base text-vgd-muted">/100</span>
                </p>
                <p className="text-xs text-white/60 mt-1">
                  {result.correct}/{result.total} correct — Come back tomorrow!
                </p>
              </div>
              <div className="bg-white/[0.04] rounded-lg px-3 py-2 text-center">
                <p className="text-[10px] text-vgd-muted uppercase tracking-wider">Next trivia in</p>
                <p className="text-base font-black text-vgd-orange tabular-nums mt-0.5">
                  {formatCountdown(countdown)}
                </p>
              </div>
              <p className="text-[10px] text-vgd-muted group-hover:text-vgd-orange/70 transition-colors">
                Click to review your answers
              </p>
            </button>
          )}
        </div>
      </DashboardCard>

      {/* ── Modal ──────────────────────────────────────────────────────────────── */}
      {modalOpen && (phase === 'playing' || phase === 'submitting' || phase === 'completed') && (
        <TriviaModal
          phase={phase}
          questions={questions}
          currentQ={currentQ}
          selected={selected}
          locked={locked}
          timeLeft={timeLeft}
          result={result}
          percentile={percentile}
          countdown={countdown}
          copied={copied}
          onClose={closeModal}
          onLockAnswer={lockAnswer}
          onShareDiscussion={shareToDiscussion}
          onShareFacebook={shareToFacebook}
          onShareTwitter={shareToTwitter}
          onCopy={copyToClipboard}
        />
      )}
    </>
  );
}
