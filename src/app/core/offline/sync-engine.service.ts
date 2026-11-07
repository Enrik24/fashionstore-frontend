import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  LoteSincronizacion,
  OperacionOfflineLocal,
  ResultadoOperacion
} from '../models/offline.model';
import { OfflineApiService } from '../services/offline-api.service';
import { StockWebSocketService } from '../services/stock-websocket.service';
import { StorageService } from '../services/storage.service';
import { ConnectivityService } from './connectivity.service';
import { OfflineQueueService } from './offline-queue.service';
import { ConflictService } from './conflict.service';
import { OfflineAuditService } from './offline-audit.service';
import { OfflineSessionService } from './offline-session.service';

export type EstadoMotorSync = 'IDLE' | 'SINCRONIZANDO' | 'ERROR' | 'SIN_RED';

export interface ProgresoSincronizacion {
  enviadas: number;
  total: number;
}

export interface ResultadoSincronizacion {
  loteId: string;
  recibidas: number;
  procesadas: number;
  confirmadas: number;
  duplicadas: number;
  rechazadas: number;
  conflictos: number;
  erroresCriticos: number;
  texto: string;
  vacio: boolean;
}

export interface CierreConPendientes {
  pendientes: number;
  puedeCerrar: boolean;
  mensaje: string;
}

/**
 * [EXAMEN-2] CU08 / RNF-18: motor de sincronización con lotes FIFO,
 * reintentos con retroceso exponencial y WebSocket.
 */
@Injectable({ providedIn: 'root' })
export class SyncEngineService {
  private offlineApi = inject(OfflineApiService);
  private queue = inject(OfflineQueueService);
  private connectivity = inject(ConnectivityService);
  private conflict = inject(ConflictService);
  private audit = inject(OfflineAuditService);
  private storage = inject(StorageService);
  private websocket = inject(StockWebSocketService);
  private offlineSession = inject(OfflineSessionService);

  public estado = signal<EstadoMotorSync>(this.connectivity.enLinea() ? 'IDLE' : 'SIN_RED');
  public progreso = signal<ProgresoSincronizacion>({ enviadas: 0, total: 0 });
  public ultimoResultado = signal<ResultadoSincronizacion | null>(null);
  public pendientes = signal<number>(0);
  public conflictosPendientes = signal<number>(0);

  private iniciado = false;
  private sincronizando = false;
  private quitarListenerOnline: (() => void) | null = null;
  private quitarListenerVisibilidad: (() => void) | null = null;
  private cerrarEscucha: (() => void) | null = null;
  private temporizadorReintento: ReturnType<typeof setTimeout> | null = null;

  /** Arranca el motor al abrir la aplicación. */
  iniciar(): void {
    if (this.iniciado) return;
    this.iniciado = true;

    this.programarPorEventoOnline();
    this.programarPorVisibilidad();
    void this.refrescarContadores();

    if (this.connectivity.enLinea()) {
      void this.sincronizarAhora();
    }
  }

  /** Disparo manual desde el banner o el `sync-center`. */
  async sincronizarAhora(incluirProgramadas = false): Promise<ResultadoSincronizacion | null> {
    if (!this.connectivity.enLinea()) {
      this.estado.set('SIN_RED');
      await this.refrescarContadores();
      return null;
    }
    if (this.sincronizando) return this.ultimoResultado();

    this.sincronizando = true;
    this.estado.set('SINCRONIZANDO');

    const agregado: ResultadoSincronizacion = {
      loteId: '',
      recibidas: 0,
      procesadas: 0,
      confirmadas: 0,
      duplicadas: 0,
      rechazadas: 0,
      conflictos: 0,
      erroresCriticos: 0,
      texto: 'Sin operaciones pendientes',
      vacio: true
    };

    try {
      // Varios lotes consecutivos, con un tope para no bloquear la interfaz.
      for (let vuelta = 0; vuelta < 10; vuelta += 1) {
        const resultado = await this.sincronizarLote(incluirProgramadas);
        if (resultado.vacio) break;

        agregado.vacio = false;
        agregado.loteId = resultado.loteId || agregado.loteId;
        agregado.recibidas += resultado.recibidas;
        agregado.procesadas += resultado.procesadas;
        agregado.confirmadas += resultado.confirmadas;
        agregado.duplicadas += resultado.duplicadas;
        agregado.rechazadas += resultado.rechazadas;
        agregado.conflictos += resultado.conflictos;
        agregado.erroresCriticos += resultado.erroresCriticos;

        const procesadas = resultado.confirmadas + resultado.duplicadas
          + resultado.rechazadas + resultado.conflictos + resultado.erroresCriticos;
        if (procesadas === 0) break;
      }

      agregado.texto = `${agregado.confirmadas} confirmadas, ${agregado.duplicadas} duplicadas, `
        + `${agregado.rechazadas} rechazadas, ${agregado.conflictos} conflictos`;
      this.ultimoResultado.set(agregado);
      this.estado.set('IDLE');
      await this.refrescarContadores();
      return agregado;
    } catch (error) {
      this.estado.set('ERROR');
      await this.refrescarContadores();
      throw error;
    } finally {
      this.sincronizando = false;
      this.progreso.set({ enviadas: 0, total: 0 });
    }
  }

  /** Toma un lote, lo envía e interpreta la respuesta del servidor. */
  async sincronizarLote(incluirProgramadas = false): Promise<ResultadoSincronizacion> {
    const lote = await this.queue.tomarLote(environment.offlineLoteMaxOperaciones, incluirProgramadas);
    if (lote.length === 0) {
      return {
        loteId: '',
        recibidas: 0,
        procesadas: 0,
        confirmadas: 0,
        duplicadas: 0,
        rechazadas: 0,
        conflictos: 0,
        erroresCriticos: 0,
        texto: 'Sin operaciones pendientes',
        vacio: true
      };
    }

    this.progreso.set({ enviadas: 0, total: lote.length });
    for (const operacion of lote) {
      await this.queue.marcarEnviada(operacion.uuid_operacion);
    }

    try {
      const respuesta = await this.primero(
        this.offlineApi.sincronizar(
          lote.map((operacion) => this.queue.aItemLote(operacion)),
          lote[0]?.dispositivo_id,
          lote[0]?.sucursal_id ?? null
        )
      );
      return await this.procesarRespuesta(lote, respuesta);
    } catch (error) {
      // Sin red o error del servidor: la operación no se pierde (RNF-06).
      for (const operacion of lote) {
        await this.queue.marcarPendiente(
          operacion.uuid_operacion,
          this.mensajeError(error)
        );
        await this.queue.programarReintento(operacion.uuid_operacion);
      }
      await this.audit.registrar({
        tipo: 'ERROR',
        mensaje: 'Falló el envío del lote de sincronización.',
        detalle: { operaciones: lote.length, error: this.mensajeError(error) }
      });
      throw error;
    }
  }

  /** Se ejecuta cuando `connectivity.service` detecta que volvió la red. */
  programarPorEventoOnline(): void {
    if (this.quitarListenerOnline) return;
    this.quitarListenerOnline = this.connectivity.alRecuperarConexion(() => {
      this.estado.set('IDLE');
      void this.sincronizarAhora();
    });
  }

  /** Background Sync si el navegador lo soporta; devuelve si quedó registrado. */
  async registrarBackgroundSync(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
    try {
      const registro = await navigator.serviceWorker.ready;
      const syncManager = (registro as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      }).sync;
      if (!syncManager) return false;
      await syncManager.register('fashionstore-sync');
      return true;
    } catch {
      return false;
    }
  }

  /** Reintenta las fallidas con retroceso exponencial, sin bloquear la interfaz. */
  async reintentarFallidas(): Promise<number> {
    const fallidas = await this.queue.reintentables();
    let programadas = 0;
    let proximo: string | null = null;

    for (const operacion of fallidas) {
      await this.queue.prepararReintento(operacion.uuid_operacion);
      const fecha = await this.queue.programarReintento(operacion.uuid_operacion);
      if (fecha && (!proximo || Date.parse(fecha) < Date.parse(proximo))) proximo = fecha;
      programadas += 1;
    }

    this.programarTemporizadorReintento(proximo);
    await this.refrescarContadores();
    return programadas;
  }

  /** WebSocket de sincronización: confirmaciones y conflictos en tiempo real. */
  activarEscuchaServidor(): void {
    if (this.cerrarEscucha) return;
    const tenantId = this.storage.getTenantActivo<{ id: number }>()?.id;
    if (!tenantId) return;

    this.cerrarEscucha = this.websocket.suscribirSincronizacion(
      tenantId,
      this.offlineSession.tokenOffline(),
      (evento) => {
        const nombre = String(evento['evento'] ?? '').toLowerCase();
        if (nombre.includes('conflicto')) {
          this.conflict.notificarNuevos(Number(evento['conflictos'] ?? 1));
        }
        if (nombre.includes('lote') || nombre.includes('sync') || nombre.includes('operacion')) {
          void this.refrescarContadores();
        }
      }
    );
  }

  detenerEscuchaServidor(): void {
    this.cerrarEscucha?.();
    this.cerrarEscucha = null;
    this.websocket.cerrarCanales();
  }

  /** Avisa si hay pendientes al cerrar sesión y ofrece sincronizar primero. */
  async sincronizarAntesDeCerrar(): Promise<CierreConPendientes> {
    const antes = (await this.queue.pendientes()).length;
    if (antes === 0) {
      return { pendientes: 0, puedeCerrar: true, mensaje: 'No hay operaciones pendientes.' };
    }
    if (!this.connectivity.enLinea()) {
      return {
        pendientes: antes,
        puedeCerrar: false,
        mensaje: `Hay ${antes} operaciones pendientes que se perderían si cierras sesión sin conexión.`
      };
    }

    try {
      await this.sincronizarAhora();
    } catch {
      // El resumen final se calcula con lo que quedó en la cola.
    }
    const despues = (await this.queue.pendientes()).length;
    return {
      pendientes: despues,
      puedeCerrar: despues === 0,
      mensaje: despues === 0
        ? 'Sincronización completada; puedes cerrar sesión.'
        : `Quedan ${despues} operaciones pendientes. Revisa el centro de sincronización.`
    };
  }

  async refrescarContadores(): Promise<void> {
    const [contadores, conflictos] = await Promise.all([
      this.queue.contadores(),
      this.conflict.contarPendientes().catch(() => 0)
    ]);
    this.pendientes.set(contadores.pendientes + contadores.sincronizando);
    this.conflictosPendientes.set(conflictos);
  }

  // ------------------------- internos -------------------------

  private async procesarRespuesta(
    lote: OperacionOfflineLocal[],
    respuesta: LoteSincronizacion
  ): Promise<ResultadoSincronizacion> {
    const porUuid = new Map(lote.map((operacion) => [operacion.uuid_operacion, operacion]));
    const resultado: ResultadoSincronizacion = {
      loteId: respuesta.lote_id,
      recibidas: respuesta.recibidas,
      procesadas: respuesta.procesadas,
      confirmadas: 0,
      duplicadas: 0,
      rechazadas: 0,
      conflictos: 0,
      erroresCriticos: 0,
      texto: '',
      vacio: false
    };

    let enviadas = 0;
    for (const item of respuesta.resultados ?? []) {
      const operacion = porUuid.get(item.uuid_operacion);
      if (!operacion) continue;

      await this.queue.registrarIntento(item.uuid_operacion);
      await this.aplicarResultado(item);

      enviadas += 1;
      this.progreso.set({ enviadas, total: lote.length });

      switch (item.estado) {
        case 'CONFIRMADA': resultado.confirmadas += 1; break;
        case 'DUPLICADA': resultado.duplicadas += 1; break;
        case 'RECHAZADA': resultado.rechazadas += 1; break;
        case 'CONFLICTO': resultado.conflictos += 1; break;
        case 'ERROR_CRITICO': resultado.erroresCriticos += 1; break;
      }
    }

    // Resultados faltantes: el servidor no los devolvió; quedan pendientes.
    const devueltos = new Set((respuesta.resultados ?? []).map((item) => item.uuid_operacion));
    for (const operacion of lote) {
      if (!devueltos.has(operacion.uuid_operacion)) {
        await this.queue.marcarPendiente(operacion.uuid_operacion, 'El servidor no devolvió resultado para esta operación.');
      }
    }

    if (resultado.conflictos > 0) {
      this.conflict.notificarNuevos(resultado.conflictos);
    }

    resultado.texto = `${resultado.confirmadas} confirmadas, ${resultado.duplicadas} duplicadas, `
      + `${resultado.rechazadas} rechazadas, ${resultado.conflictos} conflictos`;
    await this.audit.registrar({
      tipo: 'SINCRONIZACION',
      mensaje: `Lote ${respuesta.lote_id}: ${resultado.texto}.`,
      detalle: {
        lote_id: respuesta.lote_id,
        confirmadas: resultado.confirmadas,
        rechazadas: resultado.rechazadas,
        conflictos: resultado.conflictos
      }
    });
    return resultado;
  }

  private async aplicarResultado(item: ResultadoOperacion): Promise<void> {
    const detalle = item.datos_resultado ?? {};
    switch (item.estado) {
      case 'CONFIRMADA':
        await this.queue.marcarConfirmada(item.uuid_operacion, detalle);
        break;
      case 'DUPLICADA':
        await this.queue.marcarDuplicada(item.uuid_operacion, detalle);
        break;
      case 'RECHAZADA':
        await this.queue.marcarRechazada(
          item.uuid_operacion,
          item.motivo ?? 'Operación rechazada por el servidor',
          detalle
        );
        break;
      case 'CONFLICTO':
        await this.queue.marcarConflicto(item.uuid_operacion, {
          motivo: item.motivo ?? 'Conflicto de sincronización',
          ...detalle
        });
        break;
      case 'ERROR_CRITICO':
        await this.queue.marcarErrorCritico(item.uuid_operacion, {
          motivo: item.motivo ?? 'Error crítico de sincronización',
          ...detalle
        });
        break;
      default:
        await this.queue.marcarPendiente(item.uuid_operacion, item.motivo ?? null);
        break;
    }
  }

  private programarPorVisibilidad(): void {
    if (typeof document === 'undefined') return;
    const alVolver = () => {
      if (document.visibilityState !== 'visible') return;
      if (!this.connectivity.enLinea()) return;
      if (this.pendientes() > 0 || !this.iniciado) void this.sincronizarAhora();
    };
    document.addEventListener('visibilitychange', alVolver);
    this.quitarListenerVisibilidad = () => document.removeEventListener('visibilitychange', alVolver);
  }

  private programarTemporizadorReintento(proximo: string | null): void {
    if (this.temporizadorReintento) {
      clearTimeout(this.temporizadorReintento);
      this.temporizadorReintento = null;
    }
    if (!proximo) return;
    const espera = Math.max(0, Date.parse(proximo) - Date.now());
    this.temporizadorReintento = setTimeout(() => {
      this.temporizadorReintento = null;
      if (this.connectivity.enLinea()) void this.sincronizarAhora();
    }, espera);
  }

  private mensajeError(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error !== null) {
      const detalle = (error as { error?: { detail?: string } }).error?.detail;
      if (detalle) return detalle;
    }
    return 'Error de red al sincronizar';
  }

  private primero<T>(observable: import('rxjs').Observable<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      observable.subscribe({ next: resolve, error: reject });
    });
  }

  /** Solo para pruebas: libera listeners y temporizadores. */
  detener(): void {
    this.quitarListenerOnline?.();
    this.quitarListenerOnline = null;
    this.quitarListenerVisibilidad?.();
    this.quitarListenerVisibilidad = null;
    this.detenerEscuchaServidor();
    if (this.temporizadorReintento) {
      clearTimeout(this.temporizadorReintento);
      this.temporizadorReintento = null;
    }
    this.iniciado = false;
  }
}
