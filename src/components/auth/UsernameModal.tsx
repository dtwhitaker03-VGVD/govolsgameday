import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const USERNAME_REGEX = /^[a-zA-Z0-9]+$/;
const DEBOUNCE_MS = 450;

type UniquenessState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export function UsernameModal() {
  const { profile, updateUsername } = useAuth();
  const [username, setUsername] = useState('');
  const [uniqueness, setUniqueness] = useState<UniquenessState>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Only show when the current profile has an auto-generated username
  const show = !!profile && profile.username_is_default;

  useEffect(() => {
    if (!show) return;
    // Prefill with the auto-generated name so the field isn't blank
    setUsername(profile.username);
  }, [show, profile?.username]);

  const checkUniqueness = (value: string) => {
    clearTimeout(debounceRef.current);

    if (!value) {
      setUniqueness('idle');
      return;
    }
    if (!USERNAME_REGEX.test(value) || value.length > 50) {
      setUniqueness('invalid');
      return;
    }

    setUniqueness('checking');
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', value)
        .maybeSingle();

      // If the only match is the current user's own placeholder, treat it as available
      const takenByOther = data && data.id !== profile?.id;
      setUniqueness(takenByOther ? 'taken' : 'available');
    }, DEBOUNCE_MS);
  };

  const handleChange = (val: string) => {
    setUsername(val);
    setSubmitError('');
    checkUniqueness(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!USERNAME_REGEX.test(username)) {
      setSubmitError('Letters and numbers only.');
      return;
    }
    if (username.length < 1) {
      setSubmitError('Username is required.');
      return;
    }
    if (username.length > 50) {
      setSubmitError('Maximum 50 characters.');
      return;
    }
    if (uniqueness === 'taken') {
      setSubmitError('That username is already taken.');
      return;
    }
    if (uniqueness === 'checking') {
      setSubmitError('Still checking availability — please wait a moment.');
      return;
    }

    setSubmitting(true);
    const { error } = await updateUsername(username);
    setSubmitting(false);

    if (error) {
      setSubmitError(error);
    }
    // On success, profile.username_is_default becomes false → modal disappears
  };

  if (!show) return null;

  const inputBorder =
    uniqueness === 'taken' || uniqueness === 'invalid'
      ? 'border-vgd-red/60 focus:border-vgd-red focus:ring-vgd-red/30'
      : uniqueness === 'available'
      ? 'border-green-500/60 focus:border-green-500 focus:ring-green-500/30'
      : 'border-white/10 focus:border-vgd-orange/60 focus:ring-vgd-orange/30';

  const canSubmit =
    !submitting &&
    username.length > 0 &&
    username.length <= 50 &&
    USERNAME_REGEX.test(username) &&
    uniqueness !== 'taken' &&
    uniqueness !== 'checking' &&
    uniqueness !== 'invalid';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop — intentionally not clickable (modal is non-dismissable) */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md bg-vgd-card border border-white/10 rounded-xl shadow-2xl modal-enter">
        <div className="px-8 pt-8 pb-7">
          {/* Header */}
          <div className="flex items-center justify-center mb-1">
            <div className="w-10 h-10 rounded-full bg-vgd-orange/10 border border-vgd-orange/30 flex items-center justify-center mr-3 flex-shrink-0">
              <span className="text-vgd-orange font-black text-sm">VGD</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Choose Your Username</h2>
          </div>
          <p className="text-vgd-muted text-sm text-center mb-6 leading-relaxed">
            Pick the name other Vol fans will see. Letters and numbers only, max 50 characters.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div>
              <label
                htmlFor="choose-username"
                className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider"
              >
                Username
              </label>
              <div className="relative">
                <input
                  id="choose-username"
                  type="text"
                  autoFocus
                  autoComplete="username"
                  maxLength={50}
                  placeholder="VolFan42"
                  value={username}
                  onChange={(e) => handleChange(e.target.value)}
                  disabled={submitting}
                  className={`w-full bg-vgd-bg border text-white placeholder-vgd-muted rounded-lg px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-1 transition-all duration-150 disabled:opacity-50 ${inputBorder}`}
                />
                {/* Live status icon */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {uniqueness === 'checking' && (
                    <Loader2 className="w-4 h-4 text-vgd-muted animate-spin" />
                  )}
                  {uniqueness === 'available' && (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  )}
                  {(uniqueness === 'taken' || uniqueness === 'invalid') && (
                    <XCircle className="w-4 h-4 text-vgd-red" />
                  )}
                </div>
              </div>

              {/* Inline feedback */}
              <div className="mt-1.5 h-4">
                {uniqueness === 'taken' && (
                  <p className="text-xs text-vgd-red">That username is already taken.</p>
                )}
                {uniqueness === 'invalid' && username.length > 0 && (
                  <p className="text-xs text-vgd-red">
                    {username.length > 50
                      ? 'Maximum 50 characters.'
                      : 'Letters and numbers only — no spaces or symbols.'}
                  </p>
                )}
                {uniqueness === 'available' && (
                  <p className="text-xs text-green-400">Available!</p>
                )}
                {uniqueness === 'idle' && (
                  <p className="text-xs text-vgd-muted">Letters and numbers only · max 50 characters</p>
                )}
              </div>
            </div>

            {/* Submit error */}
            {submitError && (
              <p className="mt-3 text-xs text-vgd-red text-center">{submitError}</p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full mt-5 py-3 rounded-lg bg-vgd-orange hover:bg-orange-500 text-white font-bold text-sm uppercase tracking-wider transition-colors duration-150 shadow-lg shadow-vgd-orange/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
