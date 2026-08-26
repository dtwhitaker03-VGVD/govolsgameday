import { MessageSquare, Trophy, Newspaper, Search, Mail } from 'lucide-react';
import { DashboardCard } from '../components/ui/DashboardCard';

const FEATURES = [
  {
    icon: MessageSquare,
    title: 'Live Discussion',
    description: 'A real-time chat that moves as fast as the game — no more refreshing a forum thread hoping someone replies before the next play snaps.',
  },
  {
    icon: Trophy,
    title: 'Predictions & Trivia',
    description: 'Pick winners and final scores before kickoff, call every drive as it happens, and test your Vols knowledge with daily trivia — all for real points and bragging rights.',
  },
  {
    icon: Newspaper,
    title: 'Video & News',
    description: 'Highlights, breaking news, and community threads for football, basketball, baseball, and Lady Vols — gathered in one place instead of a dozen different sites.',
  },
  {
    icon: Search,
    title: 'Recruiting Tracker',
    description: 'Follow commits, transfers, and roster moves across every program without digging through scattered rumor threads.',
  },
];

export default function About() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-4">
      {/* Hero */}
      <div className="text-center mb-2">
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          About <span className="text-vgd-orange">GoVolsGameDay</span>
        </h1>
        <p className="text-sm text-vgd-muted mt-2 max-w-xl mx-auto">
          If you can't be there, be here.
        </p>
      </div>

      {/* Mission */}
      <DashboardCard title="OUR MISSION">
        <div className="p-5">
          <p className="text-sm text-white/80 leading-relaxed">
            GoVolsGameDay exists to make watching a Vols game with other fans feel like you're
            actually sitting together — even when you're scattered across a hundred different
            couches. We built one place for live reaction, real predictions, and everything else
            being a Tennessee fan means, so you never have to choose between following the game
            and following the conversation around it.
          </p>
        </div>
      </DashboardCard>

      {/* Story */}
      <DashboardCard title="OUR STORY">
        <div className="p-5 flex flex-col gap-3">
          <p className="text-sm text-white/80 leading-relaxed">
            It started with a familiar problem: watching a Vols game with other fans online used
            to mean juggling five different threads, typing out what just happened, and hoping
            someone replied before the next snap. There wasn't one place built specifically for
            Tennessee fans to watch, react, and compete together in real time.
          </p>
          <p className="text-sm text-white/80 leading-relaxed">
            So we built GoVolsGameDay — a live chat that keeps up with the action, a
            drive-by-drive prediction game that turns every play into something worth paying
            attention to, and automatic scores and stats so nobody's stuck relaying updates by
            hand. Turn on the game, pull up the site, and experience it together, exactly as it
            happens.
          </p>
          <p className="text-sm text-white/80 leading-relaxed">
            It's also grown into a home base for everything else Vol fans care about — recruiting,
            news, and community across football, basketball, baseball, and Lady Vols — all in one
            place, built by fans, for fans.
          </p>
        </div>
      </DashboardCard>

      {/* What we offer */}
      <DashboardCard title="WHAT WE OFFER">
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-3">
              <div className="w-9 h-9 rounded-lg bg-vgd-orange/10 border border-vgd-orange/20 flex items-center justify-center flex-shrink-0">
                <f.icon className="w-4 h-4 text-vgd-orange" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{f.title}</p>
                <p className="text-xs text-vgd-muted leading-relaxed mt-0.5">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* Contact */}
      <DashboardCard title="GET IN TOUCH">
        <div className="p-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
            <Mail className="w-4 h-4 text-vgd-muted" />
          </div>
          <p className="text-sm text-vgd-muted">
            A contact form is coming soon. In the meantime, keep an eye on the{' '}
            <span className="text-white/70">Discussion Board</span> — we're in there too.
          </p>
        </div>
      </DashboardCard>
    </div>
  );
}
