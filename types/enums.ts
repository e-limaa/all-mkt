// Centralize enums to avoid circular dependencies
export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer'
}

export enum Permission {
  // Material permissions
  VIEW_MATERIALS = 'view_materials',
  UPLOAD_MATERIALS = 'upload_materials',
  EDIT_MATERIALS = 'edit_materials',
  DELETE_MATERIALS = 'delete_materials',
  DOWNLOAD_MATERIALS = 'download_materials',
  SHARE_MATERIALS = 'share_materials',
  
  // Campaign permissions
  VIEW_CAMPAIGNS = 'view_campaigns',
  CREATE_CAMPAIGNS = 'create_campaigns',
  EDIT_CAMPAIGNS = 'edit_campaigns',
  DELETE_CAMPAIGNS = 'delete_campaigns',
  
  // Project permissions
  VIEW_PROJECTS = 'view_projects',
  CREATE_PROJECTS = 'create_projects',
  EDIT_PROJECTS = 'edit_projects',
  DELETE_PROJECTS = 'delete_projects',
  
  // User management
  VIEW_USERS = 'view_users',
  CREATE_USERS = 'create_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  MANAGE_PERMISSIONS = 'manage_permissions',
  
  // System permissions
  VIEW_DASHBOARD = 'view_dashboard',
  VIEW_ANALYTICS = 'view_analytics',
  ACCESS_SETTINGS = 'access_settings',
  MANAGE_SYSTEM = 'manage_system',
  
  // Shared links
  VIEW_SHARED_LINKS = 'view_shared_links',
  CREATE_SHARED_LINKS = 'create_shared_links',
  MANAGE_SHARED_LINKS = 'manage_shared_links'
}

export enum AssetType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  OTHER = 'other'
}

export enum AssetStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DRAFT = 'draft',
  PENDING = 'pending',
  REJECTED = 'rejected'
}

// Role-based permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // All permissions
    Permission.VIEW_MATERIALS,
    Permission.UPLOAD_MATERIALS,
    Permission.EDIT_MATERIALS,
    Permission.DELETE_MATERIALS,
    Permission.DOWNLOAD_MATERIALS,
    Permission.SHARE_MATERIALS,
    Permission.VIEW_CAMPAIGNS,
    Permission.CREATE_CAMPAIGNS,
    Permission.EDIT_CAMPAIGNS,
    Permission.DELETE_CAMPAIGNS,
    Permission.VIEW_PROJECTS,
    Permission.CREATE_PROJECTS,
    Permission.EDIT_PROJECTS,
    Permission.DELETE_PROJECTS,
    Permission.VIEW_USERS,
    Permission.CREATE_USERS,
    Permission.EDIT_USERS,
    Permission.DELETE_USERS,
    Permission.MANAGE_PERMISSIONS,
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ANALYTICS,
    Permission.ACCESS_SETTINGS,
    Permission.MANAGE_SYSTEM,
    Permission.VIEW_SHARED_LINKS,
    Permission.CREATE_SHARED_LINKS,
    Permission.MANAGE_SHARED_LINKS
  ],
  [UserRole.EDITOR]: [
    // Material permissions (no delete)
    Permission.VIEW_MATERIALS,
    Permission.UPLOAD_MATERIALS,
    Permission.EDIT_MATERIALS,
    Permission.DOWNLOAD_MATERIALS,
    Permission.SHARE_MATERIALS,
    // Campaign permissions (no delete)
    Permission.VIEW_CAMPAIGNS,
    Permission.CREATE_CAMPAIGNS,
    Permission.EDIT_CAMPAIGNS,
    // Project permissions (no delete)
    Permission.VIEW_PROJECTS,
    Permission.CREATE_PROJECTS,
    Permission.EDIT_PROJECTS,
    // Limited dashboard
    Permission.VIEW_DASHBOARD,
    // Shared links
    Permission.VIEW_SHARED_LINKS,
    Permission.CREATE_SHARED_LINKS
  ],
  [UserRole.VIEWER]: [
    // View and download only
    Permission.VIEW_MATERIALS,
    Permission.DOWNLOAD_MATERIALS,
    Permission.VIEW_CAMPAIGNS,
    Permission.VIEW_PROJECTS,
    Permission.VIEW_SHARED_LINKS
  ]
};