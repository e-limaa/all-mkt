"use client";

import React, { useMemo, useState } from 'react';
import { PageHeader } from './PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import {
    FolderOpen,
    Users,
    Download,
    Share2,
    HardDrive,
    Calendar,
    Activity,
    Image,
    Video,
    FileText,
    Archive,
    ArrowUpRight,
    Sparkles
} from 'lucide-react';
import { useAssets } from '../contexts/AssetContext';
import { formatFileSize, formatNumber, timeAgo } from '../utils/format';
import { useConfig } from '../contexts/ConfigContext';
import { ExportReportDialog, IndicatorOption } from './ExportReportDialog';
import { generateReport, type IndicatorId } from '../lib/report/generateReport';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export function Dashboard() {
    const { dashboardStats } = useAssets() || {};
    const { systemSettings } = useConfig();

    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    if (!dashboardStats) {
        return <div className="flex items-center justify-center h-96 text-muted-foreground">Carregando dados do dashboard...</div>;
    }

    const storagePercentage = (dashboardStats.storageUsed / dashboardStats.storageLimit) * 100;

    const assetTypeData = useMemo(
        () => [
            { name: 'Imagens', value: dashboardStats.assetsByType.image, color: 'var(--chart-1)', icon: Image },
            { name: 'Vídeos', value: dashboardStats.assetsByType.video, color: 'var(--chart-2)', icon: Video },
            { name: 'Documentos', value: dashboardStats.assetsByType.document, color: 'var(--chart-3)', icon: FileText },
            { name: 'Arquivos', value: dashboardStats.assetsByType.archive, color: 'var(--chart-4)', icon: Archive }
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

    const formatLaunchDate = (date: string) => {
        const parsed = new Date(`${date}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) {
            return date;
        }
        return format(parsed, 'dd/MM/yyyy');
    };

    const formatDaysUntil = (days: number) => {
        if (days === 0) return 'Hoje';
        if (days === 1) return 'Em 1 dia';
        if (days > 1) return `Em ${days} dias`;
        return `${Math.abs(days)} dias atrás`;
    };

    const launchTypeLabel = (type: 'campaign' | 'project') =>
        type === 'project' ? 'Empreendimento' : 'Campanha';

    const campaignStatusLabelMap: Record<string, string> = {
        active: 'Ativa',
        inactive: 'Inativa',
        expiring: 'Expirando',
        archived: 'Arquivada',
    };

    const projectStatusLabelMap: Record<string, string> = {
        'vem-ai': 'Vem aí',
        'breve-lancamento': 'Breve lançamento',
        lancamento: 'Lançamento',
    };

    const getStatusLabel = (type: 'campaign' | 'project', status?: string) => {
        if (!status) return null;
        if (type === 'campaign') {
            return campaignStatusLabelMap[status] ?? status;
        }
        return projectStatusLabelMap[status] ?? status;
    };

    const indicatorOptions = useMemo<IndicatorOption[]>(
        () => [
            { id: 'totalMaterials', label: 'Total de Materiais', description: 'Quantidade total de assets cadastrados.' },
            { id: 'downloads', label: 'Downloads', description: 'Total de downloads realizados no período.' },
            { id: 'activeUsers', label: 'Usuários Ativos', description: 'Usuários ativos no DAM.' },
            { id: 'activeLinks', label: 'Links Ativos', description: 'Links compartilhados atualmente válidos.' },
            { id: 'assetTypes', label: 'Tipos de Material', description: 'Distribuição dos materiais por categoria.' },
            { id: 'campaignDistribution', label: 'Materiais por Campanha', description: 'Volume de materiais por campanha de marketing.' },
            { id: 'projectDistribution', label: 'Materiais por Empreendimento', description: 'Volume de materiais por empreendimento.' },
            { id: 'recentActivity', label: 'Atividade Recente', description: 'Últimos uploads realizados pela equipe.' },
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
        <motion.div
            className="space-y-8 p-2"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <motion.h1
                        className="text-3xl font-bold tracking-tight text-foreground"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        Painel de Insights
                    </motion.h1>
                    <motion.p
                        className="text-muted-foreground mt-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        Acompanhe o desempenho dos seus materiais em tempo real.
                    </motion.p>
                </div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <Button
                        variant="outline"
                        className="w-full sm:w-auto hover:bg-muted transition-all duration-300"
                        onClick={() => setIsExportDialogOpen(true)}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Exportar relatório
                    </Button>
                </motion.div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div variants={itemVariants}>
                    <Card className="bg-card border-border hover:border-primary/50 hover:shadow-[0_0_30px_-10px_rgba(220,38,38,0.3)] transition-all duration-500 group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Total de Materiais</CardTitle>
                            <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                <FolderOpen className="h-4 w-4 text-primary" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{formatNumber(dashboardStats.totalAssets)}</div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <span className="text-emerald-500 flex items-center"><ArrowUpRight className="h-3 w-3 mr-0.5" /> +12%</span> vs mês passado
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <Card className="bg-card border-border hover:border-orange-500/50 hover:shadow-[0_0_30px_-10px_rgba(249,115,22,0.3)] transition-all duration-500 group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Downloads</CardTitle>
                            <div className="p-2 rounded-full bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                                <Download className="h-4 w-4 text-orange-500" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{formatNumber(dashboardStats.downloadCount)}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Downloads acumulados no mês
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <Card className="bg-card border-border hover:border-blue-500/50 hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)] transition-all duration-500 group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Usuários Ativos</CardTitle>
                            <div className="p-2 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                                <Users className="h-4 w-4 text-blue-500" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{formatNumber(dashboardStats.totalUsers)}</div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <span className="text-emerald-500 flex items-center"><ArrowUpRight className="h-3 w-3 mr-0.5" /> +3</span> novos usuários
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <Card className="bg-card border-border hover:border-purple-500/50 hover:shadow-[0_0_30px_-10px_rgba(168,85,247,0.3)] transition-all duration-500 group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Links Ativos</CardTitle>
                            <div className="p-2 rounded-full bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                                <Share2 className="h-4 w-4 text-purple-500" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{formatNumber(dashboardStats.activeSharedLinks)}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Links úteis cadastrados
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Upcoming Launches */}
                <motion.div variants={itemVariants} className="lg:col-span-1">
                    <Card className="h-full bg-card border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Calendar className="w-5 h-5 text-primary" />
                                Próximos Lançamentos
                            </CardTitle>
                            <CardDescription>Empreendimentos e campanhas</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {dashboardStats.upcomingLaunches.length > 0 ? (
                                <div className="space-y-4">
                                    {dashboardStats.upcomingLaunches.map((launch, index) => {
                                        const statusLabel = getStatusLabel(launch.type, launch.status);
                                        return (
                                            <motion.div
                                                key={`${launch.type}-${launch.id}`}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 * index }}
                                                className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/80 transition-colors border border-border"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate text-foreground">{launch.name}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide bg-muted text-muted-foreground border-0">
                                                            {launchTypeLabel(launch.type)}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-semibold text-primary">{formatLaunchDate(launch.date)}</p>
                                                    <p className="text-xs text-muted-foreground">{formatDaysUntil(launch.daysUntil)}</p>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-40 text-center">
                                    <Sparkles className="w-8 h-8 text-muted-foreground/50 mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        Nenhum lançamento previsto.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Main Charts Area */}
                <motion.div variants={itemVariants} className="lg:col-span-3 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Campaigns Chart */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="text-base">Materiais por Campanha</CardTitle>
                                <CardDescription>Top campanhas ativas</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[350px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={campaignData} layout="vertical" margin={{ left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted/30" horizontal={false} />
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={100}
                                                tick={{ fill: 'currentColor', fontSize: 12, className: 'text-muted-foreground' }}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <Tooltip
                                                cursor={{ fill: 'currentColor', className: 'text-muted/20' }}
                                                contentStyle={{
                                                    backgroundColor: 'var(--card)',
                                                    borderColor: 'var(--border)',
                                                    borderRadius: '8px',
                                                    color: 'var(--foreground)'
                                                }}
                                            />
                                            <Bar dataKey="assets" fill="var(--chart-1)" radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Projects Chart */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="text-base">Materiais por Empreendimento</CardTitle>
                                <CardDescription>Top empreendimentos</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[350px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={projectData} layout="vertical" margin={{ left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-muted/30" horizontal={false} />
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={100}
                                                tick={{ fill: 'currentColor', fontSize: 12, className: 'text-muted-foreground' }}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <Tooltip
                                                cursor={{ fill: 'currentColor', className: 'text-muted/20' }}
                                                contentStyle={{
                                                    backgroundColor: 'var(--card)',
                                                    borderColor: 'var(--border)',
                                                    borderRadius: '8px',
                                                    color: 'var(--foreground)'
                                                }}
                                            />
                                            <Bar dataKey="assets" fill="var(--chart-5)" radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Storage Usage */}
                <motion.div variants={itemVariants}>
                    <Card className="h-full bg-card border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <HardDrive className="w-5 h-5 text-primary" />
                                Armazenamento
                            </CardTitle>
                            <CardDescription>
                                Visão geral do uso de disco
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="relative pt-2">
                                <div className="flex justify-between mb-2 text-sm font-medium">
                                    <span className="text-foreground">{storagePercentage.toFixed(1)}% Usado</span>
                                    <span className="text-muted-foreground">{(dashboardStats.storageLimit - dashboardStats.storageUsed).toFixed(1)}GB Livres</span>
                                </div>
                                <Progress value={storagePercentage} className="h-3 bg-secondary" indicatorClassName="bg-gradient-to-r from-primary to-orange-500" />
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                                    <p className="text-xs text-muted-foreground">Total</p>
                                    <p className="text-lg font-bold text-foreground">{formatFileSize(dashboardStats.storageLimit * 1024 * 1024 * 1024)}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                                    <p className="text-xs text-muted-foreground">Disponível</p>
                                    <p className="text-lg font-bold text-emerald-500">{formatFileSize((dashboardStats.storageLimit - dashboardStats.storageUsed) * 1024 * 1024 * 1024)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Asset Types */}
                <motion.div variants={itemVariants}>
                    <Card className="h-full bg-card border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Archive className="w-5 h-5 text-primary" />
                                Tipos de Material
                            </CardTitle>
                            <CardDescription>Distribuição por formato</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {assetTypeData.map((item, index) => {
                                    const Icon = item.icon;
                                    const percentage = dashboardStats.totalAssets > 0 ? (item.value / dashboardStats.totalAssets) * 100 : 0;

                                    return (
                                        <div key={item.name} className="group flex items-center justify-between p-2 rounded-lg hover:bg-muted/80 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-md bg-muted group-hover:bg-muted-foreground/10 transition-colors">
                                                    <Icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground" style={{ color: item.color }} />
                                                </div>
                                                <span className="text-sm font-medium text-foreground">{item.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-bold text-foreground">{item.value}</span>
                                                <span className="text-xs text-muted-foreground ml-2">({percentage.toFixed(1)}%)</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Recent Activity */}
                <motion.div variants={itemVariants}>
                    <Card className="h-full bg-card border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="w-5 h-5 text-primary" />
                                Atividade Recente
                            </CardTitle>
                            <CardDescription>Últimas ações no sistema</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {dashboardStats.recentActivity.slice(0, 5).map((activity, index) => (
                                    <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0 shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate text-foreground">
                                                <span className="text-primary">{activity.userName}</span> {activity.type === 'upload' ? 'enviou' : activity.type === 'download' ? 'baixou' : 'compartilhou'}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                &quot;{activity.assetName}&quot;
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {activity.categoryName && (
                                                    <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                                                        {activity.categoryName}
                                                    </Badge>
                                                )}
                                                <p className="text-[10px] text-muted-foreground/60">
                                                    {timeAgo(activity.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            <ExportReportDialog
                open={isExportDialogOpen}
                onOpenChange={setIsExportDialogOpen}
                indicators={indicatorOptions}
                defaultSelected={indicatorOptions.map((indicator) => indicator.id)}
                defaultDateRange={defaultDateRange}
                onGenerate={handleGenerateReport}
                isGenerating={isGeneratingReport}
            />
        </motion.div>
    );
}
