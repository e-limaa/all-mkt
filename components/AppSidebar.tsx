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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from './ui/sidebar';
import { buildNavigationItems } from '../lib/navigation';

interface AppSidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const NAVIGATION_GROUPS = [
  { id: "panel", label: "Painel", items: ["dashboard"] },
  {
    id: "content",
    label: "Gestão de Conteúdo",
    items: ["materials", "campaigns", "projects", "shared"],
  },
  { id: "administration", label: "Administração", items: ["users", "settings"] },
];

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

  const groupedNavigation = React.useMemo(() => {
    const itemMap = new Map(navigationItems.map((item) => [item.id, item]));

    return NAVIGATION_GROUPS.map((group) => {
      const items = group.items
        .map((id) => itemMap.get(id))
        .filter((item): item is typeof navigationItems[number] => Boolean(item));

      return { ...group, items };
    }).filter((group) => group.items.length > 0);
  }, [navigationItems]);

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

      <SidebarContent className="overflow-x-hidden">
        {groupedNavigation.map((group, index) => (
          <React.Fragment key={group.id}>
            {index > 0 && <SidebarSeparator className="mx-2" />}
            <SidebarGroup
              className={`px-2 py-3 ${
                compactSidebar ? 'pt-3 pb-3' : 'pt-4 pb-3'
              }`}
            >
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu
                  className={`sidebar-menu-gap ${
                    compactSidebar ? 'space-y-1.5' : 'space-y-2'
                  }`}
                >
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.href;

                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => onPageChange(item.href)}
                          isActive={isActive}
                          tooltip={
                            state === 'collapsed' ? item.label : undefined
                          }
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
          </React.Fragment>
        ))}
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
