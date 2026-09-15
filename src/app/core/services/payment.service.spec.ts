import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PaymentService } from './payment.service';
import { environment } from '../../../environments/environment';
import { StripeCheckoutResponse, PayPalOrderResponse, TransaccionPago } from '../models/payment.model';

describe('PaymentService (Iteración 2 - CU16, CU18)', () => {
  let service: PaymentService;
  let httpMock: HttpTestingController;
  const API_URL = `${environment.apiUrl}/pagos`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PaymentService]
    });
    service = TestBed.inject(PaymentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crear una sesión de checkout de Stripe (CU16 / CU18)', () => {
    const mockResponse: StripeCheckoutResponse = {
      checkout_url: 'https://checkout.stripe.com/c/pay/cs_test_123',
      session_id: 'cs_test_123'
    };

    service.createStripeCheckoutSession({ orden_id: 10 }).subscribe(res => {
      expect(res.session_id).toBe('cs_test_123');
      expect(res.checkout_url).toContain('stripe.com');
    });

    const req = httpMock.expectOne(`${API_URL}/stripe/crear-checkout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ orden_id: 10 });
    req.flush(mockResponse);
  });

  it('debe confirmar el retorno de Stripe tras el pago', () => {
    service.confirmarStripeRetorno('cs_test_123', 10).subscribe();

    const req = httpMock.expectOne(r =>
      r.url === `${API_URL}/stripe/confirmar-retorno` &&
      r.params.get('session_id') === 'cs_test_123' &&
      r.params.get('orden_id') === '10'
    );
    expect(req.request.method).toBe('POST');
    req.flush({ mensaje: 'Pago de Stripe procesado exitosamente' });
  });

  it('debe crear una orden de PayPal y capturar el pago (CU16)', () => {
    const mockOrderResponse: PayPalOrderResponse = {
      order_id: 'PAYPAL-ORD-999',
      approve_url: 'https://www.sandbox.paypal.com/checkoutnow?token=999',
      status: 'CREATED'
    };

    service.createPayPalOrder({ orden_id: 10 }).subscribe(res => {
      expect(res.order_id).toBe('PAYPAL-ORD-999');
      expect(res.status).toBe('CREATED');
    });

    const req = httpMock.expectOne(`${API_URL}/paypal/crear-orden`);
    expect(req.request.method).toBe('POST');
    req.flush(mockOrderResponse);

    // Capture
    const mockCapture: TransaccionPago = {
      id: 50,
      orden_id: 10,
      monto: 250,
      moneda: 'BOB',
      metodo_pago: 'PAYPAL',
      estado: 'EXITOSO',
      fecha: '2026-09-09T14:00:00Z'
    };

    service.capturePayPalOrder({ paypal_order_id: 'PAYPAL-ORD-999', orden_id: 10 }).subscribe(res => {
      expect(res.estado).toBe('EXITOSO');
    });

    const captureReq = httpMock.expectOne(`${API_URL}/paypal/capturar`);
    expect(captureReq.request.method).toBe('POST');
    captureReq.flush(mockCapture);
  });
});
