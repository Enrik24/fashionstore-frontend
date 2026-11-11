import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AsistenteConfiguracion,
  CambioPlanRequest,
  CheckoutSuscripcionResponse,
  ConfiguracionOfflineUpdateDto,
  ConfiguracionTenantResponse,
  DatosEmpresaUpdateDto,
  EstadoSuscripcionResponse,
  FuncionalidadPlan,
  HistorialPagos,
  ImpactoPlan,
  ListadoTenants,
  PagoSuscripcionCreateDto,
  Plan,
  PlanConUso,
  PlanCreateDto,
  PlanUpdateDto,
  ReenviarCredencialesResponse,
  SucursalConfigCreateDto,
  SucursalConfigResponse,
  Suscripcion,
  SuscripcionCreateDto,
  Tenant,
  TenantCreateDto,
  TenantDetalle,
  TenantEstadoUpdateDto,
  TenantUpdateDto,
  UsoTenant,
  UsuarioConfigCreateDto,
  UsuarioConfigResponse
} from '../models/saas.model';

export interface FiltrosTenants {
  skip?: number;
  limit?: number;
  estado?: string;
  q?: string;
}

/**
 * [EXAMEN-2] Servicio HTTP de la capa SaaS (CU01–CU04).
 * Consume `/api/v1/saas/*` de la Fase 1 del backend.
 */
@Injectable({ providedIn: 'root' })
export class SaasApiService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/saas`;

  // ---------------------------- Tenants ----------------------------

  listarTenants(filtros: FiltrosTenants = {}): Observable<ListadoTenants> {
    let params = new HttpParams();
    if (filtros.skip !== undefined) params = params.set('skip', filtros.skip);
    if (filtros.limit !== undefined) params = params.set('limit', filtros.limit);
    if (filtros.estado) params = params.set('estado', filtros.estado);
    if (filtros.q) params = params.set('q', filtros.q);
    return this.http.get<ListadoTenants>(`${this.API_URL}/tenants`, { params });
  }

  obtenerTenant(id: number): Observable<TenantDetalle> {
    return this.http.get<TenantDetalle>(`${this.API_URL}/tenants/${id}`);
  }

  crearTenant(datos: TenantCreateDto): Observable<Tenant> {
    return this.http.post<Tenant>(`${this.API_URL}/tenants`, datos);
  }

  actualizarTenant(id: number, datos: TenantUpdateDto): Observable<Tenant> {
    return this.http.put<Tenant>(`${this.API_URL}/tenants/${id}`, datos);
  }

  cambiarEstadoTenant(id: number, estado: TenantEstadoUpdateDto['estado'], motivo?: string): Observable<Tenant> {
    return this.http.patch<Tenant>(`${this.API_URL}/tenants/${id}/estado`, { estado, motivo });
  }

  obtenerUsoTenant(id: number): Observable<UsoTenant> {
    return this.http.get<UsoTenant>(`${this.API_URL}/tenants/${id}/uso`);
  }

  reenviarCredenciales(id: number): Observable<ReenviarCredencialesResponse> {
    return this.http.post<ReenviarCredencialesResponse>(`${this.API_URL}/tenants/${id}/reenviar-credenciales`, {});
  }

  // ---------------------------- Planes ----------------------------

  listarPlanes(): Observable<Plan[]> {
    return this.http.get<Plan[]>(`${this.API_URL}/planes`);
  }

  obtenerPlan(id: number): Observable<PlanConUso> {
    return this.http.get<PlanConUso>(`${this.API_URL}/planes/${id}`);
  }

  crearPlan(datos: PlanCreateDto): Observable<Plan> {
    return this.http.post<Plan>(`${this.API_URL}/planes`, datos);
  }

  actualizarPlan(id: number, datos: PlanUpdateDto): Observable<Plan> {
    return this.http.put<Plan>(`${this.API_URL}/planes/${id}`, datos);
  }

  eliminarPlan(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/planes/${id}`);
  }

  obtenerImpactoPlan(id: number, cambios?: PlanUpdateDto): Observable<ImpactoPlan> {
    if (!cambios) {
      return this.http.get<ImpactoPlan>(`${this.API_URL}/planes/${id}/impacto`);
    }
    // El backend calcula el impacto con los límites ya guardados; si hay
    // cambios sin guardar se envía la propuesta como query para trazabilidad.
    let params = new HttpParams();
    Object.entries(cambios).forEach(([clave, valor]) => {
      if (valor !== undefined && valor !== null) params = params.set(clave, String(valor));
    });
    return this.http.get<ImpactoPlan>(`${this.API_URL}/planes/${id}/impacto`, { params });
  }

  // ---------------------------- Suscripciones ----------------------------

  /**
   * El backend de la Fase 1 no expone `GET /saas/suscripciones`; el listado se
   * compone con el detalle de cada tenant para no inventar un endpoint.
   */
  listarSuscripciones(filtros: FiltrosTenants = {}): Observable<Suscripcion[]> {
    return this.listarTenants({ ...filtros, limit: filtros.limit ?? 200 }).pipe(
      switchMap(({ items }) => {
        if (items.length === 0) return of([] as Suscripcion[]);
        return forkJoin(items.map((tenant) => this.obtenerTenant(tenant.id))).pipe(
          map((detalles) => detalles
            .map((detalle) => detalle.suscripcion)
            .filter((suscripcion): suscripcion is Suscripcion => !!suscripcion))
        );
      })
    );
  }

  asignarSuscripcion(datos: SuscripcionCreateDto): Observable<Suscripcion> {
    return this.http.post<Suscripcion>(`${this.API_URL}/suscripciones`, datos);
  }

  cambiarPlan(suscripcionId: number, planId: number): Observable<Suscripcion> {
    const datos: CambioPlanRequest = { plan_id: planId };
    return this.http.put<Suscripcion>(`${this.API_URL}/suscripciones/${suscripcionId}/plan`, datos);
  }

  renovarSuscripcion(id: number): Observable<Suscripcion> {
    return this.http.post<Suscripcion>(`${this.API_URL}/suscripciones/${id}/renovar`, {});
  }

  suspenderSuscripcion(id: number, motivo?: string): Observable<EstadoSuscripcionResponse> {
    let params = new HttpParams();
    if (motivo) params = params.set('motivo', motivo);
    return this.http.post<EstadoSuscripcionResponse>(`${this.API_URL}/suscripciones/${id}/suspender`, {}, { params });
  }

  reactivarSuscripcion(id: number, motivo?: string): Observable<EstadoSuscripcionResponse> {
    let params = new HttpParams();
    if (motivo) params = params.set('motivo', motivo);
    return this.http.post<EstadoSuscripcionResponse>(`${this.API_URL}/suscripciones/${id}/reactivar`, {}, { params });
  }

  cancelarSuscripcion(id: number, motivo?: string): Observable<EstadoSuscripcionResponse> {
    let params = new HttpParams();
    if (motivo) params = params.set('motivo', motivo);
    return this.http.post<EstadoSuscripcionResponse>(`${this.API_URL}/suscripciones/${id}/cancelar`, {}, { params });
  }

  /**
   * RN-011: inicia el cobro del plan. El backend recibe un `PagoSuscripcionCreate`.
   * Si no se conoce el monto, se consulta el plan antes de registrar el intento.
   */
  crearCheckoutSuscripcion(
    suscripcionId: number,
    planId: number,
    monto?: number,
    moneda: string = 'BOB'
  ): Observable<CheckoutSuscripcionResponse> {
    const registrar = (montoFinal: number) => {
      const datos: PagoSuscripcionCreateDto = {
        suscripcion_id: suscripcionId,
        monto: montoFinal,
        moneda,
        estado: 'PENDIENTE',
        referencia: `PLAN-${planId}`
      };
      return this.http.post<CheckoutSuscripcionResponse>(`${this.API_URL}/suscripciones/checkout`, datos);
    };

    if (monto !== undefined) return registrar(monto);
    return this.obtenerPlan(planId).pipe(switchMap((plan) => registrar(plan.precio_mensual)));
  }

  /**
   * [EXAMEN-2] CU03 / RN-011: confirma el pago de la suscripción tras el
   * retorno de Stripe Checkout (`POST /saas/suscripciones/stripe/confirmar-retorno`).
   * La llaman las páginas `/suscripcion-exitosa` y `/suscripcion-cancelada`.
   */
  confirmarRetornoSuscripcion(sessionId: string, suscripcionId: number | null) {
    let params = new HttpParams().set('session_id', sessionId);
    if (suscripcionId) params = params.set('suscripcion_id', String(suscripcionId));
    return this.http.post<{ mensaje: string; payment_status: string }>(
      `${this.API_URL}/suscripciones/stripe/confirmar-retorno`, null, { params }
    );
  }

  /** Historial de pagos del tenant autenticado (`GET /saas/mi-suscripcion/pagos`). */
  listarPagosSuscripcion(): Observable<HistorialPagos> {
    return this.http.get<HistorialPagos>(`${this.API_URL}/mi-suscripcion/pagos`);
  }

  // ---------------------------- Tenant autenticado (CU04) ----------------------------

  obtenerMiSuscripcion(): Observable<Suscripcion> {
    return this.http.get<Suscripcion>(`${this.API_URL}/mi-suscripcion`);
  }

  obtenerFuncionalidadesPlan(): Observable<FuncionalidadPlan> {
    return this.http.get<FuncionalidadPlan>(`${this.API_URL}/mi-plan/funcionalidades`);
  }

  obtenerAsistenteConfiguracion(): Observable<AsistenteConfiguracion> {
    return this.http.get<AsistenteConfiguracion>(`${this.API_URL}/configuracion/asistente`);
  }

  obtenerConfiguracionTenant(): Observable<ConfiguracionTenantResponse> {
    return this.http.get<ConfiguracionTenantResponse>(`${this.API_URL}/configuracion`);
  }

  guardarDatosEmpresa(datos: DatosEmpresaUpdateDto): Observable<Tenant> {
    return this.http.put<Tenant>(`${this.API_URL}/configuracion/empresa`, datos);
  }

  crearSucursalConfiguracion(datos: SucursalConfigCreateDto): Observable<SucursalConfigResponse> {
    return this.http.post<SucursalConfigResponse>(`${this.API_URL}/configuracion/sucursales`, datos);
  }

  crearUsuarioConfiguracion(datos: UsuarioConfigCreateDto): Observable<UsuarioConfigResponse> {
    return this.http.post<UsuarioConfigResponse>(`${this.API_URL}/configuracion/usuarios`, datos);
  }

  guardarConfiguracionOffline(datos: ConfiguracionOfflineUpdateDto) {
    return this.http.put(`${this.API_URL}/configuracion/offline`, datos);
  }

  finalizarConfiguracion(): Observable<Tenant> {
    return this.http.post<Tenant>(`${this.API_URL}/configuracion/finalizar`, {});
  }
}
