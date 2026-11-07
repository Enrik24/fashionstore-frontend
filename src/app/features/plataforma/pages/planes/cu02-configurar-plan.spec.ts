import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { PlanFormComponent } from './plan-form.component';
import { SaasApiService } from '../../../../core/services/saas-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ImpactoPlan, PlanConUso } from '../../../../core/models/saas.model';

/**
 * [EXAMEN-2] CU02: configurar plan.
 * Cubre edición de límites, coherencia Profesional > Básico, aviso de impacto
 * y guardado de la propuesta.
 */
describe('CU02 - Configurar plan', () => {
  let saasApi: jasmine.SpyObj<SaasApiService>;
  let toast: jasmine.SpyObj<ToastService>;
  let router: Router;

  const plan: PlanConUso = {
    id: 2,
    nombre: 'Profesional',
    descripcion: 'Para negocios en crecimiento',
    precio_mensual: 399,
    max_sucursales: 5,
    permite_reportes_ia: true,
    permite_pago_diferido: true,
    estado: 'ACTIVO',
    orden: 2,
    soporte_prioritario: true,
    max_usuarios: 20,
    max_productos: 1000,
    backup_automatico: true,
    backup_frecuencia_horas: 24,
    backup_retencion_dias: 30,
    backup_manual_mensual: 5,
    permite_restauracion: true,
    tenants_activos: 4,
    suscripciones_activas: 4
  };

  const impacto: ImpactoPlan = {
    plan_id: 2,
    max_sucursales: 1,
    tenants_afectados: [
      { tenant_id: 10, razon_social: 'Moda Andina S.R.L.', sucursales_actuales: 4 }
    ],
    total_afectados: 1
  };

  function crearComponente(): PlanFormComponent {
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => {
    saasApi = jasmine.createSpyObj<SaasApiService>('SaasApiService', [
      'obtenerPlan',
      'obtenerImpactoPlan',
      'actualizarPlan',
      'crearPlan'
    ]);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'warning', 'info']);

    saasApi.obtenerPlan.and.returnValue(of(plan));
    saasApi.obtenerImpactoPlan.and.returnValue(of(impacto));
    saasApi.actualizarPlan.and.returnValue(of(plan));

    TestBed.configureTestingModule({
      imports: [PlanFormComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: (clave: string) => clave === 'id' ? '2' : null } } }
        },
        { provide: SaasApiService, useValue: saasApi },
        { provide: ToastService, useValue: toast }
      ]
    });
  });

  it('carga los límites del plan y mantiene Profesional > Básico', () => {
    const component = crearComponente();

    expect(component.esEdicion).toBeTrue();
    expect(component.datos.max_sucursales).toBe(5);
    expect(component.datos.max_usuarios).toBe(20);
    expect(component.datos.max_productos).toBe(1000);
    expect(component.datos.max_sucursales).toBeGreaterThan(2);
  });

  it('exige revisar el aviso de impacto antes de guardar un límite reducido', () => {
    const component = crearComponente();
    component.datos.max_sucursales = 1;
    component.marcarImpactoPendiente();

    component.guardar();

    expect(component.error()).toContain('aviso de impacto');
    expect(saasApi.actualizarPlan).not.toHaveBeenCalled();
  });

  it('calcula el impacto y permite guardar después de revisarlo', () => {
    const component = crearComponente();
    component.datos.max_sucursales = 1;
    component.marcarImpactoPendiente();

    component.verImpacto();
    expect(saasApi.obtenerImpactoPlan).toHaveBeenCalled();
    expect(component.impacto()?.total_afectados).toBe(1);
    expect(component.impacto()?.tenants_afectados[0].razon_social).toBe('Moda Andina S.R.L.');

    component.guardar();
    expect(saasApi.actualizarPlan).toHaveBeenCalledWith(2, jasmine.objectContaining({ max_sucursales: 1 }));
    expect(router.navigate).toHaveBeenCalledWith(['/plataforma/planes']);
  });

  it('crea un plan nuevo cuando no hay identificador en la ruta', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [PlanFormComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
        { provide: SaasApiService, useValue: saasApi },
        { provide: ToastService, useValue: toast }
      ]
    });
    saasApi.crearPlan.and.returnValue(of(plan));

    const component = crearComponente();
    component.datos.nombre = 'Empresarial';
    component.datos.precio_mensual = 799;
    component.datos.max_sucursales = 20;
    component.guardar();

    expect(component.esEdicion).toBeFalse();
    expect(saasApi.crearPlan).toHaveBeenCalled();
  });
});
