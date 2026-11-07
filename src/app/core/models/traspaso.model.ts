/**
 * [EXAMEN-2] Modelos de traspasos entre sucursales (CU14).
 */
export type EstadoTraspaso = 'EN_TRANSITO' | 'RECIBIDO' | 'RECHAZADO_PARCIAL' | 'CANCELADO' | 'PENDIENTE';
export type AccionRecepcionTraspaso = 'RECIBIR' | 'RECHAZAR';

export interface DetalleTraspaso {
  id?: number;
  traspaso_id?: number;
  variante_producto_id: number;
  cantidad: number;
  cantidad_recibida?: number | null;
  cantidad_merma?: number | null;
  sku_variante?: string;
  producto_nombre?: string;
  talla?: string | null;
  color?: string | null;
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
  observaciones?: string | null;
  detalles: DetalleTraspaso[];
  tenant_id?: number | null;
}

export interface TraspasoCreateDto { sucursal_origen_id: number; sucursal_destino_id: number; observaciones?: string; detalles: Array<{ variante_producto_id: number; cantidad: number }>; }
export interface RecepcionTraspasoRequest { accion?: AccionRecepcionTraspaso; lineas: Array<{ detalle_id?: number; variante_producto_id?: number; cantidad_recibida: number; cantidad_merma: number }>; }
export interface RechazoTraspasoRequest { lineas: Array<{ detalle_id?: number; variante_producto_id?: number; cantidad_recibida?: number; motivo?: string }>; motivo?: string; }
export interface SugerenciaTraspaso { variante_producto_id: number; producto_nombre?: string; sucursal_origen_id?: number; sucursal_destino_id?: number; stock_origen?: number; demanda?: number; sugerencia?: string; }
