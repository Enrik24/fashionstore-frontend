export type MetodoPagoDigital = 'STRIPE' | 'PAYPAL';
export type EstadoTransaccion = 'PENDIENTE' | 'EXITOSO' | 'FALLIDO' | 'REEMBOLSADO';
export type EstadoPasarela = 'ACTIVO' | 'INACTIVO' | 'PRUEBAS';

export interface StripeCheckoutRequest {
  orden_id: number;
  success_url?: string;
  cancel_url?: string;
}

export interface StripeCheckoutResponse {
  checkout_url: string;
  session_id: string;
}

export interface PayPalOrderRequest {
  orden_id: number;
  return_url?: string;
  cancel_url?: string;
}

export interface PayPalOrderResponse {
  order_id: string;
  approve_url: string;
  status: string;
}

export interface PayPalCaptureRequest {
  paypal_order_id: string;
  orden_id: number;
}

export interface TransaccionPago {
  id: number;
  orden_id: number;
  pasarela_pago_id?: number;
  monto: number;
  moneda: string;
  metodo_pago: MetodoPagoDigital;
  estado: EstadoTransaccion;
  referencia_externa?: string;
  fecha: string;
  datos_respuesta?: any;
}

export interface PasarelaPago {
  id: number;
  nombre: string;
  tipo: string;
  estado: EstadoPasarela;
}
