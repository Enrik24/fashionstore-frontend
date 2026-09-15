import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReportsService } from './reports.service';
import { environment } from '../../../environments/environment';

describe('ReportsService', () => {
  let service: ReportsService;
  let httpMock: HttpTestingController;
  const API_URL = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ReportsService]
    });
    service = TestBed.inject(ReportsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get sales report', () => {
    service.getSalesReport('2026-09-01', '2026-09-11').subscribe(res => {
      expect(res.resumen.total_recaudado).toBe(15000);
    });

    const req = httpMock.expectOne(r => r.url === `${API_URL}/reportes/ventas`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('fecha_inicio')).toBe('2026-09-01');
    req.flush({
      resumen: { total_recaudado: 15000, total_ordenes: 50, ticket_promedio: 300 }
    });
  });

  it('should get KPI dashboard', () => {
    service.getKpiDashboard().subscribe(res => {
      expect(res.total_ventas_mes).toBe(45000);
    });

    const req = httpMock.expectOne(`${API_URL}/kpis/dashboard`);
    expect(req.request.method).toBe('GET');
    req.flush({ total_ventas_mes: 45000, tasa_conversion_reservas: 78, ticket_promedio: 250, clientes_nuevos_mes: 35 });
  });

  it('should create a KPI', () => {
    const kpiData = { nombre: 'Rotación', valor_actual: 4, valor_objetivo: 5, unidad_medida: 'veces', periodo: 'Q3', tendencia: 'Positiva' };

    service.createKpi(kpiData).subscribe(res => {
      expect(res.id).toBe(10);
    });

    const req = httpMock.expectOne(`${API_URL}/kpis`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 10, ...kpiData });
  });
});
