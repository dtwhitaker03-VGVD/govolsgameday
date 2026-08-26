import { DiscussionBoard } from '../chat/DiscussionBoard';
import { VideoGrid } from '../video/VideoGrid';
import { VolNewsWire } from '../news/VolNewsWire';
import { ForumThreadsPanel } from '../forums/ForumThreadsPanel';

interface SportPageConfig {
  /** Supabase room_category for chat (e.g. 'basketball') */
  roomCategory: string;
  /** Title shown in the Discussion Board header */
  boardTitle: string;
  /** sport_category used for Video Grid and News Wire queries */
  sportCategory: string;
  /** Title shown in the Video Grid card header */
  videoTitle: string;
  /** forum_threads category for New/Popular panels (e.g. 'basketball') */
  forumCategory: string;
  /** forum_threads category for the Recruiting panel (e.g. 'basketball_recruiting') */
  recruitingCategory: string;
  /** QotD sport categories to query */
  qotdCategories: string[];
}

interface SportPageProps {
  config: SportPageConfig;
}

export function SportPage({ config }: SportPageProps) {
  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ── Discussion Board ──────────────────────────────────────────────────── */}
      <DiscussionBoard
        roomCategory={config.roomCategory}
        title={config.boardTitle}
        qotdSportCategories={config.qotdCategories}
        className="h-[700px]"
      />

      {/* ── 3×10 Video Grid ───────────────────────────────────────────────────── */}
      <VideoGrid
        sportCategory={config.sportCategory}
        title={config.videoTitle}
      />

      {/* ── News Wire ─────────────────────────────────────────────────────────── */}
      <VolNewsWire sportCategory={config.sportCategory} />

      {/* ── Three-Window Forum Tray ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <ForumThreadsPanel mode="new" category={config.forumCategory} />
        <ForumThreadsPanel mode="popular" category={config.forumCategory} />
        <ForumThreadsPanel
          mode="recruiting"
          recruitingCategory={config.recruitingCategory}
        />
      </div>
    </div>
  );
}
