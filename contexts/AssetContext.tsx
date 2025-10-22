// @ts-nocheck
import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { supabase, isSupabaseConfigured, uploadFile, getPublicUrl, deleteFile } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Asset, Campaign, Project } from '../types';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { useConfig } from './ConfigContext';
import { DEFAULT_SETTINGS } from '../lib/settings';
import { Database } from '../types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// Dashboard statistics interface
type SharedLinkRow = Database['public']['Tables']['shared_links']['Row'];

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
  sharedLinks: SharedLinkRow[];
}

const AssetContext = createContext<AssetContextType | undefined>(undefined);

const normalizeProjectStatusValue = (status?: string | null) => {
  switch (status) {
    case 'vem-ai':
    case 'em-desenvolvimento':
      return 'vem-ai';
    case 'breve-lancamento':
      return 'breve-lancamento';
    case 'lancamento':
    case 'vendas':
    case 'entregue':
      return 'lancamento';
    default:
      return undefined;
  }
};

const formatUserDisplayName = (raw?: string | null) => {
  if (!raw) return 'Desconhecido';
  const trimmed = raw.trim();
  if (!trimmed) return 'Desconhecido';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Desconhecido';
  return parts.slice(0, Math.min(parts.length, 2)).join(' ');
};

const buildProjectPayload = (raw: Record<string, unknown>) => {
  const {
    projectPhase,
    tags,
    imageType,
    assetCount,
    createdAt,
    updatedAt,
    createdBy,
    launchDate,
    ...rest
  } = raw;

  const payload: Record<string, unknown> = {
    ...rest,
  };

  const statusSource =
    typeof projectPhase === 'string' && projectPhase.trim()
      ? projectPhase
      : (rest.status as string | undefined);

  const normalizedStatus = normalizeProjectStatusValue(statusSource);
  if (normalizedStatus) {
    payload.status = normalizedStatus;
  } else {
    delete payload.status;
  }

  return payload;
};

export function AssetProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { systemSettings } = useConfig();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharedLinks, setSharedLinks] = useState<SharedLinkRow[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [activeSharedLinksCount, setActiveSharedLinksCount] = useState(0);

  const isConfigured = isSupabaseConfigured();

  // Calculate dashboard statistics based on current data
  const dashboardStats = useMemo<DashboardStats>(() => {
    const totalAssets = assets.length;
    const downloadCount = assets.reduce((sum, asset) => sum + (asset.downloadCount || 0), 0);

    const totalSizeBytes = assets.reduce((sum, asset) => sum + asset.size, 0);
    const storageUsed = totalSizeBytes / (1024 * 1024 * 1024);
    const configuredLimit = Number(systemSettings.storageLimitGb);
    const storageLimit = Number.isFinite(configuredLimit) && configuredLimit > 0
      ? configuredLimit
      : DEFAULT_SETTINGS.storageLimitGb;

    const assetsByType: Record<Asset['type'], number> = {
      image: 0,
      video: 0,
      document: 0,
      archive: 0,
    };
    assets.forEach((asset) => {
      assetsByType[asset.type] = (assetsByType[asset.type] || 0) + 1;
    });

    const assetsByCampaign: Record<string, number> = {};
    assets.forEach(asset => {
      if (asset.categoryType === 'campaign' && asset.categoryName) {
        assetsByCampaign[asset.categoryName] = (assetsByCampaign[asset.categoryName] || 0) + 1;
      }
    });

    const assetsByProject: Record<string, number> = {};
    assets.forEach(asset => {
      if (asset.categoryType === 'project' && asset.categoryName) {
        assetsByProject[asset.categoryName] = (assetsByProject[asset.categoryName] || 0) + 1;
      }
    });

    const recentActivity = assets.slice(0, 10).map(asset => ({
      id: asset.id,
      type: 'upload' as const,
      userName: asset.uploadedBy,
      assetName: asset.name,
      categoryName: asset.categoryName,
      timestamp: asset.uploadedAt,
    }));

    return {
      totalAssets,
      downloadCount,
      totalUsers: userCount,
      activeSharedLinks: activeSharedLinksCount,
      storageUsed,
      storageLimit,
      assetsByType,
      assetsByCampaign,
      assetsByProject,
      recentActivity,
    };
  }, [
    assets,
    campaigns,
    projects,
    userCount,
    activeSharedLinksCount,
    systemSettings.storageLimitGb,
  ]);

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
        fetchProjects(),
        fetchSharedLinks(),
        fetchUserCount(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    if (!supabase) return;
    const supabaseClient = supabase as SupabaseClient<Database>;

    try {
      type AssetRow = Database['public']['Tables']['assets']['Row'] & {
        uploaded_by_user?: { name: string | null } | null;
      };

      const { data, error } = await supabaseClient
        .from('assets')
        .select(`
          *,
          uploaded_by_user:users!assets_uploaded_by_fkey(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data ?? []) as AssetRow[];

      const transformedAssets: Asset[] = rows.map((item) => {
        const metadataValue = item.metadata;
        let normalizedMetadata: Asset['metadata'] = {};

        if (metadataValue && typeof metadataValue === 'object' && !Array.isArray(metadataValue)) {
          normalizedMetadata = {
            ...(metadataValue as Record<string, unknown>),
            projectPhase: item.project_phase || undefined,
          } as Asset['metadata'];
        }

        if (item.project_phase) {
          normalizedMetadata = {
            ...normalizedMetadata,
            projectPhase: item.project_phase,
          };
        }

        return {
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
          metadata: normalizedMetadata,
          uploadedAt: item.created_at,
          uploadedBy: item.uploaded_by_user?.name || 'Usuario',
        };
      });

      setAssets(transformedAssets);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Erro ao carregar materiais');
    }
  };

  const fetchCampaigns = async () => {
    if (!supabase) return;
    const supabaseClient = supabase as SupabaseClient<Database>;

    try {
      type CampaignRow = Database['public']['Tables']['campaigns']['Row'];

      const { data, error } = await supabaseClient
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const campaignRows = (data ?? []) as CampaignRow[];
      const creatorIds = Array.from(
        new Set(
          campaignRows
            .map((item) => item.created_by)
            .filter((id): id is string => typeof id === 'string' && id.trim().length > 0),
        ),
      );

      let creatorMap = new Map<string, string>();
      if (creatorIds.length > 0) {
        const { data: creatorData, error: creatorError } = await supabaseClient
          .from('users')
          .select('id, name')
          .in('id', creatorIds);

        if (!creatorError && creatorData) {
          creatorMap = new Map(
            creatorData.map((user) => [user.id, user.name ?? '']),
          );
        }
      }

      const transformedCampaigns: Campaign[] = campaignRows.map(item => {
        const normalizedStart = normalizeDateString(item.start_date);
        const normalizedEnd = normalizeDateString(item.end_date);
        const computedStatus = computeCampaignStatus(normalizedStart, normalizedEnd);
        const derivedColor = statusColors[computedStatus] ?? statusColors.active;

        const startDateValue = normalizedStart ?? item.start_date ?? new Date().toISOString();
        const endDateValue = normalizedEnd ?? undefined;
        const createdAtValue = item.created_at ?? new Date().toISOString();
        const createdById = item.created_by ?? 'system';
        const creatorDisplayName = formatUserDisplayName(
          creatorMap.get(item.created_by ?? '') ?? null,
        );
        const tagsValue: string[] = [];

        return {
          id: item.id,
          name: item.name,
          description: item.description || '',
          color: derivedColor,
          status: computedStatus as Campaign['status'],
          startDate: startDateValue,
          endDate: endDateValue,
          createdAt: createdAtValue,
          createdBy: createdById,
          createdByName: creatorDisplayName,
          tags: tagsValue
        };
      });


      setCampaigns(transformedCampaigns);
      const campaignNameMap = new Map(transformedCampaigns.map(item => [item.id, item.name]));
      setAssets(prev =>
        prev.map(asset => {
          if (asset.categoryType === 'campaign' && asset.categoryId) {
            const updatedName = campaignNameMap.get(asset.categoryId);
            if (updatedName && asset.categoryName !== updatedName) {
              return { ...asset, categoryName: updatedName };
            }
          }
          return asset;
        }),
      );
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Erro ao carregar campanhas');
    }
  };

  const fetchProjects = async () => {
    if (!supabase) return;
    
    try {
      const supabaseClient = supabase as SupabaseClient<Database>;
      const { data, error } = await supabaseClient
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      type ProjectRow = Database['public']['Tables']['projects']['Row'];
      const projectRows = (data ?? []) as ProjectRow[];
      const creatorIds = Array.from(
        new Set(
          projectRows
            .map((item) => item.created_by)
            .filter((id): id is string => typeof id === 'string' && id.trim().length > 0),
        ),
      );

      let creatorMap = new Map<string, string>();
      if (creatorIds.length > 0) {
        const { data: creatorData, error: creatorError } = await supabaseClient
          .from('users')
          .select('id, name')
          .in('id', creatorIds);

        if (!creatorError && creatorData) {
          creatorMap = new Map(
            creatorData.map((user) => [user.id, user.name ?? '']),
          );
        }
      }

      const transformedProjects: Project[] = projectRows.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        image: item.image || '',
        color: item.color,
        status: item.status as Project['status'],
        projectPhase: item.status as Project['projectPhase'],
        location: item.location || '',
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        createdBy: item.created_by,
        createdByName: formatUserDisplayName(
          creatorMap.get(item.created_by ?? '') ?? null,
        ),
      }));

      setProjects(transformedProjects);
      const projectNameMap = new Map(transformedProjects.map(item => [item.id, item.name]));
      setAssets(prev =>
        prev.map(asset => {
          if (asset.categoryType === 'project' && asset.categoryId) {
            const updatedName = projectNameMap.get(asset.categoryId);
            if (updatedName && asset.categoryName !== updatedName) {
              return { ...asset, categoryName: updatedName };
            }
          }
          return asset;
        }),
      );
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Erro ao carregar projetos');
    }
  };

  const fetchSharedLinks = async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('shared_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = data ?? [];
      setSharedLinks(rows);
      setActiveSharedLinksCount(rows.filter((link) => link.is_active).length);
    } catch (error) {
      console.error('Error fetching shared links:', error);
      toast.error('Erro ao carregar links compartilhados');
      setSharedLinks([]);
      setActiveSharedLinksCount(0);
    }
  };

  const fetchUserCount = async () => {
    if (!supabase) return;

    try {
      const { count, error } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true });

      if (error) throw error;

      setUserCount(count ?? 0);
    } catch (error) {
      console.error('Error fetching user count:', error);
      toast.error('Erro ao carregar estatísticas de usuários');
      setUserCount(0);
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
  const normalizeDateString = (value?: string | null) => {
    if (!value) return undefined;
    return value.includes('T') ? value.split('T')[0] : value;
  };

  const statusColors: Record<Campaign['status'], string> = {
    active: '#dc2626',
    inactive: '#2563eb',
    expiring: '#facc15',
    archived: '#6b7280'
  };

  const computeCampaignStatus = (start?: string | null, end?: string | null): Campaign['status'] => {
    const normalizedStart = start ? normalizeDateString(start) : undefined;
    const normalizedEnd = end ? normalizeDateString(end) : undefined;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = normalizedStart ? new Date(`${normalizedStart}T00:00:00`) : null;
    const endDate = normalizedEnd ? new Date(`${normalizedEnd}T00:00:00`) : null;

    if (startDate && today < startDate) {
      return 'inactive';
    }

    if (endDate && today > endDate) {
      return 'archived';
    }

    if (endDate) {
      const diffDays = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 2) {
        return 'expiring';
      }
    }

    return 'active';
  };

  const mapCampaignToDb = (payload: Partial<Campaign>) => {
    const mapped: Record<string, any> = {};

    if (payload.name !== undefined) mapped.name = payload.name;
    if (payload.description !== undefined) mapped.description = payload.description || null;
    if (payload.startDate !== undefined) mapped.start_date = payload.startDate ? normalizeDateString(payload.startDate) : null;
    if (payload.endDate !== undefined) mapped.end_date = payload.endDate ? normalizeDateString(payload.endDate) : null;
    if (payload.createdBy !== undefined) mapped.created_by = payload.createdBy;

    const shouldRecomputeStatus = payload.status !== undefined || payload.startDate !== undefined || payload.endDate !== undefined;

    if (shouldRecomputeStatus) {
      const statusToUse: Campaign['status'] = payload.status ?? computeCampaignStatus(payload.startDate, payload.endDate);
      const statusForDb = statusToUse === 'expiring' ? 'active' : statusToUse;
      const colorForStatus = statusColors[statusToUse] ?? statusColors.active;
      mapped.status = statusForDb;
      mapped.color = colorForStatus;
    }

    return mapped;
  };

  const createCampaign = async (campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    if (!user) throw new Error('Usuário não encontrado');

    if (!isConfigured) {
      const status = computeCampaignStatus(campaign.startDate, campaign.endDate);
      const newCampaign: Campaign = {
        ...campaign,
        status,
        color: statusColors[status],
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        createdBy: user.id,
        createdByName: formatUserDisplayName(user.name ?? user.email ?? null),
        tags: []
      };
      setCampaigns(prev => [newCampaign, ...prev]);
      toast.success('Campanha criada com sucesso! (Modo desenvolvimento)');
      return;
    }

    if (!supabase) throw new Error('Supabase não configurado');

    try {
      const payload = mapCampaignToDb({ ...campaign, createdBy: user.id });
      const { error } = await supabase
        .from('campaigns')
        .insert(payload);

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
      setCampaigns(prev => prev.map(campaign => {
        if (campaign.id !== id) return campaign;
        const merged = { ...campaign, ...updates } as Campaign;
        const status = computeCampaignStatus(merged.startDate, merged.endDate);
        return {
          ...merged,
          status,
          color: statusColors[status]
        };
      }));
      toast.success('Campanha atualizada com sucesso! (Modo desenvolvimento)');
      return;
    }

    if (!supabase) throw new Error('Supabase não configurado');

    try {
      const mappedUpdates = mapCampaignToDb(updates);
      mappedUpdates.updated_at = new Date().toISOString();
      const { error } = await supabase
        .from('campaigns')
        .update(mappedUpdates)
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
        createdByName: formatUserDisplayName(user.name ?? user.email ?? null),
        tags: [],
      };
      setProjects((prev) => [newProject, ...prev]);
      toast.success('Projeto criado com sucesso! (Modo desenvolvimento)');
      return;
    }

    if (!supabase) throw new Error('Supabase não configurado');

    try {
      const payload = buildProjectPayload({
        ...project,
        created_by: user.id,
      });

      if (!payload.status) {
        payload.status = 'vem-ai';
      }

      payload.created_at = new Date().toISOString();
      payload.updated_at = new Date().toISOString();

      const { error } = await supabase.from('projects').insert(payload);

      if (error) throw error;

      await fetchProjects();
      toast.success('Projeto criado com sucesso!');
    } catch (error) {
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
      const payload = buildProjectPayload(updates as Record<string, unknown>);
      payload.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('projects')
        .update(payload)
        .eq('id', id);

      if (error) throw error;

      await fetchProjects();
      toast.success('Projeto atualizado com sucesso!');
    } catch (error) {
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

  const value: AssetContextType = {
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
    sharedLinks,
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
