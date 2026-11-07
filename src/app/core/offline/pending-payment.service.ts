import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  OrdenLocal,
  PagoLocal
} from '../models/offline.model';
import {
  CrearPagoDiferidoRequest,
  EstadoPagoDiferido,
  PagoDiferido,
  ResultadoPagoDiferido
} from '../models/pago-diferido.model';
import { IndexedDbService } from './indexed-db.service';
import { ConnectivityService } from './connectivity.service';
import { StorageService } from '../services/storage.service';
import { PagosDiferidosApiService, FiltrosPagosDiferidos } from '../services/pagos-diferidos-api.service';
import { OfflineQueueService } from './offline-queue.service';
import { OfflineAuditService } from './offline-audit.service';
import { StockWebSocketService } from '../services/stock-websocket.service';
import { OfflineSessionService } from './offline-session.service';
import { EventoPagoWs } from '../models/offline.model';

export interface PreparacionPago {
  uuidPago: string;
  pago: ResultadoPagoDiferido | null;
  clientSecret: string | null;
  requiereAccion: boolean;
  checkoutUrl: string | null;
  pendienteOrden: boolean;
  mensaje: string;
}

export interface ResultadoStripeJs {
  disponible: boolean;
  usarRedireccion: boolean;
  clientSecret: string | null;
  clavePublica: string | null;
  mensaje: string;
}

const ESTADOS_PENDIENTES: EstadoPagoDiferido[] = [
  'PENDIENTE_ENVIO',
  'EN_COLA',
  'EN_PROCESO',
  'REQUIERE_ACCION_CLIENTE'
];

const ESTADOS_TERMINALES: EstadoPagoDiferido[] = [
  'CONFIRMADO',
  'RECHAZADO',
  'EXPIRADO',
  'REEMBOLSADO',
  'CANCELADO',
  'ERROR_CRITICO'
];

/**
 * [EXAMEN-2] CU16 / RN-015 / RN-016: pago diferido y conciliación local.
 * El `client_secret` se conserva solo en memoria; nunca se persiste localmente.
 */
@Injectable({ providedIn: 'root' })
export class PendingPaymentService {
  private indexedDb = inject(IndexedDbService);
  private connectivity = inject(ConnectivityService);
  private storage = inject(StorageService);
  private paymentsApi = inject(PagosDiferidosApiService);
  private queue = inject(OfflineQueueService);
  private audit = inject(OfflineAuditService);
  private websocket = inject(StockWebSocketService);
  private offlineSession = inject(OfflineSessionService);

  public pagosPendientes = signal<number>(0);
  public montoEnCola = signal<number>(0);
  public requierenAccion = signal<PagoLocal[]>([]);

  private secretos = new Map<string, string>();
  private cerrarEscucha: (() => void) | null = null;

  async encolarPago(ordenLocal: OrdenLocal): Promise<PagoLocal> {
    const uuidPago = ordenLocal.uuid_pago ?? this.generarUuid();
    const existente = await this.indexedDb.obtener<PagoLocal>('pagos', uuidPago);
    if (existente) return existente;

    const pago: PagoLocal = {
      uuid_pago: uuidPago,
      uuid_orden: ordenLocal.uuid_orden,
      tenant_id: ordenLocal.tenant_id,
      dispositivo_id: ordenLocal.dispositivo_id,
      usuario_id: ordenLocal.usuario_id,
      monto: ordenLocal.total_local,
      moneda: ordenLocal.moneda,
      estado: 'PENDIENTE_ENVIO',
      intentos: 0,
      fecha_expiracion: ordenLocal.expira_en ?? this.expiracionPorDefecto(),
      fecha_ultimo_intento: null,
      ultimo_error: null,
      motivo_rechazo: null,
      simulado: false,
      updated_at: new Date().toISOString(),
      pago_id: null,
      orden_id: null,
      requiere_accion: false
    };

    await this.indexedDb.guardar('pagos', pago);
    await this.refrescarContadores();
    return pago;
  }

  /** Envía en FIFO los pagos cuya orden local ya fue confirmada por el servidor. */
  async enviarPendientes(): Promise<PreparacionPago[]> {
    const pagos = await this.pagosLocales();
    const pendientes = pagos
      .filter((pago) => pago.estado === 'PENDIENTE_ENVIO')
      .sort((a, b) => Date.parse(a.updated_at) - Date.parse(b.updated_at));

    const resultados: PreparacionPago[] = [];
    for (const pago of pendientes) {
      resultados.push(await this.enviarPago(pago));
    }
    await this.refrescarContadores();
    return resultados;
  }

  /** Pide el `PaymentIntent` al backend o reutiliza el pago local ya creado. */
  async crearOConfirmarPago(uuidPago: string): Promise<PreparacionPago> {
    const local = await this.indexedDb.obtener<PagoLocal>('pagos', uuidPago);
    if (!local) {
      if (!this.connectivity.enLinea()) {
        throw new Error('El pago no está disponible sin conexión.');
      }
      const remoto = await this.primero(this.paymentsApi.obtenerPago(uuidPago));
      return this.prepararDesdeRemoto(remoto);
    }
    return this.enviarPago(local);
  }

  /** Informa al backend la confirmación del cliente y guarda el resultado verificado. */
  async confirmarConStripe(resultado: ResultadoPagoDiferido | { uuid_pago: string }): Promise<PagoLocal> {
    const remoto = await this.primero(this.paymentsApi.confirmarPago(resultado.uuid_pago));
    return this.actualizarDesdeRemoto(remoto);
  }

  async reintentar(uuidPago: string): Promise<PagoLocal> {
    const local = await this.obtenerLocal(uuidPago);
    if (!local) throw new Error('No se encontró el pago local.');

    if (!this.connectivity.enLinea()) {
      const actualizado = await this.guardar({
        ...local,
        intentos: local.intentos + 1,
        estado: 'PENDIENTE_ENVIO',
        fecha_ultimo_intento: new Date().toISOString(),
        ultimo_error: 'Sin conexión: el reintento se procesará al recuperar la red.'
      });
      await this.audit.registrar({
        tipo: 'PAGO',
        mensaje: 'Reintento de pago diferido encolado sin conexión.',
        detalle: { uuid_pago: uuidPago }
      });
      return actualizado;
    }

    try {
      const remoto = await this.primero(this.paymentsApi.reintentarPago(uuidPago));
      return await this.actualizarDesdeRemoto(remoto);
    } catch (error) {
      const intentos = local.intentos + 1;
      const agotado = intentos >= environment.pagoDiferidoMaxReintentos;
      const actualizado = await this.guardar({
        ...local,
        intentos,
        estado: agotado ? 'ERROR_CRITICO' : 'RECHAZADO',
        fecha_ultimo_intento: new Date().toISOString(),
        ultimo_error: this.mensajeError(error),
        motivo_rechazo: agotado ? 'Se agotaron los reintentos automáticos.' : local.motivo_rechazo ?? null
      });
      await this.audit.registrar({
        tipo: 'ERROR',
        mensaje: agotado
          ? 'Pago diferido con error crítico tras agotar reintentos.'
          : 'Reintento de pago diferido rechazado.',
        detalle: { uuid_pago: uuidPago, intentos, error: this.mensajeError(error) }
      });
      return actualizado;
    }
  }

  async cancelar(uuidPago: string): Promise<PagoLocal> {
    const local = await this.obtenerLocal(uuidPago);
    const remoto = this.connectivity.enLinea()
      ? await this.primero(this.paymentsApi.cancelarPago(uuidPago)).catch(() => null)
      : null;

    const estado: EstadoPagoDiferido = this.normalizarEstado(remoto?.estado ?? 'CANCELADO');
    const pago: PagoLocal = {
      ...(local ?? this.pagoBase(uuidPago)),
      estado,
      updated_at: new Date().toISOString()
    };
    await this.indexedDb.guardar('pagos', pago);
    await this.cancelarOrdenLocal(pago.uuid_orden ?? null);
    await this.refrescarContadores();
    await this.audit.registrar({
      tipo: 'PAGO',
      mensaje: 'Pago diferido cancelado y stock liberado.',
      detalle: { uuid_pago: uuidPago }
    });
    return pago;
  }

  async estado(uuidPago: string): Promise<PagoLocal | PagoDiferido | null> {
    if (!this.connectivity.enLinea()) return this.obtenerLocal(uuidPago);
    try {
      const remoto = await this.primero(this.paymentsApi.obtenerPago(uuidPago));
      return await this.actualizarDesdeRemoto(remoto);
    } catch {
      return this.obtenerLocal(uuidPago);
    }
  }

  async listarPendientes(filtros: FiltrosPagosDiferidos = {}): Promise<Array<PagoLocal | PagoDiferido>> {
    if (this.connectivity.enLinea()) {
      try {
        const remotos = await this.primero(this.paymentsApi.listarPagos(filtros));
        await this.cachearRemotos(remotos);
        return remotos;
      } catch {
        // Caché local.
      }
    }
    const locales = await this.pagosLocales();
    return locales
      .filter((pago) => filtros.estado ? pago.estado === filtros.estado : ESTADOS_PENDIENTES.includes(pago.estado))
      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  }

  /**
   * Sin `@stripe/stripe-js` instalado se usa la redirección al checkout del
   * backend (desviación documentada); si Stripe.js ya está cargado, se informa.
   */
  enriquecerConStripeJs(clientSecret: string | null, clavePublica: string | null): ResultadoStripeJs {
    const cargado = typeof window !== 'undefined'
      && !!(window as unknown as { Stripe?: unknown }).Stripe;

    if (cargado && clientSecret) {
      return {
        disponible: true,
        usarRedireccion: false,
        clientSecret,
        clavePublica,
        mensaje: 'Stripe.js está disponible; completa el pago con 3D Secure.'
      };
    }
    return {
      disponible: false,
      usarRedireccion: true,
      clientSecret,
      clavePublica,
      mensaje: 'Stripe.js no está instalado en esta compilación; se usará la redirección segura al checkout.'
    };
  }

  redirigirACheckout(url: string | null | undefined): boolean {
    if (!url || typeof window === 'undefined') return false;
    window.location.assign(url);
    return true;
  }

  /** RN-016: marca vencidos y libera el stock reservado localmente. */
  async detectarExpiracion(): Promise<number> {
    const ahora = Date.now();
    const pagos = await this.pagosLocales();
    let expirados = 0;

    for (const pago of pagos) {
      if (ESTADOS_TERMINALES.includes(pago.estado)) continue;
      if (!pago.fecha_expiracion || Date.parse(pago.fecha_expiracion) > ahora) continue;
      await this.guardar({
        ...pago,
        estado: 'EXPIRADO',
        ultimo_error: 'El pago superó su vigencia y el stock fue liberado.',
        updated_at: new Date().toISOString()
      });
      await this.cancelarOrdenLocal(pago.uuid_orden ?? null, 'EXPIRADA');
      expirados += 1;
    }

    if (expirados > 0) {
      await this.audit.registrar({
        tipo: 'PAGO',
        mensaje: `${expirados} pagos diferidos expiraron y liberaron su stock.`
      });
      await this.refrescarContadores();
    }
    return expirados;
  }

  async procesarWebhookNotificado(evento: EventoPagoWs): Promise<PagoLocal | null> {
    const uuidPago = String(evento['uuid_pago'] ?? '');
    if (!uuidPago) return null;
    const local = await this.obtenerLocal(uuidPago);
    if (!local) return null;

    const estado = this.normalizarEstado(String(evento['estado'] ?? local.estado));
    const actualizado = await this.guardar({
      ...local,
      estado,
      pago_id: typeof evento['pago_id'] === 'number' ? evento['pago_id'] : local.pago_id,
      ultimo_error: typeof evento['motivo'] === 'string' ? evento['motivo'] : local.ultimo_error,
      updated_at: new Date().toISOString()
    });

    if (estado === 'CONFIRMADO') {
      await this.marcarOrdenConfirmada(local.uuid_orden ?? null);
    } else if (estado === 'RECHAZADO' || estado === 'EXPIRADO' || estado === 'CANCELADO') {
      await this.cancelarOrdenLocal(local.uuid_orden ?? null, estado === 'EXPIRADO' ? 'EXPIRADA' : 'CANCELADA');
    } else if (estado === 'REEMBOLSADO') {
      await this.cancelarOrdenLocal(local.uuid_orden ?? null, 'CANCELADA');
    }

    await this.refrescarContadores();
    return actualizado;
  }

  async contarPendientes(): Promise<number> {
    // Sin sesión no se llama al backend (exige token, 403 Token ausente):
    // se usa directo el conteo local.
    const haySesion = !!this.storage.getAccessToken?.();
    if (haySesion && this.connectivity.enLinea()) {
      try {
        const respuesta = await this.primero(this.paymentsApi.contarPendientes());
        this.pagosPendientes.set(respuesta.pendientes);
        return respuesta.pendientes;
      } catch {
        // Conteo local.
      }
    }
    const locales = (await this.pagosLocales()).filter((pago) => ESTADOS_PENDIENTES.includes(pago.estado));
    this.pagosPendientes.set(locales.length);
    return locales.length;
  }

  async avisarRequiereAccion(): Promise<PagoLocal[]> {
    const locales = (await this.pagosLocales()).filter((pago) => pago.estado === 'REQUIERE_ACCION_CLIENTE');
    this.requierenAccion.set(locales);
    return locales;
  }

  activarEscuchaPagos(): void {
    if (this.cerrarEscucha) return;
    const tenantId = this.storage.getTenantActivo<{ id: number }>()?.id;
    if (!tenantId) return;
    this.cerrarEscucha = this.websocket.suscribirPagos(
      tenantId,
      this.offlineSession.tokenOffline(),
      (evento) => { void this.procesarWebhookNotificado(evento); }
    );
  }

  detenerEscuchaPagos(): void {
    this.cerrarEscucha?.();
    this.cerrarEscucha = null;
  }

  async refrescarContadores(): Promise<void> {
    const [pendientes, accion] = await Promise.all([
      this.contarPendientesLocal(),
      this.avisarRequiereAccion()
    ]);
    const locales = await this.pagosLocales();
    this.montoEnCola.set(
      locales.filter((pago) => !ESTADOS_TERMINALES.includes(pago.estado))
        .reduce((suma, pago) => suma + Number(pago.monto || 0), 0)
    );
    this.pagosPendientes.set(pendientes);
    this.requierenAccion.set(accion);
  }

  /** Registro local para que la pantalla de checkout muestre el pago creado. */
  async obtenerLocal(uuidPago: string): Promise<PagoLocal | null> {
    return this.indexedDb.obtener<PagoLocal>('pagos', uuidPago);
  }

  async listarEventos(pagoId: number): Promise<import('../models/pago-diferido.model').EventoStripe[]> {
    return this.primero(this.paymentsApi.listarEventos(pagoId));
  }

  async reembolsar(pagoId: number, monto?: number, motivo?: string): Promise<import('../models/pago-diferido.model').ResultadoReembolso> {
    const resultado = await this.primero(this.paymentsApi.reembolsar(pagoId, { monto, motivo }));
    const locales = await this.pagosLocales();
    const local = locales.find((pago) => pago.pago_id === pagoId);
    if (local) {
      await this.guardar({ ...local, estado: 'REEMBOLSADO', updated_at: new Date().toISOString() });
      await this.cancelarOrdenLocal(local.uuid_orden ?? null, 'CANCELADA');
    }
    await this.refrescarContadores();
    return resultado;
  }

  // ----------------------------- internos -----------------------------

  private async enviarPago(local: PagoLocal): Promise<PreparacionPago> {
    const orden = local.uuid_orden
      ? await this.indexedDb.obtener<OrdenLocal>('ordenes_locales', local.uuid_orden)
      : null;

    const operacion = await this.operacionDeOrden(local);
    const ordenConfirmada = !operacion
      || operacion.estado_sincronizacion === 'CONFIRMADA'
      || operacion.estado_sincronizacion === 'DUPLICADA';

    if (!ordenConfirmada) {
      return {
        uuidPago: local.uuid_pago,
        pago: null,
        clientSecret: null,
        requiereAccion: false,
        checkoutUrl: null,
        pendienteOrden: true,
        mensaje: 'El pedido aún no fue confirmado por el servidor; el pago se enviará después.'
      };
    }

    const datos: CrearPagoDiferidoRequest = {
      uuid_pago: local.uuid_pago,
      uuid_orden: orden?.uuid_orden,
      uuid_carrito: orden?.uuid_carrito,
      monto: local.monto,
      moneda: local.moneda,
      acepta_nuevo_total: true
    };

    const remoto = await this.primero(this.paymentsApi.crearPago(datos));
    await this.actualizarDesdeRemoto(remoto);
    return this.prepararDesdeRemoto(remoto);
  }

  private prepararDesdeRemoto(remoto: ResultadoPagoDiferido): PreparacionPago {
    const secret = remoto.client_secret ?? null;
    if (secret) this.secretos.set(remoto.uuid_pago, secret);
    return {
      uuidPago: remoto.uuid_pago,
      pago: remoto,
      clientSecret: secret,
      requiereAccion: remoto.requiere_accion,
      checkoutUrl: remoto.checkout_url ?? null,
      pendienteOrden: false,
      mensaje: remoto.requiere_accion
        ? 'El banco solicita autenticación adicional (3D Secure) para completar el pago.'
        : remoto.estado === 'CONFIRMADO'
          ? 'Pago confirmado.'
          : 'Pago creado; completa la confirmación con tarjeta.'
    };
  }

  private async actualizarDesdeRemoto(remoto: ResultadoPagoDiferido): Promise<PagoLocal> {
    const local = await this.obtenerLocal(remoto.uuid_pago);
    const pago: PagoLocal = {
      ...(local ?? this.pagoBase(remoto.uuid_pago)),
      uuid_pago: remoto.uuid_pago,
      pago_id: remoto.id,
      orden_id: remoto.orden_id,
      monto: Number(remoto.monto),
      moneda: remoto.moneda,
      estado: this.normalizarEstado(remoto.estado),
      intentos: remoto.intentos,
      stripe_payment_intent_id: remoto.stripe_payment_intent_id ?? null,
      fecha_expiracion: remoto.fecha_expiracion ?? local?.fecha_expiracion ?? null,
      fecha_ultimo_intento: remoto.fecha_ultimo_intento ?? null,
      ultimo_error: remoto.ultimo_error ?? null,
      motivo_rechazo: remoto.motivo_rechazo ?? null,
      simulado: remoto.simulado ?? false,
      requiere_accion: remoto.requiere_accion,
      updated_at: new Date().toISOString()
    };
    // RNF-15: el client_secret no se persiste en IndexedDB.
    await this.guardar(pago);
    if (remoto.estado === 'CONFIRMADO') {
      await this.marcarOrdenConfirmada(pago.uuid_orden ?? null);
    }
    await this.refrescarContadores();
    return pago;
  }

  private async cachearRemotos(remotos: PagoDiferido[]): Promise<void> {
    const tenantId = this.storage.getTenantActivo<{ id: number }>()?.id ?? 0;
    const locales = await this.indexedDb.obtenerTodos<PagoLocal>('pagos');
    const porUuid = new Map(locales.map((pago) => [pago.uuid_pago, pago]));

    for (const remoto of remotos) {
      const existente = porUuid.get(remoto.uuid_pago);
      await this.indexedDb.guardar('pagos', {
        ...(existente ?? this.pagoBase(remoto.uuid_pago)),
        uuid_pago: remoto.uuid_pago,
        pago_id: remoto.id,
        orden_id: remoto.orden_id,
        monto: Number(remoto.monto),
        moneda: remoto.moneda,
        estado: this.normalizarEstado(remoto.estado),
        intentos: remoto.intentos,
        fecha_expiracion: remoto.fecha_expiracion ?? null,
        fecha_ultimo_intento: remoto.fecha_ultimo_intento ?? null,
        ultimo_error: remoto.ultimo_error ?? null,
        motivo_rechazo: remoto.motivo_rechazo ?? null,
        simulado: remoto.simulado ?? false,
        requiere_accion: remoto.requiere_accion,
        tenant_id: existente?.tenant_id ?? tenantId,
        updated_at: new Date().toISOString()
      } satisfies PagoLocal);
    }
  }

  private async operacionDeOrden(local: PagoLocal) {
    const operaciones = await this.queue.listarTodas();
    return operaciones
      .filter((operacion) => operacion.payload['uuid_pago'] === local.uuid_pago
        || (local.uuid_orden != null && operacion.payload['uuid_orden'] === local.uuid_orden))
      .sort((a, b) => b.secuencia_local - a.secuencia_local)[0] ?? null;
  }

  private async pagosLocales(): Promise<PagoLocal[]> {
    const pagos = await this.indexedDb.obtenerTodos<PagoLocal>('pagos');
    const tenantId = this.storage.getTenantActivo<{ id: number }>()?.id;
    return tenantId == null ? pagos : pagos.filter((pago) => pago.tenant_id === tenantId);
  }

  private async contarPendientesLocal(): Promise<number> {
    return (await this.pagosLocales()).filter((pago) => ESTADOS_PENDIENTES.includes(pago.estado)).length;
  }

  private async guardar(pago: PagoLocal): Promise<PagoLocal> {
    const sanitizado: PagoLocal = { ...pago, client_secret: undefined };
    await this.indexedDb.guardar('pagos', sanitizado);
    return sanitizado;
  }

  private async marcarOrdenConfirmada(uuidOrden: string | null): Promise<void> {
    if (!uuidOrden) return;
    const orden = await this.indexedDb.obtener<OrdenLocal>('ordenes_locales', uuidOrden);
    if (!orden) return;
    await this.indexedDb.guardar('ordenes_locales', {
      ...orden,
      estado: 'CONFIRMADA',
      updated_at: new Date().toISOString()
    } satisfies OrdenLocal);
  }

  private async cancelarOrdenLocal(
    uuidOrden: string | null,
    estado: OrdenLocal['estado'] = 'CANCELADA'
  ): Promise<void> {
    if (!uuidOrden) return;
    const orden = await this.indexedDb.obtener<OrdenLocal>('ordenes_locales', uuidOrden);
    if (!orden) return;
    await this.indexedDb.guardar('ordenes_locales', {
      ...orden,
      estado,
      updated_at: new Date().toISOString()
    } satisfies OrdenLocal);
  }

  private pagoBase(uuidPago: string): PagoLocal {
    return {
      uuid_pago: uuidPago,
      uuid_orden: null,
      tenant_id: this.storage.getTenantActivo<{ id: number }>()?.id ?? 0,
      dispositivo_id: this.storage.getDispositivoId() ?? '',
      usuario_id: this.storage.getUser<{ id: number }>()?.id ?? 0,
      monto: 0,
      moneda: 'BOB',
      estado: 'PENDIENTE_ENVIO',
      intentos: 0,
      fecha_expiracion: this.expiracionPorDefecto(),
      fecha_ultimo_intento: null,
      ultimo_error: null,
      motivo_rechazo: null,
      simulado: false,
      updated_at: new Date().toISOString(),
      pago_id: null,
      orden_id: null,
      requiere_accion: false
    };
  }

  private normalizarEstado(estado: string): EstadoPagoDiferido {
    const normalizado = String(estado ?? '').toUpperCase();
    const conocidos: EstadoPagoDiferido[] = [
      'PENDIENTE_ENVIO', 'EN_COLA', 'EN_PROCESO', 'REQUIERE_ACCION_CLIENTE',
      'CONFIRMADO', 'RECHAZADO', 'EXPIRADO', 'REEMBOLSADO', 'CANCELADO', 'ERROR_CRITICO'
    ];
    if (conocidos.includes(normalizado as EstadoPagoDiferido)) {
      return normalizado as EstadoPagoDiferido;
    }
    if (normalizado === 'DUPLICADA' || normalizado === 'DUPLICADO') return 'CONFIRMADO';
    return 'EN_PROCESO';
  }

  private expiracionPorDefecto(): string {
    return new Date(Date.now() + environment.pagoDiferidoVigenciaHoras * 3_600_000).toISOString();
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

  private mensajeError(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error !== null) {
      const detalle = (error as { error?: { detail?: string } }).error?.detail;
      if (detalle) return detalle;
    }
    return 'Error al procesar el pago diferido';
  }

  private primero<T>(observable: import('rxjs').Observable<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      observable.subscribe({ next: resolve, error: reject });
    });
  }
}
