import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { offlineTokenInterceptor } from './offline-token.interceptor';
import { ConnectivityService } from '../offline/connectivity.service';
import { OfflineSessionService } from '../offline/offline-session.service';

/**
 * [EXAMEN-2] Interceptor 1.º del capítulo 6.3.
 * Prueba que el token offline solo sustituye al token online en rutas de
 * negocio offline y cuando no hay red.
 */
describe('offlineTokenInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  const enLinea = signal(true);
  const tokenOffline = signal<string | null>('tok-offline');

  beforeEach(() => {
    enLinea.set(true);
    tokenOffline.set('tok-offline');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([offlineTokenInterceptor])),
        provideHttpClientTesting(),
        { provide: ConnectivityService, useValue: { enLinea } },
        { provide: OfflineSessionService, useValue: { tokenOffline: () => tokenOffline() } }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('adjunta el token offline sin red en una ruta de negocio offline', () => {
    enLinea.set(false);

    http.get('/api/v1/offline/sync').subscribe();

    const peticion = httpMock.expectOne('/api/v1/offline/sync');
    expect(peticion.request.headers.get('Authorization')).toBe('Bearer tok-offline');
    peticion.flush({});
  });

  it('no adjunta el token offline cuando hay red', () => {
    http.get('/api/v1/offline/sync').subscribe();

    const peticion = httpMock.expectOne('/api/v1/offline/sync');
    expect(peticion.request.headers.has('Authorization')).toBeFalse();
    peticion.flush({});
  });

  it('no usa el token offline en rutas que no son de negocio offline', () => {
    enLinea.set(false);

    http.get('/api/v1/offline/dispositivos').subscribe();

    const peticion = httpMock.expectOne('/api/v1/offline/dispositivos');
    expect(peticion.request.headers.has('Authorization')).toBeFalse();
    peticion.flush({});
  });

  it('no adjunta nada si no hay token offline disponible', () => {
    enLinea.set(false);
    tokenOffline.set(null);

    http.get('/api/v1/pagos/diferidos').subscribe();

    const peticion = httpMock.expectOne('/api/v1/pagos/diferidos');
    expect(peticion.request.headers.has('Authorization')).toBeFalse();
    peticion.flush({});
  });
});
