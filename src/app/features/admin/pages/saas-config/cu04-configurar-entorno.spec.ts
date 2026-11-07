import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SaasConfigComponent } from './saas-config.component';
import { SaasApiService } from '../../../../core/services/saas-api.service';
import { PlanFeatureService } from '../../../../core/services/plan-feature.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { UserApiService } from '../../../../core/services/user-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AsistenteConfiguracion, ConfiguracionTenantResponse, Tenant } from '../../../../core/models/saas.model';
import { Sucursal } from '../../../../core/models/branch.model';

/**
 * [EXAMEN-2] CU04: configurar entorno del tenant.
 * Cubre los cuatro pasos, bloqueo del límite de sucursales, tenant sin
 * configuración y finalización a OPERATIVO.
 */
describe('CU04 - Configurar entorno', () => {
  let saasApi: jasmine.SpyObj<SaasApiService>;
  let planFeature: jasmine.SpyObj<PlanFeatureService>;
  let tenantContext: jasmine.SpyObj<TenantContextService>;
  let branchApi: jasmine.SpyObj<BranchApiService>;
  let userApi: jasmine.SpyObj<UserApiService>;
  let toast: jasmine.SpyObj<ToastService>;

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

  const asistente: AsistenteConfiguracion = {
    tenant_id: 10,
    pasos_completados: ['empresa'],
    pasos_faltantes: ['sucursales', 'usuarios', 'offline'],
    porcentaje: 25,
    estado_tenant: 'CONFIGURACION_INICIAL',
    puede_finalizar: false
  };

  const configuracion: ConfiguracionTenantResponse = {
    tenant,
    configuracion_offline: {
      id: 1,
      tenant_id: 10,
      descarga_automatica: true,
      hora_descarga: '07:00',
      incluir_clientes: true,
      max_clientes: 200,
      habilitar_carrito_offline: false,
      max_horas_sesion_offline: 8,
      max_dias_orden_pendiente: 7
    },
    asistente
  };

  function sucursal(id: number): Sucursal {
    return {
      id,
      nombre: `Sucursal ${id}`,
      direccion: 'Calle 1',
      telefono: '70000000',
      horario_atencion: '09:00-20:00',
      estado: 'ACTIVO',
      ciudad_id: 1
    };
  }

  function crearComponente(): SaasConfigComponent {
    const fixture = TestBed.createComponent(SaasConfigComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => {
    saasApi = jasmine.createSpyObj<SaasApiService>('SaasApiService', [
      'obtenerConfiguracionTenant',
      'obtenerAsistenteConfiguracion',
      'guardarDatosEmpresa',
      'crearSucursalConfiguracion',
      'crearUsuarioConfiguracion',
      'guardarConfiguracionOffline',
      'finalizarConfiguracion'
    ]);
    planFeature = jasmine.createSpyObj<PlanFeatureService>('PlanFeatureService', [
      'puedeCarritoOffline',
      'limiteSucursales',
      'limiteUsuarios',
      'puedeCrearSucursal',
      'puedeCrearUsuario'
    ]);
    tenantContext = jasmine.createSpyObj<TenantContextService>('TenantContextService', [
      'cargarContexto',
      'actualizarTenant'
    ]);
    branchApi = jasmine.createSpyObj<BranchApiService>('BranchApiService', ['getBranches']);
    userApi = jasmine.createSpyObj<UserApiService>('UserApiService', ['getUsers']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'warning', 'info']);

    saasApi.obtenerConfiguracionTenant.and.returnValue(of(configuracion));
    saasApi.obtenerAsistenteConfiguracion.and.returnValue(of(asistente));
    saasApi.guardarDatosEmpresa.and.returnValue(of(tenant));
    saasApi.finalizarConfiguracion.and.returnValue(of({ ...tenant, estado: 'OPERATIVO' }));

    planFeature.puedeCarritoOffline.and.returnValue(false);
    planFeature.limiteSucursales.and.returnValue(2);
    planFeature.limiteUsuarios.and.returnValue(3);
    planFeature.puedeCrearSucursal.and.callFake((usadas: number) => ({
      permitido: usadas < 2,
      usado: usadas,
      limite: 2,
      mensaje: usadas < 2 ? undefined : 'Alcanzaste el límite de sucursales del plan (2).'
    }));
    planFeature.puedeCrearUsuario.and.callFake((usadas: number) => ({
      permitido: usadas < 3,
      usado: usadas,
      limite: 3,
      mensaje: usadas < 3 ? undefined : 'Alcanzaste el límite de usuarios del plan (3).'
    }));

    tenantContext.cargarContexto.and.returnValue(of(void 0));
    branchApi.getBranches.and.returnValue(of([sucursal(1)]));
    userApi.getUsers.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [SaasConfigComponent],
      providers: [
        provideRouter([]),
        { provide: SaasApiService, useValue: saasApi },
        { provide: PlanFeatureService, useValue: planFeature },
        { provide: TenantContextService, useValue: tenantContext },
        { provide: BranchApiService, useValue: branchApi },
        { provide: UserApiService, useValue: userApi },
        { provide: ToastService, useValue: toast }
      ]
    });
  });

  it('muestra los cuatro pasos del asistente y el progreso', () => {
    const component = crearComponente();

    expect(component.pasos.length).toBe(4);
    expect(component.pasos.map((paso) => paso.clave)).toEqual(['empresa', 'sucursales', 'usuarios', 'offline']);
    expect(component.configuracion()?.tenant.razon_social).toBe('Moda Andina S.R.L.');
    expect(component.asistente()?.porcentaje).toBe(25);
  });

  it('guarda los datos de la empresa y avanza al siguiente paso', () => {
    const component = crearComponente();
    const pasoInicial = component.pasoActual();

    component.guardarEmpresa({ razon_social: 'Moda Andina S.R.L.', correo_contacto: 'nuevo@modaandina.com' });

    expect(saasApi.guardarDatosEmpresa).toHaveBeenCalled();
    expect(component.pasoActual()).toBe(pasoInicial + 1);
    expect(component.pasoActual()).toBe(2);
    expect(toast.success).toHaveBeenCalled();
  });

  it('bloquea la tercera sucursal cuando el plan Básico permite dos', () => {
    const component = crearComponente();
    component.sucursales.set([sucursal(1), sucursal(2)]);

    component.guardarSucursal({
      nombre: 'Sucursal 3',
      direccion: 'Calle 3',
      telefono: '70000000'
    });

    expect(saasApi.crearSucursalConfiguracion).not.toHaveBeenCalled();
    expect(component.error()).toContain('límite de sucursales');
  });

  it('finaliza la configuración y deja el tenant OPERATIVO', () => {
    const component = crearComponente();

    component.finalizar();

    expect(saasApi.finalizarConfiguracion).toHaveBeenCalled();
    expect(component.finalizado()).toBeTrue();
    expect(component.configuracion()?.tenant.estado).toBe('OPERATIVO');
    expect(tenantContext.actualizarTenant).toHaveBeenCalledWith(jasmine.objectContaining({ estado: 'OPERATIVO' }));
  });

  it('informa cuando el tenant no tiene configuración disponible', () => {
    saasApi.obtenerConfiguracionTenant.and.returnValue(
      throwError(() => ({ error: { detail: 'Tenant no encontrado' } }))
    );

    const component = crearComponente();

    expect(component.cargando()).toBeFalse();
    expect(component.configuracion()).toBeNull();
    expect(component.error()).toContain('No se pudo cargar la configuración');
  });
});
