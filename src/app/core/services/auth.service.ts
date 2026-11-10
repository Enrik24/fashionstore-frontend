import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, map, throwError, switchMap, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';
import { ToastService } from './toast.service';
import { TenantContextService } from './tenant-context.service';
import { PlanFeatureService, FuncionalidadPlanNombre } from './plan-feature.service';
import { ConnectivityService } from '../offline/connectivity.service';
import { OfflineSessionService } from '../offline/offline-session.service';
import {
  LoginCredentials,
  RegisterClientData,
  TokenResponse,
  UserProfile
} from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private storage = inject(StorageService);
  private router = inject(Router);
  private toast = inject(ToastService);
  // [EXAMEN-2] Contexto SaaS, plan, conectividad y sesión offline.
  private tenantContext = inject(TenantContextService);
  private planFeature = inject(PlanFeatureService);
  private connectivity = inject(ConnectivityService);
  private offlineSession = inject(OfflineSessionService);

  private readonly API_URL = `${environment.apiUrl}/auth`;

  // Reactive State with Signals
  public currentUserSignal = signal<UserProfile | null>(this.storage.getUser<UserProfile>());
  public tokenSignal = signal<string | null>(this.storage.getAccessToken());
  // [EXAMEN-2] Distingue al usuario de plataforma del administrador de tenant.
  private superAdminSignal = signal<boolean>(this.storage.getEsSuperAdmin());
  private cerrando = false;

  public isAuthenticated = computed(() => !!this.tokenSignal() && !!this.currentUserSignal());
  public esSuperAdmin = computed(() => this.superAdminSignal() || this.currentUserSignal()?.es_super_admin === true);
  public estaOnline = computed(() => this.connectivity.enLinea());
  public isAdmin = computed(() => {
    const user = this.currentUserSignal();
    if (!user || !user.roles) return false;
    return user.roles.some(r => r.nombre.toLowerCase() === 'administrador');
  });
  public isEncargado = computed(() => {
    const user = this.currentUserSignal();
    if (!user || !user.roles) return false;
    return user.roles.some(r => r.nombre.toLowerCase() === 'encargado' || r.nombre.toLowerCase() === 'encargado de sucursal');
  });
  public isCajero = computed(() => {
    const user = this.currentUserSignal();
    if (!user || !user.roles) return false;
    return user.roles.some(r => r.nombre.toLowerCase() === 'cajero');
  });
  public isClient = computed(() => {
    const user = this.currentUserSignal();
    if (!user || !user.roles) return false;
    return user.roles.some(r => r.nombre.toLowerCase() === 'cliente');
  });
  public userSucursalId = computed(() => this.currentUserSignal()?.sucursal_id ?? null);
  public userSucursalNombre = computed(() => this.currentUserSignal()?.sucursal_nombre ?? null);

  constructor() {
    // If token exists, load fresh profile
    if (this.storage.getAccessToken()) {
      this.getProfile().subscribe({
        error: (err) => {
          // [EXAMEN-2] Sin red (status 0) o error del servidor: no cerrar la
          // sesión; el usuario debe poder seguir operando con su PIN offline.
          if (err?.status !== 401 && err?.status !== 403) return;

          // Token inválido/expirado en el arranque: se limpia solo el contexto
          // online. El PIN y los datos offline se conservan para poder entrar
          // por /offline/acceso (CU17).
          this.storage.clearAuth();
          this.tokenSignal.set(null);
          this.currentUserSignal.set(null);
          this.superAdminSignal.set(false);
        }
      });
    }
  }

  login(credentials: LoginCredentials): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap(response => {
        // [EXAMEN-2] RN-004: una suscripción vencida o suspendida no opera.
        const estado = response.suscripcion?.estado;
        const bloqueada = !response.es_super_admin && !!estado && estado !== 'ACTIVA';
        if (bloqueada) {
          throw new Error(
            estado === 'SUSPENDIDA'
              ? 'La suscripción de tu empresa está suspendida. Contacta al administrador de la plataforma.'
              : 'La suscripción de tu empresa está vencida. Renueva el plan para continuar.'
          );
        }
        this.aplicarContextoToken(response);
      }),
      // Fetch user profile immediately
      switchMap((response) =>
        this.getProfile().pipe(
          tap((user) => {
            this.tenantContext.cargarContexto(user.tenant_id ?? this.storage.getTenantActivo<{ id: number }>()?.id ?? null)
              .subscribe({ error: () => { /* el contexto se reintenta en la próxima navegación */ } });

            this.toast.success(`¡Bienvenido de nuevo, ${user.nombre}!`);
            if (this.esSuperAdmin()) {
              this.router.navigate(['/plataforma/empresas']);
            } else if (this.isAdmin()) {
              this.router.navigate(['/admin/dashboard']);
            } else if (this.isEncargado()) {
              this.router.navigate(['/branch/reservations']);
            } else if (this.isCajero()) {
              this.router.navigate(['/pos']);
            } else {
              this.router.navigate(['/home']);
            }
          }),
          map(() => response)
        )
      ),
      catchError(err => {
        const errorMsg = err?.error?.detail || err?.message || 'Error al iniciar sesión. Verifique sus credenciales.';
        this.toast.error(errorMsg);
        return throwError(() => err);
      })
    );
  }

  register(data: RegisterClientData): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.API_URL}/register`, data).pipe(
      tap(response => {
        this.storage.setAccessToken(response.access_token);
        this.storage.setRefreshToken(response.refresh_token);
        this.tokenSignal.set(response.access_token);
      }),
      tap(() => {
        this.getProfile().subscribe({
          next: (user) => {
            this.toast.success(`Cuenta creada con éxito. ¡Bienvenido a FashionStore, ${user.nombre}!`);
            this.router.navigate(['/home']);
          }
        });
      }),
      catchError(err => {
        const errorMsg = err.error?.detail || 'Error al registrar la cuenta. Verifique los datos.';
        this.toast.error(errorMsg);
        return throwError(() => err);
      })
    );
  }

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.API_URL}/me`).pipe(
      tap(user => {
        this.storage.setUser(user);
        this.currentUserSignal.set(user);
        if (user.es_super_admin !== undefined) {
          this.superAdminSignal.set(user.es_super_admin);
          this.storage.setEsSuperAdmin(user.es_super_admin);
        }
      })
    );
  }

  refreshToken(): Observable<TokenResponse> {
    const refreshToken = this.storage.getRefreshToken();
    if (!refreshToken) {
      this.logout(false);
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<TokenResponse>(`${this.API_URL}/refresh`, { refresh_token: refreshToken }).pipe(
      tap(response => {
        this.storage.setAccessToken(response.access_token);
        this.storage.setRefreshToken(response.refresh_token);
        this.tokenSignal.set(response.access_token);
        this.aplicarContextoToken(response);
      }),
      // [EXAMEN-2] Revalida tenant y suscripción; si fallan, cierra la sesión.
      switchMap((response) => this.tenantContext.cargarContexto(response.tenant_id ?? null).pipe(
        catchError(() => {
          this.logout(false);
          return throwError(() => new Error('La suscripción ya no está disponible'));
        }),
        map(() => response)
      ))
    );
  }

  logout(showNotification: boolean = true): void {
    if (this.cerrando) return;
    this.cerrando = true;

    if (this.tokenSignal()) {
      this.http.post(`${this.API_URL}/logout`, {}).subscribe({
        error: () => {} // Ignore logout errors on server
      });
    }

    // [EXAMEN-2] RNF-17: cierra la sesión offline y borra los datos del tenant.
    this.offlineSession.cerrarSesionOffline().pipe(
      finalize(() => this.finalizarLogout(showNotification))
    ).subscribe({
      error: () => { /* el borrado local se completó igualmente */ },
      complete: () => { /* finalize se encarga */ }
    });
  }

  getUserInitials(): string {
    const user = this.currentUserSignal();
    if (!user) return 'FS';
    const firstInitial = user.nombre ? user.nombre.charAt(0).toUpperCase() : '';
    const lastInitial = user.apellido ? user.apellido.charAt(0).toUpperCase() : '';
    return `${firstInitial}${lastInitial}` || 'FS';
  }

  getUserFullName(): string {
    const user = this.currentUserSignal();
    if (!user) return 'Invitado';
    return `${user.nombre} ${user.apellido}`.trim();
  }

  hasRole(roleName: string): boolean {
    const user = this.currentUserSignal();
    if (!user || !user.roles) return false;
    return user.roles.some(r => r.nombre.toLowerCase() === roleName.toLowerCase());
  }

  // ===== [EXAMEN-2] =====

  /** ¿El plan del tenant incluye la funcionalidad indicada? */
  tieneFeature(nombre: FuncionalidadPlanNombre): boolean {
    switch (nombre) {
      case 'reportes_ia': return this.planFeature.puedeReportesIA();
      case 'pago_diferido': return this.planFeature.puedePagoDiferido();
      case 'carrito_offline': return this.planFeature.puedeCarritoOffline();
      case 'respaldos': return this.planFeature.puedeRespaldos();
      case 'restauracion': return this.planFeature.puedeRestaurar();
      default: return false;
    }
  }

  /** Fuerza el cambio cuando `debe_cambiar_contrasena` está activo. */
  cambiarContrasena(contrasenaActual: string, contrasenaNueva: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_URL}/change-password`, {
      contrasena_actual: contrasenaActual,
      contrasena_nueva: contrasenaNueva
    }).pipe(
      tap(() => {
        const user = this.currentUserSignal();
        if (user) {
          const actualizado = { ...user, debe_cambiar_contrasena: false };
          this.currentUserSignal.set(actualizado);
          this.storage.setUser(actualizado);
        }
        this.toast.success('Contraseña actualizada correctamente.');
      })
    );
  }

  private aplicarContextoToken(response: TokenResponse): void {
    this.storage.setAccessToken(response.access_token);
    this.storage.setRefreshToken(response.refresh_token);
    this.tokenSignal.set(response.access_token);

    const esSuperAdmin = response.es_super_admin === true;
    this.superAdminSignal.set(esSuperAdmin);
    this.storage.setEsSuperAdmin(esSuperAdmin);

    if (response.tenant) {
      this.storage.setTenantActivo(response.tenant);
      // ✅ FIX E1: sincronizar signal para que tenantOperativoGuard vea estado OPERATIVO desde el login.
      if ((response.tenant as any).estado) {
        this.tenantContext.actualizarTenant(response.tenant as any);
      }
    }
    if (response.suscripcion) {
      this.tenantContext.suscripcion.set({
        id: response.suscripcion.id ?? 0,
        tenant_id: response.tenant_id ?? 0,
        plan_id: response.suscripcion.plan_id ?? 0,
        fecha_inicio: response.suscripcion.fecha_inicio ?? '',
        fecha_vencimiento: response.suscripcion.fecha_vencimiento ?? '',
        estado: (response.suscripcion.estado ?? 'ACTIVA') as 'ACTIVA' | 'SUSPENDIDA' | 'CANCELADA' | 'VENCIDA',
        estado_pago: response.suscripcion.estado_pago ?? '',
        renovacion_automatica: false,
        plan: null
      });
    }
  }

  private finalizarLogout(showNotification: boolean): void {
    this.tenantContext.limpiarContexto();
    this.connectivity.detenerMonitoreo();
    this.storage.clearAuth();
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);
    this.superAdminSignal.set(false);

    if (showNotification) {
      this.toast.info('Has cerrado sesión correctamente.');
    }

    this.cerrando = false;
    this.router.navigate(['/auth/login']);
  }
}
