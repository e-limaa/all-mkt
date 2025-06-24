import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/hooks/usePermissions';
import { LogOut } from 'lucide-react';

export function UserProfile() {
  const { user, signOut } = useAuth();
  const { isViewer, isEditor, isAdmin } = usePermissions();

  const getRoleLabel = () => {
    if (isAdmin()) return 'Administrador';
    if (isEditor()) return 'Editor';
    if (isViewer()) return 'Visualizador';
    return 'Usuário';
  };

  const getRoleColor = () => {
    if (isAdmin()) return 'text-yellow-500';
    if (isEditor()) return 'text-blue-500';
    if (isViewer()) return 'text-green-500';
    return 'text-muted-foreground';
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
        <span className="text-xs font-medium text-primary-foreground">
          {user.name?.charAt(0) || 'U'}
        </span>
      </div>
      <div className="flex flex-col min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {user.name}
        </p>
        <p className={`text-xs ${getRoleColor()}`}>
          {getRoleLabel()}
        </p>
      </div>
      <button
        onClick={signOut}
        className="text-muted-foreground hover:text-foreground transition-colors ml-2"
        title="Sair"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}