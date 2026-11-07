import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';
import { PlanFeatureService } from './plan-feature.service';
import { TenantContextService } from './tenant-context.service';
import { SaasApiService } from './saas-api.service';
import { FuncionalidadPlan, Plan } from '../models/saas.model';

/**
 * [EXAMEN-2] Pruebas de límites y funcionalidades del plan (CU04, RN-002,
 * RN-003, RN-023). El contexto del tenant se simula con signals reales para
 * comprobar que los `computed` reaccionan a los cambios.
 */
describe('PlanFeatureService', () => {
  let servicio: PlanFeatureService;
  let funcionalidades: ReturnType<typeof signal<FuncionalidadPlan | null>>;
  let plan: ReturnType<typeof signal<Plan | null>>;
  let saasApi: jasmine.SpyObj<SaasApiService>;

  const planBasico: Plan = {
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

  const funcionalidadesBasico: FuncionalidadPlan = {
    plan: 'Básico',
    reportes_ia: false,
    pago_diferido: false,
    carrito_offline: false,
    max_sucursales: 2,
    max_usuarios: 5,
    max_productos: 100,
    backup_automatico: false,
    backup_frecuencia_horas: null,
    backup_retencion_dias: 15,
    backup_manual_mensual: 1,
    permite_restauracion: false
  };

  const funcionalidadesProfesional: FuncionalidadPlan = {
    ...funcionalidadesBasico,
    plan: 'Profesional',
    reportes_ia: true,
    pago_diferido: true,
    carrito_offline: true,
    max_sucursales: 5,
    max_usuarios: 20,
    max_productos: 1000,
    backup_automatico: true,
    backup_frecuencia_horas: 24,
    backup_manual_mensual: 5,
    permite_restauracion: true
  };

  beforeEach(() => {
    funcionalidades = signal<FuncionalidadPlan | null>(null);
    plan = signal<Plan | null>(null);

    saasApi = jasmine.createSpyObj<SaasApiService>('SaasApiService', ['obtenerFuncionalidadesPlan']);
    saasApi.obtenerFuncionalidadesPlan.and.returnValue(of(funcionalidadesProfesional));

    TestBed.configureTestingModule({
      providers: [
        {
          provide: TenantContextService,
          useValue: { funcionalidades, plan }
        },
        { provide: SaasApiService, useValue: saasApi }
      ]
    });

    servicio = TestBed.inject(PlanFeatureService);
  });

  it('sin contexto no habilita funcionalidades ni recursos', () => {
    expect(servicio.funcionalidades()).toBeNull();
    expect(servicio.puedeReportesIA()).toBeFalse();
    expect(servicio.puedePagoDiferido()).toBeFalse();
    expect(servicio.puedeCarritoOffline()).toBeFalse();
    expect(servicio.limiteSucursales()).toBe(0);
    expect(servicio.limiteUsuarios()).toBeNull();
    expect(servicio.puedeCrearSucursal(0).permitido).toBeFalse();
  });

  it('usa el plan activo cuando aún no hay funcionalidades cargadas', () => {
    plan.set(planBasico);

    expect(servicio.limiteSucursales()).toBe(2);
    expect(servicio.limiteUsuarios()).toBe(5);
    expect(servicio.limiteProductos()).toBe(100);
  });

  it('bloquea la tercera sucursal del plan Básico con un mensaje de mejora', () => {
    funcionalidades.set(funcionalidadesBasico);

    const segunda = servicio.puedeCrearSucursal(1);
    const tercera = servicio.puedeCrearSucursal(2);

    expect(segunda.permitido).toBeTrue();
    expect(segunda.mensaje).toBeUndefined();
    expect(tercera.permitido).toBeFalse();
    expect(tercera.usado).toBe(2);
    expect(tercera.limite).toBe(2);
    expect(tercera.mensaje).toContain('2 sucursales');
    expect(tercera.mensaje).toContain('Mejora tu plan');
  });

  it('aplica los límites de usuarios y productos del plan', () => {
    funcionalidades.set(funcionalidadesBasico);

    expect(servicio.puedeCrearUsuario(4).permitido).toBeTrue();
    expect(servicio.puedeCrearUsuario(5).permitido).toBeFalse();
    expect(servicio.puedeCrearUsuario(5).mensaje).toContain('5 usuarios');

    expect(servicio.puedeCrearProducto(99).permitido).toBeTrue();
    expect(servicio.puedeCrearProducto(100).permitido).toBeFalse();
    expect(servicio.puedeCrearProducto(100).mensaje).toContain('100 productos');
  });

  it('trata los límites nulos como ilimitados', () => {
    funcionalidades.set({
      ...funcionalidadesBasico,
      max_usuarios: null,
      max_productos: null
    });

    expect(servicio.limiteUsuarios()).toBeNull();
    expect(servicio.puedeCrearUsuario(10_000).permitido).toBeTrue();
    expect(servicio.puedeCrearProducto(10_000).permitido).toBeTrue();
  });

  it('reacciona cuando el contexto actualiza las funcionalidades', () => {
    funcionalidades.set(funcionalidadesBasico);
    expect(servicio.puedeReportesIA()).toBeFalse();

    funcionalidades.set(funcionalidadesProfesional);

    expect(servicio.puedeReportesIA()).toBeTrue();
    expect(servicio.puedePagoDiferido()).toBeTrue();
    expect(servicio.puedeCarritoOffline()).toBeTrue();
    expect(servicio.limiteSucursales()).toBe(5);
    expect(servicio.limiteUsuarios()).toBe(20);
  });

  it('evalúa respaldos, cuota mensual y restauración', () => {
    funcionalidades.set(funcionalidadesBasico);
    expect(servicio.puedeRespaldos()).toBeTrue();
    expect(servicio.backupsRestantesMes(0)).toBe(1);
    expect(servicio.backupsRestantesMes(1)).toBe(0);
    expect(servicio.puedeRestaurar()).toBeFalse();

    funcionalidades.set(funcionalidadesProfesional);
    expect(servicio.puedeRespaldos()).toBeTrue();
    expect(servicio.backupsRestantesMes(2)).toBe(3);
    expect(servicio.puedeRestaurar()).toBeTrue();
  });

  it('sin cuota manual ni respaldo automático no permite respaldos', () => {
    funcionalidades.set({
      ...funcionalidadesBasico,
      backup_automatico: false,
      backup_manual_mensual: 0
    });

    expect(servicio.puedeRespaldos()).toBeFalse();
    expect(servicio.backupsRestantesMes(0)).toBe(0);
  });

  it('devuelve el mensaje de bloqueo por funcionalidad', () => {
    expect(servicio.mensajeBloqueo('reportes_ia')).toContain('Profesional y Empresarial');
    expect(servicio.mensajeBloqueo('pago_diferido')).toContain('pago diferido');
    expect(servicio.mensajeBloqueo('carrito_offline')).toContain('carrito sin conexión');
    expect(servicio.mensajeBloqueo('respaldos')).toContain('respaldos');
    expect(servicio.mensajeBloqueo('restauracion')).toContain('restaurar');
  });

  it('refresca las funcionalidades desde el backend y actualiza el contexto', async () => {
    const actualizadas = await firstValueFrom(servicio.refrescar());

    expect(saasApi.obtenerFuncionalidadesPlan).toHaveBeenCalled();
    expect(actualizadas.plan).toBe('Profesional');
    expect(funcionalidades()?.plan).toBe('Profesional');
    expect(servicio.puedeCarritoOffline()).toBeTrue();
  });
});
