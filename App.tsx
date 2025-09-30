import React, { useState, useEffect } from 'react';
import { Toaster } from './components/ui/sonner';
import { ConfigProvider, useConfig } from './contexts/ConfigContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AssetProvider } from './contexts/AssetContext';
import { LoginScreen } from './components/LoginScreen';
import { AppLayout } from './components/AppLayout';
import { Dashboard } from './components/Dashboard';
import { AssetManager } from './components/AssetManager';
import { CampaignManager } from './components/CampaignManager';
import { ProjectManager } from './components/ProjectManager';
import { UserManager } from './components/UserManager';
import { SharedLinksManager } from './components/SharedLinksManager';
import { Settings } from './components/Settings';
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

interface NavigationState {
  page: string;
  materialFilters?: MaterialFilters;
}

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
  const { user } = useAuth();
  const { isViewer, isAdmin } = usePermissions();
  const { systemSettings } = useConfig();
  const [navigationState, setNavigationState] = useState<NavigationState>({
    page: 'dashboard'
  });

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

  // Redirecionar visualizadores para materiais ao entrar
  useEffect(() => {
    if (user && isViewer() && navigationState.page === 'dashboard') {
      setNavigationState({ page: 'materials' });
    }
  }, [user, isViewer, navigationState.page]);

  if (!user) {
    return (
      <>
        <DevelopmentModeAlert />
        {!systemSettings.emailNotifications && (
          <Alert className="border-yellow-500/40 bg-yellow-500/10 mb-4">
            <MailX className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-100">
              Notificações por email estão desativadas pelo administrador.
            </AlertDescription>
          </Alert>
        )}
        <LoginScreen />
      </>
    );
  }

  const handlePageChange = (page: string) => {
    setNavigationState({ page, materialFilters: undefined });
  };

  const handleNavigateToMaterials = (projectId: string, projectName: string) => {
    setNavigationState({
      page: 'materials',
      materialFilters: {
        categoryType: 'project',
        categoryId: projectId,
        categoryName: projectName
      }
    });
  };

  const handleNavigateToCampaignMaterials = (campaignId: string, campaignName: string) => {
    setNavigationState({
      page: 'materials',
      materialFilters: {
        categoryType: 'campaign',
        categoryId: campaignId,
        categoryName: campaignName
      }
    });
  };

  const handleBackToProjects = () => {
    setNavigationState({ page: 'projects' });
  };

  const handleBackToCampaigns = () => {
    setNavigationState({ page: 'campaigns' });
  };

  const renderPage = () => {
    // Provide safe defaults for material filters
    const safeInitialFilters = navigationState.materialFilters || {};
    
    switch (navigationState.page) {
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
                onBackToProjects={safeInitialFilters.categoryType === 'project' ? handleBackToProjects : undefined}
                onBackToCampaigns={safeInitialFilters.categoryType === 'campaign' ? handleBackToCampaigns : undefined}
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
                  onBackToProjects={safeInitialFilters.categoryType === 'project' ? handleBackToProjects : undefined}
                  onBackToCampaigns={safeInitialFilters.categoryType === 'campaign' ? handleBackToCampaigns : undefined}
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

  return (
    <AssetProvider>
      <AppLayout currentPage={navigationState.page} onPageChange={handlePageChange}>
        {renderPage()}
      </AppLayout>
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

  return (
    <div className="h-screen bg-background text-foreground">
      <AppContent />
      {systemSettings.systemNotifications && <Toaster />}
    </div>
  );
}
