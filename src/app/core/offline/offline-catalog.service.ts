import { Injectable, inject } from '@angular/core';
import {
  CatalogoIncremental,
  ClienteOffline,
  ConfiguracionOffline,
  DescargaRegistrarRequest,
  DescargaRegistrarResponse,
  PaqueteOffline,
  ProductoOffline,
  ResultadoDescargaOffline,
  StockOffline,
  VarianteOffline,
  VersionPaquete
} from '../models/offline.model';
import { environment } from '../../../environments/environment';
import { IndexedDbService } from './indexed-db.service';
import { DeviceService } from './device.service';
import { StorageService } from '../services/storage.service';
import { OfflineApiService, PromocionesOffline } from '../services/offline-api.service';
import { StorageQuotaService } from './storage-quota.service';
import { OfflineAuditService } from './offline-audit.service';
import { BranchApiService } from '../services/branch-api.service';
import { Sucursal } from '../models/branch.model';

export interface OpcionesDescarga {
  sucursalId?: number | null;
  /** Descarga completa aunque el cursor incremental exista. */
  completo?: boolean;
  /** Evita recortar el paquete cuando la cuota está al límite (pruebas). */
  omitirLimiteCuota?: boolean;
}

export interface FiltrosBusquedaLocal {
  categoriaId?: number | null;
  genero?: string | null;
  soloConStock?: boolean;
  limite?: number;
}

const CLAVE_SELLO = 'sello_descarga';
const CLAVE_CURSOR = 'cursor_catalogo';
const CLAVE_VERSION = 'version_paquete';
const CLAVE_CONFIGURACION = 'configuracion';
const CLAVE_PERMISOS = 'permisos';
const CLAVE_PROMOCIONES = 'promociones';
const CLAVE_DATOS_MAESTROS = 'datos_maestros';
const CLAVE_IMPUESTOS = 'impuestos';
const CLAVE_STRIPE = 'stripe';
const CLAVE_SUCURSALES = 'sucursales_cache';

/**
 * [EXAMEN-2] CU05 / RNF-14: paquete offline versionado en IndexedDB.
 * Reutiliza el esquema del capítulo 9.2; no crea almacenes nuevos.
 */
@Injectable({ providedIn: 'root' })
export class OfflineCatalogService {
  private indexedDb = inject(IndexedDbService);
  private device = inject(DeviceService);
  private storage = inject(StorageService);
  private offlineApi = inject(OfflineApiService);
  private quota = inject(StorageQuotaService);
  private audit = inject(OfflineAuditService);
  private branchApi = inject(BranchApiService);

  async descargarPaquete(opciones: OpcionesDescarga = {}): Promise<ResultadoDescargaOffline> {
    const sucursalId = opciones.sucursalId ?? this.sucursalActual();
    const paquete = await this.primero(this.offlineApi.obtenerPaquete(sucursalId, this.device.obtenerDispositivoId()));

    const completo = paquete as unknown as PaqueteOffline;
    const tenantId = this.tenantId();
    const productos = this.normalizarProductos(completo.catalogo ?? [], tenantId);
    const variantes = this.normalizarVariantes(completo.variantes ?? [], tenantId);
    const stock = this.normalizarStock(completo.stock ?? [], tenantId);
    const clientes = (completo.clientes_frecuentes ?? []).map((cliente) => ({
      ...cliente,
      tenant_id: tenantId
    }));

    let recortado = false;
    let productosFinales = productos;
    let variantesFinales = variantes;
    let stockFinal = stock;

    if (!opciones.omitirLimiteCuota) {
      const bytes = this.estimarBytes({ productos, variantes, stock, clientes });
      const hayEspacio = await this.quota.puedeDescargar(bytes);
      if (!hayEspacio) {
        recortado = true;
        const prioridad = new Set(
          this.quota.priorizarCatalogo(
            stock.map((s) => ({
              variante_producto_id: s.variante_producto_id,
              stock_disponible: s.cantidad_disponible
            }))
          ).map((c) => c.variante_producto_id)
        );
        const variantesPriorizadas = variantes.filter((v) => prioridad.has(v.id));
        const idsProductos = new Set(variantesPriorizadas.map((v) => v.producto_id));
        variantesFinales = variantesPriorizadas;
        productosFinales = productos.filter((p) => idsProductos.has(p.id));
        stockFinal = stock.filter((s) => prioridad.has(s.variante_producto_id));
      }
    }

    await this.indexedDb.guardarLote('productos', productosFinales);
    await this.indexedDb.guardarLote('variantes', variantesFinales);
    await this.indexedDb.guardarLote('stock', stockFinal);
    await this.indexedDb.guardarLote('clientes', clientes);

    if (completo.configuracion_offline) {
      await this.guardarConfiguracionOffline(completo.configuracion_offline);
    }
    await this.guardarMeta(CLAVE_PERMISOS, completo.permisos ?? {});
    await this.guardarMeta(CLAVE_PROMOCIONES, completo.promociones ?? {});
    await this.guardarMeta(CLAVE_DATOS_MAESTROS, completo.datos_maestros ?? {});
    await this.guardarMeta(CLAVE_IMPUESTOS, completo.impuestos ?? {});
    await this.guardarMeta(CLAVE_STRIPE, completo.stripe ?? {});
    await this.guardarMeta(CLAVE_VERSION, {
      tenant_id: tenantId,
      sucursal_id: sucursalId,
      version: completo.version,
      hash_paquete: completo.hash_paquete,
      fecha_corte: completo.fecha_corte
    } satisfies VersionPaquete);
    await this.guardarMeta(CLAVE_CURSOR, completo.version);
    // [EXAMEN-2] CU06: la reserva offline necesita elegir sucursal. Se cachea
    // aquí para no depender del backend cuando se desconecte la red.
    await this.cachearSucursales();

    const fecha = new Date().toISOString();
    await this.marcarSello(fecha);

    const resultado: ResultadoDescargaOffline = {
      version: completo.version,
      productos: productosFinales.length,
      variantes: variantesFinales.length,
      stock: stockFinal.length,
      clientes: clientes.length,
      promociones: Array.isArray((completo.promociones as { promociones?: unknown[] })?.promociones)
        ? ((completo.promociones as { promociones: unknown[] }).promociones.length)
        : 0,
      bytes: this.estimarBytes({ productos: productosFinales, variantes: variantesFinales, stock: stockFinal, clientes }),
      completa: !recortado,
      fecha
    };

    try {
      await this.registrarDescarga(resultado, sucursalId);
    } catch {
      // La descarga local ya está lista; el registro es auditoría best-effort.
    }
    await this.audit.registrar({
      tipo: 'DESCARGA',
      mensaje: recortado
        ? `Descarga parcial: ${resultado.productos} productos (espacio limitado).`
        : `Descarga completa: ${resultado.productos} productos, ${resultado.variantes} variantes.`,
      detalle: { version: resultado.version, bytes: resultado.bytes, completa: resultado.completa }
    });

    return resultado;
  }

  async descargarIncremental(): Promise<ResultadoDescargaOffline> {
    const cursor = await this.obtenerMeta<string>(CLAVE_CURSOR);
    if (!cursor) return this.descargarPaquete({ completo: true });

    const delta = await this.primero(
      this.offlineApi.obtenerCatalogoIncremental(cursor, this.sucursalActual())
    );
    const tenantId = this.tenantId();
    const productos = this.normalizarProductos(delta.catalogo ?? [], tenantId);
    const variantes = this.normalizarVariantes(delta.variantes ?? [], tenantId);
    const stock = this.normalizarStock(delta.stock ?? [], tenantId);

    await this.indexedDb.guardarLote('productos', productos);
    await this.indexedDb.guardarLote('variantes', variantes);
    await this.indexedDb.guardarLote('stock', stock);
    await this.guardarMeta(CLAVE_CURSOR, (delta as CatalogoIncremental).desde_version ?? new Date().toISOString());

    const fecha = new Date().toISOString();
    await this.marcarSello(fecha);
    await this.audit.registrar({
      tipo: 'DESCARGA',
      mensaje: `Catálogo incremental: ${productos.length} productos, ${variantes.length} variantes.`
    });

    return {
      version: (delta as CatalogoIncremental).desde_version ?? cursor,
      productos: productos.length,
      variantes: variantes.length,
      stock: stock.length,
      clientes: 0,
      promociones: 0,
      bytes: this.estimarBytes({ productos, variantes, stock, clientes: [] }),
      completa: false,
      fecha
    };
  }

  async descargarStock(sucursalId?: number | null): Promise<number> {
    const sucursal = sucursalId ?? this.sucursalActual();
    if (sucursal == null) return 0;
    const stock = await this.primero(this.offlineApi.obtenerStock(sucursal));
    const normalizado = this.normalizarStock(stock, this.tenantId());
    await this.indexedDb.guardarLote('stock', normalizado);
    return normalizado.length;
  }

  async descargarClientesFrecuentes(): Promise<number> {
    const clientes = await this.primero(this.offlineApi.obtenerClientes());
    const normalizados: ClienteOffline[] = clientes.map((cliente) => ({
      ...cliente,
      tenant_id: this.tenantId()
    }));
    await this.indexedDb.guardarLote('clientes', normalizados);
    return normalizados.length;
  }

  async descargarPromociones(): Promise<PromocionesOffline> {
    const promociones = await this.primero(this.offlineApi.obtenerPromociones());
    await this.guardarMeta(CLAVE_PROMOCIONES, promociones);
    return promociones;
  }

  async guardarConfiguracionOffline(configuracion?: ConfiguracionOffline | null): Promise<ConfiguracionOffline | null> {
    if (!configuracion) return this.configuracionLocal();
    await this.guardarMeta(CLAVE_CONFIGURACION, configuracion);
    return configuracion;
  }

  async configuracionLocal(): Promise<ConfiguracionOffline | null> {
    return this.obtenerMeta<ConfiguracionOffline>(CLAVE_CONFIGURACION);
  }

  async obtenerPromocionesLocal(): Promise<PromocionesOffline | null> {
    return this.obtenerMeta<PromocionesOffline>(CLAVE_PROMOCIONES);
  }

  async obtenerImpuestosLocal(): Promise<{ moneda?: string; tasa_total?: number }> {
    return (await this.obtenerMeta<{ moneda?: string; tasa_total?: number }>(CLAVE_IMPUESTOS)) ?? {};
  }

  async obtenerClaveStripeLocal(): Promise<{ stripe_publishable_key?: string; modo_simulado?: boolean }> {
    return (await this.obtenerMeta<{ stripe_publishable_key?: string; modo_simulado?: boolean }>(CLAVE_STRIPE)) ?? {};
  }

  async registrarDescarga(resultado: ResultadoDescargaOffline, sucursalId?: number | null): Promise<DescargaRegistrarResponse> {
    const datos: DescargaRegistrarRequest = {
      dispositivo_id: this.device.obtenerDispositivoId(),
      sucursal_id: sucursalId ?? this.sucursalActual(),
      version: resultado.version,
      tamano_bytes: resultado.bytes,
      completo: resultado.completa,
      metadata: {
        productos: resultado.productos,
        variantes: resultado.variantes,
        stock: resultado.stock,
        clientes: resultado.clientes
      }
    };
    return this.primero(this.offlineApi.registrarDescarga(datos));
  }

  async marcarSello(fecha: string = new Date().toISOString()): Promise<void> {
    await this.guardarMeta(CLAVE_SELLO, fecha);
  }

  async selloActual(): Promise<string | null> {
    return this.obtenerMeta<string>(CLAVE_SELLO);
  }

  async datosCompletos(): Promise<boolean> {
    const [productos, variantes] = await Promise.all([
      this.indexedDb.contar('productos'),
      this.indexedDb.contar('variantes')
    ]);
    return productos > 0 && variantes > 0;
  }

  priorizarCatalogo<T extends { variante_producto_id: number; stock_disponible?: number; vendidos?: number }>(candidatos: T[]): T[] {
    return this.quota.priorizarCatalogo(candidatos);
  }

  async buscarLocal(termino: string, filtros: FiltrosBusquedaLocal = {}): Promise<ProductoOffline[]> {
    const productos = await this.indexedDb.obtenerTodos<ProductoOffline>('productos');
    const texto = this.normalizarTexto(termino);

    let resultado = productos.filter((producto) => {
      if (filtros.categoriaId != null && producto.categoria_id !== filtros.categoriaId) return false;
      if (filtros.genero && producto.genero !== filtros.genero) return false;
      if (!texto) return true;
      return this.normalizarTexto(producto.nombre).includes(texto)
        || this.normalizarTexto(producto.sku).includes(texto)
        || this.normalizarTexto(producto.categoria ?? '').includes(texto)
        || this.normalizarTexto(producto.descripcion ?? '').includes(texto);
    });

    if (filtros.soloConStock) {
      const stock = await this.indexedDb.obtenerTodos<StockOffline>('stock');
      const conStock = new Set(stock.filter((s) => s.cantidad_disponible > 0).map((s) => s.variante_producto_id));
      const variantes = await this.indexedDb.obtenerTodos<VarianteOffline>('variantes');
      const productosConStock = new Set(
        variantes.filter((v) => conStock.has(v.id)).map((v) => v.producto_id)
      );
      resultado = resultado.filter((producto) => productosConStock.has(producto.id));
    }

    resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));
    const normalizados = resultado.map((p) => ({ ...p, imagenes: this.normalizarImagenes(p.imagenes) }));
    return filtros.limite != null ? normalizados.slice(0, filtros.limite) : normalizados;
  }

  async variantesDeProducto(productoId: number): Promise<VarianteOffline[]> {
    return this.indexedDb.obtenerPorIndice<VarianteOffline>('variantes', 'producto_id', productoId);
  }

  async obtenerVariante(varianteId: number): Promise<VarianteOffline | null> {
    const directa = await this.indexedDb.obtener<VarianteOffline>('variantes', varianteId);
    if (directa) return directa;
    // Fallback en caso de claves legacy (number vs string).
    const todas = await this.indexedDb.obtenerTodos<VarianteOffline>('variantes');
    return todas.find((v) => v.id === varianteId || String(v.id) === String(varianteId)) ?? null;
  }

  async obtenerProducto(productoId: number): Promise<ProductoOffline | null> {
    const directo = await this.indexedDb.obtener<ProductoOffline>('productos', productoId);
    if (directo) return { ...directo, imagenes: this.normalizarImagenes(directo.imagenes) };
    const todas = await this.indexedDb.obtenerTodos<ProductoOffline>('productos');
    const encontrado = todas.find((p) => p.id === productoId || String(p.id) === String(productoId)) ?? null;
    return encontrado ? { ...encontrado, imagenes: this.normalizarImagenes(encontrado.imagenes) } : null;
  }

  async stockLocal(varianteId: number, sucursalId?: number | null): Promise<StockOffline | null> {
    const sucursal = sucursalId ?? this.sucursalActual();
    // No usar el índice: la BD v1 antigua lo creó como 'variante_id' (campo
    // inexistente) y un upgrade a v2 puede quedar bloqueado si la conexión
    // vieja sigue abierta. Escanear es fiable y el stock es pequeño.
    if (sucursal == null) {
      const todos = await this.indexedDb.obtenerTodos<StockOffline>('stock');
      const candidatos = todos.filter((s) => s.variante_producto_id === varianteId);
      return candidatos.find((s) => s.cantidad_disponible > 0) ?? candidatos[0] ?? null;
    }
    const clave = `${varianteId}:${sucursal}`;
    const directo = await this.indexedDb.obtener<StockOffline>('stock', clave);
    if (directo) return directo;
    const todos = await this.indexedDb.obtenerTodos<StockOffline>('stock');
    const candidatos = todos.filter((s) => s.variante_producto_id === varianteId);
    return candidatos.find((s) => s.sucursal_id === sucursal) ?? null;
  }

  /**
   * [EXAMEN-2] CU07: descuenta stock local no confirmado al vender sin red.
   * El servidor es la fuente de verdad; este descuento solo evita sobreventa
   * mientras la operación permanece en la cola.
   */
  async descontarStockLocal(
    varianteId: number,
    cantidad: number,
    sucursalId?: number | null
  ): Promise<StockOffline | null> {
    const stock = await this.stockLocal(varianteId, sucursalId);
    if (!stock) return null;

    const descuento = Math.max(0, cantidad);
    const actualizado: StockOffline = {
      ...stock,
      cantidad: Math.max(0, stock.cantidad - descuento),
      cantidad_disponible: Math.max(0, stock.cantidad_disponible - descuento),
      updated_at: new Date().toISOString()
    };
    await this.indexedDb.guardar('stock', actualizado);
    return actualizado;
  }

  async versionLocal(): Promise<VersionPaquete | null> {
    return this.obtenerMeta<VersionPaquete>(CLAVE_VERSION);
  }

  /**
   * Devuelve la próxima fecha de descarga automática según la configuración
   * del tenant (`hora_descarga`, formato `HH:mm`).
   */
  async programarDescarga(horario?: string | null): Promise<string | null> {
    const configuracion = await this.configuracionLocal();
    const hora = horario ?? configuracion?.hora_descarga ?? null;
    if (!configuracion?.descarga_automatica || !hora) return null;

    const [horaTexto, minutoTexto] = hora.split(':');
    const horas = Number(horaTexto);
    const minutos = Number(minutoTexto ?? 0);
    if (!Number.isFinite(horas) || !Number.isFinite(minutos)) return null;

    const proxima = new Date();
    proxima.setHours(horas, minutos, 0, 0);
    if (proxima.getTime() <= Date.now()) proxima.setDate(proxima.getDate() + 1);
    return proxima.toISOString();
  }

  // ------------------------- utilidades -------------------------

  private normalizarProductos(productos: ProductoOffline[], tenantId: number): ProductoOffline[] {
    return productos.map((producto) => ({
      ...producto,
      tenant_id: tenantId,
      imagenes: this.normalizarImagenes(producto.imagenes),
    }));
  }

  private normalizarImagenes(valor: unknown): string[] {
    if (!valor) return [];
    if (Array.isArray(valor)) return valor.map(String).filter(Boolean);
    if (typeof valor === 'string') {
      const texto = valor.trim();
      if (!texto) return [];
      try {
        const parsed = JSON.parse(texto);
        if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
        return [texto];
      } catch {
        return [texto];
      }
    }
    return [];
  }

  private normalizarVariantes(variantes: VarianteOffline[], tenantId: number): VarianteOffline[] {
    return variantes.map((variante) => ({ ...variante, tenant_id: tenantId }));
  }

  private normalizarStock(stock: StockOffline[], tenantId: number): StockOffline[] {
    return stock.map((item) => ({
      ...item,
      clave: item.clave ?? `${item.variante_producto_id}:${item.sucursal_id}`,
      tenant_id: tenantId
    }));
  }

  private estimarBytes(contenido: {
    productos: ProductoOffline[];
    variantes: VarianteOffline[];
    stock: StockOffline[];
    clientes: ClienteOffline[];
  }): number {
    try {
      return new Blob([JSON.stringify(contenido)]).size;
    } catch {
      return JSON.stringify(contenido).length;
    }
  }

  private normalizarTexto(valor: string): string {
    return valor
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // ===== [EXAMEN-2] Sucursales para reserva/POS offline =====

  async guardarSucursalesCache(sucursales: Sucursal[]): Promise<void> {
    await this.guardarMeta(CLAVE_SUCURSALES, sucursales);
  }

  async obtenerSucursalesCache(): Promise<Sucursal[]> {
    return (await this.obtenerMeta<Sucursal[]>(CLAVE_SUCURSALES)) ?? [];
  }

  /** Refresca el cache sin interrumpir la descarga si la red o el rol fallan. */
  async cachearSucursales(): Promise<void> {
    try {
      const sucursales = await this.primero(this.branchApi.getBranches());
      const activas = sucursales.filter((sucursal) => sucursal.estado === 'ACTIVO');
      await this.guardarSucursalesCache(activas);
    } catch {
      // Sin conexión o sin permisos: se conserva el cache anterior.
    }
  }

  private tenantId(): number {
    return this.storage.getTenantActivo<{ id: number }>()?.id ?? 0;
  }

  private sucursalActual(): number | null {
    return this.storage.getUser<{ sucursal_id?: number | null }>()?.sucursal_id ?? null;
  }

  private async guardarMeta(clave: string, valor: unknown): Promise<void> {
    await this.indexedDb.guardar('meta', { clave, valor });
  }

  private async obtenerMeta<T>(clave: string): Promise<T | null> {
    const registro = await this.indexedDb.obtener<{ clave: string; valor: T }>('meta', clave);
    return registro?.valor ?? null;
  }

  private primero<T>(observable: import('rxjs').Observable<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      observable.subscribe({ next: resolve, error: reject });
    });
  }

  /** Expone la configuración de lote para la pantalla de descarga. */
  limiteMb(): number {
    return environment.offlineMaxMbLocal;
  }
}
