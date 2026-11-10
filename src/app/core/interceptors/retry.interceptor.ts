import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { retry, throwError, timer } from 'rxjs';

/**
 * Reintenta automáticamente las peticiones que fallan por una causa
 * transitoria del servidor.
 *
 * Por qué hace falta: cuando el backend de Render se reinicia (contenedor
 * sin memoria, despliegue, suspensión del plan free) el proxy responde
 * `502 Bad Gateway`. El navegador no puede leer esa respuesta (no trae
 * cabeceras CORS) y la reporta como:
 *
 *   "Access to XMLHttpRequest at 'https://...' has been blocked by CORS
 *    policy: No 'Access-Control-Allow-Origin' header is present"
 *
 * Es un 502 disfrazado de error de CORS. Por eso, además del 502 explícito,
 * también se reintenta el estado 0 (fallo de red), que es lo que ve
 * Angular cuando el navegador bloquea la respuesta.
 */

/** Estados transitorios: backend reiniciándose, saturado o sin red. */
const ESTADOS_REINTENTABLES = new Set([0, 502, 503, 504]);

/** Solo lo idempotente: reintentar un POST podría duplicar un cobro. */
const METODOS_REINTENTABLES = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Reintentos después del primer intento (4 intentos en total). */
const MAX_REINTENTOS = 3;

/** Espera inicial del backoff exponencial (1.2s, 2.4s, 4.8s). */
const ESPERA_BASE_MS = 1200;

/** Tope del backoff para no dejar la pantalla esperando demasiado. */
const ESPERA_MAX_MS = 8000;

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  // Solo se reintentan los métodos idempotentes. La URL da igual: en
  // producción apunta al backend absoluto, pero en desarrollo puede ir
  // relativa (proxy de `ng serve`).
  if (!METODOS_REINTENTABLES.has(req.method)) {
    return next(req);
  }

  return next(req).pipe(
    retry({
      count: MAX_REINTENTOS,
      delay: (error: HttpErrorResponse, intento: number) => {
        if (!error || !ESTADOS_REINTENTABLES.has(error.status)) {
          // No es transitorio (404, 401, 403...): se propaga tal cual.
          return throwError(() => error);
        }
        const espera = Math.min(ESPERA_BASE_MS * Math.pow(2, intento - 1), ESPERA_MAX_MS);
        return timer(espera);
      }
    })
  );
};
