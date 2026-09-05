import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StorageService } from '../services/storage.service';
import { ToastService } from '../services/toast.service';
import { UserProfile } from '../models/auth.model';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route, state) => {
    const storage = inject(StorageService);
    const router = inject(Router);
    const toast = inject(ToastService);

    const user = storage.getUser<UserProfile>();

    if (user && user.roles && user.roles.some(r => allowedRoles.map(ar => ar.toLowerCase()).includes(r.nombre.toLowerCase()))) {
      return true;
    }

    toast.error('No tienes los permisos requeridos para acceder a este módulo.');
    router.navigate(['/home']);
    return false;
  };
};
