import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';
import { ToastService } from './toast.service';
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

  private readonly API_URL = `${environment.apiUrl}/auth`;

  // Reactive State with Signals
  public currentUserSignal = signal<UserProfile | null>(this.storage.getUser<UserProfile>());
  public tokenSignal = signal<string | null>(this.storage.getAccessToken());

  public isAuthenticated = computed(() => !!this.tokenSignal() && !!this.currentUserSignal());
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
        error: () => this.logout(false)
      });
    }
  }

  login(credentials: LoginCredentials): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap(response => {
        this.storage.setAccessToken(response.access_token);
        this.storage.setRefreshToken(response.refresh_token);
        this.tokenSignal.set(response.access_token);
      }),
      // Fetch user profile immediately
      tap(() => {
        this.getProfile().subscribe({
          next: (user) => {
            this.toast.success(`¡Bienvenido de nuevo, ${user.nombre}!`);
            if (this.isAdmin()) {
              this.router.navigate(['/admin/dashboard']);
            } else if (this.isEncargado()) {
              this.router.navigate(['/branch/reservations']);
            } else if (this.isCajero()) {
              this.router.navigate(['/pos']);
            } else {
              this.router.navigate(['/home']);
            }
          }
        });
      }),
      catchError(err => {
        const errorMsg = err.error?.detail || 'Error al iniciar sesión. Verifique sus credenciales.';
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
      })
    );
  }

  logout(showNotification: boolean = true): void {
    if (this.tokenSignal()) {
      this.http.post(`${this.API_URL}/logout`, {}).subscribe({
        error: () => {} // Ignore logout errors on server
      });
    }

    this.storage.clearAuth();
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);

    if (showNotification) {
      this.toast.info('Has cerrado sesión correctamente.');
    }

    this.router.navigate(['/auth/login']);
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
}
