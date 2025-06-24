import React, { createContext, useContext, ReactNode } from 'react';

interface ConfigContextType {
  isSupabaseEnabled: boolean;
  isDevelopmentMode: boolean;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
  // Verificar se estamos em desenvolvimento e se o Supabase está configurado
  const isDevelopmentMode = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  
  // Verificar se as variáveis do Supabase estão configuradas
  const supabaseUrl = typeof window !== 'undefined' 
    ? (window as any).ENV?.NEXT_PUBLIC_SUPABASE_URL 
    : undefined;
    
  const isSupabaseEnabled = Boolean(supabaseUrl && supabaseUrl.startsWith('https://'));

  const value = {
    isSupabaseEnabled,
    isDevelopmentMode,
  };

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