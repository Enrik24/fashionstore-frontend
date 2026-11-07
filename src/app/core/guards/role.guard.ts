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
    const permitidos = allowedRoles.map(ar => ar.toLowerCase());
    const esSuperAdmin = storage.getEsSuperAdmin() || user?.es_super_admin === true;

    // [EXAMEN-2] El Super Administrador no se confunde con el Administrador
    // de tenant: solo pasa si el rol pedido es explícitamente el suyo.
    if (esSuperAdmin) {
      if (permitidos.includes('super administrador')) return true;
      toast.error('El Super Administrador no opera módulos de una empresa.');
      router.navigate(['/plataforma/empresas']);
      return false;
    }

    if (user && user.roles && user.roles.some(r => permitidos.includes(r.nombre.toLowerCase()))) {
      return true;
    }

    toast.error('No tienes los permisos requeridos para acceder a este módulo.');
    router.navigate(['/home']);
    return false;
  };
};
