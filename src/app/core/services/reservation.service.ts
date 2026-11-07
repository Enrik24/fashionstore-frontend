import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  Reserva, 
  ReservaCreate, 
  CompletarReservaRequest 
} from '../models/reservation.model';
import {
  ComprobanteLocal,
  OperacionOfflineLocal,
  PayloadReserva,
  ProductoOffline
} from '../models/offline.model';
import { OfflineCatalogService } from '../offline/offline-catalog.service';
import { OfflineQueueService } from '../offline/offline-queue.service';
import { OfflineDocumentService } from '../offline/offline-document.service';
import { StorageService } from './storage.service';
import { FiltrosBusquedaLocal } from '../offline/offline-catalog.service';

export interface ReservaLocalCreada {
  reserva: Reserva;
  operacion: OperacionOfflineLocal;
  comprobante: ComprobanteLocal;
}

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private http = inject(HttpClient);
  private catalog = inject(OfflineCatalogService);
  private queue = inject(OfflineQueueService);
  private documents = inject(OfflineDocumentService);
  private storage = inject(StorageService);
  private readonly API_URL = `${environment.apiUrl}/reservas`;

  createReservation(data: ReservaCreate): Observable<Reserva> {
    return this.http.post<Reserva>(`${this.API_URL}/`, data);
  }

  getMyReservations(): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.API_URL}/mis-reservas`);
  }

  getReservationById(id: number): Observable<Reserva> {
    return this.http.get<Reserva>(`${this.API_URL}/${id}`);
  }

  cancelReservation(id: number): Observable<Reserva> {
    return this.http.post<Reserva>(`${this.API_URL}/${id}/cancelar`, {});
  }

  // Branch Manager endpoints
  getBranchReservations(sucursalId?: number, estado?: string): Observable<Reserva[]> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursal_id', sucursalId.toString());
    if (estado) params = params.set('estado', estado);
    return this.http.get<Reserva[]>(`${this.API_URL}/`, { params });
  }

  prepareReservation(id: number): Observable<Reserva> {
    return this.http.patch<Reserva>(`${this.API_URL}/${id}/estado`, null, {
      params: { estado: 'PREPARADA' }
    });
  }

  startTrialReservation(id: number): Observable<Reserva> {
    return this.http.patch<Reserva>(`${this.API_URL}/${id}/estado`, null, {
      params: { estado: 'EN_PRUEBA' }
    });
  }

  completeReservation(id: number, data: CompletarReservaRequest): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/${id}/completar`, data);
  }

  // ============================================================
  // [EXAMEN-2] CU06: reserva offline
  // ============================================================

  /** Encola la reserva con UUID, genera comprobante temporal y bitácora. */
  async crearReservaLocal(
    datos: ReservaCreate,
    clienteId?: number | null
  ): Promise<ReservaLocalCreada> {
    const uuidReserva = this.generarUuid();
    const payload: PayloadReserva = {
      uuid_reserva: uuidReserva,
      sucursal_id: datos.sucursal_id,
      cliente_id: clienteId ?? datos.cliente_id ?? null,
      fecha_reserva: datos.fecha_reserva,
      detalles: datos.detalles.map((detalle) => ({
        variante_producto_id: detalle.variante_producto_id,
        cantidad: detalle.cantidad
      }))
    };

    const operacion = await this.queue.encolar(
      'RESERVA',
      payload as unknown as Record<string, unknown>,
      { sucursalId: datos.sucursal_id }
    );

    const comprobante = await this.documents.generarComprobanteTemporal({
      tipo: 'RESERVA',
      total: 0,
      sucursalId: datos.sucursal_id,
      clienteId: clienteId ?? datos.cliente_id ?? null,
      detalle: datos.detalles.map((detalle) =>
        `${detalle.cantidad} x variante ${detalle.variante_producto_id}`
      ),
      leyenda: 'Reserva registrada localmente. Se confirmará al sincronizar con el servidor.'
    });

    const reserva: Reserva = {
      id: 0,
      numero_reserva: comprobante.numero_temporal,
      cliente_id: clienteId ?? datos.cliente_id ?? 0,
      sucursal_id: datos.sucursal_id,
      fecha_creacion: new Date().toISOString(),
      fecha_reserva: datos.fecha_reserva,
      horario_aproximado: datos.horario_aproximado,
      estado: 'PENDIENTE',
      notas: datos.notas,
      detalles: datos.detalles.map((detalle, indice) => ({
        id: indice + 1,
        reserva_id: 0,
        variante_producto_id: detalle.variante_producto_id,
        cantidad: detalle.cantidad,
        estado: 'PENDIENTE'
      })),
      uuid_reserva: uuidReserva,
      es_offline: true,
      estado_sincronizacion: operacion.estado_sincronizacion,
      tenant_id: this.storage.getTenantActivo<{ id: number }>()?.id ?? null
    };

    return { reserva, operacion, comprobante };
  }

  /** Catálogo servido desde IndexedDB, sin red. */
  catalogoLocal(termino = '', filtros: FiltrosBusquedaLocal = {}): Promise<ProductoOffline[]> {
    return this.catalog.buscarLocal(termino, filtros);
  }

  /** Comprobante temporal de una reserva ya creada. */
  async generarComprobanteLocal(
    reserva: Reserva,
    detalle: string[] = []
  ): Promise<ComprobanteLocal> {
    return this.documents.generarComprobanteTemporal({
      tipo: 'RESERVA',
      total: 0,
      sucursalId: reserva.sucursal_id,
      clienteId: reserva.cliente_id,
      numeroTemporal: reserva.numero_reserva,
      detalle: detalle.length > 0
        ? detalle
        : reserva.detalles.map((linea) => `${linea.cantidad} x variante ${linea.variante_producto_id}`)
    });
  }

  /** Operaciones de reserva que aún no fueron confirmadas por el servidor. */
  async reservasPendientes(): Promise<OperacionOfflineLocal[]> {
    const operaciones = await this.queue.listarTodas();
    return operaciones.filter((operacion) =>
      operacion.tipo_operacion === 'RESERVA'
      && !['CONFIRMADA', 'DUPLICADA', 'RECHAZADA'].includes(operacion.estado_sincronizacion)
    );
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
}


