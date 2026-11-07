import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TenantFormComponent } from './tenant-form.component';
import { SaasApiService } from '../../../../core/services/saas-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Plan, Tenant } from '../../../../core/models/saas.model';

/**
 * [EXAMEN-2] CU01: registrar tenant.
 * Cubre alta correcta, NIT duplicado, correo duplicado y validación previa.
 */
describe('CU01 - Registrar tenant', () => {
  let saasApi: jasmine.SpyObj<SaasApiService>;
  let toast: jasmine.SpyObj<ToastService>;

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
    telefono: '70000000',
    logo_url: null,
    moneda: 'BOB',
    zona_horaria: 'America/La_Paz',
    estado: 'CONFIGURACION_INICIAL',
    slug: 'moda-andina',
    fecha_registro: '2026-11-02T10:00:00',
    fecha_baja: null
  };

  function crearComponente(): TenantFormComponent {
    const fixture = TestBed.createComponent(TenantFormComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  function completarFormulario(component: TenantFormComponent): void {
    component.datos = {
      ...component.datos,
      razon_social: 'Moda Andina S.R.L.',
      nit: '1234567890',
      direccion_fiscal: 'Av. Arce 123',
      correo_contacto: 'contacto@modaandina.com',
      admin_nombre: 'Ana',
      admin_apellido: 'Pérez',
      admin_correo: 'ana@modaandina.com',
      admin_contrasena: 'temporal123'
    };
  }

  beforeEach(() => {
    saasApi = jasmine.createSpyObj<SaasApiService>('SaasApiService', [
      'listarPlanes',
      'crearTenant',
      'reenviarCredenciales'
    ]);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'warning', 'info']);

    saasApi.listarPlanes.and.returnValue(of([plan]));
    saasApi.crearTenant.and.returnValue(of(tenant));

    TestBed.configureTestingModule({
      imports: [TenantFormComponent],
      providers: [
        provideRouter([]),
        { provide: SaasApiService, useValue: saasApi },
        { provide: ToastService, useValue: toast }
      ]
    });
  });

  it('registra la empresa y la deja en configuración inicial', () => {
    const component = crearComponente();
    completarFormulario(component);

    component.guardar();

    expect(saasApi.crearTenant).toHaveBeenCalled();
    expect(component.creada()?.razon_social).toBe('Moda Andina S.R.L.');
    expect(component.creada()?.estado).toBe('CONFIGURACION_INICIAL');
    expect(toast.success).toHaveBeenCalled();
  });

  it('muestra el error del enunciado cuando el NIT está duplicado', () => {
    saasApi.crearTenant.and.returnValue(
      throwError(() => ({ error: { detail: 'Ya existe un tenant con ese NIT.' } }))
    );

    const component = crearComponente();
    completarFormulario(component);
    component.guardar();

    expect(component.error()).toBe('Ya existe una empresa registrada con ese NIT.');
    expect(component.creada()).toBeNull();
  });

  it('muestra el error del enunciado cuando el correo está duplicado', () => {
    saasApi.crearTenant.and.returnValue(
      throwError(() => ({ error: { detail: 'El correo del administrador ya está registrado.' } }))
    );

    const component = crearComponente();
    completarFormulario(component);
    component.guardar();

    expect(component.error()).toBe('El correo del administrador ya está en uso.');
  });

  it('no llama al backend si faltan campos obligatorios', () => {
    const component = crearComponente();
    component.datos = { ...component.datos, razon_social: 'Solo el nombre' };

    component.guardar();

    expect(saasApi.crearTenant).not.toHaveBeenCalled();
    expect(component.error()).toContain('Completa los campos obligatorios');
  });

  it('permite reenviar credenciales temporales si falló el correo', () => {
    saasApi.reenviarCredenciales.and.returnValue(of({
      correo: 'ana@modaandina.com',
      contrasena_temporal: 'Temp-1234',
      tenant: tenant.razon_social
    }));

    const component = crearComponente();
    component.reenviar(tenant.id);

    expect(saasApi.reenviarCredenciales).toHaveBeenCalledWith(10);
    expect(component.credenciales()?.contrasena_temporal).toBe('Temp-1234');
  });
});
