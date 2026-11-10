import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Backup, Restauracion, UsoRespaldos } from '../models/backup.model';

/**
 * [EXAMEN-2] CU20: respaldos y restauración.
 */
@Injectable({ providedIn: 'root' })
export class BackupsApiService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/saas/backups`;
  private readonly REST_URL = `${environment.apiUrl}/saas/restauraciones`;
  listar(filtros: { estado?: string; tipo?: string; fecha_inicio?: string; fecha_fin?: string; skip?: number; limit?: number } = {}): Observable<Backup[]> { let p = new HttpParams().set('skip', String(filtros.skip ?? 0)).set('limit', String(filtros.limit ?? 50)); if (filtros.estado) p = p.set('estado', filtros.estado); if (filtros.tipo) p = p.set('tipo', filtros.tipo); if (filtros.fecha_inicio) p = p.set('desde', filtros.fecha_inicio); if (filtros.fecha_fin) p = p.set('hasta', filtros.fecha_fin); return this.http.get<Backup[]>(`${this.API_URL}`, { params: p }); }
  crearManual(): Observable<Backup> { return this.http.post<Backup>(`${this.API_URL}`, {}); }
  detalle(id: number | string): Observable<Backup> { return this.http.get<Backup>(`${this.API_URL}/${id}`); }
  descargar(id: number | string): Observable<Blob> { return this.http.get(`${this.API_URL}/${id}/descargar`, { responseType: 'blob' }); }
  restaurar(id: number | string, motivo: string): Observable<Restauracion> { return this.http.post<Restauracion>(`${this.API_URL}/${id}/restaurar`, { motivo }); }
  listarRestauraciones(filtros: { estado?: string } = {}): Observable<Restauracion[]> { let p = new HttpParams(); if (filtros.estado) p = p.set('estado', filtros.estado); return this.http.get<Restauracion[]>(`${this.REST_URL}`, { params: p }); }
  uso(): Observable<UsoRespaldos> { return this.http.get<UsoRespaldos>(`${this.API_URL}/uso`); }
}
