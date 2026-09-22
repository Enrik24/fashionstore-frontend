import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Promocion,
  PromocionCreateDto,
  PromocionUpdateDto,
  PromocionEstadoUpdateDto,
  PromocionFiltros,
  PromocionPublica,
  EstadoPromocion
} from '../models/promotion.model';

@Injectable({
  providedIn: 'root'
})
export class PromotionApiService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/promociones`;
  private readonly PUBLIC_URL = `${environment.apiUrl}/public/promociones`;

  getPromotions(filtros?: PromocionFiltros): Observable<Promocion[]> {
    let params = new HttpParams()
      .set('skip', (filtros?.skip ?? 0).toString())
      .set('limit', (filtros?.limit ?? 200).toString());

    if (filtros?.estado) params = params.set('estado', filtros.estado);
    if (filtros?.tipo) params = params.set('tipo', filtros.tipo);
    if (filtros?.solo_vigentes) params = params.set('solo_vigentes', 'true');

    return this.http.get<Promocion[]>(`${this.API_URL}/`, { params });
  }

  getPromotion(id: number): Observable<Promocion> {
    return this.http.get<Promocion>(`${this.API_URL}/${id}`);
  }

  createPromotion(dto: PromocionCreateDto): Observable<Promocion> {
    return this.http.post<Promocion>(`${this.API_URL}/`, dto);
  }

  updatePromotion(id: number, dto: PromocionUpdateDto): Observable<Promocion> {
    return this.http.put<Promocion>(`${this.API_URL}/${id}`, dto);
  }

  changeStatus(id: number, estado: EstadoPromocion): Observable<Promocion> {
    const body: PromocionEstadoUpdateDto = { estado };
    return this.http.patch<Promocion>(`${this.API_URL}/${id}/estado`, body);
  }

  deletePromotion(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/${id}`);
  }

  getActivePromotions(sucursalId?: number): Observable<PromocionPublica[]> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursal_id', sucursalId.toString());
    return this.http.get<PromocionPublica[]>(`${this.PUBLIC_URL}/activas`, { params });
  }
}
