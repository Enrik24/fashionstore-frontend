import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Orden, OrdenCreateFromCarrito, Comprobante } from '../models/cart.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/ordenes`;

  createOrderFromCart(data: OrdenCreateFromCarrito): Observable<Orden> {
    return this.http.post<Orden>(`${this.API_URL}/`, data);
  }

  getMyOrders(): Observable<Orden[]> {
    return this.http.get<Orden[]>(`${this.API_URL}/`);
  }

  getOrderById(id: number): Observable<Orden> {
    return this.http.get<Orden>(`${this.API_URL}/${id}`);
  }

  getOrderReceipt(id: number): Observable<Comprobante> {
    return this.http.get<Comprobante>(`${this.API_URL}/${id}/comprobante`);
  }

  getOrderReceiptPdfUrl(orderId: number): string {
    return `${this.API_URL}/${orderId}/comprobante/pdf`;
  }
}
