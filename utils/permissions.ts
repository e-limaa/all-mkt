import { Permission, UserRole, ROLE_PERMISSIONS } from '../types/enums';

// Função helper para verificar permissões de forma simples
export function can(userRole: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) ?? false;
}

// Função helper para verificar se o usuário pode realizar uma ação específica
export function canPerformAction(userRole: UserRole, action: string): boolean {
  const actionPermissionMap: Record<string, Permission> = {
    // Ações de materiais
    'upload_material': Permission.UPLOAD_MATERIALS,
    'edit_material': Permission.EDIT_MATERIALS,
    'delete_material': Permission.DELETE_MATERIALS,
    'share_material': Permission.SHARE_MATERIALS,
    
    // Ações de campanhas
    'create_campaign': Permission.CREATE_CAMPAIGNS,
    'edit_campaign': Permission.EDIT_CAMPAIGNS,
    'delete_campaign': Permission.DELETE_CAMPAIGNS,
    
    // Ações de projetos
    'create_project': Permission.CREATE_PROJECTS,
    'edit_project': Permission.EDIT_PROJECTS,
    'delete_project': Permission.DELETE_PROJECTS,
    
    // Ações do sistema
    'view_dashboard': Permission.VIEW_DASHBOARD,
    'manage_users': Permission.VIEW_USERS,
    'access_settings': Permission.ACCESS_SETTINGS,
    
    // Links compartilhados
    'create_shared_link': Permission.CREATE_SHARED_LINKS,
    'manage_shared_links': Permission.MANAGE_SHARED_LINKS,
    'manage_useful_links': Permission.MANAGE_USEFUL_LINKS
  };

  const permission = actionPermissionMap[action];
  if (!permission) return false;
  
  return can(userRole, permission);
}

// Constantes para facilitar verificações comuns
export const VIEWER_RESTRICTIONS = {
  canUpload: false,
  canEdit: false,
  canDelete: false,
  canCreate: false,
  canAccessDashboard: false,
  canManageUsers: false,
  canAccessSettings: false,
  canCreateSharedLinks: false
};

export const EDITOR_RESTRICTIONS = {
  canUpload: true,
  canEdit: true,
  canDelete: false, // Característica principal: não pode excluir
  canCreate: true,
  canAccessDashboard: true,
  canManageUsers: false, // Não pode gerenciar usuários
  canAccessSettings: false, // Não acessa configurações globais
  canCreateSharedLinks: true
};

export const ADMIN_PERMISSIONS = {
  canUpload: true,
  canEdit: true,
  canDelete: true,
  canCreate: true,
  canAccessDashboard: true,
  canManageUsers: true,
  canAccessSettings: true,
  canCreateSharedLinks: true
};

// Função para obter as restrições baseadas no perfil
export function getRestrictionsByRole(role: UserRole) {
  switch (role) {
    case UserRole.ADMIN:
      return ADMIN_PERMISSIONS;
    case UserRole.EDITOR_MARKETING:
      return EDITOR_MARKETING_RESTRICTIONS;
    case UserRole.EDITOR_TRADE:
      return EDITOR_TRADE_RESTRICTIONS;
    case UserRole.VIEWER:
      return VIEWER_RESTRICTIONS;
    default:
      return VIEWER_RESTRICTIONS;
  }
}
