import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

type SupabaseEnv = {
  url: string;
  anonKey: string;
};

const readServerEnv = (): SupabaseEnv => ({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
});

const readBrowserEnv = (): SupabaseEnv => ({
  url:
    (typeof window !== 'undefined' ? (window as any).ENV?.NEXT_PUBLIC_SUPABASE_URL : undefined) ??
    (process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined) ??
    '',
  anonKey:
    (typeof window !== 'undefined' ? (window as any).ENV?.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined) ??
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ??
    '',
});

const getSupabaseEnv = (): SupabaseEnv => (typeof window === 'undefined' ? readServerEnv() : readBrowserEnv());

const initialEnv = getSupabaseEnv();
const supabaseUrl = initialEnv.url;
const supabaseAnonKey = initialEnv.anonKey;
const hasValidConfig = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://'));

if (process.env.NODE_ENV !== 'production') {
  const redactedKey = supabaseAnonKey.length > 8
    ? `${supabaseAnonKey.slice(0, 4)}...${supabaseAnonKey.slice(-4)}`
    : supabaseAnonKey;
  console.log('[Supabase] URL:', supabaseUrl || '(não configurado)');
  console.log('[Supabase] ANON KEY:', redactedKey || '(não configurado)');
}

export const supabase = hasValidConfig
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

if (typeof window !== 'undefined') {
  const anonKeySnippet =
    supabaseAnonKey.length > 8
      ? `${supabaseAnonKey.slice(0, 4)}...${supabaseAnonKey.slice(-4)}`
      : supabaseAnonKey || null;

  (window as any).__SUPABASE_DEBUG = {
    supabaseUrl,
    hasClient: Boolean(supabase),
    isConfigured: isSupabaseConfigured(),
  };

  console.log('[Supabase runtime]', {
    supabaseUrl,
    hasClient: Boolean(supabase),
    anonKeySnippet,
  });
}

export { supabaseUrl, supabaseAnonKey };

export const isSupabaseConfigured = () => {
  const env = getSupabaseEnv();
  return Boolean(env.url && env.anonKey && env.url.startsWith('https://'));
};

const getAbsoluteStorageUrl = (publicUrl: string): string => {
  if (publicUrl.startsWith('http')) {
    return publicUrl;
  }

  try {
    const baseUrl = new URL(supabaseUrl).origin;
    return `${baseUrl}${publicUrl}`;
  } catch {
    return publicUrl;
  }
};

export const uploadFile = async (file: File, bucket: string, path: string) => {
  if (!supabase) throw new Error('Supabase não configurado. Verifique as variáveis de ambiente.');

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;
  return data;
};

export const getPublicUrl = (bucket: string, path: string) => {
  if (!supabase) throw new Error('Supabase não configurado. Verifique as variáveis de ambiente.');
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  if (!data?.publicUrl) {
    return '';
  }

  return getAbsoluteStorageUrl(data.publicUrl);
};

export const downloadFile = async (bucket: string, path: string) => {
  if (!supabase) throw new Error('Supabase não configurado. Verifique as variáveis de ambiente.');

  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error) throw error;
  return data;
};

export const listFiles = async (bucket: string, path?: string) => {
  if (!supabase) throw new Error('Supabase não configurado. Verifique as variáveis de ambiente.');

  const { data, error } = await supabase.storage.from(bucket).list(path);

  if (error) throw error;
  return data;
};

export const deleteFile = async (bucket: string, path: string) => {
  if (!supabase) throw new Error('Supabase não configurado. Verifique as variáveis de ambiente.');

  const { data, error } = await supabase.storage.from(bucket).remove([path]);

  if (error) throw error;
  return data;
};
