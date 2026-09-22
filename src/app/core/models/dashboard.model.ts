export type KpiTone = 'default' | 'success' | 'warning' | 'error' | 'info';
export type WidgetStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';
export type RangePreset = 'hoy' | '7d' | '30d' | 'mes' | 'trimestre' | 'anio' | 'custom';

export interface KpiConfig {
  id: string;
  label: string;
  value: number | string;
  formattedValue: string;
  subtext?: string;
  icon: string;
  tone?: KpiTone;
  deltaPct?: number | null;
  trend?: number[];
  target?: number;
  route?: string;
}

export interface DashboardFilters {
  preset: RangePreset;
  fechaInicio: string;
  fechaFin: string;
  sucursalId?: number;
  comparar: boolean;
}

export interface WidgetState<T> {
  status: WidgetStatus;
  data: T | null;
  error?: string;
  updatedAt?: Date;
}

export interface DashboardLayout {
  version: 1;
  order: string[];
  hidden: string[];
}
