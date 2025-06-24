import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Share2, Plus, ExternalLink, Download, Calendar, BarChart3 } from 'lucide-react';
import { useAssets } from '../contexts/AssetContext';
import { formatDate } from '../utils/format';

export function SharedLinksManager() {
  const { sharedLinks } = useAssets();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3">
            <Share2 className="w-8 h-8 text-primary" />
            Links Compartilhados
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie links para compartilhamento de materiais com clientes e parceiros
          </p>
        </div>
        
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Novo Link
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div className="text-2xl font-bold">{sharedLinks.filter(link => !link.expiresAt || link.expiresAt > new Date()).length}</div>
            <p className="text-xs text-muted-foreground">Não expirados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Acessos</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sharedLinks.reduce((sum, link) => sum + link.accessCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Visualizações</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Download</CardTitle>
            <Download className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sharedLinks.filter(link => link.downloadEnabled).length}
            </div>
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
                    <h3 className="font-medium truncate">{link.name}</h3>
                    <Badge variant={link.isPublic ? 'default' : 'secondary'}>
                      {link.isPublic ? 'Público' : 'Privado'}
                    </Badge>
                    {link.downloadEnabled && (
                      <Badge variant="outline">
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Badge>
                    )}
                  </div>
                  
                  {link.description && (
                    <p className="text-sm text-muted-foreground mb-2">{link.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Criado em {formatDate(link.createdAt)}
                    </span>
                    {link.expiresAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Expira em {formatDate(link.expiresAt)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      {link.accessCount} acessos
                    </span>
                    <span>{link.assetIds.length} materiais</span>
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