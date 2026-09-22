import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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
}
