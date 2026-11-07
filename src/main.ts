import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

// [EXAMEN-2] Registro manual del Service Worker (la PWA no usa @angular/service-worker).
if (environment.production && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            // Aviso no bloqueante: nunca se recarga sola en medio de una venta.
            window.dispatchEvent(new CustomEvent('fashionstore:sw-update', {
              detail: { registration }
            }));
          }
        });
      });
    }).catch((error) => {
      console.warn('[PWA] No se pudo registrar el Service Worker:', error);
    });
  });
}
