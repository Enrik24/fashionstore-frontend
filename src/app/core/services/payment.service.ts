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
import {
  CrearPagoDiferidoRequest,
  ResultadoPagoDiferido
} from '../models/pago-diferido.model';
import { PagosDiferidosApiService } from './pagos-diferidos-api.service';

export interface EstadoStripeTraducido {
  etiqueta: string;
  color: 'success' | 'warning' | 'danger' | 'info';
  descripcion: string;
  terminal: boolean;
  requiereAccion: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private http = inject(HttpClient);
  private pagosDiferidos = inject(PagosDiferidosApiService);
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

  // ============================================================
  // [EXAMEN-2] CU16: pago diferido
  // ============================================================

  iniciarPagoDiferido(datos: CrearPagoDiferidoRequest): Observable<ResultadoPagoDiferido> {
    return this.pagosDiferidos.crearPago(datos);
  }

  confirmarPagoDiferido(uuidPago: string): Observable<ResultadoPagoDiferido> {
    return this.pagosDiferidos.confirmarPago(uuidPago);
  }

  /** Traduce los estados de Stripe y del backend a etiquetas para la UI. */
  traducirEstadoStripe(estado: string | null | undefined): EstadoStripeTraducido {
    const normalizado = String(estado ?? '').toUpperCase();
    switch (normalizado) {
      case 'SUCCEEDED':
      case 'CONFIRMADO':
        return {
          etiqueta: 'Pagado',
          color: 'success',
          descripcion: 'El pago fue confirmado por Stripe.',
          terminal: true,
          requiereAccion: false
        };
      case 'REQUIERE_ACCION_CLIENTE':
      case 'REQUIRES_ACTION':
        return {
          etiqueta: 'Requiere acción',
          color: 'warning',
          descripcion: 'El banco solicita autenticación adicional (3D Secure).',
          terminal: false,
          requiereAccion: true
        };
      case 'EN_COLA':
      case 'EN_PROCESO':
      case 'PENDIENTE_ENVIO':
      case 'PROCESSING':
        return {
          etiqueta: 'En proceso',
          color: 'info',
          descripcion: 'El pago está en cola y se confirmará al recuperar la conexión.',
          terminal: false,
          requiereAccion: false
        };
      case 'RECHAZADO':
      case 'REQUIRES_PAYMENT_METHOD':
        return {
          etiqueta: 'Rechazado',
          color: 'danger',
          descripcion: 'El pago fue rechazado; puedes reintentar con otro medio.',
          terminal: false,
          requiereAccion: false
        };
      case 'EXPIRADO':
        return {
          etiqueta: 'Expirado',
          color: 'danger',
          descripcion: 'La vigencia del pago terminó y el stock fue liberado.',
          terminal: true,
          requiereAccion: false
        };
      case 'REEMBOLSADO':
        return {
          etiqueta: 'Reembolsado',
          color: 'info',
          descripcion: 'El monto fue devuelto al cliente.',
          terminal: true,
          requiereAccion: false
        };
      case 'CANCELADO':
        return {
          etiqueta: 'Cancelado',
          color: 'info',
          descripcion: 'El pago fue cancelado por el usuario.',
          terminal: true,
          requiereAccion: false
        };
      case 'ERROR_CRITICO':
        return {
          etiqueta: 'Error crítico',
          color: 'danger',
          descripcion: 'Se requiere revisión manual antes de reintentar el cobro.',
          terminal: true,
          requiereAccion: false
        };
      default:
        return {
          etiqueta: 'Pendiente',
          color: 'warning',
          descripcion: 'El pago aún no tiene un estado definitivo.',
          terminal: false,
          requiereAccion: false
        };
    }
  }
}
