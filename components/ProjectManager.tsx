import { PageHeader } from './PageHeader';
import React, { useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ProjectCard } from "./ProjectCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Alert, AlertDescription } from "./ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Building,
  Construction,
  Home,
  CheckCircle,
  Upload,
  AlertCircle,
  ImageIcon,
  Clock,
} from "lucide-react";
import { Project } from "../types";
import { formatDate } from "../utils/format";
import { useAssets } from "../contexts/AssetContext";
import { usePermissions } from "../contexts/hooks/usePermissions";
import { Permission, UserRole } from "../types/enums";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { REGIONAL_OPTIONS } from "../lib/regionals";
import { uploadFile, getPublicUrl } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import posthog from "posthog-js";

const getStatusBadge = (status: string) => {
  const badges = {
    "em-desenvolvimento": {
      label: "Vem aí",
      variant: "secondary" as const,
      icon: Construction,
    },
    "vem-ai": {
      label: "Vem aí",
      variant: "secondary" as const,
      icon: Construction,
    },
    "breve-lancamento": {
      label: "Breve lançamento",
      variant: "blue" as const,
      icon: Construction,
    },
    lancamento: {
      label: "Lançamento",
      variant: "blue" as const,
      icon: Building,
    },
    vendas: { label: "Em vendas", variant: "outline" as const, icon: Home },
    entregue: {
      label: "Entregue",
      variant: "gray" as const,
      icon: CheckCircle,
    },
  };
  return badges[status as keyof typeof badges] ?? badges["vem-ai"] ?? badges["em-desenvolvimento"];
};


const normalizeProjectStatus = (status?: string): Project["status"] => {
  switch (status) {
    case "breve-lancamento":
      return "breve-lancamento";
    case "lancamento":
    case "vendas":
    case "entregue":
      return "lancamento";
    case "vem-ai":
    case "em-desenvolvimento":
    default:
      return "vem-ai";
  }
};

const normalizeLaunchDateInput = (
  value: string | Date | null | undefined,
): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      const [day, month, year] = trimmed.split("/");
      return `${year}-${month}-${day}`;
    }

    const datePortion = trimmed.includes("T")
      ? trimmed.split("T")[0]
      : trimmed;

    if (/^\d{4}-\d{2}-\d{2}$/.test(datePortion)) {
      return datePortion;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0];
    }

    return datePortion;
  }

  return undefined;
};

const getRegionalLabel = (regional?: string | null): string => {
  const normalized = (regional ?? "").toString().trim().toUpperCase();
  if (!normalized) {
    return "Regional nÃ£o informada";
  }

  return (
    REGIONAL_OPTIONS.find((option) => option.value === normalized)?.label ??
    normalized
  );
};

interface ProjectManagerProps {
  onPageChange?: (page: string) => void;
  onNavigateToMaterials?: (projectId: string, projectName: string) => void;
}

export function ProjectManager({
  onPageChange,
  onNavigateToMaterials,
}: ProjectManagerProps) {
  const { projects, assets, createProject, updateProject, deleteProject } =
    useAssets();
  const { hasPermission, isViewer } = usePermissions();
  const { user } = useAuth();
  const userRegional = (user?.regional || "").trim().toUpperCase();
  const viewerGlobalFlag =
    (user as { viewerAccessToAll?: boolean } | null)?.viewerAccessToAll ??
    (user as { viewer_access_to_all?: boolean } | null)?.viewer_access_to_all ??
    false;
  const isRegionalRestricted =
    user?.role === UserRole.EDITOR_TRADE ||
    (user?.role === UserRole.VIEWER && !viewerGlobalFlag);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const getCreatorDisplayName = (
    name?: string,
    fallbackId?: string,
  ): string => {
    if (name && name.trim()) {
      return name.trim();
    }
    if (fallbackId && fallbackId.trim()) {
      const truncated = fallbackId.trim();
      return truncated.length > 10 ? `${truncated.slice(0, 10)}...` : truncated;
    }
    return "No informado";
  };

  // Debug: Log projects count
  console.log(" ProjectManager - Total projects:", projects.length);
  console.log(" ProjectManager - Projects:", projects);

  // Permisses para modificaes
  const canCreateProjects = hasPermission(Permission.CREATE_PROJECTS);
  const canEditProjects = hasPermission(Permission.EDIT_PROJECTS);
  const canDeleteProjects = hasPermission(Permission.DELETE_PROJECTS);
  const headerDescription = isViewer()
    ? "Visualize empreendimentos e seus materiais"
    : "Gerencie empreendimentos e organize materiais por projeto";

  // Filtrar apenas empreendimentos que possuem imagem
  const projectsWithImages = projects.filter(
    (project) => project.image && project.image.trim() !== ""
  );

  const scopedProjects =
    isRegionalRestricted && userRegional
      ? projectsWithImages.filter(
        (project) =>
          (project.regional || "").trim().toUpperCase() === userRegional
      )
      : projectsWithImages;

  console.log(
    " ProjectManager - Projects with images:",
    projectsWithImages.length
  );
  console.log(
    " ProjectManager - Projects in scope:",
    scopedProjects.length
  );

  const filteredProjects = scopedProjects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.regional?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      selectedStatus === "all" || project.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  // Altere a funo handleCreateProject para lidar com upload de imagem
  const handleCreateProject = async (
    projectData: Partial<Project>,
    imageFile?: File
  ) => {
    console.log(" Creating project with data:", projectData);
    if (!canCreateProjects) {
      toast.error("Voc no possui permisso para criar empreendimentos");
      return;
    }

    const normalizedRegional = (projectData.regional || "").trim().toUpperCase();
    if (!normalizedRegional) {
      toast.error("Regional e obrigatoria");
      return;
    }

    try {
      let imageUrl = projectData.image;
      // Use o id do usurio autenticado para o caminho do arquivo
      const userId = user?.id || "";
      if (imageFile && userId) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 8)}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;
        try {
          await uploadFile(imageFile, "assets", filePath);
          imageUrl = getPublicUrl("assets", filePath);
          console.log("[DEBUG] URL pblica da imagem aps upload:", imageUrl);
        } catch (uploadError) {
          toast.error("Erro ao fazer upload da imagem.");
          console.error("[UPLOAD ERROR]", uploadError);
          return;
        }
      }
      // Garante que s salva a URL pblica do Supabase
      if (imageUrl && imageUrl.startsWith("blob:")) {
        imageUrl = "";
      }
      const normalizedStatus = normalizeProjectStatus(projectData.projectPhase || projectData.status);
      const launchDateToPersist = normalizeLaunchDateInput(projectData.launchDate);

      const projectToCreate = {
        name: projectData.name || "",
        description: projectData.description || "",
        status: normalizedStatus,
        color: projectData.color || "#3b82f6",
        image: imageUrl || "",
        created_by: userId,
        regional: normalizedRegional,
        ...(launchDateToPersist !== undefined ? { launchDate: launchDateToPersist } : {}),
      };
      const newProject = await createProject(projectToCreate);
      toast.success(`Empreendimento "${projectData.name}" criado com sucesso!`);
      captureProjectEvent("project_created", {
        project_id: newProject?.id ?? null,
        name: projectData.name ?? "",
        status: normalizedStatus,
        regional: normalizedRegional,
      });
      setIsCreateOpen(false);
    } catch (error) {
      toast.error("Erro ao criar empreendimento");
      console.error(" Error creating project:", error);
    }
  };

  const captureProjectEvent = (
    eventName: string,
    payload: Record<string, unknown>,
  ) => {
    if (typeof window === "undefined") {
      return;
    }
    posthog.capture(eventName, payload);
  };

  const handleUpdateProject = async (updatedProject: Project) => {
    if (!canEditProjects) {
      toast.error("Você não possui permissão para editar empreendimentos");
      return;
    }

    const normalizedStatus = normalizeProjectStatus(updatedProject.projectPhase || updatedProject.status);

    const updates = {
      ...updatedProject,
      status: normalizedStatus,
      projectPhase: normalizedStatus,
      image: updatedProject.image || "",
    };

    const {
      id: _ignoredId,
      createdAt,
      updatedAt,
      createdBy,
      createdByName,
      ...safeUpdates
    } = updates as Record<string, unknown>;

    if ("launchDate" in safeUpdates) {
      const normalizedLaunchDate = normalizeLaunchDateInput(
        safeUpdates.launchDate as string | Date | null | undefined
      );

      if (normalizedLaunchDate === undefined) {
        delete safeUpdates.launchDate;
      } else {
        safeUpdates.launchDate = normalizedLaunchDate;
      }
    }

    const nextRegional = (safeUpdates.regional ?? updatedProject.regional ?? "").toString().trim().toUpperCase();
    if (!nextRegional) {
      toast.error("Regional é obrigatória");
      return;
    }
    safeUpdates.regional = nextRegional;

    try {
      await updateProject(updatedProject.id, safeUpdates as Partial<Project>);
      setEditingProject(null);
      toast.success(`Empreendimento "${updatedProject.name}" atualizado com sucesso!`);
      captureProjectEvent("project_updated", {
        project_id: updatedProject.id,
        name: updatedProject.name,
        status: safeUpdates.status ?? updatedProject.status,
        regional: safeUpdates.regional ?? updatedProject.regional ?? null,
      });
    } catch (error) {
      toast.error("Erro ao atualizar empreendimento");
      console.error("Erro ao atualizar projeto:", error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!canDeleteProjects) {
      toast.error("Você não possui permissão para excluir empreendimentos");
      return;
    }

    const project = projects.find((p) => p.id === projectId);
    const confirmDelete = window.confirm(`Tem certeza que deseja excluir "${project?.name}"?`);
    if (!confirmDelete) return;

    try {
      await deleteProject(projectId);
      toast.success(`Empreendimento "${project?.name}" removido com sucesso!`);
    } catch (error) {
      toast.error("Erro ao excluir empreendimento");
      console.error("Erro ao excluir projeto:", error);
    }
  };

  const handleViewMaterials = (project: Project) => {
    const projectAssets = getProjectAssets(project.id);

    if (projectAssets.length === 0) {
      toast.info(`Nenhum material encontrado para "${project.name}"`);
      return;
    }

    // Se existe função de callback para navegação, usa ela
    if (onNavigateToMaterials) {
      onNavigateToMaterials(project.id, project.name);
    } else if (onPageChange) {
      // Fallback: navegar para a página de materiais
      onPageChange("materials");
      toast.success(`Navegando para materiais de "${project.name}"`);
    } else {
      // Fallback: mostrar toast com informações
      toast.success(
        `${projectAssets.length} material${projectAssets.length > 1 ? "is" : ""
        } encontrado${projectAssets.length > 1 ? "s" : ""} para "${project.name
        }"`
      );
    }
  };

  const getProjectAssets = (projectId: string) => {
    return assets.filter(
      (asset) =>
        asset.categoryType === "project" && asset.categoryId === projectId
    );
  };

  const getStats = () => {
    const scopedProjectsWithImages = scopedProjects;
    const projectsWithoutImage = isRegionalRestricted && userRegional
      ? projects.filter(
        (project) =>
          (project.regional || "").trim().toUpperCase() === userRegional &&
          (!project.image || project.image.trim() === "")
      )
      : projects.filter((project) => !project.image || project.image.trim() === "");

    const totalProjects = scopedProjectsWithImages.length;
    const totalProjectsIncomplete = projectsWithoutImage.length;
    const awaiting = scopedProjectsWithImages.filter((p) => p.status === "vem-ai").length;
    const comingSoon = scopedProjectsWithImages.filter((p) => p.status === "breve-lancamento").length;
    const launching = scopedProjectsWithImages.filter((p) => p.status === "lancamento").length;

    return {
      totalProjects,
      totalProjectsIncomplete,
      awaiting,
      comingSoon,
      launching,
    };
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Building}
        title="Empreendimentos"
        description={headerDescription}
        action={
          canCreateProjects ? (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-primary hover:bg-primary/90 sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Empreendimento
                </Button>
              </DialogTrigger>
              <DialogContent className="w-full max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Criar Novo Empreendimento</DialogTitle>
                  <DialogDescription>
                    Configure um novo empreendimento com imagem obrigatória. Todos os novos empreendimentos começam com status "Vem Aí".
                  </DialogDescription>
                </DialogHeader>
                <ProjectForm onSubmit={handleCreateProject} />
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      {/* Alert sobre empreendimentos incompletos - apenas para no-visualizadores */}
      {!isViewer() && stats.totalProjectsIncomplete > 0 && (
        <Alert className="border-orange-500/50 bg-orange-500/10">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-orange-700 dark:text-orange-200">
            <strong>{stats.totalProjectsIncomplete}</strong> empreendimento
            {stats.totalProjectsIncomplete > 1 ? "s" : ""}
            {stats.totalProjectsIncomplete > 1
              ? " estão ocultos"
              : " está oculto"}{" "}
            da listagem por não possuir
            {stats.totalProjectsIncomplete > 1 ? "em" : ""} imagem cadastrada.
            Adicione uma imagem para que{" "}
            {stats.totalProjectsIncomplete > 1 ? "apareçam" : "apareça"} na
            listagem principal.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visíveis</CardTitle>
            <Building className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.totalProjects}
            </div>
            <p className="text-xs text-muted-foreground">Com imagem</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vem Aí</CardTitle>
            <Construction className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.awaiting}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Breve Lançamento</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.comingSoon}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lançamento</CardTitle>
            <Building className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.launching}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar empreendimentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-input-background border-border"
          />
        </div>

        <div className="flex gap-2">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-48 bg-input-background border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="vem-ai">Vem Aí</SelectItem>
              <SelectItem value="breve-lancamento">Breve Lançamento</SelectItem>
              <SelectItem value="lancamento">Lançamento</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Projects Grid - Layout igual ao visual de referncia */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProjects.map((project) => {
          const statusBadge = getStatusBadge(project.status);
          const projectAssets = getProjectAssets(project.id);
          const creator = getCreatorDisplayName(
            project.createdByName,
            project.createdBy,
          );
          const actionMenu =
            canEditProjects || canDeleteProjects ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Mais ações"
                    className="bg-card relative rounded-[8.5px] shrink-0 w-[33.5px] h-[33.5px] border border-border p-0 text-muted-foreground hover:bg-muted/40 flex items-center justify-center"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {canEditProjects && (
                    <DropdownMenuItem
                      onClick={() => setEditingProject(project)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => handleViewMaterials(project)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Materiais ({projectAssets.length})
                  </DropdownMenuItem>
                  {canDeleteProjects && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteProject(project.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : undefined;

          return (
            <ProjectCard
              key={project.id}
              title={project.name}
              imageUrl={project.image}
              badgeLabel={statusBadge.label}
              badgeVariant={statusBadge.variant}
              location={getRegionalLabel(project.regional)}
              launchDate={project.launchDate ? formatDate(project.launchDate) : undefined}
              createdBy={creator}
              creationDate={formatDate(project.createdAt)}
              materialsCount={projectAssets.length}
              onViewMaterials={() => handleViewMaterials(project)}
              actions={actionMenu}
            />
          );
        })}
      </div>
      {filteredProjects.length === 0 && (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-12 text-center">
            <Building className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2 text-foreground">
              Nenhum empreendimento encontrado
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "Tente ajustar sua pesquisa"
                : "Não há empreendimentos disponíveis"}
            </p>

          </CardContent>
        </Card>
      )}

      {/* Edit Project Dialog */}
      {canEditProjects && (
        <Dialog
          open={!!editingProject}
          onOpenChange={() => setEditingProject(null)}
        >
          <DialogContent className="w-full max-w-3xl">
            <DialogHeader>
              <DialogTitle>Editar Empreendimento</DialogTitle>
              <DialogDescription>
                Atualize as informações do empreendimento
              </DialogDescription>
            </DialogHeader>
            {editingProject && (
              <ProjectForm
                project={editingProject}
                onSubmit={(data) =>
                  handleUpdateProject({ ...editingProject, ...data })
                }
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Project Form Component com validao obrigatria de imagem

function ProjectForm({
  project,
  onSubmit,
}: {
  project?: Project;
  onSubmit: (data: Partial<Project>, imageFile?: File) => void;
}) {
  const [formData, setFormData] = useState({
    name: project?.name || "",
    status: project?.status || "vem-ai",
    color: project?.color || "#3b82f6",
    image: project?.image || "",
    launchDate: normalizeLaunchDateInput(project?.launchDate) ?? "",
    createdBy: project?.createdBy || "Usuario Atual",
    projectPhase: project?.projectPhase || "",
    regional: (project?.regional || "").toUpperCase(),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }

    if (!formData.regional.trim()) {
      newErrors.regional = "Regional é obrigatória";
    }

    const hasExistingImage = !!(
      (project?.image && project.image.trim() !== "") ||
      (formData.image &&
        !formData.image.startsWith("blob:") &&
        formData.image.trim() !== "")
    );

    if (!imageFile && !hasExistingImage) {
      newErrors.image = "Imagem é obrigatória";
    }

    if (!formData.projectPhase) {
      newErrors.projectPhase = "Fase do empreendimento é obrigatória";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, image: "Arquivo deve ser uma imagem" }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        image: "Arquivo deve ter no máximo 5MB",
      }));
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setImageFile(file);
    setFormData((prev) => {
      if (prev.image && prev.image.startsWith("blob:")) {
        URL.revokeObjectURL(prev.image);
      }
      return { ...prev, image: previewUrl };
    });
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated.image;
      return updated;
    });
  };

  const handleRemoveImage = () => {
    if (!imageFile) {
      return;
    }

    setImageFile(null);
    setFormData((prev) => {
      if (prev.image && prev.image.startsWith("blob:")) {
        URL.revokeObjectURL(prev.image);
      }
      return { ...prev, image: project?.image || "" };
    });
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated.image;
      return updated;
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageAreaKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleImageAreaClick();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log("[Form submit] data:", formData);

    if (!validateForm()) {
      console.log("[Form validation failed]:", errors);
      toast.error("Por favor, corrija os erros do formulário");
      return;
    }

    const statusToPersist = normalizeProjectStatus(formData.projectPhase || formData.status);
    const normalizedRegional = formData.regional.trim().toUpperCase();

    onSubmit(
      {
        ...formData,
        status: statusToPersist,
        projectPhase: statusToPersist,
        image: formData.image || "",
        regional: normalizedRegional,
      },
      imageFile || undefined
    );
  };

  const getProjectPhases = () => [
    { value: "vem-ai", label: "Vem aí" },
    { value: "breve-lancamento", label: "Breve lançamento" },
    { value: "lancamento", label: "Lançamento" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label htmlFor="name" className="mb-2">
            Nome do Empreendimento *
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Residencial Vista Alegre"
            className={`bg-input-background border-border ${errors.name ? "border-red-500" : ""
              }`}
          />
          {errors.name && (
            <p className="text-xs text-red-500 mt-1">{errors.name}</p>
          )}
        </div>

        <div className="col-span-2 md:col-span-1">
          <Label htmlFor="regional" className="mb-2">
            Regional *
          </Label>
          <Select
            value={formData.regional}
            onValueChange={(value) => {
              setFormData({ ...formData, regional: value });
              setErrors((prev) => {
                if (!prev.regional) {
                  return prev;
                }
                const next = { ...prev };
                delete next.regional;
                return next;
              });
            }}
          >
            <SelectTrigger
              id="regional"
              className={`bg-input-background border-border ${errors.regional ? "border-red-500" : ""
                }`}
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
          {errors.regional && (
            <p className="text-xs text-red-500 mt-1">{errors.regional}</p>
          )}
        </div>

        <div className="col-span-2 md:col-span-1">
          <Label htmlFor="launchDate" className="mb-2">
            Previsão de Lançamento
          </Label>
          <Input
            id="launchDate"
            type="date"
            value={formData.launchDate}
            onChange={(e) =>
              setFormData({ ...formData, launchDate: e.target.value })
            }
            className="bg-input-background border-border"
          />
        </div>

        <div className="col-span-2 md:col-span-1">
          <Label htmlFor="projectPhase" className="mb-2">
            Fase do empreendimento *
          </Label>
          <Select
            value={formData.projectPhase}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                projectPhase: value,
                status: value as Project["status"],
              }))
            }
          >
            <SelectTrigger
              className={`bg-input-background border-border ${errors.projectPhase ? "border-red-500" : ""
                }`}
            >
              <SelectValue placeholder="Selecione a fase" />
            </SelectTrigger>
            <SelectContent>
              {getProjectPhases().map((phase) => (
                <SelectItem key={phase.value} value={phase.value}>
                  {phase.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.projectPhase && (
            <p className="text-xs text-red-500 mt-1">{errors.projectPhase}</p>
          )}
        </div>

        <div className="col-span-2 md:col-span-1">
          <Label htmlFor="color" className="mb-2">
            Cor do Projeto
          </Label>
          <div className="flex gap-2">
            <Input
              id="color"
              type="color"
              value={formData.color}
              onChange={(e) =>
                setFormData({ ...formData, color: e.target.value })
              }
              className="w-16 h-10 p-1 bg-input-background border-border"
            />
            <Input
              value={formData.color}
              onChange={(e) =>
                setFormData({ ...formData, color: e.target.value })
              }
              placeholder="#3b82f6"
              className="flex-1 bg-input-background border-border"
            />
          </div>
        </div>

        <div className="md:col-span-2 space-y-3">
          <Label className="text-base">Imagem do Empreendimento *</Label>
          <p className="text-xs text-muted-foreground">
            A imagem será usada como miniatura nos cards. É obrigatória para o
            empreendimento aparecer na listagem.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageFileChange}
          />

          <div
            role="button"
            tabIndex={0}
            onClick={handleImageAreaClick}
            onKeyDown={handleImageAreaKeyDown}
            className="group relative flex h-48 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted transition-colors hover:border-primary"
          >
            {formData.image ? (
              <ImageWithFallback
                src={formData.image}
                alt="Preview"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageIcon className="h-10 w-10" />
                <p className="text-sm font-medium">Clique para enviar imagem</p>
                <p className="text-xs">JPG, PNG ou WebP até 5MB</p>
              </div>
            )}

            <div className="absolute inset-x-3 bottom-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                type="button"
                className="flex-1 bg-black/70 text-white hover:bg-black"
                onClick={(event) => {
                  event.stopPropagation();
                  handleImageAreaClick();
                }}
              >
                {formData.image ? "Trocar imagem" : "Enviar imagem"}
              </Button>
              {imageFile && (
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/40 bg-black/50 text-white hover:bg-black/70"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleRemoveImage();
                  }}
                >
                  Remover
                </Button>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Recomendamos imagens com proporção 4:3 e pelo menos 1200x900 px.
          </p>

          {errors.image && (
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-200">
                {errors.image}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90">
          {project ? "Atualizar Empreendimento" : "Criar Empreendimento"}
        </Button>
      </div>
    </form>
  );
}
