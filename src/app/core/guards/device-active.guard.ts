import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Observable, map, of, catchError } from 'rxjs';
import { DeviceService } from '../offline/device.service';
import { ConnectivityService } from '../offline/connectivity.service';
import { OfflineSessionService } from '../offline/offline-session.service';
import { ToastService } from '../services/toast.service';

/**
 * [EXAMEN-2] RN-019: si el dispositivo fue revocado, borra sus datos locales
 * y bloquea la operación offline.
 */
export const deviceActiveGuard: CanActivateFn = (route, state): Observable<boolean> => {
  const device = inject(DeviceService);
  const connectivity = inject(ConnectivityService);
  const offlineSession = inject(OfflineSessionService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (!connectivity.enLinea()) {
    if (offlineSession.haySesionOffline()) return of(true);
    router.navigate(['/offline/acceso'], { queryParams: { returnUrl: state.url } });
    return of(false);
  }

  return device.sincronizarEstado().pipe(
    map((estado) => {
      if (estado.dispositivo_activo) return true;
      toast.error('Este dispositivo fue revocado. Los datos locales se eliminaron.', 'Dispositivo revocado');
      router.navigate(['/offline/acceso'], { queryParams: { motivo: 'revocado' } });
      return false;
    }),
    catchError(() => {
      // Si el backend no responde, el guard no debe romper la navegación online.
      return of(true);
    })
  );
};
