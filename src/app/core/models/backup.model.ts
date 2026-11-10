/**
 * [EXAMEN-2] Modelos de respaldos y restauración (CU20).
 */
export type TipoBackup = 'AUTOMATICO' | 'MANUAL';
export type EstadoBackup = 'EN_PROCESO' | 'COMPLETADO' | 'FALLIDO' | 'EXPIRADO';
export type EstadoRestauracion = 'SOLICITADA' | 'EN_PROCESO' | 'COMPLETADA' | 'FALLIDA';

export interface Backup {
  id: number;
  tenant_id?: number | null;
  tenant?: { razon_social?: string } | null;
  tipo: TipoBackup;
  estado: EstadoBackup;
  fecha_inicio: string;
  fecha_fin?: string | null;
  tamano_bytes?: number | null;
  hash_sha256?: string | null;
  nombre_archivo?: string;
  retencion_hasta?: string | null;
  creado_por?: string | null;
  error_detalle?: string | null;
}
export interface Restauracion { id: number; backup_id: number; estado: EstadoRestauracion; motivo: string; fecha_solicitud: string; fecha_fin?: string | null; }
export interface UsoRespaldos {
  backups_mes_actual?: number;
  max_backups_manuales?: number | null;
  restantes_mes_actual?: number | null;
  restantes?: number | null;
  ilimitado?: boolean;
}
