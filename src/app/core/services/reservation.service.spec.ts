import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReservationService } from './reservation.service';
import { environment } from '../../../environments/environment';
import { Reserva, ReservaCreate, CompletarReservaRequest } from '../models/reservation.model';

describe('ReservationService (Iteración 2 - CU12, CU14)', () => {
  let service: ReservationService;
  let httpMock: HttpTestingController;
  const API_URL = `${environment.apiUrl}/reservas`;

  const mockReserva: Reserva = {
    id: 1,
    numero_reserva: 'RES-2026-0001',
    cliente_id: 10,
    sucursal_id: 2,
    fecha_creacion: '2026-09-09T12:00:00Z',
    fecha_reserva: '2026-09-10T15:00:00Z',
    estado: 'PENDIENTE',
    detalles: [
      {
        id: 1,
        reserva_id: 1,
        variante_producto_id: 101,
        cantidad: 1,
        estado: 'PENDIENTE'
      }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ReservationService]
    });
    service = TestBed.inject(ReservationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crear una reserva de prendas (CU12)', () => {
    const createData: ReservaCreate = {
      sucursal_id: 2,
      fecha_reserva: '2026-09-10T15:00:00Z',
      horario_aproximado: '15:00',
      detalles: [{ variante_producto_id: 101, cantidad: 1 }]
    };

    service.createReservation(createData).subscribe(res => {
      expect(res.id).toBe(1);
      expect(res.numero_reserva).toBe('RES-2026-0001');
      expect(res.estado).toBe('PENDIENTE');
    });

    const req = httpMock.expectOne(`${API_URL}/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(createData);
    req.flush(mockReserva);
  });

  it('debe preparar, confirmar y completar una reserva por encargado (CU14)', () => {
    // 1. Preparar
    service.prepareReservation(1).subscribe(res => {
      expect(res.estado).toBe('EN_PREPARACION');
    });
    const prepReq = httpMock.expectOne(`${API_URL}/1/preparar`);
    expect(prepReq.request.method).toBe('PUT');
    prepReq.flush({ ...mockReserva, estado: 'EN_PREPARACION' });

    // 2. Confirmar
    service.confirmReservation(1).subscribe(res => {
      expect(res.estado).toBe('CONFIRMADA');
    });
    const confReq = httpMock.expectOne(`${API_URL}/1/confirmar`);
    expect(confReq.request.method).toBe('PUT');
    confReq.flush({ ...mockReserva, estado: 'CONFIRMADA' });

    // 3. Completar venta
    const compData: CompletarReservaRequest = {
      items: [{ detalle_reserva_id: 1, comprado: true }],
      metodo_pago: 'EFECTIVO'
    };
    service.completeReservation(1, compData).subscribe(res => {
      expect(res.estado).toBe('COMPLETADA');
    });
    const compReq = httpMock.expectOne(`${API_URL}/1/completar`);
    expect(compReq.request.method).toBe('PUT');
    compReq.flush({ ...mockReserva, estado: 'COMPLETADA' });
  });
});
