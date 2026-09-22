import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PromotionApiService } from './promotion-api.service';
import { environment } from '../../../environments/environment';
import { Promocion, PromocionCreateDto, EstadoPromocion } from '../models/promotion.model';

describe('PromotionApiService (CU24 - Promociones)', () => {
  let service: PromotionApiService;
  let httpMock: HttpTestingController;
  const API_URL = `${environment.apiUrl}/promociones`;

  const mockPromocion: Promocion = {
    id: 1,
    nombre: 'Black Friday 2026',
    descripcion: 'Descuentos de temporada',
    tipo: 'PORCENTAJE',
    valor: 25,
    fecha_inicio: '2026-11-01T00:00:00Z',
    fecha_fin: '2026-11-30T23:59:59Z',
    estado: 'ACTIVA',
    producto_ids: [1, 2],
    categoria_ids: [3],
    sucursal_ids: []
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PromotionApiService]
    });

    service = TestBed.inject(PromotionApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse', () => {
    expect(service).toBeTruthy();
  });

  it('debe listar promociones con filtros de estado, tipo y vigencia', () => {
    service.getPromotions({ estado: 'ACTIVA', tipo: 'PORCENTAJE', solo_vigentes: true }).subscribe(res => {
      expect(res.length).toBe(1);
      expect(res[0].nombre).toBe('Black Friday 2026');
    });

    const req = httpMock.expectOne(r =>
      r.url === `${API_URL}/` &&
      r.params.get('estado') === 'ACTIVA' &&
      r.params.get('tipo') === 'PORCENTAJE' &&
      r.params.get('solo_vigentes') === 'true'
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockPromocion]);
  });

  it('debe obtener una promoción por ID', () => {
    service.getPromotion(1).subscribe(res => {
      expect(res.id).toBe(1);
    });

    const req = httpMock.expectOne(`${API_URL}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPromocion);
  });

  it('debe crear una promoción con aplicabilidad por productos y categorías', () => {
    const dto: PromocionCreateDto = {
      nombre: 'Rebajas Verano',
      tipo: 'PORCENTAJE',
      valor: 15,
      fecha_inicio: '2026-07-01T00:00:00Z',
      fecha_fin: '2026-07-31T00:00:00Z',
      estado: 'ACTIVA',
      producto_ids: [10],
      categoria_ids: [2],
      sucursal_ids: []
    };

    service.createPromotion(dto).subscribe(res => {
      expect(res.id).toBe(2);
      expect(res.producto_ids).toContain(10);
    });

    const req = httpMock.expectOne(`${API_URL}/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.producto_ids).toEqual([10]);
    expect(req.request.body.categoria_ids).toEqual([2]);
    req.flush({ ...mockPromocion, id: 2, nombre: 'Rebajas Verano', producto_ids: [10], categoria_ids: [2] });
  });

  it('debe actualizar y cambiar el estado vía PATCH /promociones/{id}/estado', () => {
    service.changeStatus(1, 'INACTIVA' as EstadoPromocion).subscribe(res => {
      expect(res.estado).toBe('INACTIVA');
    });

    const req = httpMock.expectOne(`${API_URL}/1/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estado: 'INACTIVA' });
    req.flush({ ...mockPromocion, estado: 'INACTIVA' });
  });

  it('debe eliminar una promoción', () => {
    service.deletePromotion(1).subscribe(res => {
      expect(res.message).toBeTruthy();
    });

    const req = httpMock.expectOne(`${API_URL}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Promoción eliminada' });
  });

  it('debe obtener las promociones activas del catálogo público', () => {
    service.getActivePromotions().subscribe(res => {
      expect(res.length).toBe(1);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/public/promociones/activas`);
    expect(req.request.method).toBe('GET');
    req.flush([mockPromocion]);
  });
});
