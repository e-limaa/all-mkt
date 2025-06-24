import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Users as UsersIcon,
  FolderOpen,
  TrendingUp,
  Clock,
  PlayCircle,
  PauseCircle,
  StopCircle,
  Megaphone
} from 'lucide-react';
import { Campaign } from '../types';
import { formatDate } from '../utils/format';
import { useAssets } from '../contexts/AssetContext';
import { usePermissions } from '../contexts/hooks/usePermissions';
import { Permission } from '../types/enums';

const getStatusBadge = (status: string) => {
  const badges = {
    ativa: { label: 'Ativa', variant: 'default' as const, icon: PlayCircle },
    pausada: { label: 'Pausada', variant: 'secondary' as const, icon: PauseCircle },
    finalizada: { label: 'Finalizada', variant: 'outline' as const, icon: StopCircle }
  };
  return badges[status as keyof typeof badges] || badges.ativa;
};

interface CampaignManagerProps {
  onNavigateToMaterials?: (campaignId: string, campaignName: string) => void;
}

export function CampaignManager({ onNavigateToMaterials }: CampaignManagerProps) {
  const { campaigns, assets } = useAssets();
  const { hasPermission, isViewer } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  
  // Permissões para modificações
  const canCreateCampaigns = hasPermission(Permission.CREATE_CAMPAIGNS);
  const canEditCampaigns = hasPermission(Permission.EDIT_CAMPAIGNS);
  const canDeleteCampaigns = hasPermission(Permission.DELETE_CAMPAIGNS);
  
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         campaign.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || campaign.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateCampaign = (campaignData: Partial<Campaign>) => {
    if (!canCreateCampaigns) {
      toast.error('Você não possui permissão para criar campanhas');
      return;
    }
    // Simular criação de campanha
    toast.success(`Campanha "${campaignData.name}" criada com sucesso!`);
    setIsCreateOpen(false);
  };

  const handleUpdateCampaign = (updatedCampaign: Campaign) => {
    if (!canEditCampaigns) {
      toast.error('Você não possui permissão para editar campanhas');
      return;
    }
    // Simular atualização
    setEditingCampaign(null);
    toast.success(`Campanha "${updatedCampaign.name}" atualizada com sucesso!`);
  };

  const handleDeleteCampaign = (campaignId: string) => {
    if (!canDeleteCampaigns) {
      toast.error('Você não possui permissão para excluir campanhas');
      return;
    }
    const campaign = campaigns.find(c => c.id === campaignId);
    toast.success(`Campanha "${campaign?.name}" removida com sucesso!`);
  };

  const getCampaignAssets = (campaignId: string) => {
    return assets.filter(asset => asset.categoryType === 'campaign' && asset.categoryId === campaignId);
  };

  const handleViewMaterials = (campaign: Campaign) => {
    const campaignAssets = getCampaignAssets(campaign.id);
    
    if (campaignAssets.length === 0) {
      toast.info(`Nenhum material encontrado para "${campaign.name}"`);
      return;
    }

    // Se existe função de callback para navegação, usa ela
    if (onNavigateToMaterials) {
      onNavigateToMaterials(campaign.id, campaign.name);
    } else {
      // Fallback: mostrar toast com informações
      toast.success(`${campaignAssets.length} material${campaignAssets.length > 1 ? 'is' : ''} encontrado${campaignAssets.length > 1 ? 's' : ''} para "${campaign.name}"`);
    }
  };

  const getStats = () => {
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const pausedCampaigns = campaigns.filter(c => c.status === 'paused').length;
    const finishedCampaigns = campaigns.filter(c => c.status === 'completed').length;
    
    return { totalCampaigns, activeCampaigns, pausedCampaigns, finishedCampaigns };
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-primary" />
            Campanhas de Marketing
          </h1>
          <p className="text-muted-foreground mt-1">
            {isViewer() 
              ? 'Visualize campanhas e seus materiais' 
              : 'Gerencie campanhas e organize materiais por ações de marketing'
            }
          </p>
        </div>
        
        {canCreateCampaigns && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Nova Campanha
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Nova Campanha</DialogTitle>
                <DialogDescription>
                  Configure uma nova campanha de marketing
                </DialogDescription>
              </DialogHeader>
              <CampaignForm onSubmit={handleCreateCampaign} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Campanhas</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalCampaigns}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campanhas Ativas</CardTitle>
            <PlayCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.activeCampaigns / stats.totalCampaigns) * 100).toFixed(0)}% do total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pausadas</CardTitle>
            <PauseCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.pausedCampaigns}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Finalizadas</CardTitle>
            <StopCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.finishedCampaigns}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar campanhas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-input-background border-border"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-40 bg-input-background border-border">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="ativa">Ativas</SelectItem>
                  <SelectItem value="pausada">Pausadas</SelectItem>
                  <SelectItem value="finalizada">Finalizadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCampaigns.map((campaign) => {
          const statusBadge = getStatusBadge(campaign.status);
          const campaignAssets = getCampaignAssets(campaign.id);
          const StatusIcon = statusBadge.icon;
          
          return (
            <Card key={campaign.id} className="group hover:shadow-lg transition-all duration-300 bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: campaign.color }}
                    />
                    <Badge variant={statusBadge.variant} className="text-xs">
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusBadge.label}
                    </Badge>
                  </div>
                  {(canEditCampaigns || canDeleteCampaigns) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {canEditCampaigns && (
                          <DropdownMenuItem onClick={() => setEditingCampaign(campaign)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleViewMaterials(campaign)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Materiais ({campaignAssets.length})
                        </DropdownMenuItem>
                        {canDeleteCampaigns && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteCampaign(campaign.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground">{campaign.name}</CardTitle>
                  {campaign.description && (
                    <CardDescription className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {campaign.description}
                    </CardDescription>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <FolderOpen className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Materiais:</span>
                    <span className="font-medium text-foreground">{campaignAssets.length}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <UsersIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Criado por:</span>
                    <span className="font-medium text-foreground truncate">{campaign.createdBy}</span>
                  </div>
                </div>
                
                {/* Dates */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-green-500" />
                    <span className="text-muted-foreground">Início:</span>
                    <span className="text-foreground">{formatDate(campaign.startDate)}</span>
                  </div>
                  {campaign.endDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-red-500" />
                      <span className="text-muted-foreground">Fim:</span>
                      <span className="text-foreground">{formatDate(campaign.endDate)}</span>
                    </div>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 bg-card hover:bg-accent border-border"
                    onClick={() => handleViewMaterials(campaign)}
                    disabled={campaignAssets.length === 0}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Materiais {campaignAssets.length > 0 && `(${campaignAssets.length})`}
                  </Button>
                  {canEditCampaigns && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-card hover:bg-accent border-border"
                      onClick={() => setEditingCampaign(campaign)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCampaigns.length === 0 && (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-12 text-center">
            <Megaphone className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2 text-foreground">Nenhuma campanha encontrada</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Tente ajustar sua pesquisa' : 'Não há campanhas disponíveis'}
            </p>
            {canCreateCampaigns && (
              <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Nova Campanha
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Campaign Dialog */}
      {canEditCampaigns && (
        <Dialog open={!!editingCampaign} onOpenChange={() => setEditingCampaign(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Campanha</DialogTitle>
              <DialogDescription>
                Atualize as informações da campanha
              </DialogDescription>
            </DialogHeader>
            {editingCampaign && (
              <CampaignForm 
                campaign={editingCampaign}
                onSubmit={(data) => handleUpdateCampaign({ ...editingCampaign, ...data })}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Campaign Form Component
function CampaignForm({ 
  campaign, 
  onSubmit 
}: { 
  campaign?: Campaign;
  onSubmit: (data: Partial<Campaign>) => void;
}) {
  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    description: campaign?.description || '',
    startDate: campaign?.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '',
    endDate: campaign?.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : '',
    status: campaign?.status || 'ativa',
    color: campaign?.color || '#dc2626',
    createdBy: campaign?.createdBy || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      status: formData.status as 'planning' | 'active' | 'paused' | 'completed',
      startDate: new Date(formData.startDate).toISOString(),
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
      createdBy: formData.createdBy || 'Usuário Atual',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name" className="mb-2">Nome da Campanha</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Lançamento Vista Alegre"
          className="bg-input-background border-border"
          required
        />
      </div>

      <div>
        <Label htmlFor="description" className="mb-2">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descreva os objetivos e detalhes da campanha..."
          className="bg-input-background border-border resize-none"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate" className="mb-2">Data de Início</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="bg-input-background border-border"
            required
          />
        </div>

        <div>
          <Label htmlFor="endDate" className="mb-2">Data de Fim</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            className="bg-input-background border-border"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="status" className="mb-2">Status</Label>
        <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as any })}>
          <SelectTrigger className="bg-input-background border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ativa">Ativa</SelectItem>
            <SelectItem value="pausada">Pausada</SelectItem>
            <SelectItem value="finalizada">Finalizada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="color" className="mb-2">Cor da Campanha</Label>
        <div className="flex gap-2">
          <Input
            id="color"
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="w-16 h-10 p-1 bg-input-background border-border"
          />
          <Input
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            placeholder="#dc2626"
            className="flex-1 bg-input-background border-border"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90">
          {campaign ? 'Atualizar Campanha' : 'Criar Campanha'}
        </Button>
      </div>
    </form>
  );
}