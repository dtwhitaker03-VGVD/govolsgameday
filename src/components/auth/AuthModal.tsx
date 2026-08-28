import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

const USERNAME_REGEX = /^[a-zA-Z0-9]+$/;

function friendlyError(message: string, isRegister: boolean): string {
  if (message.includes('Invalid login credentials') || message.includes('invalid_credentials')) {
    return 'Incorrect email or password.';
  }
  if (message.includes('User already registered') || message.includes('already registered')) {
    return 'An account with this email already exists. Try signing in.';
  }
  if (message.includes('profiles_username_key') || message.includes('duplicate key') && message.includes('username')) {
    return 'That username is already taken. Please choose another.';
  }
  if (message.includes('username_alphanumeric')) {
    return 'Username must contain only letters and numbers.';
  }
  if (message.includes('Email rate limit exceeded') || message.includes('email rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (isRegister && message.includes('password')) {
    return 'Password must be at least 8 characters.';
  }
  return 'Something went wrong. Please try again.';
}

export function AuthModal() {
  const { isAuthModalOpen, authMode, closeAuthModal } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>(authMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailConfirmPending, setEmailConfirmPending] = useState(false);

  // Sync mode and reset form when the modal opens with a different mode
  useEffect(() => {
    setMode(authMode);
    setEmail('');
    setPassword('');
    setUsername('');
    setError('');
    setUsernameError('');
    setEmailConfirmPending(false);
  }, [authMode, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleUsernameChange = (val: string) => {
    setUsername(val);
    if (val && !USERNAME_REGEX.test(val)) {
      setUsernameError('Alphanumeric characters only');
    } else if (val.length > 50) {
      setUsernameError('Maximum 50 characters');
    } else {
      setUsernameError('');
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    // Page will redirect — no further action needed here
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (mode === 'register') {
      if (!username.trim()) {
        setError('Username is required.');
        return;
      }
      if (!USERNAME_REGEX.test(username)) {
        setError('Username must contain only letters and numbers.');
        return;
      }
      if (username.length > 50) {
        setError('Username must be 50 characters or fewer.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { username: username.trim() } },
        });

        if (error) {
          setError(friendlyError(error.message, true));
          return;
        }

        if (data.session) {
          // No email confirmation required — session is live, close modal
          closeAuthModal();
        } else {
          // Email confirmation is enabled — prompt user to check inbox
          setEmailConfirmPending(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setError(friendlyError(error.message, false));
          return;
        }

        closeAuthModal();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Email confirmation pending state
  if (emailConfirmPending) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={closeAuthModal}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div
          className="relative z-10 w-full max-w-md bg-vgd-card border border-white/10 rounded-xl shadow-2xl modal-enter px-8 py-10 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 p-1 text-vgd-muted hover:text-white transition-colors duration-150"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-full bg-vgd-orange/10 border border-vgd-orange/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✉️</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
          <p className="text-vgd-muted text-sm leading-relaxed">
            We sent a confirmation link to <span className="text-white font-medium">{email}</span>.
            Click the link to activate your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={closeAuthModal}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-md bg-vgd-card border border-white/10 rounded-xl shadow-2xl modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-1 text-vgd-muted hover:text-white transition-colors duration-150"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-8 pt-8 pb-7">
          {/* Title */}
          <h2 className="text-2xl font-bold text-white text-center mb-1">
            Join GVGD
          </h2>
          <p className="text-vgd-muted text-sm text-center mb-6">
            {mode === 'register'
              ? 'Create your free account to get started'
              : 'Welcome back — sign in to your account'}
          </p>

          {/* Google SSO */}
          <button
            type="button"
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-gray-50 text-gray-800 font-medium text-sm rounded-lg transition-colors duration-150 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleGoogleSignIn}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-vgd-muted text-xs uppercase tracking-wider">or use credentials</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2.5 mb-4 px-3.5 py-3 bg-vgd-red/10 border border-vgd-red/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-vgd-red flex-shrink-0 mt-0.5" />
              <p className="text-sm text-vgd-red leading-snug">{error}</p>
            </div>
          )}

          {/* Fields */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">
              <div>
                <label htmlFor="auth-email" className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full bg-vgd-bg border border-white/10 text-white placeholder-vgd-muted rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-vgd-orange/60 focus:ring-1 focus:ring-vgd-orange/30 transition-all duration-150 disabled:opacity-50"
                />
              </div>

              {mode === 'register' && (
                <div>
                  <label htmlFor="auth-username" className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
                    Username
                  </label>
                  <input
                    id="auth-username"
                    type="text"
                    required
                    maxLength={50}
                    autoComplete="username"
                    placeholder="VolFan42"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    disabled={loading}
                    className={`w-full bg-vgd-bg border text-white placeholder-vgd-muted rounded-lg px-3.5 py-2.5 text-sm focus:outline-none transition-all duration-150 disabled:opacity-50 ${
                      usernameError
                        ? 'border-vgd-red/60 focus:border-vgd-red focus:ring-1 focus:ring-vgd-red/30'
                        : 'border-white/10 focus:border-vgd-orange/60 focus:ring-1 focus:ring-vgd-orange/30'
                    }`}
                  />
                  {usernameError ? (
                    <p className="mt-1 text-xs text-vgd-red">{usernameError}</p>
                  ) : (
                    <p className="mt-1 text-xs text-vgd-muted">Letters and numbers only · max 50 characters</p>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="auth-password" className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    placeholder={mode === 'register' ? 'Min 8 characters' : '••••••••'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full bg-vgd-bg border border-white/10 text-white placeholder-vgd-muted rounded-lg px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:border-vgd-orange/60 focus:ring-1 focus:ring-vgd-orange/30 transition-all duration-150 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-vgd-muted hover:text-white transition-colors duration-150"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !!usernameError}
              className="w-full mt-6 py-3 rounded-lg bg-vgd-orange hover:bg-orange-500 text-white font-bold text-sm uppercase tracking-wider transition-colors duration-150 shadow-lg shadow-vgd-orange/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'register' ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Toggle */}
          <p className="mt-4 text-center text-sm text-vgd-muted">
            {mode === 'register' ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); }}
                  className="text-vgd-orange hover:text-orange-400 font-semibold transition-colors duration-150"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(''); }}
                  className="text-vgd-orange hover:text-orange-400 font-semibold transition-colors duration-150"
                >
                  Register
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
