'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Loader2, MailCheck } from 'lucide-react';
import {
  forgotPasswordSchema,
  getFirstErrorMessage,
  type ForgotPasswordInput,
} from '@/lib/validation';
import { AuthShell } from '@/app/(auth)/components/AuthShell';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ForgotPasswordPage() {
  const [form, setForm] = useState<ForgotPasswordInput>({ email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const validation = forgotPasswordSchema.safeParse(form);
    if (!validation.success) {
      setError(getFirstErrorMessage(validation.error));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: validation.data.email }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? 'Não foi possível enviar o link de recuperação.');
        return;
      }

      setInfo('Enviamos um link de recuperação para o seu e-mail.');
      setForm({ email: '' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível enviar o link. Tente novamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Recuperar senha"
      description="Informe o e-mail cadastrado para receber um link seguro de redefinição."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={form.email}
            onChange={(event) => setForm({ email: event.target.value })}
            autoComplete="email"
            disabled={loading}
            required
          />
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

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <MailCheck className="mr-2 h-4 w-4" />
              Enviar link de recuperação
            </>
          )}
        </Button>
      </form>

      <div className="pt-2 text-center text-sm text-muted-foreground">
        <p>
          Lembrou a senha?{' '}
          <Link className="font-semibold text-primary underline-offset-4 hover:underline" href="/">
            Voltar ao login
          </Link>
        </p>
        <p className="mt-1">
          Ainda não tem conta?{' '}
          <Link className="font-semibold text-primary underline-offset-4 hover:underline" href="/signup">
            Cadastre-se
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
