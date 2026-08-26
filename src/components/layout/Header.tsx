import { useState, useRef, useCallback, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { ShoppingBag, ChevronDown, Menu, X, LogOut, User, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UserProfile } from '../../context/AuthContext';
import { Avatar } from '../ui/Avatar';

interface DropdownItem {
  label: string;
  to: string;
}

interface NavDropdownProps {
  label: string;
  items: DropdownItem[];
}

function NavDropdown({ label, items }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleMouseEnter = useCallback(() => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className="flex items-center gap-1 text-[13px] font-medium text-vgd-muted hover:text-vgd-orange transition-colors duration-150 py-1 whitespace-nowrap"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {label}
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 py-1 min-w-[190px] bg-[#1a2c47] border border-white/10 rounded-lg shadow-2xl z-50 dropdown-enter">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-4 py-2 text-[13px] transition-colors duration-150 ${
                  isActive
                    ? 'text-vgd-orange font-semibold'
                    : 'text-gray-300 hover:text-vgd-orange hover:bg-white/[0.04]'
                }`
              }
              onClick={() => setOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function UserAvatar({ profile, size = 'sm' }: { profile: UserProfile; size?: 'sm' | 'md' }) {
  return <Avatar url={profile.avatar_url} username={profile.username} size={size} />;
}

function AvatarDropdown({ profile }: { profile: UserProfile }) {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-vgd-orange rounded-full"
        aria-label="Account menu"
        aria-expanded={open}
      >
        <UserAvatar profile={profile} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-[#111827] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden dropdown-enter">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-white/[0.07] flex items-center gap-3">
            <UserAvatar profile={profile} size="md" />
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{profile.username}</p>
              <p className="text-vgd-orange text-xs font-medium">
                {profile.total_points.toLocaleString()} pts
              </p>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              to={`/profile/${profile.username}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-300 hover:text-white hover:bg-white/[0.05] transition-colors duration-150"
            >
              <User className="w-3.5 h-3.5 flex-shrink-0" />
              My Profile
            </Link>

            {profile.is_admin && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-vgd-orange hover:text-orange-300 hover:bg-vgd-orange/[0.08] transition-colors duration-150"
              >
                <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                Admin
              </Link>
            )}

            <div className="my-1 border-t border-white/[0.07]" />

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-400 hover:text-vgd-red hover:bg-vgd-red/[0.06] transition-colors duration-150"
            >
              <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const navItems = [
  { label: 'Basketball', to: '/basketball' },
  { label: 'Baseball', to: '/baseball' },
  { label: 'Forums', to: '/forums' },
  { label: 'About', to: '/about' },
];

const footballDropdown: DropdownItem[] = [
  { label: 'Football', to: '/football' },
  { label: 'Football Recruiting', to: '/football-recruiting' },
];

const ladyVolsDropdown: DropdownItem[] = [
  { label: 'LV Basketball', to: '/lv-basketball' },
  { label: 'LV Softball', to: '/lv-softball' },
];

const recruitingDropdown: DropdownItem[] = [
  { label: 'Football Recruiting', to: '/football-recruiting' },
  { label: 'Other Sports Recruiting', to: '/recruiting' },
];

function VgdLogo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
      <div className="w-7 h-7 rounded bg-vgd-orange flex items-center justify-center flex-shrink-0">
        <span className="text-white font-black text-[9px] leading-none tracking-tight">GVGD</span>
      </div>
      <span className="text-white font-bold text-[15px] tracking-tight hidden sm:block group-hover:text-vgd-orange transition-colors duration-150">
        Go<span className="text-white">Vols</span><span className="text-vgd-orange">GameDay</span>
      </span>
    </Link>
  );
}

export function Header() {
  const { profile, loading, openAuthModal, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-[13px] font-medium whitespace-nowrap transition-colors duration-150 pb-0.5 ${
      isActive
        ? 'text-vgd-orange font-bold border-b-2 border-vgd-orange'
        : 'text-vgd-muted hover:text-vgd-orange'
    }`;

  return (
    <>
      <header className="sticky top-0 left-0 right-0 z-50 bg-vgd-bg/85 backdrop-blur-md border-b border-white/[0.07]">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6">
          <div className="flex items-center gap-5 h-11">
            {/* Logo */}
            <VgdLogo />

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-5 flex-1 min-w-0">
              <NavLink to="/" end className={navLinkClass}>
                Home
              </NavLink>

              <NavDropdown label="Football" items={footballDropdown} />

              {navItems.slice(0, 2).map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                  {item.label}
                </NavLink>
              ))}

              <NavDropdown label="Lady Vols" items={ladyVolsDropdown} />
              <NavDropdown label="Recruiting" items={recruitingDropdown} />

              {navItems.slice(2).map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                  {item.label}
                </NavLink>
              ))}

              {/* Fan Shop */}
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[13px] font-medium text-vgd-muted hover:text-vgd-orange transition-colors duration-150 whitespace-nowrap"
                aria-label="Fan Shop"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Fan Shop
              </a>
            </nav>

            {/* Desktop auth area */}
            <div className="hidden lg:flex items-center gap-2 flex-shrink-0 ml-auto">
              {loading ? (
                // Prevent layout shift while session loads
                <div className="w-7 h-7 rounded-full bg-white/10 animate-pulse" />
              ) : profile ? (
                <AvatarDropdown profile={profile} />
              ) : (
                <>
                  <button
                    onClick={() => openAuthModal('login')}
                    className="px-4 py-1.5 text-[13px] font-semibold text-white border border-white/20 rounded-md hover:border-vgd-orange/60 hover:text-vgd-orange transition-all duration-150"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => openAuthModal('register')}
                    className="px-4 py-1.5 text-[13px] font-bold text-white bg-vgd-orange hover:bg-orange-500 rounded-md transition-colors duration-150 shadow-md shadow-vgd-orange/20"
                  >
                    Become a Member
                  </button>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden ml-auto p-1.5 text-vgd-muted hover:text-white transition-colors duration-150"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed top-0 right-0 bottom-0 z-[70] w-72 bg-[#111827] border-l border-white/10 shadow-2xl drawer-enter lg:hidden flex flex-col">
            <div className="flex items-center justify-between px-5 h-14 border-b border-white/[0.07]">
              <VgdLogo />
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 text-vgd-muted hover:text-white transition-colors duration-150"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 px-5 space-y-1">
              {[
                { label: 'Home', to: '/' },
                { label: 'Football', to: '/football' },
                { label: 'Football Recruiting', to: '/football-recruiting' },
                { label: 'Basketball', to: '/basketball' },
                { label: 'Baseball', to: '/baseball' },
                { label: 'LV Basketball', to: '/lv-basketball' },
                { label: 'LV Softball', to: '/lv-softball' },
                { label: 'Recruiting', to: '/recruiting' },
                { label: 'Forums', to: '/forums' },
                { label: 'About', to: '/about' },
              ].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `block px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 ${
                      isActive
                        ? 'text-vgd-orange bg-vgd-orange/10 font-bold'
                        : 'text-gray-300 hover:text-white hover:bg-white/[0.04]'
                    }`
                  }
                  onClick={() => setDrawerOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}

              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-white/[0.04] transition-colors duration-150"
                onClick={() => setDrawerOpen(false)}
              >
                <ShoppingBag className="w-4 h-4" />
                Fan Shop
              </a>
            </nav>

            {/* Mobile auth footer */}
            <div className="p-5 border-t border-white/[0.07]">
              {profile ? (
                <div className="space-y-2.5">
                  {/* User info */}
                  <div className="flex items-center gap-3 px-1 mb-3">
                    <UserAvatar profile={profile} size="md" />
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{profile.username}</p>
                      <p className="text-vgd-orange text-xs">{profile.total_points.toLocaleString()} pts</p>
                    </div>
                  </div>
                  <Link
                    to={`/profile/${profile.username}`}
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-300 hover:text-white rounded-md hover:bg-white/[0.04] transition-colors duration-150"
                  >
                    <User className="w-4 h-4" /> My Profile
                  </Link>
                  {profile.is_admin && (
                    <Link
                      to="/admin"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-vgd-orange rounded-md hover:bg-vgd-orange/[0.08] transition-colors duration-150"
                    >
                      <Shield className="w-4 h-4" /> Admin
                    </Link>
                  )}
                  <button
                    onClick={() => { setDrawerOpen(false); signOut(); }}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-400 hover:text-vgd-red rounded-md hover:bg-vgd-red/[0.06] transition-colors duration-150"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <button
                    onClick={() => { setDrawerOpen(false); openAuthModal('login'); }}
                    className="w-full py-2.5 text-sm font-semibold text-white border border-white/20 rounded-lg hover:border-vgd-orange/60 hover:text-vgd-orange transition-all duration-150"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => { setDrawerOpen(false); openAuthModal('register'); }}
                    className="w-full py-2.5 text-sm font-bold text-white bg-vgd-orange hover:bg-orange-500 rounded-lg transition-colors duration-150"
                  >
                    Become a Member
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
