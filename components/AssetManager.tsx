import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
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
  Edit,
  ShieldX,
  CheckSquare,
  Square,
  Package,
  AlertCircle,
  Building,
  Target,
} from 'lucide-react';
import { Asset } from '../types';
import { Permission } from '../types/enums';
import { formatFileSize, formatDate } from '../utils/format';
import { useAssets } from '../contexts/AssetContext';
import { usePermissions, PermissionGuard } from '../contexts/hooks/usePermissions';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { AssetViewer } from './AssetViewer';
import { Progress } from './ui/progress';
import { cn } from './ui/utils';
import { supabase, supabaseUrl } from '../lib/supabase';
import { PageHeader } from './PageHeader';

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
  const { assets, campaigns, projects, updateAsset, deleteAsset, refreshData } = useAssets();
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
        asset.tags.some(tag => tag.toLowerCase().includes(query)) ||
        getCategoryName(asset).toLowerCase().includes(query)
      );
    }
    
    const decorated = filtered.map(asset => ({
      ...asset,
      categoryName: getCategoryName(asset),
    }));
    
    setFilteredAssets(decorated);
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

  useEffect(() => {
    if (!viewingAsset) return;
    const updated = assets.find(asset => asset.id === viewingAsset.id);
    if (
      updated &&
      (updated !== viewingAsset) &&
      (updated.name !== viewingAsset.name ||
        updated.categoryName !== viewingAsset.categoryName ||
        updated.categoryId !== viewingAsset.categoryId ||
        updated.categoryType !== viewingAsset.categoryType)
    ) {
      setViewingAsset(updated);
    }
  }, [assets, viewingAsset]);

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

  const getPreviewUrl = (asset: Asset): string | null => {
    const directThumbnail = asset.thumbnailUrl ?? asset.thumbnail ?? null;
    if (typeof directThumbnail === 'string') {
      const normalized = directThumbnail.trim();
      if (normalized.length > 0) {
        return normalized;
      }
    }

    const metadataSource =
      typeof asset.metadata === 'object' && asset.metadata
        ? (asset.metadata as Record<string, unknown>)
        : null;

    if (metadataSource) {
      const candidateKeys = [
        'previewUrl',
        'thumbnailUrl',
        'posterUrl',
        'coverUrl',
        'thumbnail',
        'preview',
      ];

      for (const key of candidateKeys) {
        const candidate = metadataSource[key];
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
          return candidate.trim();
        }
      }
    }

    if (asset.type === 'image' && typeof asset.url === 'string') {
      const normalized = asset.url.trim();
      if (normalized.length > 0) {
        return normalized;
      }
    }

    return null;
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

    const selectedAssetsData = assets.filter(asset => selectedAssets.includes(asset.id));
    const assetsWithUrl = selectedAssetsData.filter(asset => Boolean(asset.url));

    if (assetsWithUrl.length === 0) {
      toast.error('Os materiais selecionados não possuem arquivos disponíveis para download.');
      return;
    }

    const totalSize = assetsWithUrl.reduce((sum, asset) => sum + asset.size, 0);
    const downloadPromise = (async () => {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();

      for (const asset of assetsWithUrl) {
        if (!asset.url) {
          continue;
        }

        const response = await fetch(asset.url);
        if (!response.ok) {
          throw new Error(`Não foi possível baixar ${asset.name || 'um dos materiais.'}`);
        }

        const buffer = await response.arrayBuffer();
        const hasExtension = asset.name?.includes('.');
        const extension = asset.format ? `.${asset.format.replace(/^\./, '')}` : '';
        const filename = hasExtension ? asset.name : `${asset.name || `material-${asset.id}`}${extension}`;
        zip.file(filename, buffer);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
      link.download = `materiais-${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    })();

    toast.promise(downloadPromise, {
      loading: `Preparando ${assetsWithUrl.length} materiais para download...`,
      success: `Download em massa iniciado! ${formatFileSize(totalSize)} em ${assetsWithUrl.length} arquivos`,
      error: (error) => error instanceof Error ? error.message : 'Erro ao preparar download em massa'
    });

    try {
      await downloadPromise;
      setSelectedAssets([]);
    } catch (error) {
      console.error('[AssetManager] Erro no download em massa', error);
    }
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
    // Prioridade: utilizar os dados mais recentes das coleções carregadas
    if (asset.categoryType === 'project' && asset.categoryId) {
      const project = projects.find(p => p.id === asset.categoryId);
      if (project?.name) {
        return project.name;
      }
    }
    
    if (asset.categoryType === 'campaign' && asset.categoryId) {
      const campaign = campaigns.find(c => c.id === asset.categoryId);
      if (campaign?.name) {
        return campaign.name;
      }
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
    
    if (asset.categoryName) {
      return asset.categoryName;
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
  const filterTitle = isFiltered
    ? initialFilters?.categoryType === 'project'
      ? projects.find(p => p.id === initialFilters?.categoryId)?.name ?? initialFilters?.categoryName ?? null
      : campaigns.find(c => c.id === initialFilters?.categoryId)?.name ?? initialFilters?.categoryName ?? null
    : null;

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

  const UploadForm = ({
    onClose,
    preSelectedCategory,
  }: {
    onClose: () => void;
    preSelectedCategory?: AssetManagerProps['initialFilters'];
  }) => {
    const STORAGE_BUCKET = 'assets';

    type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

    interface UploadItem {
      id: string;
      file: File;
      status: UploadStatus;
      progress: number;
      error?: string;
      tempPath?: string;
      publicUrl?: string;
      mimeType: string;
      extension: string;
    }

    const [formData, setFormData] = useState({
      categoryType: preSelectedCategory?.categoryType || '',
      categoryId: preSelectedCategory?.categoryId || '',
      projectPhase: ''
    });

    const [items, setItems] = useState<UploadItem[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isFinalizing, setIsFinalizing] = useState(false);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const uploadRequestsRef = useRef<Map<string, XMLHttpRequest>>(new Map());
    const uploadedTempPathsRef = useRef<Set<string>>(new Set());
    const [isDragActive, setIsDragActive] = useState(false);

    useEffect(() => {
      const requestMap = uploadRequestsRef.current;
      const tempPathsSet = uploadedTempPathsRef.current;

      return () => {
        requestMap.forEach(request => {
          try {
            request.abort();
          } catch {
            /* noop */
          }
        });
        requestMap.clear();

        if (tempPathsSet.size === 0) {
          tempPathsSet.clear();
          return;
        }

        const pendingPaths = Array.from(tempPathsSet);
        tempPathsSet.clear();

        if (supabase) {
          void supabase.storage.from(STORAGE_BUCKET).remove(pendingPaths);
        }
      };
    }, []);

    const availableProjects = projects.filter(project => project.image && project.image.trim() !== '');
    const availableCampaigns = campaigns;

    const getProjectPhases = () => [
      { value: 'vem-ai', label: 'Vem Aí' },
      { value: 'breve-lancamento', label: 'Breve Lançamento' },
      { value: 'lancamento', label: 'Lançamento' }
    ];

    const generateId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

    const normalizeFileName = (file: File) => {
      const parts = file.name.split('.');
      if (parts.length === 1) return file.name;
      parts.pop();
      return parts.join('.') || file.name;
    };

    const determineAssetType = (file: File): 'image' | 'video' | 'document' | 'archive' => {
      const mime = file.type;
      if (mime.startsWith('image/')) return 'image';
      if (mime.startsWith('video/')) return 'video';
      if (/pdf|text|presentation|word|sheet|document/i.test(mime)) return 'document';
      return 'archive';
    };

    const encodeStoragePath = (path: string) =>
      path
        .split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');

    const getAccessToken = async (): Promise<string | null> => {
      if (!supabase) return null;
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    };

    const trackTempPath = (path?: string) => {
      if (!path) return;
      uploadedTempPathsRef.current.add(path);
    };

    const untrackTempPath = (path?: string) => {
      if (!path) return;
      uploadedTempPathsRef.current.delete(path);
    };

    const markItem = (id: string, updates: Partial<UploadItem>) => {
      setItems(prev => prev.map(item => (item.id === id ? { ...item, ...updates } : item)));
    };

    const removeItem = async (id: string) => {
      if (isFinalizing) return;

      const target = items.find(item => item.id === id);
      if (!target) return;

      const activeUpload = uploadRequestsRef.current.get(id);
      if (activeUpload) {
        activeUpload.abort();
      }
      uploadRequestsRef.current.delete(id);

      if (target.tempPath) {
        if (supabase) {
          try {
            await supabase.storage.from(STORAGE_BUCKET).remove([target.tempPath]);
          } finally {
            untrackTempPath(target.tempPath);
          }
        } else {
          untrackTempPath(target.tempPath);
        }
      }

      setItems(prev => prev.filter(item => item.id !== id));
    };

    const startUpload = async (newItem: UploadItem) => {
      markItem(newItem.id, { status: 'uploading', progress: 0, error: undefined });

      const supabaseClient = supabase;

      if (!supabaseClient || !supabaseUrl) {
        setTimeout(() => {
          markItem(newItem.id, {
            status: 'success',
            progress: 100,
            tempPath: `dev/${newItem.id}-${newItem.file.name}`,
            publicUrl: URL.createObjectURL(newItem.file),
          });
        }, 500);
        return;
      }

      const accessToken = await getAccessToken();
      if (!accessToken) {
        markItem(newItem.id, {
          status: 'error',
          progress: 0,
          error: 'Sessão expirada. Faça login novamente.',
        });
        return;
      }

      const sanitized = newItem.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const tempPath = `temp-uploads/${newItem.id}-${sanitized}`;
      const uploadUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${encodeURIComponent(STORAGE_BUCKET)}/${encodeStoragePath(tempPath)}`;

      try {
        const xhr = new XMLHttpRequest();
        uploadRequestsRef.current.set(newItem.id, xhr);

        xhr.upload.onprogress = (event: ProgressEvent<EventTarget>) => {
          if (!event.lengthComputable) {
            markItem(newItem.id, { progress: 90 });
            return;
          }

          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
          markItem(newItem.id, { progress: percent });
        };

        xhr.onerror = () => {
          uploadRequestsRef.current.delete(newItem.id);
          markItem(newItem.id, {
            status: 'error',
            progress: 0,
            error: 'Falha ao enviar arquivo. Verifique sua conexão e tente novamente.',
          });
        };

        xhr.onabort = () => {
          uploadRequestsRef.current.delete(newItem.id);
        };

        xhr.onload = () => {
          uploadRequestsRef.current.delete(newItem.id);

          if (xhr.status >= 200 && xhr.status < 300) {
            trackTempPath(tempPath);
            const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(tempPath);
            markItem(newItem.id, {
              status: 'success',
              progress: 100,
              tempPath,
              publicUrl: data.publicUrl || '',
            });
            return;
          }

          const errorMessage = xhr.responseText || 'Falha ao enviar arquivo';
          markItem(newItem.id, {
            status: 'error',
            progress: 0,
            error: typeof errorMessage === 'string' ? errorMessage : 'Falha ao enviar arquivo',
          });
        };

        xhr.open('POST', uploadUrl, true);
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        xhr.setRequestHeader('x-upsert', 'true');
        xhr.setRequestHeader('Cache-Control', 'max-age=3600');
        xhr.setRequestHeader('Content-Type', newItem.file.type || 'application/octet-stream');
        xhr.send(newItem.file);
      } catch (_error) {
        uploadRequestsRef.current.delete(newItem.id);
        markItem(newItem.id, {
          status: 'error',
          progress: 0,
          error: 'Erro inesperado ao iniciar o upload.',
        });
      }
    };

    const addFiles = (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (!files.length) return;

      const freshItems: UploadItem[] = files.map(file => ({
        id: generateId(),
        file,
        status: 'pending',
        progress: 0,
        mimeType: file.type,
        extension: file.name.split('.').pop()?.toLowerCase() || '',
      }));

      setItems(prev => [...prev, ...freshItems]);
      setErrors(prev => {
        const next = { ...prev };
        delete next.files;
        return next;
      });

      freshItems.forEach(startUpload);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
        addFiles(event.target.files);
        event.target.value = '';
      }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragActive(true);
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragActive(false);
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragActive(false);
      if (event.dataTransfer?.files?.length) {
        addFiles(event.dataTransfer.files);
      }
    };

    const handleSelectAreaClick = () => {
      fileInputRef.current?.click();
    };

    const handleSelectAreaKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        fileInputRef.current?.click();
      }
    };

    const handleCategoryTypeChange = (categoryType: string) => {
      setFormData(prev => ({
        ...prev,
        categoryType,
        categoryId: '',
        projectPhase: ''
      }));

      setErrors(prev => {
        const next = { ...prev };
        delete next.categoryType;
        delete next.categoryId;
        delete next.projectPhase;
        return next;
      });
    };

    const handleCategoryIdChange = (categoryId: string) => {
      setFormData(prev => ({
        ...prev,
        categoryId,
        projectPhase: prev.categoryType === 'project' ? '' : prev.projectPhase
      }));

      setErrors(prev => {
        const next = { ...prev };
        delete next.categoryId;
        delete next.projectPhase;
        return next;
      });
    };

    const handleProjectPhaseChange = (projectPhase: string) => {
      setFormData(prev => ({
        ...prev,
        projectPhase,
      }));

      setErrors(prev => {
        const next = { ...prev };
        delete next.projectPhase;
        return next;
      });
    };

    const validateForm = () => {
      const newErrors: Record<string, string> = {};

      if (items.length === 0) {
        newErrors.files = 'Selecione pelo menos um arquivo.';
      }

      if (!formData.categoryType) {
        newErrors.categoryType = 'Tipo de categoria é obrigatório';
      }

      if (!formData.categoryId) {
        newErrors.categoryId =
          formData.categoryType === 'campaign'
            ? 'Campanha é obrigatória'
            : 'Empreendimento é obrigatório';
      }

      if (formData.categoryType === 'project' && !formData.projectPhase) {
        newErrors.projectPhase = 'Fase do empreendimento é obrigatória';
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (event: React.FormEvent) => {
      event.preventDefault();

      if (!validateForm()) {
        toast.error('Por favor, corrija os erros antes de prosseguir');
        return;
      }

      const readyItems = items.filter(item => item.status === 'success' && item.tempPath);

      if (readyItems.length === 0) {
        toast.error('Aguarde o upload dos arquivos antes de enviar.');
        return;
      }

      if (readyItems.length !== items.length) {
        toast.error('Alguns arquivos ainda estão sendo enviados.');
        return;
      }

      if (!supabase) {
        toast.success('Materiais enviados (modo desenvolvimento).');
        setItems([]);
        onClose();
        return;
      }

      const accessToken = await getAccessToken();

      if (!accessToken) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      setIsFinalizing(true);

      try {
        const response = await fetch('/api/assets/finalize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            categoryType: formData.categoryType,
            categoryId: formData.categoryId,
            projectPhase: formData.categoryType === 'project' ? formData.projectPhase : null,
            items: readyItems.map(item => ({
              tempPath: item.tempPath,
              originalName: item.file.name,
              baseName: normalizeFileName(item.file),
              extension: item.extension,
              mimeType: item.mimeType,
              size: item.file.size,
              assetType: determineAssetType(item.file),
            })),
          }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.message || 'Erro ao enviar materiais');
        }

        await refreshData();
        uploadedTempPathsRef.current.clear();
        toast.success('Materiais enviados com sucesso!');
        setItems([]);
        onClose();
      } catch (error) {
        const message = error instanceof Error && error.message
          ? error.message
          : 'Erro ao enviar materiais';
        toast.error(message);
      } finally {
        setIsFinalizing(false);
      }
    };

    const statusBadge = (status: UploadStatus) => {
      const variants: Record<UploadStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
        pending: { label: 'Pendente', variant: 'outline' },
        uploading: { label: 'Enviando', variant: 'secondary' },
        success: { label: 'Concluído', variant: 'default' },
        error: { label: 'Erro', variant: 'destructive' }
      };

      const badge = variants[status];
      return <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>;
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="file" className="mb-2">Arquivos *</Label>
          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleSelectAreaClick}
            onKeyDown={handleSelectAreaKeyDown}
            role="button"
            tabIndex={0}
            className={cn(
              'relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-input-background/40 p-6 text-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              isDragActive && 'border-primary bg-primary/10',
              errors.files && 'border-red-500/60'
            )}
          >
            <Upload className="w-10 h-10 text-primary" />
            <div className="text-sm font-medium">Arraste arquivos aqui</div>
            <div className="text-xs text-muted-foreground">ou clique para selecionar</div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isFinalizing}
            >
              Selecionar arquivos
            </Button>
            <input
              ref={fileInputRef}
              id="file"
              type="file"
              multiple
              onChange={handleFileChange}
              accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar"
              className="hidden"
            />
            {items.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {items.length} arquivo{items.length > 1 ? 's' : ''} na fila
              </p>
            )}
          </div>
          {errors.files && <p className="text-xs text-red-500 mt-1">{errors.files}</p>}
        </div>

        {items.length > 0 && (
          <div className="space-y-3">
            {items.map(item => (
              <div
                key={item.id}
                className="space-y-2 rounded-lg border border-border bg-muted/20 p-3"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className="font-medium text-sm leading-snug break-words"
                        title={item.file.name}
                      >
                        {item.file.name}
                      </p>
                      <span className="flex-shrink-0">{statusBadge(item.status)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-normal break-words leading-relaxed">
                      {formatFileSize(item.file.size)} · {item.mimeType || 'Arquivo'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="w-10 text-right text-xs text-muted-foreground">
                      {item.progress}%
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      disabled={isFinalizing}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Progress value={item.progress} className="h-2" />
                {item.error && <p className="text-xs text-red-500">{item.error}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label className="mb-2">Tipo de categoria *</Label>
            <Select
              value={formData.categoryType}
              onValueChange={handleCategoryTypeChange}
              disabled={isFinalizing || !!preSelectedCategory?.categoryType}
            >
              <SelectTrigger className={cn('bg-input-background border-border', errors.categoryType && 'border-red-500')}>
                <SelectValue placeholder="Selecione o tipo" />
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

          {formData.categoryType === 'campaign' && (
            <div>
              <Label className="mb-2">Campanha *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={handleCategoryIdChange}
                disabled={isFinalizing || !!preSelectedCategory?.categoryId}
              >
                <SelectTrigger className={cn('bg-input-background border-border', errors.categoryId && 'border-red-500')}>
                  <SelectValue placeholder="Selecione a campanha" />
                </SelectTrigger>
                <SelectContent>
                  {availableCampaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
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

          {formData.categoryType === 'project' && (
            <>
              <div>
                <Label className="mb-2">Empreendimento *</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={handleCategoryIdChange}
                  disabled={isFinalizing || !!preSelectedCategory?.categoryId}
                >
                  <SelectTrigger className={cn('bg-input-background border-border', errors.categoryId && 'border-red-500')}>
                    <SelectValue placeholder="Selecione o empreendimento" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProjects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId}</p>}
              </div>

              <div>
                <Label className="mb-2">Fase do empreendimento *</Label>
                <Select
                  value={formData.projectPhase}
                  onValueChange={handleProjectPhaseChange}
                  disabled={isFinalizing}
                >
                  <SelectTrigger className={cn('bg-input-background border-border', errors.projectPhase && 'border-red-500')}>
                    <SelectValue placeholder="Selecione a fase" />
                  </SelectTrigger>
                  <SelectContent>
                    {getProjectPhases().map(phase => (
                      <SelectItem key={phase.value} value={phase.value}>
                        {phase.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.projectPhase && <p className="text-xs text-red-500 mt-1">{errors.projectPhase}</p>}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Os arquivos começam a ser enviados imediatamente. Ao confirmar, apenas associamos ao empreendimento ou campanha escolhida.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button type="button" variant="outline" onClick={onClose} disabled={isFinalizing}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isFinalizing || items.length === 0}>
              {isFinalizing ? 'Finalizando...' : 'Enviar materiais'}
            </Button>
          </div>
        </div>
      </form>
    );
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          icon={FolderOpen}
          title={isFiltered ? `Materiais - ${filterTitle ?? 'Categoria'}` : 'Gerenciamento de Materiais'}
          description={
            isFiltered
              ? `Visualizando materiais de ${
                  initialFilters?.categoryType === 'campaign' ? 'campanha' : 'empreendimento'
                }`
              : 'Organize, visualize e compartilhe todos os seus ativos digitais'
          }
          backAction={
            backFunction
              ? {
                  label: 'Voltar',
                  onClick: backFunction,
                }
              : undefined
          }
          action={
            <PermissionGuard permissions={[Permission.UPLOAD_MATERIALS]}>
              <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-primary hover:bg-primary/90 sm:w-auto">
                    <Upload className="mr-2 h-4 w-4" />
                    Enviar Material
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] w-full max-w-[calc(100vw-2rem)] sm:max-w-2xl overflow-y-auto overflow-x-hidden">
                  <DialogHeader>
                    <DialogTitle>Enviar Novo Material</DialogTitle>
                    <DialogDescription>
                      Selecione um ou mais arquivos e associe todos à mesma campanha ou empreendimento. Os uploads
                      acontecem em lotes de até três materiais simultâneos.
                    </DialogDescription>
                  </DialogHeader>
                  <UploadForm onClose={() => setIsUploadOpen(false)} preSelectedCategory={initialFilters} />
                </DialogContent>
              </Dialog>
            </PermissionGuard>
          }
        />

        {/* Viewer Alert */}
        {isViewer() && <ViewerRestrictionAlert />}

        {/* Active filters alert */}
        {isFiltered && (
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <Filter className="h-4 w-4 text-blue-500" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-blue-200">
                Exibindo apenas materiais de <strong>{filterTitle ?? 'Categoria'}</strong> ({filteredAssets.length} item{filteredAssets.length !== 1 ? 's' : ''})
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
            {filteredAssets.map((asset) => {
              const TypeIcon = getTypeIcon(asset.type);
              const typeBadge = getTypeBadge(asset.type);
              const isSelected = selectedAssets.includes(asset.id);
              
              return (
                <Card
                  key={asset.id}
                  className={`group flex h-full flex-col cursor-pointer bg-card/50 backdrop-blur-sm border-border/50 transition-all duration-300 hover:shadow-lg ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleAssetSelect(asset.id)}
                >
                  <CardHeader className="relative p-2 sm:p-3">
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
                      className="relative aspect-square overflow-hidden rounded-lg bg-muted transition-opacity hover:opacity-80"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleViewAsset(asset); 
                      }}
                    >
                      {(() => {
                        const previewUrl = getPreviewUrl(asset);
                        if (!previewUrl) {
                          return (
                            <div className="w-full h-full flex items-center justify-center">
                              <TypeIcon className="h-8 w-8 text-muted-foreground sm:h-10 sm:w-10" />
                            </div>
                          );
                        }
                        return (
                          <ImageWithFallback
                            src={previewUrl}
                            alt={asset.name}
                            className="w-full h-full object-cover"
                          />
                        );
                      })()}
                      <div className="absolute top-2 right-2">
                        <Badge variant={typeBadge.variant} className="text-[0.65rem] sm:text-xs">
                          {typeBadge.label}
                        </Badge>
                      </div>
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                        <Eye className="h-6 w-6 text-white drop-shadow-lg sm:h-8 sm:w-8" />
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex flex-1 flex-col p-2 pt-0 sm:p-3 sm:pt-0">
                    <div className="space-y-2">
                      <h3 className="truncate text-xs font-medium sm:text-sm" title={asset.name}>
                        {asset.name}
                      </h3>
                      
                      <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground sm:text-xs">
                        <span>{formatFileSize(asset.size)}</span>
                        <span>{asset.downloadCount || 0} downloads</span>
                      </div>
                      
                      <div className="flex min-w-0 flex-wrap items-center gap-1">
                        <Badge variant="outline" className="max-w-full truncate text-[0.65rem] sm:text-xs">
                          {getCategoryName(asset)}
                        </Badge>
                        {getProjectPhase(asset) && (
                          <Badge variant={getProjectPhase(asset)?.variant} className="max-w-full truncate text-[0.65rem] sm:text-xs">
                            {getProjectPhase(asset)?.label}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex gap-1 pt-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 rounded-xl sm:w-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewAsset(asset);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 rounded-xl sm:w-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(asset);
                          }}
                        >
                          <Download className="h-3 w-3" />
                        </Button>

                        <PermissionGuard permissions={[Permission.SHARE_MATERIALS]}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="hidden h-8 w-8 rounded-xl sm:flex sm:w-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShare(asset);
                            }}
                          >
                            <Share2 className="h-3 w-3" />
                          </Button>
                        </PermissionGuard>

                        <PermissionGuard permissions={[Permission.DELETE_MATERIALS]}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="hidden h-8 w-8 rounded-xl text-destructive hover:text-destructive sm:flex sm:w-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAsset(asset.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
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
                        {(() => {
                          const previewUrl = getPreviewUrl(asset);
                          if (!previewUrl) {
                            return (
                              <div className="w-full h-full flex items-center justify-center">
                                <TypeIcon className="w-8 h-8 text-muted-foreground" />
                              </div>
                            );
                          }
                          return (
                            <ImageWithFallback
                              src={previewUrl}
                              alt={asset.name}
                              className="w-full h-full object-cover"
                            />
                          );
                        })()}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate mb-1" title={asset.name}>
                              {asset.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mb-2 min-w-0">
                              <Badge variant={typeBadge.variant} className="max-w-full truncate text-[0.65rem] sm:text-xs">
                                {typeBadge.label}
                              </Badge>
                              <Badge variant="outline" className="max-w-full truncate text-[0.65rem] sm:text-xs">
                                {getCategoryName(asset)}
                              </Badge>
                              {getProjectPhase(asset) && (
                                <Badge variant={getProjectPhase(asset)?.variant} className="max-w-full truncate text-[0.65rem] sm:text-xs">
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
                 isFiltered ? `Envie materiais para ${filterTitle ?? 'essa categoria'}` : 'Envie seus primeiros materiais'}
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






























