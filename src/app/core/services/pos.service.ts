import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { VentaPresencial, VentaPresencialCreate } from '../models/cart.model';
import { ClientProfile } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class PosService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/ventas-presenciales`;
  private readonly CLIENTES_URL = `${environment.apiUrl}/clientes`;
  private readonly ORDENES_URL = `${environment.apiUrl}/ordenes`;

  createInPersonSale(data: VentaPresencialCreate): Observable<VentaPresencial> {
    return this.http.post<VentaPresencial>(`${this.API_URL}/`, data);
  }

  getInPersonSales(
    skip: number = 0, 
    limit: number = 50, 
    sucursalId?: number, 
    cajeroId?: number
  ): Observable<VentaPresencial[]> {
    let params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());
    
    if (sucursalId) {
      params = params.set('sucursal_id', sucursalId.toString());
    }
    if (cajeroId) {
      params = params.set('cajero_id', cajeroId.toString());
    }
    
    return this.http.get<VentaPresencial[]>(`${this.API_URL}/`, { params });
  }

  getInPersonSaleById(id: number): Observable<VentaPresencial> {
    return this.http.get<VentaPresencial>(`${this.API_URL}/${id}`);
  }

  searchClients(query: string): Observable<ClientProfile[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<ClientProfile[]>(`${this.CLIENTES_URL}/buscar`, { params });
  }

  getClientByNit(nitCi: string): Observable<ClientProfile> {
    return this.http.get<ClientProfile>(`${this.CLIENTES_URL}/por-nit/${encodeURIComponent(nitCi)}`);
  }

  getSalePdfUrl(saleId: number): string {
    return `${this.API_URL}/${saleId}/comprobante/pdf`;
  }

  getOrderPdfUrl(orderId: number): string {
    return `${this.ORDENES_URL}/${orderId}/comprobante/pdf`;
  }
}
