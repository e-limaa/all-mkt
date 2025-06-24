import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'

// Para ambiente de desenvolvimento e produção, use variáveis de ambiente corretamente
const supabaseUrl = typeof window !== 'undefined'
  ? (window as any).ENV?.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE'
  : process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE'

const supabaseAnonKey = typeof window !== 'undefined'
  ? (window as any).ENV?.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE'
  : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE'

console.log('[Supabase] URL:', supabaseUrl)
console.log('[Supabase] ANON KEY:', supabaseAnonKey)

// Verificar se as credenciais são válidas (não são os placeholders)
const isValidConfig = supabaseUrl.startsWith('https://') && supabaseAnonKey.length > 50

// Criar cliente apenas se as credenciais forem válidas
export const supabase = isValidConfig ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
}) : null

// Função para verificar se o Supabase está configurado
export const isSupabaseConfigured = () => isValidConfig

// Helper para upload de arquivos
export const uploadFile = async (file: File, bucket: string, path: string) => {
  if (!supabase) throw new Error('Supabase não configurado. Verifique as variáveis de ambiente.')
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error
  return data
}

// Helper para obter URL pública de arquivo
export const getPublicUrl = (bucket: string, path: string) => {
  if (!supabase) throw new Error('Supabase não configurado. Verifique as variáveis de ambiente.')
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)
  // Garante que a URL é absoluta e válida
  if (data && data.publicUrl && data.publicUrl.startsWith('/storage/v1/object/public/')) {
    // Usa a URL do projeto Supabase
    return `https://xrnglprzyivxqtidfgrc.supabase.co${data.publicUrl}`;
  }
  return data?.publicUrl || '';
}

// Helper para download de arquivos
export const downloadFile = async (bucket: string, path: string) => {
  if (!supabase) throw new Error('Supabase não configurado. Verifique as variáveis de ambiente.')
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path)

  if (error) throw error
  return data
}

// Helper para listar arquivos
export const listFiles = async (bucket: string, path?: string) => {
  if (!supabase) throw new Error('Supabase não configurado. Verifique as variáveis de ambiente.')
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(path)

  if (error) throw error
  return data
}

// Helper para deletar arquivos
export const deleteFile = async (bucket: string, path: string) => {
  if (!supabase) throw new Error('Supabase não configurado. Verifique as variáveis de ambiente.')
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .remove([path])

  if (error) throw error
  return data
}