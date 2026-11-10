import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DeviceService } from '../offline/device.service';
import { ConnectivityService } from '../offline/connectivity.service';
import { OfflineSessionService } from '../offline/offline-session.service';
import { StorageService } from '../services/storage.service';
import { ToastService } from '../services/toast.service';

/**
 * [EXAMEN-2] RN-019: si el dispositivo fue revocado, borra sus datos locales
 * y bloquea la operación offline.
 */
export const deviceActiveGuard: CanActivateFn = async (route, state) => {
  const device = inject(DeviceService);
  const connectivity = inject(ConnectivityService);
  const offlineSession = inject(OfflineSessionService);
  const storage = inject(StorageService);
  const router = inject(Router);
  const toast = inject(ToastService);

  await offlineSession.esperarCarga();

  // Sin token online no se puede consultar el estado del dispositivo; si la
  // sesión offline es válida, authGuard ya autorizó el acceso y no se debe
  // provocar un 403 llamando al endpoint autenticado.
  if (!storage.getAccessToken() && offlineSession.haySesionOffline()) {
    return true;
  }

  if (!connectivity.enLinea()) {
    if (offlineSession.haySesionOffline()) return true;
    router.navigate(['/offline/acceso'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  try {
    const estado = await firstValueFrom(device.sincronizarEstado());
    if (estado.dispositivo_activo) return true;
    toast.error('Este dispositivo fue revocado. Los datos locales se eliminaron.', 'Dispositivo revocado');
    router.navigate(['/offline/acceso'], { queryParams: { motivo: 'revocado' } });
    return false;
  } catch {
    // Si el backend no responde, el guard no debe romper la navegación.
    return true;
  }
};
