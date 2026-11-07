import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OfflineSessionService } from '../offline/offline-session.service';
import { ToastService } from '../services/toast.service';

/**
 * [EXAMEN-2] CU17: exige una sesión offline válida y no vencida.
 */
export const offlineSessionGuard: CanActivateFn = (route, state) => {
  const offlineSession = inject(OfflineSessionService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (offlineSession.haySesionOffline()) return true;

  toast.info('Ingresa tu PIN para operar sin conexión.', 'Sesión offline requerida');
  return router.createUrlTree(['/offline/acceso'], {
    queryParams: { returnUrl: state.url }
  });
};
