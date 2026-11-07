import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { NotificacionCliente } from '../models/notificacion-cliente.model';

/**
 * [EXAMEN-2] RN-024: notificaciones al cliente (CU18/CU19).
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesClienteApiService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/notificaciones`;
  misNotificaciones(filtros: { tipo?: string; leida?: boolean; skip?: number; limit?: number } = {}): Observable<NotificacionCliente[]> { let p = new HttpParams().set('skip', String(filtros.skip ?? 0)).set('limit', String(filtros.limit ?? 50)); if (filtros.tipo) p = p.set('tipo', filtros.tipo); if (filtros.leida !== undefined) p = p.set('leida', String(filtros.leida)); return this.http.get<NotificacionCliente[]>(`${this.API_URL}/mis-notificaciones`, { params: p }); }
  marcarLeida(id: number | string): Observable<NotificacionCliente> { return this.http.patch<NotificacionCliente>(`${this.API_URL}/${id}/leida`, {}); }
  noLeidasCount(): Observable<number> { return this.misNotificaciones({ leida: false, limit: 200 }).pipe(map((items) => items.filter((n) => !n.leida).length), catchError(() => of(0))); }
}
