/**
 * [EXAMEN-2] Modelos de compensación de ventas offline rechazadas (CU19).
 */
export type TipoCompensacion = 'REEMBOLSO_EFECTIVO' | 'REEMBOLSO_TARJETA' | 'NOTA_CREDITO' | 'SALDO_FAVOR';
export type EstadoCompensacion = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA' | 'FALLIDA' | 'NO_APLICA';

export interface Compensacion {
  id: number;
  tenant_id?: number | null;
  operacion_offline_id?: number | null;
  uuid_operacion?: string;
  orden_id?: number | null;
  orden?: { numero_orden?: string } | null;
  cliente?: string | { nombre?: string } | null;
  tipo: TipoCompensacion;
  monto: number;
  moneda?: string;
  estado: EstadoCompensacion;
  motivo?: string;
  referencia_externa?: string | null;
  notificado_cliente?: boolean;
  error_detalle?: string | null;
  fecha_creacion: string;
  fecha_resolucion?: string | null;
  resuelto_por?: string | null;
}
export interface ResumenCompensaciones { pendientes?: number; en_proceso?: number; completadas?: number; fallidas?: number; monto_pendiente?: number; monto_completado?: number; total_pendiente?: number; total_completado?: number; por_tipo?: Record<string, number>; }
