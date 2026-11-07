import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, tap } from 'rxjs';
import { StorageService } from './storage.service';
import { SaasApiService } from './saas-api.service';
import { FuncionalidadPlan, Plan, Suscripcion, Tenant } from '../models/saas.model';

/**
 * [EXAMEN-2] Estado global del tenant activo (CU04).
 * Publica tenant, plan, suscripción y funcionalidades en signals para toda la app.
 */
@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private storage = inject(StorageService);
  private saasApi = inject(SaasApiService);

  public tenant = signal<Tenant | null>(this.storage.getTenantActivo<Tenant>());
  public plan = signal<Plan | null>(null);
  public suscripcion = signal<Suscripcion | null>(null);
  public funcionalidades = signal<FuncionalidadPlan | null>(this.storage.getFuncionalidades<FuncionalidadPlan>());

  /** Tenant que el Super Administrador está consultando en el panel. */
  public tenantConsultadoId = signal<number | null>(this.storage.getTenantConsultadoId());

  public estadoTenant = computed(() => this.tenant()?.estado ?? 'CONFIGURACION_INICIAL');

  public diasParaVencimiento = computed<number | null>(() => {
    const vencimiento = this.suscripcion()?.fecha_vencimiento;
    if (!vencimiento) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fecha = new Date(`${vencimiento}T00:00:00`);
    if (Number.isNaN(fecha.getTime())) return null;
    return Math.ceil((fecha.getTime() - hoy.getTime()) / 86_400_000);
  });

  public suscripcionPorVencer = computed(() => {
    const dias = this.diasParaVencimiento();
    return dias !== null && dias >= 0 && dias <= 7;
  });

  public nombrePlan = computed(() => this.plan()?.nombre ?? this.funcionalidades()?.plan ?? 'Sin plan');

  /** Carga plan, suscripción y funcionalidades después del login. */
  cargarContexto(tenantId?: number | null): Observable<void> {
    const tenantActivo = this.tenant();
    const id = tenantId ?? tenantActivo?.id ?? null;
    if (!id) {
      this.limpiarContexto();
      return of(void 0);
    }

    if (tenantId && tenantActivo?.id !== tenantId) {
      this.storage.setTenantActivo({ id } as Tenant);
    }

    return forkJoin({
      suscripcion: this.saasApi.obtenerMiSuscripcion().pipe(catchError(() => of(null))),
      funcionalidades: this.saasApi.obtenerFuncionalidadesPlan().pipe(catchError(() => of(null)))
    }).pipe(
      tap(({ suscripcion, funcionalidades }) => {
        this.suscripcion.set(suscripcion);
        this.plan.set(suscripcion?.plan ?? null);
        this.funcionalidades.set(funcionalidades);
        if (funcionalidades) this.storage.setFuncionalidades(funcionalidades);
      }),
      map(() => void 0)
    );
  }

  limpiarContexto(): void {
    this.tenant.set(null);
    this.plan.set(null);
    this.suscripcion.set(null);
    this.funcionalidades.set(null);
    this.tenantConsultadoId.set(null);
    this.storage.clearTenantActivo();
    this.storage.setTenantConsultadoId(null);
  }

  /** Solo para el Super Administrador: consulta "como" un tenant. */
  fijarTenantConsultado(id: number | null): void {
    this.tenantConsultadoId.set(id);
    this.storage.setTenantConsultadoId(id);
  }

  /** Actualiza el resumen del tenant (tras guardar el asistente o cambiar de estado). */
  actualizarTenant(tenant: Tenant): void {
    this.tenant.set(tenant);
    this.storage.setTenantActivo(tenant);
  }
}
