import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Activity } from 'lucide-react';

interface ActivityLog {
    id: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    metadata?: any;
    created_at: string;
    user?: {
        name: string;
        avatar_url: string;
        email: string;
    };
}

interface ActivityListProps {
    logs: ActivityLog[];
    isLoading: boolean;
}

export const ActivityLogList: React.FC<ActivityListProps> = ({ logs, isLoading }) => {
    if (isLoading) {
        return <div className="p-4 text-center">Carregando atividades...</div>;
    }

    if (logs.length === 0) {
        return <div className="p-4 text-center text-muted-foreground">Nenhuma atividade encontrada.</div>;
    }

    return (
        <div className="space-y-4">
            {logs.map((log) => (
                <div key={log.id} className="flex items-start space-x-4 p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={log.user?.avatar_url} alt={log.user?.name} />
                        <AvatarFallback>{log.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium leading-none">
                                {log.user?.name || log.user?.email || 'Usuário Desconhecido'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {format(new Date(log.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                            </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">{formatAction(log.action)}</span>
                            {' '}
                            {log.entity_type && (
                                <span>
                                    em <span className="italic">{formatEntityType(log.entity_type)}</span>
                                </span>
                            )}
                        </p>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div className="mt-2 text-sm">
                                <MetadataDisplay metadata={log.metadata} />
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

function formatAction(action: string): string {
    const map: Record<string, string> = {
        login: 'Fez login',
        logout: 'Fez logout',
        upload_asset: 'Enviou um arquivo',
        delete_asset: 'Excluiu um arquivo',
        update_asset: 'Atualizou um arquivo',
        download_asset: 'Baixou um arquivo',
        create_project: 'Criou um projeto',
        update_project: 'Atualizou um projeto',
        delete_project: 'Excluiu um projeto',
        create_campaign: 'Criou uma campanha',
        update_campaign: 'Atualizou uma campanha',
        delete_campaign: 'Excluiu uma campanha',
        create_user: 'Criou um usuário',
        update_user: 'Atualizou um usuário',
        delete_user: 'Excluiu um usuário',
        create_shared_link: 'Criou um link de compartilhamento',
        delete_shared_link: 'Removeu um link de compartilhamento',
    };
    return map[action] || action;
}

function formatEntityType(type: string): string {
    const map: Record<string, string> = {
        asset: 'Arquivo',
        project: 'Projeto',
        campaign: 'Campanha',
        user: 'Usuário',
        shared_link: 'Link',
        system: 'Sistema'
    };
    return map[type] || type;
}

const MetadataDisplay: React.FC<{ metadata: any }> = ({ metadata }) => {
    if (!metadata || typeof metadata !== 'object') return null;

    const labelMap: Record<string, string> = {
        updates: 'Alterações',
        status: 'Status',
        start_date: 'Data de Início',
        end_date: 'Data de Término',
        description: 'Descrição',
        created_by: 'Criado por',
        color: 'Cor',
        fileName: 'Arquivo',
        fileSize: 'Tamanho',
        fileType: 'Tipo',
        regional: 'Regional',
        categoryName: 'Origem',
        categoryType: 'Tipo de Origem',
        email: 'Email',
        name: 'Nome',
        role: 'Função',
        targetId: 'ID do Alvo',
        reason: 'Motivo',
        downloadedBy: 'Baixado por',
        ip: 'IP',
        userAgent: 'Navegador'
    };

    const formatValue = (key: string, value: any): React.ReactNode => {
        if (value === null || value === undefined) return '-';

        if (key === 'fileSize' && typeof value === 'number') {
            return formatBytes(value);
        }

        if (key === 'regional' && typeof value === 'string') {
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{value}</span>;
        }

        if (key === 'categoryType') {
            const types: Record<string, string> = { campaign: 'Campanha', project: 'Empreendimento' };
            return types[value] || value;
        }

        if (key === 'role') {
            const roles: Record<string, string> = {
                admin: 'Administrador',
                editor_marketing: 'Editor Marketing',
                editor_trade: 'Editor Trade',
                viewer: 'Visualizador'
            };
            return roles[value] || value;
        }

        if (key === 'color' && typeof value === 'string') {
            return (
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full border shadow-sm" style={{ backgroundColor: value }} />
                    <span>{value}</span>
                </div>
            );
        }

        if (key === 'start_date' || key === 'end_date') {
            try {
                if (!value) return '-';
                return format(new Date(value), "dd/MM/yyyy", { locale: ptBR });
            } catch (e) {
                return String(value);
            }
        }

        if (typeof value === 'boolean') return value ? 'Sim' : 'Não';

        if (value && typeof value === 'object') {
            const filteredEntries = Object.entries(value).filter(([subKey]) => {
                const ignoredKeys = ['created_by', 'updated_by', 'id', 'created_at', 'updated_at'];
                if (ignoredKeys.includes(subKey)) return false;
                if (subKey.endsWith('_id')) return false;
                return true;
            });

            if (filteredEntries.length === 0) return <span className="text-muted-foreground italic text-xs">Sem alterações visíveis</span>;

            return (
                <div className="flex flex-col gap-1 mt-1 pl-2 border-l-2 border-muted">
                    {filteredEntries.map(([subKey, subValue]) => (
                        <div key={subKey} className="text-xs">
                            <span className="font-medium text-muted-foreground mr-1">
                                {labelMap[subKey] || subKey}:
                            </span>
                            <span className="break-all">{formatValue(subKey, subValue)}</span>
                        </div>
                    ))}
                </div>
            );
        }

        return String(value);
    };

    // Filter out internal or uninteresting keys if necessary
    const keys = Object.keys(metadata).filter(k => k !== 'embedding_id');

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 bg-muted/50 p-3 rounded-md border border-border/50">
            {keys.map(key => (
                <div key={key} className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                    <span className="text-xs font-medium text-muted-foreground min-w-[100px]">
                        {labelMap[key] || key}:
                    </span>
                    <span className="text-sm text-foreground break-all">
                        {formatValue(key, metadata[key])}
                    </span>
                </div>
            ))}
        </div>
    );
};

function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
