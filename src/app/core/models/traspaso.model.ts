/**
 * [EXAMEN-2] Modelos de traspasos entre sucursales (CU14).
 */
export type EstadoTraspaso = 'EN_TRANSITO' | 'RECIBIDO' | 'RECHAZADO_PARCIAL' | 'CANCELADO' | 'PENDIENTE';
export type AccionRecepcionTraspaso = 'RECIBIR' | 'RECHAZAR';

export interface DetalleTraspaso {
  id?: number;
  traspaso_id?: number;
  variante_producto_id: number;
  producto_id?: number | null;
  producto?: string | null;
  producto_nombre?: string | null;
  cantidad: number;
  cantidad_recibida?: number | null;
  cantidad_merma?: number | null;
  cantidad_pendiente?: number | null;
  sku_variante?: string;
  talla?: string | null;
  color?: string | null;
  observaciones?: string | null;
}

export interface Traspaso {
  id?: number;
  numero: string;
  sucursal_origen_id: number;
  sucursal_destino_id: number;
  sucursal_origen?: string | { nombre?: string } | null;
  sucursal_destino?: string | { nombre?: string } | null;
  estado: EstadoTraspaso;
  fecha_envio?: string;
  fecha_recepcion?: string | null;
  usuario_id?: number;
  usuario_recibe_id?: number | null;
  motivo?: string | null;
  observaciones?: string | null;
  cantidad_pendiente?: number;
  detalles: DetalleTraspaso[];
  tenant_id?: number | null;
}

export interface TraspasoCreateDto { sucursal_origen_id: number; sucursal_destino_id: number; observaciones?: string; detalles: Array<{ variante_producto_id: number; cantidad: number }>; }
/** Contrato vigente de recepción: cada línea se identifica por detalle_id. */
export interface RecepcionTraspasoRequest {
  detalles: Array<{
    detalle_id: number;
    cantidad_recibida: number;
    cantidad_merma: number;
    observaciones?: string;
  }>;
  observaciones?: string;
}
/** Contrato vigente de rechazo: se rechazan líneas concretas y el stock vuelve al origen. */
export interface RechazoTraspasoRequest {
  motivo: string;
  devolver_origen?: boolean;
  detalles?: Array<{ detalle_id: number }>;
}
export interface SugerenciaTraspaso {
  variante_producto_id: number;
  producto_id?: number | null;
  producto_nombre?: string | null;
  sucursal_origen_id?: number;
  sucursal_destino_id?: number;
  cantidad_sugerida?: number;
  disponible_origen?: number;
  demanda_destino?: number;
  stock_origen?: number;
  demanda?: number;
  sugerencia?: string;
}

export interface MovimientoHistorialTraspaso {
  traspaso_id: number;
  numero: string;
  estado: EstadoTraspaso;
  fecha_envio?: string | null;
  sucursal_origen_id: number;
  sucursal_destino_id: number;
  variante_producto_id: number;
  cantidad: number;
  cantidad_recibida?: number | null;
  cantidad_merma?: number | null;
}

export interface HistorialProductoTraspaso {
  producto_id: number;
  producto: string;
  total_movimientos: number;
  movimientos: MovimientoHistorialTraspaso[];
}
