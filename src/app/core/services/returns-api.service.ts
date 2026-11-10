import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  SolicitudDevolucion,
  SolicitudDevolucionCreateDto,
  RevisionSolicitudDto,
  EstadoSolicitudDevolucion
} from '../models/return.model';

@Injectable({
  providedIn: 'root'
})
export class ReturnsApiService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/devoluciones`;

  /** CU28: el cliente crea una solicitud de devolución o cambio. */
  createRequest(dto: SolicitudDevolucionCreateDto): Observable<SolicitudDevolucion> {
    return this.http.post<SolicitudDevolucion>(`${this.API_URL}/`, dto);
  }

  /** CU28: solicitudes realizadas por el cliente autenticado. */
  getMyRequests(skip: number = 0, limit: number = 50): Observable<SolicitudDevolucion[]> {
    const params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());
    return this.http.get<SolicitudDevolucion[]>(`${this.API_URL}/mis-solicitudes`, { params });
  }

  /** CU28: detalle de una solicitud (cliente propia / staff). */
  getRequest(id: number): Observable<SolicitudDevolucion> {
    return this.http.get<SolicitudDevolucion>(`${this.API_URL}/${id}`);
  }

  /** CU28: solicitudes para el personal (encargado/cajero filtrados a su sucursal). */
  getStaffRequests(
    estado?: EstadoSolicitudDevolucion | '',
    sucursalId?: number | null,
    skip: number = 0,
    limit: number = 50
  ): Observable<SolicitudDevolucion[]> {
    let params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());

    if (estado) params = params.set('estado', estado);
    if (sucursalId) params = params.set('sucursal_id', sucursalId.toString());

    return this.http.get<SolicitudDevolucion[]>(`${this.API_URL}/`, { params });
  }

  /** CU28: el staff aprueba o rechaza una solicitud. */
  reviewRequest(id: number, dto: RevisionSolicitudDto): Observable<SolicitudDevolucion> {
    return this.http.patch<SolicitudDevolucion>(`${this.API_URL}/${id}/revisar`, dto);
  }

  /** CU28: reintenta el reembolso de una solicitud en PENDIENTE_REEMBOLSO. */
  processRefund(id: number): Observable<SolicitudDevolucion> {
    return this.http.post<SolicitudDevolucion>(`${this.API_URL}/${id}/procesar-reembolso`, {});
  }

  // ===== [EXAMEN-2] CU13/CU18 =====
  solicitarReposicion(dto: any): Observable<SolicitudDevolucion> { return this.http.post<SolicitudDevolucion>(`${this.API_URL}/reposicion`, { ...dto, tipo: 'REPOSICION' }); }
  listarReposiciones(filtros: { sucursal_id?: number; estado?: string } = {}): Observable<SolicitudDevolucion[]> { let p = new HttpParams(); if (filtros.sucursal_id) p = p.set('sucursal_id', String(filtros.sucursal_id)); if (filtros.estado) p = p.set('estado', filtros.estado); return this.http.get<unknown>(`${this.API_URL}/reposiciones`, { params: p }).pipe(map((r) => (Array.isArray(r) ? (r as SolicitudDevolucion[]) : Array.isArray((r as { reposiciones?: unknown })?.reposiciones) ? ((r as { reposiciones: SolicitudDevolucion[] }).reposiciones) : []))); }
  buscarVentaElegible(numeroComprobante: string): Observable<any> { return this.http.get<any>(`${this.API_URL}/venta/${encodeURIComponent(numeroComprobante)}`); }
  validarPlazo(ordenId: number): Observable<any> { return this.http.get<any>(`${this.API_URL}/validar-plazo/${ordenId}`); }
  calcularDiferencia(items: any[]): Observable<any> { return this.http.post<any>(`${this.API_URL}/calcular-diferencia`, { items }); }
  alternativasTalla(varianteId: number, direccion: string, sucursalId?: number): Observable<any[]> { let p = new HttpParams().set('direccion', direccion); if (sucursalId) p = p.set('sucursal_id', String(sucursalId)); return this.http.get<any[]>(`${this.API_URL}/alternativas-talla/${varianteId}`, { params: p }); }
  notificarAlternativa(solicitudId: number): Observable<any> { return this.http.post<any>(`${this.API_URL}/${solicitudId}/notificar-alternativa`, {}); }
  descargarNota(solicitudId: number): Observable<Blob> { return this.http.get(`${this.API_URL}/${solicitudId}/nota`, { responseType: 'blob' }); }
  descargarNotaReposicion(solicitudId: number): Observable<Blob> { return this.http.get(`${this.API_URL}/${solicitudId}/nota-reposicion`, { responseType: 'blob' }); }
  solicitudesPendientesOffline(): Observable<SolicitudDevolucion[]> { return this.http.get<SolicitudDevolucion[]>(`${this.API_URL}/pendientes-offline`); }
}
