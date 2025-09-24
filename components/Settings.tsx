import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Settings as SettingsIcon, Bell, Shield, Database, Palette } from 'lucide-react';
import { useAssets } from '../contexts/AssetContext';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { toast } from 'sonner';
import { DEFAULT_SETTINGS, rowToSettings, saveSystemSettings, SettingsFormState } from '../lib/settings';

export function Settings() {
  const { dashboardStats } = useAssets();
  const { user } = useAuth();
  const {
    isSupabaseEnabled,
    systemSettings,
    systemSettingsId,
    systemSettingsLoading,
    systemSettingsError,
    applySystemSettings,
    refreshSystemSettings,
  } = useConfig();

  const [settings, setSettings] = useState<SettingsFormState>({ ...systemSettings });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSettings({ ...systemSettings });
  }, [systemSettings]);

  const storageUsedGb = useMemo(
    () => Number(dashboardStats?.storageUsed ?? 0),
    [dashboardStats?.storageUsed],
  );

  const storageUsagePercent = useMemo(() => {
    if (!settings.storageLimitGb || settings.storageLimitGb <= 0) {
      return 0;
    }
    return Math.min((storageUsedGb / settings.storageLimitGb) * 100, 100);
  }, [storageUsedGb, settings.storageLimitGb]);

  const handleInputChange =
    (key: keyof SettingsFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;

      setSettings((prev) => ({
        ...prev,
        [key]:
          key === 'storageLimitGb'
            ? Math.max(1, Math.round(Number(value) || DEFAULT_SETTINGS.storageLimitGb))
            : value,
      }));
    };

  const handleToggleChange = (key: keyof SettingsFormState) => (checked: boolean) => {
    setSettings((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  const handleSave = async () => {
    if (!isSupabaseEnabled) {
      toast.error('Supabase não está configurado. Configure as variáveis de ambiente para salvar as configurações.');
      return;
    }

    if (!user) {
      toast.error('Usuário não autenticado.');
      return;
    }

    setSaving(true);
    try {
      const persisted = await saveSystemSettings(settings, {
        id: systemSettingsId ?? undefined,
        userId: user.id,
      });

      const nextState = rowToSettings(persisted);
      applySystemSettings(nextState, persisted.id);
      setSettings(nextState);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('[Settings] Falha ao salvar configurações.', error);
      toast.error('Não foi possível salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  if (!isSupabaseEnabled) {
    return (
      <div className="space-y-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              Configure as credenciais do Supabase para gerenciar as configurações do sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (systemSettingsLoading) {
    return (
      <div className="space-y-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Carregando configurações...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isFormDisabled = saving;
  const loadError = systemSettingsError;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-primary" />
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">
          Ajuste preferências e comportamentos do sistema
        </p>
      </div>

      {loadError && (
        <Card className="bg-destructive/10 border-destructive/40">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button variant="outline" size="sm" onClick={() => { void refreshSystemSettings(); }}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            Configurações Gerais
          </CardTitle>
          <CardDescription>
            Informações básicas do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="company-name" className="mb-2">Nome da Empresa</Label>
              <Input
                id="company-name"
                placeholder="Sua empresa"
                value={settings.companyName}
                onChange={handleInputChange('companyName')}
                disabled={isFormDisabled}
              />
            </div>

            <div>
              <Label htmlFor="admin-email" className="mb-2">Email do Administrador</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@empresa.com"
                value={settings.adminEmail}
                onChange={handleInputChange('adminEmail')}
                disabled={isFormDisabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificações
          </CardTitle>
          <CardDescription>
            Configure alertas e notificações do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificações por Email</Label>
              <p className="text-sm text-muted-foreground">
                Receber notificações sobre novos uploads e atividades
              </p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={handleToggleChange('emailNotifications')}
              disabled={isFormDisabled}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Alertas do Sistema</Label>
              <p className="text-sm text-muted-foreground">
                Avisos sobre atualizações, manutenções e disponibilidade
              </p>
            </div>
            <Switch
              checked={settings.systemNotifications}
              onCheckedChange={handleToggleChange('systemNotifications')}
              disabled={isFormDisabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Segurança
          </CardTitle>
          <CardDescription>
            Configure opções de acesso e proteção
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Autenticação em Duas Etapas</Label>
              <p className="text-sm text-muted-foreground">
                Exigir uma segunda verificação durante o login
              </p>
            </div>
            <Switch
              checked={settings.twoFactor}
              onCheckedChange={handleToggleChange('twoFactor')}
              disabled={isFormDisabled}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Permitir múltiplas sessões</Label>
              <p className="text-sm text-muted-foreground">
                Autorizar o login simultâneo em vários dispositivos
              </p>
            </div>
            <Switch
              checked={settings.multiSessions}
              onCheckedChange={handleToggleChange('multiSessions')}
              disabled={isFormDisabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Armazenamento
          </CardTitle>
          <CardDescription>
            Ajuste limites e política de backup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Espaço utilizado</span>
              <span>{storageUsedGb.toFixed(2)} GB de {settings.storageLimitGb} GB</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${storageUsagePercent}%` }}
              ></div>
            </div>
          </div>

          <div>
            <Label htmlFor="storage-limit" className="mb-2">Limite de armazenamento (GB)</Label>
            <Input
              id="storage-limit"
              type="number"
              min={1}
              value={settings.storageLimitGb}
              onChange={handleInputChange('storageLimitGb')}
              disabled={isFormDisabled}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Backup automático</Label>
              <p className="text-sm text-muted-foreground">
                Realizar cópias de segurança de forma recorrente
              </p>
            </div>
            <Switch
              checked={settings.autoBackup}
              onCheckedChange={handleToggleChange('autoBackup')}
              disabled={isFormDisabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Aparência
          </CardTitle>
          <CardDescription>
            Personalize o visual da interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Modo escuro</Label>
              <p className="text-sm text-muted-foreground">
                Interface com tons escuros (recomendado)
              </p>
            </div>
            <Switch
              checked={settings.darkMode}
              onCheckedChange={handleToggleChange('darkMode')}
              disabled={isFormDisabled}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sidebar compacta</Label>
              <p className="text-sm text-muted-foreground">
                Usar a navegação lateral com espaçamento reduzido
              </p>
            </div>
            <Switch
              checked={settings.compactSidebar}
              onCheckedChange={handleToggleChange('compactSidebar')}
              disabled={isFormDisabled}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          className="bg-primary hover:bg-primary/90"
          type="button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </Button>
      </div>
    </div>
  );
}
