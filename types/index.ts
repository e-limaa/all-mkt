import { UserRole } from './enums';

// Import enums from centralized location
export { UserRole, Permission, ROLE_PERMISSIONS } from './enums';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'inactive' | 'archived' | 'expiring';
  budget?: number;
  targetAudience?: string;
  goals?: string;
  color: string;
  image?: string;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
  tags: string[];
  assetCount?: number;
  metrics?: {
    impressions?: number;
    clicks?: number;
    conversions?: number;
    spend?: number;
  };
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  location: string;
  status: 'vem-ai' | 'breve-lancamento' | 'lancamento';
  launchDate?: string;
  color: string;
  image: string;
  imageType?: 'upload' | 'url';
  createdAt: string;
  createdBy: string;
  createdByName?: string;
  tags?: string[];
  assetCount?: number;
  projectPhase?: 'vem-ai' | 'breve-lancamento' | 'lancamento';
}

export interface AssetMetadata {
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
  codec?: string;
  fileHash?: string;
  exifData?: Record<string, any>;
  pages?: number;
  projectPhase?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  posterUrl?: string;
  coverUrl?: string;
  thumbnail?: string;
  preview?: string;
}

export interface Asset {
  id: string;
  name: string;
  description?: string;
  type: 'image' | 'video' | 'document' | 'archive';
  format: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  tags: string[];
  categoryType: 'campaign' | 'project' | 'general';
  categoryId?: string;
  categoryName?: string;
  projectId?: string;
  campaignId?: string;
  uploadedAt: string;
  uploadedBy: string;
  downloadCount: number;
  isPublic: boolean;
  metadata: AssetMetadata;
  versions?: AssetVersion[];
  sharedLinks?: SharedLink[];
}

export interface AssetVersion {
  id: string;
  version: number;
  url: string;
  size: number;
  createdAt: string;
  createdBy: string;
  notes?: string;
}

export interface SharedLink {
  id: string;
  assetId: string;
  url: string;
  token?: string;
  expiresAt?: string;
  downloadCount: number;
  maxDownloads?: number;
  password?: string;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
  allowDownload?: boolean;
  allowPreview?: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: 'campaign' | 'project';
  color: string;
  description?: string;
}

export interface UploadProgress {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  asset?: Asset;
  error?: string;
}

export interface FilterOptions {
  search?: string;
  type?: string;
  categoryType?: 'campaign' | 'project' | 'general';
  categoryId?: string;
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  uploadedBy?: string;
  isPublic?: boolean;
}

export interface SortOptions {
  field: 'name' | 'uploadedAt' | 'size' | 'downloadCount';
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
  total: number;
}

export interface UserInvitation {
  id: string;
  email: string;
  role: UserRole;
  scopeType?: 'global' | 'campaign' | 'project';
  scopeIds?: string[];
  token: string;
  expiresAt: string;
  createdAt: string;
  createdBy: string;
  isUsed: boolean;
}

export interface SystemSettings {
  id: string;
  companyName: string;
  adminEmail: string;
  emailNotifications: boolean;
  systemNotifications: boolean;
  twoFactor: boolean;
  multiSessions: boolean;
  autoBackup: boolean;
  darkMode: boolean;
  compactSidebar: boolean;
  storageLimitGb: number;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string | null;
}

// Dashboard types
export interface DashboardStats {
  totalAssets: number;
  totalUsers: number;
  storageUsed: number;
  storageLimit: number;
  downloadCount: number;
  activeSharedLinks: number;
  assetsByType: {
    image: number;
    video: number;
    document: number;
    archive: number;
  };
  assetsByCampaign: Record<string, number>;
  assetsByProject: Record<string, number>;
  recentActivity: Activity[];
}

export interface Activity {
  id: string;
  type: 'upload' | 'download' | 'share';
  assetName: string;
  userName: string;
  timestamp: string;
  categoryType?: 'campaign' | 'project';
  categoryName?: string;
}

export interface SearchFilters {
  query: string;
  type: 'all' | 'image' | 'video' | 'document' | 'archive';
  categoryType: 'all' | 'campaign' | 'project';
  categoryId: string;
  tags: string[];
  dateRange: {
    from: string;
    to: string;
  };
  uploadedBy: string;
  sortBy: 'date' | 'name' | 'size' | 'downloads';
  sortOrder: 'asc' | 'desc';
}
