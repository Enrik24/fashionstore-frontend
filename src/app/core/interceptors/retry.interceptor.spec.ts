import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { retryInterceptor } from './retry.interceptor';

/**
 * Cubre el reintento ante fallos transitorios del backend (502/503/504 y
 * error de red). El caso 502 es el que se veía en el dashboard desplegado:
 * el proxy de Render respondía 502 y el navegador lo reportaba como error
 * de CORS.
 */
describe('retryInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([retryInterceptor])),
        provideHttpClientTesting()
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('reintenta un GET ante un 502 y entrega la respuesta del segundo intento', fakeAsync(() => {
    let resultado: unknown;
    let error: unknown;

    http.get('/api/v1/kpis/dashboard').subscribe({
      next: (r) => (resultado = r),
      error: (e) => (error = e)
    });

    httpMock.expectOne('/api/v1/kpis/dashboard').flush(
      { detail: 'Bad Gateway' },
      { status: 502, statusText: 'Bad Gateway' }
    );

    // Backoff exponencial: el primer reintento espera 1.2 s.
    tick(1200);

    const reintento = httpMock.expectOne('/api/v1/kpis/dashboard');
    reintento.flush({ total: 10 });

    expect(resultado).toEqual({ total: 10 });
    expect(error).toBeUndefined();
  }));

  it('reintenta también un 503', fakeAsync(() => {
    let resultado: unknown;

    http.get('/api/v1/reportes/clientes').subscribe((r) => (resultado = r));

    httpMock.expectOne('/api/v1/reportes/clientes').flush(
      { detail: 'Service Unavailable' },
      { status: 503, statusText: 'Service Unavailable' }
    );

    tick(1200);
    httpMock.expectOne('/api/v1/reportes/clientes').flush({ ok: true });

    expect(resultado).toEqual({ ok: true });
  }));

  it('no reintenta un 404', fakeAsync(() => {
    let error: unknown;

    http.get('/api/v1/no-existe').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne('/api/v1/no-existe').flush(
      { detail: 'Not Found' },
      { status: 404, statusText: 'Not Found' }
    );

    tick(5000);

    expect(error).toBeDefined();
    expect((error as { status: number }).status).toBe(404);
    httpMock.expectNone('/api/v1/no-existe');
  }));

  it('no reintenta un POST para no duplicar la operación', fakeAsync(() => {
    let error: unknown;

    http.post('/api/v1/pagos', {}).subscribe({ error: (e) => (error = e) });

    httpMock.expectOne('/api/v1/pagos').flush(
      { detail: 'Bad Gateway' },
      { status: 502, statusText: 'Bad Gateway' }
    );

    tick(5000);

    expect(error).toBeDefined();
    expect((error as { status: number }).status).toBe(502);
    httpMock.expectNone('/api/v1/pagos');
  }));

  it('propaga el error tras agotar los reintentos', fakeAsync(() => {
    let error: unknown;

    http.get('/api/v1/kpis/dashboard').subscribe({ error: (e) => (error = e) });

    // Intento original + 3 reintentos (1.2 s, 2.4 s, 4.8 s).
    for (const espera of [0, 1200, 2400, 4800]) {
      tick(espera);
      httpMock.expectOne('/api/v1/kpis/dashboard').flush(
        { detail: 'Bad Gateway' },
        { status: 502, statusText: 'Bad Gateway' }
      );
    }

    tick(8000);

    expect(error).toBeDefined();
    expect((error as { status: number }).status).toBe(502);
  }));
});
