import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StorageService } from '../services/storage.service';
import { ToastService } from '../services/toast.service';
import { ConnectivityService } from '../offline/connectivity.service';

export const authGuard: CanActivateFn = (route, state) => {
  const storage = inject(StorageService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const connectivity = inject(ConnectivityService);

  const token = storage.getAccessToken();

  if (token) {
    return true;
  }

  // [EXAMEN-2] CU17: sin red y sin token, el acceso es por PIN offline.
  if (!connectivity.enLinea()) {
    toast.info('Sin conexión: ingresa tu PIN para continuar.', 'Modo offline');
    return router.createUrlTree(['/offline/acceso'], {
      queryParams: { returnUrl: state.url }
    });
  }

  toast.info('Debes iniciar sesión para acceder a esta sección.');
  router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
