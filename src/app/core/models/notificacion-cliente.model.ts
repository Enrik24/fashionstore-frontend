/**
 * [EXAMEN-2] Modelos de notificaciones al cliente (RN-024, CU18/CU19).
 */
export type TipoNotificacionCliente = 'COMPENSACION' | 'DEVOLUCION' | 'REPOSICION' | 'SIN_ALTERNATIVA';
export type CanalNotificacion = 'PUSH' | 'CORREO' | 'SMS';
export type EstadoNotificacion = 'PENDIENTE' | 'ENVIADA' | 'FALLIDA' | 'LEIDA';
export interface NotificacionCliente { id: number; tipo: TipoNotificacionCliente; canal?: CanalNotificacion | string; asunto: string; mensaje: string; estado: EstadoNotificacion; fecha_creacion: string; fecha_envio?: string | null; leida?: boolean; referencia_tipo?: string | null; referencia_id?: number | null; }
