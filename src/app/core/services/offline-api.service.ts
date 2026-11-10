import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  CatalogoIncremental,
  ClienteOffline,
  DescargaRegistrarRequest,
  DescargaRegistrarResponse,
  LoteSincronizacion,
  LogConflicto,
  OperacionLoteItem,
  OperacionOfflineRemota,
  ResumenSincronizacion,
  StockOffline,
  VersionPaquete
} from '../models/offline.model';

export interface FiltrosOperacionesOffline {
  estado?: string;
  tipo?: string;
  desde?: string;
  hasta?: string;
  skip?: number;
  limit?: number;
}

export interface FiltrosConflictos {
  resuelto?: boolean;
  tipo?: string;
  skip?: number;
  limit?: number;
}

export interface RespuestaConteo {
  tenant_id?: number;
  pendientes: number;
}

export interface EstadoLote {
  lote_id: string;
  estado: string;
  asincrono: boolean;
}

export interface PromocionesOffline {
  promociones: Array<Record<string, unknown>>;
  cupones?: Array<Record<string, unknown>>;
}

/**
 * [EXAMEN-2] CU05–CU09: HTTP contra `/offline/*` (capítulo 8.2).
 * No duplica la sesión offline ni los dispositivos: eso vive en
 * `offline-session.service` y `device.service`.
 */
@Injectable({ providedIn: 'root' })
export class OfflineApiService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/offline`;

  obtenerVersion(sucursalId?: number | null): Observable<VersionPaquete> {
    let params = new HttpParams();
    if (sucursalId != null) params = params.set('sucursal_id', String(sucursalId));
    return this.http.get<VersionPaquete>(`${this.API_URL}/version`, { params });
  }

  obtenerPaquete(sucursalId?: number | null, dispositivoId?: string | null): Observable<Record<string, unknown>> {
    let params = new HttpParams();
    if (sucursalId != null) params = params.set('sucursal_id', String(sucursalId));
    if (dispositivoId) params = params.set('dispositivo_id', dispositivoId);
    // Sin timeout la UI se queda en "Descargando…" si el backend cuelga.
    return this.http.get<Record<string, unknown>>(`${this.API_URL}/paquete`, { params }).pipe(timeout(120_000));
  }

  obtenerCatalogoIncremental(desdeVersion?: string | null, sucursalId?: number | null): Observable<CatalogoIncremental> {
    let params = new HttpParams();
    if (desdeVersion) params = params.set('desde_version', desdeVersion);
    if (sucursalId != null) params = params.set('sucursal_id', String(sucursalId));
    return this.http.get<CatalogoIncremental>(`${this.API_URL}/catalogo`, { params });
  }

  obtenerStock(sucursalId?: number | null, actualizadoDesde?: string | null): Observable<StockOffline[]> {
    let params = new HttpParams();
    if (sucursalId != null) params = params.set('sucursal_id', String(sucursalId));
    if (actualizadoDesde) params = params.set('actualizado_desde', actualizadoDesde);
    return this.http.get<StockOffline[]>(`${this.API_URL}/stock`, { params });
  }

  obtenerClientes(): Observable<ClienteOffline[]> {
    return this.http.get<ClienteOffline[]>(`${this.API_URL}/clientes`);
  }

  obtenerPromociones(): Observable<PromocionesOffline> {
    return this.http.get<PromocionesOffline>(`${this.API_URL}/promociones`);
  }

  registrarDescarga(datos: DescargaRegistrarRequest): Observable<DescargaRegistrarResponse> {
    return this.http.post<DescargaRegistrarResponse>(`${this.API_URL}/descargas/registrar`, datos);
  }

  sincronizar(operaciones: OperacionLoteItem[], dispositivoId?: string | null, sucursalId?: number | null): Observable<LoteSincronizacion> {
    return this.http.post<LoteSincronizacion>(`${this.API_URL}/sync`, {
      dispositivo_id: dispositivoId ?? undefined,
      sucursal_id: sucursalId ?? undefined,
      operaciones
    });
  }

  estadoLote(loteId: string): Observable<EstadoLote> {
    return this.http.get<EstadoLote>(`${this.API_URL}/sync/${loteId}`);
  }

  listarOperaciones(filtros: FiltrosOperacionesOffline = {}): Observable<OperacionOfflineRemota[]> {
    let params = new HttpParams();
    if (filtros.estado) params = params.set('estado', filtros.estado);
    if (filtros.tipo) params = params.set('tipo', filtros.tipo);
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);
    if (filtros.skip != null) params = params.set('skip', String(filtros.skip));
    if (filtros.limit != null) params = params.set('limit', String(filtros.limit));
    return this.http.get<OperacionOfflineRemota[]>(`${this.API_URL}/operaciones`, { params });
  }

  obtenerOperacion(uuidOperacion: string): Observable<OperacionOfflineRemota> {
    return this.http.get<OperacionOfflineRemota>(`${this.API_URL}/operaciones/${uuidOperacion}`);
  }

  reintentarOperacion(uuidOperacion: string): Observable<OperacionOfflineRemota> {
    return this.http.post<OperacionOfflineRemota>(
      `${this.API_URL}/operaciones/${uuidOperacion}/reintentar`,
      {}
    );
  }

  resumen(desde?: string | null, hasta?: string | null): Observable<ResumenSincronizacion> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<ResumenSincronizacion>(`${this.API_URL}/resumen`, { params });
  }

  listarConflictos(filtros: FiltrosConflictos = {}): Observable<LogConflicto[]> {
    let params = new HttpParams();
    if (filtros.resuelto != null) params = params.set('resuelto', String(filtros.resuelto));
    if (filtros.tipo) params = params.set('tipo', filtros.tipo);
    if (filtros.skip != null) params = params.set('skip', String(filtros.skip));
    if (filtros.limit != null) params = params.set('limit', String(filtros.limit));
    return this.http.get<LogConflicto[]>(`${this.API_URL}/conflictos`, { params });
  }

  obtenerConflicto(id: number): Observable<LogConflicto> {
    return this.http.get<LogConflicto>(`${this.API_URL}/conflictos/${id}`);
  }

  resolverConflicto(id: number, decision: 'CONFIRMAR' | 'RECHAZAR' | 'AJUSTAR', observacion?: string): Observable<LogConflicto> {
    return this.http.post<LogConflicto>(`${this.API_URL}/conflictos/${id}/resolver`, {
      decision,
      observacion: observacion ?? null
    });
  }

  descartarConflicto(id: number, motivo?: string): Observable<LogConflicto> {
    return this.http.post<LogConflicto>(`${this.API_URL}/conflictos/${id}/descartar`, {
      motivo: motivo ?? null
    });
  }

  contarConflictosPendientes(): Observable<RespuestaConteo> {
    return this.http.get<RespuestaConteo>(`${this.API_URL}/conflictos/pendientes/count`);
  }
}
