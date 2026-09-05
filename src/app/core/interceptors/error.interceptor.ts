import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { StorageService } from '../services/storage.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const router = inject(Router);
  const storage = inject(StorageService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Don't show toast for login endpoint as it handles its own message
      const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/register');

      if (error.status === 401 && !isAuthEndpoint) {
        toast.warning('Tu sesión ha expirado. Por favor inicia sesión nuevamente.', 'Sesión Expirada');
        storage.clearAuth();
        router.navigate(['/auth/login']);
      } else if (error.status === 403) {
        toast.error('No tienes permisos suficientes para realizar esta acción.', 'Acceso Denegado');
      } else if (error.status === 404 && !isAuthEndpoint) {
        toast.error('El recurso solicitado no fue encontrado.', 'No encontrado');
      } else if (error.status >= 500) {
        toast.error('Ocurrió un error inesperado en el servidor. Intenta de nuevo más tarde.', 'Error del Servidor');
      }

      return throwError(() => error);
    })
  );
};
