import React, { useMemo, useState } from "react";

import {
  BookOpen,
  Edit3,
  ExternalLink,
  Globe,
  Link2,
  LucideIcon,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  Trash2,
  Zap,
} from "lucide-react";

import { PageHeader } from "./PageHeader";

import { Card, CardContent } from "./ui/card";

import { Button } from "./ui/button";

import { Input } from "./ui/input";

import { Label } from "./ui/label";

import { Textarea } from "./ui/textarea";

import { Switch } from "./ui/switch";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

import { cn } from "./ui/utils";

import { toast } from "sonner";

import { useAssets } from "../contexts/AssetContext";

import { usePermissions } from "../contexts/hooks/usePermissions";

import { Permission } from "../types/enums";

import type { UsefulLink, UsefulLinkCategory } from "../types";

const CATEGORY_META: Record<
  UsefulLinkCategory,
  { label: string; icon: LucideIcon; badgeClass: string }
> = {
  documentation: {
    label: "Documentação",

    icon: BookOpen,

    badgeClass: "border border-red-500/40 bg-red-500/10 text-red-300",
  },

  tools: {
    label: "Ferramentas",

    icon: Zap,

    badgeClass: "border border-amber-500/40 bg-amber-500/10 text-amber-300",
  },

  resources: {
    label: "Recursos",

    icon: Globe,

    badgeClass: "border border-blue-500/40 bg-blue-500/10 text-blue-300",
  },

  other: {
    label: "Outros",

    icon: Link2,

    badgeClass:
      "border border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300",
  },
};

const FILTER_OPTIONS: Array<{
  value: "all" | UsefulLinkCategory;

  label: string;
}> = [
  { value: "all", label: "Todos" },

  { value: "documentation", label: "Documentação" },

  { value: "tools", label: "Ferramentas" },

  { value: "resources", label: "Recursos" },

  { value: "other", label: "Outros" },
];

const EMPTY_STATE_MESSAGE = {
  icon: Link2,
  title: "Ainda não há links úteis cadastrados",
  description:
    "Construa um acervo estratégico com referências, ferramentas e documentos que aceleram o dia a dia da equipe.",
};

interface LinkFormState {
  title: string;

  url: string;

  description: string;

  category: UsefulLinkCategory;

  pinned: boolean;
}

export function UsefulLinksManager() {
  const {
    usefulLinks,
    createUsefulLink,
    updateUsefulLink,
    deleteUsefulLink,
    recordUsefulLinkClick,
  } = useAssets();

  const { hasPermission } = usePermissions();

  const canManageLinks = hasPermission(Permission.MANAGE_USEFUL_LINKS);

  const [searchTerm, setSearchTerm] = useState("");

  const [selectedCategory, setSelectedCategory] = useState<
    "all" | UsefulLinkCategory
  >("all");

  const [dialogOpen, setDialogOpen] = useState(false);

  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");

  const [editingLink, setEditingLink] = useState<UsefulLink | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const openLinkInNewTab = (link: UsefulLink) => {
    if (!link?.url) return;

    recordUsefulLinkClick?.(link.id, link.clickCount ?? 0);

    window.open(link.url, "_blank", "noopener,noreferrer");
  };

  const isInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;

    return Boolean(
      target.closest("button, a, [role='menuitem'], [data-card-ignore-click]"),
    );
  };

  const [formState, setFormState] = useState<LinkFormState>({
    title: "",

    url: "",

    description: "",

    category: "tools",

    pinned: false,
  });

  const resetForm = () => {
    setFormState({
      title: "",

      url: "",

      description: "",

      category: "tools",

      pinned: false,
    });

    setEditingLink(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();

      setDialogMode("create");
    }

    setDialogOpen(open);
  };

  const openCreateDialog = () => {
    if (!canManageLinks) {
      toast.error("Solicite permissão para gerenciar links úteis.");

      return;
    }

    setDialogMode("create");

    resetForm();

    setDialogOpen(true);
  };

  const openEditDialog = (link: UsefulLink) => {
    if (!canManageLinks) {
      toast.error("Solicite permissão para gerenciar links úteis.");

      return;
    }

    setDialogMode("edit");

    setEditingLink(link);

    setFormState({
      title: link.title,
      url: link.url,
      description: link.description ?? "",
      category: link.category,
      pinned: link.pinned,
    });

    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formState.title.trim() || !formState.url.trim()) {
      toast.error("Título e URL são obrigatórios.");

      return;
    }

    setIsSubmitting(true);

    const payload = {
      title: formState.title.trim(),

      url: formState.url.trim(),

      description: formState.description.trim() || null,

      category: formState.category,

      pinned: formState.pinned,
    };

    try {
      if (dialogMode === "create") {
        await createUsefulLink(payload);
      } else if (editingLink) {
        await updateUsefulLink(editingLink.id, payload);
      }

      handleDialogOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!canManageLinks) return;

    if (!confirm("Tem certeza que deseja excluir este link útil?")) return;

    try {
      await deleteUsefulLink(linkId);
    } catch {
      // Erros já tratados no contexto
    }
  };

  const handleTogglePin = async (link: UsefulLink) => {
    if (!canManageLinks) return;

    try {
      await updateUsefulLink(link.id, { pinned: !link.pinned });
    } catch {
      // Erros já tratados no contexto
    }
  };

  const filteredLinks = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return usefulLinks

      .filter((link) => {
        if (selectedCategory !== "all" && link.category !== selectedCategory) {
          return false;
        }

        if (!normalizedSearch) return true;

        return (
          link.title.toLowerCase().includes(normalizedSearch) ||
          (link.description ?? "").toLowerCase().includes(normalizedSearch)
        );
      })

      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [usefulLinks, searchTerm, selectedCategory]);

  const pinnedLinks = filteredLinks.filter((link) => link.pinned);

  const otherLinks = filteredLinks.filter((link) => !link.pinned);

  const renderCard = (link: UsefulLink) => {
    const meta = CATEGORY_META[link.category];

    return (
      <Card
        key={link.id}
        className="bg-card/60 border border-border/70 shadow-none cursor-pointer transition-colors hover:border-gray-600/100"
        role="link"
        tabIndex={0}
        onClick={(event) => {
          if (isInteractiveTarget(event.target)) return;

          openLinkInNewTab(link);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openLinkInNewTab(link.url);
          }
        }}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.65rem] font-semibold",

                    meta.badgeClass
                  )}
                >
                  <meta.icon className="size-4" />

                  {meta.label}
                </span>

                {link.pinned && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-[0.65rem] font-semibold text-amber-300">
                    <Star className="size-3 text-amber-300" />
                    Fixado
                  </span>
                )}
              </div>

              <h3 className="text-lg font-semibold text-foreground">
                {link.title}
              </h3>

              <p className="text-sm text-muted-foreground min-h-[3rem]">
                {link.description ?? "Sem descrição informada."}
              </p>

              <div className="flex items-center gap-3">
                <ExternalLink className="size-4 text-muted-foreground" />

                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-muted-foreground transition hover:text-foreground"
                  onClick={(event) => {
                    event.stopPropagation();
                    openLinkInNewTab(link);
                  }}
                  data-card-ignore-click
                >
                  Acessar link
                </a>
              </div>
            </div>

            {canManageLinks && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={(event) => event.stopPropagation()}
                  data-card-ignore-click
                >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    className="flex items-center gap-2"
                    data-card-ignore-click
                    onSelect={(event) => {
                      event.stopPropagation();
                      openEditDialog(link);
                    }}
                  >
                    <Edit3 className="size-4" />
                    Editar
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="flex items-center gap-2"
                    data-card-ignore-click
                    onSelect={(event) => {
                      event.stopPropagation();
                      handleTogglePin(link);
                    }}
                  >
                    <Star className="size-4" />

                    {link.pinned ? "Desfixar" : "Fixar"}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="flex items-center gap-2"
                    data-card-ignore-click
                    variant="destructive"
                    onSelect={(event) => {
                      event.stopPropagation();
                      handleDeleteLink(link.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="mt-4 h-px w-full border-t border-border/70" />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>{link.clickCount ?? 0} cliques</span>

            <span>Criado por {link.createdByName ?? "Admin"}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  const noLinksRegistered = usefulLinks.length === 0;

  const showNoResults = !noLinksRegistered && filteredLinks.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Link2}
        title="Links úteis"
        description="Gerencie links úteis para toda a equipe"
        action={
          <Button
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={openCreateDialog}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Link
          </Button>
        }
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                <Search className="size-4" />
              </div>

              <Input
                className="w-full border border-border/70 bg-card/30 pl-11 text-sm"
                placeholder="Pesquisar links..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-nowrap items-center gap-2">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedCategory(option.value)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition duration-150",

                  option.value === selectedCategory
                  ? "bg-destructive text-white"
                    : "border border-border/60 bg-card/30 text-muted-foreground hover:border-border/80"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      {pinnedLinks.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Star className="size-4 text-amber-300" />
            Links Fixados
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {pinnedLinks.map(renderCard)}
          </div>
        </section>
      )}

      {otherLinks.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Link2 className="size-4 text-muted-foreground" />
            Outros Links
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {otherLinks.map(renderCard)}
          </div>
        </section>
      )}

      {noLinksRegistered ? (
        <Card className="border border-border/70 bg-gradient-to-br from-card/40 to-card/60">
          <CardContent className="flex flex-col items-center gap-4 rounded-[18px] py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/50 bg-card/30">
              <Link2 className="size-12 text-muted-foreground/70" />
            </div>

            <h3 className="text-xl font-semibold text-foreground">
              {EMPTY_STATE_MESSAGE.title}
            </h3>

            <p className="text-sm text-muted-foreground max-w-[420px]">
              {EMPTY_STATE_MESSAGE.description}
            </p>
          </CardContent>
        </Card>
      ) : showNoResults ? (
        <Card className="border border-border/70 bg-card/30">
          <CardContent className="flex flex-col items-center gap-3 rounded-[15px] py-12 text-center">
            <Link2 className="size-10 text-muted-foreground/70" />

            <h3 className="text-lg font-semibold text-foreground">
              Nenhum link encontrado
            </h3>

            <p className="text-sm text-muted-foreground max-w-[420px]">
              Refine sua busca ou registre um novo link útil para continuar
              ampliando o acervo da equipe.
            </p>

            {canManageLinks ? (
              <Button
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={openCreateDialog}
              >
                Criar link útil
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Solicite permissão de um administrador para registrar novos
                links úteis.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Criar Novo Link" : "Editar Link"}
            </DialogTitle>

            <DialogDescription>
              {dialogMode === "create"
                ? "Adicione um link útil para a equipe e selecione uma categoria adequada."
                : "Atualize os campos do link e salve as alterações."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Título</Label>

              <Input
                value={formState.title}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,

                    title: event.target.value,
                  }))
                }
                placeholder="Ex: Brandbook"
              />
            </div>

            <div className="space-y-1">
              <Label>URL</Label>

              <Input
                value={formState.url}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, url: event.target.value }))
                }
                placeholder="https://"
              />
            </div>

            <div className="space-y-1">
              <Label>Descrição</Label>

              <Textarea
                value={formState.description}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,

                    description: event.target.value,
                  }))
                }
                placeholder="Descreva brevemente este link..."
              />
            </div>

            <div className="space-y-1">
              <Label>Categoria</Label>

              <div className="flex flex-wrap gap-2">
                {Object.entries(CATEGORY_META).map(([value, meta]) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() =>
                      setFormState((prev) => ({
                        ...prev,

                        category: value as UsefulLinkCategory,
                      }))
                    }
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition",

                      formState.category === value
                        ? "border-transparent bg-white/10 text-white shadow-lg"
                        : "border-border/60 bg-card/30 text-muted-foreground hover:border-border/80"
                    )}
                  >
                    <meta.icon className="size-4" />

                    {meta.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="useful-link-pinned"
                checked={formState.pinned}
                onCheckedChange={(value) =>
                  setFormState((prev) => ({ ...prev, pinned: value }))
                }
              />

              <Label
                htmlFor="useful-link-pinned"
                className="text-sm font-medium text-foreground"
              >
                Fixar link
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => handleDialogOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>

            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting
                ? dialogMode === "create"
                  ? "Criando..."
                  : "Salvando..."
                : dialogMode === "create"
                ? "Criar link"
                : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
