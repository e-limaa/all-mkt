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
import { Users, Crown, Settings, Eye, Loader2, Pencil, Trash2, MapPin, Globe2 } from "lucide-react";
import { UserRole } from "../types/enums";
import { useAuth } from "../contexts/AuthContext";
import { Database } from "../types/supabase";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { REGIONAL_OPTIONS } from "../lib/regionals";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

interface DisplayUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
  regional: string | null;
  originScope: 'house' | 'ev' | null;
  viewerAccessToAll: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
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
  role: row.role as UserRole,
  avatarUrl: row.avatar_url,
  regional: row.regional ? row.regional.toUpperCase() : null,
  originScope: row.material_origin_scope
    ? (row.material_origin_scope.toLowerCase() as 'house' | 'ev')
    : null,
  viewerAccessToAll: Boolean(row.viewer_access_to_all),
  createdBy: row.created_by ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

type DialogMode = "create" | "edit";

export function UserManager() {
  const { user: currentUser, session } = useAuth();
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isEditorTrade = currentUser?.role === UserRole.EDITOR_TRADE;
  const isEditorMarketing = currentUser?.role === UserRole.EDITOR_MARKETING;
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
    regional: "",
    originScope: "",
    viewerAccessToAll: false,
  });

  const canCreateUsers = Boolean(isAdmin || isEditorTrade || isEditorMarketing);
  const configured = isSupabaseConfigured();
  const availableRoleOptions = useMemo(() => {
    if (isAdmin) {
      return ROLE_OPTIONS_ADMIN;
    }
    if (isEditorMarketing) {
      return ROLE_OPTIONS_MARKETING;
    }
    if (isEditorTrade) {
      return ROLE_OPTIONS_TRADE;
    }
    return [] as typeof ROLE_OPTIONS_ADMIN;
  }, [isAdmin, isEditorMarketing, isEditorTrade]);
  const isRoleSelectionFixed = availableRoleOptions.length <= 1;
  const currentRoleOption =
    availableRoleOptions.find((option) => option.value === formValues.role) ??
    availableRoleOptions[0] ??
    null;

  const fetchUsersList = useCallback(
    async () => {
      if (!supabase) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const baseSelect =
        "id, name, email, role, avatar_url, regional, viewer_access_to_all, created_by, created_at, updated_at";
      const selectWithOrigin = `${baseSelect}, material_origin_scope`;

      let query = supabase
        .from("users")
        .select(selectWithOrigin)
        .order("created_at", { ascending: false });

      if (isEditorTrade && currentUser?.id) {
        query = query.eq("created_by", currentUser.id);
      }

      let { data, error } = await query;

      if (error && (error.message || "").includes("material_origin_scope")) {
        let fallbackQuery = supabase
          .from("users")
          .select(baseSelect)
          .order("created_at", { ascending: false });
        if (isEditorTrade && currentUser?.id) {
          fallbackQuery = fallbackQuery.eq("created_by", currentUser.id);
        }
        const fallback = await fallbackQuery;
        if (!fallback.error) {
          const fallbackData = (fallback.data ?? []) as Array<Omit<UserRow, "material_origin_scope">>;
          data = fallbackData.map((row) => ({
            ...row,
            material_origin_scope: null as UserRow["material_origin_scope"],
          }));
          error = null;
        } else {
          error = fallback.error;
        }
      }

      if (error) {
        throw error;
      }

      const mapped = (data ?? []).map(mapRowToUser);
      setUsers(
        isEditorTrade && currentUser?.id
          ? mapped.filter((user) => user.createdBy === currentUser.id)
          : mapped
      );
    },
    [currentUser?.id, isEditorTrade]
  );

  useEffect(() => {
    if (!configured) {
      setUsers([]);
      toast.error('Supabase n?o configurado. Verifique as vari?veis de ambiente.');
      setLoading(false);
      return;
    }

    const loadUsers = async () => {
      setLoading(true);
      try {
        await fetchUsersList();
      } catch (error) {
        console.error("[UserManager] Falha ao carregar usuarios", error);
        const message = error instanceof Error ? error.message : "Nao foi possivel carregar os usuarios";
        toast.error(message);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    void loadUsers();
  }, [configured, fetchUsersList]);

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === UserRole.ADMIN).length;
    const marketingEditors = users.filter((u) => u.role === UserRole.EDITOR_MARKETING).length;
    const tradeEditors = users.filter((u) => u.role === UserRole.EDITOR_TRADE).length;
    const viewers = users.filter((u) => u.role === UserRole.VIEWER).length;
    const viewersGlobal = users.filter(
      (u) => u.role === UserRole.VIEWER && u.viewerAccessToAll
    ).length;

    return {
      total,
      admins,
      marketingEditors,
      tradeEditors,
      viewers,
      viewersGlobal,
    };
  }, [users]);

  const regionalIsRequired =
    formValues.role === UserRole.EDITOR_TRADE ||
    (formValues.role === UserRole.VIEWER && !formValues.viewerAccessToAll);

  const originIsRequired =
    formValues.role === UserRole.VIEWER && !formValues.viewerAccessToAll;

  const shouldShowOriginSelect =
    formValues.role === UserRole.VIEWER && !formValues.viewerAccessToAll;

  const disableRegionalSelect =
    (formValues.role === UserRole.EDITOR_TRADE && isEditorTrade) ||
    (formValues.role === UserRole.VIEWER && isEditorTrade);

  const allowedOriginOptions = useMemo(() => ORIGIN_OPTIONS, []);

  if (!configured) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Supabase n?o configurado</AlertTitle>
        <AlertDescription>
          Configure as vari?veis de ambiente do Supabase e reinicie o servidor para gerenciar usu?rios.
        </AlertDescription>
      </Alert>
    );
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormValues((previous) => ({ ...previous, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    const nextRole = value as UserRole;

    if (!availableRoleOptions.some((option) => option.value === nextRole)) {
      return;
    }

    setFormValues((previous) => {
      const updated = { ...previous, role: nextRole };

      if (nextRole === UserRole.EDITOR_TRADE) {
        updated.viewerAccessToAll = false;
        if (isEditorTrade) {
          updated.regional = (currentUser?.regional ?? "").toUpperCase();
        } else {
          updated.regional = "";
        }
        updated.originScope = "";
      } else if (nextRole === UserRole.VIEWER) {
        if (isEditorTrade) {
          updated.viewerAccessToAll = false;
          updated.regional = (currentUser?.regional ?? "").toUpperCase();
        }
        updated.originScope = "";
      } else {
        updated.viewerAccessToAll = false;
        updated.originScope = "";
      }

      return updated;
    });
  };

  const handleViewerAccessChange = (checked: boolean | "indeterminate") => {
    setFormValues((previous) => ({
      ...previous,
      viewerAccessToAll: Boolean(checked),
      regional: Boolean(checked) ? "" : previous.regional,
      originScope: Boolean(checked) ? "" : previous.originScope,
    }));
  };

  const resetForm = (presetRole?: UserRole) => {
    const defaultRole =
      presetRole ??
      (availableRoleOptions.length > 0
        ? availableRoleOptions[0].value
        : UserRole.VIEWER);

    const shouldForceRegional =
      defaultRole === UserRole.EDITOR_TRADE ||
      (defaultRole === UserRole.VIEWER && isEditorTrade);

    setFormValues({
      name: "",
      email: "",
      password: "",
      role: defaultRole,
      regional: shouldForceRegional
        ? (currentUser?.regional ?? "").toUpperCase()
        : "",
      originScope: "",
      viewerAccessToAll: false,
    });
    setEditingUserId(null);
    setDialogMode("create");
  };

  const openCreateDialog = () => {
    if (!canCreateUsers) {
      toast.error("Voc\u00ea n\u00e3o possui permiss\u00e3o para criar usu\u00e1rios.");
      return;
    }

    resetForm();
    setDialogMode("create");
    setIsDialogOpen(true);
  };

  const canManageUser = (target: DisplayUser) => {
    if (isAdmin) return true;
    if (isEditorMarketing) {
      if (target.role === UserRole.ADMIN || target.role === UserRole.EDITOR_MARKETING) {
        return false;
      }
      return target.role === UserRole.EDITOR_TRADE || target.role === UserRole.VIEWER;
    }
    if (isEditorTrade) {
      if (target.role !== UserRole.VIEWER) return false;
      if (target.viewerAccessToAll) return false;
      const currentRegional = (currentUser?.regional ?? "").toUpperCase();
      return Boolean(currentRegional) && target.regional === currentRegional;
    }
    return false;
  };

  const openEditDialog = (user: DisplayUser) => {
    if (!canManageUser(user)) {
      toast.error("Voc\u00ea n\u00e3o possui permiss\u00e3o para editar este usu\u00e1rio.");
      return;
    }

    setDialogMode("edit");
    setEditingUserId(user.id);
    setFormValues({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      regional: user.regional ?? "",
      originScope: user.originScope ?? "",
      viewerAccessToAll: user.viewerAccessToAll,
    });
    setIsDialogOpen(true);
  };

  const refreshUsers = async () => {
    if (!supabase) {
      throw new Error('Supabase n?o configurado.');
    }

    try {
      await fetchUsersList();
    } catch (error) {
      console.error("[UserManager] Falha ao atualizar usuarios", error);
      toast.error("Nao foi possivel atualizar a lista de usuarios");
    }
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

    if (dialogMode === "create" && !canCreateUsers) {
      toast.error("Voce nao possui permissao para criar usuarios.");
      return;
    }

    if (dialogMode === "edit" && editingUserId) {
      const target = users.find((user) => user.id === editingUserId);
      if (target && !canManageUser(target)) {
        toast.error("Voce nao possui permissao para editar este usuario.");
        return;
      }
    }

    const desiredRole = formValues.role;
    if (!availableRoleOptions.some((option) => option.value === desiredRole)) {
      toast.error("Perfil selecionado nao permitido.");
      return;
    }
    if (
      isEditorMarketing &&
      (desiredRole === UserRole.ADMIN || desiredRole === UserRole.EDITOR_MARKETING)
    ) {
      toast.error("Editor Marketing nao pode selecionar este perfil.");
      return;
    }

    let normalizedRegional = formValues.regional.trim().toUpperCase();
    let normalizedViewerGlobal = formValues.viewerAccessToAll;
    let normalizedOriginScope = (formValues.originScope || "").trim().toLowerCase();

    if (desiredRole === UserRole.EDITOR_TRADE) {
      normalizedViewerGlobal = false;
      normalizedOriginScope = "";
      if (isEditorTrade) {
        const currentRegional = (currentUser?.regional ?? "").toUpperCase();
        if (!currentRegional) {
          toast.error("Seu perfil nao possui regional definida.");
          return;
        }
        normalizedRegional = currentRegional;
      } else if (!normalizedRegional) {
        toast.error("Selecione a regional para o Editor Trade.");
        return;
      }
    } else if (desiredRole === UserRole.EDITOR_MARKETING) {
      normalizedRegional = "";
      normalizedOriginScope = "";
    }

    if (desiredRole === UserRole.VIEWER) {
      if (isEditorTrade) {
        normalizedViewerGlobal = false;
        const currentRegional = (currentUser?.regional ?? "").toUpperCase();
        if (!currentRegional) {
          toast.error("Seu perfil nao possui regional definida.");
          return;
        }
        normalizedRegional = currentRegional;
        if (!normalizedOriginScope || (normalizedOriginScope !== "house" && normalizedOriginScope !== "ev")) {
          toast.error("Selecione a origem (House ou EV) para o viewer.");
          return;
        }
      } else if (normalizedViewerGlobal) {
        normalizedRegional = "";
        normalizedOriginScope = "";
      } else {
        if (!normalizedRegional) {
          toast.error("Defina uma regional ou marque acesso a todas.");
          return;
        }
        if (!normalizedOriginScope || (normalizedOriginScope !== "house" && normalizedOriginScope !== "ev")) {
          toast.error("Selecione a origem (House ou EV) para o viewer.");
          return;
        }
      }
    } else {
      normalizedViewerGlobal = false;
      normalizedOriginScope = "";
    }

    const payload: Record<string, unknown> = {
      name: formValues.name.trim(),
      email: formValues.email.trim(),
      role: desiredRole,
      regional: normalizedRegional ? normalizedRegional : null,
      originScope:
        normalizedOriginScope && (normalizedOriginScope === "house" || normalizedOriginScope === "ev")
          ? normalizedOriginScope
          : null,
      viewerAccessToAll: normalizedViewerGlobal,
    };

    if (dialogMode === "create") {
      payload.password = formValues.password;
    } else if (formValues.password.trim()) {
      payload.password = formValues.password.trim();
    }

    if (dialogMode === "edit") {
      payload.id = editingUserId;
    }

    setCreatingOrUpdating(true);

    try {
      const endpoint =
        dialogMode === "create" ? "/api/admin/create-user" : "/api/admin/update-user";
      const method = dialogMode === "create" ? "POST" : "PUT";

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

      toast.success(
        dialogMode === "create"
          ? "Usuario criado com sucesso!"
          : "Usuario atualizado com sucesso!"
      );
      setIsDialogOpen(false);
      resetForm();
      await refreshUsers();
    } catch (error) {
      console.error("[UserManager] Falha ao salvar usuario", error);
      const message = error instanceof Error ? error.message : "Nao foi possivel salvar o usuario.";
      toast.error(message);
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

    if (!canManageUser(userToDelete)) {
      toast.error("Voce nao possui permissao para excluir este usuario.");
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
    } catch (error) {
      console.error("[UserManager] Falha ao excluir usuario", error);
      const message = error instanceof Error ? error.message : "Nao foi possivel excluir o usuario.";
      toast.error(message);
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

        <Button
          className="bg-primary hover:bg-primary/90"
          onClick={openCreateDialog}
          disabled={!canCreateUsers}
        >
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
            <CardTitle className="text-sm font-medium">Visualizadores</CardTitle>
            <Eye className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.viewers}</div>
            <p className="text-xs text-muted-foreground">
              Globais: {stats.viewersGlobal}
            </p>
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
            <CardTitle className="text-sm font-medium">Editores Marketing</CardTitle>
            <Settings className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.marketingEditors}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Editores Trade</CardTitle>
            <MapPin className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tradeEditors}</div>
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
                if (user.updatedAt) {
                  try {
                    lastInteraction = formatDistanceToNow(new Date(user.updatedAt), { addSuffix: true });
                  } catch (error) {
                    lastInteraction = "--";
                  }
                }
                const canEditUser = canManageUser(user);
                const canDeleteUser =
                  canEditUser &&
                  user.id !== currentUser?.id &&
                  (
                    isAdmin ||
                    (isEditorTrade && user.role === UserRole.VIEWER) ||
                    (
                      isEditorMarketing &&
                      (user.role === UserRole.VIEWER || user.role === UserRole.EDITOR_TRADE)
                    )
                  );

                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="w-10 h-10">
                        {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name} /> : null}
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
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="inline-flex items-center gap-1">
                            {user.regional ? (
                              <MapPin className="w-3 h-3" />
                            ) : (
                              <Globe2 className="w-3 h-3" />
                            )}
                            {user.regional ? user.regional : "Todas as regionais"}
                          </span>
                          {user.originScope && (
                            <span className="inline-flex items-center gap-1">
                              <Globe2 className="w-3 h-3" />
                              {user.originScope === "house" ? "House" : "EV"}
                            </span>
                          )}
                          {user.role === UserRole.VIEWER && user.viewerAccessToAll && (
                            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                              Viewer Global
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {roleIcon}
                        <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                      </div>

                      <div className="text-xs text-muted-foreground min-w-[120px] text-right">{lastInteraction}</div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                          disabled={!canEditUser}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setUserToDelete(user)}
                          disabled={!canDeleteUser}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                value={formValues.name}
                onChange={handleInputChange}
                placeholder="Ex: Maria Souza"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
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
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
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
                  autoComplete={dialogMode === "edit" ? "new-password" : "new-password"}
                />
              {dialogMode === "edit" && (
                <p className="text-xs text-muted-foreground">Deixe em branco para manter a senha atual.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Perfil de acesso</Label>
              {isRoleSelectionFixed ? (
                <div className="flex h-10 items-center rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground">
                  {currentRoleOption?.label ?? "Visualizador"}
                </div>
              ) : (
                <Select
                  value={formValues.role}
                  onValueChange={handleRoleChange}
                  disabled={!isAdmin}
                >
                  <SelectTrigger className="bg-input-background border-border">
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {isAdmin && formValues.role === UserRole.VIEWER && (
              <div className="flex items-center gap-2">
                <input
                  id="viewerAccessToAll"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={formValues.viewerAccessToAll}
                  onChange={(event) => handleViewerAccessChange(event.target.checked)}
                />
                <Label
                  htmlFor="viewerAccessToAll"
                  className="cursor-pointer select-none text-sm"
                >
                  Viewer com acesso a todas as regionais
                </Label>
              </div>
            )}

            {(formValues.role === UserRole.EDITOR_TRADE ||
              (formValues.role === UserRole.VIEWER && !formValues.viewerAccessToAll)) && (
              <div className="space-y-2">
                <Label htmlFor="regional">
                  Regional {regionalIsRequired ? "*" : ""}
                </Label>
                <Select
                  value={formValues.regional}
                  onValueChange={(value) =>
                    setFormValues((previous) => ({
                      ...previous,
                      regional: value,
                    }))
                  }
                  disabled={disableRegionalSelect}
                >
                  <SelectTrigger
                    id="regional"
                    className={`bg-input-background border-border ${
                      regionalIsRequired && !formValues.regional
                        ? "border-red-500"
                        : ""
                    }`}
                    disabled={disableRegionalSelect}
                  >
                    <SelectValue placeholder="Selecione a regional" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONAL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {disableRegionalSelect && (
                  <p className="text-xs text-muted-foreground">
                    A regional sera definida automaticamente como{" "}
                    {currentUser?.regional ?? "sua regional"}.
                  </p>
                )}
              </div>
            )}
            {shouldShowOriginSelect && (
              <div className="space-y-2">
                <Label htmlFor="originScope">Origem *</Label>
                <Select
                  value={formValues.originScope}
                  onValueChange={(value) =>
                    setFormValues((previous) => ({
                      ...previous,
                      originScope: value,
                    }))
                  }
                >
                  <SelectTrigger
                    id="originScope"
                    className={`bg-input-background border-border ${
                      originIsRequired && !formValues.originScope
                        ? "border-red-500"
                        : ""
                    }`}
                  >
                    <SelectValue placeholder="Selecione a origem do usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {(allowedOriginOptions.length > 0
                      ? allowedOriginOptions
                      : ORIGIN_OPTIONS
                    ).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
