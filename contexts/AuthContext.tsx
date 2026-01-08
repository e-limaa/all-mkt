import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase, isSupabaseConfigured, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
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

const PROFILE_TIMEOUT_MS = 8000;

const normalizeMaterialOriginScope = (
  value: unknown,
): "house" | "ev" | "tenda_vendas" | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized === "house" || normalized === "ev" || normalized === "tenda_vendas"
    ? (normalized as "house" | "ev" | "tenda_vendas")
    : null;
};

const sanitizeUserRecord = (record: User): User => ({
  ...record,
  regional:
    typeof record.regional === "string" && record.regional.trim().length > 0
      ? record.regional.trim().toUpperCase()
      : null,
  material_origin_scope: normalizeMaterialOriginScope(
    record.material_origin_scope,
  ),
});
const buildFallbackUser = (sessionUser: SupabaseUser): User => {
  const regionalMeta = sessionUser.user_metadata?.regional as string | undefined;
  const viewerAccessMeta = sessionUser.user_metadata?.viewer_access_to_all as
    | boolean
    | null
    | undefined;
  const createdByMeta = sessionUser.user_metadata?.created_by as
    | string
    | undefined;
  const originScopeMeta = sessionUser.user_metadata
    ?.material_origin_scope as string | undefined;

  return {
    id: sessionUser.id,
    email: sessionUser.email ?? "",
    name:
      (sessionUser.user_metadata?.name as string | undefined) ??
      sessionUser.email ??
      "Usuario",
    avatar_url:
      (sessionUser.user_metadata?.avatar_url as string | undefined) ?? null,
    role:
      (sessionUser.user_metadata?.role as User["role"] | undefined) ?? "viewer",
    regional: regionalMeta ? regionalMeta.trim().toUpperCase() : null,
    material_origin_scope: normalizeMaterialOriginScope(originScopeMeta),
    viewer_access_to_all:
      viewerAccessMeta === undefined
        ? false
        : viewerAccessMeta === null
          ? null
          : Boolean(viewerAccessMeta),
    created_by: createdByMeta ?? null,
    created_at:
      (sessionUser.user_metadata?.created_at as string | undefined) ??
      new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

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

  const fetchUserProfile = useCallback(async (currentSession: Session | null | undefined) => {
    if (!supabase || !currentSession?.user) {
      setUser(null);
      return null;
    }

    const userId = currentSession.user.id;
    const accessToken = currentSession.access_token;

    try {
      if (!accessToken) {
        const fallback = buildFallbackUser(currentSession.user);
        setUser(fallback);
        return fallback;
      }

      const apiUrl = `${supabaseUrl}/rest/v1/users?id=eq.${userId}&select=*`;
      const controller = new AbortController();
      const fetchTimeoutId = setTimeout(() => controller.abort(), PROFILE_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch(apiUrl, {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
            Prefer: 'return=representation',
          },
          signal: controller.signal,
        });
      } catch (error) {
        clearTimeout(fetchTimeoutId);
        toast.error('Erro na requisicao de perfil do usuario.');
        setUser(null);
        return null;
      } finally {
        clearTimeout(fetchTimeoutId);
      }

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message = body?.message || 'Nao foi possivel carregar o perfil do usuario';
        toast.error(message);
        setUser(null);
        return null;
      }

      const rows = await response.json();
      const record = Array.isArray(rows) ? rows[0] : rows;

      if (!record) {
        const fallback = buildFallbackUser(currentSession.user);
        setUser(fallback);
        return fallback;
      }

      const sanitizedRecord = sanitizeUserRecord(record as User);
      const metadata = currentSession.user.user_metadata as Record<string, unknown> | undefined;
      const metadataRegional = typeof metadata?.regional === 'string' ? metadata.regional.trim().toUpperCase() : null;
      const metadataOrigin = normalizeMaterialOriginScope(metadata?.material_origin_scope);
      const mergedRecord: User = {
        ...sanitizedRecord,
        regional: sanitizedRecord.regional ?? metadataRegional,
        material_origin_scope:
          sanitizedRecord.material_origin_scope ?? metadataOrigin ?? null,
      };

      setUser(mergedRecord);
      return mergedRecord;
    } catch (error) {
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
        window.localStorage.removeItem(storageKey);
        window.localStorage.removeItem(`${storageKey}-global`);
      }
    } catch (_error) {
      /* ignore storage purge failures */
    }
  };

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
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
        setSession(currentSession);
        setSupabaseUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const profile = await fetchUserProfile(currentSession);
          if (!profile) {
            setUser(buildFallbackUser(currentSession.user));
          }
        } else {
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
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (cancelled) return;

      setSession(nextSession ?? null);
      setSupabaseUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        setLoading(true);
        try {
          const profile = await fetchUserProfile(nextSession);
          if (!profile) {
            setUser(buildFallbackUser(nextSession.user));
          }
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
      const {
        data: { session: currentSession },
      } = await supabase!.auth.getSession();
      const current = currentSession?.user ?? null;
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
      const {
        data: { session: currentSession },
      } = await supabase!.auth.getSession();
      const current = currentSession?.user ?? null;
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

