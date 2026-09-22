import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Cupon,
  CuponCreateDto,
  CuponUpdateDto,
  CuponValidacionResponse,
  ValidarCuponRequest
} from '../models/coupon.model';

@Injectable({
  providedIn: 'root'
})
export class CouponApiService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/cupones`;

  getCoupons(skip: number = 0, limit: number = 100): Observable<Cupon[]> {
    const params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());

    return this.http.get<Cupon[]>(`${this.API_URL}/`, { params });
  }

  getCoupon(id: number): Observable<Cupon> {
    return this.http.get<Cupon>(`${this.API_URL}/${id}`);
  }

  createCoupon(coupon: CuponCreateDto): Observable<Cupon> {
    return this.http.post<Cupon>(`${this.API_URL}/`, coupon);
  }

  updateCoupon(id: number, coupon: CuponUpdateDto): Observable<Cupon> {
    return this.http.put<Cupon>(`${this.API_URL}/${id}`, coupon);
  }

  deleteCoupon(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/${id}`);
  }

  validateCoupon(codigo: string, subtotal: number = 0): Observable<CuponValidacionResponse> {
    const params = new HttpParams().set('subtotal', subtotal.toString());
    return this.http.post<CuponValidacionResponse>(`${this.API_URL}/validar`, { codigo }, { params });
  }

  /**
   * CU27: validación extendida con aplicabilidad por productos/categorías.
   * El descuento se calcula solo sobre el subtotal de los ítems aplicables.
   */
  validateCouponWithItems(req: ValidarCuponRequest): Observable<CuponValidacionResponse> {
    return this.http.post<CuponValidacionResponse>(`${this.API_URL}/validar`, req);
  }

  /** CU27: cupones vigentes y con usos disponibles para el cliente. */
  getAvailableCoupons(): Observable<Cupon[]> {
    return this.http.get<Cupon[]>(`${this.API_URL}/disponibles`);
  }
}
