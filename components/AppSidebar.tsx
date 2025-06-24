import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/hooks/usePermissions';
import { Permission } from '../types/enums';
import { 
  BarChart3, 
  FileImage, 
  Target, 
  Building, 
  Share2, 
  Users, 
  Settings
} from 'lucide-react';
import Frame1000005813 from '../imports/Frame1000005813';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from './ui/sidebar';

interface AppSidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export function AppSidebar({ currentPage, onPageChange }: AppSidebarProps) {
  const { user } = useAuth();
  const { hasPermission, isViewer } = usePermissions();
  const { state } = useSidebar();

  const navigationItems = [
    // Dashboard - disponível para Admin e Editor, mas NÃO para Viewer
    ...(hasPermission(Permission.VIEW_DASHBOARD) ? [{
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      href: 'dashboard'
    }] : []),

    // Materiais - todos podem ver, mas com funcionalidades diferentes
    {
      id: 'materials',
      label: 'Materiais',
      icon: FileImage,
      href: 'materials'
    },

    // Campanhas - todos podem ver
    {
      id: 'campaigns',
      label: 'Campanhas',
      icon: Target,
      href: 'campaigns'
    },

    // Empreendimentos - todos podem ver
    {
      id: 'projects',
      label: 'Empreendimentos',
      icon: Building,
      href: 'projects'
    },

    // Links Compartilhados - disponível para todos os usuários (incluindo Viewer)
    ...(hasPermission(Permission.VIEW_SHARED_LINKS) ? [{
      id: 'shared',
      label: 'Links Compartilhados',
      icon: Share2,
      href: 'shared'
    }] : []),

    // Usuários - apenas Admin
    ...(hasPermission(Permission.VIEW_USERS) ? [{
      id: 'users',
      label: 'Usuários',
      icon: Users,
      href: 'users'
    }] : []),

    // Configurações - apenas Admin
    ...(hasPermission(Permission.ACCESS_SETTINGS) ? [{
      id: 'settings',
      label: 'Configurações',
      icon: Settings,
      href: 'settings'
    }] : [])
  ];

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-center px-2 py-3 p-[16px]">
          <Frame1000005813 />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="p-[8px] px-[8px] py-[2px] px-[8px] py-[16px]">
          <SidebarGroupContent>
            <SidebarMenu className="sidebar-menu-gap space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.href;
                
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onPageChange(item.href)}
                      isActive={isActive}
                      tooltip={state === "collapsed" ? item.label : undefined}
                      className="w-full justify-start px-[8px] m-[1px] sidebar-menu-button"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[14px]">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer com informações do usuário - apenas quando expandido */}
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-2 py-2 text-sm text-sidebar-foreground/70">
              {state === "expanded" && (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="truncate">{user?.name}</span>
                </>
              )}
              {state === "collapsed" && (
                <div className="w-2 h-2 bg-green-500 rounded-full mx-auto" />
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}