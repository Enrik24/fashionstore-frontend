import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StorageService } from '../services/storage.service';
import { ToastService } from '../services/toast.service';
import { UserProfile } from '../models/auth.model';

/**
 * [EXAMEN-2] CU01–CU03: solo el Super Administrador entra al panel de
 * plataforma y su usuario no pertenece a ningún tenant.
 */
export const superAdminGuard: CanActivateFn = () => {
  const storage = inject(StorageService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const user = storage.getUser<UserProfile>();
  const esSuperAdmin = storage.getEsSuperAdmin() || user?.es_super_admin === true;
  const sinTenant = !user?.tenant_id;

  if (esSuperAdmin && sinTenant) return true;

  toast.error('Acceso restringido al Super Administrador de la plataforma.', 'Acceso Denegado');
  router.navigate(['/home']);
  return false;
};
