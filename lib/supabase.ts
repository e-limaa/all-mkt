import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'

// Usa variaveis de ambiente para desenvolvimento e producao
const rawSupabaseUrl = typeof window !== 'undefined'
  ? (window as any).ENV?.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE'
  : process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE'

const rawSupabaseAnonKey = typeof window !== 'undefined'
  ? (window as any).ENV?.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE'
  : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE'

const supabaseUrl = rawSupabaseUrl.trim()
const supabaseAnonKey = rawSupabaseAnonKey.trim()

if (process.env.NODE_ENV !== 'production') {
  const redactedKey = supabaseAnonKey.length > 8
    ? `${supabaseAnonKey.slice(0, 4)}...${supabaseAnonKey.slice(-4)}`
    : supabaseAnonKey
  console.log('[Supabase] URL:', supabaseUrl)
  console.log('[Supabase] ANON KEY:', redactedKey)
}

// Verifica se as credenciais sao validas (nao sao os placeholders)
const isValidConfig = supabaseUrl.startsWith('https://') && supabaseAnonKey.length > 50

// Cria o cliente apenas se as credenciais forem validas
export const supabase = isValidConfig ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
}) : null

// Funcao para verificar se o Supabase esta configurado
export const isSupabaseConfigured = () => isValidConfig

const getAbsoluteStorageUrl = (publicUrl: string): string => {
  if (publicUrl.startsWith('http')) {
    return publicUrl
  }

  try {
    const baseUrl = new URL(supabaseUrl).origin
    return `${baseUrl}${publicUrl}`
  } catch {
    return publicUrl
  }
}

// Helper para upload de arquivos
export const uploadFile = async (file: File, bucket: string, path: string) => {
  if (!supabase) throw new Error('Supabase nao configurado. Verifique as variaveis de ambiente.')
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error
  return data
}

// Helper para obter URL publica de arquivo
export const getPublicUrl = (bucket: string, path: string) => {
  if (!supabase) throw new Error('Supabase nao configurado. Verifique as variaveis de ambiente.')
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  if (!data?.publicUrl) {
    return ''
  }

  return getAbsoluteStorageUrl(data.publicUrl)
}

// Helper para download de arquivos
export const downloadFile = async (bucket: string, path: string) => {
  if (!supabase) throw new Error('Supabase nao configurado. Verifique as variaveis de ambiente.')
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path)

  if (error) throw error
  return data
}

// Helper para listar arquivos
export const listFiles = async (bucket: string, path?: string) => {
  if (!supabase) throw new Error('Supabase nao configurado. Verifique as variaveis de ambiente.')
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(path)

  if (error) throw error
  return data
}

// Helper para deletar arquivos
export const deleteFile = async (bucket: string, path: string) => {
  if (!supabase) throw new Error('Supabase nao configurado. Verifique as variaveis de ambiente.')
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .remove([path])

  if (error) throw error
  return data
}
