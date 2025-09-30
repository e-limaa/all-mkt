'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Loader2, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getFirstErrorMessage,
  signupSchema,
  type SignupInput,
} from '@/lib/validation';
import { AuthShell } from '@/app/(auth)/components/AuthShell';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SignupPage() {
  const [form, setForm] = useState<SignupInput>({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const validation = signupSchema.safeParse(form);
    if (!validation.success) {
      setError(getFirstErrorMessage(validation.error));
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const emailRedirectTo = `${window.location.origin}/auth/callback`;
      const { error: signUpError } = await supabase.auth.signUp({
        email: validation.data.email,
        password: validation.data.password,
        options: {
          emailRedirectTo,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      setInfo('Cadastro realizado! Verifique seu e-mail para confirmar a conta.');
      setForm({ email: '', password: '' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível criar a conta. Tente novamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Criar conta"
      description="Informe seu e-mail corporativo e defina uma senha com pelo menos 8 caracteres."
      footer={
        <p className="text-xs">
          Ao criar a conta você concorda em seguir as diretrizes de uso e segurança definidas pelo time ALL MKT.
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              autoComplete="new-password"
              disabled={loading}
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

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando conta...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Criar conta
            </>
          )}
        </Button>
      </form>

      <p className="pt-2 text-center text-sm text-muted-foreground">
        Já possui cadastro?{' '}
        <Link className="font-semibold text-primary underline-offset-4 hover:underline" href="/login">
          Faça login
        </Link>
      </p>
    </AuthShell>
  );
}
