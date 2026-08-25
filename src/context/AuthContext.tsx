import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthMode = 'login' | 'register';

export interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  total_points: number;
  is_admin: boolean;
  is_banned: boolean;
  username_is_default: boolean;
}

interface AuthContextValue {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  authMode: AuthMode;
  openAuthModal: (mode?: AuthMode) => void;
  closeAuthModal: () => void;
  signOut: () => Promise<void>;
  updateUsername: (newUsername: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, total_points, is_admin, is_banned, username_is_default')
    .eq('id', userId)
    .maybeSingle();
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('register');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id).then((p) => {
          setProfile(p);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      (async () => {
        if (session?.user) {
          const p = await fetchProfile(session.user.id);
          setProfile(p);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const openAuthModal = useCallback((mode: AuthMode = 'register') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const updateUsername = useCallback(
    async (newUsername: string): Promise<{ error: string | null }> => {
      if (!session?.user) return { error: 'Not signed in.' };

      const { error } = await supabase
        .from('profiles')
        .update({ username: newUsername, username_is_default: false })
        .eq('id', session.user.id);

      if (error) {
        if (error.message.includes('profiles_username_key') || error.message.includes('duplicate key')) {
          return { error: 'That username is already taken.' };
        }
        if (error.message.includes('username_alphanumeric')) {
          return { error: 'Username must contain only letters and numbers.' };
        }
        return { error: 'Something went wrong. Please try again.' };
      }

      // Reflect the change locally without a round-trip fetch
      setProfile((prev) =>
        prev ? { ...prev, username: newUsername, username_is_default: false } : prev
      );
      return { error: null };
    },
    [session]
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        isAuthModalOpen,
        authMode,
        openAuthModal,
        closeAuthModal,
        signOut,
        updateUsername,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
