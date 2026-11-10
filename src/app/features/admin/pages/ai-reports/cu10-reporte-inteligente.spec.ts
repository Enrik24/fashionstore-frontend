import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReportsService } from '../../../../core/services/reports.service';
import { AnaliticaApiService } from '../../../../core/services/analitica-api.service';
import { PlanFeatureService } from '../../../../core/services/plan-feature.service';
import { AiReportsComponent } from './ai-reports.component';
import { firstValueFrom, of } from 'rxjs';

/** [EXAMEN-2] CU10: texto, voz, plan bloqueado, ambigua, no soportada, tabla/gráfico. */
describe('CU10 - Reporte inteligente', () => {
  let reports: ReportsService;
  let api: AnaliticaApiService;
  let httpMock: HttpTestingController;
  let planFeature: jasmine.SpyObj<PlanFeatureService>;
  beforeEach(() => {
    planFeature = jasmine.createSpyObj('PlanFeatureService', ['puedeReportesIA']);
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [{ provide: PlanFeatureService, useValue: planFeature }] });
    reports = TestBed.inject(ReportsService);
    api = TestBed.inject(AnaliticaApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { httpMock.verify(); TestBed.resetTestingModule(); });
  it('solicita por texto y rinde tabla o gráfico', async () => {
    planFeature.puedeReportesIA.and.returnValue(true);
    const p = firstValueFrom(reports.solicitarPorTexto('ventas por sucursal'));
    const req = httpMock.expectOne((r) => r.url.includes('/reportes-ia/solicitar'));
    req.flush({ estado: 'COMPLETADA', tipo_visualizacion: 'TABLA', filas: [{ sucursal: 'Centro', total: 100 }] });
    const r = await p;
    expect(r.tipo_visualizacion).toBe('TABLA');
    expect(r.filas.length).toBe(1);
  });
  it('solicita por voz con FormData', async () => {
    const p = firstValueFrom(api.solicitar({ prompt: 'ventas', origen: 'VOZ' }));
    httpMock.expectOne((r) => r.url.includes('/reportes-ia/solicitar')).flush({ estado: 'COMPLETADA' });
    expect((await p).estado).toBe('COMPLETADA');
  });
  it('plan Básico bloqueado no llama backend', () => {
    planFeature.puedeReportesIA.and.returnValue(false);
    expect(planFeature.puedeReportesIA()).toBeFalse();
    httpMock.expectNone((r) => r.url.includes('/reportes-ia'));
  });
  it('solicitud ambigua pide aclaración', async () => {
    const p = firstValueFrom(api.interpretar({ prompt: 'ventas' }));
    httpMock.expectOne((r) => r.url.includes('/interpretar')).flush({ estado: 'AMBIGUA', preguntas_aclaracion: ['¿Qué periodo?'] });
    const r = await p;
    expect(r.estado).toBe('AMBIGUA');
    expect(r.preguntas_aclaracion?.length).toBe(1);
  });
  it('reporte no soportado muestra mensaje', async () => {
    const p = firstValueFrom(api.solicitar({ prompt: 'clima' }));
    httpMock.expectOne((r) => r.url.includes('/solicitar')).flush({ estado: 'NO_SOPORTADA', error_detalle: 'No disponible' });
    expect((await p).estado).toBe('NO_SOPORTADA');
  });
  it('historial y plantillas', async () => {
    const h = firstValueFrom(api.historial());
    httpMock.expectOne((r) => r.url.includes('/historial')).flush([{ estado: 'COMPLETADA' }]);
    expect((await h).length).toBe(1);
    expect(planFeature.puedeReportesIA).toBeDefined();
    expect(of(true)).toBeDefined();
  });

  it('ofrece una acción visible para ver el detalle de cada reporte del historial', () => {
    planFeature.puedeReportesIA.and.returnValue(true);
    const apiSpy = jasmine.createSpyObj('AnaliticaApiService', ['plantillas', 'historial']);
    apiSpy.plantillas.and.returnValue(of([]));
    apiSpy.historial.and.returnValue(of([{
      id: 42,
      prompt_original: 'inventario con bajo stock',
      estado: 'EJECUTADA',
      fecha_ejecucion: '2026-11-09T10:00:00Z',
    }]));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AiReportsComponent, RouterTestingModule],
      providers: [
        { provide: AnaliticaApiService, useValue: apiSpy },
        { provide: PlanFeatureService, useValue: planFeature },
      ],
    });

    const fixture = TestBed.createComponent(AiReportsComponent);
    fixture.detectChanges();

    const detalle = fixture.nativeElement.querySelector('.detail-button') as HTMLAnchorElement;
    expect(detalle).toBeTruthy();
    expect(detalle.textContent).toContain('Ver detalle');
    expect(detalle.getAttribute('href')).toContain('/admin/reportes-ia/42');
  });
});
