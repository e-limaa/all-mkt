'use client';

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/hooks/usePermissions';
import { useConfig } from '../contexts/ConfigContext';
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
import { buildNavigationItems } from '../lib/navigation';

interface AppSidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export function AppSidebar({ currentPage, onPageChange }: AppSidebarProps) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { state } = useSidebar();
  const { systemSettings } = useConfig();
  const compactSidebar = systemSettings.compactSidebar;

  const navigationItems = React.useMemo(
    () => buildNavigationItems(hasPermission),
    [hasPermission],
  );

  return (
    <Sidebar
      collapsible="icon"
      className="border-sidebar-border"
      data-compact={compactSidebar ? 'true' : 'false'}
    >
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-center px-2 py-3">
          <Frame1000005813 />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup
          className={`px-2 py-4 ${
            compactSidebar ? 'pt-3 pb-3' : ''
          }`}
        >
          <SidebarGroupContent>
            <SidebarMenu
              className={`sidebar-menu-gap ${
                compactSidebar ? 'space-y-1.5' : 'space-y-2'
              }`}
            >
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.href;

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onPageChange(item.href)}
                      isActive={isActive}
                      tooltip={state === 'collapsed' ? item.label : undefined}
                      className={`w-full justify-start px-2 lg:px-3 sidebar-menu-button cursor-pointer ${
                        compactSidebar ? 'py-1.5' : 'py-2'
                      }`}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className="text-sm">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-3 py-3 text-sm text-sidebar-foreground/70">
              {state === 'expanded' && (
                <>
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="truncate">{user?.name}</span>
                </>
              )}
              {state === 'collapsed' && (
                <div className="mx-auto h-2 w-2 rounded-full bg-green-500" />
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
