import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PosService } from './pos.service';
import { environment } from '../../../environments/environment';
import { VentaPresencial, VentaPresencialCreate } from '../models/cart.model';

describe('PosService (Iteración 2 - CU17)', () => {
  let service: PosService;
  let httpMock: HttpTestingController;
  const API_URL = `${environment.apiUrl}/ventas-presenciales`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PosService]
    });
    service = TestBed.inject(PosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe registrar una venta presencial con método de pago (CU17)', () => {
    const saleData: VentaPresencialCreate = {
      sucursal_id: 1,
      nit_ci_cliente: '12345678',
      metodo_pago: 'EFECTIVO',
      detalles: [
        {
          variante_producto_id: 101,
          cantidad: 2,
          precio_unitario: 120
        }
      ]
    };

    const mockResponse: VentaPresencial = {
      id: 99,
      sucursal_id: 1,
      metodo_pago: 'EFECTIVO',
      fecha: '2026-09-09T16:00:00Z'
    };

    service.createInPersonSale(saleData).subscribe(res => {
      expect(res.id).toBe(99);
      expect(res.metodo_pago).toBe('EFECTIVO');
    });

    const req = httpMock.expectOne(`${API_URL}/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(saleData);
    req.flush(mockResponse);
  });
});
