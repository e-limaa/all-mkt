import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import {
  Upload,
  Search,
  Filter,
  Download,
  Share2,
  Eye,
  Trash2,
  Plus,
  Image,
  Video,
  FileText,
  Archive,
  Grid3X3,
  List,
  FolderOpen,
  X,
  ArrowLeft,
  Edit,
  ShieldX,
  CheckSquare,
  Square,
  Package,
  AlertCircle,
  Building,
  Target
} from 'lucide-react';
import { Asset } from '../types';
import { Permission } from '../types/enums';
import { formatFileSize, formatDate } from '../utils/format';
import { useAssets } from '../contexts/AssetContext';
import { usePermissions, PermissionGuard } from '../contexts/hooks/usePermissions';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { AssetViewer } from './AssetViewer';

interface AssetManagerProps {
  initialFilters?: {
    categoryType?: 'campaign' | 'project';
    categoryId?: string;
    categoryName?: string;
  };
  onBackToProjects?: () => void;
  onBackToCampaigns?: () => void;
}

export function AssetManager({ initialFilters = {}, onBackToProjects, onBackToCampaigns }: AssetManagerProps) {
  const { assets, campaigns, projects, uploadAsset, updateAsset, deleteAsset } = useAssets();
  const { hasPermission, isViewer, isEditor, isAdmin } = usePermissions();
  
  // Local state for filters
  const [searchFilters, setSearchFilters] = useState({
    query: '',
    type: 'all',
    categoryType: 'all',
    categoryId: ''
  });
  
  // Local state for filtered assets - agora controlamos localmente
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>(assets);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);

  // Função para aplicar todos os filtros
  const applyFilters = (newFilters = searchFilters) => {
    let filtered = [...assets];
    
    // Filtro por projeto/campanha (filtros iniciais)
    if (initialFilters?.categoryType && initialFilters?.categoryId) {
      if (initialFilters.categoryType === 'project') {
        filtered = filtered.filter(asset => 
          (asset.categoryType === 'project' && asset.categoryId === initialFilters.categoryId) ||
          asset.projectId === initialFilters.categoryId
        );
      } else if (initialFilters.categoryType === 'campaign') {
        filtered = filtered.filter(asset => 
          (asset.categoryType === 'campaign' && asset.categoryId === initialFilters.categoryId) ||
          asset.campaignId === initialFilters.categoryId
        );
      }
    }
    
    // Filtro adicional por categoria (se aplicado pelo usuário)
    if (newFilters.categoryType !== 'all' && newFilters.categoryId) {
      if (newFilters.categoryType === 'project') {
        filtered = filtered.filter(asset => 
          (asset.categoryType === 'project' && asset.categoryId === newFilters.categoryId) ||
          asset.projectId === newFilters.categoryId
        );
      } else if (newFilters.categoryType === 'campaign') {
        filtered = filtered.filter(asset => 
          (asset.categoryType === 'campaign' && asset.categoryId === newFilters.categoryId) ||
          asset.campaignId === newFilters.categoryId
        );
      }
    }
    
    // Filtro por tipo
    if (newFilters.type !== 'all') {
      filtered = filtered.filter(asset => asset.type === newFilters.type);
    }
    
    // Filtro por busca textual
    if (newFilters.query.trim()) {
      const query = newFilters.query.toLowerCase().trim();
      filtered = filtered.filter(asset =>
        asset.name.toLowerCase().includes(query) ||
        asset.description?.toLowerCase().includes(query) ||
        asset.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    setFilteredAssets(filtered);
  };

  // Apply initial filters when component loads or assets change
  useEffect(() => {
    if (initialFilters && initialFilters.categoryType) {
      const newFilters = {
        ...searchFilters,
        categoryType: initialFilters.categoryType || 'all',
        categoryId: initialFilters.categoryId || '',
        query: '' // Clear previous query
      };
      setSearchFilters(newFilters);
      applyFilters(newFilters);
    } else {
      applyFilters();
    }
  }, [initialFilters, assets]);

  // Aplicar filtros quando searchFilters muda
  useEffect(() => {
    applyFilters();
  }, [searchFilters]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return Image;
      case 'video': return Video;
      case 'document': return FileText;
      default: return Archive;
    }
  };

  const getTypeBadge = (type: string) => {
    const badges = {
      image: { label: 'Imagem', variant: 'default' as const },
      video: { label: 'Vídeo', variant: 'secondary' as const },
      document: { label: 'Documento', variant: 'outline' as const },
      archive: { label: 'Arquivo', variant: 'destructive' as const }
    };
    return badges[type as keyof typeof badges] || badges.archive;
  };

  const handleSearch = (query: string) => {
    setSearchFilters({ ...searchFilters, query });
  };

  const handleTypeFilter = (type: string) => {
    setSearchFilters({ ...searchFilters, type });
  };

  const handleCategoryFilter = (categoryType: string, categoryId: string = '') => {
    const newFilters = { ...searchFilters, categoryType, categoryId };
    setSearchFilters(newFilters);
  };

  const clearFilters = () => {
    const newFilters = {
      query: '',
      type: 'all',
      categoryType: 'all',
      categoryId: ''
    };
    setSearchFilters(newFilters);
  };

  const handleAssetSelect = (assetId: string) => {
    if (selectedAssets.includes(assetId)) {
      setSelectedAssets(selectedAssets.filter(id => id !== assetId));
    } else {
      setSelectedAssets([...selectedAssets, assetId]);
    }
  };

  // Função para selecionar/deselecionar todos
  const handleSelectAll = () => {
    if (selectedAssets.length === filteredAssets.length) {
      // Se todos estão selecionados, desmarcar todos
      setSelectedAssets([]);
    } else {
      // Selecionar todos os assets visíveis
      setSelectedAssets(filteredAssets.map(asset => asset.id));
    }
  };

  // Limpar seleção
  const handleClearSelection = () => {
    setSelectedAssets([]);
  };

  const handleViewAsset = (asset: Asset) => {
    setViewingAsset(asset);
  };

  const handleAssetChange = (asset: Asset) => {
    setViewingAsset(asset);
  };

  const handleDownload = (asset: Asset) => {
    if (!hasPermission(Permission.DOWNLOAD_MATERIALS)) {
      toast.error('Você não tem permissão para baixar materiais');
      return;
    }
    
    // Download real do arquivo (compatível com Supabase Storage e URLs públicas)
    if (asset.url) {
      fetch(asset.url)
        .then(response => response.blob())
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', asset.name || 'arquivo');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        })
        .catch(() => {
          toast.error('Erro ao baixar o arquivo.');
        });
    } else {
      toast.error('URL do arquivo não encontrada.');
    }
  };

  // Função de download em massa
  const handleBulkDownload = async () => {
    if (!hasPermission(Permission.DOWNLOAD_MATERIALS)) {
      toast.error('Você não tem permissão para baixar materiais');
      return;
    }

    if (selectedAssets.length === 0) {
      toast.error('Nenhum material selecionado');
      return;
    }

    // Simular criação de ZIP e download
    const selectedAssetsData = assets.filter(asset => selectedAssets.includes(asset.id));
    const totalSize = selectedAssetsData.reduce((sum, asset) => sum + asset.size, 0);
    
    toast.promise(
      new Promise((resolve) => {
        // Simular processo de criação do ZIP
        setTimeout(() => {
          resolve(true);
        }, 2000);
      }),
      {
        loading: `Preparando ${selectedAssets.length} materiais para download...`,
        success: `Download em massa iniciado! ${formatFileSize(totalSize)} em ${selectedAssets.length} arquivos`,
        error: 'Erro ao preparar download em massa'
      }
    );

    // Limpar seleção após download
    setSelectedAssets([]);
  };

  // Função de exclusão em massa
  const handleBulkDelete = async () => {
    if (!hasPermission(Permission.DELETE_MATERIALS)) {
      toast.error('Você não tem permissão para excluir materiais');
      return;
    }

    if (selectedAssets.length === 0) {
      toast.error('Nenhum material selecionado');
      return;
    }

    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir ${selectedAssets.length} material${selectedAssets.length > 1 ? 'is' : ''}?`
    );

    if (!confirmDelete) return;

    try {
      // Simular exclusão em massa
      for (const assetId of selectedAssets) {
        await deleteAsset(assetId);
      }
      
      toast.success(`${selectedAssets.length} material${selectedAssets.length > 1 ? 'is excluídos' : ' excluído'} com sucesso!`);
      setSelectedAssets([]);
    } catch (error) {
      toast.error('Erro ao excluir materiais');
    }
  };

  const handleShare = (asset: Asset) => {
    if (!hasPermission(Permission.SHARE_MATERIALS)) {
      toast.error('Você não tem permissão para compartilhar materiais');
      return;
    }
    
    navigator.clipboard.writeText(`https://dam.allmkt.com/assets/${asset.id}`);
    toast.success(`Link de "${asset.name}" copiado para a área de transferência!`);
  };

  const handleEditAsset = async (asset: Asset, updates: Partial<Asset>) => {
    if (!hasPermission(Permission.EDIT_MATERIALS)) {
      toast.error('Você não tem permissão para editar materiais');
      return;
    }
    
    try {
      await updateAsset(asset.id, updates);
      if (viewingAsset?.id === asset.id) {
        setViewingAsset({ ...asset, ...updates });
      }
    } catch (error) {
      toast.error('Erro ao atualizar material');
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!hasPermission(Permission.DELETE_MATERIALS)) {
      toast.error('Você não tem permissão para excluir materiais');
      return;
    }
    
    const asset = assets.find(a => a.id === assetId);
    const confirmDelete = window.confirm(`Tem certeza que deseja excluir "${asset?.name}"?`);
    
    if (!confirmDelete) return;
    
    try {
      await deleteAsset(assetId);
      setViewingAsset(null);
      toast.success('Material excluído com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir material');
    }
  };

  const getCategoryName = (asset: Asset) => {
    // Primeiro tenta usar categoryName diretamente se existir
    if (asset.categoryName) {
      return asset.categoryName;
    }
    
    // Fallback: buscar pelo categoryType e categoryId
    if (asset.categoryType === 'project' && asset.categoryId) {
      const project = projects.find(p => p.id === asset.categoryId);
      return project?.name || 'Projeto';
    }
    
    if (asset.categoryType === 'campaign' && asset.categoryId) {
      const campaign = campaigns.find(c => c.id === asset.categoryId);
      return campaign?.name || 'Campanha';
    }
    
    // Compatibilidade com estrutura antiga
    if (asset.projectId) {
      const project = projects.find(p => p.id === asset.projectId);
      return project?.name || 'Projeto';
    }
    
    if (asset.campaignId) {
      const campaign = campaigns.find(c => c.id === asset.campaignId);
      return campaign?.name || 'Campanha';
    }
    
    return 'Sem categoria';
  };

  // Função para obter a fase do projeto de um asset
  const getProjectPhase = (asset: Asset) => {
    if (asset.metadata?.projectPhase) {
      const phases = {
        'vem-ai': { label: 'Vem Aí', variant: 'secondary' as const },
        'breve-lancamento': { label: 'Breve Lançamento', variant: 'default' as const },
        'lancamento': { label: 'Lançamento', variant: 'destructive' as const }
      };
      return phases[asset.metadata.projectPhase as keyof typeof phases];
    }
    return null;
  };

  // Determine if we're viewing filtered materials by project/campaign
  const isFiltered = initialFilters?.categoryType && initialFilters?.categoryId;
  const filterTitle = isFiltered ? initialFilters?.categoryName : null;

  // Determine which back function to use
  const backFunction = onBackToProjects || onBackToCampaigns;

  // Estado de seleção para "selecionar todos"
  const isAllSelected = filteredAssets.length > 0 && selectedAssets.length === filteredAssets.length;
  const isPartiallySelected = selectedAssets.length > 0 && selectedAssets.length < filteredAssets.length;

  // Viewer restriction alert
  const ViewerRestrictionAlert = () => (
    <Alert className="border-yellow-500/50 bg-yellow-500/10">
      <ShieldX className="h-4 w-4 text-yellow-500" />
      <AlertDescription className="text-yellow-200">
        <strong>Modo somente leitura:</strong> Você pode visualizar e baixar materiais, mas não pode fazer upload, editar ou excluir.
      </AlertDescription>
    </Alert>
  );

  // Enhanced upload form component with mandatory category selection
  const UploadForm = ({ onClose, preSelectedCategory }: { onClose: () => void, preSelectedCategory?: any }) => {
    const [formData, setFormData] = useState({
      file: null as File | null,
      name: '',
      description: '',
      tags: '',
      categoryType: preSelectedCategory?.categoryType || '',
      categoryId: preSelectedCategory?.categoryId || '',
      projectPhase: '' // For project-specific phase
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setFormData({ 
          ...formData, 
          file,
          name: file.name.split('.').slice(0, -1).join('.') // Auto-populate name without extension
        });
        
        // Clear file error when file is selected
        const newErrors = { ...errors };
        delete newErrors.file;
        setErrors(newErrors);
      }
    };

    const handleCategoryTypeChange = (categoryType: string) => {
      setFormData({ 
        ...formData, 
        categoryType, 
        categoryId: '', // Reset category selection
        projectPhase: '' // Reset project phase
      });

      // Clear category-related errors
      const newErrors = { ...errors };
      delete newErrors.categoryType;
      delete newErrors.categoryId;
      delete newErrors.projectPhase;
      setErrors(newErrors);
    };

    const handleCategoryIdChange = (categoryId: string) => {
      setFormData({ 
        ...formData, 
        categoryId,
        projectPhase: formData.categoryType === 'project' ? '' : formData.projectPhase // Reset phase if project changes
      });

      // Clear category error
      const newErrors = { ...errors };
      delete newErrors.categoryId;
      delete newErrors.projectPhase;
      setErrors(newErrors);
    };

    const validateForm = () => {
      const newErrors: Record<string, string> = {};

      if (!formData.file) {
        newErrors.file = 'Arquivo é obrigatório';
      }

      if (!formData.name.trim()) {
        newErrors.name = 'Nome é obrigatório';
      }

      if (!formData.categoryType) {
        newErrors.categoryType = 'Tipo de categoria é obrigatório';
      }

      if (!formData.categoryId) {
        newErrors.categoryId = formData.categoryType === 'campaign' ? 'Campanha é obrigatória' : 'Empreendimento é obrigatório';
      }

      if (formData.categoryType === 'project' && !formData.projectPhase) {
        newErrors.projectPhase = 'Fase do empreendimento é obrigatória';
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!validateForm()) {
        toast.error('Por favor, preencha todos os campos obrigatórios');
        return;
      }

      try {
        // Create the asset with the selected category and additional metadata
        const additionalMetadata: any = {
          name: formData.name,
          description: formData.description,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        };

        // Add project phase if it's a project
        if (formData.categoryType === 'project' && formData.projectPhase) {
          additionalMetadata.projectPhase = formData.projectPhase;
        }

        await uploadAsset(
          formData.file!,
          formData.categoryType === 'project' ? formData.categoryId : undefined,
          formData.categoryType === 'campaign' ? formData.categoryId : undefined,
          additionalMetadata
        );

        toast.success('Material enviado com sucesso!');
        onClose();
      } catch (error) {
        toast.error('Erro ao enviar material');
      }
    };

    // Get available projects and campaigns
    const availableProjects = projects.filter(p => p.image && p.image.trim() !== '');
    const availableCampaigns = campaigns;

    // Get project phases based on status
    const getProjectPhases = () => {
      return [
        { value: 'vem-ai', label: 'Vem Aí' },
        { value: 'breve-lancamento', label: 'Breve Lançamento' },
        { value: 'lancamento', label: 'Lançamento' }
      ];
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File Upload */}
        <div>
          <Label htmlFor="file" className="mb-2">Arquivo *</Label>
          <Input
            id="file"
            type="file"
            onChange={handleFileChange}
            accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar"
            className={`bg-input-background border-border ${errors.file ? 'border-red-500' : ''}`}
          />
          {errors.file && <p className="text-xs text-red-500 mt-1">{errors.file}</p>}
        </div>

        {/* Material Name */}
        <div>
          <Label htmlFor="name" className="mb-2">Nome do Material *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nome do material"
            className={`bg-input-background border-border ${errors.name ? 'border-red-500' : ''}`}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description" className="mb-2">Descrição</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descrição do material (opcional)"
            className="bg-input-background border-border resize-none"
            rows={3}
          />
        </div>

        {/* Category Type Selection */}
        <div>
          <Label className="mb-2">Tipo de Categoria *</Label>
          <Select 
            value={formData.categoryType} 
            onValueChange={handleCategoryTypeChange}
            disabled={!!preSelectedCategory?.categoryType}
          >
            <SelectTrigger className={`bg-input-background border-border ${errors.categoryType ? 'border-red-500' : ''}`}>
              <SelectValue placeholder="Selecione o tipo de categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="campaign">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Campanha
                </div>
              </SelectItem>
              <SelectItem value="project">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Empreendimento
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          {errors.categoryType && <p className="text-xs text-red-500 mt-1">{errors.categoryType}</p>}
        </div>

        {/* Campaign Selection */}
        {formData.categoryType === 'campaign' && (
          <div>
            <Label className="mb-2">Campanha *</Label>
            <Select 
              value={formData.categoryId} 
              onValueChange={handleCategoryIdChange}
              disabled={!!preSelectedCategory?.categoryId}
            >
              <SelectTrigger className={`bg-input-background border-border ${errors.categoryId ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Selecione a campanha" />
              </SelectTrigger>
              <SelectContent>
                {availableCampaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: campaign.color }}
                      />
                      {campaign.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId}</p>}
          </div>
        )}

        {/* Project Selection */}
        {formData.categoryType === 'project' && (
          <>
            <div>
              <Label className="mb-2">Empreendimento *</Label>
              <Select 
                value={formData.categoryId} 
                onValueChange={handleCategoryIdChange}
                disabled={!!preSelectedCategory?.categoryId}
              >
                <SelectTrigger className={`bg-input-background border-border ${errors.categoryId ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Selecione o empreendimento" />
                </SelectTrigger>
                <SelectContent>
                  {availableProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId}</p>}
            </div>

            {/* Project Phase Selection */}
            {formData.categoryId && (
              <div>
                <Label className="mb-2">Fase do Empreendimento *</Label>
                <Select 
                  value={formData.projectPhase} 
                  onValueChange={(value) => setFormData({ ...formData, projectPhase: value })}
                >
                  <SelectTrigger className={`bg-input-background border-border ${errors.projectPhase ? 'border-red-500' : ''}`}>
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
                {errors.projectPhase && <p className="text-xs text-red-500 mt-1">{errors.projectPhase}</p>}
                
                <Alert className="mt-2 border-blue-500/50 bg-blue-500/10">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="text-blue-200">
                    <strong>Vem Aí:</strong> Material para divulgação antes do lançamento<br/>
                    <strong>Breve Lançamento:</strong> Material para pré-lançamento<br/>
                    <strong>Lançamento:</strong> Material para divulgação oficial
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </>
        )}

        {/* Tags */}
        <div>
          <Label htmlFor="tags" className="mb-2">Tags</Label>
          <Input
            id="tags"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="tag1, tag2, tag3 (separadas por vírgula)"
            className="bg-input-background border-border"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Separe múltiplas tags com vírgulas
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={!formData.file} className="flex-1">
            Enviar Material
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    );
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              {backFunction && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={backFunction}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              )}
              <h1 className="flex items-center gap-3 text-[16px]">
                <FolderOpen className="w-8 h-8 text-primary" />
                {isFiltered ? `Materiais - ${filterTitle}` : 'Gerenciamento de Materiais'}
              </h1>
            </div>
            <p className="text-muted-foreground mt-1">
              {isFiltered ? 
                `Visualizando materiais de ${initialFilters?.categoryType === 'campaign' ? 'campanha' : 'empreendimento'}` :
                'Organize, visualize e compartilhe todos os seus ativos digitais'
              }
            </p>
          </div>
          
          {/* Upload Button - only for Admin and Editor */}
          <PermissionGuard permissions={[Permission.UPLOAD_MATERIALS]}>
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar Material
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Enviar Novo Material</DialogTitle>
                  <DialogDescription>
                    Configure as informações do material e associe a uma categoria obrigatória
                  </DialogDescription>
                </DialogHeader>
                <UploadForm 
                  onClose={() => setIsUploadOpen(false)} 
                  preSelectedCategory={initialFilters}
                />
              </DialogContent>
            </Dialog>
          </PermissionGuard>
        </div>

        {/* Viewer Alert */}
        {isViewer() && <ViewerRestrictionAlert />}

        {/* Active filters alert */}
        {isFiltered && (
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <Filter className="h-4 w-4 text-blue-500" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-blue-200">
                Exibindo apenas materiais de <strong>{filterTitle}</strong> ({filteredAssets.length} item{filteredAssets.length !== 1 ? 's' : ''})
              </span>
              {!isFiltered && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-blue-200 hover:text-blue-100 h-auto p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar materiais..."
                  value={searchFilters.query}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 bg-input-background border-border"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={searchFilters.type} onValueChange={handleTypeFilter}>
                  <SelectTrigger className="w-40 bg-input-background border-border">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="image">Imagens</SelectItem>
                    <SelectItem value="video">Vídeos</SelectItem>
                    <SelectItem value="document">Documentos</SelectItem>
                    <SelectItem value="archive">Arquivos</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-1 border border-border rounded-lg p-1 bg-input-background">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="w-8 h-8 p-0"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="w-8 h-8 p-0"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selection Header */}
        {filteredAssets.length > 0 && (
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    className={isPartiallySelected ? "data-[state=checked]:bg-muted" : ""}
                  />
                  <Label className="cursor-pointer" onClick={handleSelectAll}>
                    Selecionar todos ({filteredAssets.length})
                  </Label>
                  {selectedAssets.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedAssets.length} selecionado{selectedAssets.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                
                {selectedAssets.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelection}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Limpar seleção
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bulk Actions */}
        {selectedAssets.length > 0 && (
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Ações em massa:</span>
                <PermissionGuard permissions={[Permission.DOWNLOAD_MATERIALS]}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDownload}
                    className="bg-card hover:bg-accent border-border"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download ({selectedAssets.length})
                  </Button>
                </PermissionGuard>
                <PermissionGuard permissions={[Permission.DELETE_MATERIALS]}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                    className="bg-card hover:bg-accent border-border text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir ({selectedAssets.length})
                  </Button>
                </PermissionGuard>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assets Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAssets.map((asset) => {
              const TypeIcon = getTypeIcon(asset.type);
              const typeBadge = getTypeBadge(asset.type);
              const isSelected = selectedAssets.includes(asset.id);
              
              return (
                <Card 
                  key={asset.id} 
                  className={`group hover:shadow-lg transition-all duration-300 cursor-pointer bg-card/50 backdrop-blur-sm border-border/50 ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleAssetSelect(asset.id)}
                >
                  <CardHeader className="p-3">
                    {/* Checkbox no canto superior esquerdo */}
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleAssetSelect(asset.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-background/80 backdrop-blur-sm shadow-lg"
                      />
                    </div>
                    
                    <div 
                      className="aspect-square relative overflow-hidden rounded-lg bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleViewAsset(asset); 
                      }}
                    >
                      {asset.thumbnailUrl ? (
                        <ImageWithFallback
                          src={asset.thumbnailUrl}
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <TypeIcon className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge variant={typeBadge.variant} className="text-xs">
                          {typeBadge.label}
                        </Badge>
                      </div>
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                        <Eye className="w-8 h-8 text-white drop-shadow-lg" />
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-3 pt-0">
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm truncate" title={asset.name}>
                        {asset.name}
                      </h3>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatFileSize(asset.size)}</span>
                        <span>{asset.downloadCount || 0} downloads</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {getCategoryName(asset)}
                        </Badge>
                        {getProjectPhase(asset) && (
                          <Badge variant={getProjectPhase(asset)?.variant} className="text-xs">
                            {getProjectPhase(asset)?.label}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 pt-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleViewAsset(asset); 
                          }}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleDownload(asset); 
                          }}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                        
                        <PermissionGuard permissions={[Permission.SHARE_MATERIALS]}>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleShare(asset); 
                            }}
                          >
                            <Share2 className="w-3 h-3" />
                          </Button>
                        </PermissionGuard>
                        
                        <PermissionGuard permissions={[Permission.DELETE_MATERIALS]}>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleDeleteAsset(asset.id); 
                            }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </PermissionGuard>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          // List view implementation
          <div className="space-y-2">
            {filteredAssets.map((asset) => {
              const TypeIcon = getTypeIcon(asset.type);
              const typeBadge = getTypeBadge(asset.type);
              const isSelected = selectedAssets.includes(asset.id);
              
              return (
                <Card 
                  key={asset.id} 
                  className={`group hover:shadow-md transition-all duration-300 cursor-pointer bg-card/50 backdrop-blur-sm border-border/50 ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleAssetSelect(asset.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Checkbox */}
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleAssetSelect(asset.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      {/* Thumbnail */}
                      <div 
                        className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleViewAsset(asset); 
                        }}
                      >
                        {asset.thumbnailUrl ? (
                          <ImageWithFallback
                            src={asset.thumbnailUrl}
                            alt={asset.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <TypeIcon className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate mb-1" title={asset.name}>
                              {asset.name}
                            </h3>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={typeBadge.variant} className="text-xs">
                                {typeBadge.label}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {getCategoryName(asset)}
                              </Badge>
                              {getProjectPhase(asset) && (
                                <Badge variant={getProjectPhase(asset)?.variant} className="text-xs">
                                  {getProjectPhase(asset)?.label}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{formatFileSize(asset.size)}</span>
                              <span>{asset.downloadCount || 0} downloads</span>
                              <span>{formatDate(asset.uploadedAt)}</span>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                handleViewAsset(asset); 
                              }}
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                handleDownload(asset); 
                              }}
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            
                            <PermissionGuard permissions={[Permission.SHARE_MATERIALS]}>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  handleShare(asset); 
                                }}
                                title="Compartilhar"
                              >
                                <Share2 className="w-4 h-4" />
                              </Button>
                            </PermissionGuard>
                            
                            <PermissionGuard permissions={[Permission.DELETE_MATERIALS]}>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  handleDeleteAsset(asset.id); 
                                }}
                                className="text-destructive hover:text-destructive"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </PermissionGuard>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {filteredAssets.length === 0 && (
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-12 text-center">
              <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium mb-2">
                {isFiltered ? 'Nenhum material encontrado neste projeto' : 'Nenhum material encontrado'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchFilters.query ? 'Tente ajustar sua pesquisa' : 
                 isFiltered ? `Envie materiais para ${filterTitle}` : 'Envie seus primeiros materiais'}
              </p>
              
              <PermissionGuard 
                permissions={[Permission.UPLOAD_MATERIALS]}
                fallback={
                  isViewer() ? (
                    <p className="text-xs text-muted-foreground">
                      Você não possui permissão para enviar materiais
                    </p>
                  ) : null
                }
              >
                <Button onClick={() => setIsUploadOpen(true)} className="bg-primary hover:bg-primary/90">
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar Primeiro Material
                </Button>
              </PermissionGuard>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Asset Viewer Modal */}
      {viewingAsset && (
        <AssetViewer
          asset={viewingAsset}
          assets={filteredAssets}
          isOpen={!!viewingAsset}
          onClose={() => setViewingAsset(null)}
          onAssetChange={handleAssetChange}
          onDownload={handleDownload}
          onShare={handleShare}
          onEdit={handleEditAsset}
          onDelete={handleDeleteAsset}
        />
      )}
    </>
  );
}