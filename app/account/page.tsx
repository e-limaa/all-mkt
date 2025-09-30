import Link from 'next/link';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/server';
import SignOutButton from './sign-out-button';

type ProfileRow = {
  name: string | null;
  role: string | null;
  created_at: string | null;
  updated_at: string | null;
  avatar_url: string | null;
};

const formatDate = (value: string | null) => {
  if (!value) return '—';

  try {
    return format(new Date(value), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch (error) {
    console.error('[account] Falha ao formatar data', error);
    return '—';
  }
};

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('Erro ao obter usuário da sessão:', error.message);
  }

  if (!user) {
    redirect('/login?redirectedFrom=/account');
  }

  let profile: ProfileRow | null = null;

  try {
    const { data: profileRow, error: profileError } = await supabase
      .from('users')
      .select('name, role, created_at, updated_at, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[account] Falha ao carregar perfil do usuário:', profileError.message);
    }

    profile = profileRow ?? null;
  } catch (profileQueryError) {
    console.error('[account] Erro inesperado ao consultar perfil:', profileQueryError);
  }

  const displayName = profile?.name || user.user_metadata?.name || 'Usuário';
  const roleLabel = profile?.role || user.user_metadata?.role || 'sem papel definido';

  return (
    <section style={{ display: 'grid', gap: '24px', maxWidth: '640px' }}>
      <div style={{ display: 'grid', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', margin: 0 }}>Minha conta</h1>
          <p style={{ color: '#94a3b8', marginTop: '4px' }}>
            Bem-vindo de volta, <strong style={{ color: '#e2e8f0' }}>{displayName}</strong>.
          </p>
        </div>

        <div
          style={{
            background: 'rgba(148, 163, 184, 0.08)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'grid',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>E-mail</span>
            <strong style={{ color: '#e2e8f0', fontSize: '1rem' }}>{user.email}</strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Papel</span>
            <strong style={{ color: '#e2e8f0', fontSize: '1rem', textTransform: 'capitalize' }}>{roleLabel}</strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Conta criada em</span>
            <strong style={{ color: '#e2e8f0', fontSize: '1rem' }}>{formatDate(profile?.created_at)}</strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Última atualização</span>
            <strong style={{ color: '#e2e8f0', fontSize: '1rem' }}>{formatDate(profile?.updated_at)}</strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        <SignOutButton />
        <Link href="/" style={{ color: '#38bdf8', fontWeight: 500 }}>
          Voltar para a página inicial
        </Link>
      </div>
    </section>
  );
}
