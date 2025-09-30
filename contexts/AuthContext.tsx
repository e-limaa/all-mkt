import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import { toast } from 'sonner';

type User = Database['public']['Tables']['users']['Row'];

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const isConfigured = isSupabaseConfigured();

  const clearAuthState = () => {
    setUser(null);
    setSupabaseUser(null);
    setSession(null);
  };

  const purgeStoredSession = () => {
    if (typeof window === 'undefined') return;
    try {
      const storageKey = (supabase as any)?.auth?.storageKey as string | undefined;
      if (storageKey) {
        window.localStorage.removeItem(storageKey);
        window.localStorage.removeItem(`${storageKey}-global`);
      }
    } catch (error) {
      console.warn('[Auth] Não foi possível limpar a sessão armazenada localmente.', error);
    }
  };

  useEffect(() => {
    if (!isConfigured) {
      console.error('[Auth] Supabase não configurado. Verifique suas variáveis de ambiente.');
      setLoading(false);
      return;
    }

    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);

      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        clearAuthState();
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [isConfigured]);

  const fetchUserProfile = async (userId: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      setUser(data);
    } catch (error) {
      console.error('[Auth] Erro ao buscar perfil do usuário:', error);
      toast.error('Erro ao carregar perfil do usuário');
    } finally {
      setLoading(false);
    }
  };

  const ensureConfigured = () => {
    if (!isConfigured || !supabase) {
      const message = 'Supabase não está configurado. Configure as variáveis de ambiente.';
      toast.error(message);
      throw new Error(message);
    }
  };

  const signIn = async (email: string, password: string) => {
    ensureConfigured();

    try {
      setLoading(true);
      const { error } = await supabase!.auth.signInWithPassword({ email, password });

      if (error) throw error;
      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      const message = error.message === 'Invalid login credentials'
        ? 'Email ou senha inválidos'
        : error.message;
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    ensureConfigured();

    try {
      setLoading(true);
      const { error } = await supabase!.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (error) throw error;
      toast.success('Conta criada com sucesso! Verifique seu email.');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    ensureConfigured();

    setLoading(true);
    try {
      const { error } = await supabase!.auth.signOut({ scope: 'global' });
      if (error) throw error;
      toast.success('Logout realizado com sucesso!');
    } catch (error: any) {
      console.error('[Auth] Falha ao realizar logout', error);
      toast.error(error?.message ?? 'Não foi possível finalizar a sessão.');
    } finally {
      purgeStoredSession();
      clearAuthState();
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    ensureConfigured();

    if (!user) throw new Error('Usuário não encontrado');

    const { error } = await supabase!
      .from('users')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      toast.error(error.message);
      throw error;
    }

    setUser({ ...user, ...updates });
    toast.success('Perfil atualizado com sucesso!');
  };

  const resetPassword = async (email: string) => {
    ensureConfigured();

    const { error } = await supabase!.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message);
      throw error;
    }

    toast.success('Email de recuperação enviado!');
  };

  const value = {
    user,
    supabaseUser,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
