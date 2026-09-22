import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReviewsApiService } from './reviews-api.service';
import { environment } from '../../../environments/environment';
import { Valoracion, ValoracionCreateDto } from '../models/review.model';

describe('ReviewsApiService (CU26 - Valoraciones)', () => {
  let service: ReviewsApiService;
  let httpMock: HttpTestingController;
  const API_PRODUCTOS = `${environment.apiUrl}/productos`;
  const API_VALORACIONES = `${environment.apiUrl}/valoraciones`;

  const mockValoracion: Valoracion = {
    id: 1,
    producto_id: 100,
    cliente_id: 5,
    cliente_nombre: 'Carlos R.',
    puntuacion: 5,
    comentario: 'Excelente calidad y talla perfecta',
    estado: 'PUBLICADA',
    fecha_creacion: '2026-09-20T10:00:00Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ReviewsApiService]
    });

    service = TestBed.inject(ReviewsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse', () => {
    expect(service).toBeTruthy();
  });

  it('debe listar valoraciones de un producto con paginación', () => {
    service.getProductReviews(100, 1, 10).subscribe(res => {
      expect(res.length).toBe(1);
      expect(res[0].puntuacion).toBe(5);
    });

    const req = httpMock.expectOne(r =>
      r.url === `${API_PRODUCTOS}/100/valoraciones` &&
      r.params.get('skip') === '10' &&
      r.params.get('limit') === '10'
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockValoracion]);
  });

  it('debe crear una valoración con puntuación y comentario', () => {
    const dto: ValoracionCreateDto = { puntuacion: 4, comentario: 'Muy buena prenda' };

    service.createReview(100, dto).subscribe(res => {
      expect(res.estado).toBe('PUBLICADA');
    });

    const req = httpMock.expectOne(`${API_PRODUCTOS}/100/valoraciones`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockValoracion);
  });

  it('debe editar la valoración propia vía PUT /valoraciones/{id}', () => {
    service.updateReview(1, { puntuacion: 3, comentario: 'Actualizada' }).subscribe(res => {
      expect(res.puntuacion).toBe(3);
    });

    const req = httpMock.expectOne(`${API_VALORACIONES}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ puntuacion: 3, comentario: 'Actualizada' });
    req.flush({ ...mockValoracion, puntuacion: 3 });
  });

  it('debe consultar la valoración propia (mi-valoracion)', () => {
    service.getMyReview(100).subscribe(res => {
      expect(res?.id).toBe(1);
    });

    const req = httpMock.expectOne(`${API_PRODUCTOS}/100/mi-valoracion`);
    expect(req.request.method).toBe('GET');
    req.flush(mockValoracion);
  });

  it('debe consultar si el cliente puede valorar (puede-valorar)', () => {
    service.canReview(100).subscribe(res => {
      expect(res.puede_valorar).toBeTrue();
      expect(res.valoracion_existente?.id).toBe(1);
    });

    const req = httpMock.expectOne(`${API_PRODUCTOS}/100/puede-valorar`);
    expect(req.request.method).toBe('GET');
    req.flush({ puede_valorar: true, motivo: null, valoracion_existente: mockValoracion });
  });
});
