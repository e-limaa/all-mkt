'use client';

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, LogIn, MailCheck } from 'lucide-react';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { type LoginHeroProps } from '@/components/auth/LoginHero';
import { loginHeroLayoutOverrides } from '@/components/auth/login-layout';
import { loginHeroContent } from '@/components/auth/login-content';
import { createClient } from '@/lib/supabase/client';
import {
  forgotPasswordSchema,
  getFirstErrorMessage,
  loginSchema,
  type ForgotPasswordInput,
  type LoginInput,
} from '@/lib/validation';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams?.get('redirectedFrom') ?? null;
  const initialMessage = searchParams?.get('message') ?? null;

  const [form, setForm] = useState<LoginInput>({ email: '', password: '' });
  const [view, setView] = useState<'login' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(initialMessage);
  const [forgotForm, setForgotForm] = useState<ForgotPasswordInput>({ email: '' });
  const [checkingSession, setCheckingSession] = useState(true);
  const currentYear = new Date().getFullYear();

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

    try {
      const supabase = createClient();
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword(validation.data);

      if (signInError) {
        setError(signInError.message);
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
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const validation = forgotPasswordSchema.safeParse(forgotForm);
    if (!validation.success) {
      setError(getFirstErrorMessage(validation.error));
      return;
    }

    setForgotLoading(true);

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
        setError(body.error ?? 'Nao foi possivel enviar o link de recuperacao.');
        return;
      }

      setInfo('Enviamos um link de recuperacao para o seu email.');
      setForgotForm({ email: '' });
    } catch (forgotError) {
      const message =
        forgotError instanceof Error ? forgotError.message : 'Nao foi possivel enviar o link. Tente novamente.';
      setError(message);
    } finally {
      setForgotLoading(false);
    }
  };

  const switchToLogin = () => {
    setView('login');
    setError(null);
    setInfo((prev) => prev ?? initialMessage);
  };

  const switchToForgot = () => {
    setView('forgot');
    setError(null);
    setInfo(null);
  };

  const heroProps: LoginHeroProps = {
    brandName: 'ALL MKT',
    currentYear,
    title: loginHeroContent.title,
    description: loginHeroContent.description,
    layout: loginHeroLayoutOverrides,
  };

  return (
    <AuthSplitLayout
      hero={heroProps}
      brandName="ALL MKT"
      currentYear={currentYear}
      panelWrapperClassName="lg:grid-cols-[1.6fr_1fr]"
    >
      {view === 'login' ? (
        <>
          <div className="space-y-3 text-center">
            <h2 className="text-3xl font-semibold text-white">Login</h2>
            <p className="text-sm text-white/60">
              Seja bem-vindo(a) ao ALL MKT. Faca login para continuar e ficar por dentro de tudo que acontece no MKT Estrategico.
            </p>
          </div>

          <div className="space-y-4">
            {error && (
              <Alert variant="destructive" aria-live="assertive" className="border-red-500/40 bg-red-500/10 text-red-200">
                <AlertDescription className="text-sm text-red-100">{error}</AlertDescription>
              </Alert>
            )}

            {info && (
              <Alert className="border-white/15 bg-white/5 text-white" aria-live="polite">
                <AlertDescription className="text-sm text-white/80">{info}</AlertDescription>
              </Alert>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-white">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  autoComplete="email"
                  disabled={loading}
                  required
                  className="h-12 rounded-xl border-white/10 bg-white/5 text-base text-white placeholder:text-white/40 focus-visible:border-[#E4002B] focus-visible:ring-[#E4002B]/40"
                />
              </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-white">
                Senha
              </Label>
              <PasswordInput
                id="password"
                placeholder="********"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                autoComplete="current-password"
                disabled={loading}
                required
                className="h-12 rounded-xl border-white/10 bg-white/5 text-base text-white placeholder:text-white/40 focus-visible:border-[#E4002B] focus-visible:ring-[#E4002B]/40"
              />
            </div>
            </div>

            <div className="flex items-center justify-between text-sm text-white/60">
              <button type="button" onClick={switchToForgot} className="transition-colors hover:text-white">
                Esqueci minha senha
              </button>
              <Link href="/signup" className="font-semibold text-[#E4002B] transition-colors hover:text-[#ff3752]">
                Criar conta
              </Link>
            </div>

            <Button
              type="submit"
              className="h-12 w-full rounded-xl bg-[#E4002B] text-base font-semibold text-white shadow-[0_25px_40px_-25px_rgba(228,0,43,0.8)] transition hover:bg-[#ff2d4e] focus-visible:ring-[#E4002B]/40"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  Entrar
                </>
              )}
            </Button>
          </form>

          <div className="space-y-2 pt-4 text-center text-xs text-white/40">
            <p>Sistema de gestao digital de ativos imobiliarios</p>
            <p>Dica: Use qualquer email valido com senha "123456" para testar integracoes internas.</p>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-3 text-center">
            <h2 className="text-3xl font-semibold text-white">Recuperar senha</h2>
            <p className="text-sm text-white/60">
              Informe o email cadastrado para receber um link seguro de redefinicao.
            </p>
          </div>

          <div className="space-y-4">
            {error && (
              <Alert variant="destructive" aria-live="assertive" className="border-red-500/40 bg-red-500/10 text-red-200">
                <AlertDescription className="text-sm text-red-100">{error}</AlertDescription>
              </Alert>
            )}

            {info && (
              <Alert className="border-white/15 bg-white/5 text-white" aria-live="polite">
                <AlertDescription className="text-sm text-white/80">{info}</AlertDescription>
              </Alert>
            )}
          </div>

          <form onSubmit={handleForgotSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="forgot-email" className="text-sm font-medium text-white">
                Email
              </Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="seu@email.com"
                value={forgotForm.email}
                onChange={(event) => setForgotForm({ email: event.target.value })}
                autoComplete="email"
                disabled={forgotLoading}
                required
                className="h-12 rounded-xl border-white/10 bg-white/5 text-base text-white placeholder:text-white/40 focus-visible:border-[#E4002B] focus-visible:ring-[#E4002B]/40"
              />
            </div>

            <Button
              type="submit"
              className="h-12 w-full rounded-xl bg-[#E4002B] text-base font-semibold text-white shadow-[0_25px_40px_-25px_rgba(228,0,43,0.8)] transition hover:bg-[#ff2d4e] focus-visible:ring-[#E4002B]/40"
              disabled={forgotLoading}
            >
              {forgotLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <MailCheck className="mr-2 h-5 w-5" />
                  Enviar link
                </>
              )}
            </Button>
          </form>

          <div className="space-y-2 pt-4 text-center text-xs text-white/40">
            <button type="button" onClick={switchToLogin} className="text-white underline-offset-4 hover:underline">
              Voltar ao login
            </button>
            <p>
              Ainda nao possui conta?{" "}
              <Link className="font-semibold text-[#E4002B] transition-colors hover:text-[#ff3752]" href="/signup">
                Criar conta
              </Link>
            </p>
          </div>
        </>
      )}
    </AuthSplitLayout>
  );
}
