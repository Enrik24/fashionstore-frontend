import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Compensacion, ResumenCompensaciones } from '../models/compensacion.model';

/**
 * [EXAMEN-2] CU19: compensación de ventas offline rechazadas.
 */
@Injectable({ providedIn: 'root' })
export class CompensacionesApiService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/offline/compensaciones`;
  listar(filtros: { estado?: string; tipo?: string; fecha_inicio?: string; fecha_fin?: string; skip?: number; limit?: number } = {}): Observable<Compensacion[]> { let p = new HttpParams().set('skip', String(filtros.skip ?? 0)).set('limit', String(filtros.limit ?? 50)); if (filtros.estado) p = p.set('estado', filtros.estado); if (filtros.tipo) p = p.set('tipo', filtros.tipo); if (filtros.fecha_inicio) p = p.set('fecha_inicio', filtros.fecha_inicio); if (filtros.fecha_fin) p = p.set('fecha_fin', filtros.fecha_fin); return this.http.get<Compensacion[]>(`${this.API_URL}`, { params: p }); }
  detalle(id: number | string): Observable<Compensacion> { return this.http.get<Compensacion>(`${this.API_URL}/${id}`); }
  confirmarEfectivo(id: number | string): Observable<Compensacion> { return this.http.post<Compensacion>(`${this.API_URL}/${id}/confirmar-efectivo`, {}); }
  reintentar(id: number | string): Observable<Compensacion> { return this.http.post<Compensacion>(`${this.API_URL}/${id}/reintentar`, {}); }
  resumen(): Observable<ResumenCompensaciones> { return this.http.get<ResumenCompensaciones>(`${this.API_URL}/resumen`); }
  pendientesCount(): Observable<number> { return this.listar({ estado: 'PENDIENTE', limit: 1 }).pipe(map((items) => items.length), catchError(() => of(0))); }
}
