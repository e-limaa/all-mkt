
import { useAuth } from '@/contexts/AuthContext';
import React, { useState, useEffect, useCallback } from 'react';
import { ActivityLogFilters } from './ActivityFilters';
import { ActivityLogList } from './ActivityList';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { REGIONAL_OPTIONS } from '@/lib/regionals';

import { endOfDay } from 'date-fns';

import { PageHeader } from '../PageHeader';
import { Activity } from 'lucide-react';

export function ActivityDashboard() {
    const { session } = useAuth();
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedActions, setSelectedActions] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

    // New filters
    const [selectedRegional, setSelectedRegional] = useState<string | undefined>();
    const [selectedUser, setSelectedUser] = useState<string | undefined>();
    const [userOptions, setUserOptions] = useState<{ value: string; label: string }[]>([]);

    const fetchUsers = useCallback(async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, name')
                .order('name');

            if (error) throw error;

            setUserOptions(data.map(u => ({ value: u.id, label: u.name || 'Sem nome' })));
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const fetchLogs = useCallback(async () => {
        if (!session?.access_token) return;

        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', pagination.page.toString());
            params.append('limit', pagination.limit.toString());

            if (dateRange?.from) {
                params.append('startDate', dateRange.from.toISOString());
                // Se tiver 'to', usa esse. Se não, usa o final do 'from' para pegar apenas aquele dia.
                const effectiveEndDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
                params.append('endDate', effectiveEndDate.toISOString());
            }

            if (selectedActions.length > 0) params.append('action', selectedActions.join(','));

            if (selectedRegional) params.append('regional', selectedRegional);
            if (selectedUser) params.append('userId', selectedUser);

            const response = await fetch(`/api/admin/activity-logs?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) throw new Error('Sessão expirada');
                if (response.status === 403) throw new Error('Acesso negado');
                throw new Error('Falha ao carregar logs');
            }

            const data = await response.json();
            setLogs(data.data || []);
            setPagination(prev => ({ ...prev, ...data.meta }));

        } catch (error: any) {
            console.error(error);
            toast.error('Erro', {
                description: error.message || 'Não foi possível carregar o histórico de atividades.',
            });
        } finally {
            setIsLoading(false);
        }
    }, [pagination.page, pagination.limit, dateRange, selectedActions, selectedRegional, selectedUser, session?.access_token]);

    useEffect(() => {
        if (session?.access_token) {
            fetchLogs();
        }
    }, [fetchLogs, session?.access_token]);

    const handleDateChange = (range: { from?: Date; to?: Date } | undefined) => {
        // Automatically set 'to' to 'from' if only 'from' is selected, 
        // to ensure visual consistency (fully rounded) and correct single-day filtering
        let effectiveRange = range;
        if (range?.from && !range?.to) {
            effectiveRange = { from: range.from, to: range.from };
        }
        setDateRange(effectiveRange);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleActionChange = (actions: string[]) => {
        setSelectedActions(actions);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    return (
        <div className="space-y-6">
            <PageHeader
                icon={Activity}
                title="Histórico de Atividades"
                description="Monitore as ações realizadas no sistema"
                className="w-full"
            />
            <Card className="w-full">
                <CardContent className="pt-6">
                    <ActivityLogFilters
                        startDate={dateRange?.from}
                        endDate={dateRange?.to}
                        selectedActions={selectedActions}
                        regional={selectedRegional}
                        userId={selectedUser}
                        onDateChange={handleDateChange}
                        onActionChange={handleActionChange}
                        onRegionalChange={(r) => {
                            setSelectedRegional(r);
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                        onUserChange={(u) => {
                            setSelectedUser(u);
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                        regionalOptions={REGIONAL_OPTIONS.filter(r => r.value !== 'TODAS')}
                        userOptions={userOptions}
                        isLoading={isLoading}
                    />
                    <ActivityLogList logs={logs} isLoading={isLoading} />

                    {/* Simple Pagination */}
                    <div className="flex justify-center mt-4 gap-2">
                        <button
                            disabled={pagination.page <= 1 || isLoading}
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <span className="py-1">Página {pagination.page} de {Math.max(1, pagination.totalPages)}</span>
                        <button
                            disabled={pagination.page >= pagination.totalPages || isLoading}
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            Próxima
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
