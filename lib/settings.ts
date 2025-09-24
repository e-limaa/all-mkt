import { supabase } from './supabase';
import { Database } from '../types/supabase';

export type SystemSettingsRow = Database['public']['Tables']['system_settings']['Row'];

export interface SettingsFormState {
  companyName: string;
  adminEmail: string;
  emailNotifications: boolean;
  systemNotifications: boolean;
  twoFactor: boolean;
  multiSessions: boolean;
  autoBackup: boolean;
  darkMode: boolean;
  compactSidebar: boolean;
  storageLimitGb: number;
}

export const DEFAULT_SETTINGS: SettingsFormState = {
  companyName: '',
  adminEmail: '',
  emailNotifications: true,
  systemNotifications: true,
  twoFactor: false,
  multiSessions: true,
  autoBackup: true,
  darkMode: true,
  compactSidebar: false,
  storageLimitGb: 100,
};

const mapRowToFormState = (row: SystemSettingsRow): SettingsFormState => ({
  companyName: row.company_name ?? '',
  adminEmail: row.admin_email ?? '',
  emailNotifications: row.email_notifications,
  systemNotifications: row.system_notifications,
  twoFactor: row.two_factor,
  multiSessions: row.multi_sessions,
  autoBackup: row.auto_backup,
  darkMode: row.dark_mode,
  compactSidebar: row.compact_sidebar,
  storageLimitGb: row.storage_limit_gb ?? DEFAULT_SETTINGS.storageLimitGb,
});

export const rowToSettings = (row: SystemSettingsRow | null): SettingsFormState => {
  if (!row) {
    return { ...DEFAULT_SETTINGS };
  }

  return mapRowToFormState(row);
};

export const fetchSystemSettings = async (): Promise<SystemSettingsRow | null> => {
  if (!supabase) {
    throw new Error('Supabase não configurado. Verifique as variáveis de ambiente.');
  }

  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

interface SaveSystemSettingsParams {
  id?: string;
  userId?: string;
}

export const saveSystemSettings = async (
  settings: SettingsFormState,
  params: SaveSystemSettingsParams = {}
): Promise<SystemSettingsRow> => {
  if (!supabase) {
    throw new Error('Supabase não configurado. Verifique as variáveis de ambiente.');
  }

  const now = new Date().toISOString();
  const normalizedSettings = {
    company_name: settings.companyName.trim() || null,
    admin_email: settings.adminEmail.trim() || null,
    email_notifications: settings.emailNotifications,
    system_notifications: settings.systemNotifications,
    two_factor: settings.twoFactor,
    multi_sessions: settings.multiSessions,
    auto_backup: settings.autoBackup,
    dark_mode: settings.darkMode,
    compact_sidebar: settings.compactSidebar,
    storage_limit_gb: Math.max(1, Math.round(settings.storageLimitGb)),
    updated_at: now,
    updated_by: params.userId ?? null,
  } satisfies Omit<SystemSettingsRow, 'id' | 'created_at'>;

  if (params.id) {
    const { data, error } = await supabase
      .from('system_settings')
      .update(normalizedSettings)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const insertPayload = {
    ...normalizedSettings,
    created_at: now,
  } satisfies Omit<SystemSettingsRow, 'id'>;

  const { data, error } = await supabase
    .from('system_settings')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};
