import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Valoracion,
  ValoracionCreateDto,
  ValoracionUpdateDto,
  PuedeValorarResponse
} from '../models/review.model';

@Injectable({
  providedIn: 'root'
})
export class ReviewsApiService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/productos`;
  private readonly API_VALORACIONES = `${environment.apiUrl}/valoraciones`;

  getProductReviews(productoId: number, page: number = 0, limit: number = 10): Observable<Valoracion[]> {
    const skip = page * limit;
    const params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());

    return this.http.get<Valoracion[]>(`${this.API_URL}/${productoId}/valoraciones`, { params });
  }

  createReview(productoId: number, dto: ValoracionCreateDto): Observable<Valoracion> {
    return this.http.post<Valoracion>(`${this.API_URL}/${productoId}/valoraciones`, dto);
  }

  updateReview(valoracionId: number, dto: ValoracionUpdateDto): Observable<Valoracion> {
    return this.http.put<Valoracion>(`${this.API_VALORACIONES}/${valoracionId}`, dto);
  }

  getMyReview(productoId: number): Observable<Valoracion | null> {
    return this.http.get<Valoracion | null>(`${this.API_URL}/${productoId}/mi-valoracion`);
  }

  canReview(productoId: number): Observable<PuedeValorarResponse> {
    return this.http.get<PuedeValorarResponse>(`${this.API_URL}/${productoId}/puede-valorar`);
  }
}
