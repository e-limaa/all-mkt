import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import { toast } from 'sonner';

type User = Database['public']['Tables']['users']['Row'];

interface UpdateProfileOptions {
  name?: string;
  email?: string;
  newPassword?: string;
  avatarFile?: File | null;
  removeAvatar?: boolean;
}

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (options: UpdateProfileOptions) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const buildFallbackUser = (sessionUser: SupabaseUser): User => ({
  id: sessionUser.id,
  email: sessionUser.email ?? '',
  name:
    (sessionUser.user_metadata?.name as string | undefined) ??
    sessionUser.email ??
    'Usuario',
  avatar_url: (sessionUser.user_metadata?.avatar_url as string | undefined) ?? null,
  role:
    (sessionUser.user_metadata?.role as User['role'] | undefined) ??
    'viewer',
  created_at:
    (sessionUser.user_metadata?.created_at as string | undefined) ??
    new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const isConfigured = isSupabaseConfigured();

  const clearAuthState = () => {
    console.log('[Auth] clearAuthState called');
    setUser(null);
    setSupabaseUser(null);
    setSession(null);
  };

  const fetchUserProfile = useCallback(async (userId: string) => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      console.log('[Auth] fetchUserProfile success', { userId, hasData: Boolean(data) });
      setUser(data);
      return data;
    } catch (error) {
      console.error('[Auth] fetchUserProfile error', { userId, error });
      toast.error('Erro ao carregar perfil do usuario');
      setUser(null);
      return null;
    }
  }, []);

  const purgeStoredSession = () => {
    if (typeof window === 'undefined') return;
    try {
      const storageKey = (supabase as any)?.auth?.storageKey as string | undefined;
      if (storageKey) {
        console.log('[Auth] purgeStoredSession removing', storageKey);
        window.localStorage.removeItem(storageKey);
        window.localStorage.removeItem(`${storageKey}-global`);
      }
    } catch (error) {
      console.warn('[Auth] purgeStoredSession error', error);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      console.log('[Auth] initialize start', { isConfigured, hasSupabase: Boolean(supabase) });
      if (!isConfigured) {
        console.error('[Auth] initialize aborted - supabase not configured');
        setLoading(false);
        return;
      }

      if (!supabase) {
        console.error('[Auth] initialize aborted - supabase client missing');
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (cancelled) return;

        const currentSession = data.session ?? null;
        console.log('[Auth] getSession result', { hasSession: Boolean(currentSession) });
        setSession(currentSession);
        setSupabaseUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          console.log('[Auth] initialize refreshing profile', { userId: currentSession.user.id });
          const profile = await fetchUserProfile(currentSession.user.id);
          if (!profile) {
            console.log('[Auth] initialize using fallback user');
            setUser(buildFallbackUser(currentSession.user));
          }
        } else {
          console.log('[Auth] initialize with no session user, clearing');
          clearAuthState();
        }
      } catch (error) {
        console.error('[Auth] Falha ao recuperar sessao atual.', error);
        clearAuthState();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initialize();

    if (!supabase) {
      return () => {
        cancelled = true;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      console.log('[Auth] onAuthStateChange', { event, hasSession: Boolean(nextSession) });
      if (cancelled) return;

      setSession(nextSession ?? null);
      setSupabaseUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        setLoading(true);
        try {
          console.log('[Auth] onAuthStateChange refreshing profile', { userId: nextSession.user.id });
          const profile = await fetchUserProfile(nextSession.user.id);
          if (!profile) {
            console.log('[Auth] onAuthStateChange using fallback user');
            setUser(buildFallbackUser(nextSession.user));
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      } else {
        console.log('[Auth] onAuthStateChange without user, clearing');
        clearAuthState();
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [isConfigured, fetchUserProfile]);

  const ensureConfigured = () => {
    if (!isConfigured || !supabase) {
      const message = 'Supabase nao esta configurado. Configure as variaveis de ambiente.';
      console.error('[Auth] ensureConfigured failed');
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
      const current = supabase.auth.session()?.user ?? null;
      console.log('[Auth] signIn success', { hasSupabaseSessionUser: Boolean(current) });
      if (current) {
        setSupabaseUser(current);
        setUser(buildFallbackUser(current));
      }
      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      console.error('[Auth] signIn error', error);
      const message = error.message === 'Invalid login credentials'
        ? 'Email ou senha invalidos'
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
      const current = supabase.auth.session()?.user ?? null;
      console.log('[Auth] signUp success', { hasSupabaseSessionUser: Boolean(current) });
      if (current) {
        setSupabaseUser(current);
        setUser(buildFallbackUser(current));
      }
      toast.success('Conta criada com sucesso! Verifique seu email.');
    } catch (error: any) {
      console.error('[Auth] signUp error', error);
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
      console.log('[Auth] signOut success');
      toast.success('Logout realizado com sucesso!');
    } catch (error: any) {
      console.error('[Auth] Falha ao realizar logout', error);
      toast.error(error?.message ?? 'Nao foi possivel finalizar a sessao.');
    } finally {
      purgeStoredSession();
      clearAuthState();
      setLoading(false);
    }
  };

  const updateProfile = async ({
    name,
    email,
    newPassword,
    avatarFile,
    removeAvatar,
  }: UpdateProfileOptions) => {
    if (!user) throw new Error('Usuario nao encontrado');

    if (!isConfigured || !supabase) {
      toast.error('Supabase nao esta configurado.');
      throw new Error('Supabase nao configurado');
    }

    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;

    if (!accessToken) {
      toast.error('Sessao expirada. Faca login novamente.');
      throw new Error('Sessao invalida');
    }

    let avatarPayload: { name: string; data: string } | undefined;
    if (avatarFile) {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const [, b64] = result.split(',');
          resolve(b64 || '');
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(avatarFile);
      });
      avatarPayload = { name: avatarFile.name, data: base64 };
    }

    const response = await fetch('/api/profile/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name,
        email,
        newPassword,
        removeAvatar,
        avatar: avatarPayload,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      const message = payload?.message || 'Erro ao atualizar perfil';
      toast.error(message);
      throw new Error(message);
    }

    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        name: payload.user.name,
        email: payload.user.email,
        avatar_url: payload.user.avatarUrl,
      };
    });

    if (payload.supabaseUser) {
      setSupabaseUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          email: payload.supabaseUser.email,
          user_metadata: payload.supabaseUser.user_metadata,
        };
      });
    }

    toast.success('Perfil atualizado com sucesso!');
  };

  const resetPassword = async (email: string) => {
    ensureConfigured();

    const { error } = await supabase!.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      console.error('[Auth] resetPassword error', error);
      toast.error(error.message);
      throw error;
    }

    console.log('[Auth] resetPassword success', { email });
    toast.success('Email de recuperacao enviado!');
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
