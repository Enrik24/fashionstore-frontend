import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService } from '../services/storage.service';
import { IndexedDbService } from './indexed-db.service';
import {
  DispositivoRegistroRequest,
  DispositivoSincronizacion,
  EstadoSesionOffline,
  PlataformaDispositivo
} from '../models/offline.model';

/**
 * [EXAMEN-2] Dispositivos autorizados (CU17, RN-019).
 * Mantiene un UUID estable por navegador, registra el dispositivo en el
 * backend y permite revocarlo con borrado local inmediato.
 */
@Injectable({ providedIn: 'root' })
export class DeviceService {
  private http = inject(HttpClient);
  private storage = inject(StorageService);
  private indexedDb = inject(IndexedDbService);

  private readonly API_URL = `${environment.apiUrl}/offline`;

  /** Identificador estable del dispositivo; se genera una sola vez. */
  obtenerDispositivoId(): string {
    const existente = this.storage.getDispositivoId();
    if (existente) return existente;

    const nuevo = this.generarUuid();
    this.storage.setDispositivoId(nuevo);
    return nuevo;
  }

  /** Registra o actualiza el dispositivo local en el backend. */
  registrarDispositivo(): Observable<DispositivoSincronizacion> {
    const id = this.obtenerDispositivoId();
    const datos: DispositivoRegistroRequest = {
      id,
      plataforma: this.obtenerPlataforma(),
      nombre: this.obtenerNombreDispositivo()
    };

    return this.http.post<DispositivoSincronizacion>(`${this.API_URL}/dispositivos`, datos).pipe(
      catchError((error) => {
        const detalle = String(error?.error?.detail ?? '');
        const revocado = /revocado/i.test(detalle);
        if (!revocado) return throwError(() => error);

        // RN-019: el UUID anterior quedó revocado; se estrena uno nuevo.
        const reemplazo = this.generarUuid();
        this.storage.setDispositivoId(reemplazo);
        return this.http.post<DispositivoSincronizacion>(`${this.API_URL}/dispositivos`, {
          id: reemplazo,
          plataforma: this.obtenerPlataforma(),
          nombre: this.obtenerNombreDispositivo()
        } satisfies DispositivoRegistroRequest);
      })
    );
  }

  listarDispositivos(): Observable<DispositivoSincronizacion[]> {
    return this.http.get<DispositivoSincronizacion[]>(`${this.API_URL}/dispositivos`);
  }

  /**
   * Revoca un dispositivo. Si es el dispositivo local, borra de inmediato los
   * datos del tenant y la sesión offline (RN-019, RNF-17).
   */
  revocarDispositivo(id: string, motivo?: string): Observable<DispositivoSincronizacion> {
    return this.http
      .post<DispositivoSincronizacion>(`${this.API_URL}/dispositivos/${id}/revocar`, { motivo })
      .pipe(
        switchMap((dispositivo) => {
          if (id !== this.obtenerDispositivoId()) return of(dispositivo);
          return this.borrarDatosLocalesDelDispositivo().pipe(map(() => dispositivo));
        })
      );
  }

  /** Comprueba contra el backend si el dispositivo local sigue autorizado. */
  sincronizarEstado(): Observable<EstadoSesionOffline> {
    const headers = new HttpHeaders().set('X-Device-ID', this.obtenerDispositivoId());
    return this.http
      .get<EstadoSesionOffline>(`${this.API_URL}/sesion/estado`, { headers })
      .pipe(
        switchMap((estado) => {
          if (estado.dispositivo_activo) return of(estado);
          return this.borrarDatosLocalesDelDispositivo().pipe(map(() => estado));
        })
      );
  }

  /** Nombre legible compuesto por navegador y sistema operativo. */
  obtenerNombreDispositivo(): string {
    if (typeof navigator === 'undefined') return 'Dispositivo web';

    const agente = navigator.userAgent;
    const navegador =
      /Edg\//.test(agente) ? 'Edge' :
      /OPR\//.test(agente) ? 'Opera' :
      /Firefox\//.test(agente) ? 'Firefox' :
      /Chrome\//.test(agente) ? 'Chrome' :
      /Safari\//.test(agente) ? 'Safari' : 'Navegador';

    const sistema =
      /Android/.test(agente) ? 'Android' :
      /iPhone|iPad|iPod/.test(agente) ? 'iOS' :
      /Windows/.test(agente) ? 'Windows' :
      /Mac OS X/.test(agente) ? 'macOS' :
      /Linux/.test(agente) ? 'Linux' : 'Web';

    return `${navegador} en ${sistema}`;
  }

  // ===== [EXAMEN-2] =====
  private obtenerPlataforma(): PlataformaDispositivo {
    if (typeof location !== 'undefined' && location.pathname.startsWith('/pos')) return 'POS';
    return 'WEB';
  }

  private borrarDatosLocalesDelDispositivo(): Observable<void> {
    const tenantId = this.storage.getTenantActivo<{ id: number }>()?.id ?? null;
    const limpieza = tenantId
      ? this.indexedDb.eliminarPorTenant(tenantId)
      : this.indexedDb.eliminar('sesion', 'sesion');

    return new Observable<void>((subscriber) => {
      limpieza
        .then(() => {
          this.storage.setPinConfigurado(false);
          subscriber.next();
          subscriber.complete();
        })
        .catch((error) => subscriber.error(error));
    });
  }

  private generarUuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Respaldo para navegadores antiguos sin randomUUID.
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (caracter) => {
      const aleatorio = Math.floor(Math.random() * 16);
      const valor = caracter === 'x' ? aleatorio : (aleatorio & 0x3) | 0x8;
      return valor.toString(16);
    });
  }
}
