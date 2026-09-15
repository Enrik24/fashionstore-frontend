import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BitacoraEntry, BitacoraFilter } from '../models/audit.model';

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;

  getLogs(filter?: BitacoraFilter): Observable<BitacoraEntry[]> {
    let params = new HttpParams();
    if (filter) {
      if (filter.skip !== undefined) params = params.set('skip', filter.skip.toString());
      if (filter.limit !== undefined) params = params.set('limit', filter.limit.toString());
      if (filter.usuario_id !== undefined) params = params.set('usuario_id', filter.usuario_id.toString());
      if (filter.accion) params = params.set('accion', filter.accion);
      if (filter.tabla) params = params.set('tabla', filter.tabla);
      if (filter.fecha_inicio) params = params.set('fecha_inicio', filter.fecha_inicio);
      if (filter.fecha_fin) params = params.set('fecha_fin', filter.fecha_fin);
    }
    return this.http.get<BitacoraEntry[]>(`${this.API_URL}/bitacora/`, { params });
  }

  exportCsv(): Observable<Blob> {
    return this.http.get(`${this.API_URL}/bitacora/export`, { responseType: 'blob' });
  }
}
