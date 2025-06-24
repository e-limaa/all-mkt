// @ts-ignore
require('ts-node').register({ transpileOnly: true });
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase ANON KEY:', supabaseAnonKey?.slice(0, 8) + '...');

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('YOUR_SUPABASE_URL_HERE') || supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY_HERE')) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas corretamente.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    const { data, error } = await supabase.rpc('version');
    if (error) {
      console.error('❌ Erro ao conectar ao Supabase:', error.message);
      process.exit(1);
    }
    console.log('✅ Conexão com Supabase bem-sucedida! Versão do banco:', data);
  } catch (err) {
    console.error('❌ Erro inesperado:', err);
    process.exit(1);
  }
}

testConnection();
