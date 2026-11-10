import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AlmacenOffline, UsoAlmacenamientoLocal } from '../models/offline.model';

interface DefinicionAlmacen {
  nombre: AlmacenOffline;
  clave: string;
  autoIncremento?: boolean;
  indices?: Array<{ nombre: string; campo: string }>;
}

/**
 * [EXAMEN-2] Esquema local del capítulo 9.2 del plan.
 * Base única por dispositivo y tenant; los datos personales se cifran desde
 * los servicios que la usan (local-crypto).
 */
const ALMACENES: DefinicionAlmacen[] = [
  { nombre: 'meta', clave: 'clave' },
  { nombre: 'productos', clave: 'id', indices: [
    { nombre: 'tenant_id', campo: 'tenant_id' },
    { nombre: 'updated_at', campo: 'updated_at' },
    { nombre: 'categoria_id', campo: 'categoria_id' }
  ] },
  { nombre: 'variantes', clave: 'id', indices: [
    { nombre: 'producto_id', campo: 'producto_id' },
    { nombre: 'tenant_id', campo: 'tenant_id' },
    { nombre: 'sku_variante', campo: 'sku_variante' }
  ] },
  { nombre: 'stock', clave: 'clave', indices: [
    { nombre: 'sucursal_id', campo: 'sucursal_id' },
    { nombre: 'variante_producto_id', campo: 'variante_producto_id' }
  ] },
  { nombre: 'clientes', clave: 'id', indices: [
    { nombre: 'tenant_id', campo: 'tenant_id' },
    { nombre: 'nit_ci', campo: 'nit_ci' }
  ] },
  { nombre: 'configuracion', clave: 'clave' },
  { nombre: 'permisos', clave: 'clave' },
  { nombre: 'sesion', clave: 'clave' },
  { nombre: 'carrito', clave: 'uuid_carrito', indices: [
    { nombre: 'tenant_id', campo: 'tenant_id' },
    { nombre: 'estado', campo: 'estado' }
  ] },
  { nombre: 'ordenes_locales', clave: 'uuid_orden', indices: [
    { nombre: 'estado', campo: 'estado' },
    { nombre: 'tenant_id', campo: 'tenant_id' }
  ] },
  { nombre: 'operaciones', clave: 'uuid_operacion', indices: [
    { nombre: 'estado_sincronizacion', campo: 'estado_sincronizacion' },
    { nombre: 'secuencia_local', campo: 'secuencia_local' },
    { nombre: 'tipo_operacion', campo: 'tipo_operacion' }
  ] },
  { nombre: 'pagos', clave: 'uuid_pago', indices: [
    { nombre: 'estado', campo: 'estado' },
    { nombre: 'tenant_id', campo: 'tenant_id' }
  ] },
  { nombre: 'conflictos', clave: 'id', indices: [
    { nombre: 'resuelto', campo: 'resuelto' },
    { nombre: 'tenant_id', campo: 'tenant_id' }
  ] },
  { nombre: 'compensaciones', clave: 'id', indices: [
    { nombre: 'estado', campo: 'estado' },
    { nombre: 'tenant_id', campo: 'tenant_id' }
  ] },
  { nombre: 'comprobantes', clave: 'uuid_offline', indices: [
    { nombre: 'es_temporal', campo: 'es_temporal' }
  ] },
  { nombre: 'bitacora_local', clave: 'id', autoIncremento: true, indices: [
    { nombre: 'fecha', campo: 'fecha' },
    { nombre: 'tipo', campo: 'tipo' }
  ] }
];

@Injectable({ providedIn: 'root' })
export class IndexedDbService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private readonly dbNombre = environment.offlineDbNombre;
  private readonly dbVersion = environment.offlineDbVersion;

  abrir(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('IndexedDB no está disponible en este navegador.'));
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const intentar = () => {
        const solicitud = indexedDB.open(this.dbNombre, this.dbVersion);

        solicitud.onupgradeneeded = () => {
          const db = solicitud.result;
          for (const definicion of ALMACENES) {
            const store = db.objectStoreNames.contains(definicion.nombre)
              ? solicitud.transaction!.objectStore(definicion.nombre)
              : db.createObjectStore(definicion.nombre, {
                  keyPath: definicion.clave,
                  autoIncrement: definicion.autoIncremento === true
                });

            for (const indice of definicion.indices ?? []) {
              if (!store.indexNames.contains(indice.nombre)) {
                store.createIndex(indice.nombre, indice.campo, { unique: false });
              }
            }
          }
        };

        solicitud.onsuccess = () => {
          const db = solicitud.result;
          // Permite que otra pestaña suba la versión sin quedar bloqueada.
          db.onversionchange = () => db.close();
          resolve(db);
        };
        solicitud.onerror = () => {
          this.dbPromise = null;
          // Si quedó en v2 por un intento previo y ahora pedimos v1,
          // borra y reabre una sola vez en vez de dejar el spinner colgado.
          if (solicitud.error?.name === 'VersionError') {
            console.warn('IndexedDB en versión superior, recreando base local…');
            const borrado = indexedDB.deleteDatabase(this.dbNombre);
            borrado.onsuccess = () => {
              this.dbPromise = null;
              resolve(this.abrir());
            };
            borrado.onerror = () => reject(solicitud.error);
            borrado.onblocked = () => reject(new Error('Cierra las demás pestañas de FashionStore y recarga.'));
            return;
          }
          reject(solicitud.error ?? new Error('No se pudo abrir IndexedDB.'));
        };
        solicitud.onblocked = () => {
          // No rechazar: la petición sigue en espera hasta que la otra pestaña cierre.
          console.warn('IndexedDB bloqueada por otra pestaña, esperando…');
        };
      };
      intentar();
    });

    return this.dbPromise;
  }

  async guardar<T>(almacen: AlmacenOffline, registro: T): Promise<void> {
    const db = await this.abrir();
    await this.ejecutar(db, almacen, 'readwrite', (store) => store.put(registro as unknown as object));
  }

  async guardarLote<T>(almacen: AlmacenOffline, registros: T[]): Promise<void> {
    if (registros.length === 0) return;
    const db = await this.abrir();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(almacen, 'readwrite');
      const store = tx.objectStore(almacen);
      for (const registro of registros) store.put(registro as unknown as object);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Transacción abortada.'));
    });
  }

  async obtener<T>(almacen: AlmacenOffline, clave: IDBValidKey): Promise<T | null> {
    const db = await this.abrir();
    return new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(almacen, 'readonly');
      const solicitud = tx.objectStore(almacen).get(clave);
      solicitud.onsuccess = () => resolve((solicitud.result as T) ?? null);
      solicitud.onerror = () => reject(solicitud.error);
    });
  }

  async obtenerTodos<T>(almacen: AlmacenOffline): Promise<T[]> {
    const db = await this.abrir();
    return new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(almacen, 'readonly');
      const solicitud = tx.objectStore(almacen).getAll();
      solicitud.onsuccess = () => resolve((solicitud.result as T[]) ?? []);
      solicitud.onerror = () => reject(solicitud.error);
    });
  }

  async obtenerPorIndice<T>(almacen: AlmacenOffline, indice: string, valor: IDBValidKey): Promise<T[]> {
    const db = await this.abrir();
    return new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(almacen, 'readonly');
      const store = tx.objectStore(almacen);
      if (!store.indexNames.contains(indice)) {
        resolve([]);
        return;
      }
      const solicitud = store.index(indice).getAll(valor);
      solicitud.onsuccess = () => resolve((solicitud.result as T[]) ?? []);
      solicitud.onerror = () => reject(solicitud.error);
    });
  }

  async contar(almacen: AlmacenOffline): Promise<number> {
    const db = await this.abrir();
    return new Promise<number>((resolve, reject) => {
      const tx = db.transaction(almacen, 'readonly');
      const solicitud = tx.objectStore(almacen).count();
      solicitud.onsuccess = () => resolve(solicitud.result ?? 0);
      solicitud.onerror = () => reject(solicitud.error);
    });
  }

  async eliminar(almacen: AlmacenOffline, clave: IDBValidKey): Promise<void> {
    const db = await this.abrir();
    await this.ejecutar(db, almacen, 'readwrite', (store) => store.delete(clave));
  }

  /**
   * Borra los datos del tenant (RN-019, RNF-17). Los almacenes con índice
   * `tenant_id` se filtran; los de configuración/sesión se limpian porque son
   * de un único tenant por dispositivo. `meta` se conserva para no perder el
   * identificador estable del dispositivo.
   */
  async eliminarPorTenant(tenantId: number): Promise<void> {
    const db = await this.abrir();
    const almacenesConIndice = ALMACENES.filter((a) => a.indices?.some((i) => i.nombre === 'tenant_id'));
    const almacenesDeSesion: AlmacenOffline[] = ['configuracion', 'permisos', 'sesion'];

    for (const definicion of almacenesConIndice) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(definicion.nombre, 'readwrite');
        const store = tx.objectStore(definicion.nombre);
        const indice = store.index('tenant_id');
        const cursor = indice.openCursor(IDBKeyRange.only(tenantId));
        cursor.onsuccess = () => {
          const actual = cursor.result;
          if (!actual) return;
          actual.delete();
          actual.continue();
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new Error('Borrado por tenant abortado.'));
      });
    }

    for (const nombre of almacenesDeSesion) {
      await this.vaciarAlmacen(db, nombre);
    }
  }

  async vaciar(): Promise<void> {
    const db = await this.abrir();
    for (const definicion of ALMACENES) {
      await this.vaciarAlmacen(db, definicion.nombre);
    }
  }

  /** Uso estimado para `storage-quota.service` (RNF-14). */
  async usoEstimado(): Promise<UsoAlmacenamientoLocal> {
    const limiteBytes = environment.offlineMaxMbLocal * 1024 * 1024;
    let usadoBytes = 0;
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      const estimacion = await navigator.storage.estimate();
      usadoBytes = estimacion.usage ?? 0;
    }

    const almacenes = await Promise.all(ALMACENES.map(async (definicion) => ({
      nombre: definicion.nombre,
      registros: await this.contar(definicion.nombre).catch(() => 0)
    })));

    return {
      usadoBytes,
      limiteBytes,
      porcentaje: limiteBytes > 0 ? Math.min(100, Math.round((usadoBytes / limiteBytes) * 100)) : 0,
      almacenes
    };
  }

  listarAlmacenes(): AlmacenOffline[] {
    return ALMACENES.map((a) => a.nombre);
  }

  /** Solo para pruebas y para “eliminar datos locales” desde soporte. */
  async reiniciarBase(): Promise<void> {
    const db = await this.abrir();
    db.close();
    this.dbPromise = null;
    await new Promise<void>((resolve, reject) => {
      const solicitud = indexedDB.deleteDatabase(this.dbNombre);
      solicitud.onsuccess = () => resolve();
      solicitud.onerror = () => reject(solicitud.error);
      solicitud.onblocked = () => resolve();
    });
  }

  private ejecutar(
    db: IDBDatabase,
    almacen: AlmacenOffline,
    modo: IDBTransactionMode,
    operacion: (store: IDBObjectStore) => IDBRequest
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(almacen, modo);
      operacion(tx.objectStore(almacen));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Transacción abortada.'));
    });
  }

  private vaciarAlmacen(db: IDBDatabase, almacen: AlmacenOffline): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(almacen, 'readwrite');
      tx.objectStore(almacen).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Limpieza abortada.'));
    });
  }
}
