import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { PasswordInput } from '../components/ui/password-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import { REGIONAL_OPTIONS } from '../lib/regionals';

export default function RegisterPage() {
    const router = useRouter();
    const { token } = router.query;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [invite, setInvite] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: '',
        password: '',
        confirmPassword: '',
        regional: '',
    });

    useEffect(() => {
        if (!router.isReady) return;

        if (!token || typeof token !== 'string') {
            setError('Token de convite inválido ou ausente.');
            setLoading(false);
            return;
        }

        validateToken(token);
    }, [router.isReady, token]);

    const validateToken = async (inviteToken: string) => {
        try {
            const { data, error } = await supabase
                .from('user_invites' as any)
                .select('*')
                .eq('token', inviteToken)
                .is('used_at', null)
                .single();

            if (error || !data) {
                throw new Error('Convite inválido ou expirado.');
            }

            setInvite(data);
        } catch (err: any) {
            setError(err.message || 'Erro ao validar convite.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invite) return;

        if (form.password !== form.confirmPassword) {
            toast.error('As senhas não coincidem.');
            return;
        }

        if (form.password.length < 6) {
            toast.error('A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        // Validate Regional for relevant roles
        const role = invite.role;
        const needsRegional = role === 'viewer' || role === 'editor_trade';

        if (needsRegional && !form.regional) {
            toast.error('Por favor, selecione sua regional.');
            return;
        }

        // If admin/editor_marketing, regional can be ignored or null
        const regionalToSave = needsRegional ? form.regional : null;

        setSubmitting(true);
        try {
            // 1. Create User in Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: invite.email,
                password: form.password,
                options: {
                    data: {
                        full_name: form.name,
                    },
                },
            });

            if (authError) throw authError;

            if (authData.user) {
                // 2. Call Secure Setup API to create Profile and Mark Invite Used
                // We do this server-side to ensure Role and Name are set correctly (bypassing RLS/Triggers limitations)
                const response = await fetch('/api/auth/setup-account', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        inviteToken: token, // Use the token from query
                        userId: authData.user.id,
                        name: form.name,
                        regional: regionalToSave,
                    }),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Erro ao configurar perfil.');
                }

                setSuccessMessage("Conta criada com sucesso! Verifique seu email para confirmar o cadastro antes de fazer login.");
                toast.success('Conta criada! Verifique seu email.');
            } else {
                // Sometimes weird state if email confirmation is strict?
                setSuccessMessage("Solicitação recebida. Verifique seu email para confirmar.");
            }

        } catch (err: any) {
            let errorMessage = err.message || 'Erro ao criar conta.';

            // Translate technical Supabase errors to user-friendly messages
            if (errorMessage.includes("rate limit")) {
                errorMessage = "Muitas tentativas recentes. Por favor, aguarde alguns instantes e tente novamente.";
            } else if (errorMessage.includes("User already registered")) {
                errorMessage = "Este email já está cadastrado.";
            }

            toast.error(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-950">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        );
    }

    if (successMessage) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-950 px-4">
                <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-green-500">Cadastro Realizado!</CardTitle>
                        <CardDescription className="text-zinc-300 text-lg mt-2">
                            {successMessage}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/')} className="w-full bg-white text-black hover:bg-zinc-200">
                            Ir para Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-950 px-4">
                <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-red-500">Erro no Convite</CardTitle>
                        <CardDescription className="text-zinc-400">{error}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/')} variant="outline" className="w-full">Voltar para o Login</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Determine if regional field is needed
    const needsRegional = invite?.role === 'viewer' || invite?.role === 'editor_trade';

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-white">Criar sua conta</h2>
                    <p className="mt-2 text-sm text-zinc-400">
                        Você foi convidado para acessar o DAM da Tenda como <strong>{invite?.role}</strong>.
                    </p>
                </div>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-zinc-300">Email</Label>
                                <Input
                                    value={invite.email}
                                    disabled
                                    className="bg-zinc-950 border-zinc-700 text-zinc-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-zinc-300">Nome Completo</Label>
                                <Input
                                    id="name"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                    placeholder="Seu nome"
                                    className="bg-zinc-950 border-zinc-700 text-white"
                                />
                            </div>

                            {needsRegional && (
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Regional *</Label>
                                    <Select
                                        value={form.regional}
                                        onValueChange={(val) => setForm({ ...form, regional: val })}
                                    >
                                        <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white">
                                            <SelectValue placeholder="Selecione sua regional" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {REGIONAL_OPTIONS.map((reg) => (
                                                <SelectItem key={reg.value} value={reg.value}>
                                                    {reg.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-zinc-500">
                                        Seus materiais serão filtrados por esta regional. Apenas admins podem alterar isso depois.
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-zinc-300">Crie uma Senha</Label>
                                <PasswordInput
                                    id="password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    required
                                    placeholder="******"
                                    className="bg-zinc-950 border-zinc-700 text-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm" className="text-zinc-300">Confirmar Senha</Label>
                                <PasswordInput
                                    id="confirm"
                                    value={form.confirmPassword}
                                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                                    required
                                    placeholder="******"
                                    className="bg-zinc-950 border-zinc-700 text-white"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-[#E4002B] hover:bg-[#E4002B]/90 text-white"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Criando conta...
                                    </>
                                ) : 'Finalizar Cadastro'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
            <Toaster />
        </div>
    );
}
