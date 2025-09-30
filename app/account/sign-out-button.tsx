'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSignOut = async () => {
    setLoading(true);
    setError(null);

    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
      setLoading(false);
      return;
    }

    const params = new URLSearchParams({ message: 'Você saiu da conta com sucesso.' });
    router.push(`/login?${params.toString()}`);
    router.refresh();
  };

  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <button
        type="button"
        onClick={onSignOut}
        disabled={loading}
        style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: loading ? 'rgba(248, 113, 113, 0.5)' : '#f87171',
          color: '#0f172a',
          fontWeight: 600,
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Saindo…' : 'Sair da conta'}
      </button>
      <div aria-live="polite" role="status" style={{ minHeight: '20px', color: '#f87171' }}>
        {error}
      </div>
    </div>
  );
}
