import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DisponibilidadSucursal, DisponibilidadProductoResponse } from '../models/public-catalog.model';
import { EventoPagoWs, EventoSincronizacionWs } from '../models/offline.model';
import { StorageService } from './storage.service';
import { calcularBackoffSegundos } from '../utils/backoff.util';

@Injectable({
  providedIn: 'root'
})
export class StockWebSocketService {
  private storage = inject(StorageService);
  private socket: WebSocket | null = null;
  private currentProductId: number | null = null;
  private lastTallaId: number | null = null;
  private lastColorId: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: any = null;

  // [EXAMEN-2] Canales de Fase 2.
  private socketSync: WebSocket | null = null;
  private socketPagos: WebSocket | null = null;
  private sincronizacionActiva = false;
  private pagosActivos = false;
  private temporizadorSync: ReturnType<typeof setTimeout> | null = null;
  private temporizadorPagos: ReturnType<typeof setTimeout> | null = null;
  private intentosSync = 0;
  private intentosPagos = 0;

  private availabilitySubject = new BehaviorSubject<DisponibilidadSucursal[]>([]);
  public availability$: Observable<DisponibilidadSucursal[]> = this.availabilitySubject.asObservable();

  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  public isConnected$: Observable<boolean> = this.isConnectedSubject.asObservable();

  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$: Observable<boolean> = this.isLoadingSubject.asObservable();

  /**
   * Conecta al WebSocket para un producto específico
   */
  connect(productoId: number): void {
    if (this.socket && this.currentProductId === productoId && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    this.disconnect();
    this.currentProductId = productoId;
    this.isLoadingSubject.next(true);

    const wsBase = environment.wsUrl || 'ws://localhost:8000/api/v1';
    const url = `${wsBase}/ws/disponibilidad/${productoId}`;

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.isConnectedSubject.next(true);
        this.reconnectAttempts = 0;
        // Si teníamos filtros previos pendientes, solicitamos actualización
        if (this.lastTallaId !== null || this.lastColorId !== null) {
          this.requestUpdate(this.lastTallaId, this.lastColorId);
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data: DisponibilidadProductoResponse = JSON.parse(event.data);
          if (data && Array.isArray(data.disponibilidad)) {
            this.availabilitySubject.next(data.disponibilidad);
          }
        } catch (e) {
          console.error('Error procesando mensaje WebSocket de stock:', e);
        } finally {
          this.isLoadingSubject.next(false);
        }
      };

      this.socket.onerror = (error) => {
        console.warn('Error en conexión WebSocket de stock:', error);
        this.isConnectedSubject.next(false);
        this.isLoadingSubject.next(false);
      };

      this.socket.onclose = (event) => {
        this.isConnectedSubject.next(false);
        this.isLoadingSubject.next(false);
        this.socket = null;

        // Intentar reconectar si no fue cierre intencional
        if (!event.wasClean && this.currentProductId && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
          this.reconnectTimeout = setTimeout(() => {
            if (this.currentProductId) {
              this.connect(this.currentProductId);
            }
          }, delay);
        }
      };
    } catch (e) {
      console.error('Error al inicializar WebSocket:', e);
      this.isConnectedSubject.next(false);
      this.isLoadingSubject.next(false);
    }
  }

  /**
   * Solicita actualización de disponibilidad por combinación talla / color
   */
  requestUpdate(tallaId?: number | null, colorId?: number | null): void {
    this.lastTallaId = tallaId ?? null;
    this.lastColorId = colorId ?? null;
    this.isLoadingSubject.next(true);

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        talla_id: this.lastTallaId,
        color_id: this.lastColorId
      }));
    }
  }

  /**
   * Cierra la conexión activa
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close(1000, 'Component destroyed');
      this.socket = null;
    }
    this.currentProductId = null;
    this.lastTallaId = null;
    this.lastColorId = null;
    this.reconnectAttempts = 0;
    this.isConnectedSubject.next(false);
    this.isLoadingSubject.next(false);
  }

  // ============================================================
  // [EXAMEN-2] Fase 2: canales de sincronización y pagos
  // ============================================================

  /** Escucha el canal `/ws/sync`; devuelve la función para cerrar la suscripción. */
  suscribirSincronizacion(
    tenantId: number,
    token: string | null,
    onMensaje: (evento: EventoSincronizacionWs) => void
  ): () => void {
    this.sincronizacionActiva = false;
    this.cerrarSocketSync();
    this.sincronizacionActiva = true;
    this.intentosSync = 0;
    this.abrirCanalSync(tenantId, token, onMensaje);
    return () => {
      this.sincronizacionActiva = false;
      this.cerrarSocketSync();
    };
  }

  /** Escucha el canal `/ws/pagos`; devuelve la función para cerrar la suscripción. */
  suscribirPagos(
    tenantId: number,
    token: string | null,
    onMensaje: (evento: EventoPagoWs) => void
  ): () => void {
    this.pagosActivos = false;
    this.cerrarSocketPagos();
    this.pagosActivos = true;
    this.intentosPagos = 0;
    this.abrirCanalPagos(tenantId, token, onMensaje);
    return () => {
      this.pagosActivos = false;
      this.cerrarSocketPagos();
    };
  }

  /**
   * Retroceso exponencial para reconectar un canal. Devuelve el retraso en
   * milisegundos que debe esperar el llamador antes de reintentar.
   */
  reconectarConBackoff(canal: 'sync' | 'pagos', intento: number): number {
    const intentos = canal === 'sync' ? this.intentosSync : this.intentosPagos;
    const efectivo = Math.max(intento, intentos);
    return calcularBackoffSegundos(
      efectivo + 1,
      environment.offlineBackoffBaseSeg,
      environment.offlineBackoffMaxSeg
    ) * 1000;
  }

  cerrarCanales(): void {
    this.sincronizacionActiva = false;
    this.pagosActivos = false;
    this.cerrarSocketSync();
    this.cerrarSocketPagos();
  }

  private abrirCanalSync(
    tenantId: number,
    token: string | null,
    onMensaje: (evento: EventoSincronizacionWs) => void
  ): void {
    const url = this.urlCanal('sync', tenantId, token);
    if (!url) return;

    try {
      this.socketSync = new WebSocket(url);
      this.socketSync.onopen = () => { this.intentosSync = 0; };
      this.socketSync.onmessage = (evento) => {
        const data = this.parsear<EventoSincronizacionWs>(evento.data);
        if (data) onMensaje(data);
      };
      this.socketSync.onerror = () => { /* onclose programa el reintento */ };
      this.socketSync.onclose = () => {
        this.socketSync = null;
        if (!this.sincronizacionActiva) return;
        const espera = this.reconectarConBackoff('sync', ++this.intentosSync);
        this.temporizadorSync = setTimeout(
          () => this.abrirCanalSync(tenantId, token, onMensaje),
          espera
        );
      };
    } catch {
      this.socketSync = null;
    }
  }

  private abrirCanalPagos(
    tenantId: number,
    token: string | null,
    onMensaje: (evento: EventoPagoWs) => void
  ): void {
    const url = this.urlCanal('pagos', tenantId, token);
    if (!url) return;

    try {
      this.socketPagos = new WebSocket(url);
      this.socketPagos.onopen = () => { this.intentosPagos = 0; };
      this.socketPagos.onmessage = (evento) => {
        const data = this.parsear<EventoPagoWs>(evento.data);
        if (data) onMensaje(data);
      };
      this.socketPagos.onerror = () => { /* onclose programa el reintento */ };
      this.socketPagos.onclose = () => {
        this.socketPagos = null;
        if (!this.pagosActivos) return;
        const espera = this.reconectarConBackoff('pagos', ++this.intentosPagos);
        this.temporizadorPagos = setTimeout(
          () => this.abrirCanalPagos(tenantId, token, onMensaje),
          espera
        );
      };
    } catch {
      this.socketPagos = null;
    }
  }

  private urlCanal(canal: 'sync' | 'pagos', tenantId: number, token: string | null): string | null {
    if (typeof WebSocket === 'undefined') return null;
    const base = environment.wsUrl || 'ws://localhost:8000/api/v1';
    const parametros = new URLSearchParams({ tenant_id: String(tenantId) });
    const efectivo = token ?? this.storage.getAccessToken();
    if (efectivo) parametros.set('token', efectivo);
    return `${base}/ws/${canal}?${parametros.toString()}`;
  }

  private cerrarSocketSync(): void {
    if (this.temporizadorSync) {
      clearTimeout(this.temporizadorSync);
      this.temporizadorSync = null;
    }
    if (this.socketSync) {
      this.socketSync.close(1000, 'Suscripción cerrada');
      this.socketSync = null;
    }
  }

  private cerrarSocketPagos(): void {
    if (this.temporizadorPagos) {
      clearTimeout(this.temporizadorPagos);
      this.temporizadorPagos = null;
    }
    if (this.socketPagos) {
      this.socketPagos.close(1000, 'Suscripción cerrada');
      this.socketPagos = null;
    }
  }

  private parsear<T>(mensaje: string): T | null {
    try {
      return JSON.parse(mensaje) as T;
    } catch {
      return null;
    }
  }
}
