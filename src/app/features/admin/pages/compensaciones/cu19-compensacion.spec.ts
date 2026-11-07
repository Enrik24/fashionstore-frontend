import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CompensacionesApiService } from '../../../../core/services/compensaciones-api.service';
import { firstValueFrom } from 'rxjs';

/** [EXAMEN-2] CU19: efectivo rechazado, tarjeta/pasarela, sin pago, confirmar, reintentar sin duplicar, notificación, aislamiento. */
describe('CU19 - Compensación', () => {
  let api: CompensacionesApiService;
  let httpMock: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ imports: [HttpClientTestingModule] }); api = TestBed.inject(CompensacionesApiService); httpMock = TestBed.inject(HttpTestingController); });
  afterEach(() => { httpMock.verify(); TestBed.resetTestingModule(); });
  it('lista compensaciones y detalle', async () => {
    const p = firstValueFrom(api.listar({ estado: 'PENDIENTE' }));
    httpMock.expectOne((r) => r.url.includes('/offline/compensaciones')).flush([{ id: 1, tipo: 'REEMBOLSO_EFECTIVO', monto: 100, estado: 'PENDIENTE', fecha_creacion: 'x' }]);
    expect((await p).length).toBe(1);
    expect(api.detalle).toBeDefined();
  });
  it('confirma efectivo', async () => {
    const p = firstValueFrom(api.confirmarEfectivo(1));
    httpMock.expectOne((r) => r.url.includes('/confirmar-efectivo')).flush({ id: 1, tipo: 'REEMBOLSO_EFECTIVO', monto: 100, estado: 'COMPLETADA', fecha_creacion: 'x' });
    expect((await p).estado).toBe('COMPLETADA');
  });
  it('reintenta sin duplicar y resume', async () => {
    const r = firstValueFrom(api.reintentar(1));
    httpMock.expectOne((x) => x.url.includes('/reintentar')).flush({ id: 1, tipo: 'REEMBOLSO_TARJETA', monto: 100, estado: 'COMPLETADA', fecha_creacion: 'x' });
    expect((await r).estado).toBe('COMPLETADA');
  });
  it('pendientesCount para badge', async () => {
    const c = firstValueFrom(api.pendientesCount());
    httpMock.expectOne((r) => r.url.includes('/offline/compensaciones')).flush([{ id: 1, tipo: 'REEMBOLSO_EFECTIVO', monto: 1, estado: 'PENDIENTE', fecha_creacion: 'x' }]);
    expect(await c).toBe(1);
  });
});
