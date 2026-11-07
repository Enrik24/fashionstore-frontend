import { Injectable, computed, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { TenantContextService } from './tenant-context.service';
import { SaasApiService } from './saas-api.service';
import { FuncionalidadPlan } from '../models/saas.model';

export type FuncionalidadPlanNombre =
  | 'reportes_ia'
  | 'pago_diferido'
  | 'carrito_offline'
  | 'respaldos'
  | 'restauracion';

export interface ResultadoLimite {
  permitido: boolean;
  usado: number;
  limite: number | null;
  mensaje?: string;
}

/**
 * [EXAMEN-2] Responde si el tenant puede usar una funcionalidad o crear un
 * recurso según los límites de su plan (CU04, RN-002, RN-003, RN-023).
 */
@Injectable({ providedIn: 'root' })
export class PlanFeatureService {
  private tenantContext = inject(TenantContextService);
  private saasApi = inject(SaasApiService);

  public funcionalidades = computed<FuncionalidadPlan | null>(() => this.tenantContext.funcionalidades());

  puedeReportesIA(): boolean {
    return this.funcionalidades()?.reportes_ia === true;
  }

  puedePagoDiferido(): boolean {
    return this.funcionalidades()?.pago_diferido === true;
  }

  puedeCarritoOffline(): boolean {
    return this.funcionalidades()?.carrito_offline === true;
  }

  limiteSucursales(): number {
    return this.funcionalidades()?.max_sucursales ?? this.tenantContext.plan()?.max_sucursales ?? 0;
  }

  limiteUsuarios(): number | null {
    return this.funcionalidades()?.max_usuarios ?? this.tenantContext.plan()?.max_usuarios ?? null;
  }

  limiteProductos(): number | null {
    return this.funcionalidades()?.max_productos ?? this.tenantContext.plan()?.max_productos ?? null;
  }

  puedeCrearSucursal(usoActual: number): ResultadoLimite {
    const limite = this.limiteSucursales();
    const permitido = limite === null || usoActual < limite;
    return {
      permitido,
      usado: usoActual,
      limite,
      mensaje: permitido ? undefined : this.mensajeLimite('sucursales', limite, usoActual)
    };
  }

  puedeCrearUsuario(usoActual: number): ResultadoLimite {
    const limite = this.limiteUsuarios();
    const permitido = limite === null || usoActual < limite;
    return {
      permitido,
      usado: usoActual,
      limite,
      mensaje: permitido ? undefined : this.mensajeLimite('usuarios', limite, usoActual)
    };
  }

  puedeCrearProducto(usoActual: number): ResultadoLimite {
    const limite = this.limiteProductos();
    const permitido = limite === null || usoActual < limite;
    return {
      permitido,
      usado: usoActual,
      limite,
      mensaje: permitido ? undefined : this.mensajeLimite('productos', limite, usoActual)
    };
  }

  puedeRespaldos(): boolean {
    const f = this.funcionalidades();
    return f?.backup_automatico === true || (f?.backup_manual_mensual ?? 0) > 0;
  }

  backupsRestantesMes(usoActual: number): number | null {
    const limite = this.funcionalidades()?.backup_manual_mensual;
    if (limite === null || limite === undefined) return null;
    return Math.max(0, limite - usoActual);
  }

  puedeRestaurar(): boolean {
    return this.funcionalidades()?.permite_restauracion === true;
  }

  mensajeBloqueo(funcionalidad: FuncionalidadPlanNombre): string {
    switch (funcionalidad) {
      case 'reportes_ia':
        return 'Los reportes con IA están disponibles únicamente en los planes Profesional y Empresarial.';
      case 'pago_diferido':
        return 'El pago diferido no está incluido en tu plan actual. Mejora tu plan para ofrecer compras sin conexión.';
      case 'carrito_offline':
        return 'Tu empresa no tiene habilitado el carrito sin conexión.';
      case 'respaldos':
        return 'Tu plan no incluye respaldos automáticos ni manuales.';
      case 'restauracion':
        return 'Tu plan no permite restaurar respaldos. Contacta al Super Administrador.';
      default:
        return 'Funcionalidad disponible solo en los planes Profesional y Empresarial.';
    }
  }

  reflejar(funcionalidades: FuncionalidadPlan): void {
    this.tenantContext.funcionalidades.set(funcionalidades);
  }

  refrescar(): Observable<FuncionalidadPlan> {
    return this.saasApi.obtenerFuncionalidadesPlan().pipe(
      tap((funcionalidades) => this.reflejar(funcionalidades))
    );
  }

  private mensajeLimite(recurso: 'sucursales' | 'usuarios' | 'productos', limite: number | null, usado: number): string {
    const etiqueta = recurso.charAt(0).toUpperCase() + recurso.slice(1);
    return `Alcanzaste el límite de tu plan (${limite ?? 0} ${recurso}). ${etiqueta} en uso: ${usado}. Mejora tu plan para continuar.`;
  }
}
