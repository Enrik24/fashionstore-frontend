import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StorageService } from '../services/storage.service';
import { ToastService } from '../services/toast.service';
import { UserProfile } from '../models/auth.model';

export const cashierGuard: CanActivateFn = (route, state) => {
  const storage = inject(StorageService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const user = storage.getUser<UserProfile>();

  if (user && user.roles && user.roles.some(r => {
    const roleName = r.nombre.toLowerCase();
    return roleName === 'cajero' || roleName === 'administrador';
  })) {
    return true;
  }

  toast.error('Acceso exclusivo para Cajeros y Administradores.', 'Acceso Denegado');
  router.navigate(['/home']);
  return false;
};
