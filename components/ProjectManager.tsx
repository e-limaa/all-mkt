import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  MapPin,
  Users as UsersIcon,
  FolderOpen,
  Calendar,
  Building,
  Construction,
  Home,
  CheckCircle,
  Upload,
  AlertCircle,
  ImageIcon,
  Link,
  Clock
} from 'lucide-react';
import { Project } from '../types';
import { formatDate } from '../utils/format';
import { useAssets } from '../contexts/AssetContext';
import { usePermissions } from '../contexts/hooks/usePermissions';
import { Permission } from '../types/enums';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { uploadFile, getPublicUrl } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const getStatusBadge = (status: string) => {
  const badges = {
    'em-desenvolvimento': { label: 'Vem Aí', variant: 'secondary' as const, icon: Construction },
    'lancamento': { label: 'Lançamento', variant: 'default' as const, icon: Building },
    'vendas': { label: 'Em Vendas', variant: 'outline' as const, icon: Home },
    'entregue': { label: 'Entregue', variant: 'destructive' as const, icon: CheckCircle }
  };
  return badges[status as keyof typeof badges] || badges['em-desenvolvimento'];
};

interface ProjectManagerProps {
  onPageChange?: (page: string) => void;
  onNavigateToMaterials?: (projectId: string, projectName: string) => void;
}

export function ProjectManager({ onPageChange, onNavigateToMaterials }: ProjectManagerProps) {
  const { projects, assets, createProject, updateProject, deleteProject } = useAssets();
  const { hasPermission, isViewer } = usePermissions();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  // Debug: Log projects count
  console.log('📊 ProjectManager - Total projects:', projects.length);
  console.log('📊 ProjectManager - Projects:', projects);
  
  // Permissões para modificações
  const canCreateProjects = hasPermission(Permission.CREATE_PROJECTS);
  const canEditProjects = hasPermission(Permission.EDIT_PROJECTS);
  const canDeleteProjects = hasPermission(Permission.DELETE_PROJECTS);
  
  // Filtrar apenas empreendimentos que possuem imagem
  const projectsWithImages = projects.filter(project => project.image && project.image.trim() !== '');
  
  console.log('📊 ProjectManager - Projects with images:', projectsWithImages.length);
  
  const filteredProjects = projectsWithImages.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || project.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Altere a função handleCreateProject para lidar com upload de imagem
  const handleCreateProject = async (projectData: Partial<Project>, imageFile?: File) => {
    console.log('🔄 Creating project with data:', projectData);
    if (!canCreateProjects) {
      toast.error('Você não possui permissão para criar empreendimentos');
      return;
    }
    try {
      let imageUrl = projectData.image;
      // Use o id do usuário autenticado para o caminho do arquivo
      const userId = user?.id || '';
      if (projectData.imageType === 'upload' && imageFile && userId) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;
        try {
          await uploadFile(imageFile, 'assets', filePath);
          imageUrl = getPublicUrl('assets', filePath);
          console.log('[DEBUG] URL pública da imagem após upload:', imageUrl);
        } catch (uploadError) {
          toast.error('Erro ao fazer upload da imagem.');
          console.error('[UPLOAD ERROR]', uploadError);
          return;
        }
      }
      // Garante que só salva a URL pública do Supabase
      if (imageUrl && imageUrl.startsWith('blob:')) {
        imageUrl = '';
      }
      const projectToCreate = {
        name: projectData.name || '',
        description: projectData.description || '',
        location: projectData.location || '',
        status: 'vem-ai' as 'em-desenvolvimento' | 'lancamento' | 'vendas' | 'entregue',
        color: projectData.color || '#3b82f6',
        image: imageUrl || '',
        created_by: userId
      };
      const newProject = await createProject(projectToCreate);
      toast.success(`Empreendimento "${projectData.name}" criado com sucesso!`);
      setIsCreateOpen(false);
    } catch (error) {
      toast.error('Erro ao criar empreendimento');
      console.error('❌ Error creating project:', error);
    }
  };

  const handleUpdateProject = async (updatedProject: Project) => {
    if (!canEditProjects) {
      toast.error('Você não possui permissão para editar empreendimentos');
      return;
    }
    // Corrige tipos para updateProject (status e image)
    const updates = {
      ...updatedProject,
      status: (updatedProject.status as any === 'vem-ai' ? 'vem-ai' :
              updatedProject.status === 'em-desenvolvimento' ? 'em-desenvolvimento' :
              updatedProject.status === 'lancamento' ? 'lancamento' :
              updatedProject.status === 'vendas' ? 'vendas' :
              updatedProject.status === 'entregue' ? 'entregue' : 'vem-ai') as 'vem-ai' | 'em-desenvolvimento' | 'lancamento' | 'vendas' | 'entregue',
      image: updatedProject.image || '',
    };
    // Remove campos que não existem no banco
    delete updates.createdAt;
    delete updates.updatedAt;
    delete updates.createdBy;
    delete updates.imageType;
    delete updates.launchDate;
    try {
      await updateProject(updatedProject.id, updates);
      setEditingProject(null);
      toast.success(`Empreendimento "${updatedProject.name}" atualizado com sucesso!`);
    } catch (error) {
      toast.error('Erro ao atualizar empreendimento');
      console.error('Erro ao atualizar projeto:', error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!canDeleteProjects) {
      toast.error('Você não possui permissão para excluir empreendimentos');
      return;
    }
    
    const project = projects.find(p => p.id === projectId);
    const confirmDelete = window.confirm(`Tem certeza que deseja excluir "${project?.name}"?`);
    
    if (!confirmDelete) return;
    
    try {
      // Excluir o projeto no contexto
      await deleteProject(projectId);
      toast.success(`Empreendimento "${project?.name}" removido com sucesso!`);
    } catch (error) {
      toast.error('Erro ao excluir empreendimento');
      console.error('Erro ao excluir projeto:', error);
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
      onPageChange('materials');
      toast.success(`Navegando para materiais de "${project.name}"`);
    } else {
      // Fallback: mostrar toast com informações
      toast.success(`${projectAssets.length} material${projectAssets.length > 1 ? 'is' : ''} encontrado${projectAssets.length > 1 ? 's' : ''} para "${project.name}"`);
    }
  };

  const getProjectAssets = (projectId: string) => {
    return assets.filter(asset => asset.categoryType === 'project' && asset.categoryId === projectId);
  };

  const getStats = () => {
    const totalProjects = projectsWithImages.length; // Apenas com imagem
    const totalProjectsIncomplete = projects.length - projectsWithImages.length; // Sem imagem
    const inDevelopment = projectsWithImages.filter(p => p.status === 'em-desenvolvimento').length;
    const launching = projectsWithImages.filter(p => p.status === 'lancamento').length;
    const inSales = projectsWithImages.filter(p => p.status === 'vendas').length;
    const delivered = projectsWithImages.filter(p => p.status === 'entregue').length;
    
    return { totalProjects, totalProjectsIncomplete, inDevelopment, launching, inSales, delivered };
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3">
            <Building className="w-8 h-8 text-primary" />
            Empreendimentos
          </h1>
          <p className="text-muted-foreground mt-1">
            {isViewer() 
              ? 'Visualize empreendimentos e seus materiais' 
              : 'Gerencie empreendimentos e organize materiais por projeto'
            }
          </p>
        </div>
        
        {canCreateProjects && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Novo Empreendimento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Novo Empreendimento</DialogTitle>
                <DialogDescription>
                  Configure um novo empreendimento com imagem obrigatória. Todos os novos empreendimentos começam com status &quot;Vem Aí&quot;.
                </DialogDescription>
              </DialogHeader>
              <ProjectForm onSubmit={handleCreateProject} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Debug Info - apenas em desenvolvimento */}
      {process.env.NODE_ENV === 'development' && (
        <Alert className="border-blue-500/50 bg-blue-500/10">
          <AlertCircle className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-blue-200">
            <strong>Debug:</strong> Total de projetos: {projects.length} | Com imagem: {projectsWithImages.length} | Filtrados: {filteredProjects.length}
          </AlertDescription>
        </Alert>
      )}

      {/* Alert sobre empreendimentos incompletos - apenas para não-visualizadores */}
      {!isViewer() && stats.totalProjectsIncomplete > 0 && (
        <Alert className="border-orange-500/50 bg-orange-500/10">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-orange-200">
            <strong>{stats.totalProjectsIncomplete}</strong> empreendimento{stats.totalProjectsIncomplete > 1 ? 's' : ''} 
            {stats.totalProjectsIncomplete > 1 ? ' estão ocultos' : ' está oculto'} da listagem por não possuir{stats.totalProjectsIncomplete > 1 ? 'em' : ''} imagem cadastrada.
            Adicione uma imagem para que {stats.totalProjectsIncomplete > 1 ? 'apareçam' : 'apareça'} na listagem principal.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visíveis</CardTitle>
            <Building className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">Com imagem</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vem Aí</CardTitle>
            <Construction className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.inDevelopment}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lançamento</CardTitle>
            <Building className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.launching}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Vendas</CardTitle>
            <Home className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.inSales}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregues</CardTitle>
            <CheckCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.delivered}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-4">
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
                  <SelectItem value="em-desenvolvimento">Vem Aí</SelectItem>
                  <SelectItem value="lancamento">Lançamento</SelectItem>
                  <SelectItem value="vendas">Em Vendas</SelectItem>
                  <SelectItem value="entregue">Entregue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid - Layout igual ao visual de referência */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProjects.map((project) => {
          const statusBadge = getStatusBadge(project.status);
          const projectAssets = getProjectAssets(project.id);
          const StatusIcon = statusBadge.icon;
          
          return (
            <Card key={project.id} className="group hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
              {/* Imagem do empreendimento */}
              <div className="relative h-48 overflow-hidden">
                <ImageWithFallback
                  src={project.image}
                  alt={project.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3">
                  <Badge variant={statusBadge.variant} className="text-xs backdrop-blur-sm">
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusBadge.label}
                  </Badge>
                </div>
                {(canEditProjects || canDeleteProjects) && (
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="sm" className="w-8 h-8 p-0 backdrop-blur-sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {canEditProjects && (
                          <DropdownMenuItem onClick={() => setEditingProject(project)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleViewMaterials(project)}>
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
                  </div>
                )}
              </div>

              <CardContent className="p-4 space-y-3">
                {/* Nome e Descrição */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">{project.name}</h3>
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </div>

                {/* Localização */}
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Localização:</span>
                  <span className="font-medium text-foreground">{project.location}</span>
                </div>

                {/* Data de Criação */}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Criado em:</span>
                  <span className="text-foreground">{formatDate(project.createdAt)}</span>
                </div>

                {/* Previsão de Lançamento */}
                {project.launchDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">Lançamento:</span>
                    <span className="text-foreground">{formatDate(project.launchDate)}</span>
                  </div>
                )}

                {/* Estatísticas */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <FolderOpen className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Materiais:</span>
                    <span className="font-medium text-foreground">{projectAssets.length}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <UsersIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Criado por:</span>
                    <span className="font-medium text-foreground truncate">{project.createdBy}</span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2 pt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 bg-card hover:bg-accent border-border"
                    onClick={() => handleViewMaterials(project)}
                    disabled={projectAssets.length === 0}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Materiais {projectAssets.length > 0 && `(${projectAssets.length})`}
                  </Button>
                  {canEditProjects && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-card hover:bg-accent border-border"
                      onClick={() => setEditingProject(project)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProjects.length === 0 && (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-12 text-center">
            <Building className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2 text-foreground">Nenhum empreendimento encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Tente ajustar sua pesquisa' : 'Não há empreendimentos disponíveis'}
            </p>
            {canCreateProjects && (
              <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Novo Empreendimento
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Project Dialog */}
      {canEditProjects && (
        <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Empreendimento</DialogTitle>
              <DialogDescription>
                Atualize as informações do empreendimento
              </DialogDescription>
            </DialogHeader>
            {editingProject && (
              <ProjectForm 
                project={editingProject}
                onSubmit={(data) => handleUpdateProject({ ...editingProject, ...data })}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Project Form Component com validação obrigatória de imagem
function ProjectForm({ 
  project, 
  onSubmit 
}: { 
  project?: Project;
  onSubmit: (data: Partial<Project>, imageFile?: File) => void;
}) {
  // Use proper default values to avoid controlled/uncontrolled warnings
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    location: project?.location || '',
    status: project?.status || 'vem-ai',
    color: project?.color || '#3b82f6',
    image: project?.image || '',
    imageType: (project?.imageType || 'url') as 'upload' | 'url',
    launchDate: project?.launchDate ? project.launchDate.split('T')[0] : '',
    createdBy: project?.createdBy || 'Usuário Atual',
    projectPhase: project?.projectPhase || '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Localização é obrigatória';
    }
    
    // Validação obrigatória da imagem
    if (formData.imageType === 'upload' && !imageFile && !project?.image) {
      newErrors.image = 'Imagem é obrigatória';
    } else if (formData.imageType === 'url' && !formData.image.trim()) {
      newErrors.image = 'URL da imagem é obrigatória';
    } else if (formData.imageType === 'url' && formData.image.trim() && !isValidUrl(formData.image)) {
      newErrors.image = 'URL da imagem é inválida';
    }
    
    // Validação obrigatória da fase
    if (!formData.projectPhase) {
      newErrors.projectPhase = 'Fase do empreendimento é obrigatória';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, image: 'Arquivo deve ser uma imagem' });
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB
        setErrors({ ...errors, image: 'Arquivo deve ter no máximo 5MB' });
        return;
      }
      setImageFile(file);
      setFormData({ ...formData, image: URL.createObjectURL(file) });
      const newErrors = { ...errors };
      delete newErrors.image;
      setErrors(newErrors);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 Form submit - Form data:', formData);
    
    if (!validateForm()) {
      console.log('❌ Form validation failed:', errors);
      toast.error('Por favor, corrija os erros do formulário');
      return;
    }

    // Envia o arquivo de imagem junto com os dados do projeto
    onSubmit({
      ...formData,
      status: 'vem-ai' as 'em-desenvolvimento' | 'lancamento' | 'vendas' | 'entregue',
      image: formData.image || '',
    }, imageFile || undefined);
  };

  // Função para obter as fases do empreendimento (igual ao AssetManager)
  const getProjectPhases = () => [
    { value: 'vem-ai', label: 'Vem Aí' },
    { value: 'breve-lancamento', label: 'Breve Lançamento' },
    { value: 'lancamento', label: 'Lançamento' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name" className="mb-2">Nome do Empreendimento *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Residencial Vista Alegre"
          className={`bg-input-background border-border ${errors.name ? 'border-red-500' : ''}`}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </div>

      <div>
        <Label htmlFor="location" className="mb-2">Localização *</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="Ex: São Paulo - SP"
          className={`bg-input-background border-border ${errors.location ? 'border-red-500' : ''}`}
        />
        {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
      </div>

      <div>
        <Label htmlFor="description" className="mb-2">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descreva o empreendimento..."
          className="bg-input-background border-border resize-none"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="launchDate" className="mb-2">Previsão de Lançamento</Label>
        <Input
          id="launchDate"
          type="date"
          value={formData.launchDate}
          onChange={(e) => setFormData({ ...formData, launchDate: e.target.value })}
          className="bg-input-background border-border"
        />
      </div>

      {/* Select de Fase do Empreendimento */}
      <div>
        <Label htmlFor="projectPhase" className="mb-2">Fase do Empreendimento *</Label>
        <Select
          value={formData.projectPhase}
          onValueChange={(value) => setFormData({ ...formData, projectPhase: value })}
        >
          <SelectTrigger className={`bg-input-background border-border ${errors.projectPhase ? 'border-red-500' : ''}`}>
            <SelectValue placeholder="Selecione a fase" />
          </SelectTrigger>
          <SelectContent>
            {getProjectPhases().map((phase) => (
              <SelectItem key={phase.value} value={phase.value}>{phase.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.projectPhase && <p className="text-xs text-red-500 mt-1">{errors.projectPhase}</p>}
      </div>

      {/* Seção da Imagem Obrigatória */}
      <div className="space-y-3">
        <Label className="text-base">Imagem do Empreendimento *</Label>
        <p className="text-xs text-muted-foreground">
          A imagem será usada como miniatura nos cards. É obrigatória para o empreendimento aparecer na listagem.
        </p>
        
        <div className="flex gap-2">
          <Button
            type="button"
            variant={formData.imageType === 'upload' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFormData({ ...formData, imageType: 'upload' })}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
          <Button
            type="button"
            variant={formData.imageType === 'url' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFormData({ ...formData, imageType: 'url' })}
          >
            <Link className="w-4 h-4 mr-2" />
            URL
          </Button>
        </div>

        {formData.imageType === 'upload' ? (
          <div className="space-y-1">
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className={`bg-input-background border-border ${errors.image ? 'border-red-500' : ''}`}
            />
            <p className="text-xs text-muted-foreground">
              JPG, PNG ou WebP até 5MB
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <Input
              placeholder="https://exemplo.com/imagem.jpg"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              className={`bg-input-background border-border ${errors.image ? 'border-red-500' : ''}`}
            />
            <p className="text-xs text-muted-foreground mt-1">
              URL direta para imagem hospedada
            </p>
          </div>
        )}
        
        {errors.image && (
          <Alert className="border-red-500/50 bg-red-500/10">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-200">
              {errors.image}
            </AlertDescription>
          </Alert>
        )}

        {/* Preview da imagem */}
        {formData.image && !errors.image && (
          <div className="mt-3">
            <Label className="text-sm">Preview:</Label>
            <div className="mt-1 w-full h-32 bg-muted rounded-lg overflow-hidden">
              <ImageWithFallback
                src={formData.image}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="color" className="mb-2">Cor do Projeto</Label>
        <div className="flex gap-2">
          <Input
            id="color"
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="w-16 h-10 p-1 bg-input-background border-border"
          />
          <Input
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            placeholder="#3b82f6"
            className="flex-1 bg-input-background border-border"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90">
          {project ? 'Atualizar Empreendimento' : 'Criar Empreendimento'}
        </Button>
      </div>
    </form>
  );
}