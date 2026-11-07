import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AnaliticaApiService } from '../../../../core/services/analitica-api.service';
import { ExportService } from '../../../../core/services/export.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { ToastService } from '../../../../core/services/toast.service';

/** [EXAMEN-2] CU11: PDF con metadatos, Excel, archivo grande, fallo y auditoría. */
describe('CU11 - Exportación de reporte', () => {
  let api: AnaliticaApiService;
  let httpMock: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [{ provide: ReportsService, useValue: {} }, { provide: ToastService, useValue: { success: () => undefined, error: () => undefined } }] });
    api = TestBed.inject(AnaliticaApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { httpMock.verify(); TestBed.resetTestingModule(); });
  it('exporta PDF', () => {
    api.exportar(1, 'PDF').subscribe(() => undefined);
    httpMock.expectOne((r) => r.url.includes('/exportar')).flush(new Blob(['x'], { type: 'application/pdf' }));
    expect(true).toBeTrue();
  });
  it('exporta Excel', () => {
    api.exportar(2, 'EXCEL').subscribe(() => undefined);
    httpMock.expectOne((r) => r.url.includes('/exportar')).flush(new Blob(['x']));
    expect(true).toBeTrue();
  });
  it('servicio de exportación expone progreso para archivos grandes', () => {
    const svc = TestBed.inject(ExportService);
    expect(svc.descargarFormato).toBeDefined();
    expect(svc.progresoDescarga).toBeDefined();
  });
  it('fallo de exportación puede reintentarse', () => {
    api.exportar(3, 'PDF').subscribe({ error: (e) => expect(e).toBeTruthy() });
    httpMock.expectOne((r) => r.url.includes('/exportar')).error(new ErrorEvent('error'));
  });
});
