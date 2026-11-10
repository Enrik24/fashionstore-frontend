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
  it('acepta el resumen agrupado por estado del backend', async () => {
    const r = firstValueFrom(svc.resumen());
    httpMock.expectOne((x) => x.url.includes('/resumen')).flush({
      por_estado: {
        PENDIENTE: { cantidad: 2, monto: 150 },
        COMPLETADA: { cantidad: 3, monto: 400 },
      },
      por_tipo: {
        REEMBOLSO_EFECTIVO: { cantidad: 1, monto: 50 },
      },
    });
    const resumen = await r;
    expect(resumen.por_estado?.['PENDIENTE'].cantidad).toBe(2);
    expect(resumen.por_estado?.['COMPLETADA'].monto).toBe(400);
  });

  it('desenvuelve { compensaciones: [...] } del backend en array (bug Symbol.iterator)', async () => {
    const l = firstValueFrom(svc.listar());
    httpMock.expectOne((r) => r.url.includes('/offline/compensaciones')).flush({ compensaciones: [{ id: 1, tipo: 'REEMBOLSO_EFECTIVO', monto: 10, estado: 'PENDIENTE', fecha_creacion: 'x' }] });
    const lista = await l;
    expect(Array.isArray(lista)).toBe(true);
    expect(lista.length).toBe(1);
  });
});
