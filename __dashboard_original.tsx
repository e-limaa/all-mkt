import React, { useMemo } from 'react';
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
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { useAssets } from '../contexts/AssetContext';
import { formatFileSize, formatNumber, timeAgo } from '../utils/format';
import { useConfig } from '../contexts/ConfigContext';

const COLORS = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

export function Dashboard() {
  const { dashboardStats } = useAssets();
  const { systemSettings } = useConfig();

  const storagePercentage = (dashboardStats.storageUsed / dashboardStats.storageLimit) * 100;
  
  const assetTypeData = [
    { name: 'Imagens', value: dashboardStats.assetsByType.image, color: '#dc2626', icon: Image },
    { name: 'V+¡deos', value: dashboardStats.assetsByType.video, color: '#f97316', icon: Video },
    { name: 'Documentos', value: dashboardStats.assetsByType.document, color: '#eab308', icon: FileText },
    { name: 'Arquivos', value: dashboardStats.assetsByType.archive, color: '#22c55e', icon: Archive }
  ];

  const campaignData = Object.entries(dashboardStats.assetsByCampaign).map(([name, count]) => ({
    name: name.length > 15 ? name.substring(0, 15) + '...' : name,
    assets: count
  }));

  const projectData = Object.entries(dashboardStats.assetsByProject).map(([name, count]) => ({
    name: name.length > 15 ? name.substring(0, 15) + '...' : name,
    assets: count
  }));

  // Dados simulados para gr+ífico de tend+¬ncia
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
      label: 'Notifica+º+Áes por Email',
      description: 'Envio de alertas autom+íticos para administradores e equipes.',
      enabled: systemSettings.emailNotifications,
    },
    {
      label: 'Alertas do Sistema',
      description: 'Exibe toasts e avisos em tempo real dentro da aplica+º+úo.',
      enabled: systemSettings.systemNotifications,
    },
    {
      label: 'Autentica+º+úo em Duas Etapas',
      description: 'Solicita um segundo fator de verifica+º+úo no login.',
      enabled: systemSettings.twoFactor,
    },
    {
      label: 'M+¦ltiplas Sess+Áes',
      description: 'Permite acesso simult+óneo em mais de um dispositivo.',
      enabled: systemSettings.multiSessions,
    },
    {
      label: 'Backup Autom+ítico',
      description: 'Gera c+¦pias de seguran+ºa recorrentes dos materiais.',
      enabled: systemSettings.autoBackup,
    },
  ]), [systemSettings]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Materiais</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatNumber(dashboardStats.totalAssets)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">+12%</span> desde o m+¬s passado
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
              <span className="text-green-500">+8%</span> desde o m+¬s passado
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usu+írios Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatNumber(dashboardStats.totalUsers)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">+3</span> novos usu+írios
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
            <CardDescription>Distribui+º+úo por categoria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assetTypeData.map((item, index) => {
                const Icon = item.icon;
                const percentage = dashboardStats.totalAssets > 0 ? (item.value / dashboardStats.totalAssets) * 100 : 0;
                
                return (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
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
            <CardDescription>+Ültimas a+º+Áes no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardStats.recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {activity.userName} {activity.type === 'upload' ? 'enviou' : activity.type === 'download' ? 'baixou' : 'compartilhou'} &quot;{activity.assetName}&quot;
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
            <CardDescription>Distribui+º+úo de assets por campanha de marketing</CardDescription>
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
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--card)', 
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
            <CardDescription>Distribui+º+úo de assets por projeto</CardDescription>
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
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--card)', 
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
          <CardDescription>Resumo das funcionalidades globais configuradas</CardDescription>
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
            Tend+¬ncia de Uploads e Downloads
          </CardTitle>
          <CardDescription>Atividade dos +¦ltimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--card)', 
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--foreground)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="uploads" 
                stroke="#dc2626" 
                strokeWidth={3}
                dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                name="Uploads"
              />
              <Line 
                type="monotone" 
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
    </div>
  );
}
