'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, KeyRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getFirstErrorMessage,
  resetPasswordSchema,
  type ResetPasswordInput,
} from '@/lib/validation';
import { AuthShell } from '@/app/(auth)/components/AuthShell';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [form, setForm] = useState<ResetPasswordInput>({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [hasValidatedLink, setHasValidatedLink] = useState(false);
  const isFormDisabled = !hasValidatedLink || loading;

  useEffect(() => {
    const supabase = createClient();

    const ensureRecoverySession = async () => {
      const cleanupUrl = () => {
        try {
          const url = new URL(window.location.href);
          url.hash = '';
          window.history.replaceState({}, document.title, url.toString());
        } catch {
          /* noop */
        }
      };

      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const searchParams = new URLSearchParams(window.location.search);

        const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
        const code = hashParams.get('code') || searchParams.get('code');

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('[reset-password] setSession error:', sessionError);
            setError('Link de recuperação inválido ou expirado. Solicite um novo.');
            return;
          }

          cleanupUrl();
        } else if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('[reset-password] exchangeCodeForSession error:', exchangeError);
            setError('Link de recuperação inválido ou expirado. Solicite um novo.');
            return;
          }
          cleanupUrl();
        }
      } catch (linkError) {
        console.error('[reset-password] unexpected recovery link error:', linkError);
        setError('Não foi possível validar o link de recuperação. Solicite um novo.');
      } finally {
        setHasValidatedLink(true);
      }
    };

    void ensureRecoverySession();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const validation = resetPasswordSchema.safeParse(form);
    if (!validation.success) {
      setError(getFirstErrorMessage(validation.error));
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError('Sessão de recuperação não encontrada. Solicite um novo link.');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: validation.data.password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setInfo('Senha atualizada com sucesso! Redirecionando para o login...');
      await supabase.auth.signOut();

      const params = new URLSearchParams({ message: 'Senha atualizada com sucesso. Faça login.' });
      setTimeout(() => {
        router.push(`/login?${params.toString()}`);
        router.refresh();
      }, 1200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar a senha. Tente novamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Definir nova senha"
      description="Escolha uma nova senha forte para concluir o processo de recuperação."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              autoComplete="new-password"
              disabled={isFormDisabled}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repita a nova senha"
              value={form.confirmPassword}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
              }
              autoComplete="new-password"
              disabled={isFormDisabled}
              required
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive" aria-live="assertive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {info && (
          <Alert className="border-primary/30 bg-primary/10" aria-live="polite">
            <AlertDescription className="text-primary">{info}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" disabled={isFormDisabled}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <KeyRound className="mr-2 h-4 w-4" />
              Salvar nova senha
            </>
          )}
        </Button>
      </form>

      <p className="pt-2 text-center text-sm text-muted-foreground">
        Lembrou sua senha?{' '}
        <Link className="font-semibold text-primary underline-offset-4 hover:underline" href="/">
          Voltar ao login
        </Link>
      </p>
    </AuthShell>
  );
}
