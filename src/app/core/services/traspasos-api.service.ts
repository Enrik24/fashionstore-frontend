import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Traspaso, TraspasoCreateDto, RecepcionTraspasoRequest, RechazoTraspasoRequest, SugerenciaTraspaso } from '../models/traspaso.model';

/**
 * [EXAMEN-2] CU14: traspasos entre sucursales con recepción parcial.
 */
@Injectable({ providedIn: 'root' })
export class TraspasosApiService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/traspasos`;
  crear(dto: TraspasoCreateDto): Observable<Traspaso> { return this.http.post<Traspaso>(`${this.API_URL}`, dto); }
  listar(filtros: { estado?: string; sucursal_id?: number | null; skip?: number; limit?: number } = {}): Observable<Traspaso[]> { let p = new HttpParams().set('skip', String(filtros.skip ?? 0)).set('limit', String(filtros.limit ?? 50)); if (filtros.estado) p = p.set('estado', filtros.estado); if (filtros.sucursal_id) p = p.set('sucursal_id', String(filtros.sucursal_id)); return this.http.get<Traspaso[]>(`${this.API_URL}`, { params: p }); }
  detalle(id: number | string): Observable<Traspaso> { return this.http.get<Traspaso>(`${this.API_URL}/${id}`); }
  recibir(id: number | string, dto: RecepcionTraspasoRequest): Observable<Traspaso> { return this.http.post<Traspaso>(`${this.API_URL}/${id}/recibir`, dto); }
  rechazar(id: number | string, dto: RechazoTraspasoRequest): Observable<Traspaso> { return this.http.post<Traspaso>(`${this.API_URL}/${id}/rechazar`, dto); }
  cancelar(id: number | string): Observable<Traspaso> { return this.http.post<Traspaso>(`${this.API_URL}/${id}/cancelar`, {}); }
  sugerencias(): Observable<SugerenciaTraspaso[]> { return this.http.get<SugerenciaTraspaso[]>(`${this.API_URL}/sugerencias`); }
  historialProducto(productoId: number): Observable<Traspaso[]> { return this.http.get<Traspaso[]>(`${this.API_URL}/producto/${productoId}`); }
  descargarPdf(id: number | string): Observable<Blob> { return this.http.get(`${this.API_URL}/${id}/pdf`, { responseType: 'blob' }); }
}
