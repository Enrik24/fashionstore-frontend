import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { offlineTokenInterceptor } from './offline-token.interceptor';
import { ConnectivityService } from '../offline/connectivity.service';
import { OfflineSessionService } from '../offline/offline-session.service';
import { StorageService } from '../services/storage.service';

/**
 * [EXAMEN-2] Interceptor 1.º del capítulo 6.3.
 * Regla vigente: en rutas de negocio offline el token offline se usa siempre
 * que NO haya red 【o】 haya red pero no exista token online (sesión online
 * expirada tras recuperar la conexión: el backend de sync acepta ambos tokens).
 */
describe('offlineTokenInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  const enLinea = signal(true);
  const tokenOffline = signal<string | null>('tok-offline');
  const tokenOnline = signal<string | null>('tok-online');

  beforeEach(() => {
    enLinea.set(true);
    tokenOffline.set('tok-offline');
    tokenOnline.set('tok-online');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([offlineTokenInterceptor])),
        provideHttpClientTesting(),
        { provide: ConnectivityService, useValue: { enLinea } },
        { provide: OfflineSessionService, useValue: { tokenOffline: () => tokenOffline() } },
        { provide: StorageService, useValue: { getAccessToken: () => tokenOnline() } }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('usa el token offline sin red en una ruta de negocio offline', () => {
    enLinea.set(false);

    http.get('/api/v1/offline/sync').subscribe();

    const peticion = httpMock.expectOne('/api/v1/offline/sync');
    expect(peticion.request.headers.get('Authorization')).toBe('Bearer tok-offline');
    peticion.flush({});
  });

  it('no adjunta el token offline cuando hay red Y hay token online disponible', () => {
    // El interceptor solo consulta storage cuando no hay token online; en este
    // caso (red disponible) la sesión online manda y no se toca el header.
    http.get('/api/v1/offline/sync').subscribe();

    const peticion = httpMock.expectOne('/api/v1/offline/sync');
    expect(peticion.request.headers.has('Authorization')).toBeFalse();
    peticion.flush({});
  });

  it('con red PERO sin token online, usa el token offline en rutas de sync', () => {
    // [EXAMEN-2] CU06/CU07: al recuperar la red el token online puede haber
    // expirado. El backend de sync acepta ambos tokens.
    tokenOnline.set(null);

    http.get('/api/v1/offline/sync').subscribe();

    const peticion = httpMock.expectOne('/api/v1/offline/sync');
    expect(peticion.request.headers.get('Authorization')).toBe('Bearer tok-offline');
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
