'use client';

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, LogIn, MailCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getFirstErrorMessage, loginSchema, type LoginInput } from '@/lib/validation';
import { AuthShell } from '@/app/(auth)/components/AuthShell';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams?.get('redirectedFrom') ?? null;
  const initialMessage = searchParams?.get('message') ?? null;

  const [form, setForm] = useState<LoginInput>({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(initialMessage);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const redirectTarget = redirectedFrom && redirectedFrom.startsWith('/') ? redirectedFrom : '/';
        router.replace(redirectTarget);
      } else {
        setCheckingSession(false);
      }
    });
  }, [redirectedFrom, router]);

  if (checkingSession) {
    return null;
  }


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const validation = loginSchema.safeParse(form);
    if (!validation.success) {
      setError(getFirstErrorMessage(validation.error));
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword(validation.data);

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    let activeSession = signInData.session;
    let attempts = 0;
    while (!activeSession && attempts < 5) {
      const { data: sessionData } = await supabase.auth.getSession();
      activeSession = sessionData.session;
      if (!activeSession) {
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      attempts += 1;
    }

    const redirectTarget = redirectedFrom && redirectedFrom.startsWith('/') ? redirectedFrom : '/';
    router.push(redirectTarget);
    router.refresh();
  };

  return (
    <AuthShell
      title="Entrar"
      description="Use suas credenciais para acessar o ALL MKT."
      footer={
        <div className="space-y-2 text-center">
          <p className="text-xs">Precisa de suporte? Fale com o administrador do ALL MKT.</p>
        </div>
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
              autoComplete="current-password"
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
              Entrando...
            </>
          ) : (
            <>
              <LogIn className="mr-2 h-4 w-4" />
              Entrar
            </>
          )}
        </Button>
      </form>

      <div className="grid gap-3 pt-2">
        <Button asChild variant="outline" className="w-full" disabled={loading}>
          <Link href="/forgot-password">
            <MailCheck className="h-4 w-4" />
            Esqueci minha senha
          </Link>
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Novo por aqui?{' '}
          <Link className="font-semibold text-primary underline-offset-4 hover:underline" href="/signup">
            Crie sua conta
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
