import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createClient, type Session, type User as SupabaseUser, type SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

import { Database } from '../types/supabase';
import { isSupabaseConfigured, supabaseUrl, supabaseAnonKey } from '../lib/supabase';

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

const createBrowserClient = (): SupabaseClient<Database> | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseUrl.startsWith('https://')) {
    return null;
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<SupabaseClient<Database> | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (!client) {
      const created = createBrowserClient();
      if (created) {
        setClient(created);
      } else {
        setLoading(false);
      }
    }
  }, [client]);

  const ensureClient = useCallback((): SupabaseClient<Database> => {
    if (!client || !isConfigured) {
      const message = 'Supabase não está configurado. Configure as variáveis de ambiente.';
      toast.error(message);
      throw new Error(message);
    }
    return client;
  }, [client, isConfigured]);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setSupabaseUser(null);
    setSession(null);
  }, []);

  const fetchUserProfile = useCallback(
    async (supabaseClient: SupabaseClient<Database>, userId: string) => {
      try {
        const { data, error } = await supabaseClient
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) throw error;
        setUser(data);
        return data;
      } catch (error) {
        console.error('[Auth] Erro ao buscar perfil do usuário:', error);
        toast.error('Erro ao carregar perfil do usuário.');
        setUser(null);
        return null;
      }
    },
    [],
  );

  const purgeStoredSession = useCallback(
    (supabaseClient: SupabaseClient<Database>) => {
      if (typeof window === 'undefined') return;
      try {
        const storageKey = (supabaseClient as any)?.auth?.storageKey as string | undefined;
        if (storageKey) {
          window.localStorage.removeItem(storageKey);
          window.localStorage.removeItem(`${storageKey}-global`);
        }
      } catch (error) {
        console.warn('[Auth] Não foi possível limpar a sessão armazenada localmente.', error);
      }
    },
    [],
  );

  useEffect(() => {
    if (!client || !isConfigured) {
      return;
    }

    let cancelled = false;

    const initialize = async () => {
      setLoading(true);

      try {
        const { data, error } = await client.auth.getSession();
        if (error) throw error;

        if (cancelled) return;

        const currentSession = data.session ?? null;
        setSession(currentSession);
        setSupabaseUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchUserProfile(client, currentSession.user.id);
        } else {
          clearAuthState();
        }
      } catch (error) {
        console.error('[Auth] Falha ao recuperar sessão atual.', error);
        clearAuthState();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initialize();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (_event, nextSession) => {
      if (cancelled) return;

      setSession(nextSession ?? null);
      setSupabaseUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        setLoading(true);
        try {
          await fetchUserProfile(client, nextSession.user.id);
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      } else {
        clearAuthState();
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [client, isConfigured, fetchUserProfile, clearAuthState]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const supabaseClient = ensureClient();
      try {
        setLoading(true);
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Login realizado com sucesso!');
      } catch (error: any) {
        const message =
          error?.message === 'Invalid login credentials' ? 'Email ou senha inválidos' : error?.message ?? 'Erro ao autenticar.';
        toast.error(message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [ensureClient],
  );

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      const supabaseClient = ensureClient();
      try {
        setLoading(true);
        const { error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: { name },
          },
        });

        if (error) throw error;
        toast.success('Conta criada com sucesso! Verifique seu email.');
      } catch (error: any) {
        toast.error(error?.message ?? 'Não foi possível criar a conta.');
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [ensureClient],
  );

  const signOut = useCallback(async () => {
    const supabaseClient = ensureClient();
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.signOut({ scope: 'global' });
      if (error) throw error;
      toast.success('Logout realizado com sucesso!');
    } catch (error: any) {
      console.error('[Auth] Falha ao realizar logout', error);
      toast.error(error?.message ?? 'Não foi possível finalizar a sessão.');
    } finally {
      purgeStoredSession(supabaseClient);
      clearAuthState();
      setLoading(false);
    }
  }, [ensureClient, purgeStoredSession, clearAuthState]);

  const updateProfile = useCallback(
    async ({ name, email, newPassword, avatarFile, removeAvatar }: UpdateProfileOptions) => {
      const supabaseClient = ensureClient();
      if (!user) throw new Error('Usuário não encontrado.');

      const sessionData = await supabaseClient.auth.getSession();
      const accessToken = sessionData.data.session?.access_token;

      if (!accessToken) {
        toast.error('Sessão expirada. Faça login novamente.');
        throw new Error('Sessão inválida.');
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
        const message = payload?.message || 'Erro ao atualizar perfil.';
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
    },
    [ensureClient, user],
  );

  const resetPassword = useCallback(
    async (email: string) => {
      const supabaseClient = ensureClient();

      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
        throw error;
      }

      toast.success('Email de recuperação enviado!');
    },
    [ensureClient],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      supabaseUser,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      resetPassword,
    }),
    [user, supabaseUser, session, loading, signIn, signUp, signOut, updateProfile, resetPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
