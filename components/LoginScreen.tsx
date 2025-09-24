import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useConfig } from "../contexts/ConfigContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { Loader2, LogIn } from "lucide-react";
import Frame1000005813 from "../imports/Frame1000005813";

export function LoginScreen() {
  const { signIn, loading } = useAuth();
  const { systemSettings } = useConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const companyName = systemSettings.companyName || "ALL MKT";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Frame1000005813 />
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Entrar no {companyName}</CardTitle>
            <CardDescription className="text-center">
              Digite suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="mb-2">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="password" className="mb-2">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {systemSettings.twoFactor && (
                <Alert>
                  <AlertDescription>
                    A autenticação em duas etapas está ativa. Após o login, será solicitado um código adicional enviado ao seu email.
                  </AlertDescription>
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

            <div className="mt-6 text-sm text-center text-muted-foreground">
              <p className="mb-2">Credenciais de demonstração:</p>
              <div className="space-y-1 text-xs">
                <p>
                  <strong>Admin:</strong> admin@allmkt.com
                </p>
                <p>
                  <strong>Editor:</strong> editor@allmkt.com
                </p>
                <p>
                  <strong>Viewer:</strong> viewer@allmkt.com
                </p>
                <p>
                  <strong>Senha:</strong> 123456
                </p>
              </div>
              {systemSettings.adminEmail && (
                <p className="mt-4 text-xs">
                  Precisa de ajuda? <a className="underline" href={`mailto:${systemSettings.adminEmail}`}>Contate o administrador</a>.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
