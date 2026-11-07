import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StorageService } from '../services/storage.service';
import { ToastService } from '../services/toast.service';
import { TenantContextService } from '../services/tenant-context.service';
import { Tenant } from '../models/saas.model';
import { UserProfile } from '../models/auth.model';

const RUTAS_EXENTAS = [
  '/admin/mi-suscripcion',
  '/admin/configuracion',
  '/admin/tipos-tela',
  '/profile',
  '/offline/acceso',
  '/auth'
];

/**
 * [EXAMEN-2] RN-004: el tenant debe estar OPERATIVO y su suscripción ACTIVA.
 * Las pantallas de suscripción y configuración quedan exentas para poder
 * resolver el bloqueo sin bucles de redirección.
 */
export const tenantOperativoGuard: CanActivateFn = (route, state) => {
  const storage = inject(StorageService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const tenantContext = inject(TenantContextService);

  const user = storage.getUser<UserProfile>();
  if (storage.getEsSuperAdmin() || user?.es_super_admin) {
    toast.info('El panel de plataforma opera en modo consulta; entra como administrador de la empresa.');
    router.navigate(['/plataforma/empresas']);
    return false;
  }

  if (RUTAS_EXENTAS.some((ruta) => state.url.startsWith(ruta))) return true;

  const tenant = tenantContext.tenant() ?? storage.getTenantActivo<Tenant>();
  const suscripcion = tenantContext.suscripcion();

  if (!tenant) {
    toast.error('No se pudo determinar la empresa activa. Inicia sesión nuevamente.');
    router.navigate(['/auth/login']);
    return false;
  }

  if (tenant.estado !== 'OPERATIVO') {
    toast.warning(
      tenant.estado === 'CONFIGURACION_INICIAL'
        ? 'Completa la configuración inicial de tu empresa para operar.'
        : 'Tu empresa no está operativa. Revisa el estado de la suscripción.',
      'Configuración pendiente'
    );
    router.navigate(['/admin/mi-suscripcion'], {
      queryParams: { motivo: tenant.estado === 'CONFIGURACION_INICIAL' ? 'configuracion' : 'suspendida' }
    });
    return false;
  }

  const estado = suscripcion?.estado;
  const vencida = !!suscripcion?.fecha_vencimiento && Date.parse(`${suscripcion.fecha_vencimiento}T23:59:59`) < Date.now();
  if (estado && estado !== 'ACTIVA' || vencida) {
    toast.warning('Tu suscripción no está activa. Renueva el plan para continuar operando.', 'Suscripción vencida');
    router.navigate(['/admin/mi-suscripcion'], {
      queryParams: { motivo: estado === 'SUSPENDIDA' ? 'suspendida' : 'vencida' }
    });
    return false;
  }

  return true;
};
