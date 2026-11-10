import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { offlineTokenInterceptor } from './core/interceptors/offline-token.interceptor';
import { tenantInterceptor } from './core/interceptors/tenant.interceptor';
import { idempotencyInterceptor } from './core/interceptors/idempotency.interceptor';
import { retryInterceptor } from './core/interceptors/retry.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    provideHttpClient(
      withInterceptors([
        // [EXAMEN-2] Orden del capítulo 6.3 del plan de frontend.
        offlineTokenInterceptor,
        authInterceptor,
        tenantInterceptor,
        idempotencyInterceptor,
        errorInterceptor,
        loadingInterceptor,
        // Va al final (es el más interno): reintenta la petición y, si aun
        // así falla, el `errorInterceptor` muestra un único aviso.
        retryInterceptor
      ])
    ),
    provideAnimations()
  ]
};
