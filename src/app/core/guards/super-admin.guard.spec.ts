import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { superAdminGuard } from './super-admin.guard';
import { StorageService } from '../services/storage.service';
import { ToastService } from '../services/toast.service';

/**
 * [EXAMEN-2] Pruebas del guard del panel de plataforma (CU01–CU03).
 * Solo el Super Administrador sin tenant puede entrar; un administrador de
 * tenant es redirigido al inicio.
 */
describe('superAdminGuard', () => {
  let storage: jasmine.SpyObj<StorageService>;
  let router: jasmine.SpyObj<Router>;
  let toast: jasmine.SpyObj<ToastService>;

  const ruta = {} as ActivatedRouteSnapshot;
  const estado = { url: '/plataforma/empresas' } as RouterStateSnapshot;

  function ejecutar() {
    return TestBed.runInInjectionContext(() => superAdminGuard(ruta, estado));
  }

  beforeEach(() => {
    storage = jasmine.createSpyObj<StorageService>('StorageService', [
      'getUser',
      'getEsSuperAdmin'
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['error', 'success', 'info', 'warning']);

    TestBed.configureTestingModule({
      providers: [
        { provide: StorageService, useValue: storage },
        { provide: Router, useValue: router },
        { provide: ToastService, useValue: toast }
      ]
    });
  });

  it('permite el acceso al Super Administrador sin tenant', () => {
    storage.getEsSuperAdmin.and.returnValue(true);
    storage.getUser.and.returnValue({ id: 1, correo: 'root@fashionstore.com' } as any);

    expect(ejecutar()).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('reconoce el rol por el perfil aunque la bandera local no esté marcada', () => {
    storage.getEsSuperAdmin.and.returnValue(false);
    storage.getUser.and.returnValue({
      id: 1,
      correo: 'root@fashionstore.com',
      es_super_admin: true,
      tenant_id: null
    } as any);

    expect(ejecutar()).toBeTrue();
  });

  it('rechaza a un administrador de tenant y lo envía al inicio', () => {
    storage.getEsSuperAdmin.and.returnValue(true);
    storage.getUser.and.returnValue({
      id: 20,
      correo: 'admin@modaandina.com',
      tenant_id: 10
    } as any);

    expect(ejecutar()).toBeFalse();
    expect(toast.error).toHaveBeenCalledWith(
      'Acceso restringido al Super Administrador de la plataforma.',
      'Acceso Denegado'
    );
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('rechaza a un usuario común sin privilegios de plataforma', () => {
    storage.getEsSuperAdmin.and.returnValue(false);
    storage.getUser.and.returnValue({
      id: 30,
      correo: 'cliente@correo.com',
      tenant_id: null
    } as any);

    expect(ejecutar()).toBeFalse();
    expect(toast.error).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });
});
