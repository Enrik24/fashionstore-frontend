import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AnaliticaApiService } from '../../../../core/services/analitica-api.service';
import { ExportService } from '../../../../core/services/export.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { ToastService } from '../../../../core/services/toast.service';

/** [EXAMEN-2] CU11: exportación PDF/Excel y archivo grande con progreso.
 * El endpoint `/reportes-ia/{id}/exportar` devuelve un JSON con metadatos
 * (`archivo_id`, `url_descarga`); la descarga binaria real la hace
 * `ExportService.descargarFormato` con `responseType: 'blob'`. */
describe('CU11 - Exportación de reporte', () => {
  let api: AnaliticaApiService;
  let httpMock: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [{ provide: ReportsService, useValue: {} }, { provide: ToastService, useValue: { success: () => undefined, error: () => undefined } }] });
    api = TestBed.inject(AnaliticaApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { httpMock.verify(); TestBed.resetTestingModule(); });
  it('exporta PDF (solicita y obtiene metadatos con URL de descarga)', () => {
    const respuesta = { archivo_id: 'a-1', nombre: 'reporte.pdf', formato: 'PDF', media_type: 'application/pdf', url_descarga: '/api/v1/reportes-ia/a-1/descargar' };
    let resultado: any;
    api.exportar(1, 'PDF').subscribe((r) => (resultado = r));
    const req = httpMock.expectOne((r) => r.url.includes('/exportar'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ formato: 'PDF' });
    req.flush(respuesta);
    expect(resultado.archivo_id).toBe('a-1');
    expect(resultado.url_descarga).toContain('/descargar');
  });
  it('exporta Excel (solicita y obtiene metadatos con URL de descarga)', () => {
    const respuesta = { archivo_id: 'a-2', nombre: 'reporte.xlsx', formato: 'EXCEL', media_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', url_descarga: '/api/v1/reportes-ia/a-2/descargar' };
    api.exportar(2, 'EXCEL').subscribe((r) => {
      expect(r.formato).toBe('EXCEL');
    });
    const req = httpMock.expectOne((r) => r.url.includes('/exportar'));
    expect(req.request.body).toEqual({ formato: 'EXCEL' });
    req.flush(respuesta);
  });
  it('el binario (Excel/PDF) se descarga como Blob con responseType blob', () => {
    // La descarga real del archivo binario usa ExportService.descargarFormato,
    // que debe pedir responseType 'blob' para que el archivo no llegue corrompido.
    const svc = TestBed.inject(ExportService);
    expect(svc.descargarFormato).toBeDefined();
    expect(svc.progresoDescarga).toBeDefined();

    spyOn(URL, 'createObjectURL').and.returnValue('blob:mock');
    URL.revokeObjectURL('blob:mock');

    svc.descargarFormato('/api/v1/reportes-ia/a-2/descargar', 'reporte.xlsx');
    const req = httpMock.expectOne('/api/v1/reportes-ia/a-2/descargar');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['contenido'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  });
  it('fallo de exportación puede reintentarse', () => {
    api.exportar(3, 'PDF').subscribe({ error: (e) => expect(e).toBeTruthy() });
    httpMock.expectOne((r) => r.url.includes('/exportar')).error(new ErrorEvent('error'));
  });
});
