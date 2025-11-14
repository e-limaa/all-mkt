 'use client';
 
import React, { useEffect } from 'react';
import Head from 'next/head';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from './ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { UserProfile } from './UserProfile';
import { Separator } from './ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './ui/breadcrumb';
import { useConfig } from '../contexts/ConfigContext';
import { MobileNavBar } from './MobileNavBar';

interface AppLayoutProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  children: React.ReactNode;
}

const pageLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  materials: 'Materiais',
  campaigns: 'Campanhas',
  projects: 'Empreendimentos',
  users: 'Usuários',
  shared: 'Links úteis',
  settings: 'Configurações',
};

const NEXT_DEVTOOLS_SELECTORS = [
  '#next-devtools-panel',
  '#__next-devtools-panel',
  '.next-devtools-panel',
  '.next-devtools',
  '.next-devtools-floating',
  '.next-devtools-root',
  '.__next-devtools-root',
  '#next-devtools',
  '#__next-devtools',
  '.nextjs-devtools',
  '.nextjs-badge',
];

export function AppLayout({ currentPage, onPageChange, children }: AppLayoutProps) {
  const { systemSettings } = useConfig();
  const companyName = systemSettings.companyName || 'All Mkt - Tenda';
  const adminEmail = systemSettings.adminEmail;
  const sidebarStyle = systemSettings.compactSidebar
    ? ({ '--sidebar-width': '13rem' } as React.CSSProperties)
    : undefined;

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const removeDevtools = () => {
      NEXT_DEVTOOLS_SELECTORS.forEach((selector) => {
        document.querySelectorAll(selector).forEach((node) => node.remove());
      });
    };

    removeDevtools();

    const observer = new MutationObserver(removeDevtools);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return (
    <SidebarProvider defaultOpen={true} style={sidebarStyle}>
      <AppSidebar currentPage={currentPage} onPageChange={onPageChange} />

      <SidebarInset>
        <Head>
          <title>{companyName}</title>
        </Head>

        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-background/70 text-foreground shadow-sm transition hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary/40 md:h-9 md:w-9 md:rounded-xl" />
            <Separator orientation="vertical" className="hidden h-4 sm:block" />
            <div className="hidden sm:block">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        onPageChange('dashboard');
                      }}
                    >
                      {companyName}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-sm sm:text-base">
                      {pageLabels[currentPage] || 'Página'}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {adminEmail && (
              <span className="hidden text-xs text-muted-foreground md:inline-flex">
                Suporte:{' '}
                <a
                  href={`mailto:${adminEmail}`}
                  className="ml-1 underline underline-offset-4 hover:text-foreground"
                >
                  {adminEmail}
                </a>
              </span>
            )}
            <UserProfile />
          </div>
        </header>

        <main className="flex-1 overflow-auto pb-24 lg:pb-0">
          <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>

        <MobileNavBar currentPage={currentPage} onPageChange={onPageChange} />
      </SidebarInset>
    </SidebarProvider>
  );
}
