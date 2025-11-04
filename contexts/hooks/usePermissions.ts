import React, { useMemo, ReactNode, ElementType } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Permission, UserRole, ROLE_PERMISSIONS } from "../../types/enums";

export interface PermissionChecker {
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  canAccessScope: (
    scopeType: "campaign" | "project",
    scopeId: string
  ) => boolean;
  canPerformAction: (action: string, resource?: any) => boolean;
  getUserPermissions: () => Permission[];
  isAdmin: () => boolean;
  isEditor: () => boolean;
   isEditorMarketing: () => boolean;
   isEditorTrade: () => boolean;
  isViewer: () => boolean;
}

export function usePermissions(): PermissionChecker {
  const { user } = useAuth();

  const permissions = useMemo(() => {
    if (!user) return [];

    // Start with role-based permissions
    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];

    return rolePermissions;
  }, [user]);

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return permissions.includes(permission);
  };

  const hasAnyPermission = (requiredPermissions: Permission[]): boolean => {
    if (!user) return false;
    return requiredPermissions.some((permission) =>
      permissions.includes(permission)
    );
  };

  const hasAllPermissions = (requiredPermissions: Permission[]): boolean => {
    if (!user) return false;
    return requiredPermissions.every((permission) =>
      permissions.includes(permission)
    );
  };

  const canAccessScope = (
    scopeType: "campaign" | "project",
    scopeId: string
  ): boolean => {
    if (!user) return false;

    // Admin has access to everything
    if (user.role === UserRole.ADMIN) return true;

    return false;
  };

  const canPerformAction = (action: string, resource?: any): boolean => {
    if (!user) return false;

    // Map actions to permissions
    const actionPermissionMap: Record<string, Permission> = {
      view_materials: Permission.VIEW_MATERIALS,
      upload_materials: Permission.UPLOAD_MATERIALS,
      edit_materials: Permission.EDIT_MATERIALS,
      delete_materials: Permission.DELETE_MATERIALS,
      download_materials: Permission.DOWNLOAD_MATERIALS,
      share_materials: Permission.SHARE_MATERIALS,
      view_campaigns: Permission.VIEW_CAMPAIGNS,
      create_campaigns: Permission.CREATE_CAMPAIGNS,
      edit_campaigns: Permission.EDIT_CAMPAIGNS,
      delete_campaigns: Permission.DELETE_CAMPAIGNS,
      view_projects: Permission.VIEW_PROJECTS,
      create_projects: Permission.CREATE_PROJECTS,
      edit_projects: Permission.EDIT_PROJECTS,
      delete_projects: Permission.DELETE_PROJECTS,
      view_users: Permission.VIEW_USERS,
      create_users: Permission.CREATE_USERS,
      edit_users: Permission.EDIT_USERS,
      delete_users: Permission.DELETE_USERS,
      manage_permissions: Permission.MANAGE_PERMISSIONS,
      view_dashboard: Permission.VIEW_DASHBOARD,
      view_analytics: Permission.VIEW_ANALYTICS,
      access_settings: Permission.ACCESS_SETTINGS,
      manage_system: Permission.MANAGE_SYSTEM,
      view_shared_links: Permission.VIEW_SHARED_LINKS,
      create_shared_links: Permission.CREATE_SHARED_LINKS,
      manage_shared_links: Permission.MANAGE_SHARED_LINKS,
    };

    const permission = actionPermissionMap[action];
    if (!permission) return false;

    // Check if user has the permission
    if (!hasPermission(permission)) return false;

    // Additional scope checks for resources
    if (resource) {
      if (resource.categoryType && resource.categoryId) {
        return canAccessScope(resource.categoryType, resource.categoryId);
      }

      // For projects/campaigns themselves
      if (
        resource.id &&
        (action.includes("project") || action.includes("campaign"))
      ) {
        const scopeType = action.includes("project") ? "project" : "campaign";
        return canAccessScope(scopeType, resource.id);
      }
    }

    return true;
  };

  const getUserPermissions = (): Permission[] => {
    return permissions;
  };

  const isAdmin = (): boolean => {
    return user?.role === UserRole.ADMIN;
  };

  const isEditor = (): boolean => {
    return user?.role === UserRole.EDITOR_MARKETING || user?.role === UserRole.EDITOR_TRADE;
  };

  const isEditorMarketing = (): boolean => {
    return user?.role === UserRole.EDITOR_MARKETING;
  };

  const isEditorTrade = (): boolean => {
    return user?.role === UserRole.EDITOR_TRADE;
  };

  const isViewer = (): boolean => {
    return user?.role === UserRole.VIEWER;
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessScope,
    canPerformAction,
    getUserPermissions,
    isAdmin,
    isEditor,
    isEditorMarketing,
    isEditorTrade,
    isViewer,
  };
}

// Utility function to check permissions outside of React components
export function checkPermission(
  user: { role: UserRole } | null,
  permission: Permission
): boolean {
  if (!user) return false;
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  return rolePermissions.includes(permission);
}

// Updated HOC with proper typing and safe fallback handling using React.createElement
export function withPermission<T extends object>(
  Component: React.ComponentType<T>,
  requiredPermissions: Permission[],
  fallback?: React.ComponentType | ReactNode
) {
  return function ProtectedComponent(props: T) {
    const { hasAnyPermission } = usePermissions();

    if (!hasAnyPermission(requiredPermissions)) {
      if (fallback) {
        // Check if fallback is a component (function)
        if (typeof fallback === "function") {
          // Use React.createElement to avoid JSX syntax issues
          return React.createElement(fallback);
        }
        // If it's a ReactNode, return wrapped in fragment
        return React.createElement(React.Fragment, null, fallback);
      }
      return null;
    }

    return React.createElement(Component, props);
  };
}

// Permission Guard component with proper typing
interface PermissionGuardProps {
  permissions: Permission[];
  requireAll?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({
  permissions,
  requireAll = false,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { hasAnyPermission, hasAllPermissions } = usePermissions();

  const hasAccess = requireAll
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  if (!hasAccess) {
    return React.createElement(React.Fragment, null, fallback);
  }

  return React.createElement(React.Fragment, null, children);
}




