import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { DEFAULT_SETTINGS, fetchSystemSettings, rowToSettings, SettingsFormState } from '../lib/settings';
import { isSupabaseConfigured } from '../lib/supabase';

interface ConfigContextType {
  isSupabaseEnabled: boolean;
  isDevelopmentMode: boolean;
  systemSettings: SettingsFormState;
  systemSettingsId: string | null;
  systemSettingsLoading: boolean;
  systemSettingsError: string | null;
  refreshSystemSettings: () => Promise<void>;
  applySystemSettings: (settings: SettingsFormState, id?: string | null) => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

const getSupabaseUrl = () => {
  if (typeof window !== 'undefined') {
    return (window as any).ENV?.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  }

  return process.env.NEXT_PUBLIC_SUPABASE_URL;
};

export function ConfigProvider({ children }: { children: ReactNode }) {
  const isDevelopmentMode = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const supabaseUrl = getSupabaseUrl();
  const [systemSettings, setSystemSettings] = useState<SettingsFormState>({ ...DEFAULT_SETTINGS });
  const [systemSettingsId, setSystemSettingsId] = useState<string | null>(null);
  const [systemSettingsLoading, setSystemSettingsLoading] = useState<boolean>(true);
  const [systemSettingsError, setSystemSettingsError] = useState<string | null>(null);

  const isSupabaseEnabled = Boolean(supabaseUrl && supabaseUrl.startsWith('https://') && isSupabaseConfigured());

  const refreshSystemSettings = useCallback(async () => {
    if (!isSupabaseEnabled) {
      setSystemSettings({ ...DEFAULT_SETTINGS });
      setSystemSettingsId(null);
      setSystemSettingsError(null);
      setSystemSettingsLoading(false);
      return;
    }

    setSystemSettingsLoading(true);
    try {
      const row = await fetchSystemSettings();

      if (row) {
        setSystemSettings(rowToSettings(row));
        setSystemSettingsId(row.id);
      } else {
        setSystemSettings({ ...DEFAULT_SETTINGS });
        setSystemSettingsId(null);
      }

      setSystemSettingsError(null);
    } catch (error: any) {
      console.error('[Config] Falha ao carregar configurações do sistema.', error);
      const code = error?.code as string | undefined;
      if (code === '42P01') {
        setSystemSettingsError('A tabela system_settings não existe no Supabase. Execute as migrações antes de prosseguir.');
      } else if (code === '42501') {
        setSystemSettingsError('Permissão negada ao acessar as configurações do sistema. Verifique as políticas RLS.');
      } else {
        setSystemSettingsError('Não foi possível carregar as configurações do sistema.');
      }
    } finally {
      setSystemSettingsLoading(false);
    }
  }, [isSupabaseEnabled]);

  useEffect(() => {
    void refreshSystemSettings();
  }, [refreshSystemSettings]);

  const applySystemSettings = useCallback((settings: SettingsFormState, id?: string | null) => {
    setSystemSettings(settings);
    setSystemSettingsId(id ?? null);
    setSystemSettingsError(null);
  }, []);

  const value = useMemo<ConfigContextType>(() => ({
    isSupabaseEnabled,
    isDevelopmentMode,
    systemSettings,
    systemSettingsId,
    systemSettingsLoading,
    systemSettingsError,
    refreshSystemSettings,
    applySystemSettings,
  }), [
    isSupabaseEnabled,
    isDevelopmentMode,
    systemSettings,
    systemSettingsId,
    systemSettingsLoading,
    systemSettingsError,
    refreshSystemSettings,
    applySystemSettings,
  ]);

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig deve ser usado dentro de um ConfigProvider');
  }
  return context;
}
