import { PageHeader } from './PageHeader';
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Share2, Plus, ExternalLink, Download, Calendar, BarChart3 } from 'lucide-react';
import { useAssets } from '../contexts/AssetContext';
import { formatDate } from '../utils/format';

export function SharedLinksManager() {
  const { sharedLinks } = useAssets();
  const headerDescription =
    "Gerencie links para compartilhamento de materiais com clientes e parceiros";

  const activeLinks = sharedLinks.filter((link) => {
    if (!link.is_active) return false;
    if (!link.expires_at) return true;
    return new Date(link.expires_at) > new Date();
  });

  const totalDownloads = sharedLinks.reduce((sum, link) => sum + (link.download_count ?? 0), 0);
  const downloadEnabledCount = sharedLinks.filter((link) => {
    if (link.max_downloads == null) return true;
    return link.download_count < link.max_downloads;
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Share2}
        title="Links Compartilhados"
        description={headerDescription}
        action={
          <Button className="w-full bg-primary hover:bg-primary/90 sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Novo Link
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Links</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sharedLinks.length}</div>
            <p className="text-xs text-muted-foreground">Links criados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Links Ativos</CardTitle>
            <ExternalLink className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLinks.length}</div>
            <p className="text-xs text-muted-foreground">Não expirados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Acessos</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDownloads}</div>
            <p className="text-xs text-muted-foreground">Visualizações</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Download</CardTitle>
            <Download className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{downloadEnabledCount}</div>
            <p className="text-xs text-muted-foreground">Permitem download</p>
          </CardContent>
        </Card>
      </div>

      {/* Links List */}
      <Card>
        <CardHeader>
          <CardTitle>Links Compartilhados</CardTitle>
          <CardDescription>
            Todos os links criados para compartilhamento de materiais
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-0">
            {sharedLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium truncate">Token {link.token.slice(0, 8)}...</h3>
                    <Badge variant={link.is_active ? 'default' : 'secondary'}>
                      {link.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    {link.max_downloads != null && (
                      <Badge variant="outline">
                        <Download className="w-3 h-3 mr-1" />
                        {link.download_count}/{link.max_downloads}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Criado em {formatDate(link.created_at)}
                    </span>
                    {link.expires_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Expira em {formatDate(link.expires_at)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      {link.download_count} downloads
                    </span>
                    <span>ID do material: {link.asset_id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir
                  </Button>
                  <Button variant="ghost" size="sm">
                    Editar
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {sharedLinks.length === 0 && (
            <div className="p-12 text-center">
              <Share2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium mb-2">Nenhum link compartilhado</h3>
              <p className="text-muted-foreground mb-4">
                Crie links para compartilhar materiais com clientes e parceiros
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Link
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}




