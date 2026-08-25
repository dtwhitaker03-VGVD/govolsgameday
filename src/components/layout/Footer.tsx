import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="w-full border-t border-white/[0.06] mt-16">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-5">
        <p className="text-[11px] text-vgd-muted leading-relaxed text-center max-w-4xl mx-auto">
          <em>
            GoVolsGameDay is an independent, fan-driven digital community and is not endorsed by,
            sponsored by, directly managed by, or affiliated with the University of Tennessee or
            UT Athletics. All trademarks and logos displayed within the automated video and news
            grids belong to their respective intellectual property owners.
          </em>
        </p>
        <div className="mt-3 text-center">
          <Link
            to="/code-of-conduct"
            className="text-[11px] text-vgd-muted hover:text-vgd-orange transition-colors duration-150 underline underline-offset-2"
          >
            Code of Conduct
          </Link>
        </div>
      </div>
    </footer>
  );
}
