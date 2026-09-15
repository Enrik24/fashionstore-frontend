import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  StripeCheckoutRequest, 
  StripeCheckoutResponse, 
  PayPalOrderRequest, 
  PayPalOrderResponse, 
  PayPalCaptureRequest, 
  TransaccionPago 
} from '../models/payment.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/pagos`;

  createStripeCheckoutSession(data: StripeCheckoutRequest): Observable<StripeCheckoutResponse> {
    return this.http.post<StripeCheckoutResponse>(`${this.API_URL}/stripe/crear-checkout`, data);
  }

  confirmarStripeRetorno(sessionId: string, ordenId: number): Observable<unknown> {
    return this.http.post(`${this.API_URL}/stripe/confirmar-retorno`, null, {
      params: { session_id: sessionId, orden_id: ordenId }
    });
  }

  createPayPalOrder(data: PayPalOrderRequest): Observable<PayPalOrderResponse> {
    return this.http.post<PayPalOrderResponse>(`${this.API_URL}/paypal/crear-orden`, data);
  }

  capturePayPalOrder(data: PayPalCaptureRequest): Observable<TransaccionPago> {
    return this.http.post<TransaccionPago>(`${this.API_URL}/paypal/capturar`, data);
  }
}
