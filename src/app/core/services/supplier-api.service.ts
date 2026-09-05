import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Proveedor, ProveedorCreateDto, ProveedorUpdateDto } from '../models/supplier.model';

@Injectable({
  providedIn: 'root'
})
export class SupplierApiService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/proveedores`;

  getSuppliers(skip: number = 0, limit: number = 100): Observable<Proveedor[]> {
    const params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());

    return this.http.get<Proveedor[]>(`${this.API_URL}/`, { params });
  }

  getSupplier(id: number): Observable<Proveedor> {
    return this.http.get<Proveedor>(`${this.API_URL}/${id}`);
  }

  createSupplier(supplier: ProveedorCreateDto): Observable<Proveedor> {
    return this.http.post<Proveedor>(`${this.API_URL}/`, supplier);
  }

  updateSupplier(id: number, supplier: ProveedorUpdateDto): Observable<Proveedor> {
    return this.http.put<Proveedor>(`${this.API_URL}/${id}`, supplier);
  }

  deleteSupplier(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/${id}`);
  }
}
