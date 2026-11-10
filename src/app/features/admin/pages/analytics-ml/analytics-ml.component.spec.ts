import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { AnalyticsMlComponent } from './analytics-ml.component';
import { AnaliticaApiService } from '../../../../core/services/analitica-api.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { PlanFeatureService } from '../../../../core/services/plan-feature.service';

/** Regresión visual/funcional del rediseño de Analítica y ML (CU12). */
describe('AnalyticsMlComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<AnalyticsMlComponent>>;
  let api: jasmine.SpyObj<AnaliticaApiService>;
  let branchApi: jasmine.SpyObj<BranchApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<AnaliticaApiService>('AnaliticaApiService', [
      'obtenerDashboard', 'listarModelos', 'listarDatasets',
    ]);
    branchApi = jasmine.createSpyObj<BranchApiService>('BranchApiService', ['getBranches']);
    const planFeature = jasmine.createSpyObj<PlanFeatureService>('PlanFeatureService', [
      'puedeReportesIA', 'mensajeBloqueo',
    ]);
    planFeature.puedeReportesIA.and.returnValue(true);
    planFeature.mensajeBloqueo.and.returnValue('');

    api.obtenerDashboard.and.returnValue(of({
      rol: 'Administrador',
      periodo: 'MES',
      cache: false,
      widgets: {
        ventas_dia: { total: 1250, ordenes: 18 },
        ventas_mes: { actual: { total: 15400, ordenes: 210 }, variacion_pct: 12.5 },
        stock_critico: { variantes: 7 },
        tasa_devoluciones: { tasa_pct: 3.2 },
        prendas_repuestas: [{ producto: 'Blusa satin', talla: 'M', color: 'Negro', unidades: 8 }],
        monto_compensaciones: { monto_total: 1850, monto_pendiente: 300, cantidad: 4 },
      },
      datos_suficientes: { suficientes: true, meses: 6, ordenes: 210, minimo_meses: 3 },
    }));
    api.listarModelos.and.returnValue(of([{
      id: 1, nombre: 'ventas_rf', tipo: 'SUPERVISADO', algoritmo: 'RandomForestRegressor',
      estado: 'ENTRENADO', metricas_json: { rmse: 12.4, r2: 0.84 },
    }]));
    api.listarDatasets.and.returnValue(of([{
      id: 'ds-1', dataset_id: 'ds-1', nombre: 'dataset ds-1', ventas: 500, clientes: 15,
    }]));
    branchApi.getBranches.and.returnValue(of([{ id: 1, nombre: 'Sucursal Centro' } as any]));

    await TestBed.configureTestingModule({
      imports: [AnalyticsMlComponent, RouterTestingModule],
      providers: [
        { provide: AnaliticaApiService, useValue: api },
        { provide: BranchApiService, useValue: branchApi },
        { provide: PlanFeatureService, useValue: planFeature },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyticsMlComponent);
    fixture.detectChanges();
  });

  it('renderiza el dashboard redesigned con el contrato vigente del backend', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Analítica y machine learning');
    expect(text).toContain('Indicadores clave');
    expect(text).toContain('Ventas de hoy');
    expect(text).toContain('Blusa satin');
    expect(text).toContain('Machine learning');
    expect(text).toContain('Inventario de modelos');
    expect(text).toContain('dataset ds-1');
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.kpi-card').length).toBe(4);
  });

  it('presenta la sucursal real y permite actualizar el contexto', () => {
    const select = (fixture.nativeElement as HTMLElement).querySelector('#sucursal-analitica') as HTMLSelectElement;
    expect(select.textContent).toContain('Sucursal Centro');
    expect(select.textContent).toContain('Todas las sucursales');
  });

  it('en Predecir ventas solo lista modelos supervisados ACTIVO/ENTRENADO', () => {
    const component = fixture.componentInstance as any;
    const predictivos = component.modelosPredictivosDe([
      { id: 10, nombre: 'ventas_x', tipo: 'SUPERVISADO', estado: 'ACTIVO' },
      { id: 11, nombre: 'ventas_y', tipo: 'SUPERVISADO', estado: 'ENTRENADO' },
      { id: 12, nombre: 'segmentacion_z', tipo: 'NO_SUPERVISADO', estado: 'ACTIVO' },
      { id: 13, nombre: 'ventas_off', tipo: 'SUPERVISADO', estado: 'INACTIVO' },
    ]);
    expect(predictivos.map((m: any) => m.id)).toEqual([10, 11]);
    const select = (fixture.nativeElement as HTMLElement).querySelector(
      '[aria-label="Modelo para predicción"]',
    ) as HTMLSelectElement;
    expect(select.textContent).toContain('ventas_rf');
    expect(select.textContent).toContain('RandomForestRegressor');
  });
});
