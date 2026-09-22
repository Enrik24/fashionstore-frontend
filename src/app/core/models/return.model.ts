import { VarianteResumen } from './cart.model';

/**
 * Modelos de Devoluciones y Cambios (CU28) — espejo de
 * `app/apps/gestion_ventas/schemas.py`.
 */
export type TipoSolicitudDevolucion = 'DEVOLUCION' | 'CAMBIO';
export type MotivoDevolucion = 'TALLA_INCORRECTA' | 'COLOR_INCORRECTO' | 'DEFECTO_FABRICA' | 'OTRO';
export type EstadoSolicitudDevolucion =
  | 'PENDIENTE'
  | 'EN_REVISION'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'COMPLETADA'
  | 'PENDIENTE_REEMBOLSO';

export interface ItemSolicitudDevolucionCreate {
  detalle_orden_id: number;
  cantidad: number;
  variante_cambio_id?: number | null;
}

export interface SolicitudDevolucionCreateDto {
  orden_id: number;
  sucursal_id?: number | null;
  tipo: TipoSolicitudDevolucion;
  motivo: MotivoDevolucion;
  motivo_detalle?: string | null;
  items: ItemSolicitudDevolucionCreate[];
}

export interface RevisionSolicitudDto {
  accion: 'APROBAR' | 'RECHAZAR';
  observaciones?: string | null;
}

export interface DetalleSolicitudDevolucion {
  id: number;
  solicitud_id: number;
  detalle_orden_id: number;
  variante_producto_id?: number | null;
  cantidad: number;
  variante_cambio_id?: number | null;
  precio_unitario: number;
  variante_producto?: VarianteResumen | null;
  variante_cambio?: VarianteResumen | null;
}

export interface SolicitudDevolucion {
  id: number;
  numero_solicitud: string;
  cliente_id?: number | null;
  orden_id: number;
  sucursal_id?: number | null;
  tipo: TipoSolicitudDevolucion;
  motivo: MotivoDevolucion;
  motivo_detalle?: string | null;
  estado: EstadoSolicitudDevolucion;
  monto_reembolso?: number | null;
  observaciones_staff?: string | null;
  revisado_por_id?: number | null;
  fecha_solicitud: string;
  fecha_resolucion?: string | null;
  detalles: DetalleSolicitudDevolucion[];
}

export const TIPOS_SOLICITUD: Array<{ value: TipoSolicitudDevolucion; label: string }> = [
  { value: 'DEVOLUCION', label: 'Devolución (reembolso)' },
  { value: 'CAMBIO', label: 'Cambio por otra talla/color' }
];

export const MOTIVOS_DEVOLUCION: Array<{ value: MotivoDevolucion; label: string }> = [
  { value: 'TALLA_INCORRECTA', label: 'Talla incorrecta' },
  { value: 'COLOR_INCORRECTO', label: 'Color incorrecto' },
  { value: 'DEFECTO_FABRICA', label: 'Defecto de fábrica' },
  { value: 'OTRO', label: 'Otro motivo' }
];
