import { ConnectivityService } from '../connectivity.service';
import { DeviceService } from '../device.service';
import { IndexedDbService } from '../indexed-db.service';
import { OfflineAuditService } from '../offline-audit.service';
import {
  CarritoLocal,
  ComprobanteLocal,
  LogConflicto,
  OperacionOfflineLocal,
  OrdenLocal,
  PagoLocal,
  UsoAlmacenamientoLocal
} from '../../models/offline.model';
import { StorageService } from '../../services/storage.service';

/**
 * [EXAMEN-2] Dobles de prueba compartidos por las specs de la Fase 2.
 * No forman parte del bundle: solo los importan los archivos `*.spec.ts`.
 */

type Registro = Record<string, any>;

export interface MemoriaOffline {
  servicio: IndexedDbService;
  almacenes: Map<string, Map<IDBValidKey, Registro>>;
  uso: UsoAlmacenamientoLocal;
  sembrar(almacen: string, registro: Registro): void;
  todos<T = Registro>(almacen: string): T[];
  obtener<T = Registro>(almacen: string, clave: IDBValidKey): T | null;
}

function claveDe(almacen: string, registro: Registro, auto: { valor: number }): IDBValidKey {
  switch (almacen) {
    case 'meta':
    case 'sesion':
      return String(registro['clave'] ?? 'sesion');
    case 'operaciones':
      return String(registro['uuid_operacion']);
    case 'productos':
    case 'variantes':
    case 'clientes':
    case 'conflictos':
      return registro['id'] as IDBValidKey;
    case 'stock':
      return String(registro['clave'] ?? `${registro['variante_producto_id']}:${registro['sucursal_id']}`);
    case 'carrito':
      return String(registro['uuid_carrito']);
    case 'ordenes_locales':
      return String(registro['uuid_orden']);
    case 'pagos':
      return String(registro['uuid_pago']);
    case 'comprobantes':
      return String(registro['uuid_offline']);
    case 'bitacora_local':
      if (registro['id'] == null) {
        auto.valor += 1;
        registro['id'] = auto.valor;
      }
      return registro['id'] as IDBValidKey;
    default:
      return (registro['id'] ?? registro['clave']) as IDBValidKey;
  }
}

/** IndexedDB en memoria con la misma superficie que usa la capa offline. */
export function crearMemoriaOffline(): MemoriaOffline {
  const almacenes = new Map<string, Map<IDBValidKey, Registro>>();
  const auto = { valor: 0 };
  const uso: UsoAlmacenamientoLocal = {
    usadoBytes: 0,
    limiteBytes: 50 * 1024 * 1024,
    porcentaje: 0,
    almacenes: []
  };

  const mapa = (nombre: string): Map<IDBValidKey, Registro> => {
    if (!almacenes.has(nombre)) almacenes.set(nombre, new Map());
    return almacenes.get(nombre) as Map<IDBValidKey, Registro>;
  };

  const guardar = async (almacen: string, registro: Registro): Promise<void> => {
    mapa(almacen).set(claveDe(almacen, registro, auto), { ...registro });
  };

  const servicio = {
    guardar,
    guardarLote: async (almacen: string, registros: Registro[]) => {
      for (const registro of registros) await guardar(almacen, registro);
    },
    obtener: async (almacen: string, clave: IDBValidKey) => mapa(almacen).get(clave) ?? null,
    obtenerTodos: async (almacen: string) => [...mapa(almacen).values()],
    obtenerPorIndice: async (almacen: string, indice: string, valor: IDBValidKey) =>
      [...mapa(almacen).values()].filter((registro) => registro[indice] === valor),
    contar: async (almacen: string) => mapa(almacen).size,
    eliminar: async (almacen: string, clave: IDBValidKey) => {
      mapa(almacen).delete(clave);
    },
    eliminarPorTenant: async (tenantId: number) => {
      for (const registros of almacenes.values()) {
        for (const [clave, registro] of registros) {
          if (registro['tenant_id'] === tenantId) registros.delete(clave);
        }
      }
    },
    vaciar: async () => almacenes.clear(),
    usoEstimado: async () => ({
      ...uso,
      porcentaje: uso.limiteBytes > 0 ? (uso.usadoBytes / uso.limiteBytes) * 100 : 0
    }),
    listarAlmacenes: () => [...almacenes.keys()],
    reiniciarBase: async () => almacenes.clear()
  } as unknown as IndexedDbService;

  return {
    servicio,
    almacenes,
    uso,
    sembrar: (almacen: string, registro: Registro) => {
      mapa(almacen).set(claveDe(almacen, registro, auto), { ...registro });
    },
    todos: <T = Registro>(almacen: string) => [...mapa(almacen).values()] as T[],
    obtener: <T = Registro>(almacen: string, clave: IDBValidKey) =>
      (mapa(almacen).get(clave) ?? null) as T | null
  };
}

export interface OpcionesStorage {
  tenantId?: number;
  usuarioId?: number;
  sucursalId?: number | null;
  dispositivoId?: string;
}

export function crearStorageFalso(opciones: OpcionesStorage = {}): StorageService {
  const {
    tenantId = 10,
    usuarioId = 7,
    sucursalId = 2,
    dispositivoId = 'dev-1'
  } = opciones;

  return {
    getAccessToken: () => 'token-falso',
    getTenantActivo: () => ({ id: tenantId }),
    getUser: () => ({ id: usuarioId, sucursal_id: sucursalId }),
    getDispositivoId: () => dispositivoId,
    setUser: () => undefined,
    setTenantActivo: () => undefined
  } as unknown as StorageService;
}

export function crearDeviceFalso(dispositivoId = 'dev-1'): DeviceService {
  return {
    obtenerDispositivoId: () => dispositivoId,
    obtenerNombreDispositivo: () => 'Caja 1'
  } as unknown as DeviceService;
}

export interface ConectividadFalsa {
  servicio: ConnectivityService;
  cambiar(estado: boolean): void;
  estado(): boolean;
  dispararRecuperacion(): void;
}

export function crearConectividadFalsa(inicial = true): ConectividadFalsa {
  let enLinea = inicial;
  const callbacks = new Set<() => void>();

  const servicio = {
    enLinea: () => enLinea,
    calidad: () => (enLinea ? 'ESTABLE' : 'SIN_CONEXION'),
    alRecuperarConexion: (callback: () => void) => {
      callbacks.add(callback);
      return () => callbacks.delete(callback);
    }
  } as unknown as ConnectivityService;

  return {
    servicio,
    cambiar: (estado: boolean) => {
      enLinea = estado;
    },
    estado: () => enLinea,
    dispararRecuperacion: () => {
      enLinea = true;
      callbacks.forEach((callback) => callback());
    }
  };
}

export interface AuditoriaFalsa {
  servicio: OfflineAuditService;
  eventos: Array<{ tipo: string; mensaje: string; detalle?: Record<string, unknown> }>;
}

export function crearAuditoriaFalsa(): AuditoriaFalsa {
  const eventos: Array<{ tipo: string; mensaje: string; detalle?: Record<string, unknown> }> = [];
  const servicio = {
    registrar: async (evento: { tipo: string; mensaje: string; detalle?: Record<string, unknown> }) => {
      eventos.push(evento);
    }
  } as unknown as OfflineAuditService;
  return { servicio, eventos };
}

export function crearOperacionFalsa(
  parcial: Partial<OperacionOfflineLocal> = {}
): OperacionOfflineLocal {
  return {
    uuid_operacion: 'op-1',
    tipo_operacion: 'RESERVA',
    secuencia_local: 1,
    payload: {},
    estado_sincronizacion: 'PENDIENTE',
    intentos: 0,
    tenant_id: 10,
    dispositivo_id: 'dev-1',
    usuario_id: 7,
    sucursal_id: 2,
    fecha_registro_local: '2026-11-01T10:00:00.000Z',
    fecha_ultimo_intento: null,
    error_detalle: null,
    motivo_rechazo: null,
    hash_payload: 'hash-1',
    programado_para: null,
    requiere_revision: false,
    resultado_json: null,
    updated_at: '2026-11-01T10:00:00.000Z',
    ...parcial
  };
}

export function crearOrdenFalsa(parcial: Partial<OrdenLocal> = {}): OrdenLocal {
  return {
    uuid_orden: 'orden-1',
    uuid_carrito: 'carrito-1',
    uuid_pago: 'pago-1',
    tenant_id: 10,
    dispositivo_id: 'dev-1',
    usuario_id: 7,
    cliente_id: 5,
    sucursal_id: 2,
    estado: 'PENDIENTE_PAGO_DIFERIDO',
    total_local: 250,
    moneda: 'BOB',
    items: 2,
    expira_en: new Date(Date.now() + 3_600_000).toISOString(),
    created_at: '2026-11-01T10:00:00.000Z',
    updated_at: '2026-11-01T10:00:00.000Z',
    error_detalle: null,
    ...parcial
  };
}

export function crearPagoFalso(parcial: Partial<PagoLocal> = {}): PagoLocal {
  return {
    uuid_pago: 'pago-1',
    uuid_orden: 'orden-1',
    tenant_id: 10,
    dispositivo_id: 'dev-1',
    usuario_id: 7,
    monto: 250,
    moneda: 'BOB',
    estado: 'PENDIENTE_ENVIO',
    intentos: 0,
    fecha_expiracion: new Date(Date.now() + 3_600_000).toISOString(),
    fecha_ultimo_intento: null,
    ultimo_error: null,
    motivo_rechazo: null,
    simulado: false,
    updated_at: '2026-11-01T10:00:00.000Z',
    pago_id: null,
    orden_id: null,
    requiere_accion: false,
    ...parcial
  };
}

export function crearCarritoFalso(
  parcial: Partial<CarritoLocal> = {}
): CarritoLocal {
  return {
    uuid_carrito: 'carrito-1',
    tenant_id: 10,
    dispositivo_id: 'dev-1',
    usuario_id: 7,
    cliente_id: 5,
    sucursal_id: 2,
    items: [],
    subtotal_local: 0,
    descuento_local: 0,
    total_local: 0,
    estado: 'ACTIVO',
    cupon_codigo: null,
    cupon_bloqueado: false,
    precios_referenciales: true,
    sello_local: '',
    updated_at: '2026-11-01T10:00:00.000Z',
    ...parcial
  };
}

export function crearConflictoFalso(
  parcial: Partial<LogConflicto> = {}
): LogConflicto {
  return {
    id: 1,
    operacion_offline_id: 1,
    uuid_operacion: 'op-1',
    tipo_conflicto: 'STOCK_INSUFICIENTE',
    resuelto: false,
    fecha: '2026-11-01T10:00:00.000Z',
    fecha_resolucion: null,
    detalle_json: { motivo: 'Stock insuficiente' },
    tenant_id: 10,
    ...parcial
  };
}

export function crearComprobanteFalso(
  parcial: Partial<ComprobanteLocal> = {}
): ComprobanteLocal {
  return {
    uuid_offline: 'comp-1',
    tenant_id: 10,
    dispositivo_id: 'dev-1',
    tipo: 'VENTA_CONTADO',
    numero_temporal: 'VTA-20261101-0001',
    es_temporal: true,
    reemplazado_por: null,
    total: 100,
    moneda: 'BOB',
    sucursal_id: 2,
    cliente_id: null,
    detalle: ['1 x variante 101'],
    leyenda: 'Comprobante temporal',
    created_at: '2026-11-01T10:00:00.000Z',
    ...parcial
  };
}
