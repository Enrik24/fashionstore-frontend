import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ToastService } from './toast.service';

// Firebase Modular SDK imports
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private readonly API_URL = `${environment.apiUrl}/notificaciones`;

  currentToken = signal<string | null>(null);
  permissionStatus = signal<NotificationPermission>('default');
  isPushSupported = signal<boolean>(false);

  private messaging: any = null;

  constructor() {
    this.checkSupport();
  }

  async checkSupport(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      this.isPushSupported.set(false);
      return false;
    }

    try {
      const supported = await isSupported();
      this.isPushSupported.set(supported);
      this.permissionStatus.set(Notification.permission);
      return supported;
    } catch {
      this.isPushSupported.set(false);
      return false;
    }
  }

  /**
   * Inicializa Firebase, solicita permisos al usuario, obtiene el FCM Token y lo registra en el backend.
   */
  async requestPermissionAndRegister(): Promise<string | null> {
    const supported = await this.checkSupport();
    if (!supported) {
      console.warn('[NotificationService] Notificaciones Web Push no soportadas en este navegador.');
      return null;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionStatus.set(permission);

      if (permission !== 'granted') {
        console.log('[NotificationService] Permiso de notificaciones denegado o cerrado.');
        return null;
      }

      // Inicializar Firebase App si no está inicializada
      const firebaseConfig = (environment as any).firebase;
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      this.messaging = getMessaging(app);

      // Registrar el Service Worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });

      // Obtener Token de FCM
      const token = await getToken(this.messaging, {
        vapidKey: firebaseConfig.vapidKey,
        serviceWorkerRegistration: registration
      });

      if (token) {
        this.currentToken.set(token);
        console.log('[NotificationService] FCM Token obtenido con éxito');

        // Enviar token al backend
        await this.registerTokenInBackend(token, 'web').toPromise();

        // Escuchar mensajes en primer plano (Foreground)
        this.listenForegroundMessages();
        return token;
      } else {
        console.warn('[NotificationService] No se pudo generar el token de registro FCM.');
        return null;
      }
    } catch (error) {
      console.error('[NotificationService] Error al inicializar FCM:', error);
      return null;
    }
  }

  /**
   * Registra el token en el backend
   */
  registerTokenInBackend(token: string, tipoDispositivo: string = 'web'): Observable<any> {
    return this.http.post(`${this.API_URL}/dispositivos`, {
      token,
      tipo_dispositivo: tipoDispositivo
    }).pipe(
      catchError((err) => {
        console.warn('[NotificationService] Error al guardar token en backend:', err);
        return of(null);
      })
    );
  }

  /**
   * Desregistra el token en el backend al cerrar sesión
   */
  unregisterTokenFromBackend(token?: string): Observable<any> {
    const tokenToDelete = token || this.currentToken();
    if (!tokenToDelete) return of(null);

    return this.http.delete(`${this.API_URL}/dispositivos`, {
      params: { token: tokenToDelete }
    }).pipe(
      tap(() => this.currentToken.set(null)),
      catchError(() => of(null))
    );
  }

  /**
   * Listener para mensajes cuando la aplicación está abierta y en foco
   */
  private listenForegroundMessages() {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload: any) => {
      console.log('[NotificationService] Notificación recibida en primer plano:', payload);
      const title = payload.notification?.title || payload.data?.['title'] || 'FashionStore';
      const body = payload.notification?.body || payload.data?.['body'] || 'Tienes una nueva actualización.';

      // Mostrar toast amigable
      this.toastService.info(body, title);
    });
  }
}
