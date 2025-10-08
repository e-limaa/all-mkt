'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Loader2, UserPlus } from 'lucide-react';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { type LoginHeroProps } from '@/components/auth/LoginHero';
import { loginHeroLayoutOverrides } from '@/components/auth/login-layout';
import { loginHeroContent } from '@/components/auth/login-content';
import { createClient } from '@/lib/supabase/client';
import { getFirstErrorMessage, signupSchema, type SignupInput } from '@/lib/validation';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SignupPage() {
  const [form, setForm] = useState<SignupInput>({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

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

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: validation.data.email,
        password: validation.data.password,
        options: {
          emailRedirectTo,
          data: {
            name: validation.data.name,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      const newUserId = signUpData.user?.id;
      if (newUserId) {
        const { error: profileError } = await supabase.from('users').upsert({
          id: newUserId,
          email: validation.data.email,
          name: validation.data.name,
          role: 'viewer',
        });

        if (profileError) {
          setError(profileError.message);
          return;
        }
      }

      setInfo('Cadastro realizado! Verifique seu email para confirmar a conta.');
      setForm({ name: '', email: '', password: '' });
    } catch (unhandledError) {
      const message = unhandledError instanceof Error ? unhandledError.message : 'Nao foi possivel criar a conta. Tente novamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const heroProps: LoginHeroProps = {
    brandName: 'ALL MKT',
    currentYear,
    title: loginHeroContent.title,
    description: loginHeroContent.description,
    layout: loginHeroLayoutOverrides,
  };

  return (
    <AuthSplitLayout hero={heroProps} brandName="ALL MKT" currentYear={currentYear}>
      <div className="space-y-3 text-center">
        <h2 className="text-3xl font-semibold text-white">Criar conta</h2>
        <p className="text-sm text-white/60">
          Informe seus dados para acessar o ALL MKT. Vamos enviar um email de confirmacao logo apos o cadastro.
        </p>
      </div>

      <div className="space-y-4">
        {error && (
          <Alert variant="destructive" aria-live="assertive" className="border-red-500/40 bg-red-500/10 text-red-200">
            <AlertDescription className="text-sm text-red-100">{error}</AlertDescription>
          </Alert>
        )}

        {info && (
          <Alert className="border-white/20 bg-white/10 text-white" aria-live="polite">
            <AlertDescription className="text-sm text-white/80">{info}</AlertDescription>
          </Alert>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-white">
              Nome
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Seu nome completo"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              autoComplete="name"
              disabled={loading}
              required
              className="h-12 rounded-xl border-white/10 bg-white/5 text-base text-white placeholder:text-white/40 focus-visible:border-[#E4002B] focus-visible:ring-[#E4002B]/40"
            />
          </div>

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
            <Input
              id="password"
              type="password"
              placeholder="********"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              autoComplete="new-password"
              disabled={loading}
              required
              className="h-12 rounded-xl border-white/10 bg-white/5 text-base text-white placeholder:text-white/40 focus-visible:border-[#E4002B] focus-visible:ring-[#E4002B]/40"
            />
          </div>
        </div>

        <Button
          type="submit"
          className="h-12 w-full rounded-xl bg-[#E4002B] text-base font-semibold text-white shadow-[0_25px_40px_-25px_rgba(228,0,43,0.8)] transition hover:bg-[#ff2d4e] focus-visible:ring-[#E4002B]/40"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Criando conta...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-5 w-5" />
              Criar conta
            </>
          )}
        </Button>
      </form>

      <p className="pt-4 text-center text-sm text-white/60">
        Ja possui cadastro?{' '}
        <Link className="font-semibold text-[#E4002B] transition-colors hover:text-[#ff3752]" href="/login">
          Faca login
        </Link>
      </p>

      <div className="text-center text-xs text-white/40">
        <p>Apenas emails corporativos sao autorizados. Siga as diretrizes de uso definidas pelo time ALL MKT.</p>
      </div>
    </AuthSplitLayout>
  );
}
