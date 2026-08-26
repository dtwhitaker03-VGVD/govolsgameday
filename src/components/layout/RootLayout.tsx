import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { Header } from './Header';
import { GameDayBanner } from './GameDayBanner';
import { Footer } from './Footer';
import { AuthModal } from '../auth/AuthModal';
import { UsernameModal } from '../auth/UsernameModal';

// Prevent the browser's native scroll restoration from fighting our reset
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

export function RootLayout() {
  const { pathname } = useLocation();
  const scrollResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToTop = () => {
    window.scrollTo(0, 0);
  };

  // useLayoutEffect fires synchronously after DOM mutations but before paint
  useLayoutEffect(() => {
    scrollToTop();
  }, [pathname]);

  // Second pass after paint catches initial layout shifts
  useEffect(() => {
    const raf = requestAnimationFrame(scrollToTop);
    // Third pass after a short delay catches hero banner image load
    scrollResetTimer.current = setTimeout(scrollToTop, 300);
    return () => {
      cancelAnimationFrame(raf);
      if (scrollResetTimer.current) clearTimeout(scrollResetTimer.current);
    };
  }, [pathname]);

  return (
    <div className="min-h-screen bg-vgd-bg flex flex-col">
      {/* Site-wide banner + game row sits above the sticky header/nav */}
      <GameDayBanner />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <AuthModal />
      {/* Shown immediately after Google OAuth when the user still has a default username */}
      <UsernameModal />
    </div>
  );
}
