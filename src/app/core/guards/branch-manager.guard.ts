import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StorageService } from '../services/storage.service';
import { ToastService } from '../services/toast.service';
import { UserProfile } from '../models/auth.model';

export const branchManagerGuard: CanActivateFn = (route, state) => {
  const storage = inject(StorageService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const user = storage.getUser<UserProfile>();

  if (user && user.roles && user.roles.some(r => {
    const roleName = r.nombre.toLowerCase();
    return roleName === 'encargado' || roleName === 'encargado de sucursal' || roleName === 'administrador';
  })) {
    return true;
  }

  toast.error('Acceso exclusivo para Encargados de Sucursal y Administradores.', 'Acceso Denegado');
  router.navigate(['/home']);
  return false;
};

