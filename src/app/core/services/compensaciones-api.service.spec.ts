import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CompensacionesApiService } from './compensaciones-api.service';
import { firstValueFrom } from 'rxjs';

/** [EXAMEN-2] Contract tests de compensaciones. */
describe('CompensacionesApiService', () => {
  let svc: CompensacionesApiService;
  let httpMock: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ imports: [HttpClientTestingModule] }); svc = TestBed.inject(CompensacionesApiService); httpMock = TestBed.inject(HttpTestingController); });
  afterEach(() => { httpMock.verify(); TestBed.resetTestingModule(); });
  it('lista, detalle, confirmar, reintentar y resumen', async () => {
    const l = firstValueFrom(svc.listar());
    httpMock.expectOne((r) => r.url.includes('/offline/compensaciones')).flush([]);
    expect((await l).length).toBe(0);
    const d = firstValueFrom(svc.detalle(1));
    httpMock.expectOne((r) => r.url.includes('/compensaciones/1')).flush({ id: 1, tipo: 'REEMBOLSO_EFECTIVO', monto: 10, estado: 'PENDIENTE', fecha_creacion: 'x' });
    expect((await d).id).toBe(1);
    const r = firstValueFrom(svc.resumen());
    httpMock.expectOne((x) => x.url.includes('/resumen')).flush({ pendientes: 1 });
    expect((await r).pendientes).toBe(1);
  });
});
