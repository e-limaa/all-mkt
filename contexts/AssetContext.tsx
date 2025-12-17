// @ts-nocheck
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import { supabase, isSupabaseConfigured, uploadFile, getPublicUrl, deleteFile } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Asset, Campaign, Project, UsefulLink, UsefulLinkCategory } from '../types';
import { UserRole } from '../types/enums';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { useConfig } from './ConfigContext';
import { DEFAULT_SETTINGS } from '../lib/settings';
import { Database } from '../types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logActivity } from '../lib/activity-logger';

const buildSharePath = (params: {
  categoryType?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  assetId: string;
}) => {
  const query = new URLSearchParams();
  if (params.categoryType) {
    query.set('categoryType', params.categoryType);
  }
  if (params.categoryId) {
    query.set('categoryId', params.categoryId);
  }
  if (params.categoryName) {
    query.set('categoryName', params.categoryName);
  }
  query.set('assetId', params.assetId);
  return `materials?${query.toString()}`;
};

// Dashboard statistics interface
type SharedLinkRow = Database['public']['Tables']['shared_links']['Row'];
type UsefulLinkRow = Database['public']['Tables']['useful_links']['Row'];

type UsefulLinkPayload = {
  title: string;
  url: string;
  description?: string | null;
  category: UsefulLinkCategory;
  pinned?: boolean;
};

type CreateSharedLinkPayload = {
  assetId: string;
  expiresAt?: string | null;
  maxDownloads?: number | null;
};

export interface DashboardStats {
  totalAssets: number;
  downloadCount: number;
  totalUsers: number;
  activeSharedLinks: number;
  usefulLinksCount: number;
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
  upcomingLaunches: Array<{
    id: string;
    name: string;
    type: 'campaign' | 'project';
    date: string;
    daysUntil: number;
    status?: string;
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
  createSharedLink: (payload: CreateSharedLinkPayload) => Promise<SharedLinkRow>;
  usefulLinks: UsefulLink[];
  createUsefulLink: (payload: UsefulLinkPayload) => Promise<UsefulLink>;
  updateUsefulLink: (id: string, updates: Partial<UsefulLinkPayload>) => Promise<UsefulLink>;
  deleteUsefulLink: (id: string) => Promise<void>;
  recordUsefulLinkClick: (id: string, currentCount?: number) => Promise<void>;
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

const formatUserDisplayName = (
  raw?: string | null,
  fallbackId?: string | null,
) => {
  if (raw) {
    const trimmed = raw.trim();
    if (trimmed) {
      const parts = trimmed.split(/\s+/).filter(Boolean);
      if (parts.length > 0) {
        return parts.slice(0, Math.min(parts.length, 2)).join(' ');
      }
    }
  }

  const fallbackTrimmed = fallbackId?.trim();
  if (fallbackTrimmed) {
    return fallbackTrimmed.length > 12
      ? `${fallbackTrimmed.slice(0, 6)}...${fallbackTrimmed.slice(-4)}`
      : fallbackTrimmed;
  }

  return 'Desconhecido';
};

const mapUsefulLinkRow = (
  row: UsefulLinkRow & { created_by_user?: { name: string | null } | null },
): UsefulLink => {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    description: row.description,
    category: (row.category as UsefulLinkCategory) ?? 'other',
    pinned: Boolean(row.pinned),
    clickCount: row.click_count ?? 0,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    createdBy: row.created_by,
    createdByName: row.created_by_user?.name ?? null,
  };
};

const buildDevUsefulLinks = (creatorId: string, creatorName: string): UsefulLink[] => {
  const now = new Date().toISOString();
  return [
    {
      id: uuidv4(),
      title: 'Figma',
      url: 'https://figma.com',
      description: 'Ferramenta de design colaborativo para criar interfaces e protótipos',
      category: 'tools',
      pinned: true,
      clickCount: 247,
      createdAt: now,
      updatedAt: now,
      createdBy: creatorId,
      createdByName: creatorName,
    },
    {
      id: uuidv4(),
      title: 'Brand Guidelines',
      url: 'https://example.com/brand-guidelines',
      description: 'Diretrizes de marca e identidade visual da empresa',
      category: 'documentation',
      pinned: true,
      clickCount: 94,
      createdAt: now,
      updatedAt: now,
      createdBy: creatorId,
      createdByName: creatorName,
    },
    {
      id: uuidv4(),
      title: 'Unsplash',
      url: 'https://unsplash.com',
      description: 'Banco de imagens gratuitas de alta qualidade',
      category: 'resources',
      pinned: false,
      clickCount: 186,
      createdAt: now,
      updatedAt: now,
      createdBy: creatorId,
      createdByName: creatorName,
    },
    {
      id: uuidv4(),
      title: 'Color Palette Generator',
      url: 'https://coolors.co',
      description: 'Ferramenta para gerar paletas de cores harmoniosas',
      category: 'tools',
      pinned: false,
      clickCount: 133,
      createdAt: now,
      updatedAt: now,
      createdBy: creatorId,
      createdByName: creatorName,
    },
  ];
};

const fillMissingUserNames = async (
  ids: string[],
  existingMap: Map<string, string>,
) => {
  const missing = ids.filter(
    (id) => id && id.trim() && !existingMap.has(id.trim()),
  );
  if (missing.length === 0 || typeof window === 'undefined') {
    return existingMap;
  }

  try {
    const response = await fetch('/api/users/lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: missing }),
    });

    if (!response.ok) {
      console.error('[AssetContext] Fallback user lookup failed', response.status);
      return existingMap;
    }

    const payload: Array<{ id: string; name: string | null }> = await response.json();
    payload.forEach((user) => {
      if (user?.id) {
        existingMap.set(user.id, user.name ?? '');
      }
    });
  } catch (error) {
    console.error('[AssetContext] Failed to load user names fallback', error);
  }

  return existingMap;
};

const normalizeDateValue = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      const [day, month, year] = trimmed.split('/');
      return `${year}-${month}-${day}`;
    }

    const datePortion = trimmed.includes('T')
      ? trimmed.split('T')[0]
      : trimmed;

    if (/^\d{4}-\d{2}-\d{2}$/.test(datePortion)) {
      return datePortion;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return datePortion;
  }

  return undefined;
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

  if (payload.regional !== undefined) {
    const regionalValue =
      typeof payload.regional === 'string' && payload.regional.trim().length > 0
        ? payload.regional.trim().toUpperCase()
        : null;
    payload.regional = regionalValue;
  }

  const launchDateFromRaw = normalizeDateValue(
    launchDate ?? (raw as Record<string, unknown>)['launch_date'],
  );

  if (launchDateFromRaw === undefined) {
    delete payload.launch_date;
  } else {
    payload.launch_date = launchDateFromRaw;
  }

  delete payload.launchDate;
  delete payload.id;

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
  const [usefulLinks, setUsefulLinks] = useState<UsefulLink[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [activeSharedLinksCount, setActiveSharedLinksCount] = useState(0);
  const [monthlyDownloadCount, setMonthlyDownloadCount] = useState(0);

  const filterAssetsByPermissions = useCallback(
    (assetList: Asset[]): Asset[] => {
      if (!user) return [];

      const normalizedUserRegional = (user.regional || '').trim().toUpperCase();
      const normalizedUserOrigin =
        (() => {
          const rawOrigin =
            (user as unknown as { material_origin_scope?: string }).material_origin_scope ??
            (user as unknown as { materialOriginScope?: string }).materialOriginScope ??
            null;
          if (typeof rawOrigin !== 'string') return '';
          const normalized = rawOrigin.trim().toLowerCase();
          return normalized === 'house' || normalized === 'ev' ? normalized : '';
        })();
      const viewerGlobalAccess = Boolean(
        (user as unknown as { viewer_access_to_all?: boolean }).viewer_access_to_all ??
        (user as unknown as { viewerAccessToAll?: boolean }).viewerAccessToAll ??
        false,
      );

      if (user.role === UserRole.ADMIN || user.role === UserRole.EDITOR_MARKETING) {
        return assetList;
      }

      if (user.role === UserRole.EDITOR_TRADE) {
        if (!normalizedUserRegional) return [];
        return assetList.filter(
          asset => {
            const assetRegional = (asset.regional || '').trim().toUpperCase();
            const assetOrigin = (asset.origin || '').trim().toLowerCase();
            if (assetRegional !== normalizedUserRegional) {
              return false;
            }
            if (!normalizedUserOrigin) {
              return true;
            }
            return assetOrigin === normalizedUserOrigin;
          },
        );
      }

      if (user.role === UserRole.VIEWER) {
        if (viewerGlobalAccess) {
          return assetList;
        }
        if (!normalizedUserRegional) {
          return [];
        }
        return assetList.filter(
          asset => {
            const assetRegional = (asset.regional || '').trim().toUpperCase();
            const assetOrigin = (asset.origin || '').trim().toLowerCase();
            if (assetRegional !== normalizedUserRegional) {
              return false;
            }
            if (!normalizedUserOrigin) {
              return true;
            }
            return assetOrigin === normalizedUserOrigin;
          },
        );
      }

      return [];
    },
    [user],
  );

  useEffect(() => {
    setAssets(prev => {
      const filtered = filterAssetsByPermissions(prev);
      if (filtered.length === prev.length && filtered.every((asset, index) => asset === prev[index])) {
        return prev;
      }
      return filtered;
    });
  }, [filterAssetsByPermissions]);

  const isConfigured = isSupabaseConfigured();

  // Calculate dashboard statistics based on current data
  const dashboardStats = useMemo<DashboardStats>(() => {
    const totalAssets = assets.length;
    const downloadCount = monthlyDownloadCount;

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

    const parseLaunchDate = (value?: string | null) => {
      const normalized = normalizeDateValue(value ?? undefined);
      const base = normalized ?? (typeof value === 'string'
        ? (value.includes('T') ? value.split('T')[0] : value)
        : undefined);
      if (!base) return null;

      const date = new Date(`${base}T00:00:00`);
      if (Number.isNaN(date.getTime())) {
        return null;
      }

      date.setHours(0, 0, 0, 0);
      return { date, dateString: base };
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayInMs = 24 * 60 * 60 * 1000;
    const FORECAST_WINDOW_DAYS = 90;

    const upcomingCampaignLaunches = campaigns
      .map(campaign => {
        const parsed = parseLaunchDate(campaign.startDate);
        if (!parsed) return null;

        const daysUntil = Math.round((parsed.date.getTime() - today.getTime()) / dayInMs);
        if (daysUntil < 0 || daysUntil > FORECAST_WINDOW_DAYS) {
          return null;
        }

        return {
          id: campaign.id,
          name: campaign.name,
          type: 'campaign' as const,
          date: parsed.dateString,
          daysUntil,
          status: campaign.status,
        };
      })
      .filter((item): item is {
        id: string;
        name: string;
        type: 'campaign';
        date: string;
        daysUntil: number;
        status?: string;
      } => item !== null);

    const upcomingProjectLaunches = projects
      .map(project => {
        const parsed = parseLaunchDate(project.launchDate ?? undefined);
        if (!parsed) return null;

        const daysUntil = Math.round((parsed.date.getTime() - today.getTime()) / dayInMs);
        if (daysUntil < 0 || daysUntil > FORECAST_WINDOW_DAYS) {
          return null;
        }

        return {
          id: project.id,
          name: project.name,
          type: 'project' as const,
          date: parsed.dateString,
          daysUntil,
          status: project.status,
        };
      })
      .filter((item): item is {
        id: string;
        name: string;
        type: 'project';
        date: string;
        daysUntil: number;
        status?: string;
      } => item !== null);

    const upcomingLaunches = [...upcomingCampaignLaunches, ...upcomingProjectLaunches]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4);

    return {
      totalAssets,
      downloadCount,
      totalUsers: userCount,
      activeSharedLinks: usefulLinks.length,
      usefulLinksCount: usefulLinks.length,
      storageUsed,
      storageLimit,
      assetsByType,
      assetsByCampaign,
      assetsByProject,
      recentActivity,
      upcomingLaunches,
    };
  }, [
    assets,
    campaigns,
    projects,
    sharedLinks,
    usefulLinks,
    userCount,
    systemSettings.storageLimitGb,
    monthlyDownloadCount,
  ]);

  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user, isConfigured]);

  const fetchMonthlyDownloadCount = useCallback(async () => {
    if (!supabase) return;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('asset_download_events')
      .select('id', { count: 'exact', head: true })
      .gte('downloaded_at', startOfMonth.toISOString());

    if (error) {
      console.error('Error fetching monthly download count:', error);
      setMonthlyDownloadCount(0);
      return;
    }

    setMonthlyDownloadCount(count ?? 0);
  }, [supabase]);

  const refreshData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await Promise.all([
        fetchAssets(),
        fetchCampaigns(),
        fetchProjects(),
        fetchUsefulLinks(),
        fetchSharedLinks(),
        fetchUserCount(),
        fetchMonthlyDownloadCount(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshDataRef = useRef(refreshData);

  useEffect(() => {
    refreshDataRef.current = refreshData;
  }, [refreshData]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const channel = supabase.channel('realtime-dashboard');

    const subscribeToTable = (table: string) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          refreshDataRef.current();
        },
      );
    };

    subscribeToTable('assets');
    subscribeToTable('asset_download_events');
    subscribeToTable('shared_links');
    subscribeToTable('users');
    subscribeToTable('campaigns');
    subscribeToTable('projects');
    subscribeToTable('useful_links');

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

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
      const projectRegionalMapFromState = new Map(
        projects.map(project => [
          project.id,
          project.regional ? project.regional.trim().toUpperCase() : null,
        ]),
      );
      const campaignRegionalMapFromState = new Map(
        campaigns.map(campaign => [
          campaign.id,
          campaign.regional ? campaign.regional.trim().toUpperCase() : null,
        ]),
      );

      const projectRegionalLookup = new Map(projectRegionalMapFromState);
      const campaignRegionalLookup = new Map(campaignRegionalMapFromState);

      const missingProjectIds = new Set<string>();
      const missingCampaignIds = new Set<string>();

      rows.forEach((item) => {
        const hasExplicitRegional = typeof item.regional === 'string' && item.regional.trim().length > 0;
        if (!hasExplicitRegional && item.category_type === 'project' && item.category_id) {
          if (!projectRegionalLookup.get(item.category_id)) {
            missingProjectIds.add(item.category_id);
          }
        }
        if (!hasExplicitRegional && item.category_type === 'campaign' && item.category_id) {
          if (!campaignRegionalLookup.get(item.category_id)) {
            missingCampaignIds.add(item.category_id);
          }
        }
      });

      if (missingProjectIds.size > 0) {
        const { data: projectRegionalRows, error: projectRegionalError } = await supabaseClient
          .from('projects')
          .select('id, regional')
          .in('id', Array.from(missingProjectIds));

        if (!projectRegionalError && projectRegionalRows) {
          projectRegionalRows.forEach(row => {
            const normalized = row.regional ? row.regional.trim().toUpperCase() : null;
            projectRegionalLookup.set(row.id, normalized);
          });
        }
      }

      if (missingCampaignIds.size > 0) {
        const { data: campaignRegionalRows, error: campaignRegionalError } = await supabaseClient
          .from('campaigns')
          .select('id, regional')
          .in('id', Array.from(missingCampaignIds));

        if (!campaignRegionalError && campaignRegionalRows) {
          campaignRegionalRows.forEach(row => {
            const normalized = row.regional ? row.regional.trim().toUpperCase() : null;
            campaignRegionalLookup.set(row.id, normalized);
          });
        }
      }
      const uploaderIds = Array.from(
        new Set(
          rows
            .map((item) => item.uploaded_by)
            .filter((id): id is string => typeof id === 'string' && id.trim().length > 0),
        ),
      );
      let uploaderMap = new Map<string, string>();
      rows.forEach((item) => {
        if (item.uploaded_by && item.uploaded_by_user?.name) {
          uploaderMap.set(item.uploaded_by, item.uploaded_by_user.name);
        }
      });

      if (uploaderIds.length > 0) {
        uploaderMap = await fillMissingUserNames(uploaderIds, uploaderMap);
      }

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

        const assetRegional =
          typeof item.regional === 'string' && item.regional.trim().length > 0
            ? item.regional.trim().toUpperCase()
            : null;
        const fallbackRegional =
          item.category_type === 'project'
            ? projectRegionalLookup.get(item.category_id ?? '') ?? null
            : item.category_type === 'campaign'
              ? campaignRegionalLookup.get(item.category_id ?? '') ?? null
              : null;

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
          origin: (item.origin as 'house' | 'ev') ?? 'house',
          categoryType: item.category_type,
          categoryId: item.category_id,
          categoryName: item.category_name || '',
          sharePath:
            item.share_path ??
            buildSharePath({
              categoryType: item.category_type,
              categoryId: item.category_id,
              categoryName: item.category_name,
              assetId: item.id,
            }),
          projectId: item.category_type === 'project' ? item.category_id : undefined,
          campaignId: item.category_type === 'campaign' ? item.category_id : undefined,
          isPublic: item.is_public,
          downloadCount: item.download_count,
          metadata: normalizedMetadata,
          uploadedAt: item.created_at,
          uploadedBy: formatUserDisplayName(
            uploaderMap.get(item.uploaded_by ?? '') ?? null,
            item.uploaded_by ?? null,
          ),
          regional: assetRegional ?? fallbackRegional,
        };
      });

      const normalizedAssets = transformedAssets.map(asset => ({
        ...asset,
        regional: asset.regional ? asset.regional.trim().toUpperCase() : null,
      }));

      setAssets(filterAssetsByPermissions(normalizedAssets));
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

        creatorMap = await fillMissingUserNames(creatorIds, creatorMap);
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
          createdById,
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
          regional: item.regional ? item.regional.trim().toUpperCase() : '',
          tags: tagsValue
        };
      });


      setCampaigns(transformedCampaigns);
      const campaignNameMap = new Map(transformedCampaigns.map(item => [item.id, item.name]));
      const campaignRegionalMap = new Map(transformedCampaigns.map(item => [item.id, item.regional]));
      setAssets(prev => {
        const updatedAssets = prev.map(asset => {
          if (asset.categoryType === 'campaign' && asset.categoryId) {
            const updatedName = campaignNameMap.get(asset.categoryId);
            const updatedRegional = campaignRegionalMap.get(asset.categoryId) ?? null;

            if (updatedName && asset.categoryName !== updatedName) {
              return { ...asset, categoryName: updatedName, regional: updatedRegional ?? asset.regional };
            }

            if (updatedRegional && asset.regional !== updatedRegional) {
              return { ...asset, regional: updatedRegional };
            }
          }
          return asset;
        });

        return filterAssetsByPermissions(updatedAssets);
      });
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

        creatorMap = await fillMissingUserNames(creatorIds, creatorMap);
      }

      const transformedProjects: Project[] = projectRows.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        image: item.image || '',
        color: item.color,
        status: item.status as Project['status'],
        projectPhase: item.status as Project['projectPhase'],
        launchDate: normalizeDateValue(item.launch_date) ?? undefined,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        createdBy: item.created_by,
        createdByName: formatUserDisplayName(
          creatorMap.get(item.created_by ?? '') ?? null,
          item.created_by ?? null,
        ),
        regional: item.regional ? item.regional.trim().toUpperCase() : '',
      }));

      setProjects(transformedProjects);
      const projectNameMap = new Map(transformedProjects.map(item => [item.id, item.name]));
      const projectRegionalMap = new Map(transformedProjects.map(item => [item.id, item.regional]));
      setAssets(prev => {
        const updatedAssets = prev.map(asset => {
          if (asset.categoryType === 'project' && asset.categoryId) {
            const updatedName = projectNameMap.get(asset.categoryId);
            const updatedRegional = projectRegionalMap.get(asset.categoryId) ?? null;

            if (updatedName && asset.categoryName !== updatedName) {
              return { ...asset, categoryName: updatedName, regional: updatedRegional ?? asset.regional };
            }

            if (updatedRegional && asset.regional !== updatedRegional) {
              return { ...asset, regional: updatedRegional };
            }
          }
          return asset;
        });

        return filterAssetsByPermissions(updatedAssets);
      });
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

  const fetchUsefulLinks = async () => {
    if (!user) return;

    if (!isConfigured || !supabase) {
      const creatorName = formatUserDisplayName(user.name ?? user.email ?? null, user.id);
      setUsefulLinks(buildDevUsefulLinks(user.id, creatorName));
      return;
    }

    try {
      const { data, error } = await supabase
        .from('useful_links')
        .select('*, created_by_user:users!useful_links_created_by_fkey(name)')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = data ?? [];
      setUsefulLinks(
        rows.map((row) =>
          mapUsefulLinkRow(row as UsefulLinkRow & {
            created_by_user?: { name: string | null } | null;
          }),
        ),
      );
    } catch (error) {
      console.error('Error fetching useful links:', error);
      toast.error('Erro ao carregar links úteis');
      setUsefulLinks([]);
    }
  };

  const createSharedLink = async ({
    assetId,
    expiresAt,
    maxDownloads,
  }: CreateSharedLinkPayload): Promise<SharedLinkRow> => {
    if (!user) throw new Error('Usuario nao encontrado');

    const parsedExpires = expiresAt ? new Date(expiresAt) : null;
    const normalizedExpires =
      parsedExpires && !Number.isNaN(parsedExpires.getTime())
        ? parsedExpires.toISOString()
        : null;

    const normalizedMaxDownloads =
      typeof maxDownloads === 'number' && !Number.isNaN(maxDownloads) && maxDownloads > 0
        ? Math.floor(maxDownloads)
        : null;

    const token = uuidv4();

    if (!isConfigured) {
      const newLink: SharedLinkRow = {
        id: uuidv4(),
        asset_id: assetId,
        token,
        created_at: new Date().toISOString(),
        created_by: user.id,
        download_count: 0,
        expires_at: normalizedExpires,
        max_downloads: normalizedMaxDownloads,
        is_active: true,
      };

      setSharedLinks((prev) => [newLink, ...prev]);
      setActiveSharedLinksCount((prev) => prev + 1);
      toast.success('Link compartilhado criado com sucesso! (Modo desenvolvimento)');
      return newLink;
    }

    if (!supabase) throw new Error('Supabase nao configurado');

    try {
      const { data, error } = await supabase
        .from('shared_links')
        .insert({
          asset_id: assetId,
          token,
          created_by: user.id,
          expires_at: normalizedExpires,
          max_downloads: normalizedMaxDownloads,
          is_active: true,
        })
        .select('*')
        .single();

      if (error) throw error;

      await fetchSharedLinks();
      toast.success('Link compartilhado criado com sucesso!');

      return data;
    } catch (error) {
      console.error('Error creating shared link:', error);
      toast.error(error.message || 'Erro ao criar link compartilhado');
      throw error;
    }
  };

  const createUsefulLink = async (payload: UsefulLinkPayload): Promise<UsefulLink> => {
    if (!user) throw new Error('Usuario nao encontrado');

    const normalizedTitle = payload.title.trim();
    const normalizedUrl = payload.url.trim();
    if (!normalizedTitle || !normalizedUrl) {
      throw new Error('Título e URL são obrigatórios');
    }

    const normalizedDescription =
      payload.description === undefined
        ? undefined
        : payload.description.trim() || null;
    const normalizedCategory = payload.category ?? 'other';
    const normalizedPinned = Boolean(payload.pinned);

    const createdByName = formatUserDisplayName(
      user.name ?? user.email ?? null,
      user.id,
    );

    if (!isConfigured || !supabase) {
      const newLink: UsefulLink = {
        id: uuidv4(),
        title: normalizedTitle,
        url: normalizedUrl,
        description: normalizedDescription ?? null,
        category: normalizedCategory,
        pinned: normalizedPinned,
        clickCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user.id,
        createdByName,
      };
      setUsefulLinks((prev) => [newLink, ...prev]);
      toast.success('Link útil criado com sucesso! (Modo desenvolvimento)');
      return newLink;
    }

    try {
      const { data, error } = await supabase
        .from('useful_links')
        .insert({
          title: normalizedTitle,
          url: normalizedUrl,
          description: normalizedDescription,
          category: normalizedCategory,
          pinned: normalizedPinned,
          created_by: user.id,
        })
        .select('*, created_by_user:users!useful_links_created_by_fkey(name)')
        .single();

      if (error) throw error;

      const mapped = mapUsefulLinkRow(
        data as UsefulLinkRow & {
          created_by_user?: { name: string | null } | null;
        },
      );

      setUsefulLinks((prev) => [mapped, ...prev]);
      toast.success('Link útil criado com sucesso!');
      return mapped;
    } catch (error) {
      console.error('Error creating useful link:', error);
      toast.error(error.message || 'Erro ao criar link útil');
      throw error;
    }
  };

  const updateUsefulLink = async (
    id: string,
    updates: Partial<UsefulLinkPayload>,
  ): Promise<UsefulLink> => {
    if (!user) throw new Error('Usuario nao encontrado');

    const normalizedTitle =
      updates.title !== undefined ? updates.title.trim() : undefined;
    if (updates.title !== undefined && !normalizedTitle) {
      throw new Error('Título é obrigatório');
    }

    const normalizedUrl =
      updates.url !== undefined ? updates.url.trim() : undefined;
    if (updates.url !== undefined && !normalizedUrl) {
      throw new Error('URL é obrigatório');
    }

    const normalizedDescription =
      updates.description === undefined
        ? undefined
        : updates.description.trim() || null;
    const normalizedCategory = updates.category;
    const normalizedPinned = updates.pinned;
    const now = new Date().toISOString();

    const payload: Record<string, unknown> = { updated_at: now };
    if (normalizedTitle !== undefined) payload.title = normalizedTitle;
    if (normalizedUrl !== undefined) payload.url = normalizedUrl;
    if (normalizedDescription !== undefined)
      payload.description = normalizedDescription;
    if (normalizedCategory !== undefined) payload.category = normalizedCategory;
    if (normalizedPinned !== undefined) payload.pinned = normalizedPinned;

    if (!isConfigured || !supabase) {
      let updatedLink: UsefulLink | null = null;
      setUsefulLinks((prev) =>
        prev.map((link) => {
          if (link.id !== id) return link;
          const merged: UsefulLink = {
            ...link,
            title: (payload.title as string | undefined) ?? link.title,
            url: (payload.url as string | undefined) ?? link.url,
            description:
              payload.description !== undefined
                ? (payload.description as string | null)
                : link.description,
            category:
              (payload.category as UsefulLinkCategory) ?? link.category,
            pinned:
              typeof payload.pinned === 'boolean'
                ? (payload.pinned as boolean)
                : link.pinned,
            updatedAt: now,
          };
          updatedLink = merged;
          return merged;
        }),
      );
      if (updatedLink) {
        toast.success('Link útil atualizado com sucesso! (Modo desenvolvimento)');
        return updatedLink;
      }
      throw new Error('Link não encontrado');
    }

    try {
      const { data, error } = await supabase
        .from('useful_links')
        .update(payload)
        .eq('id', id)
        .select('*, created_by_user:users!useful_links_created_by_fkey(name)')
        .single();

      if (error) throw error;

      const mapped = mapUsefulLinkRow(
        data as UsefulLinkRow & {
          created_by_user?: { name: string | null } | null;
        },
      );

      setUsefulLinks((prev) => prev.map((link) => (link.id === id ? mapped : link)));
      toast.success('Link útil atualizado com sucesso!');
      return mapped;
    } catch (error) {
      console.error('Error updating useful link:', error);
      toast.error(error.message || 'Erro ao atualizar link útil');
      throw error;
    }
  };

  const deleteUsefulLink = async (id: string) => {
    if (!user) throw new Error('Usuario nao encontrado');

    if (!isConfigured || !supabase) {
      setUsefulLinks((prev) => prev.filter((link) => link.id !== id));
      toast.success('Link útil excluído com sucesso! (Modo desenvolvimento)');
      return;
    }

    try {
      const { error } = await supabase.from('useful_links').delete().eq('id', id);
      if (error) throw error;
      setUsefulLinks((prev) => prev.filter((link) => link.id !== id));
      toast.success('Link útil excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting useful link:', error);
      toast.error(error.message || 'Erro ao excluir link útil');
      throw error;
    }
  };

  const recordUsefulLinkClick = useCallback(
    async (id: string, fallbackCount?: number) => {
      const existing = usefulLinks.find((link) => link.id === id);
      const currentCount = existing?.clickCount ?? fallbackCount ?? 0;
      const nextCount = currentCount + 1;

      if (!isConfigured || !supabase) {
        setUsefulLinks((prev) =>
          prev.map((link) =>
            link.id === id ? { ...link, clickCount: nextCount } : link,
          ),
        );
        return;
      }

      try {
        const { error } = await supabase
          .from('useful_links')
          .update({ click_count: nextCount })
          .eq('id', id);

        if (error) {
          throw error;
        }

        setUsefulLinks((prev) =>
          prev.map((link) =>
            link.id === id ? { ...link, clickCount: nextCount } : link,
          ),
        );
      } catch (error) {
        console.error('[recordUsefulLinkClick] Error updating click count:', error);
      }
    },
    [isConfigured, supabase, usefulLinks],
  );

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
      toast.error('Erro ao carregar estatsticas de Usuarios');
      setUserCount(0);
    }
  };

  const uploadAsset = async (file: File, projectId?: string, campaignId?: string, metadata?: any) => {
    if (!user) throw new Error('Usuario nao encontrado');

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

        const normalizedOrigin = metadata?.origin === 'ev' ? 'ev' : 'house';
        const selectedProject = projectId ? projects.find(p => p.id === projectId) : undefined;
        const selectedCampaign = campaignId ? campaigns.find(c => c.id === campaignId) : undefined;
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
          origin: normalizedOrigin,
          categoryType,
          categoryId,
          categoryName,
          projectId: projectId,
          campaignId: campaignId,
          regional: null,
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

        setAssets(prev =>
          filterAssetsByPermissions([
            {
              ...newAsset,
              regional:
                selectedProject?.regional?.trim().toUpperCase() ??
                selectedCampaign?.regional?.trim().toUpperCase() ??
                null,
            },
            ...prev,
          ]),
        );
        toast.success('Material enviado com sucesso! (Modo desenvolvimento)');
        setLoading(false);
      }, 2000);

      return;
    }

    if (!supabase) throw new Error('Supabase nao configurado');

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
      const assetId = uuidv4();

      let categoryName = '';
      if (projectId) {
        const project = projects.find(p => p.id === projectId);
        categoryName = project?.name || '';
      } else if (campaignId) {
        const campaign = campaigns.find(c => c.id === campaignId);
        categoryName = campaign?.name || '';
      }

      const normalizedOrigin = metadata?.origin === 'ev' ? 'ev' : 'house';
      const selectedProject = projectId ? projects.find(p => p.id === projectId) : undefined;
      const selectedCampaign = campaignId ? campaigns.find(c => c.id === campaignId) : undefined;
      const categoryRegional = (selectedProject?.regional ?? selectedCampaign?.regional ?? null)?.toUpperCase() ?? null;

      if (!categoryRegional) {
        throw new Error('Regional nao configurada para a categoria selecionada.');
      }

      const sharePath = buildSharePath({
        categoryType,
        categoryId,
        categoryName,
        assetId,
      });

      const { error } = await supabase
        .from('assets')
        .insert({
          id: assetId,
          name: metadata?.name || file.name,
          description: metadata?.description || null,
          type: fileType,
          format: fileFormat,
          size: file.size,
          url: fileUrl,
          thumbnail_url: thumbnailUrl,
          tags: metadata?.tags || [],
          origin: normalizedOrigin,
          category_type: categoryType,
          category_id: categoryId,
          category_name: categoryName,
          share_path: sharePath,
          project_phase: metadata?.projectPhase || null,
          regional: categoryRegional,
          is_public: false,
          metadata: metadata ? {
            ...metadata,
            originalName: file.name,
            mimeType: file.type
          } : null,
          uploaded_by: user.id,
        });

      if (error) throw error;

      await fetchAssets();
      await fetchAssets();

      await logActivity(supabase, {
        action: 'upload_asset',
        entityType: 'asset',
        entityId: assetId,
        metadata: {
          name: metadata?.name || file.name,
          fileSize: file.size,
          fileType,
          regional: categoryRegional
        },
        userId: user.id
      });

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
    const existingAsset = assets.find(asset => asset.id === id);
    if (!existingAsset) {
      const message = 'Material nao encontrado';
      toast.error(message);
      throw new Error(message);
    }

    const normalizeRegionalValue = (value?: string | null) =>
      value && value.trim().length > 0 ? value.trim().toUpperCase() : null;

    const targetCategoryType = updates.categoryType ?? existingAsset.categoryType;
    const targetCategoryId = updates.categoryId ?? existingAsset.categoryId;
    let targetCategoryName = updates.categoryName ?? existingAsset.categoryName ?? '';
    let targetRegional: string | null;

    if (updates.regional !== undefined) {
      targetRegional = normalizeRegionalValue(updates.regional);
    } else if (
      (updates.categoryId && updates.categoryId !== existingAsset.categoryId) ||
      (updates.categoryType && updates.categoryType !== existingAsset.categoryType)
    ) {
      if (targetCategoryType === 'project' && targetCategoryId) {
        const project = projects.find(p => p.id === targetCategoryId);
        targetCategoryName = project?.name ?? targetCategoryName;
        targetRegional = normalizeRegionalValue(project?.regional ?? null);
      } else if (targetCategoryType === 'campaign' && targetCategoryId) {
        const campaign = campaigns.find(c => c.id === targetCategoryId);
        targetCategoryName = campaign?.name ?? targetCategoryName;
        targetRegional = normalizeRegionalValue(campaign?.regional ?? null);
      } else {
        targetRegional = normalizeRegionalValue(existingAsset.regional);
      }
    } else {
      targetRegional = normalizeRegionalValue(existingAsset.regional);
    }

    if (!targetRegional) {
      targetRegional = normalizeRegionalValue(existingAsset.regional);
    }

    if (!targetRegional) {
      const message = 'Regional nao configurada para a categoria selecionada.';
      if (!isConfigured) {
        toast.error(message);
        return;
      }
      throw new Error(message);
    }

    if (!isConfigured) {
      setAssets(prev =>
        filterAssetsByPermissions(
          prev.map(asset =>
            asset.id === id
              ? {
                ...asset,
                ...updates,
                categoryType: targetCategoryType,
                categoryId: targetCategoryId ?? asset.categoryId,
                categoryName: targetCategoryName || asset.categoryName,
                sharePath: buildSharePath({
                  categoryType: targetCategoryType,
                  categoryId: targetCategoryId ?? asset.categoryId,
                  categoryName: targetCategoryName || asset.categoryName,
                  assetId: asset.id,
                }),
                regional: targetRegional,
                origin: updates.origin ?? asset.origin,
              }
              : asset,
          ),
        ),
      );
      toast.success('Material atualizado com sucesso! (Modo desenvolvimento)');
      return;
    }

    if (!supabase) throw new Error('Supabase nao configurado');

    try {
      const updatePayload: Record<string, any> = {
        name: updates.name,
        description: updates.description,
        tags: updates.tags,
        is_public: updates.isPublic,
        metadata: updates.metadata,
        regional: targetRegional,
      };

      if (updates.origin) {
        updatePayload.origin = updates.origin;
      }

      if (targetCategoryId) {
        updatePayload.category_id = targetCategoryId;
      }

      if (targetCategoryType === 'project' || targetCategoryType === 'campaign') {
        updatePayload.category_type = targetCategoryType;
      }

      if (targetCategoryName) {
        updatePayload.category_name = targetCategoryName;
      }

      updatePayload.share_path = buildSharePath({
        categoryType: targetCategoryType,
        categoryId: targetCategoryId ?? existingAsset.categoryId,
        categoryName: targetCategoryName || existingAsset.categoryName,
        assetId: id,
      });

      if (updates.metadata && 'projectPhase' in updates.metadata) {
        updatePayload.project_phase = updates.metadata.projectPhase || null;
      }

      const { error } = await supabase
        .from('assets')
        .update(updatePayload)
        .eq('id', id);

      if (error) throw error;

      await fetchAssets();

      await logActivity(supabase, {
        action: 'update_asset',
        entityType: 'asset',
        entityId: id,
        metadata: { updates: updatePayload },
        userId: user.id
      });

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
      toast.success('Material excluido com sucesso! (Modo desenvolvimento)');
      return;
    }

    if (!supabase) throw new Error('Supabase nao configurado');

    try {
      const asset = assets.find(a => a.id === id);
      if (!asset) throw new Error('Material nao encontrado');

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
      await fetchAssets();

      await logActivity(supabase, {
        action: 'delete_asset',
        entityType: 'asset',
        entityId: id,
        userId: user.id
      });

      toast.success('Material excluido com sucesso!');
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
    if (payload.regional !== undefined) {
      const regionalValue =
        typeof payload.regional === 'string' && payload.regional.trim().length > 0
          ? payload.regional.trim().toUpperCase()
          : null;
      mapped.regional = regionalValue;
    }

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
    if (!user) throw new Error('Usuario nao encontrado');

    const normalizedRegional = (campaign.regional || '').trim().toUpperCase();
    if (!normalizedRegional) {
      throw new Error('Regional e obrigatoria');
    }

    if (!isConfigured) {
      const status = computeCampaignStatus(campaign.startDate, campaign.endDate);
      const newCampaign: Campaign = {
        ...campaign,
        status,
        color: statusColors[status],
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        createdBy: user.id,
        createdByName: formatUserDisplayName(
          user.name ?? user.email ?? null,
          user.id,
        ),
        tags: [],
        regional: normalizedRegional,
      };
      setCampaigns(prev => [newCampaign, ...prev]);
      toast.success('Campanha criada com sucesso! (Modo desenvolvimento)');
      return;
    }

    if (!supabase) throw new Error('Supabase nao configurado');

    try {
      const payload = mapCampaignToDb({ ...campaign, createdBy: user.id, regional: normalizedRegional });
      const { data, error } = await supabase
        .from('campaigns')
        .insert(payload)
        .select();

      if (error) throw error;

      await fetchCampaigns();

      if (data && data[0]) {
        await logActivity(supabase, {
          action: 'create_campaign',
          entityType: 'campaign',
          entityId: data[0].id,
          metadata: { name: payload.name, regional: payload.regional },
          userId: user.id
        });
      }

      toast.success('Campanha criada com sucesso!');
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error(error.message || 'Erro ao criar campanha');
      throw error;
    }
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    if (!isConfigured) {
      setCampaigns(prev =>
        prev.map(campaign => {
          if (campaign.id !== id) return campaign;

          const incomingRegional =
            typeof updates.regional === 'string' ? updates.regional.trim().toUpperCase() : campaign.regional;
          if (!incomingRegional) {
            throw new Error('Regional e obrigatoria');
          }

          const merged = { ...campaign, ...updates, regional: incomingRegional } as Campaign;
          const status = computeCampaignStatus(merged.startDate, merged.endDate);

          return {
            ...merged,
            status,
            color: statusColors[status],
          };
        }),
      );
      toast.success('Campanha atualizada com sucesso! (Modo desenvolvimento)');
      return;
    }

    if (!supabase) throw new Error('Supabase nao configurado');

    const updatesWithRegional: Partial<Campaign> = { ...updates };

    // Filter out fields that haven't changed
    const originalCampaign = campaigns.find(c => c.id === id);
    if (originalCampaign) {
      (Object.keys(updatesWithRegional) as Array<keyof Campaign>).forEach(key => {
        if (updatesWithRegional[key] === originalCampaign[key]) {
          delete updatesWithRegional[key];
        }
      });
    }

    if (updatesWithRegional.regional !== undefined) {
      const normalizedRegional = (updatesWithRegional.regional || '').trim().toUpperCase();
      if (!normalizedRegional) {
        throw new Error('Regional e obrigatoria');
      }
      updatesWithRegional.regional = normalizedRegional;
    }

    // If nothing changed after filtering, return early (optional, but good optimization)
    if (Object.keys(updatesWithRegional).length === 0) {
      toast.info('Nenhuma alteração detectada.');
      return;
    }

    try {
      const mappedUpdates = mapCampaignToDb(updatesWithRegional);

      // Double check mapped updates against original DB values if possible, 
      // but relying on the previous filter is usually enough for the log noise issue.

      const { error } = await supabase
        .from('campaigns')
        .update(mappedUpdates)
        .eq('id', id);

      if (error) throw error;

      await fetchCampaigns();

      await logActivity(supabase, {
        action: 'update_campaign',
        entityType: 'campaign',
        entityId: id,
        metadata: { updates: mappedUpdates },
        userId: user.id
      });

      toast.success('Campanha atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error((error as Error).message || 'Erro ao atualizar campanha');
      throw error;
    }
  };

  const deleteCampaign = async (id: string) => {
    if (!isConfigured) {
      setCampaigns(prev => prev.filter(campaign => campaign.id !== id));
      toast.success('Campanha excluida com sucesso! (Modo desenvolvimento)');
      return;
    }

    if (!supabase) throw new Error('Supabase nao configurado');

    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchCampaigns();
      await fetchCampaigns();

      await logActivity(supabase, {
        action: 'delete_campaign',
        entityType: 'campaign',
        entityId: id,
        userId: user.id
      });

      toast.success('Campanha excluida com sucesso!');
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      toast.error(error.message || 'Erro ao excluir campanha');
      throw error;
    }
  };

  const createProject = async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    if (!user) throw new Error('Usuario nao encontrado');

    const normalizedRegional = (project.regional || '').trim().toUpperCase();
    if (!normalizedRegional) {
      throw new Error('Regional e obrigatoria');
    }

    if (!isConfigured) {
      const newProject: Project = {
        ...project,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        createdBy: user.id,
        launchDate: normalizeDateValue(project.launchDate) ?? undefined,
        createdByName: formatUserDisplayName(
          user.name ?? user.email ?? null,
          user.id,
        ),
        tags: [],
        regional: normalizedRegional,
      };
      setProjects((prev) => [newProject, ...prev]);
      toast.success('Projeto criado com sucesso! (Modo desenvolvimento)');
      return;
    }

    if (!supabase) throw new Error('Supabase nao configurado');

    try {
      const payload = buildProjectPayload({
        ...project,
        created_by: user.id,
        regional: normalizedRegional,
      });

      if (!payload.status) {
        payload.status = 'vem-ai';
      }

      payload.created_at = new Date().toISOString();
      payload.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('projects')
        .insert(payload)
        .select();

      if (error) throw error;

      await fetchProjects();
      await fetchProjects();

      await logActivity(supabase, {
        action: 'create_project',
        entityType: 'project',
        entityId: data[0].id,
        metadata: { name: payload.name, regional: payload.regional },
        userId: user.id
      });

      toast.success('Projeto criado com sucesso!');
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error(error.message || 'Erro ao criar projeto');
      throw error;
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    if (!isConfigured) {
      const target = projects.find(project => project.id === id);
      const regionalSource =
        updates.regional !== undefined ? updates.regional : target?.regional;
      const normalizedRegional = (regionalSource || '').trim().toUpperCase();
      if (!normalizedRegional) {
        throw new Error('Regional e obrigatoria');
      }

      setProjects(prev =>
        prev.map(project =>
          project.id === id ? { ...project, ...updates, regional: normalizedRegional } : project,
        ),
      );
      toast.success('Projeto atualizado com sucesso! (Modo desenvolvimento)');
      return;
    }

    if (!supabase) throw new Error('Supabase nao configurado');

    try {
      const normalizedUpdates: Record<string, unknown> = { ...updates };

      // Filter out fields that haven't changed
      const originalProject = projects.find(p => p.id === id);
      if (originalProject) {
        Object.keys(normalizedUpdates).forEach(key => {
          const k = key as keyof Project;
          if (normalizedUpdates[key] === originalProject[k]) {
            delete normalizedUpdates[key];
          }
        });
      }

      if (Object.keys(normalizedUpdates).length === 0) {
        toast.info('Nenhuma alteração detectada.');
        return;
      }

      if (normalizedUpdates.regional !== undefined) {
        const normalizedRegional = (normalizedUpdates.regional || '').toString().trim().toUpperCase();
        if (!normalizedRegional) {
          throw new Error('Regional e obrigatoria');
        }
        normalizedUpdates.regional = normalizedRegional;
      }

      const payload = buildProjectPayload(normalizedUpdates);
      payload.updated_at = new Date().toISOString();

      const { data: updatedRows, error } = await supabase
        .from('projects')
        .update(payload)
        .eq('id', id)
        .select('id, launch_date');

      if (error) {
        console.error('[updateProject] Supabase error payload:', { payload, error });
        throw error;
      }

      if (!updatedRows || updatedRows.length === 0) {
        console.error('[updateProject] Supabase returned 0 rows after update', { id, payload });
        throw new Error('Nenhuma linha foi atualizada. Verifique suas permisses.');
      }

      await fetchProjects();
      await fetchProjects();

      await logActivity(supabase, {
        action: 'update_project',
        entityType: 'project',
        entityId: id,
        metadata: { updates: payload },
        userId: user.id
      });

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
      toast.success('Projeto excluido com sucesso! (Modo desenvolvimento)');
      return;
    }

    if (!supabase) throw new Error('Supabase nao configurado');

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchProjects();
      await fetchProjects();

      await logActivity(supabase, {
        action: 'delete_project',
        entityType: 'project',
        entityId: id,
        userId: user.id
      });

      toast.success('Projeto excluido com sucesso!');
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
    createSharedLink,
    usefulLinks,
    createUsefulLink,
    updateUsefulLink,
    deleteUsefulLink,
    recordUsefulLinkClick,
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

