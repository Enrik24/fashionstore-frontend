import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SuscripcionPanelComponent } from './suscripcion-panel.component';
import { SaasApiService } from '../../../../core/services/saas-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Plan, Suscripcion, Tenant } from '../../../../core/models/saas.model';

/**
 * [EXAMEN-2] CU03: asignar y administrar suscripciones.
 * Cubre asignación, cambio bloqueado por exceso de sucursales, renovación y
 * suspensión con recarga del listado.
 */
describe('CU03 - Asignar suscripción', () => {
  let saasApi: jasmine.SpyObj<SaasApiService>;
  let toast: jasmine.SpyObj<ToastService>;
  let router: Router;
  let modoNueva: boolean;

  const plan: Plan = {
    id: 1,
    nombre: 'Básico',
    descripcion: 'Plan de entrada',
    precio_mensual: 199,
    max_sucursales: 2,
    permite_reportes_ia: false,
    permite_pago_diferido: false,
    estado: 'ACTIVO',
    orden: 1,
    soporte_prioritario: false,
    max_usuarios: 5,
    max_productos: 100,
    backup_automatico: false,
    backup_frecuencia_horas: null,
    backup_retencion_dias: 15,
    backup_manual_mensual: 1,
    permite_restauracion: false
  };

  const tenant: Tenant = {
    id: 10,
    razon_social: 'Moda Andina S.R.L.',
    nit: '1234567890',
    direccion_fiscal: 'Av. Arce 123',
    correo_contacto: 'contacto@modaandina.com',
    telefono: null,
    logo_url: null,
    moneda: 'BOB',
    zona_horaria: 'America/La_Paz',
    estado: 'CONFIGURACION_INICIAL',
    slug: 'moda-andina',
    fecha_registro: '2026-11-02T10:00:00',
    fecha_baja: null
  };

  const suscripcion: Suscripcion = {
    id: 5,
    tenant_id: 10,
    plan_id: 1,
    fecha_inicio: '2026-11-01',
    fecha_vencimiento: '2026-12-01',
    estado: 'ACTIVA',
    estado_pago: 'PENDIENTE',
    renovacion_automatica: true,
    plan
  };

  function crearComponente(): SuscripcionPanelComponent {
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    const fixture = TestBed.createComponent(SuscripcionPanelComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => {
    modoNueva = false;

    saasApi = jasmine.createSpyObj<SaasApiService>('SaasApiService', [
      'listarSuscripciones',
      'listarPlanes',
      'listarTenants',
      'asignarSuscripcion',
      'cambiarPlan',
      'renovarSuscripcion',
      'suspenderSuscripcion',
      'reactivarSuscripcion',
      'cancelarSuscripcion'
    ]);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'warning', 'info']);

    saasApi.listarSuscripciones.and.returnValue(of([suscripcion]));
    saasApi.listarPlanes.and.returnValue(of([plan]));
    saasApi.listarTenants.and.returnValue(of({ total: 1, items: [tenant] }));
    saasApi.asignarSuscripcion.and.returnValue(of(suscripcion));
    saasApi.cambiarPlan.and.returnValue(of(suscripcion));
    saasApi.renovarSuscripcion.and.returnValue(of({ ...suscripcion, fecha_vencimiento: '2027-01-01' }));
    saasApi.suspenderSuscripcion.and.returnValue(of({ suscripcion_id: 5, estado: 'SUSPENDIDA' }));

    const routeStub = {
      snapshot: {
        get url() { return modoNueva ? [{ path: 'nueva' }] : [{ path: 'suscripciones' }]; },
        paramMap: { get: () => null },
        queryParamMap: {
          get: (clave: string) => clave === 'plan' ? '1' : clave === 'tenant' ? '10' : null
        }
      }
    };

    TestBed.configureTestingModule({
      imports: [SuscripcionPanelComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: routeStub },
        { provide: SaasApiService, useValue: saasApi },
        { provide: ToastService, useValue: toast }
      ]
    });
  });

  it('lista las suscripciones vigentes y cuenta las que están por vencer', () => {
    const component = crearComponente();

    expect(saasApi.listarSuscripciones).toHaveBeenCalled();
    expect(component.suscripciones().length).toBe(1);
    expect(component.contar('ACTIVA')).toBe(1);
    expect(component.nombreTenant(10)).toBe('Moda Andina S.R.L.');
  });

  it('asigna un plan y navega al checkout de la suscripción', () => {
    modoNueva = true;
    const component = crearComponente();

    expect(component.esNueva).toBeTrue();
    expect(component.nueva.plan_id).toBe(1);
    expect(component.nueva.tenant_id).toBe(10);

    component.asignar();

    expect(saasApi.asignarSuscripcion).toHaveBeenCalledWith(jasmine.objectContaining({
      tenant_id: 10,
      plan_id: 1
    }));
    expect(router.navigate).toHaveBeenCalledWith(['/plataforma/suscripciones', 5, 'checkout']);
  });

  it('muestra el bloqueo cuando el cambio de plan excede las sucursales', () => {
    saasApi.cambiarPlan.and.returnValue(
      throwError(() => ({ error: { detail: 'El tenant supera el máximo de sucursales del plan.' } }))
    );

    const component = crearComponente();
    component.planPorSuscripcion[5] = 2;
    component.cambiarPlan(suscripcion);

    expect(saasApi.cambiarPlan).toHaveBeenCalledWith(5, 2);
    expect(toast.error).toHaveBeenCalledWith(jasmine.stringMatching(/supera el máximo de sucursales/));
  });

  it('renueva y suspende una suscripción', () => {
    const component = crearComponente();

    component.renovar(suscripcion);
    expect(saasApi.renovarSuscripcion).toHaveBeenCalledWith(5);
    expect(component.suscripciones()[0].fecha_vencimiento).toBe('2027-01-01');

    component.suspender(suscripcion);
    expect(saasApi.suspenderSuscripcion).toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledWith('Suscripción suspendida.');
    expect(saasApi.listarSuscripciones).toHaveBeenCalledTimes(2);
  });
});
