import React, { useEffect, useMemo, useState } from "react";
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
import { Users, Crown, Settings, Eye, Loader2, Pencil, Trash2 } from "lucide-react";
import { UserRole } from "../types/enums";
import { useAuth } from "../contexts/AuthContext";
import { Database } from "../types/supabase";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

interface DisplayUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

function getRoleIcon(role: UserRole) {
  switch (role) {
    case UserRole.ADMIN:
      return <Crown className="w-4 h-4 text-yellow-500" />;
    case UserRole.EDITOR:
      return <Settings className="w-4 h-4 text-blue-500" />;
    case UserRole.VIEWER:
      return <Eye className="w-4 h-4 text-green-500" />;
    default:
      return <Users className="w-4 h-4 text-muted-foreground" />;
  }
}

function getRoleBadge(role: UserRole) {
  const variants = {
    [UserRole.ADMIN]: { label: "Admin", variant: "default" as const },
    [UserRole.EDITOR]: { label: "Editor", variant: "secondary" as const },
    [UserRole.VIEWER]: { label: "Visualizador", variant: "outline" as const },
  };
  return variants[role];
}

const mapRowToUser = (row: UserRow): DisplayUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role as UserRole,
  avatar_url: row.avatar_url,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

type DialogMode = "create" | "edit";

export function UserManager() {
  const { user: currentUser, session } = useAuth();
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const [users, setUsers] = useState<DisplayUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("create");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [creatingOrUpdating, setCreatingOrUpdating] = useState(false);
  const [userToDelete, setUserToDelete] = useState<DisplayUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formValues, setFormValues] = useState({
    name: "",
    email: "",
    password: "",
    role: UserRole.VIEWER,
  });

  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      setUsers([]);
      toast.error('Supabase não configurado. Verifique as variáveis de ambiente.');
      setLoading(false);
      return;
    }

    const loadUsers = async () => {
      if (!supabase) {
        setUsers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, name, email, role, avatar_url, created_at, updated_at")
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        setUsers((data ?? []).map(mapRowToUser));
      } catch (error: any) {
        console.error("[UserManager] Falha ao carregar usuarios", error);
        toast.error(error.message ?? "Nao foi possivel carregar os usuarios");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    void loadUsers();
  }, [configured]);

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === UserRole.ADMIN).length;
    const editors = users.filter((u) => u.role === UserRole.EDITOR).length;
    const viewers = users.filter((u) => u.role === UserRole.VIEWER).length;

    return {
      total,
      active: total,
      admins,
      editors,
      viewers,
    };
  }, [users]);

  if (!configured) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Supabase não configurado</AlertTitle>
        <AlertDescription>
          Configure as variáveis de ambiente do Supabase e reinicie o servidor para gerenciar usuários.
        </AlertDescription>
      </Alert>
    );
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormValues((previous) => ({ ...previous, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    if (value === UserRole.ADMIN || value === UserRole.EDITOR || value === UserRole.VIEWER) {
      setFormValues((previous) => ({ ...previous, role: value }));
    }
  };

  const resetForm = () => {
    setFormValues({ name: "", email: "", password: "", role: UserRole.VIEWER });
    setEditingUserId(null);
    setDialogMode("create");
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogMode("create");
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: DisplayUser) => {
    setDialogMode("edit");
    setEditingUserId(user.id);
    setFormValues({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
    });
    setIsDialogOpen(true);
  };

  const refreshUsers = async () => {
    if (!supabase) {
      throw new Error('Supabase não configurado.');
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, role, avatar_url, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[UserManager] Falha ao atualizar usuarios", error);
      toast.error("Nao foi possivel atualizar a lista de usuarios");
      return;
    }

    setUsers((data ?? []).map(mapRowToUser));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formValues.name.trim() || !formValues.email.trim()) {
      toast.error("Preencha nome e email.");
      return;
    }

    if (dialogMode === "create" && !formValues.password.trim()) {
      toast.error("Informe uma senha provisoria.");
      return;
    }

    if (!session?.access_token) {
      toast.error("Sessao invalida. Faca login novamente.");
      return;
    }

    if (dialogMode === "edit" && !editingUserId) {
      toast.error("Selecione um usuario para editar.");
      return;
    }

    setCreatingOrUpdating(true);
    try {
      const endpoint = dialogMode === "create" ? "/api/admin/create-user" : "/api/admin/update-user";
      const method = dialogMode === "create" ? "POST" : "PUT";
      const payload: Record<string, unknown> = {
        name: formValues.name.trim(),
        email: formValues.email.trim(),
        role: formValues.role,
      };

      if (dialogMode === "create") {
        payload.password = formValues.password;
      } else if (formValues.password.trim()) {
        payload.password = formValues.password.trim();
      }

      if (dialogMode === "edit") {
        payload.id = editingUserId;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Nao foi possivel salvar o usuario.");
      }

      toast.success(dialogMode === "create" ? "Usuario criado com sucesso!" : "Usuario atualizado com sucesso!");
      setIsDialogOpen(false);
      resetForm();
      await refreshUsers();
    } catch (error: any) {
      console.error("[UserManager] Falha ao salvar usuario", error);
      toast.error(error.message ?? "Nao foi possivel salvar o usuario.");
    } finally {
      setCreatingOrUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete || !session?.access_token) {
      setUserToDelete(null);
      return;
    }

    if (userToDelete.id === currentUser?.id) {
      toast.error("Voce nao pode excluir a propria conta.");
      setUserToDelete(null);
      return;
    }

    setDeleteLoading(true);
    try {
      const response = await fetch("/api/admin/delete-user", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: userToDelete.id }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Nao foi possivel excluir o usuario.");
      }

      toast.success("Usuario excluido com sucesso!");
      setUserToDelete(null);
      await refreshUsers();
    } catch (error: any) {
      console.error("[UserManager] Falha ao excluir usuario", error);
      toast.error(error.message ?? "Nao foi possivel excluir o usuario.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Gerenciamento de Usuarios
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie usuarios e permissoes do sistema</p>
        </div>

        <Button className="bg-primary hover:bg-primary/90" onClick={openCreateDialog} disabled={!isAdmin}>
          <Users className="w-4 h-4 mr-2" />
          Novo Usuario
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Usuarios cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Usuarios ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Crown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Editores</CardTitle>
            <Settings className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.editors}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visualizadores</CardTitle>
            <Eye className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.viewers}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios do Sistema</CardTitle>
          <CardDescription>Lista de todos os usuarios cadastrados no sistema</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Carregando usuarios...</div>
          ) : users.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Nenhum usuario encontrado. Crie o primeiro usuario para comecar.</div>
          ) : (
            <div className="space-y-0">
              {users.map((user) => {
                const roleBadge = getRoleBadge(user.role);
                const roleIcon = getRoleIcon(user.role);
                const initials = user.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase();
                let lastInteraction = "--";
                if (user.updated_at) {
                  try {
                    lastInteraction = formatDistanceToNow(new Date(user.updated_at), { addSuffix: true });
                  } catch (error) {
                    lastInteraction = "--";
                  }
                }

                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="w-10 h-10">
                        {user.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.name} /> : null}
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{user.name}</h3>
                          {user.id === currentUser?.id && (
                            <Badge variant="outline" className="text-xs">
                              Voce
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span className="truncate">{user.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {roleIcon}
                        <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                      </div>

                      <div className="text-xs text-muted-foreground min-w-[120px] text-right">{lastInteraction}</div>

                      {isAdmin ? (
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setUserToDelete(user)}
                            disabled={user.id === currentUser?.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" disabled>
                          Editar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === "edit" ? "Editar Usuario" : "Novo Usuario"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "edit"
                ? "Atualize os dados do usuario selecionado."
                : "Informe os dados do usuario que recebera acesso ao sistema."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                value={formValues.name}
                onChange={handleInputChange}
                placeholder="Ex: Maria Souza"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formValues.email}
                onChange={handleInputChange}
                placeholder="usuario@empresa.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {dialogMode === "edit" ? "Nova senha (opcional)" : "Senha provisoria"}
              </Label>
                <PasswordInput
                  id="password"
                  name="password"
                  value={formValues.password}
                  onChange={handleInputChange}
                  placeholder={dialogMode === "edit" ? "Deixe em branco para manter a senha" : "Defina uma senha inicial"}
                />
              {dialogMode === "edit" && (
                <p className="text-xs text-muted-foreground">Deixe em branco para manter a senha atual.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Perfil de acesso</Label>
              <Select value={formValues.role} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.ADMIN}>Administrador</SelectItem>
                  <SelectItem value={UserRole.EDITOR}>Editor</SelectItem>
                  <SelectItem value={UserRole.VIEWER}>Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={creatingOrUpdating}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creatingOrUpdating}>
                {creatingOrUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : dialogMode === "edit" ? (
                  "Salvar alteracoes"
                ) : (
                  "Criar usuario"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={userToDelete !== null} onOpenChange={(open) => {
        if (!open) {
          setUserToDelete(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuario</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao removera o usuario selecionado do sistema. Esta operacao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading} onClick={() => setUserToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
