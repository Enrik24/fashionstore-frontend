/**
 * [EXAMEN-2] Contratos del carrito offline y del pago diferido (CU15/CU16).
 * Espejo de `app/apps/pagos_diferidos/schemas.py`.
 */

export type EstadoPagoDiferido =
  | 'PENDIENTE_ENVIO'
  | 'EN_COLA'
  | 'EN_PROCESO'
  | 'REQUIERE_ACCION_CLIENTE'
  | 'CONFIRMADO'
  | 'RECHAZADO'
  | 'EXPIRADO'
  | 'REEMBOLSADO'
  | 'CANCELADO'
  | 'ERROR_CRITICO';

export type OrigenPago = 'ONLINE' | 'OFFLINE_DIFERIDO';

export interface PagoDiferido {
  id: number;
  uuid_pago: string;
  orden_id: number;
  numero_orden?: string | null;
  uuid_orden?: string | null;
  monto: number;
  moneda: string;
  estado: EstadoPagoDiferido;
  stripe_payment_intent_id?: string | null;
  client_secret?: string | null;
  requiere_accion: boolean;
  idempotency_key?: string | null;
  intentos: number;
  fecha_creacion?: string | null;
  fecha_expiracion?: string | null;
  fecha_ultimo_intento?: string | null;
  ultimo_error?: string | null;
  motivo_rechazo?: string | null;
  reembolso_id?: string | null;
  simulado?: boolean;
  duplicado?: boolean;
  origen?: OrigenPago;
}

export interface EventoStripe {
  id: number;
  stripe_event_id: string;
  tipo: string;
  procesado: boolean;
  fecha_recepcion?: string | null;
  fecha_procesamiento?: string | null;
  pago_diferido_id?: number | null;
  error_detalle?: string | null;
}

export interface CrearPagoDiferidoRequest {
  uuid_pago: string;
  uuid_orden?: string;
  orden_id?: number;
  uuid_carrito?: string;
  monto?: number;
  moneda?: string;
  acepta_nuevo_total?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ResultadoPagoDiferido extends PagoDiferido {
  /** Alternativa sin SDK: URL de pago devuelta por el backend. */
  checkout_url?: string | null;
}

export interface ReembolsoRequest {
  monto?: number;
  motivo?: string;
}

export interface ResultadoReembolso {
  reembolsado: boolean;
  reembolso_id?: string | null;
  monto?: number;
  estado?: string | null;
  motivo?: string | null;
}

// ============================================================
// Carrito offline (CU15)
// ============================================================

export interface ItemCarritoOfflineRequest {
  variante_producto_id: number;
  cantidad: number;
  precio_unitario_local?: number;
  stock_local_conocido?: number;
}

export interface CarritoOfflineRequest {
  uuid_carrito: string;
  cliente_id?: number | null;
  sucursal_id?: number | null;
  cupon_codigo?: string | null;
  items?: ItemCarritoOfflineRequest[];
}

export interface CarritoOfflineItemsRequest {
  items: ItemCarritoOfflineRequest[];
}

export interface CarritoOfflineItemResponse {
  id: number;
  variante_producto_id: number;
  sku_variante?: string | null;
  producto?: string | null;
  cantidad: number;
  precio_unitario: number;
  precio_unitario_local?: number | null;
  stock_local_conocido?: number | null;
  stock_central?: number | null;
  subtotal: number;
}

export interface CarritoOfflineResponse {
  carrito_id: number;
  uuid_carrito: string;
  estado: string;
  cliente_id?: number | null;
  sucursal_id?: number | null;
  dispositivo_id?: string | null;
  items: CarritoOfflineItemResponse[];
  subtotal: number;
  descuento: number;
  total: number;
  moneda: string;
  requiere_aceptacion: boolean;
}

export interface DiferenciaPrecioCarrito {
  variante_producto_id: number;
  precio_local?: number;
  precio_servidor?: number;
  diferencia?: number;
  motivo?: string;
}

export interface CarritoValidacionResponse {
  carrito_id: number;
  uuid_carrito: string;
  subtotal_local: number;
  total_local: number;
  subtotal_servidor: number;
  total_servidor: number;
  diferencia: number;
  requiere_aceptacion: boolean;
  diferencias: DiferenciaPrecioCarrito[];
  stock_suficiente: boolean;
  faltantes: Array<{
    variante_producto_id?: number;
    solicitado?: number;
    disponible?: number;
  }>;
  cupon: Record<string, unknown>;
}

export interface ConvertirCarritoRequest {
  acepta_nuevo_total?: boolean;
  direccion_envio?: string;
  cliente_id?: number;
  sucursal_id?: number;
}

export interface OrdenDiferidaResponse {
  orden_id: number;
  numero_orden: string;
  uuid_orden: string;
  estado: string;
  subtotal: number;
  descuento: number;
  total: number;
  moneda: string;
  expira_en?: string | null;
  fecha_limite_pago?: string | null;
  items: number;
  stock_reservado: boolean;
}
