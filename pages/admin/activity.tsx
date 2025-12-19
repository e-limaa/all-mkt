
import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AppLayout } from '@/components/AppLayout';
import { ActivityDashboard } from '@/components/admin/ActivityDashboard';
import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import { ConfigProvider } from '@/contexts/ConfigContext';
import { Toaster } from '@/components/ui/sonner';

function AdminActivityContent() {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (!['admin', 'editor_marketing'].includes(user.role as string)) {
                router.push('/');
            }
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!user || !['admin', 'editor_marketing'].includes(user.role as string)) {
        return null;
    }

    return (
        <AppLayout
            currentPage="activity"
            onPageChange={(page) => {
                const routes: Record<string, string> = {
                    dashboard: '/dashboard',
                    users: '/users',
                    materials: '/materials',
                    campaigns: '/campaigns',
                    projects: '/projects',
                    shared: '/shared',
                    activity: '/admin/activity',
                    settings: '/settings',
                };
                if (routes[page]) router.push(routes[page]);
            }}
        >
            <Head>
                <title>Atividades Recentes - Admin</title>
            </Head>
            <div className="container mx-auto">
                <ActivityDashboard />
            </div>
            <Toaster />
        </AppLayout>
    );
}

export default function AdminActivityPage() {
    return (
        <ConfigProvider>
            <AuthProvider>
                <AdminActivityContent />
            </AuthProvider>
        </ConfigProvider>
    );
}
