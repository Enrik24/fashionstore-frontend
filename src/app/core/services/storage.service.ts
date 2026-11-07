import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly ACCESS_TOKEN_KEY = 'fs_access_token';
  private readonly REFRESH_TOKEN_KEY = 'fs_refresh_token';
  private readonly USER_KEY = 'fs_user_data';
  // [EXAMEN-2] Llaves de contexto SaaS y dispositivo.
  private readonly DISPOSITIVO_ID_KEY = 'fs_dispositivo_id';
  private readonly PIN_CONFIGURADO_KEY = 'fs_offline_pin_configurado';
  private readonly TENANT_ACTIVO_KEY = 'fs_tenant_activo';
  private readonly SUPER_ADMIN_KEY = 'fs_es_super_admin';
  private readonly FUNCIONALIDADES_KEY = 'fs_funcionalidades_plan';
  private readonly TENANT_CONSULTADO_KEY = 'fs_tenant_consultado';

  getAccessToken(): string | null {
    try {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  setAccessToken(token: string): void {
    try {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    } catch (e) {
      console.error('Error saving access token to localStorage', e);
    }
  }

  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  setRefreshToken(token: string): void {
    try {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
    } catch (e) {
      console.error('Error saving refresh token to localStorage', e);
    }
  }

  getUser<T>(): T | null {
    try {
      const data = localStorage.getItem(this.USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  setUser<T>(user: T): void {
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Error saving user data to localStorage', e);
    }
  }

  clearAuth(): void {
    try {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      // [EXAMEN-2] El cierre de sesión descarta el contexto del tenant y el
      // indicador de PIN; el identificador del dispositivo se conserva.
      localStorage.removeItem(this.TENANT_ACTIVO_KEY);
      localStorage.removeItem(this.SUPER_ADMIN_KEY);
      localStorage.removeItem(this.FUNCIONALIDADES_KEY);
      localStorage.removeItem(this.TENANT_CONSULTADO_KEY);
      localStorage.removeItem(this.PIN_CONFIGURADO_KEY);
    } catch (e) {
      console.error('Error clearing auth from localStorage', e);
    }
  }

  // ===== [EXAMEN-2] =====
  getDispositivoId(): string | null {
    try { return localStorage.getItem(this.DISPOSITIVO_ID_KEY); } catch { return null; }
  }

  setDispositivoId(id: string): void {
    try { localStorage.setItem(this.DISPOSITIVO_ID_KEY, id); } catch (e) {
      console.error('Error saving dispositivo id', e);
    }
  }

  getPinConfigurado(): boolean {
    try { return localStorage.getItem(this.PIN_CONFIGURADO_KEY) === 'true'; } catch { return false; }
  }

  setPinConfigurado(configurado: boolean): void {
    try { localStorage.setItem(this.PIN_CONFIGURADO_KEY, String(configurado)); } catch (e) {
      console.error('Error saving PIN flag', e);
    }
  }

  getTenantActivo<T>(): T | null {
    try {
      const data = localStorage.getItem(this.TENANT_ACTIVO_KEY);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  }

  setTenantActivo<T>(tenant: T): void {
    try { localStorage.setItem(this.TENANT_ACTIVO_KEY, JSON.stringify(tenant)); } catch (e) {
      console.error('Error saving tenant activo', e);
    }
  }

  clearTenantActivo(): void {
    try { localStorage.removeItem(this.TENANT_ACTIVO_KEY); } catch { /* noop */ }
  }

  getEsSuperAdmin(): boolean {
    try { return localStorage.getItem(this.SUPER_ADMIN_KEY) === 'true'; } catch { return false; }
  }

  setEsSuperAdmin(esSuperAdmin: boolean): void {
    try { localStorage.setItem(this.SUPER_ADMIN_KEY, String(esSuperAdmin)); } catch (e) {
      console.error('Error saving super admin flag', e);
    }
  }

  getFuncionalidades<T>(): T | null {
    try {
      const data = localStorage.getItem(this.FUNCIONALIDADES_KEY);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  }

  setFuncionalidades<T>(funcionalidades: T): void {
    try { localStorage.setItem(this.FUNCIONALIDADES_KEY, JSON.stringify(funcionalidades)); } catch (e) {
      console.error('Error saving funcionalidades', e);
    }
  }

  getTenantConsultadoId(): number | null {
    try {
      const value = localStorage.getItem(this.TENANT_CONSULTADO_KEY);
      return value ? Number(value) : null;
    } catch { return null; }
  }

  setTenantConsultadoId(tenantId: number | null): void {
    try {
      if (tenantId === null) localStorage.removeItem(this.TENANT_CONSULTADO_KEY);
      else localStorage.setItem(this.TENANT_CONSULTADO_KEY, String(tenantId));
    } catch (e) {
      console.error('Error saving tenant consultado', e);
    }
  }
}

