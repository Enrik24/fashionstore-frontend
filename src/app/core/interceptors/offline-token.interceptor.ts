import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ConnectivityService } from '../offline/connectivity.service';
import { OfflineSessionService } from '../offline/offline-session.service';

/**
 * [EXAMEN-2] Interceptor 1.º del capítulo 6.3.
 * Sin red y para rutas de negocio offline, adjunta el token offline en lugar
 * del token de sesión online. `authInterceptor` respeta el encabezado ya puesto.
 */
const RUTAS_NEGOCIO_OFFLINE = [
  '/offline/sync',
  '/offline/operaciones',
  '/offline/resumen',
  '/offline/conflictos',
  '/offline/compensaciones',
  '/pagos/diferidos'
];

export const offlineTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const connectivity = inject(ConnectivityService);
  const offlineSession = inject(OfflineSessionService);

  const esRutaOffline = RUTAS_NEGOCIO_OFFLINE.some((ruta) => req.url.includes(ruta));
  const tokenOffline = offlineSession.tokenOffline();

  if (esRutaOffline && !connectivity.enLinea() && tokenOffline) {
    return next(req.clone({
      headers: req.headers.set('Authorization', `Bearer ${tokenOffline}`)
    }));
  }

  return next(req);
};
