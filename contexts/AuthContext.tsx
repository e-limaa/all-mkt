import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import { toast } from 'sonner';

type User = Database['public']['Tables']['users']['Row'];

// Mock user for development
const mockUser: User = {
  id: 'mock-user-id',
  email: 'admin@allmkt.com',
  name: 'Admin Development',
  avatar_url: null,
  role: 'admin',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

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

  useEffect(() => {
    if (!isConfigured) {
      // Modo de desenvolvimento - usar dados mockados
      console.log('🔧 Modo de desenvolvimento: usando dados mockados');
      setUser(mockUser);
      setLoading(false);
      return;
    }

    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [isConfigured]);

  const fetchUserProfile = async (userId: string) => {
    if (!supabase) return;
    try {
      console.log('[Auth] Buscando perfil do usuário na tabela users:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      console.log('[Auth] Perfil encontrado:', data);
      setUser(data);
    } catch (error) {
      console.error('[Auth] Erro ao buscar perfil do usuário:', error);
      toast.error('Erro ao carregar perfil do usuário');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isConfigured) {
      // Modo de desenvolvimento - simular login
      setLoading(true);
      setTimeout(() => {
        if (email === 'admin@allmkt.com' && password === 'admin') {
          setUser(mockUser);
          toast.success('Login realizado com sucesso! (Modo desenvolvimento)');
        } else {
          toast.error('Email ou senha inválidos. Use: admin@allmkt.com / admin');
        }
        setLoading(false);
      }, 1000);
      return;
    }

    if (!supabase) throw new Error('Supabase não configurado');

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

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
    if (!isConfigured) {
      toast.error('Cadastro não disponível no modo de desenvolvimento');
      return;
    }

    if (!supabase) throw new Error('Supabase não configurado');

    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
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
    if (!isConfigured) {
      // Modo de desenvolvimento
      setUser(null);
      toast.success('Logout realizado com sucesso! (Modo desenvolvimento)');
      return;
    }

    if (!supabase) throw new Error('Supabase não configurado');

    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setSupabaseUser(null);
      setSession(null);
      toast.success('Logout realizado com sucesso!');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!isConfigured) {
      // Modo de desenvolvimento - simular atualização
      if (user) {
        setUser({ ...user, ...updates });
        toast.success('Perfil atualizado com sucesso! (Modo desenvolvimento)');
      }
      return;
    }

    if (!supabase) throw new Error('Supabase não configurado');

    try {
      if (!user) throw new Error('Usuário não encontrado');
      
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setUser({ ...user, ...updates });
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    if (!isConfigured) {
      toast.error('Recuperação de senha não disponível no modo de desenvolvimento');
      return;
    }

    if (!supabase) throw new Error('Supabase não configurado');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      toast.success('Email de recuperação enviado!');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}