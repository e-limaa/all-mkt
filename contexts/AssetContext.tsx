import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured, uploadFile, getPublicUrl, deleteFile } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Asset, Campaign, Project } from '../types';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

// Dashboard statistics interface
interface DashboardStats {
  totalAssets: number;
  downloadCount: number;
  totalUsers: number;
  activeSharedLinks: number;
  storageUsed: number; // in GB
  storageLimit: number; // in GB
  assetsByType: {
    image: number;
    video: number;
    document: number;
    archive: number;
  };
  assetsByCampaign: Record<string, number>;
  assetsByProject: Record<string, number>;
  recentActivity: Array<{
    id: string;
    type: 'upload' | 'download' | 'share';
    userName: string;
    assetName: string;
    categoryName?: string;
    timestamp: string;
  }>;
}

interface AssetContextType {
  assets: Asset[];
  campaigns: Campaign[];
  projects: Project[];
  dashboardStats: DashboardStats;
  loading: boolean;
  uploadAsset: (file: File, projectId?: string, campaignId?: string, metadata?: any) => Promise<void>;
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  createCampaign: (campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  updateCampaign: (id: string, updates: Partial<Campaign>) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
  sharedLinks: any[]; // Adicionado para build funcionar
}

const AssetContext = createContext<AssetContextType | undefined>(undefined);

export function AssetProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  const isConfigured = isSupabaseConfigured();

  // Calculate dashboard statistics based on current data
  const calculateDashboardStats = (
    currentAssets: Asset[], 
    currentCampaigns: Campaign[], 
    currentProjects: Project[]
  ): DashboardStats => {
    // Basic counts
    const totalAssets = currentAssets.length;
    const downloadCount = currentAssets.reduce((sum, asset) => sum + (asset.downloadCount || 0), 0);
    
    // Storage calculation (convert bytes to GB)
    const totalSizeBytes = currentAssets.reduce((sum, asset) => sum + asset.size, 0);
    const storageUsed = totalSizeBytes / (1024 * 1024 * 1024); // Convert to GB
    const storageLimit = 100; // 100GB limit for demo
    
    // Assets by type
    const assetsByType = currentAssets.reduce((acc, asset) => {
      acc[asset.type] = (acc[asset.type] || 0) + 1;
      return acc;
    }, { image: 0, video: 0, document: 0, archive: 0 });

    // Assets by campaign
    const assetsByCampaign: Record<string, number> = {};
    currentAssets.forEach(asset => {
      if (asset.categoryType === 'campaign' && asset.categoryName) {
        assetsByCampaign[asset.categoryName] = (assetsByCampaign[asset.categoryName] || 0) + 1;
      }
    });

    // Assets by project
    const assetsByProject: Record<string, number> = {};
    currentAssets.forEach(asset => {
      if (asset.categoryType === 'project' && asset.categoryName) {
        assetsByProject[asset.categoryName] = (assetsByProject[asset.categoryName] || 0) + 1;
      }
    });

    // Recent activity (mock data based on current assets)
    const recentActivity = currentAssets.slice(0, 10).map(asset => ({
      id: asset.id,
      type: 'upload' as const,
      userName: asset.uploadedBy,
      assetName: asset.name,
      categoryName: asset.categoryName,
      timestamp: asset.uploadedAt
    }));

    return {
      totalAssets,
      downloadCount,
      totalUsers: 5, // Mock value
      activeSharedLinks: 12, // Mock value
      storageUsed,
      storageLimit,
      assetsByType,
      assetsByCampaign,
      assetsByProject,
      recentActivity
    };
  };

  // Memoized dashboard stats
  const dashboardStats = calculateDashboardStats(assets, campaigns, projects);

  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user, isConfigured]);

  const refreshData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await Promise.all([
        fetchAssets(),
        fetchCampaigns(),
        fetchProjects()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          uploaded_by_user:users!assets_uploaded_by_fkey(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedAssets: Asset[] = data.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        type: item.type as Asset['type'],
        format: item.format,
        size: item.size,
        url: item.url,
        thumbnailUrl: item.thumbnail_url || undefined,
        tags: item.tags || [],
        categoryType: item.category_type,
        categoryId: item.category_id,
        categoryName: item.category_name || '',
        projectId: item.category_type === 'project' ? item.category_id : undefined,
        campaignId: item.category_type === 'campaign' ? item.category_id : undefined,
        isPublic: item.is_public,
        downloadCount: item.download_count,
        metadata: item.metadata ? {
          projectPhase: item.project_phase || undefined,
          width: item.metadata?.width,
          height: item.metadata?.height,
          duration: item.metadata?.duration,
          ...item.metadata
        } : undefined,
        uploadedAt: item.created_at,
        uploadedBy: (item as any).uploaded_by_user?.name || 'Usuário'
      }));

      setAssets(transformedAssets);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Erro ao carregar materiais');
    }
  };

  const fetchCampaigns = async () => {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedCampaigns: Campaign[] = data.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        color: item.color,
        status: item.status as Campaign['status'],
        startDate: item.start_date || undefined,
        endDate: item.end_date || undefined,
        createdAt: item.created_at,
        createdBy: item.created_by,
        tags: []
      }));

      setCampaigns(transformedCampaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Erro ao carregar campanhas');
    }
  };

  const fetchProjects = async () => {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedProjects: Project[] = data.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        image: item.image || '',
        color: item.color,
        status: item.status as Project['status'],
        location: item.location || '',
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        createdBy: item.created_by
      }));

      setProjects(transformedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Erro ao carregar projetos');
    }
  };

  const uploadAsset = async (file: File, projectId?: string, campaignId?: string, metadata?: any) => {
    if (!user) throw new Error('Usuário não encontrado');

    if (!isConfigured) {
      // Modo de desenvolvimento - simular upload
      setLoading(true);
      
      setTimeout(() => {
        const fileType = getFileType(file);
        const categoryType = projectId ? 'project' : 'campaign';
        const categoryId = projectId || campaignId!;
        
        let categoryName = '';
        if (projectId) {
          const project = projects.find(p => p.id === projectId);
          categoryName = project?.name || '';
        } else if (campaignId) {
          const campaign = campaigns.find(c => c.id === campaignId);
          categoryName = campaign?.name || '';
        }

        const newAsset: Asset = {
          id: uuidv4(),
          name: metadata?.name || file.name,
          description: metadata?.description || '',
          type: fileType,
          format: file.name.split('.').pop()?.toLowerCase() || '',
          size: file.size,
          url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
          thumbnailUrl: fileType === 'image' ? 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200' : undefined,
          tags: metadata?.tags || [],
          categoryType,
          categoryId,
          categoryName,
          projectId: projectId,
          campaignId: campaignId,
          isPublic: false,
          downloadCount: 0,
          metadata: metadata ? {
            ...metadata,
            originalName: file.name,
            mimeType: file.type
          } : undefined,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.name
        };

        setAssets(prev => [newAsset, ...prev]);
        toast.success('Material enviado com sucesso! (Modo desenvolvimento)');
        setLoading(false);
      }, 2000);
      
      return;
    }

    if (!supabase) throw new Error('Supabase não configurado');

    setLoading(true);
    try {
      // Rest of the real upload logic...
      const fileType = getFileType(file);
      const fileFormat = file.name.split('.').pop()?.toLowerCase() || '';
      const filename = `${user.id}/${uuidv4()}.${fileFormat}`;
      
      await uploadFile(file, 'assets', filename);
      const fileUrl = getPublicUrl('assets', filename);
      
      let thumbnailUrl = null;
      if (fileType === 'image') {
        thumbnailUrl = fileUrl;
      }

      const categoryType = projectId ? 'project' : 'campaign';
      const categoryId = projectId || campaignId!;
      
      let categoryName = '';
      if (projectId) {
        const project = projects.find(p => p.id === projectId);
        categoryName = project?.name || '';
      } else if (campaignId) {
        const campaign = campaigns.find(c => c.id === campaignId);
        categoryName = campaign?.name || '';
      }

      const { error } = await supabase
        .from('assets')
        .insert({
          name: metadata?.name || file.name,
          description: metadata?.description || null,
          type: fileType,
          format: fileFormat,
          size: file.size,
          url: fileUrl,
          thumbnail_url: thumbnailUrl,
          tags: metadata?.tags || [],
          category_type: categoryType,
          category_id: categoryId,
          category_name: categoryName,
          project_phase: metadata?.projectPhase || null,
          is_public: false,
          metadata: metadata ? {
            ...metadata,
            originalName: file.name,
            mimeType: file.type
          } : null,
          uploaded_by: user.id
        });

      if (error) throw error;

      await fetchAssets();
      toast.success('Material enviado com sucesso!');
    } catch (error: any) {
      console.error('Error uploading asset:', error);
      toast.error(error.message || 'Erro ao enviar material');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Mock implementations for development mode
  const updateAsset = async (id: string, updates: Partial<Asset>) => {
    if (!isConfigured) {
      setAssets(prev => prev.map(asset => 
        asset.id === id ? { ...asset, ...updates } : asset
      ));
      toast.success('Material atualizado com sucesso! (Modo desenvolvimento)');
      return;
    }

    if (!supabase) throw new Error('Supabase não configurado');

    try {
      const { error } = await supabase
        .from('assets')
        .update({
          name: updates.name,
          description: updates.description,
          tags: updates.tags,
          is_public: updates.isPublic,
          metadata: updates.metadata
        })
        .eq('id', id);

      if (error) throw error;

      await fetchAssets();
      toast.success('Material atualizado com sucesso!');
    } catch (error: any) {
      console.error('Error updating asset:', error);
      toast.error(error.message || 'Erro ao atualizar material');
      throw error;
    }
  };

  const deleteAsset = async (id: string) => {
    if (!isConfigured) {
      setAssets(prev => prev.filter(asset => asset.id !== id));
      toast.success('Material excluído com sucesso! (Modo desenvolvimento)');
      return;
    }

    if (!supabase) throw new Error('Supabase não configurado');

    try {
      const asset = assets.find(a => a.id === id);
      if (!asset) throw new Error('Material não encontrado');

      const filename = asset.url.split('/').pop();
      if (filename) {
        await deleteFile('assets', `${user?.id}/${filename}`);
      }

      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchAssets();
      toast.success('Material excluído com sucesso!');
    } catch (error: any) {
      console.error('Error deleting asset:', error);
      toast.error(error.message || 'Erro ao excluir material');
      throw error;
    }
  };

  // Mock implementations for campaigns and projects
  const createCampaign = async (campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    if (!user) throw new Error('Usuário não encontrado');

    if (!isConfigured) {
      const newCampaign: Campaign = {
        ...campaign,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        createdBy: user.id,
        tags: []
      };
      setCampaigns(prev => [newCampaign, ...prev]);
      toast.success('Campanha criada com sucesso! (Modo desenvolvimento)');
      return;
    }

    if (!supabase) throw new Error('Supabase não configurado');

    try {
      const { error } = await supabase
        .from('campaigns')
        .insert({
          ...campaign,
          created_by: user.id
        });

      if (error) throw error;

      await fetchCampaigns();
      toast.success('Campanha criada com sucesso!');
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast.error(error.message || 'Erro ao criar campanha');
      throw error;
    }
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    if (!isConfigured) {
      setCampaigns(prev => prev.map(campaign => 
        campaign.id === id ? { ...campaign, ...updates } : campaign
      ));
      toast.success('Campanha atualizada com sucesso! (Modo desenvolvimento)');
      return;
    }

    if (!supabase) throw new Error('Supabase não configurado');

    try {
      const { error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await fetchCampaigns();
      toast.success('Campanha atualizada com sucesso!');
    } catch (error: any) {
      console.error('Error updating campaign:', error);
      toast.error(error.message || 'Erro ao atualizar campanha');
      throw error;
    }
  };

  const deleteCampaign = async (id: string) => {
    if (!isConfigured) {
      setCampaigns(prev => prev.filter(campaign => campaign.id !== id));
      toast.success('Campanha excluída com sucesso! (Modo desenvolvimento)');
      return;
    }

    if (!supabase) throw new Error('Supabase não configurado');

    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchCampaigns();
      toast.success('Campanha excluída com sucesso!');
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      toast.error(error.message || 'Erro ao excluir campanha');
      throw error;
    }
  };

  const createProject = async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    if (!user) throw new Error('Usuário não encontrado');

    if (!isConfigured) {
      const newProject: Project = {
        ...project,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        createdBy: user.id,
        tags: []
      };
      setProjects(prev => [newProject, ...prev]);
      toast.success('Projeto criado com sucesso! (Modo desenvolvimento)');
      return;
    }

    if (!supabase) throw new Error('Supabase não configurado');

    try {
      const { error } = await supabase
        .from('projects')
        .insert({
          ...project
        });

      if (error) throw error;

      await fetchProjects();
      toast.success('Projeto criado com sucesso!');
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error(error.message || 'Erro ao criar projeto');
      throw error;
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    if (!isConfigured) {
      setProjects(prev => prev.map(project => 
        project.id === id ? { ...project, ...updates } : project
      ));
      toast.success('Projeto atualizado com sucesso! (Modo desenvolvimento)');
      return;
    }

    if (!supabase) throw new Error('Supabase não configurado');

    try {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await fetchProjects();
      toast.success('Projeto atualizado com sucesso!');
    } catch (error: any) {
      console.error('Error updating project:', error);
      toast.error(error.message || 'Erro ao atualizar projeto');
      throw error;
    }
  };

  const deleteProject = async (id: string) => {
    if (!isConfigured) {
      setProjects(prev => prev.filter(project => project.id !== id));
      toast.success('Projeto excluído com sucesso! (Modo desenvolvimento)');
      return;
    }

    if (!supabase) throw new Error('Supabase não configurado');

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchProjects();
      toast.success('Projeto excluído com sucesso!');
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast.error(error.message || 'Erro ao excluir projeto');
      throw error;
    }
  };

  const getFileType = (file: File): Asset['type'] => {
    const mimeType = file.type;
    
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
    return 'archive';
  };

  const value = {
    assets,
    campaigns,
    projects,
    dashboardStats,
    loading,
    uploadAsset,
    updateAsset,
    deleteAsset,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    createProject,
    updateProject,
    deleteProject,
    refreshData,
    sharedLinks: []
  };

  return (
    <AssetContext.Provider value={value}>
      {children}
    </AssetContext.Provider>
  );
}

export function useAssets() {
  const context = useContext(AssetContext);
  if (context === undefined) {
    throw new Error('useAssets deve ser usado dentro de um AssetProvider');
  }
  return context;
}