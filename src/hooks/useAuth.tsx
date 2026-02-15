import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

type AppRole = 'owner' | 'employee' | 'client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  isOwner: boolean;
  isEmployee: boolean;
  viewAs: AppRole | null;
  setViewAs: (role: AppRole | null) => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, extras?: { phone?: string; birthday?: string; role?: 'client' | 'employee' }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [viewAs, setViewAsState] = useState<AppRole | null>(null);

  const realIsOwner = roles.includes('owner');

  const setViewAs = (role: AppRole | null) => {
    if (!realIsOwner) return; // only owners can switch view
    setViewAsState(role);
  };

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    if (data) {
      setRoles(data.map(r => r.role as AppRole));
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchRoles(session.user.id);
        } else {
          setRoles([]);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, name: string, extras?: { phone?: string; birthday?: string; role?: 'client' | 'employee' }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          ...(extras?.phone && { phone: extras.phone }),
          ...(extras?.birthday && { birthday: extras.birthday }),
          ...(extras?.role && { role: extras.role }),
        },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      roles,
      isOwner: viewAs ? viewAs === 'owner' : realIsOwner,
      isEmployee: viewAs ? viewAs === 'employee' : roles.includes('employee'),
      viewAs,
      setViewAs,
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
