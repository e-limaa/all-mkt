import React from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from './ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { UserProfile } from './UserProfile';
import { Separator } from './ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from './ui/breadcrumb';
import { useConfig } from '../contexts/ConfigContext';
import Head from 'next/head';

interface AppLayoutProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  children: React.ReactNode;
}

// Mapeamento de páginas para breadcrumbs
const pageLabels: Record<string, string> = {
  'dashboard': 'Dashboard',
  'materials': 'Materiais',
  'campaigns': 'Campanhas', 
  'projects': 'Empreendimentos',
  'users': 'Usuários',
  'shared': 'Links Compartilhados',
  'settings': 'Configurações'
};

export function AppLayout({ currentPage, onPageChange, children }: AppLayoutProps) {
  const { systemSettings } = useConfig();
  const companyName = systemSettings.companyName || 'ALL MKT';
  const adminEmail = systemSettings.adminEmail;
  const sidebarStyle = systemSettings.compactSidebar
    ? ({ '--sidebar-width': '13rem' } as React.CSSProperties)
    : undefined;

  return (
    <SidebarProvider defaultOpen={true} style={sidebarStyle}>
      <AppSidebar currentPage={currentPage} onPageChange={onPageChange} />
      
      <SidebarInset>
        <Head>
          <title>{companyName} DAM</title>
        </Head>
        {/* Header fixo */}
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            
            {/* Breadcrumb */}
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#" onClick={(e) => {
                    e.preventDefault();
                    onPageChange('dashboard');
                  }}>
                    {companyName}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{pageLabels[currentPage] || 'Página'}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Lado direito do header */}
          <div className="ml-auto flex items-center gap-2">
            {adminEmail && (
              <span className="hidden md:inline-flex text-xs text-muted-foreground mr-3">
                Suporte: <a href={`mailto:${adminEmail}`} className="ml-1 underline offset-2">{adminEmail}</a>
              </span>
            )}
            <UserProfile />
          </div>
        </header>

        {/* Conteúdo principal scrollável */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
