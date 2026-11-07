import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AnaliticaApiService } from './analitica-api.service';
import { firstValueFrom } from 'rxjs';

/** [EXAMEN-2] Contract tests del servicio de analítica. */
describe('AnaliticaApiService', () => {
  let svc: AnaliticaApiService;
  let httpMock: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ imports: [HttpClientTestingModule] }); svc = TestBed.inject(AnaliticaApiService); httpMock = TestBed.inject(HttpTestingController); });
  afterEach(() => { httpMock.verify(); TestBed.resetTestingModule(); });
  it('solicita reporte y ejecuta interpretación', async () => {
    const p = firstValueFrom(svc.solicitar({ prompt: 'ventas' }));
    httpMock.expectOne((r) => r.url.includes('/reportes-ia/solicitar')).flush({ estado: 'COMPLETADA' });
    expect((await p).estado).toBe('COMPLETADA');
    const e = firstValueFrom(svc.ejecutar(1));
    httpMock.expectOne((r) => r.url.includes('/ejecutar')).flush({ estado: 'COMPLETADA' });
    expect((await e).estado).toBe('COMPLETADA');
  });
  it('dashboard, kpis, modelos y datasets', async () => {
    const d = firstValueFrom(svc.obtenerDashboard());
    httpMock.expectOne((r) => r.url.includes('/analitica/dashboard')).flush({ kpis: [] });
    expect((await d).kpis).toEqual([]);
    const m = firstValueFrom(svc.listarModelos());
    httpMock.expectOne((r) => r.url.includes('/ml/modelos')).flush({ modelos: [] });
    expect((await m).length).toBe(0);
  });
});
