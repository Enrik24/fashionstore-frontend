import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StorageService } from '../services/storage.service';
import { ToastService } from '../services/toast.service';
import { UserProfile } from '../models/auth.model';

export const adminGuard: CanActivateFn = (route, state) => {
  const storage = inject(StorageService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const user = storage.getUser<UserProfile>();

  // [EXAMEN-2] El Super Administrador tiene su propio panel de plataforma.
  if (storage.getEsSuperAdmin() || user?.es_super_admin) {
    router.navigate(['/plataforma/empresas']);
    return false;
  }

  if (user && user.roles && user.roles.some(r => r.nombre.toLowerCase() === 'administrador')) {
    return true;
  }

  toast.error('Acceso restringido únicamente a usuarios Administradores.', 'Acceso Denegado');
  router.navigate(['/home']);
  return false;
};
