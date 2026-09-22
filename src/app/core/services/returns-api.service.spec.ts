import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReturnsApiService } from './returns-api.service';
import { environment } from '../../../environments/environment';
import {
  SolicitudDevolucion,
  SolicitudDevolucionCreateDto,
  EstadoSolicitudDevolucion
} from '../models/return.model';

describe('ReturnsApiService (CU28 - Devoluciones y Cambios)', () => {
  let service: ReturnsApiService;
  let httpMock: HttpTestingController;
  const API_URL = `${environment.apiUrl}/devoluciones`;

  const mockSolicitud: SolicitudDevolucion = {
    id: 1,
    numero_solicitud: 'DEV-20260920-A1B2',
    cliente_id: 5,
    orden_id: 10,
    sucursal_id: 1,
    tipo: 'DEVOLUCION',
    motivo: 'TALLA_INCORRECTA',
    motivo_detalle: 'La talla M me quedó pequeña',
    estado: 'PENDIENTE',
    monto_reembolso: 180,
    observaciones_staff: null,
    revisado_por_id: null,
    fecha_solicitud: '2026-09-20T10:00:00Z',
    fecha_resolucion: null,
    detalles: [
      {
        id: 1,
        solicitud_id: 1,
        detalle_orden_id: 55,
        variante_producto_id: 100,
        cantidad: 1,
        variante_cambio_id: null,
        precio_unitario: 180
      }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ReturnsApiService]
    });

    service = TestBed.inject(ReturnsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse', () => {
    expect(service).toBeTruthy();
  });

  it('debe crear una solicitud de devolución con los items seleccionados', () => {
    const dto: SolicitudDevolucionCreateDto = {
      orden_id: 10,
      sucursal_id: 1,
      tipo: 'DEVOLUCION',
      motivo: 'TALLA_INCORRECTA',
      motivo_detalle: 'La talla M me quedó pequeña',
      items: [{ detalle_orden_id: 55, cantidad: 1, variante_cambio_id: null }]
    };

    service.createRequest(dto).subscribe(res => {
      expect(res.numero_solicitud).toContain('DEV-');
      expect(res.estado).toBe('PENDIENTE');
    });

    const req = httpMock.expectOne(`${API_URL}/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.items[0].detalle_orden_id).toBe(55);
    req.flush(mockSolicitud);
  });

  it('debe listar las solicitudes del cliente (mis-solicitudes)', () => {
    service.getMyRequests().subscribe(res => {
      expect(res.length).toBe(1);
      expect(res[0].tipo).toBe('DEVOLUCION');
    });

    const req = httpMock.expectOne(r =>
      r.url === `${API_URL}/mis-solicitudes` && r.params.get('limit') === '50'
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockSolicitud]);
  });

  it('debe obtener el detalle de una solicitud por ID', () => {
    service.getRequest(1).subscribe(res => {
      expect(res.id).toBe(1);
      expect(res.detalles.length).toBe(1);
    });

    const req = httpMock.expectOne(`${API_URL}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockSolicitud);
  });

  it('debe listar solicitudes para el staff con filtro de estado', () => {
    service.getStaffRequests('PENDIENTE' as EstadoSolicitudDevolucion).subscribe(res => {
      expect(res.length).toBe(1);
      expect(res[0].estado).toBe('PENDIENTE');
    });

    const req = httpMock.expectOne(r =>
      r.url === `${API_URL}/` && r.params.get('estado') === 'PENDIENTE'
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockSolicitud]);
  });

  it('debe revisar una solicitud con la acción indicada (PATCH /revisar)', () => {
    service.reviewRequest(1, { accion: 'APROBAR' }).subscribe(res => {
      expect(res.estado).toBe('APROBADA');
    });

    const req = httpMock.expectOne(`${API_URL}/1/revisar`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ accion: 'APROBAR' });
    req.flush({ ...mockSolicitud, estado: 'APROBADA' });
  });

  it('debe rechazar una solicitud con observaciones obligatorias', () => {
    service.reviewRequest(1, { accion: 'RECHAZAR', observaciones: 'Prenda usada' }).subscribe(res => {
      expect(res.estado).toBe('RECHAZADA');
      expect(res.observaciones_staff).toBe('Prenda usada');
    });

    const req = httpMock.expectOne(`${API_URL}/1/revisar`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ accion: 'RECHAZAR', observaciones: 'Prenda usada' });
    req.flush({ ...mockSolicitud, estado: 'RECHAZADA', observaciones_staff: 'Prenda usada' });
  });

  it('debe reintentar el reembolso de una solicitud PENDIENTE_REEMBOLSO', () => {
    service.processRefund(1).subscribe(res => {
      expect(res.estado).toBe('COMPLETADA');
    });

    const req = httpMock.expectOne(`${API_URL}/1/procesar-reembolso`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ ...mockSolicitud, estado: 'COMPLETADA' });
  });
});
