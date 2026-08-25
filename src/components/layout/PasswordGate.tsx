import { useState, type FormEvent, type ReactNode } from 'react';
import { Lock, AlertCircle } from 'lucide-react';

// Temporary construction wall in front of the whole app while the site is
// being built out — unrelated to real user accounts (see AuthModal/AuthContext).
// Remove this component (and its usage in RootLayout) plus the noindex meta
// tag in index.html once the site is ready for a real public launch.

const STORAGE_KEY = 'vgd_site_unlocked';
const SITE_PASSWORD = import.meta.env.VITE_SITE_PASSWORD as string | undefined;

function isUnlocked(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function PasswordGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (unlocked) return <>{children}</>;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (SITE_PASSWORD && password === SITE_PASSWORD) {
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch {
        // localStorage unavailable — gate will simply re-prompt next load
      }
      setError('');
      setUnlocked(true);
      return;
    }

    setError('Incorrect password. Please try again.');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-vgd-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-vgd-card border border-white/10 rounded-xl shadow-2xl px-8 py-10">
        <div className="w-12 h-12 rounded-full bg-vgd-orange/10 border border-vgd-orange/30 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-5 h-5 text-vgd-orange" />
        </div>
        <h1 className="text-2xl font-bold text-white text-center mb-1">GoVolsGameDay</h1>
        <p className="text-vgd-muted text-sm text-center mb-6">
          This site is under construction. Enter the password to continue.
        </p>

        {error && (
          <div className="flex items-start gap-2.5 mb-4 px-3.5 py-3 bg-vgd-red/10 border border-vgd-red/30 rounded-lg">
            <AlertCircle className="w-4 h-4 text-vgd-red flex-shrink-0 mt-0.5" />
            <p className="text-sm text-vgd-red leading-snug">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="site-password" className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
            Password
          </label>
          <input
            id="site-password"
            type="password"
            required
            autoFocus
            autoComplete="off"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-vgd-bg border border-white/10 text-white placeholder-vgd-muted rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-vgd-orange/60 focus:ring-1 focus:ring-vgd-orange/30 transition-all duration-150"
          />

          <button
            type="submit"
            className="w-full mt-6 py-3 rounded-lg bg-vgd-orange hover:bg-orange-500 text-white font-bold text-sm uppercase tracking-wider transition-colors duration-150 shadow-lg shadow-vgd-orange/20"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
