import React, { useState, useEffect, lazy, Suspense, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Toaster } from './components/ui/sonner';
import { ConfigProvider, useConfig } from './contexts/ConfigContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AssetProvider } from './contexts/AssetContext';
import { LoginScreen } from './components/LoginScreen';
import { PermissionGuard, usePermissions } from './contexts/hooks/usePermissions';
import { Permission } from './types/enums';
import { Card, CardContent } from './components/ui/card';
import { Alert, AlertDescription } from './components/ui/alert';
import { ShieldX, AlertTriangle, BellOff, MailX } from 'lucide-react';
import { isSupabaseConfigured } from './lib/supabase';

interface MaterialFilters {
  categoryType?: 'campaign' | 'project';
  categoryId?: string;
  categoryName?: string;
}
type AppPageKey =
  | 'dashboard'
  | 'materials'
  | 'campaigns'
  | 'projects'
  | 'users'
  | 'shared'
  | 'settings';

const DEFAULT_APP_PAGE: AppPageKey = 'dashboard';

const PAGE_TO_ROUTE: Record<AppPageKey, string> = {
  dashboard: '/dashboard',
  materials: '/materials',
  campaigns: '/campaigns',
  projects: '/projects',
  users: '/users',
  shared: '/shared',
  settings: '/settings',
};

const ROUTE_TO_PAGE: Record<string, AppPageKey> = Object.entries(PAGE_TO_ROUTE).reduce(
  (acc, [page, route]) => {
    acc[route] = page as AppPageKey;
    return acc;
  },
  {} as Record<string, AppPageKey>
);

ROUTE_TO_PAGE['/'] = DEFAULT_APP_PAGE;

const normalizePathname = (pathname?: string) => {
  const fallbackRoute = PAGE_TO_ROUTE[DEFAULT_APP_PAGE];
  if (!pathname) return fallbackRoute;

  const questionIndex = pathname.indexOf('?');
  const basePath = questionIndex >= 0 ? pathname.slice(0, questionIndex) : pathname;
  const trimmed = basePath.replace(/\/+$/, '');
  const normalized = trimmed.length === 0 ? '/' : trimmed;

  if (normalized === '/') {
    return fallbackRoute;
  }

  return normalized.toLowerCase();
};


const resolvePageFromPath = (pathname?: string): AppPageKey => {
  const normalized = normalizePathname(pathname);
  return ROUTE_TO_PAGE[normalized] ?? DEFAULT_APP_PAGE;
};

const AppLayout = lazy(() =>
  import('./components/AppLayout').then((module) => ({ default: module.AppLayout })),
);
const Dashboard = lazy(() =>
  import('./components/Dashboard').then((module) => ({ default: module.Dashboard })),
);
const AssetManager = lazy(() =>
  import('./components/AssetManager').then((module) => ({ default: module.AssetManager })),
);
const CampaignManager = lazy(() =>
  import('./components/CampaignManager').then((module) => ({ default: module.CampaignManager })),
);
const ProjectManager = lazy(() =>
  import('./components/ProjectManager').then((module) => ({ default: module.ProjectManager })),
);
const UserManager = lazy(() =>
  import('./components/UserManager').then((module) => ({ default: module.UserManager })),
);
const SharedLinksManager = lazy(() =>
  import('./components/SharedLinksManager').then((module) => ({ default: module.SharedLinksManager })),
);
const Settings = lazy(() =>
  import('./components/Settings').then((module) => ({ default: module.Settings })),
);
const N8nFloatingWidgetLazy = lazy(() => import('./components/chat/N8nFloatingWidget'));

const SuspenseFallback = ({ message = 'Carregando interface...' }: { message?: string }) => (
  <div className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
    {message}
  </div>
);

const FullScreenLoader = ({ message = 'Carregando...' }: { message?: string }) => (
  <div className="flex min-h-[60vh] items-center justify-center text-base text-muted-foreground">
    {message}
  </div>
);

// Access Denied Component
function AccessDenied() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <ShieldX className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">
            Você não possui permissão para acessar esta página. Entre em contato com o administrador do sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Development Mode Alert
function DevelopmentModeAlert() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!isSupabaseConfigured());
  }, []);

  if (!show) return null;

  return (
    <Alert className="border-yellow-500/50 bg-yellow-500/10 mb-6">
      <AlertTriangle className="h-4 w-4 text-yellow-500" />
      <AlertDescription className="text-yellow-200">
        <strong>Configuração obrigatória:</strong> não foi possível acessar o Supabase. 
        Verifique as variáveis de ambiente e reinicie o aplicativo para continuar.
      </AlertDescription>
    </Alert>
  );
}

function AppContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isViewer, isAdmin } = usePermissions();
  const { systemSettings } = useConfig();

  const currentPath = useMemo(() => {
    const basePath = (router.asPath || router.pathname || '').split('?')[0];
    return basePath && basePath.length > 0 ? basePath : '/';
  }, [router.asPath, router.pathname]);

  const currentPage = useMemo<AppPageKey>(() => resolvePageFromPath(currentPath), [currentPath]);

  const materialFilters = useMemo<MaterialFilters>(() => {
    const { categoryType, categoryId, categoryName } = router.query;
    const filters: MaterialFilters = {};

    if (
      typeof categoryType === 'string' &&
      (categoryType === 'campaign' || categoryType === 'project') &&
      typeof categoryId === 'string' &&
      categoryId.length > 0
    ) {
      filters.categoryType = categoryType;
      filters.categoryId = categoryId;

      if (typeof categoryName === 'string' && categoryName.length > 0) {
        filters.categoryName = categoryName;
      }
    }

    return filters;
  }, [router.query]);

  const selectedAssetId = useMemo(() => {
    const { assetId } = router.query;
    return typeof assetId === 'string' && assetId.length > 0 ? assetId : undefined;
  }, [router.query]);

  // Garantir que o tema escuro seja aplicado
  useEffect(() => {
    if (systemSettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [systemSettings.darkMode]);

  useEffect(() => {
    const baseTitle = systemSettings.companyName
      ? `${systemSettings.companyName} DAM`
      : 'ALL MKT - Digital Asset Management';
    document.title = baseTitle;
  }, [systemSettings.companyName]);

  // Redirecionar visualizadores diretamente para materiais quando necessario
  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    if (!user) {
      return;
    }

    if (!isViewer()) {
      return;
    }

    if (currentPage !== 'materials') {
      void router.replace({ pathname: PAGE_TO_ROUTE.materials });
    }
  }, [router, user, isViewer, currentPage]);

  const handlePageChange = useCallback((page: string) => {
    const pageKey = Object.prototype.hasOwnProperty.call(PAGE_TO_ROUTE, page)
      ? (page as AppPageKey)
      : DEFAULT_APP_PAGE;
    const targetRoute = PAGE_TO_ROUTE[pageKey] ?? PAGE_TO_ROUTE[DEFAULT_APP_PAGE];

    if (!router.isReady) {
      return;
    }

    const basePath = (router.asPath || '').split('?')[0];
    if (basePath === targetRoute && Object.keys(router.query).length === 0) {
      return;
    }

    void router.push(targetRoute);
  }, [router]);

  const handleNavigateToMaterials = useCallback((projectId: string, projectName: string) => {
    const nextQuery: Record<string, string> = {
      categoryType: 'project',
      categoryId: projectId,
    };

    if (projectName) {
      nextQuery.categoryName = projectName;
    }

    void router.push({
      pathname: PAGE_TO_ROUTE.materials,
      query: nextQuery,
    });
  }, [router]);

  const handleNavigateToCampaignMaterials = useCallback((campaignId: string, campaignName: string) => {
    const nextQuery: Record<string, string> = {
      categoryType: 'campaign',
      categoryId: campaignId,
    };

    if (campaignName) {
      nextQuery.categoryName = campaignName;
    }

    void router.push({
      pathname: PAGE_TO_ROUTE.materials,
      query: nextQuery,
    });
  }, [router]);

  const handleBackToProjects = useCallback(() => {
    void router.push(PAGE_TO_ROUTE.projects);
  }, [router]);

  const handleBackToCampaigns = useCallback(() => {
    void router.push(PAGE_TO_ROUTE.campaigns);
  }, [router]);

  const handleAssetNavigate = useCallback((assetId: string | null) => {
    const baseQuery = { ...router.query };

    if (assetId) {
      baseQuery.assetId = assetId;
    } else {
      delete baseQuery.assetId;
    }

    void router.replace(
      {
        pathname: PAGE_TO_ROUTE.materials,
        query: baseQuery,
      },
      undefined,
      { shallow: true },
    );
  }, [router]);

  if (authLoading) {
    return <FullScreenLoader message={'Carregando sessao...'} />;
  }

  if (!user) {
    return (
      <>
        <DevelopmentModeAlert />
        {!systemSettings.emailNotifications && (
          <Alert className="border-yellow-500/40 bg-yellow-500/10 mb-4">
            <MailX className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-100">
              Notificacoes por email estao desativadas pelo administrador.
            </AlertDescription>
          </Alert>
        )}
        <LoginScreen />
      </>
    );
  }
  const renderPage = () => {
    const safeInitialFilters = materialFilters;
    const showBackToProjects = safeInitialFilters.categoryType === 'project' && !!safeInitialFilters.categoryId;
    const showBackToCampaigns = safeInitialFilters.categoryType === 'campaign' && !!safeInitialFilters.categoryId;

    switch (currentPage) {
      case 'dashboard':
        return (
          <PermissionGuard 
            permissions={[Permission.VIEW_DASHBOARD]} 
            fallback={<AccessDenied />}
          >
            <>
              <DevelopmentModeAlert />
              {isAdmin() && !systemSettings.emailNotifications && (
                <Alert className="border-blue-500/40 bg-blue-500/10 mb-4">
                  <MailX className="h-4 w-4 text-blue-200" />
                  <AlertDescription className="text-blue-100">
                    Emails automáticos estão desativados. Ative-os nas Configurações para avisos de upload e compartilhamento.
                  </AlertDescription>
                </Alert>
              )}
              {isAdmin() && !systemSettings.systemNotifications && (
                <Alert className="border-red-500/40 bg-red-500/10 mb-4">
                  <BellOff className="h-4 w-4 text-red-300" />
                  <AlertDescription className="text-red-200">
                    Alertas do sistema estão desativados. Nenhum aviso será exibido aos usuários.
                  </AlertDescription>
                </Alert>
              )}
              <Dashboard />
            </>
          </PermissionGuard>
        );

      case 'materials':
        return (
          <PermissionGuard 
            permissions={[Permission.VIEW_MATERIALS]} 
            fallback={<AccessDenied />}
          >
            <>
              <DevelopmentModeAlert />
              <AssetManager 
                initialFilters={safeInitialFilters}
                initialAssetId={selectedAssetId}
                onBackToProjects={showBackToProjects ? handleBackToProjects : undefined}
                onBackToCampaigns={showBackToCampaigns ? handleBackToCampaigns : undefined}
                onAssetNavigate={handleAssetNavigate}
              />
            </>
          </PermissionGuard>
        );
        
      case 'campaigns':
        return (
          <PermissionGuard 
            permissions={[Permission.VIEW_CAMPAIGNS]} 
            fallback={<AccessDenied />}
          >
            <>
              <DevelopmentModeAlert />
              <CampaignManager 
                onNavigateToMaterials={handleNavigateToCampaignMaterials}
              />
            </>
          </PermissionGuard>
        );
        
      case 'projects':
        return (
          <PermissionGuard 
            permissions={[Permission.VIEW_PROJECTS]} 
            fallback={<AccessDenied />}
          >
            <>
              <DevelopmentModeAlert />
              <ProjectManager 
                onPageChange={handlePageChange}
                onNavigateToMaterials={handleNavigateToMaterials}
              />
            </>
          </PermissionGuard>
        );
        
      case 'users':
        return (
          <PermissionGuard 
            permissions={[Permission.VIEW_USERS]} 
            fallback={<AccessDenied />}
          >
            <>
              <DevelopmentModeAlert />
              <UserManager />
            </>
          </PermissionGuard>
        );
        
      case 'shared':
        return (
          <PermissionGuard 
            permissions={[Permission.VIEW_SHARED_LINKS]} 
            fallback={<AccessDenied />}
          >
            <>
              <DevelopmentModeAlert />
              <SharedLinksManager />
            </>
          </PermissionGuard>
        );
        
      case 'settings':
        return (
          <PermissionGuard 
            permissions={[Permission.ACCESS_SETTINGS]} 
            fallback={<AccessDenied />}
          >
            <>
              <DevelopmentModeAlert />
              {isAdmin() && !systemSettings.emailNotifications && (
                <Alert className="border-blue-500/40 bg-blue-500/10 mb-4">
                  <MailX className="h-4 w-4 text-blue-200" />
                  <AlertDescription className="text-blue-100">
                    O envio de emails automáticos está desativado. Atualize esta configuração para reativar convites e avisos.
                  </AlertDescription>
                </Alert>
              )}
              {isAdmin() && !systemSettings.systemNotifications && (
                <Alert className="border-red-500/40 bg-red-500/10 mb-4">
                  <BellOff className="h-4 w-4 text-red-300" />
                  <AlertDescription className="text-red-200">
                    Alertas na interface estão desativados. Toques de sucesso ou erro não serão exibidos aos usuários.
                  </AlertDescription>
                </Alert>
              )}
              <Settings />
            </>
          </PermissionGuard>
        );
        
      default:
        // Para visualizadores, redirecionar para materiais ao invés do dashboard
        if (isViewer()) {
          return (
            <PermissionGuard 
              permissions={[Permission.VIEW_MATERIALS]} 
              fallback={<AccessDenied />}
            >
              <>
                <DevelopmentModeAlert />
                <AssetManager 
                  initialFilters={safeInitialFilters}
                  onBackToProjects={showBackToProjects ? handleBackToProjects : undefined}
                  onBackToCampaigns={showBackToCampaigns ? handleBackToCampaigns : undefined}
                />
              </>
            </PermissionGuard>
          );
        }
        
        return (
          <PermissionGuard 
            permissions={[Permission.VIEW_DASHBOARD]} 
            fallback={<AccessDenied />}
          >
            <>
              <DevelopmentModeAlert />
              <Dashboard />
            </>
          </PermissionGuard>
        );
    }
  };

  const pageContent = renderPage();

  return (
    <AssetProvider>
      <Suspense fallback={<FullScreenLoader message="Preparando layout..." />}>
        <AppLayout currentPage={currentPage} onPageChange={handlePageChange}>
          <Suspense fallback={<SuspenseFallback message="Carregando conteúdo..." />}>
            {pageContent}
          </Suspense>
        </AppLayout>
      </Suspense>
    </AssetProvider>
  );
}

export default function App() {
  return (
    <ConfigProvider>
      <AuthProvider>
        <AppFrame />
      </AuthProvider>
    </ConfigProvider>
  );
}

function AppFrame() {
  const { systemSettings } = useConfig();
  const { user } = useAuth();

  return (
    <div className="h-screen bg-background text-foreground">
      <AppContent />
      {user ? (
        <Suspense fallback={null}>
          <N8nFloatingWidgetLazy />
        </Suspense>
      ) : null}
      {systemSettings.systemNotifications && <Toaster />}
    </div>
  );
}












