import { Injectable, NgZone, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CalidadConexion } from '../models/offline.model';

/**
 * [EXAMEN-2] Conectividad real contra el backend (capítulo 7.2.3).
 * No confía solo en `navigator.onLine`: hace un ping ligero a un endpoint público.
 */
@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private http = inject(HttpClient);
  private zone = inject(NgZone);

  public enLinea = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  public calidad = signal<CalidadConexion>(navigator.onLine ? 'ESTABLE' : 'SIN_CONEXION');

  private callbacks = new Set<() => void>();
  private monitoreando = false;
  private estabaEnLinea = this.enLinea();
  private readonly onOnline = () => this.verificar().subscribe();
  private readonly onOffline = () => this.actualizarEstado(false, 'SIN_CONEXION');
  private readonly onVisibility = () => {
    if (document.visibilityState === 'visible') this.verificar().subscribe();
  };

  /** Ping ligero al backend; devuelve el estado real. */
  verificar(): Observable<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.actualizarEstado(false, 'SIN_CONEXION');
      return new Observable<boolean>((subscriber) => {
        subscriber.next(false);
        subscriber.complete();
      });
    }

    const inicio = Date.now();
    return new Observable<boolean>((subscriber) => {
      this.http.get(`${environment.apiUrl}/public/promociones/activas`).subscribe({
        next: () => {
          const duracion = Date.now() - inicio;
          this.actualizarEstado(true, duracion > 1500 ? 'LENTA' : 'ESTABLE');
          subscriber.next(true);
          subscriber.complete();
        },
        error: () => {
          this.actualizarEstado(false, 'SIN_CONEXION');
          subscriber.next(false);
          subscriber.complete();
        }
      });
    });
  }

  esperarConexion(): Observable<boolean> {
    if (this.enLinea()) {
      return new Observable<boolean>((subscriber) => {
        subscriber.next(true);
        subscriber.complete();
      });
    }

    return new Observable<boolean>((subscriber) => {
      const quitar = this.alRecuperarConexion(() => {
        quitar();
        subscriber.next(true);
        subscriber.complete();
      });
    });
  }

  iniciarMonitoreo(): void {
    if (this.monitoreando || typeof window === 'undefined') return;
    this.monitoreando = true;
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  detenerMonitoreo(): void {
    if (!this.monitoreando || typeof window === 'undefined') return;
    this.monitoreando = false;
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  alRecuperarConexion(callback: () => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private actualizarEstado(enLinea: boolean, calidad: CalidadConexion): void {
    const recuperada = enLinea && !this.estabaEnLinea;
    this.estabaEnLinea = enLinea;
    this.zone.run(() => {
      this.enLinea.set(enLinea);
      this.calidad.set(calidad);
    });
    if (recuperada) {
      this.callbacks.forEach((callback) => {
        try { callback(); } catch { /* un callback no debe romper el monitoreo */ }
      });
    }
  }
}
