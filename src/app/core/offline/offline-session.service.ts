import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, from, map, of, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService } from '../services/storage.service';
import { IndexedDbService } from './indexed-db.service';
import { LocalCryptoService, SobreCifrado } from './local-crypto.service';
import { ConnectivityService } from './connectivity.service';
import { DeviceService } from './device.service';
import { UserProfile } from '../models/auth.model';
import {
  CierreSesionOfflineResponse,
  EstadoSesionOffline,
  PinConfigurarResponse,
  SesionOffline,
  SesionOfflineLocal
} from '../models/offline.model';

/**
 * [EXAMEN-2] Sesión offline con PIN (CU17, RNF-13, RNF-17, RN-019).
 * El PIN nunca se guarda: se conserva su hash con salt. El token offline se
 * guarda cifrado con AES-GCM y solo vive en memoria durante la sesión.
 */
@Injectable({ providedIn: 'root' })
export class OfflineSessionService {
  private http = inject(HttpClient);
  private storage = inject(StorageService);
  private indexedDb = inject(IndexedDbService);
  private crypto = inject(LocalCryptoService);
  private connectivity = inject(ConnectivityService);
  private device = inject(DeviceService);

  private readonly API_URL = `${environment.apiUrl}/offline`;
  private readonly CLAVE_SESION = 'sesion';

  public sesionLocal = signal<SesionOfflineLocal | null>(null);
  public sesionActiva = signal<boolean>(false);
  public pinConfigurado = signal<boolean>(this.storage.getPinConfigurado());
  public intentosRestantes = signal<number>(environment.offlinePinMaxIntentos);

  private tokenSignal = signal<string | null>(null);
  private expiraSignal = signal<string | null>(null);
  private claveCrypto: CryptoKey | null = null;

  /** Vigencia agotada: el usuario puede consultar pero no operar offline. */
  public soloConsulta = computed<boolean>(() => {
    const expira = this.expiraSignal();
    if (!expira) return false;
    return Date.parse(expira) <= Date.now();
  });

  constructor() {
    void this.cargarSesionLocal();
  }

  // ---------------------------- PIN ----------------------------

  /**
   * Registra el PIN tras validar la contraseña actual y, si el tenant está
   * operativo, deja listo el token offline cifrado para el próximo ingreso.
   */
  configurarPin(pin: string, contrasenaActual: string): Observable<PinConfigurarResponse> {
    const errorFormato = this.validarFormatoPin(pin);
    if (errorFormato) return throwError(() => new Error(errorFormato));

    return this.device.registrarDispositivo().pipe(
      switchMap(() => this.http.post<PinConfigurarResponse>(`${this.API_URL}/sesion/pin`, {
        contrasena_actual: contrasenaActual,
        pin
      })),
      switchMap((respuesta) => from(this.guardarPinLocal(pin)).pipe(
        switchMap(() => this.solicitarTokenInicial(pin).pipe(
          catchError(() => of(null))
        )),
        map(() => respuesta)
      ))
    );
  }

  /**
   * El backend solo expone `POST /offline/sesion/pin` con contraseña actual;
   * por eso el cambio de PIN también la exige (desviación documentada).
   */
  cambiarPin(pinActual: string, pinNuevo: string, contrasenaActual: string): Observable<PinConfigurarResponse> {
    const errorFormato = this.validarFormatoPin(pinNuevo);
    if (errorFormato) return throwError(() => new Error(errorFormato));

    return from(this.obtenerSesionLocal()).pipe(
      switchMap((local) => {
        if (!local) return throwError(() => new Error('No hay un PIN configurado en este dispositivo.'));
        return from(this.crypto.verificarPin(pinActual, local.pin_hash, local.pin_salt)).pipe(
          switchMap((valido) => {
            if (!valido) return throwError(() => new Error('El PIN actual no coincide.'));
            return this.http.post<PinConfigurarResponse>(`${this.API_URL}/sesion/pin`, {
              contrasena_actual: contrasenaActual,
              pin: pinNuevo
            });
          })
        );
      }),
      switchMap((respuesta) => from(this.guardarPinLocal(pinNuevo)).pipe(
        switchMap(() => this.solicitarTokenInicial(pinNuevo).pipe(catchError(() => of(null)))),
        map(() => respuesta)
      ))
    );
  }

  eliminarPin(): Observable<{ eliminado: boolean; modo_offline: boolean }> {
    return this.http.delete<{ eliminado: boolean; modo_offline: boolean }>(`${this.API_URL}/sesion/pin`).pipe(
      switchMap((respuesta) => from(this.limpiarSesionLocal()).pipe(map(() => respuesta)))
    );
  }

  // ---------------------------- Sesión ----------------------------

  haySesionOffline(): boolean {
    const local = this.sesionLocal();
    if (!local || local.bloqueado) return false;
    return Date.parse(local.expira_en) > Date.now();
  }

  /**
   * Valida el PIN local, cuenta intentos y, con red, renueva el token offline
   * contra el backend. Sin red usa el token cifrado ya guardado.
   */
  iniciarSesionOffline(pin: string): Observable<SesionOffline | null> {
    return from(this.obtenerSesionLocal()).pipe(
      switchMap((local) => {
        if (!local) return throwError(() => new Error('No hay un PIN configurado. Inicia sesión con conexión para configurarlo.'));
        if (local.bloqueado) return throwError(() => new Error('La sesión está bloqueada. Autentícate en línea para continuar.'));
        return from(this.crypto.verificarPin(pin, local.pin_hash, local.pin_salt)).pipe(
          switchMap((valido) => {
            if (!valido) return from(this.registrarIntentoFallido(local)).pipe(
              switchMap((restantes) => throwError(() => new Error(
                restantes > 0
                  ? `PIN incorrecto. Intentos restantes: ${restantes}.`
                  : 'PIN bloqueado tras 5 intentos. Autentícate en línea para continuar.'
              )))
            );
            return from(this.reiniciarIntentos(local)).pipe(
              switchMap((actualizada) => {
                if (this.connectivity.enLinea()) {
                  return this.solicitarTokenInicial(pin).pipe(
                    map((sesion) => sesion ?? null)
                  );
                }
                return from(this.abrirConTokenLocal(pin, actualizada)).pipe(
                  map(() => null as SesionOffline | null)
                );
              })
            );
          })
        );
      })
    );
  }

  renovarSesion(): Observable<SesionOffline> {
    const token = this.tokenSignal();
    if (!token) return throwError(() => new Error('No hay una sesión offline activa para renovar.'));

    return this.http.post<SesionOffline>(`${this.API_URL}/sesion/renovar`, { token_offline: token }).pipe(
      switchMap((sesion) => from(this.guardarTokenLocal(sesion, null)).pipe(map(() => sesion)))
    );
  }

  cerrarSesionOffline(): Observable<CierreSesionOfflineResponse> {
    const token = this.tokenSignal();
    const local = this.sesionLocal();
    const vacio: CierreSesionOfflineResponse = {
      cerrada: true,
      instruccion_borrado_local: { tenant_id: local?.tenant_id ?? null }
    };

    const cierreRemoto = token && this.connectivity.enLinea()
      ? this.http.post<CierreSesionOfflineResponse>(
          `${this.API_URL}/sesion/cerrar`,
          {},
          { headers: new HttpHeaders().set('Authorization', `Bearer ${token}`) }
        ).pipe(catchError(() => of(vacio)))
      : of(vacio);

    return cierreRemoto.pipe(
      switchMap((respuesta) => from(this.limpiarTodoLocal()).pipe(map(() => respuesta)))
    );
  }

  estadoSesion(): Observable<EstadoSesionOffline> {
    if (this.connectivity.enLinea()) {
      return this.device.sincronizarEstado().pipe(
        catchError(() => from(this.estadoLocal()))
      );
    }
    return from(this.estadoLocal());
  }

  tokenOffline(): string | null {
    return this.tokenSignal();
  }

  /** Invalida la sesión local cuando cambia el rol o el usuario fue desactivado. */
  invalidarPorCambioDeRol(): Observable<void> {
    return from(this.limpiarSesionLocal());
  }

  async limpiarSesionLocal(): Promise<void> {
    this.tokenSignal.set(null);
    this.expiraSignal.set(null);
    this.claveCrypto = null;
    this.sesionActiva.set(false);
    this.sesionLocal.set(null);
    this.pinConfigurado.set(false);
    this.intentosRestantes.set(environment.offlinePinMaxIntentos);
    this.storage.setPinConfigurado(false);
    try {
      await this.indexedDb.eliminar('sesion', this.CLAVE_SESION);
    } catch {
      // La base puede no existir todavía; el estado en memoria ya quedó limpio.
    }
  }

  // ===== [EXAMEN-2] =====
  private solicitarTokenInicial(pin: string): Observable<SesionOffline | null> {
    const usuario = this.storage.getUser<UserProfile>();
    const tenant = this.storage.getTenantActivo<{ id: number }>();
    if (!usuario || !tenant) return of(null);

    return this.http.post<SesionOffline>(`${this.API_URL}/sesion/iniciar`, {
      dispositivo_id: this.device.obtenerDispositivoId(),
      pin,
      tenant_id: tenant.id,
      usuario_id: usuario.id
    }).pipe(
      switchMap((sesion) => from(this.guardarTokenLocal(sesion, pin)).pipe(
        map(() => sesion)
      ))
    );
  }

  private abrirConTokenLocal(pin: string, local: SesionOfflineLocal): Promise<void> {
    return this.descifrarTokenLocal(pin, local).then((token) => {
      if (!token) {
        this.sesionActiva.set(true);
        return;
      }
      this.tokenSignal.set(token);
      this.expiraSignal.set(local.expira_en);
      this.sesionActiva.set(true);
      this.pinConfigurado.set(true);
      this.storage.setPinConfigurado(true);
    });
  }

  private async descifrarTokenLocal(pin: string, local: SesionOfflineLocal): Promise<string | null> {
    if (!local.token_offline_cifrado) return null;
    if (Date.parse(local.expira_en) <= Date.now()) return null;

    const clave = await this.crypto.derivarClave(pin, local.pin_salt);
    this.claveCrypto = clave;
    const sobre = JSON.parse(local.token_offline_cifrado) as SobreCifrado;
    return this.crypto.descifrar<string>(sobre, clave);
  }

  private async guardarPinLocal(pin: string): Promise<void> {
    const usuario = this.storage.getUser<UserProfile>();
    const tenant = this.storage.getTenantActivo<{ id: number }>();
    if (!usuario || !tenant) throw new Error('No hay un usuario o tenant activo para configurar el PIN.');

    const salt = this.crypto.generarSalt();
    const hash = await this.crypto.hashPin(pin, salt);
    this.claveCrypto = await this.crypto.derivarClave(pin, salt);

    const actual = (await this.obtenerSesionLocal()) ?? this.sesionBase(tenant.id, usuario.id);
    const local: SesionOfflineLocal = {
      ...actual,
      clave: 'sesion',
      pin_hash: hash,
      pin_salt: salt,
      intentos_fallidos: 0,
      bloqueado: false
    };

    await this.indexedDb.guardar('sesion', local);
    this.sesionLocal.set(local);
    this.pinConfigurado.set(true);
    this.storage.setPinConfigurado(true);
    this.intentosRestantes.set(environment.offlinePinMaxIntentos);
  }

  private async guardarTokenLocal(sesion: SesionOffline, pin: string | null): Promise<void> {
    const usuario = this.storage.getUser<UserProfile>();
    const tenant = this.storage.getTenantActivo<{ id: number }>();
    const actual = (await this.obtenerSesionLocal()) ?? this.sesionBase(
      sesion.tenant_id ?? tenant?.id ?? 0,
      sesion.usuario_id ?? usuario?.id ?? 0
    );

    let sobreJson = actual.token_offline_cifrado ?? null;
    if (pin) {
      const clave = this.claveCrypto ?? await this.crypto.derivarClave(pin, actual.pin_salt);
      this.claveCrypto = clave;
      sobreJson = JSON.stringify(await this.crypto.cifrar(sesion.token_offline, clave));
    }

    const local: SesionOfflineLocal = {
      ...actual,
      tenant_id: sesion.tenant_id,
      usuario_id: sesion.usuario_id,
      dispositivo_id: sesion.dispositivo_id,
      token_offline_cifrado: sobreJson ?? undefined,
      expira_en: sesion.expira_en,
      roles: sesion.roles ?? [],
      permisos: sesion.permisos ?? [],
      ultima_conexion: new Date().toISOString(),
      ultima_descarga: sesion.ultima_descarga ?? actual.ultima_descarga ?? null,
      bloqueado: false,
      intentos_fallidos: 0
    };

    await this.indexedDb.guardar('sesion', local);
    this.sesionLocal.set(local);
    this.tokenSignal.set(sesion.token_offline);
    this.expiraSignal.set(sesion.expira_en);
    this.sesionActiva.set(true);
    this.pinConfigurado.set(true);
    this.storage.setPinConfigurado(true);
    this.intentosRestantes.set(environment.offlinePinMaxIntentos);
  }

  private sesionBase(tenantId: number, usuarioId: number): SesionOfflineLocal {
    return {
      clave: 'sesion',
      tenant_id: tenantId,
      usuario_id: usuarioId,
      dispositivo_id: this.device.obtenerDispositivoId(),
      expira_en: new Date(0).toISOString(),
      pin_hash: '',
      pin_salt: '',
      intentos_fallidos: 0,
      bloqueado: false,
      roles: [],
      permisos: []
    };
  }

  private async registrarIntentoFallido(local: SesionOfflineLocal): Promise<number> {
    const intentos = local.intentos_fallidos + 1;
    const bloqueado = intentos >= environment.offlinePinMaxIntentos;
    const actualizada: SesionOfflineLocal = { ...local, intentos_fallidos: intentos, bloqueado };
    await this.indexedDb.guardar('sesion', actualizada);
    this.sesionLocal.set(actualizada);
    const restantes = Math.max(0, environment.offlinePinMaxIntentos - intentos);
    this.intentosRestantes.set(restantes);
    if (bloqueado) this.sesionActiva.set(false);
    return restantes;
  }

  private async reiniciarIntentos(local: SesionOfflineLocal): Promise<SesionOfflineLocal> {
    const actualizada: SesionOfflineLocal = { ...local, intentos_fallidos: 0, bloqueado: false };
    await this.indexedDb.guardar('sesion', actualizada);
    this.sesionLocal.set(actualizada);
    this.intentosRestantes.set(environment.offlinePinMaxIntentos);
    return actualizada;
  }

  private async cargarSesionLocal(): Promise<void> {
    const local = await this.obtenerSesionLocal();
    if (!local) return;
    this.sesionLocal.set(local);
    this.intentosRestantes.set(Math.max(0, environment.offlinePinMaxIntentos - local.intentos_fallidos));
    this.pinConfigurado.set(!!local.pin_hash);
    this.expiraSignal.set(local.expira_en);
  }

  private async obtenerSesionLocal(): Promise<SesionOfflineLocal | null> {
    try {
      return await this.indexedDb.obtener<SesionOfflineLocal>('sesion', this.CLAVE_SESION);
    } catch {
      return null;
    }
  }

  private async estadoLocal(): Promise<EstadoSesionOffline> {
    const local = this.sesionLocal() ?? await this.obtenerSesionLocal();
    const usuario = this.storage.getUser<UserProfile>();
    return {
      usuario_id: local?.usuario_id ?? usuario?.id ?? 0,
      tenant_id: local?.tenant_id ?? 0,
      dispositivo_id: local?.dispositivo_id ?? this.device.obtenerDispositivoId(),
      pin_configurado: !!local?.pin_hash,
      dispositivo_activo: !!local && !local.bloqueado,
      intentos_restantes: this.intentosRestantes(),
      max_horas_sesion_offline: this.horasRestantes(local?.expira_en),
      ultima_conexion: local?.ultima_conexion ?? null,
      ultima_descarga: local?.ultima_descarga ?? null
    };
  }

  private horasRestantes(expira?: string): number {
    if (!expira) return 0;
    const milisegundos = Date.parse(expira) - Date.now();
    return Math.max(0, Math.ceil(milisegundos / 3_600_000));
  }

  private async limpiarTodoLocal(): Promise<void> {
    const local = this.sesionLocal() ?? await this.obtenerSesionLocal();
    const tenantId = local?.tenant_id ?? this.storage.getTenantActivo<{ id: number }>()?.id ?? null;
    if (tenantId) {
      await this.indexedDb.eliminarPorTenant(tenantId);
    } else {
      await this.indexedDb.eliminar('sesion', this.CLAVE_SESION);
    }
    await this.limpiarSesionLocal();
  }

  private validarFormatoPin(pin: string): string | null {
    if (!/^\d+$/.test(pin)) return 'El PIN debe contener solo dígitos.';
    if (pin.length < environment.offlinePinLongitudMin) {
      return `El PIN debe tener al menos ${environment.offlinePinLongitudMin} dígitos.`;
    }
    if (pin.length > 12) return 'El PIN no puede superar los 12 dígitos.';
    if (new Set(pin.split('')).size === 1) return 'El PIN no puede ser una secuencia trivial.';
    return null;
  }
}
