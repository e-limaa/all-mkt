import { PageHeader } from './PageHeader';
import React, { useState, useEffect } from 'react';
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
  StopCircle,
  AlertTriangle,
  Megaphone
} from 'lucide-react';
import { Campaign } from '../types';
import { REGIONAL_OPTIONS } from '../lib/regionals';
import { formatDate } from '../utils/format';
import posthog from 'posthog-js';
import { motion } from 'framer-motion';
import { useAssets } from '../contexts/AssetContext';
import { usePermissions } from '../contexts/hooks/usePermissions';
import { Permission } from '../types/enums';

const getStatusBadge = (status: string) => {
  const badges = {
    active: { label: 'Ativa', variant: 'blue' as const, icon: PlayCircle },
    expiring: { label: 'Expirando', variant: 'secondary' as const, icon: AlertTriangle },
    inactive: { label: 'Agendada', variant: 'secondary' as const, icon: Clock },
    archived: { label: 'Encerrada', variant: 'outline' as const, icon: StopCircle }
  };
  return badges[status as keyof typeof badges] || badges.active;
};

interface CampaignManagerProps {
  onNavigateToMaterials?: (campaignId: string, campaignName: string) => void;
}

export function CampaignManager({ onNavigateToMaterials }: CampaignManagerProps) {
  const { campaigns, assets, createCampaign, updateCampaign, deleteCampaign } = useAssets();
  const { hasPermission, isViewer } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const getCreatorDisplayName = (name?: string, fallbackId?: string): string => {
    if (name && name.trim()) {
      return name.trim();
    }
    if (fallbackId && fallbackId.trim()) {
      const truncated = fallbackId.trim();
      return truncated.length > 10 ? `${truncated.slice(0, 10)}...` : truncated;
    }
    return 'No informado';
  };

  // Permisses para modificaes
  const canCreateCampaigns = hasPermission(Permission.CREATE_CAMPAIGNS);
  const canEditCampaigns = hasPermission(Permission.EDIT_CAMPAIGNS);
  const canDeleteCampaigns = hasPermission(Permission.DELETE_CAMPAIGNS);
  const headerDescription = isViewer()
    ? 'Visualize campanhas e seus materiais'
    : 'Gerencie campanhas e organize materiais por aes de marketing';

  const captureCampaignEvent = (eventName: string, payload: Record<string, unknown>) => {
    if (typeof window === 'undefined') {
      return;
    }
    posthog.capture(eventName, payload);
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || campaign.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const handleCreateCampaign = async (campaignData: Partial<Campaign>) => {
    if (!canCreateCampaigns) {
      toast.error('Voce nao possui permissao para criar campanhas');
      return;
    }

    const normalizedRegional = (campaignData.regional || '').trim().toUpperCase();
    if (!normalizedRegional) {
      toast.error('Regional e obrigatoria');
      return;
    }

    try {
      const newCampaign = await createCampaign({
        name: campaignData.name || '',
        description: campaignData.description,
        startDate: campaignData.startDate || new Date().toISOString().split('T')[0],
        endDate: campaignData.endDate,
        status: (campaignData.status || 'inactive') as Campaign['status'],
        tags: campaignData.tags || [],
        color: campaignData.color || '#E4002B',
        regional: normalizedRegional,
      });
      setIsCreateOpen(false);
      captureCampaignEvent('campaign_created', {
        campaign_id: newCampaign?.id ?? null,
        name: campaignData.name ?? '',
        status: campaignData.status ?? 'inactive',
        regional: normalizedRegional,
      });
    } catch (error) {
      console.error('[CampaignManager] Erro ao criar campanha', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Erro ao criar campanha');
      }
    }
  };

  const handleUpdateCampaign = async (updatedCampaign: Campaign) => {
    if (!canEditCampaigns) {
      toast.error('Voce nao possui permissao para editar campanhas');
      return;
    }

    const normalizedRegional = (updatedCampaign.regional || '').trim().toUpperCase();
    if (!normalizedRegional) {
      toast.error('Regional e obrigatoria');
      return;
    }

    try {
      await updateCampaign(updatedCampaign.id, {
        name: updatedCampaign.name,
        description: updatedCampaign.description,
        startDate: updatedCampaign.startDate,
        endDate: updatedCampaign.endDate,
        status: updatedCampaign.status,
        createdBy: updatedCampaign.createdBy,
        tags: updatedCampaign.tags,
        regional: normalizedRegional,
      });
      setEditingCampaign(null);
      captureCampaignEvent('campaign_updated', {
        campaign_id: updatedCampaign.id,
        name: updatedCampaign.name,
        status: updatedCampaign.status,
        regional: normalizedRegional,
      });
    } catch (error) {
      console.error('[CampaignManager] Erro ao atualizar campanha', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Erro ao atualizar campanha');
      }
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!canDeleteCampaigns) {
      toast.error('Voc no possui permisso para excluir campanhas');
      return;
    }
    try {
      await deleteCampaign(campaignId);
    } catch (error) {
      console.error('[CampaignManager] Erro ao excluir campanha', error);
    }
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

    // Se existe funo de callback para navegao, usa ela
    if (onNavigateToMaterials) {
      onNavigateToMaterials(campaign.id, campaign.name);
    } else {
      // Fallback: mostrar toast com informaes
      toast.success(`${campaignAssets.length} material${campaignAssets.length > 1 ? 'is' : ''} encontrado${campaignAssets.length > 1 ? 's' : ''} para "${campaign.name}"`);
    }
  };

  const getStats = () => {
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const scheduledCampaigns = campaigns.filter(c => c.status === 'inactive').length;
    const archivedCampaigns = campaigns.filter(c => c.status === 'archived').length;
    const expiringCampaigns = campaigns.filter(c => c.status === 'expiring').length;

    return { totalCampaigns, activeCampaigns, scheduledCampaigns, archivedCampaigns, expiringCampaigns };
  };

  const stats = getStats();

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: any = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Megaphone}
        title="Campanhas de Marketing"
        description={headerDescription}
        action={
          canCreateCampaigns ? (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-primary hover:bg-primary/90 sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Campanha
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Criar Nova Campanha</DialogTitle>
                  <DialogDescription>Configure uma nova campanha de marketing</DialogDescription>
                </DialogHeader>
                <CampaignForm onSubmit={handleCreateCampaign} />
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Card className="h-full bg-card border-border hover:border-primary/50 hover:shadow-[0_0_30px_-10px_rgba(220,38,38,0.3)] transition-all duration-500 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Total de Campanhas</CardTitle>
              <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Megaphone className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.totalCampaigns}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full bg-card border-border hover:border-emerald-500/50 hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)] transition-all duration-500 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Campanhas Ativas</CardTitle>
              <div className="p-2 rounded-full bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                <PlayCircle className="h-4 w-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.activeCampaigns}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalCampaigns > 0 ? ((stats.activeCampaigns / stats.totalCampaigns) * 100).toFixed(0) : 0}% do total
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full bg-card border-border hover:border-orange-500/50 hover:shadow-[0_0_30px_-10px_rgba(249,115,22,0.3)] transition-all duration-500 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Expirando</CardTitle>
              <div className="p-2 rounded-full bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.expiringCampaigns}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full bg-card border-border hover:border-blue-500/50 hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)] transition-all duration-500 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Agendadas</CardTitle>
              <div className="p-2 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                <Clock className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.scheduledCampaigns}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full bg-card border-border hover:border-slate-500/50 hover:shadow-[0_0_30px_-10px_rgba(100,116,139,0.3)] transition-all duration-500 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Encerradas</CardTitle>
              <div className="p-2 rounded-full bg-slate-500/10 group-hover:bg-slate-500/20 transition-colors">
                <StopCircle className="h-4 w-4 text-slate-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.archivedCampaigns}</div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Filters */}
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
              <SelectItem value="expiring">Expirando</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="inactive">Agendadas</SelectItem>
              <SelectItem value="archived">Encerradas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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
                        <DropdownMenuLabel>Aes</DropdownMenuLabel>
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
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <FolderOpen className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Materiais:</span>
                    <span className="font-medium text-foreground">{campaignAssets.length}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <UsersIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Criado por:</span>
                    <span className="font-medium text-foreground truncate">{getCreatorDisplayName(campaign.createdByName, campaign.createdBy)}</span>
                  </div>
                </div>

                {/* Dates */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-green-500" />
                    <span className="text-muted-foreground">Inicio:</span>
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
                    variant="default"
                    size="sm"
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
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
              {searchQuery ? 'Tente ajustar sua pesquisa' : 'No h campanhas disponveis'}
            </p>

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
                Atualize as informaes da campanha
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
    startDate: campaign?.startDate || '',
    endDate: campaign?.endDate || '',
    createdBy: campaign?.createdBy || '',
    regional: (campaign?.regional || '').toUpperCase(),
  });
  const [regionalError, setRegionalError] = useState(false);

  useEffect(() => {
    setFormData({
      name: campaign?.name || '',
      description: campaign?.description || '',
      startDate: campaign?.startDate || '',
      endDate: campaign?.endDate || '',
      createdBy: campaign?.createdBy || '',
      regional: (campaign?.regional || '').toUpperCase(),
    });
    setRegionalError(false);
  }, [campaign]);

  const determineStatus = (start?: string, end?: string): Campaign['status'] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = start ? new Date(`${start}T00:00:00`) : undefined;
    const endDate = end ? new Date(`${end}T00:00:00`) : undefined;

    if (startDate && today < startDate) {
      return 'inactive';
    }

    if (endDate && today > endDate) {
      return 'archived';
    }

    if (endDate) {
      const diffDays = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 2) {
        return 'expiring';
      }
    }

    return 'active';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.regional.trim()) {
      setRegionalError(true);
      toast.error('Regional e obrigatoria');
      return;
    }

    setRegionalError(false);
    const normalizedRegional = formData.regional.trim().toUpperCase();
    const computedStatus = determineStatus(formData.startDate, formData.endDate);
    onSubmit({
      name: formData.name,
      description: formData.description,
      status: computedStatus,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      createdBy: formData.createdBy || 'Usurio Atual',
      regional: normalizedRegional,
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
          placeholder="Ex: Lancamento Vista Alegre"
          className="bg-input-background border-border"
          required
        />
      </div>

      <div>
        <Label htmlFor="description" className="mb-2">Descricao</Label>
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
          <Label htmlFor="startDate" className="mb-2">Data de Inicio</Label>
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
        <Label htmlFor="regional" className="mb-2">Regional *</Label>
        <Select
          value={formData.regional}
          onValueChange={(value) => {
            setFormData({ ...formData, regional: value });
            if (regionalError) {
              setRegionalError(false);
            }
          }}
        >
          <SelectTrigger
            id="regional"
            className={`bg-input-background border-border ${regionalError ? 'border-red-500' : ''}`}
          >
            <SelectValue placeholder="Selecione a regional" />
          </SelectTrigger>
          <SelectContent>
            {REGIONAL_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90">
          {campaign ? 'Atualizar Campanha' : 'Criar Campanha'}
        </Button>
      </div>
    </form>
  );
}




