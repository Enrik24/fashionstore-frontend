import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Recepcion, RecepcionCreateDto } from '../models/reception.model';

@Injectable({
  providedIn: 'root'
})
export class ReceptionApiService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/recepciones`;
  private readonly API_PROV_URL = `${environment.apiUrl}/proveedores`;

  getReceptions(skip = 0, limit = 100, proveedorId?: number, sucursalId?: number): Observable<Recepcion[]> {
    let params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());
    if (proveedorId) params = params.set('proveedor_id', proveedorId.toString());
    if (sucursalId) params = params.set('sucursal_id', sucursalId.toString());
    return this.http.get<Recepcion[]>(`${this.API_URL}/`, { params });
  }

  getReception(id: number): Observable<Recepcion> {
    return this.http.get<Recepcion>(`${this.API_URL}/${id}`);
  }

  createReception(data: RecepcionCreateDto): Observable<Recepcion> {
    return this.http.post<Recepcion>(`${this.API_URL}/`, data);
  }

  getReceptionsBySupplier(proveedorId: number, skip = 0, limit = 100): Observable<Recepcion[]> {
    const params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());
    return this.http.get<Recepcion[]>(`${this.API_PROV_URL}/${proveedorId}/recepciones`, { params });
  }
}
