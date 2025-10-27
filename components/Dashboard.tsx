import React, { useMemo, useState } from 'react';
import { PageHeader } from './PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  FolderOpen,
  Users,
  Download,
  Share2,
  TrendingUp,
  HardDrive,
  Calendar,
  Activity,
  Image,
  Video,
  FileText,
  Archive,
  Eye,
  BarChart3,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { useAssets } from '../contexts/AssetContext';
import { formatFileSize, formatNumber, timeAgo } from '../utils/format';
import { useConfig } from '../contexts/ConfigContext';
import { ExportReportDialog, IndicatorOption } from './ExportReportDialog';
import { generateReport, type IndicatorId } from '../lib/report/generateReport';
import { format } from 'date-fns';
import { toast } from 'sonner';


const COLORS = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

export function Dashboard() {
  const { dashboardStats } = useAssets();
  const { systemSettings } = useConfig();

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const storagePercentage = (dashboardStats.storageUsed / dashboardStats.storageLimit) * 100;

  const assetTypeData = useMemo(
    () => [
      { name: 'Imagens', value: dashboardStats.assetsByType.image, color: '#dc2626', icon: Image },
      { name: 'Vídeos', value: dashboardStats.assetsByType.video, color: '#f97316', icon: Video },
      { name: 'Documentos', value: dashboardStats.assetsByType.document, color: '#eab308', icon: FileText },
      { name: 'Arquivos', value: dashboardStats.assetsByType.archive, color: '#22c55e', icon: Archive }
    ],
    [
      dashboardStats.assetsByType.archive,
      dashboardStats.assetsByType.document,
      dashboardStats.assetsByType.image,
      dashboardStats.assetsByType.video
    ],
  );

  const campaignEntries = useMemo(
    () => Object.entries(dashboardStats.assetsByCampaign),
    [dashboardStats.assetsByCampaign],
  );
  const projectEntries = useMemo(
    () => Object.entries(dashboardStats.assetsByProject),
    [dashboardStats.assetsByProject],
  );

  const campaignData = useMemo(
    () =>
      campaignEntries.map(([name, count]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        assets: count
      })),
    [campaignEntries],
  );

  const projectData = useMemo(
    () =>
      projectEntries.map(([name, count]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        assets: count
      })),
    [projectEntries],
  );
// Dados simulados para gráfico de tendência
  const trendData = [
    { month: 'Jan', uploads: 45, downloads: 120 },
    { month: 'Fev', uploads: 52, downloads: 145 },
    { month: 'Mar', uploads: 48, downloads: 135 },
    { month: 'Abr', uploads: 61, downloads: 168 },
    { month: 'Mai', uploads: 55, downloads: 152 },
    { month: 'Jun', uploads: 67, downloads: 189 }
  ];

  const systemStatus = useMemo(() => ([
    {
      label: 'Notifica\u00e7\u00f5es por Email',
      description: 'Envio de alertas autom\u00e1ticos para administradores e equipes.',
      enabled: systemSettings.emailNotifications,
    },
    {
      label: 'Alertas do Sistema',
      description: 'Exibe toasts e avisos em tempo real dentro da aplica\u00e7\u00e3o.',
      enabled: systemSettings.systemNotifications,
    },
    {
      label: 'Autentica\u00e7\u00e3o em Duas Etapas',
      description: 'Solicita um segundo fator de verifica\u00e7\u00e3o no login.',
      enabled: systemSettings.twoFactor,
    },
    {
      label: 'M\u00faltiplas Sess\u00f5es',
      description: 'Permite acesso simult\u00e2neo em mais de um dispositivo.',
      enabled: systemSettings.multiSessions,
    },
    {
      label: 'Backup Autom\u00e1tico',
      description: 'Gera c\u00f3pias de seguran\u00e7a recorrentes dos materiais.',
      enabled: systemSettings.autoBackup,
    },
  ]), [systemSettings]);
  const indicatorOptions = useMemo<IndicatorOption[]>(
    () => [
      { id: 'totalMaterials', label: 'Total de Materiais', description: 'Quantidade total de assets cadastrados.' },
      { id: 'downloads', label: 'Downloads', description: 'Total de downloads realizados no per\u00edodo.' },
      { id: 'activeUsers', label: 'Usu\u00e1rios Ativos', description: 'Usu\u00e1rios ativos no DAM.' },
      { id: 'activeLinks', label: 'Links Ativos', description: 'Links compartilhados atualmente v\u00e1lidos.' },
      { id: 'assetTypes', label: 'Tipos de Material', description: 'Distribui\u00e7\u00e3o dos materiais por categoria.' },
      { id: 'campaignDistribution', label: 'Materiais por Campanha', description: 'Volume de materiais por campanha de marketing.' },
      { id: 'projectDistribution', label: 'Materiais por Empreendimento', description: 'Volume de materiais por empreendimento.' },
      { id: 'recentActivity', label: 'Atividade Recente', description: '\u00daltimos uploads realizados pela equipe.' },
      { id: 'trend', label: 'Tend\u00eancia de Uploads e Downloads', description: 'Resumo de uploads e downloads nos \u00faltimos meses.' },
    ],
    [],
  );
  const defaultDateRange = useMemo(() => {
    const today = new Date();
    const end = format(today, 'yyyy-MM-dd');
    const startDateObject = new Date(today);
    startDateObject.setDate(startDateObject.getDate() - 29);
    const start = format(startDateObject, 'yyyy-MM-dd');
    return { startDate: start, endDate: end };
  }, []);

  const handleGenerateReport = async (config: { indicators: string[]; dateRange: { startDate: string; endDate: string } }) => {
    setIsGeneratingReport(true);
    try {
      await generateReport({
        indicators: config.indicators as IndicatorId[],
        dateRange: config.dateRange,
        data: {
          stats: dashboardStats,
          assetTypeData: assetTypeData.map(({ name, value, color }) => ({ name, value, color })),
          campaignData: campaignEntries.map(([name, count]) => ({ name, assets: count })),
          projectData: projectEntries.map(([name, count]) => ({ name, assets: count })),
          trendData,
          companyName: systemSettings.companyName,
        },
      });
      toast.success('Relatório exportado com sucesso.');
      setIsExportDialogOpen(false);
    } catch (error) {
      console.error('[Dashboard] erro ao gerar PDF', error);
      toast.error('Não foi possível gerar o relatório. Tente novamente.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const headerDescription = "Acompanhe o desempenho dos seus materiais em tempo real.";
  const headerAction = (
    <Button
      variant="outline"
      className="w-full sm:w-auto"
      onClick={() => setIsExportDialogOpen(true)}
    >
      <Download className="mr-2 h-4 w-4" />
      Exportar relatório
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Painel de Insights"
        description={headerDescription}
        action={headerAction}
      />
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Materiais</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatNumber(dashboardStats.totalAssets)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">+12%</span> desde o mês passado
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatNumber(dashboardStats.downloadCount)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">+8%</span> desde o mês passado
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatNumber(dashboardStats.totalUsers)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">+3</span> Nãos usuários
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Links Ativos</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatNumber(dashboardStats.activeSharedLinks)}</div>
            <p className="text-xs text-muted-foreground">
              Links compartilhados ativos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Storage Usage */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              Uso de Armazenamento
            </CardTitle>
            <CardDescription>
              {formatFileSize(dashboardStats.storageUsed * 1024 * 1024 * 1024)} de {formatFileSize(dashboardStats.storageLimit * 1024 * 1024 * 1024)} utilizados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={storagePercentage} className="w-full" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{storagePercentage.toFixed(1)}% usado</span>
              <span className="text-muted-foreground">{(dashboardStats.storageLimit - dashboardStats.storageUsed).toFixed(1)}GB livres</span>
            </div>
          </CardContent>
        </Card>

        {/* Asset Types */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Tipos de Material</CardTitle>
            <CardDescription>Distribuição por categoria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assetTypeData.map((item, index) => {
                const Icon = item.icon;
                const percentage = dashboardStats.totalAssets > 0 ? (item.value / dashboardStats.totalAssets) * 100 : 0;
                
                return (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgrouNãolor: item.color }} />
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold">{item.value}</span>
                      <span className="text-xs text-muted-foreground ml-2">({percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Atividade Recente
            </CardTitle>
            <CardDescription>Últimas ações no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardStats.recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {activity.userName} {activity.type === 'upload' ? 'eNãou' : activity.type === 'download' ? 'baixou' : 'compartilhou'} &quot;{activity.assetName}&quot;
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {activity.categoryName && (
                        <Badge variant="outline" className="text-xs">
                          {activity.categoryName}
                        </Badge>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {timeAgo(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaigns Chart */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Materiais por Campanha</CardTitle>
            <CardDescription>Distribuição de assets por campanha de marketing</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={campaignData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  angle={-45}
                  textANãor="end"
                  height={80}
                />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgrouNãolor: 'var(--card)', 
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--foreground)'
                  }}
                />
                <Bar dataKey="assets" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Projects Chart */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Materiais por Empreendimento</CardTitle>
            <CardDescription>Distribuição de assets por projeto</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  angle={-45}
                  textANãor="end"
                  height={80}
                />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgrouNãolor: 'var(--card)', 
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--foreground)'
                  }}
                />
                <Bar dataKey="assets" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Status do Sistema
          </CardTitle>
          <CardDescription>Resumo das fuNãonalidades globais configuradas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {systemStatus.map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 rounded-lg border border-border/40 bg-background/60 p-3"
            >
              <div className="flex-shrink-0 mt-1">
                {item.enabled ? (
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.label}</span>
                  <Badge variant={item.enabled ? 'default' : 'destructive'} className="uppercase tracking-wide text-[10px]">
                    {item.enabled ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Trend Chart */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Tendência de Uploads e Downloads
          </CardTitle>
          <CardDescription>Atividade dosúltimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip 
                contentStyle={{ 
                  backgrouNãolor: 'var(--card)', 
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--foreground)'
                }}
              />
              <Line 
                type="moNãone" 
                dataKey="uploads" 
                stroke="#dc2626" 
                strokeWidth={3}
                dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                name="Uploads"
              />
              <Line 
                type="moNãone" 
                dataKey="downloads" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                name="Downloads"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <ExportReportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        indicators={indicatorOptions}
        defaultSelected={indicatorOptions.map((indicator) => indicator.id)}
        defaultDateRange={defaultDateRange}
        onGenerate={handleGenerateReport}
        isGenerating={isGeneratingReport}
      />
    </div>
  );
}






























