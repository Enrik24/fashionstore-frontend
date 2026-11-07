import { VarianteResumen } from './cart.model';

/**
 * Modelos de Devoluciones y Cambios (CU28) — espejo de
 * `app/apps/gestion_ventas/schemas.py`.
 */
export type TipoSolicitudDevolucion = 'DEVOLUCION' | 'CAMBIO' | 'REPOSICION';
export type MotivoDevolucion = 'TALLA_INCORRECTA' | 'COLOR_INCORRECTO' | 'DEFECTO_FABRICA' | 'OTRO';
export type EstadoSolicitudDevolucion =
  | 'PENDIENTE'
  | 'EN_REVISION'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'COMPLETADA'
  | 'PENDIENTE_REEMBOLSO'
  // [EXAMEN-2]
  | 'SIN_ALTERNATIVA';


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
  // [EXAMEN-2] Devoluciones offline, diferencias y notas (CU13/CU18).
  uuid_offline?: string;
  es_offline?: boolean;
  estado_sincronizacion?: string;
  fecha_limite_cambio?: string | null;
  diferencia_precio?: number | null;
  tipo_diferencia?: 'A_FAVOR_CLIENTE' | 'A_FAVOR_TIENDA' | 'SIN_DIFERENCIA' | null;
  monto_pagado_diferencia?: number | null;
  saldo_favor?: number | null;
  nota_devolucion_url?: string | null;
  numero_reposicion?: string | null;
  nota_reposicion_url?: string | null;
  estado_item?: string | null;
  tenant_id?: number | null;
}

export const TIPOS_SOLICITUD: Array<{ value: TipoSolicitudDevolucion; label: string }> = [
  { value: 'DEVOLUCION', label: 'Devolución (reembolso)' },
  { value: 'CAMBIO', label: 'Cambio por otra talla/color' }
];

// [EXAMEN-2] CU13/CU18: DTO de cambio/reposición y cálculo de diferencia.
export interface ItemCambioRequest { detalle_orden_id?: number; variante_producto_id?: number; cantidad: number; variante_cambio_id?: number | null; precio_unitario?: number; precio_variante_nueva?: number; }
export interface CambioRequest { orden_id: number; sucursal_id?: number | null; tipo: TipoSolicitudDevolucion; motivo: MotivoDevolucion; motivo_detalle?: string | null; items: ItemCambioRequest[]; es_offline?: boolean; uuid_offline?: string; sucursal_origen_id?: number | null; }
export type TipoDiferenciaRepopresicion = 'COBRO' | 'SALDO_FAVOR' | 'SIN_DIFERENCIA' | 'A_FAVOR_CLIENTE' | 'A_FAVOR_TIENDA';
export interface ResultadoDiferencia { diferencia_precio: number; tipo_diferencia: string; monto_pagado_diferencia?: number; saldo_favor?: number; }
export interface AlternativaTalla { variante_producto_id: number; talla?: string; color?: string; stock?: number; sucursal_id?: number | null; sucursal?: string; }

export const MOTIVOS_DEVOLUCION: Array<{ value: MotivoDevolucion; label: string }> = [
  { value: 'TALLA_INCORRECTA', label: 'Talla incorrecta' },
  { value: 'COLOR_INCORRECTO', label: 'Color incorrecto' },
  { value: 'DEFECTO_FABRICA', label: 'Defecto de fábrica' },
  { value: 'OTRO', label: 'Otro motivo' }
];
