import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Users, Crown, Settings, Eye } from 'lucide-react';
import { UserRole } from '../types/enums';
import { useAuth } from '../contexts/AuthContext';

// Mock users data since we don't have the full mock system
const mockUsers = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@allmkt.com',
    role: UserRole.ADMIN,
    department: 'TI',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    isActive: true,
    lastLogin: new Date()
  },
  {
    id: '2',
    name: 'Editor User',
    email: 'editor@allmkt.com',
    role: UserRole.EDITOR,
    department: 'Marketing',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b172e554?w=100&h=100&fit=crop&crop=face',
    isActive: true,
    lastLogin: new Date()
  },
  {
    id: '3',
    name: 'Viewer User',
    email: 'viewer@allmkt.com',
    role: UserRole.VIEWER,
    department: 'Vendas',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    isActive: true,
    lastLogin: new Date()
  }
];

function getRoleIcon(role: UserRole) {
  switch (role) {
    case UserRole.ADMIN:
      return <Crown className="w-4 h-4 text-yellow-500" />;
    case UserRole.EDITOR:
      return <Settings className="w-4 h-4 text-blue-500" />;
    case UserRole.VIEWER:
      return <Eye className="w-4 h-4 text-green-500" />;
    default:
      return <Users className="w-4 h-4 text-muted-foreground" />;
  }
}

function getRoleBadge(role: UserRole) {
  const variants = {
    [UserRole.ADMIN]: { label: 'Admin', variant: 'default' as const },
    [UserRole.EDITOR]: { label: 'Editor', variant: 'secondary' as const },
    [UserRole.VIEWER]: { label: 'Visualizador', variant: 'outline' as const }
  };
  return variants[role];
}

export function UserManager() {
  const { user: currentUser } = useAuth();

  const getStats = () => {
    const total = mockUsers.length;
    const active = mockUsers.filter(u => u.isActive).length;
    const admins = mockUsers.filter(u => u.role === UserRole.ADMIN).length;
    const editors = mockUsers.filter(u => u.role === UserRole.EDITOR).length;
    const viewers = mockUsers.filter(u => u.role === UserRole.VIEWER).length;
    
    return { total, active, admins, editors, viewers };
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Gerenciamento de Usuários
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie usuários e permissões do sistema
          </p>
        </div>
        
        <Button className="bg-primary hover:bg-primary/90">
          <Users className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Usuários cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Usuários ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Crown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Editores</CardTitle>
            <Settings className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.editors}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visualizadores</CardTitle>
            <Eye className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.viewers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
          <CardDescription>
            Lista de todos os usuários cadastrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-0">
            {mockUsers.map((user) => {
              const roleBadge = getRoleBadge(user.role);
              const roleIcon = getRoleIcon(user.role);
              
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>
                        {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{user.name}</h3>
                        {user.id === currentUser?.id && (
                          <Badge variant="outline" className="text-xs">Você</Badge>
                        )}
                        {!user.isActive && (
                          <Badge variant="destructive" className="text-xs">Inativo</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>{user.email}</span>
                        {user.department && (
                          <>
                            <span>•</span>
                            <span>{user.department}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Role Badge */}
                    <div className="flex items-center gap-2">
                      {roleIcon}
                      <Badge variant={roleBadge.variant}>
                        {roleBadge.label}
                      </Badge>
                    </div>

                    {/* Last Login */}
                    <div className="text-xs text-muted-foreground min-w-[100px]">
                      {user.lastLogin ? 'Hoje' : 'Nunca'}
                    </div>

                    {/* Actions */}
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}