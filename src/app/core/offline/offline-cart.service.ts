import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  CarritoLocal,
  ItemCarritoLocal,
  OperacionOfflineLocal,
  OrdenLocal,
  PagoLocal,
  PayloadOrdenPagoDiferido,
  ProductoOffline,
  VarianteOffline
} from '../models/offline.model';
import {
  CarritoOfflineItemsRequest,
  CarritoOfflineRequest,
  CarritoOfflineResponse,
  CarritoValidacionResponse,
  ConvertirCarritoRequest,
  ItemCarritoOfflineRequest,
  OrdenDiferidaResponse
} from '../models/pago-diferido.model';
import { IndexedDbService } from './indexed-db.service';
import { DeviceService } from './device.service';
import { StorageService } from '../services/storage.service';
import { OfflineCatalogService } from './offline-catalog.service';
import { OfflineQueueService } from './offline-queue.service';
import { OfflineAuditService } from './offline-audit.service';
import { hashPayload } from '../utils/payload-hash.util';

export interface AdvertenciaCupon {
  aplicado: boolean;
  mensaje: string;
}

export interface ConversionLocal {
  orden: OrdenLocal;
  pago: PagoLocal;
  operacion: OperacionOfflineLocal;
}

export interface EstadoSincronizacionCarrito {
  uuidCarrito: string;
  estado: string;
  operacion?: OperacionOfflineLocal | null;
  mensaje: string;
}

/**
 * [EXAMEN-2] CU15 / RNF-03: carrito local persistente y conversión a orden
 * con pago diferido. Los cupones solo se validan con conexión (RN-014).
 */
@Injectable({ providedIn: 'root' })
export class OfflineCartService {
  private indexedDb = inject(IndexedDbService);
  private http = inject(HttpClient);
  private device = inject(DeviceService);
  private storage = inject(StorageService);
  private catalog = inject(OfflineCatalogService);
  private queue = inject(OfflineQueueService);
  private audit = inject(OfflineAuditService);

  private readonly API_URL = `${environment.apiUrl}/carrito/offline`;

  public carrito = signal<CarritoLocal | null>(null);
  public items = computed<ItemCarritoLocal[]>(() => this.carrito()?.items ?? []);
  public total = computed<number>(() => this.carrito()?.total_local ?? 0);
  public hayCambios = computed<boolean>(() => (this.carrito()?.items.length ?? 0) > 0);

  constructor() {
    void this.cargarCarritoLocal();
  }

  async cargarCarritoLocal(): Promise<CarritoLocal | null> {
    const tenantId = this.tenantId();
    const carritos = await this.indexedDb.obtenerTodos<CarritoLocal>('carrito');
    const activo = carritos
      .filter((carrito) => carrito.tenant_id === tenantId
        && (carrito.estado === 'ACTIVO' || carrito.estado === 'CONVIRTIENDO'))
      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))[0] ?? null;

    this.carrito.set(activo);
    return activo;
  }

  async agregarItem(varianteId: number, cantidad = 1, opciones: { forzar?: boolean } = {}): Promise<CarritoLocal> {
    const variante = await this.indexedDb.obtener<VarianteOffline>('variantes', varianteId);
    if (!variante) {
      throw new Error('La variante no está disponible en el catálogo offline. Actualiza los datos antes de vender.');
    }

    const producto = await this.indexedDb.obtener<ProductoOffline>('productos', variante.producto_id);
    const stock = await this.catalog.stockLocal(varianteId);
    const carrito = await this.carritoActual();
    const existente = carrito.items.find((item) => item.variante_producto_id === varianteId);
    const nuevaCantidad = Math.max(1, Math.trunc(cantidad)) + (existente?.cantidad ?? 0);

    if (!opciones.forzar && stock && stock.cantidad_disponible < nuevaCantidad) {
      // No se bloquea: se advierte y se permite forzar (flujo alterno de CU06/CU07).
      throw new Error(
        `Stock local insuficiente: hay ${stock.cantidad_disponible} y se intentan ${nuevaCantidad}. `
        + 'Puedes forzar la operación y quedará como conflicto al sincronizar.'
      );
    }

    const precio = this.precioDe(variante, producto);
    const item: ItemCarritoLocal = {
      item_id: existente?.item_id ?? this.generarUuid(),
      variante_producto_id: varianteId,
      cantidad: nuevaCantidad,
      precio_unitario_local: precio,
      stock_local_conocido: stock?.cantidad_disponible ?? null,
      sku_variante: variante.sku_variante,
      nombre_producto: producto?.nombre ?? variante.sku_producto ?? null,
      imagen: producto?.imagenes?.[0] ?? null,
      talla: variante.talla ?? null,
      color: variante.color ?? null,
      subtotal_local: this.redondear(precio * nuevaCantidad),
      stock_suficiente: stock == null || stock.cantidad_disponible >= nuevaCantidad
    };

    const items = existente
      ? carrito.items.map((actual) => actual.item_id === existente.item_id ? item : actual)
      : [...carrito.items, item];

    return this.guardarCarrito({ ...carrito, items });
  }

  async modificarCantidad(itemId: string, cantidad: number): Promise<CarritoLocal> {
    if (cantidad <= 0) return this.eliminarItem(itemId);
    const carrito = await this.carritoActual();
    const items = carrito.items.map((item) => item.item_id === itemId
      ? {
          ...item,
          cantidad: Math.trunc(cantidad),
          subtotal_local: this.redondear(item.precio_unitario_local * Math.trunc(cantidad)),
          stock_suficiente: item.stock_local_conocido == null || item.stock_local_conocido >= Math.trunc(cantidad)
        }
      : item);
    return this.guardarCarrito({ ...carrito, items });
  }

  async eliminarItem(itemId: string): Promise<CarritoLocal> {
    const carrito = await this.carritoActual();
    return this.guardarCarrito({
      ...carrito,
      items: carrito.items.filter((item) => item.item_id !== itemId)
    });
  }

  async vaciar(): Promise<CarritoLocal> {
    const carrito = await this.carritoActual();
    return this.guardarCarrito({ ...carrito, items: [], descuento_local: 0, total_local: 0, subtotal_local: 0 });
  }

  async recalcularTotales(carrito?: CarritoLocal): Promise<CarritoLocal> {
    const actual = carrito ?? await this.carritoActual();
    const items = actual.items.map((item) => ({
      ...item,
      subtotal_local: this.redondear(item.precio_unitario_local * item.cantidad),
      stock_suficiente: item.stock_local_conocido == null || item.stock_local_conocido >= item.cantidad
    }));
    const subtotal = this.redondear(items.reduce((suma, item) => suma + item.subtotal_local, 0));
    const descuento = this.redondear(actual.descuento_local ?? 0);
    const total = this.redondear(Math.max(0, subtotal - descuento));
    const sello = hashPayload({ items, subtotal, descuento, total });

    return {
      ...actual,
      items,
      subtotal_local: subtotal,
      total_local: total,
      precios_referenciales: true,
      sello_local: sello,
      updated_at: new Date().toISOString()
    };
  }

  /** Marca los ítems sin stock local suficiente, sin bloquear la compra. */
  async validarStockLocal(): Promise<ItemCarritoLocal[]> {
    const carrito = await this.carritoActual();
    const items: ItemCarritoLocal[] = [];
    for (const item of carrito.items) {
      const stock = await this.catalog.stockLocal(item.variante_producto_id);
      items.push({
        ...item,
        stock_local_conocido: stock?.cantidad_disponible ?? item.stock_local_conocido,
        stock_suficiente: stock == null || stock.cantidad_disponible >= item.cantidad
      });
    }
    const actualizado = await this.guardarCarrito({ ...carrito, items });
    return actualizado.items;
  }

  advertirPreciosReferenciales(): boolean {
    return this.carrito()?.precios_referenciales ?? true;
  }

  /**
   * RN-014: los cupones se validan solo con conexión. Offline se explica al
   * usuario y se conserva el código para aplicarlo al reconectar.
   */
  async aplicarCupon(codigo: string): Promise<AdvertenciaCupon> {
    const carrito = await this.carritoActual();
    await this.guardarCarrito({ ...carrito, cupon_codigo: codigo.trim() || null, cupon_bloqueado: true });
    return {
      aplicado: false,
      mensaje: 'Los cupones se validan únicamente con conexión. Guardamos el código para aplicarlo cuando vuelvas a estar en línea.'
    };
  }

  /** Genera `uuid_orden`, `uuid_pago`, la orden local y la operación FIFO. */
  async convertirAOrden(opciones: {
    aceptaNuevoTotal?: boolean;
    direccionEnvio?: string;
    clienteId?: number | null;
    sucursalId?: number | null;
  } = {}): Promise<ConversionLocal> {
    const carrito = await this.recalcularTotales();
    if (carrito.items.length === 0) {
      throw new Error('El carrito está vacío; agrega al menos un producto antes de confirmar.');
    }

    const ahora = new Date();
    const expira = new Date(ahora.getTime() + environment.pagoDiferidoVigenciaHoras * 3_600_000).toISOString();
    const uuidOrden = this.generarUuid();
    const uuidPago = this.generarUuid();

    const orden: OrdenLocal = {
      uuid_orden: uuidOrden,
      uuid_carrito: carrito.uuid_carrito,
      uuid_pago: uuidPago,
      tenant_id: carrito.tenant_id,
      dispositivo_id: carrito.dispositivo_id,
      usuario_id: carrito.usuario_id,
      cliente_id: opciones.clienteId ?? carrito.cliente_id ?? null,
      sucursal_id: opciones.sucursalId ?? carrito.sucursal_id ?? null,
      estado: 'PENDIENTE_PAGO_DIFERIDO',
      total_local: carrito.total_local,
      moneda: 'BOB',
      items: carrito.items.length,
      expira_en: expira,
      created_at: ahora.toISOString(),
      updated_at: ahora.toISOString(),
      error_detalle: null
    };

    const pago: PagoLocal = {
      uuid_pago: uuidPago,
      uuid_orden: uuidOrden,
      tenant_id: carrito.tenant_id,
      dispositivo_id: carrito.dispositivo_id,
      usuario_id: carrito.usuario_id,
      monto: carrito.total_local,
      moneda: 'BOB',
      estado: 'PENDIENTE_ENVIO',
      intentos: 0,
      fecha_expiracion: expira,
      fecha_ultimo_intento: null,
      ultimo_error: null,
      motivo_rechazo: null,
      simulado: false,
      updated_at: ahora.toISOString()
    };

    const payload: PayloadOrdenPagoDiferido = {
      uuid_carrito: carrito.uuid_carrito,
      uuid_orden: uuidOrden,
      uuid_pago: uuidPago,
      sucursal_id: orden.sucursal_id,
      cliente_id: orden.cliente_id,
      acepta_nuevo_total: opciones.aceptaNuevoTotal ?? true,
      direccion_envio: opciones.direccionEnvio,
      items: carrito.items.map((item) => ({
        variante_producto_id: item.variante_producto_id,
        cantidad: item.cantidad,
        precio_unitario_local: item.precio_unitario_local,
        stock_local_conocido: item.stock_local_conocido ?? undefined
      }))
    };

    const operacion = await this.queue.encolar(
      'ORDEN_PAGO_DIFERIDO',
      payload as unknown as Record<string, unknown>,
      { sucursalId: orden.sucursal_id }
    );

    await this.indexedDb.guardar('ordenes_locales', orden);
    await this.indexedDb.guardar('pagos', pago);
    await this.guardarCarrito({ ...carrito, estado: 'CONVERTIDO' });
    this.carrito.set(null);
    await this.audit.registrar({
      tipo: 'PAGO',
      mensaje: `Pedido guardado localmente con pago diferido por ${orden.total_local} BOB.`,
      detalle: { uuid_orden: uuidOrden, uuid_pago: uuidPago, uuid_operacion: operacion.uuid_operacion }
    });

    return { orden, pago, operacion };
  }

  async carritoPendiente(): Promise<boolean> {
    const carrito = await this.cargarCarritoLocal();
    return !!carrito && carrito.items.length > 0;
  }

  async estadoSincronizacion(uuidCarrito?: string): Promise<EstadoSincronizacionCarrito> {
    const carrito = uuidCarrito
      ? await this.indexedDb.obtener<CarritoLocal>('carrito', uuidCarrito)
      : await this.cargarCarritoLocal();
    if (!carrito) {
      return { uuidCarrito: uuidCarrito ?? '', estado: 'SIN_CARRITO', mensaje: 'No hay un carrito local activo.' };
    }

    const operaciones = await this.indexedDb.obtenerTodos<OperacionOfflineLocal>('operaciones');
    const operacion = operaciones
      .filter((op) => op.payload['uuid_carrito'] === carrito.uuid_carrito)
      .sort((a, b) => b.secuencia_local - a.secuencia_local)[0] ?? null;

    const mensaje = operacion
      ? this.mensajeEstado(operacion)
      : 'El carrito aún no se ha confirmado.';

    return {
      uuidCarrito: carrito.uuid_carrito,
      estado: operacion?.estado_sincronizacion ?? carrito.estado,
      operacion,
      mensaje
    };
  }

  // ------------------- HTTP del carrito offline -------------------

  registrarEnServidor(carrito: CarritoLocal): Promise<CarritoOfflineResponse> {
    const datos: CarritoOfflineRequest = {
      uuid_carrito: carrito.uuid_carrito,
      cliente_id: carrito.cliente_id ?? null,
      sucursal_id: carrito.sucursal_id ?? null,
      cupon_codigo: carrito.cupon_codigo ?? null,
      items: carrito.items.map((item) => this.aItemRemoto(item))
    };
    return this.primero(this.http.post<CarritoOfflineResponse>(this.API_URL, datos));
  }

  obtenerRemoto(uuidCarrito: string): Promise<CarritoOfflineResponse> {
    return this.primero(this.http.get<CarritoOfflineResponse>(`${this.API_URL}/${uuidCarrito}`));
  }

  actualizarItemsRemoto(uuidCarrito: string, items: ItemCarritoOfflineRequest[]): Promise<CarritoOfflineResponse> {
    const datos: CarritoOfflineItemsRequest = { items };
    return this.primero(
      this.http.put<CarritoOfflineResponse>(`${this.API_URL}/${uuidCarrito}/items`, datos)
    );
  }

  quitarItemRemoto(uuidCarrito: string, itemId: number): Promise<CarritoOfflineResponse> {
    return this.primero(
      this.http.delete<CarritoOfflineResponse>(`${this.API_URL}/${uuidCarrito}/items/${itemId}`)
    );
  }

  validarRemoto(
    uuidCarrito: string,
    sucursalId?: number | null,
    cuponCodigo?: string | null
  ): Promise<CarritoValidacionResponse> {
    let params = new HttpParams();
    if (sucursalId != null) params = params.set('sucursal_id', String(sucursalId));
    if (cuponCodigo) params = params.set('cupon_codigo', cuponCodigo);
    return this.primero(
      this.http.post<CarritoValidacionResponse>(`${this.API_URL}/${uuidCarrito}/validar`, {}, { params })
    );
  }

  convertirRemoto(uuidCarrito: string, datos: ConvertirCarritoRequest): Promise<OrdenDiferidaResponse> {
    return this.primero(
      this.http.post<OrdenDiferidaResponse>(`${this.API_URL}/${uuidCarrito}/convertir`, datos)
    );
  }

  listarPendientesRemotos(): Promise<CarritoOfflineResponse[]> {
    return this.primero(this.http.get<CarritoOfflineResponse[]>(`${this.API_URL}/pendientes`));
  }

  /** ítems locales listos para el contrato HTTP del backend. */
  aItemsRemotos(): ItemCarritoOfflineRequest[] {
    return (this.carrito()?.items ?? []).map((item) => this.aItemRemoto(item));
  }

  // ----------------------------- internos -----------------------------

  private async carritoActual(): Promise<CarritoLocal> {
    const existente = this.carrito() ?? await this.cargarCarritoLocal();
    if (existente) return existente;

    const ahora = new Date().toISOString();
    const nuevo: CarritoLocal = {
      uuid_carrito: this.generarUuid(),
      tenant_id: this.tenantId(),
      dispositivo_id: this.device.obtenerDispositivoId(),
      usuario_id: this.usuarioId(),
      cliente_id: null,
      sucursal_id: this.sucursalActual(),
      items: [],
      subtotal_local: 0,
      descuento_local: 0,
      total_local: 0,
      estado: 'ACTIVO',
      cupon_codigo: null,
      cupon_bloqueado: false,
      precios_referenciales: true,
      sello_local: '',
      updated_at: ahora
    };
    return this.guardarCarrito(nuevo);
  }

  private async guardarCarrito(carrito: CarritoLocal): Promise<CarritoLocal> {
    const recalculado = await this.recalcularTotales({ ...carrito, updated_at: new Date().toISOString() });
    await this.indexedDb.guardar('carrito', recalculado);
    this.carrito.set(recalculado);
    return recalculado;
  }

  private precioDe(variante: VarianteOffline, producto: ProductoOffline | null): number {
    const precio = variante.precio_variante ?? variante.precio ?? producto?.precio ?? 0;
    return this.redondear(Number(precio) || 0);
  }

  private redondear(valor: number): number {
    return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
  }

  private mensajeEstado(operacion: OperacionOfflineLocal): string {
    switch (operacion.estado_sincronizacion) {
      case 'PENDIENTE': return 'Pedido guardado localmente; se enviará al recuperar la conexión.';
      case 'SINCRONIZANDO': return 'Enviando el pedido al servidor…';
      case 'CONFIRMADA': return 'Pedido confirmado por el servidor. Continúa con el pago diferido.';
      case 'DUPLICADA': return 'El pedido ya había sido registrado; no se duplicó.';
      case 'RECHAZADA': return operacion.motivo_rechazo ?? 'El pedido fue rechazado.';
      case 'CONFLICTO': return operacion.error_detalle ?? 'El pedido requiere revisión por un conflicto.';
      case 'ERROR_CRITICO': return operacion.error_detalle ?? 'El pedido tiene un error crítico.';
      default: return 'Estado del pedido desconocido.';
    }
  }

  private generarUuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (caracter) => {
      const aleatorio = Math.floor(Math.random() * 16);
      const valor = caracter === 'x' ? aleatorio : (aleatorio & 0x3) | 0x8;
      return valor.toString(16);
    });
  }

  private tenantId(): number {
    return this.storage.getTenantActivo<{ id: number }>()?.id ?? 0;
  }

  private usuarioId(): number {
    return this.storage.getUser<{ id: number }>()?.id ?? 0;
  }

  private sucursalActual(): number | null {
    return this.storage.getUser<{ sucursal_id?: number | null }>()?.sucursal_id ?? null;
  }

  private primero<T>(observable: import('rxjs').Observable<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      observable.subscribe({ next: resolve, error: reject });
    });
  }

  private aItemRemoto(item: ItemCarritoLocal): ItemCarritoOfflineRequest {
    return {
      variante_producto_id: item.variante_producto_id,
      cantidad: item.cantidad,
      precio_unitario_local: item.precio_unitario_local,
      stock_local_conocido: item.stock_local_conocido ?? undefined
    };
  }
}
