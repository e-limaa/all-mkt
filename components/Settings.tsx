import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Settings as SettingsIcon, Palette } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { PageHeader } from './PageHeader';
import { toast } from 'sonner';
import { DEFAULT_SETTINGS, rowToSettings, saveSystemSettings, SettingsFormState } from '../lib/settings';

export function Settings() {
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

  if (!isSupabaseEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={SettingsIcon}
          title="Configurações"
          description="Gerencie as preferências globais do sistema"
        />
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <p>Configure as credenciais do Supabase para gerenciar as configurações do sistema.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper for toggle changes
  const handleToggleChange = (key: keyof SettingsFormState) => (checked: boolean) => {
    setSettings((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  // Helper for input changes
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
      <PageHeader
        icon={SettingsIcon}
        title="Configurações"
        description="Gerencie as preferências globais do sistema"
        action={
          <Button onClick={handleSave} disabled={saving || systemSettingsLoading}>
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        }
      />

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
