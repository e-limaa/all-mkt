export const REGIONAL_OPTIONS = [
  { value: 'BAHIA', label: 'Bahia' },
  { value: 'CAMPINAS', label: 'Campinas' },
  { value: 'CEARA', label: 'Ceara' },
  { value: 'MINAS GERAIS', label: 'Minas Gerais' },
  { value: 'GOIAS', label: 'Goias' },
  { value: 'PARANA', label: 'Parana' },
  { value: 'PERNAMBUCO', label: 'Pernambuco' },
  { value: 'RIO DE JANEIRO', label: 'Rio de Janeiro' },
  { value: 'RIO GRANDE DO SUL', label: 'Rio Grande do Sul' },
  { value: 'SAO PAULO', label: 'Sao Paulo' },
] as const;

export type RegionalValue = (typeof REGIONAL_OPTIONS)[number]['value'];
