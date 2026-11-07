import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { tenantInterceptor } from './tenant.interceptor';
import { StorageService } from '../services/storage.service';
import { TenantContextService } from '../services/tenant-context.service';

/**
 * [EXAMEN-2] Interceptor 3.º del capítulo 6.3.
 * Prueba el encabezado `X-Tenant-ID` que usa el Super Administrador para
 * consultar un tenant desde el panel de plataforma.
 */
describe('tenantInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let storage: jasmine.SpyObj<StorageService>;
  let tenantContext: { tenantConsultadoId: () => number | null };
  let tenantConsultado: number | null;

  beforeEach(() => {
    storage = jasmine.createSpyObj<StorageService>('StorageService', ['getEsSuperAdmin']);
    storage.getEsSuperAdmin.and.returnValue(true);
    tenantConsultado = 10;
    tenantContext = { tenantConsultadoId: () => tenantConsultado };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tenantInterceptor])),
        provideHttpClientTesting(),
        { provide: StorageService, useValue: storage },
        { provide: TenantContextService, useValue: tenantContext }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('envía X-Tenant-ID cuando el Super Administrador consulta un tenant', () => {
    http.get('/api/v1/saas/tenants/10').subscribe();

    const peticion = httpMock.expectOne('/api/v1/saas/tenants/10');
    expect(peticion.request.headers.get('X-Tenant-ID')).toBe('10');
    peticion.flush({});
  });

  it('no envía el encabezado si el usuario no es Super Administrador', () => {
    storage.getEsSuperAdmin.and.returnValue(false);

    http.get('/api/v1/admin/productos').subscribe();

    const peticion = httpMock.expectOne('/api/v1/admin/productos');
    expect(peticion.request.headers.has('X-Tenant-ID')).toBeFalse();
    peticion.flush({});
  });

  it('no envía el encabezado si no hay tenant consultado', () => {
    tenantConsultado = null;

    http.get('/api/v1/saas/tenants').subscribe();

    const peticion = httpMock.expectOne('/api/v1/saas/tenants');
    expect(peticion.request.headers.has('X-Tenant-ID')).toBeFalse();
    peticion.flush({});
  });

  it('respeta un X-Tenant-ID ya presente en la petición', () => {
    http.get('/api/v1/saas/tenants', {
      headers: { 'X-Tenant-ID': '99' }
    }).subscribe();

    const peticion = httpMock.expectOne('/api/v1/saas/tenants');
    expect(peticion.request.headers.get('X-Tenant-ID')).toBe('99');
    peticion.flush({});
  });
});
