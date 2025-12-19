import React, { useState } from "react";
import Link from "next/link";
import { Loader2, LogIn, MailCheck } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useConfig } from "../contexts/ConfigContext";
import { AuthSplitLayout } from "./auth/AuthSplitLayout";
import { loginHeroLayoutOverrides } from "./auth/login-layout";
import { loginHeroContent } from "./auth/login-content";
import { Input } from "./ui/input";
import { PasswordInput } from "./ui/password-input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import {
  forgotPasswordSchema,
  getFirstErrorMessage,
  type ForgotPasswordInput,
} from "../lib/validation";

export function LoginScreen() {
  const { signIn, loading } = useAuth();
  const { systemSettings } = useConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotForm, setForgotForm] = useState<ForgotPasswordInput>({
    email: "",
  });
  const [view, setView] = useState<"login" | "forgot">("login");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const brandName = systemSettings.companyName?.trim() || "ALL MKT";
  const adminEmail = systemSettings.adminEmail?.trim() || null;
  const currentYear = new Date().getFullYear();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (!email || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    try {
      await signIn(email, password);
    } catch (err) {
      setError("Email ou senha incorretos.");
    }
  };

  const handleForgotSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
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
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: validation.data.email }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(
          body.error ?? "Nao foi possivel enviar o link de recuperacao."
        );
        return;
      }

      setInfo("Enviamos um link de recuperacao para o seu email.");
      setForgotForm({ email: "" });
    } catch (forgotError) {
      const message =
        forgotError instanceof Error
          ? forgotError.message
          : "Nao foi possivel enviar o link. Tente novamente.";
      setError(message);
    } finally {
      setForgotLoading(false);
    }
  };

  const switchToLogin = () => {
    setView("login");
    setError(null);
    setInfo((prev) => prev);
  };

  const switchToForgot = () => {
    setView("forgot");
    setError(null);
    setInfo(null);
  };

  const heroProps = {
    brandName,
    currentYear,
    title: loginHeroContent.title,
    description: loginHeroContent.description,
    layout: loginHeroLayoutOverrides,
  };

  return (
    <AuthSplitLayout
      hero={heroProps}
      brandName={brandName}
      currentYear={currentYear}
      panelWrapperClassName="lg:grid-cols-[1.15fr_1fr]"
    >
      {view === "login" ? (
        <>
          <div className="space-y-4 text-center sm:text-left">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">Login</h2>
            <p className="text-sm text-white/60">
              Seja bem-vindo(a) ao {brandName}.<br />
              Faça login para continuar e ficar por dentro de todos os materiais da Construtora Tenda.
            </p>
          </div>

          <div className="space-y-4">
            {error && (
              <Alert
                variant="destructive"
                aria-live="assertive"
                className="border-red-500/40 bg-red-500/10 text-red-200"
              >
                <AlertDescription className="text-sm text-red-100">
                  {error}
                </AlertDescription>
              </Alert>
            )}



            {info && (
              <Alert
                className="border-white/15 bg-white/5 text-white"
                aria-live="polite"
              >
                <AlertDescription className="text-sm text-white/80">
                  {info}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-white"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  disabled={loading}
                  required
                  className="h-12 rounded-xl border-white/10 bg-white/5 text-base text-white placeholder:text-white/40 focus-visible:border-[#E4002B] focus-visible:ring-[#E4002B]/40"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-white"
                >
                  Senha
                </Label>
                <PasswordInput
                  id="password"
                  placeholder="********"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  required
                  className="h-12 rounded-xl border-white/10 bg-white/5 text-base text-white placeholder:text-white/40 focus-visible:border-[#E4002B] focus-visible:ring-[#E4002B]/40"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-white/60">
              <button
                type="button"
                onClick={switchToForgot}
                className="transition-colors hover:text-white"
              >
                Esqueci minha senha
              </button>

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

          <div className="space-y-2 pt-4 text-center text-[0.75rem] text-white/40 sm:text-xs">
            <p>Sistema de gestao digital de ativos imobiliarios</p>

            {adminEmail ? (
              <p className="text-white/55">
                Suporte:{" "}
                <a
                  className="underline transition-colors hover:text-white"
                  href={`mailto:${adminEmail}`}
                >
                  {adminEmail}
                </a>
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div className="space-y-4 text-center sm:text-left">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">
              Recuperar senha
            </h2>
            <p className="text-sm text-white/60">
              Informe o email cadastrado para receber um link seguro de
              redefinicao.
            </p>
          </div>

          <div className="space-y-4">
            {error && (
              <Alert
                variant="destructive"
                aria-live="assertive"
                className="border-red-500/40 bg-red-500/10 text-red-200"
              >
                <AlertDescription className="text-sm text-red-100">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {info && (
              <Alert
                className="border-white/15 bg-white/5 text-white"
                aria-live="polite"
              >
                <AlertDescription className="text-sm text-white/80">
                  {info}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <form onSubmit={handleForgotSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="forgot-email"
                className="text-sm font-medium text-white"
              >
                Email
              </Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="seu@email.com"
                value={forgotForm.email}
                onChange={(event) =>
                  setForgotForm({ email: event.target.value })
                }
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

          <div className="space-y-2 pt-4 text-center text-[0.75rem] text-white/40 sm:text-xs">
            <button
              type="button"
              onClick={switchToLogin}
              className="text-white underline-offset-4 hover:underline"
            >
              Voltar ao login
            </button>

          </div>
        </>
      )}
    </AuthSplitLayout>
  );
}


