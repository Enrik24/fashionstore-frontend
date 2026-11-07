/**
 * [EXAMEN-2] Modelos de operación offline y dispositivos (CU08, CU17 y Fase 2).
 * Espejo de `app/apps/operaciones_offline/schemas.py`.
 */

export type PlataformaDispositivo = 'WEB' | 'ANDROID' | 'IOS' | 'POS';
export type CalidadConexion = 'ESTABLE' | 'LENTA' | 'SIN_CONEXION';
export type EstadoSincronizacion =
  | 'PENDIENTE'
  | 'SINCRONIZANDO'
  | 'CONFIRMADA'
  | 'DUPLICADA'
  | 'RECHAZADA'
  | 'CONFLICTO'
  | 'ERROR_CRITICO';

export type TipoOperacionOffline =
  | 'RESERVA'
  | 'VENTA_CONTADO'
  | 'CARRITO'
  // [EXAMEN-2] CU13/CU18: devolución y reposición + alias legacy.
  | 'DEVOLUCION'
  | 'DEVOLUCION_CAMBIO'
  | 'REPOSICION'
  | 'ORDEN_PAGO_DIFERIDO'
  | 'PAGO_DIFERIDO'
  | 'ACTUALIZACION_CLIENTE';

export interface DispositivoSincronizacion {
  id: string;
  tenant_id: number;
  usuario_id: number;
  plataforma: PlataformaDispositivo;
  nombre?: string | null;
  activo: boolean;
  ultima_conexion?: string | null;
  fecha_registro?: string | null;
}

export interface DispositivoRegistroRequest {
  id?: string;
  plataforma: PlataformaDispositivo;
  nombre?: string;
}

export interface RevocacionRequest {
  motivo?: string;
}

export interface ConfiguracionOffline {
  id: number;
  tenant_id: number;
  descarga_automatica: boolean;
  hora_descarga?: string | null;
  incluir_clientes: boolean;
  max_clientes: number;
  habilitar_carrito_offline: boolean;
  max_horas_sesion_offline: number;
  max_dias_orden_pendiente: number;
  updated_at?: string | null;
}

export interface PreferenciasOfflineUpdateDto {
  descarga_automatica?: boolean;
  hora_descarga?: string | null;
  incluir_clientes?: boolean;
  max_clientes?: number;
  habilitar_carrito_offline?: boolean;
  max_horas_sesion_offline?: number;
  max_dias_orden_pendiente?: number;
}

export interface PinConfigurarRequest {
  contrasena_actual: string;
  pin: string;
}

export interface PinConfigurarResponse {
  configurado: boolean;
  mensaje: string;
}

export interface SesionOfflineRequest {
  dispositivo_id: string;
  pin: string;
  tenant_id?: number | null;
  usuario_id?: number | null;
  plataforma?: PlataformaDispositivo;
}

export interface SesionOffline {
  token_offline: string;
  token_type: string;
  expira_en: string;
  usuario_id: number;
  tenant_id: number;
  dispositivo_id: string;
  roles: string[];
  permisos: string[];
  configuracion: ConfiguracionOffline;
  ultima_descarga?: string | null;
}

export interface RenovarSesionRequest {
  token_offline: string;
}

export interface CierreSesionOfflineResponse {
  cerrada: boolean;
  instruccion_borrado_local: Record<string, unknown>;
}

export interface EstadoSesionOffline {
  usuario_id: number;
  tenant_id: number;
  dispositivo_id?: string | null;
  pin_configurado: boolean;
  dispositivo_activo: boolean;
  intentos_restantes: number;
  max_horas_sesion_offline: number;
  ultima_conexion?: string | null;
  ultima_descarga?: string | null;
}

/** Sesión local cifrada que guarda IndexedDB (nunca el PIN). */
export interface SesionOfflineLocal {
  clave: 'sesion';
  tenant_id: number;
  usuario_id: number;
  dispositivo_id: string;
  token_offline_cifrado?: string;
  expira_en: string;
  pin_hash: string;
  pin_salt: string;
  intentos_fallidos: number;
  bloqueado: boolean;
  ultima_conexion?: string;
  ultima_descarga?: string | null;
  roles: string[];
  permisos: string[];
}

export interface OperacionOfflineLocal {
  uuid_operacion: string;
  tipo_operacion: TipoOperacionOffline;
  secuencia_local: number;
  payload: Record<string, unknown>;
  estado_sincronizacion: EstadoSincronizacion;
  intentos: number;
  tenant_id: number;
  dispositivo_id: string;
  usuario_id: number;
  sucursal_id?: number | null;
  fecha_registro_local: string;
  fecha_ultimo_intento?: string | null;
  error_detalle?: string | null;
  motivo_rechazo?: string | null;
  // [EXAMEN-2] Fase 2: control de reintentos y resultado del servidor.
  hash_payload?: string | null;
  programado_para?: string | null;
  requiere_revision?: boolean;
  resultado_json?: Record<string, unknown> | null;
  updated_at?: string | null;
}

export interface OperacionOfflineRemota {
  uuid_operacion: string;
  tipo_operacion: string;
  estado_sincronizacion: EstadoSincronizacion;
  requiere_revision: boolean;
  intentos: number;
  motivo_rechazo?: string | null;
  error_detalle?: string | null;
  resultado_json?: Record<string, unknown> | null;
  secuencia_local?: number | null;
  sucursal_id?: number | null;
  dispositivo_id?: string | null;
  fecha_registro_local?: string | null;
  fecha_recepcion_servidor?: string | null;
  fecha_ultimo_intento?: string | null;
}

export interface OperacionLoteItem {
  uuid_operacion: string;
  dispositivo_id?: string;
  secuencia_local?: number;
  tipo_operacion: string;
  sucursal_id?: number;
  fecha_registro_local?: string;
  payload: Record<string, unknown>;
}

export interface LoteSincronizacion {
  lote_id: string;
  tenant_id: number;
  recibidas: number;
  procesadas: number;
  resultados: ResultadoOperacion[];
  resumen: Record<string, number>;
}

export interface ResultadoOperacion {
  uuid_operacion: string;
  estado: EstadoSincronizacion;
  motivo?: string | null;
  datos_resultado?: Record<string, unknown> | null;
  reintentar: boolean;
  codigo_http_sugerido: number;
}

export interface LogConflicto {
  id: number;
  operacion_offline_id: number;
  uuid_operacion?: string | null;
  tipo_conflicto: string;
  resuelto: boolean;
  resolucion?: string | null;
  estrategia_resolucion?: string | null;
  observaciones?: string | null;
  detalle_json?: Record<string, unknown> | null;
  fecha?: string | null;
  fecha_resolucion?: string | null;
  resuelto_por?: number | null;
  tenant_id?: number;
}

export interface ResumenSincronizacion {
  tenant_id: number;
  desde?: string | null;
  hasta?: string | null;
  confirmadas: number;
  duplicadas: number;
  rechazadas: number;
  conflictos: number;
  errores_criticos: number;
  pendientes: number;
  total: number;
}

export interface PayloadReserva {
  uuid_reserva: string;
  sucursal_id: number;
  cliente_id?: number | null;
  fecha_reserva: string;
  detalles: Array<{ variante_producto_id: number; cantidad: number }>;
}

export interface PayloadVentaContado {
  uuid_venta: string;
  sucursal_id: number;
  cliente_id?: number | null;
  nit_ci_cliente?: string;
  metodo_pago: string;
  detalles: Array<{ variante_producto_id: number; cantidad: number; precio_unitario?: number }>;
}

export interface PayloadDevolucionCambio {
  uuid_devolucion: string;
  solicitud_id?: number;
  orden_id: number;
  sucursal_id?: number | null;
  tipo: 'DEVOLUCION' | 'CAMBIO';
  items: Array<{ detalle_orden_id: number; cantidad: number; variante_cambio_id?: number | null }>;
}

export interface PayloadReposicion {
  uuid_reposicion: string;
  solicitud_id: number;
  variante_original_id: number;
  variante_nueva_id: number;
}

export interface PayloadOrdenPagoDiferido {
  // [EXAMEN-2] El backend resuelve la orden desde el carrito offline.
  uuid_carrito: string;
  uuid_orden?: string;
  uuid_pago?: string;
  sucursal_id?: number | null;
  cliente_id?: number | null;
  acepta_nuevo_total?: boolean;
  direccion_envio?: string;
  items?: Array<{
    variante_producto_id: number;
    cantidad: number;
    precio_unitario_local?: number;
    stock_local_conocido?: number;
  }>;
}

// ============================================================
// [EXAMEN-2] Fase 2 — entidades locales de carrito, orden y pago
// ============================================================

export type EstadoCarritoLocal = 'ACTIVO' | 'CONVIRTIENDO' | 'CONVERTIDO' | 'ABANDONADO';
export type EstadoOrdenLocal =
  | 'PENDIENTE_PAGO_DIFERIDO'
  | 'PENDIENTE_SINCRONIZACION'
  | 'SINCRONIZANDO'
  | 'CONFIRMADA'
  | 'RECHAZADA'
  | 'EXPIRADA'
  | 'CANCELADA';

export interface ItemCarritoLocal {
  item_id: string;
  variante_producto_id: number;
  cantidad: number;
  precio_unitario_local: number;
  stock_local_conocido: number | null;
  sku_variante?: string | null;
  nombre_producto?: string | null;
  imagen?: string | null;
  talla?: string | null;
  color?: string | null;
  subtotal_local: number;
  stock_suficiente: boolean;
}

export interface CarritoLocal {
  uuid_carrito: string;
  tenant_id: number;
  dispositivo_id: string;
  usuario_id: number;
  cliente_id?: number | null;
  sucursal_id?: number | null;
  items: ItemCarritoLocal[];
  subtotal_local: number;
  descuento_local: number;
  total_local: number;
  estado: EstadoCarritoLocal;
  cupon_codigo?: string | null;
  cupon_bloqueado: boolean;
  precios_referenciales: boolean;
  sello_local: string;
  updated_at: string;
}

export interface OrdenLocal {
  uuid_orden: string;
  uuid_carrito: string;
  uuid_pago?: string | null;
  tenant_id: number;
  dispositivo_id: string;
  usuario_id: number;
  cliente_id?: number | null;
  sucursal_id?: number | null;
  estado: EstadoOrdenLocal;
  total_local: number;
  moneda: string;
  items: number;
  expira_en?: string | null;
  created_at: string;
  updated_at: string;
  error_detalle?: string | null;
}

export interface PagoLocal {
  uuid_pago: string;
  uuid_orden?: string | null;
  tenant_id: number;
  dispositivo_id: string;
  usuario_id: number;
  monto: number;
  moneda: string;
  estado: import('./pago-diferido.model').EstadoPagoDiferido;
  intentos: number;
  client_secret?: string | null;
  stripe_payment_intent_id?: string | null;
  fecha_expiracion?: string | null;
  fecha_ultimo_intento?: string | null;
  ultimo_error?: string | null;
  motivo_rechazo?: string | null;
  simulado?: boolean;
  updated_at: string;
  /** [EXAMEN-2] Identificadores remotos para conciliación y reembolsos. */
  pago_id?: number | null;
  orden_id?: number | null;
  requiere_accion?: boolean;
}

export interface ComprobanteLocal {
  uuid_offline: string;
  tenant_id: number;
  dispositivo_id: string;
  tipo: 'RESERVA' | 'VENTA_CONTADO' | 'ORDEN_PAGO_DIFERIDO' | 'DEVOLUCION' | 'REPOSICION';
  numero_temporal: string;
  es_temporal: boolean;
  reemplazado_por?: string | null;
  total: number;
  moneda: string;
  sucursal_id?: number | null;
  cliente_id?: number | null;
  detalle: string[];
  leyenda: string;
  created_at: string;
}

export type TipoEventoLocal =
  | 'DESCARGA'
  | 'SINCRONIZACION'
  | 'CONFLICTO'
  | 'PAGO'
  | 'VENTA_OFFLINE'
  | 'RESERVA_OFFLINE'
  | 'ERROR'
  | 'LIMPIEZA';

export interface BitacoraLocal {
  id?: number;
  fecha: string;
  tipo: TipoEventoLocal;
  mensaje: string;
  tenant_id: number;
  dispositivo_id: string;
  usuario_id: number;
  detalle?: Record<string, unknown>;
}

// ============================================================
// [EXAMEN-2] Fase 2 — descarga offline y contratos del paquete
// ============================================================

export interface VersionPaquete {
  tenant_id: number;
  sucursal_id?: number | null;
  version: string;
  hash_paquete: string;
  fecha_corte: string;
  actualizado_en?: string | null;
}

export interface ProductoOffline {
  id: number;
  sku: string;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  imagenes: string[];
  estado: string;
  genero?: string | null;
  categoria_id?: number | null;
  categoria?: string | null;
  temporada_id?: number | null;
  temporada?: string | null;
  colecciones?: string[];
  version?: number;
  updated_at?: string | null;
  tenant_id?: number;
}

export interface VarianteOffline {
  id: number;
  producto_id: number;
  sku_producto?: string | null;
  sku_variante: string;
  talla_id?: number | null;
  talla?: string | null;
  color_id?: number | null;
  color?: string | null;
  precio: number;
  precio_variante?: number | null;
  version?: number;
  updated_at?: string | null;
  tenant_id?: number;
}

export interface StockOffline {
  clave: string;
  variante_producto_id: number;
  sucursal_id: number;
  cantidad: number;
  cantidad_reservada: number;
  cantidad_disponible: number;
  stock_minimo: number;
  estado: string;
  version?: number;
  updated_at?: string | null;
  tenant_id?: number;
}

export interface ClienteOffline {
  id: number;
  /** [EXAMEN-2] El paquete del backend prioriza datos mínimos de contacto. */
  nombre?: string | null;
  apellido?: string | null;
  nit_ci?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion_envio?: string | null;
  compras?: number | null;
  tenant_id?: number;
}

export interface PaqueteOffline {
  tenant_id: number;
  sucursal_id?: number | null;
  usuario_id: number;
  version: string;
  hash_paquete: string;
  fecha_corte: string;
  configuracion_offline: ConfiguracionOffline;
  catalogo: ProductoOffline[];
  variantes: VarianteOffline[];
  stock: StockOffline[];
  datos_maestros: Record<string, unknown>;
  promociones: Record<string, unknown>;
  clientes_frecuentes: ClienteOffline[];
  impuestos: Record<string, unknown>;
  stripe: Record<string, unknown>;
  permisos: Record<string, unknown>;
}

export interface CatalogoIncremental {
  desde_version?: string | null;
  catalogo: ProductoOffline[];
  variantes: VarianteOffline[];
  stock: StockOffline[];
}

export interface DescargaRegistrarRequest {
  dispositivo_id: string;
  sucursal_id?: number | null;
  version?: string;
  hash_paquete?: string;
  tamano_bytes?: number;
  completo?: boolean;
  metadata?: Record<string, unknown>;
}

export interface DescargaRegistrarResponse {
  registrada: boolean;
  dispositivo_id: string;
  cursor_catalogo?: string | null;
  ultima_sincronizacion?: string | null;
  ultima_descarga_completa?: string | null;
}

export interface ResultadoDescargaOffline {
  version: string;
  productos: number;
  variantes: number;
  stock: number;
  clientes: number;
  promociones: number;
  bytes: number;
  completa: boolean;
  fecha: string;
}

export interface PayloadCarrito {
  uuid_carrito: string;
  cliente_id?: number | null;
  sucursal_id?: number | null;
  items: Array<{
    variante_producto_id: number;
    cantidad: number;
    precio_unitario_local?: number;
    stock_local_conocido?: number;
  }>;
}

export interface PayloadPagoDiferido {
  uuid_pago: string;
  uuid_orden?: string;
  uuid_carrito?: string;
  orden_id?: number;
  monto?: number;
  moneda?: string;
  acepta_nuevo_total?: boolean;
}

/** Almacenes de IndexedDB definidos en el capítulo 9.2 del plan. */
export type AlmacenOffline =
  | 'meta'
  | 'productos'
  | 'variantes'
  | 'stock'
  | 'clientes'
  | 'configuracion'
  | 'permisos'
  | 'sesion'
  | 'carrito'
  | 'ordenes_locales'
  | 'operaciones'
  | 'pagos'
  | 'conflictos'
  | 'compensaciones'
  | 'comprobantes'
  | 'bitacora_local';

export interface MetaLocal {
  clave: string;
  valor: unknown;
}

export interface UsoAlmacenamientoLocal {
  usadoBytes: number;
  limiteBytes: number;
  porcentaje: number;
  almacenes: Array<{ nombre: AlmacenOffline; registros: number }>;
}

// ============================================================
// [EXAMEN-2] Fase 2 — eventos de tiempo real de sync y pagos
// ============================================================

export interface EventoSincronizacionWs {
  evento: string;
  canal?: string;
  tenant_id?: number;
  lote_id?: string;
  uuid_operacion?: string;
  estado?: string;
  tipo_conflicto?: string;
  conflictos?: number;
  resumen?: Record<string, number>;
  [clave: string]: unknown;
}

export interface EventoPagoWs {
  evento: string;
  canal?: string;
  tenant_id?: number;
  uuid_pago?: string;
  pago_id?: number;
  orden_id?: number;
  estado?: string;
  monto?: number;
  motivo?: string | null;
  [clave: string]: unknown;
}
