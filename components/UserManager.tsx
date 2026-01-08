import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Input } from "./ui/input";
import { PasswordInput } from "./ui/password-input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Users, Crown, Settings, Eye, Loader2, Pencil, Trash2, MapPin, Globe2, MailPlus, Copy, X } from "lucide-react";
import { UserRole } from "../types/enums";
import { useAuth } from "../contexts/AuthContext";
import { Database } from "../types/supabase";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { PageHeader } from "./PageHeader";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { REGIONAL_OPTIONS } from "../lib/regionals";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

interface DisplayUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
  regional: string | null;
  originScope: 'house' | 'ev' | 'tenda_vendas' | null;
  viewerAccessToAll: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InviteRow {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  created_at: string;
  used_at: string | null;
  created_by: string;
  material_origin_scope: 'house' | 'ev' | 'tenda_vendas' | null;
}

const ROLE_OPTIONS_ADMIN = [
  { value: UserRole.ADMIN, label: "Administrador" },
  { value: UserRole.EDITOR_MARKETING, label: "Editor Marketing" },
  { value: UserRole.EDITOR_TRADE, label: "Editor Trade" },
  { value: UserRole.VIEWER, label: "Visualizador" },
] as const;

const ROLE_OPTIONS_TRADE = [
  { value: UserRole.VIEWER, label: "Visualizador" },
] as const;

const ROLE_OPTIONS_MARKETING = [
  { value: UserRole.VIEWER, label: "Visualizador" },
  { value: UserRole.EDITOR_TRADE, label: "Editor Trade" },
] as const;

const ORIGIN_OPTIONS = [
  { value: "house", label: "House (Tenda)" },
  { value: "ev", label: "EV" },
  { value: "tenda_vendas", label: "Tenda Vendas" },
] as const;

function getRoleIcon(role: UserRole) {
  switch (role) {
    case UserRole.ADMIN:
      return <Crown className="w-4 h-4 text-yellow-500" />;
    case UserRole.EDITOR_MARKETING:
      return <Settings className="w-4 h-4 text-blue-500" />;
    case UserRole.EDITOR_TRADE:
      return <MapPin className="w-4 h-4 text-orange-500" />;
    case UserRole.VIEWER:
      return <Eye className="w-4 h-4 text-green-500" />;
    default:
      return <Users className="w-4 h-4 text-muted-foreground" />;
  }
}

function getRoleBadge(role: UserRole) {
  const variants = {
    [UserRole.ADMIN]: { label: "Admin", variant: "default" as const },
    [UserRole.EDITOR_MARKETING]: { label: "Editor Marketing", variant: "secondary" as const },
    [UserRole.EDITOR_TRADE]: { label: "Editor Trade", variant: "destructive" as const },
    [UserRole.VIEWER]: { label: "Visualizador", variant: "outline" as const },
  };
  return variants[role] ?? { label: role, variant: "outline" as const };
}

const mapRowToUser = (row: UserRow): DisplayUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: (row.role as UserRole) || UserRole.VIEWER,
  avatarUrl: row.avatar_url,
  regional: row.regional ? row.regional.toUpperCase() : null,
  originScope: row.material_origin_scope
    ? (row.material_origin_scope.toLowerCase() as 'house' | 'ev' | 'tenda_vendas')
    : null,
  viewerAccessToAll: Boolean(row.viewer_access_to_all),
  createdBy: row.created_by ?? null,
  createdAt: row.created_at || new Date().toISOString(),
  updatedAt: row.updated_at || new Date().toISOString(),
});

export function UserManager() {
  const { user: currentUser, session } = useAuth();
  const [users, setUsers] = useState<DisplayUser[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitesLoading, setInvitesLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  // User Management
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<DisplayUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<DisplayUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Invite Management
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.VIEWER);
  const [inviteOriginScope, setInviteOriginScope] = useState<'house' | 'ev' | 'tenda_vendas' | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "", // Only for creation
    role: UserRole.VIEWER,
    regional: "",
    originScope: null as 'house' | 'ev' | 'tenda_vendas' | null,
    viewerAccessToAll: false,
  });

  const canManageUsers = useMemo(() => {
    return currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.EDITOR_TRADE;
  }, [currentUser]);

  const fetchUsers = useCallback(async () => {
    if (!session?.access_token) return;

    try {
      setLoading(true);
      const response = await fetch('/api/admin/list-users', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao carregar usuários');
      }

      const data = await response.json();
      setUsers((data || []).map(mapRowToUser));
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  const fetchInvites = useCallback(async () => {
    if (!canManageUsers || !supabase) return;
    try {
      setInvitesLoading(true);
      const { data, error } = await supabase
        .from("user_invites" as any)
        .select("*")
        .is("used_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvites((data as unknown as InviteRow[]) || []);
    } catch (err) {
      console.error("Error fetching invites:", err);
    } finally {
      setInvitesLoading(false);
    }
  }, [canManageUsers]);

  useEffect(() => {
    fetchUsers();
    fetchInvites();
  }, [fetchUsers, fetchInvites]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  // --- Handlers: Invites ---

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    if (!supabase) return;

    setInviteLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_invites" as any)
        .insert({
          email: inviteEmail,
          role: inviteRole,
          created_by: currentUser?.id,
          material_origin_scope: inviteOriginScope
        })
        .select()
        .single();

      if (error) {
        // Handle "Unique constraint" error (Email already invited)
        if (error.message?.includes("unique")) {
          // 1. Check if the user is already registered (Active user)
          const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("email", inviteEmail)
            .maybeSingle();

          if (existingUser) {
            throw new Error("Este usuário já está cadastrado no sistema.");
          }

          // 2. If user is NOT registered, it means we have an orphaned/stale invite.
          // We can offer to overwrite/resend, or just do it automatically if it's cleaner.
          // Let's create a NEW invite by deleting the old one first.

          // Delete old invite
          const { error: deleteOldError } = await supabase
            .from("user_invites" as any)
            .delete()
            .eq("email", inviteEmail);

          if (deleteOldError) {
            console.error("Erro ao limpar convite antigo:", deleteOldError);
            throw new Error("Já existe um convite pendente e não foi possível substituí-lo.");
          }

          // Retry creation
          const { data: retryData, error: retryError } = await supabase
            .from("user_invites" as any)
            .insert({
              email: inviteEmail,
              role: inviteRole,
              created_by: currentUser?.id,
              material_origin_scope: inviteOriginScope
            })
            .select()
            .single();

          if (retryError) throw retryError;

          toast.success("Convite antigo substituído e enviado com sucesso!");
          setInviteEmail("");
          setInviteOriginScope(null);
          setIsInviteOpen(false);
          fetchInvites();
          return; // Exit function on success
        }
        throw error;
      }

      toast.success("Convite criado com sucesso!");
      setInviteEmail("");
      setInviteOriginScope(null);
      setIsInviteOpen(false);
      fetchInvites();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao criar convite.");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyInviteLink = (token: string) => {
    const link = `${window.location.origin}/register?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado para a área de transferência!");
  };

  const handleRevokeInvite = async (id: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from("user_invites" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Convite revogado.");
      fetchInvites();
    } catch (err) {
      toast.error("Erro ao revogar convite.");
    }
  };

  // --- Handlers: Users ---

  // --- Handlers: Users ---

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      if (!session?.access_token) {
        throw new Error("Sessão inválida. Tente fazer login novamente.");
      }

      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: formData.role,
          regional: formData.regional || null,
          originScope: formData.originScope,
          viewerAccessToAll: formData.viewerAccessToAll,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar usuário.");
      }

      toast.success("Usuário criado com sucesso!");
      setIsUserOpen(false);
      fetchUsers();
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar usuário.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!supabase) return;
    setActionLoading(true);

    try {
      if (!session?.access_token) {
        throw new Error("Sessão inválida. Tente fazer login novamente.");
      }

      const response = await fetch("/api/admin/update-user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: editingUser.id,
          email: editingUser.email,
          name: formData.name,
          role: formData.role,
          regional: formData.regional || null,
          originScope: formData.originScope,
          viewerAccessToAll: formData.viewerAccessToAll
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao atualizar usuário.");
      }

      toast.success("Usuário atualizado com sucesso!");
      setEditingUser(null);
      fetchUsers();
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar usuário.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setActionLoading(true);

    try {
      if (!session?.access_token) {
        throw new Error("Sessão inválida. Tente fazer login novamente.");
      }

      const response = await fetch("/api/admin/delete-user", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: deletingUser.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao excluir usuário.");
      }

      toast.success("Usuário removido.");
      setDeletingUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover usuário.");
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: UserRole.VIEWER,
      regional: "",
      originScope: null,
      viewerAccessToAll: false,
    });
  };

  const openEdit = (user: DisplayUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      regional: user.regional || "",
      originScope: user.originScope,
      viewerAccessToAll: user.viewerAccessToAll,
    });
  };

  if (!isSupabaseConfigured()) {
    return (
      <Card className="border-yellow-500/50 bg-yellow-500/10">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <p>Supabase não configurado. Adicione as credenciais no arquivo .env</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="users" className="w-full space-y-6">
        <PageHeader
          icon={Users}
          title="Usuários"
          description="Gerencie o acesso e permissões da equipe"
          className="w-full"
          action={
            <TabsList className="grid w-full md:w-auto grid-cols-2 bg-muted/50 p-1.5 h-auto rounded-xl">
              <TabsTrigger value="users" className="transition-all hover:bg-background/60 data-[state=active]:hover:bg-background py-2 px-6">Usuários Ativos</TabsTrigger>
              <TabsTrigger value="invites" className="transition-all hover:bg-background/60 data-[state=active]:hover:bg-background py-2 px-6">Convites Pendentes</TabsTrigger>
            </TabsList>
          }
        />

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-end justify-between gap-4">
                <div className="w-full max-w-sm space-y-2">
                  <Label>Busque usuários</Label>
                  <div className="relative">
                    <Users className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManageUsers && (
                    <Button onClick={() => { resetForm(); setIsUserOpen(true); }} className="bg-[#E4002B] hover:bg-[#E4002B]/90 h-10 rounded-lg shadow-sm font-medium">
                      <Users className="mr-2 h-4 w-4" />
                      Criar Manualmente
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={user.avatarUrl || undefined} />
                          <AvatarFallback>
                            {user.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={getRoleBadge(user.role).variant}>
                            {getRoleBadge(user.role).label}
                          </Badge>
                          {user.regional && (
                            <Badge variant="outline" className="text-xs">
                              {user.regional}
                            </Badge>
                          )}
                          {user.originScope && (
                            <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10">
                              {ORIGIN_OPTIONS.find(opt => opt.value === user.originScope)?.label || user.originScope}
                            </Badge>
                          )}
                        </div>
                        {canManageUsers && (
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeletingUser(user)}
                              disabled={user.id === currentUser?.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invites" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <CardTitle>Gerenciar Convites</CardTitle>
                  <CardDescription>Envie convites por email para novos membros</CardDescription>
                </div>
                {canManageUsers && (
                  <Button onClick={() => setIsInviteOpen(true)} className="bg-[#E4002B] hover:bg-[#E4002B]/90 h-10 rounded-lg shadow-sm font-medium" >
                    <MailPlus className="mr-2 h-4 w-4" />
                    Novo Convite
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {invitesLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {invites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="space-y-1">
                        <p className="font-medium">{invite.email}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant={getRoleBadge(invite.role).variant} className="text-xs">
                            {getRoleBadge(invite.role).label}
                          </Badge>
                          <span>• Criado em {format(new Date(invite.created_at), "dd/MM/yyyy HH:mm")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleCopyInviteLink(invite.token)}>
                          <Copy className="mr-2 h-3 w-3" />
                          Copiar Link
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleRevokeInvite(invite.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {invites.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MailPlus className="mx-auto h-12 w-12 opacity-20 mb-3" />
                      <p>Nenhum convite pendente.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Usuário</DialogTitle>
            <DialogDescription>
              Gere um link de convite para um novo membro.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateInvite} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Função</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as UserRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentUser?.role === UserRole.ADMIN ? (
                    ROLE_OPTIONS_ADMIN.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))
                  ) : (
                    ROLE_OPTIONS_TRADE.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {(inviteRole === UserRole.EDITOR_TRADE || inviteRole === UserRole.VIEWER) && (
              <div className="space-y-2">
                <Label>Escopo de Origem (Opcional)</Label>
                <Select
                  value={inviteOriginScope || "all"}
                  onValueChange={(v) => setInviteOriginScope(v === "all" ? null : v as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um escopo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {ORIGIN_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={inviteLoading}>
                {inviteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gerar Convite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create/Edit User Dialog */}
      <Dialog open={isUserOpen || !!editingUser
      } onOpenChange={(open) => {
        if (!open) {
          setIsUserOpen(false);
          setEditingUser(null);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Edite os dados do usuário.' : 'Crie um novo usuário manualmente.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editingUser ? handleEditUser : handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={!!editingUser}
                className={editingUser ? "bg-muted" : ""}
              />
            </div>
            {!editingUser && (
              <div className="space-y-2">
                <Label>Senha</Label>
                <PasswordInput
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Função</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentUser?.role === UserRole.ADMIN ? (
                    ROLE_OPTIONS_ADMIN.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))
                  ) : (
                    ROLE_OPTIONS_TRADE.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {(formData.role === UserRole.EDITOR_TRADE || formData.role === UserRole.VIEWER) && (
              <div className="space-y-2">
                <Label>Regional (Opcional)</Label>
                <Select
                  value={formData.regional}
                  onValueChange={(v) => setFormData({ ...formData, regional: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma regional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {REGIONAL_OPTIONS.map((reg) => (
                      <SelectItem key={reg.value} value={reg.value}>
                        {reg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(formData.role === UserRole.EDITOR_TRADE || formData.role === UserRole.VIEWER) && (
              <div className="space-y-2">
                <Label>Escopo de Origem (Opcional)</Label>
                <Select
                  value={formData.originScope || "all"}
                  onValueChange={(v) => setFormData({ ...formData, originScope: v === "all" ? null : v as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um escopo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {ORIGIN_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsUserOpen(false); setEditingUser(null); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={actionLoading}>
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingUser ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog >

      {/* Delete User Alert */}
      < AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá o acesso do usuário <strong>{deletingUser?.name}</strong> ao sistema.
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive hover:bg-destructive/90"
              disabled={actionLoading}
            >
              {actionLoading ? "Removendo..." : "Remover Usuário"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog >
    </div >
  );
}
