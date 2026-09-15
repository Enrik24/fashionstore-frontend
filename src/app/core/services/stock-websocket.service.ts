import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DisponibilidadSucursal, DisponibilidadProductoResponse } from '../models/public-catalog.model';

@Injectable({
  providedIn: 'root'
})
export class StockWebSocketService {
  private socket: WebSocket | null = null;
  private currentProductId: number | null = null;
  private lastTallaId: number | null = null;
  private lastColorId: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: any = null;

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
}
