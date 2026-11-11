import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SaasApiService } from '../../../../core/services/saas-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Plan, Suscripcion, SuscripcionCreateDto, Tenant } from '../../../../core/models/saas.model';
import { SectionTitleComponent } from '../../../../shared/components/section-title/section-title.component';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';

/**
 * [EXAMEN-2] CU03: panel de suscripciones.
 * Lista las suscripciones vigentes y permite asignar, cambiar de plan,
 * renovar, suspender, reactivar, cancelar y pasar al checkout.
 * La ruta `/plataforma/suscripciones/nueva` reutiliza este componente en modo alta.
 */
@Component({
  selector: 'app-suscripcion-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SectionTitleComponent, StatusBadgePipe, CurrencyFormatPipe],
  template: `
    <div class="page">
      <app-section-title
        [titulo]="esNueva ? 'Asignar plan' : 'Suscripciones'"
        [subtitulo]="esNueva ? 'Crea la suscripción de una empresa existente.' : 'Vigencia, estado y acciones de cada suscripción.'"
        icono="ri-calendar-check-line">
        <a acciones [routerLink]="esNueva ? '/plataforma/suscripciones' : '/plataforma/empresas'"
           class="btn btn-outline btn-sm">
          <i class="ri-arrow-left-line"></i> {{ esNueva ? 'Volver' : 'Empresas' }}
        </a>
        @if (!esNueva) {
          <a acciones routerLink="/plataforma/suscripciones/nueva" class="btn btn-accent btn-sm">
            <i class="ri-add-line"></i> Nueva suscripción
          </a>
        }
      </app-section-title>

      @if (esNueva) {
        <form class="card bloque formulario" (ngSubmit)="asignar()" #formulario="ngForm" novalidate>
          <h2 class="bloque-titulo"><i class="ri-add-circle-line"></i> Datos de la suscripción</h2>

          <div class="grid">
            <div class="campo campo-full">
              <label for="tenant_id">Empresa *</label>
              <select id="tenant_id" name="tenant_id" [(ngModel)]="nueva.tenant_id" required>
                <option [ngValue]="null">Selecciona una empresa</option>
                @for (tenant of tenants(); track tenant.id) {
                  <option [ngValue]="tenant.id">{{ tenant.razon_social }} · NIT {{ tenant.nit }}</option>
                }
              </select>
            </div>

            <div class="campo campo-full">
              <label for="plan_id">Plan *</label>
              <select id="plan_id" name="plan_id" [(ngModel)]="nueva.plan_id" required>
                <option [ngValue]="null">Selecciona un plan</option>
                @for (plan of planes(); track plan.id) {
                  <option [ngValue]="plan.id">{{ plan.nombre }} · {{ plan.precio_mensual | currencyFormat:'Bs.' }}/mes</option>
                }
              </select>
            </div>

            <div class="campo">
              <label for="fecha_inicio">Fecha de inicio</label>
              <input id="fecha_inicio" name="fecha_inicio" type="date" [(ngModel)]="nueva.fecha_inicio" />
            </div>

            <div class="campo">
              <label for="fecha_vencimiento">Fecha de vencimiento</label>
              <input id="fecha_vencimiento" name="fecha_vencimiento" type="date" [(ngModel)]="nueva.fecha_vencimiento" />
            </div>

            <div class="campo campo-full">
              <label class="check-inline">
                <input type="checkbox" name="renovacion_automatica" [(ngModel)]="nueva.renovacion_automatica" />
                Renovación automática
              </label>
            </div>
          </div>

          @if (error()) {
            <div class="error-box" role="alert"><i class="ri-error-warning-line"></i> {{ error() }}</div>
          }

          <div class="acciones">
            <a routerLink="/plataforma/suscripciones" class="btn btn-outline">Cancelar</a>
            <button type="submit" class="btn btn-accent" [disabled]="guardando() || formulario.invalid">
              <i class="ri-save-3-line"></i> {{ guardando() ? 'Asignando…' : 'Asignar plan' }}
            </button>
          </div>
        </form>
      } @else {
        <div class="resumen-linea">
          <div class="mini-card card">
            <span class="mini-label">Activas</span>
            <strong>{{ contar('ACTIVA') }}</strong>
          </div>
          <div class="mini-card card">
            <span class="mini-label">Por vencer (7 días)</span>
            <strong class="gold">{{ porVencer().length }}</strong>
          </div>
          <div class="mini-card card">
            <span class="mini-label">Suspendidas / vencidas</span>
            <strong class="danger">{{ contar('SUSPENDIDA') + contar('VENCIDA') }}</strong>
          </div>
          <div class="mini-card card">
            <span class="mini-label">Total</span>
            <strong>{{ suscripciones().length }}</strong>
          </div>
        </div>

        @if (cargando()) {
          <div class="loading-box card"><i class="ri-loader-4-line spin"></i> Cargando suscripciones…</div>
        } @else if (suscripciones().length === 0) {
          <div class="empty-box card">
            <i class="ri-calendar-close-line"></i>
            <h3>No hay suscripciones</h3>
            <p>Asigna un plan a una empresa para comenzar.</p>
            <a routerLink="/plataforma/suscripciones/nueva" class="btn btn-accent">Asignar plan</a>
          </div>
        } @else {
          <div class="tabla-wrapper card">
            <table>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Plan</th>
                  <th>Vigencia</th>
                  <th>Estado</th>
                  <th>Pago</th>
                  <th class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (s of suscripciones(); track s.id) {
                  <tr>
                    <td>
                      <a class="empresa" [routerLink]="['/plataforma/empresas', s.tenant_id]">
                        {{ nombreTenant(s.tenant_id) }}
                      </a>
                    </td>
                    <td>
                      <div class="cambio-plan">
                        <select [(ngModel)]="planPorSuscripcion[s.id]" [name]="'plan-' + s.id" aria-label="Cambiar plan">
                          <option [ngValue]="null">{{ s.plan?.nombre || 'Sin plan' }}</option>
                          @for (plan of planes(); track plan.id) {
                            @if (plan.id !== s.plan_id) {
                              <option [ngValue]="plan.id">{{ plan.nombre }}</option>
                            }
                          }
                        </select>
                        <button type="button" class="btn btn-sm btn-outline" [disabled]="!planPorSuscripcion[s.id]"
                                (click)="cambiarPlan(s)">
                          <i class="ri-arrow-up-down-line"></i>
                        </button>
                      </div>
                      <span class="precio">
                        {{ precioVisible(s) | currencyFormat:'Bs.' }}/mes
                        @if (planSeleccionado(s); as seleccionado) {
                          @if (seleccionado.id !== s.plan_id) {
                            <em class="preview">· nuevo plan</em>
                          }
                        }
                      </span>
                    </td>
                    <td>
                      <span class="fecha">{{ s.fecha_inicio | date: 'dd/MM/yyyy' }}</span>
                      <span class="fecha" [class.vencida]="vencida(s.fecha_vencimiento)">
                        → {{ s.fecha_vencimiento | date: 'dd/MM/yyyy' }}
                      </span>
                      @if (diasRestantes(s.fecha_vencimiento) !== null) {
                        <span class="dias" [class.vencida]="vencida(s.fecha_vencimiento)">
                          {{ textoDias(s.fecha_vencimiento) }}
                        </span>
                      }
                    </td>
                    <td>
                      <span class="badge" [ngClass]="(s.estado | statusBadge).class">{{ (s.estado | statusBadge).label }}</span>
                    </td>
                    <td>
                      <span class="badge" [ngClass]="(s.estado_pago | statusBadge).class">{{ (s.estado_pago | statusBadge).label }}</span>
                    </td>
                    <td class="text-right">
                      <div class="acciones-fila">
                        <a class="btn btn-sm btn-accent" [routerLink]="['/plataforma/suscripciones', s.id, 'checkout']">
                          <i class="ri-bank-card-line"></i> Pagar
                        </a>
                        <button type="button" class="btn btn-sm btn-outline" (click)="renovar(s)" title="Renovar">
                          <i class="ri-refresh-line"></i>
                        </button>
                        @if (s.estado === 'ACTIVA') {
                          <button type="button" class="btn btn-sm btn-outline" (click)="suspender(s)" title="Suspender">
                            <i class="ri-pause-circle-line"></i>
                          </button>
                        }
                        @if (s.estado === 'SUSPENDIDA' || s.estado === 'VENCIDA') {
                          <button type="button" class="btn btn-sm btn-outline" (click)="reactivar(s)" title="Reactivar">
                            <i class="ri-play-circle-line"></i>
                          </button>
                        }
                        @if (s.estado !== 'CANCELADA') {
                          <button type="button" class="btn btn-sm btn-outline danger" (click)="cancelar(s)" title="Cancelar">
                            <i class="ri-close-circle-line"></i>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1rem; }

    .resumen-linea { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; }
    .mini-card { padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.15rem; }
    .mini-label { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; }
    .mini-card strong { font-size: 1.5rem; font-weight: 800; color: var(--primary); }
    .mini-card strong.gold { color: var(--gold); }
    .mini-card strong.danger { color: var(--critical); }

    .tabla-wrapper { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 950px; }
    th { text-align: left; font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); padding: 0.7rem 1rem; background: var(--bg-main); border-bottom: 1px solid var(--border-color); }
    td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-light); font-size: 0.8rem; vertical-align: middle; }
    tbody tr:hover { background: var(--bg-main); }
    .text-right { text-align: right; }

    .empresa { font-weight: 700; color: var(--primary); text-decoration: none; &:hover { color: var(--accent); } }
    .cambio-plan { display: flex; gap: 0.3rem; align-items: center; }
    .cambio-plan select {
      border: 1px solid var(--border-color); border-radius: var(--radius-sm);
      padding: 0.3rem 0.4rem; font-size: 0.75rem; font-family: inherit; color: var(--primary); background: white;
      max-width: 150px;
    }
    .precio { display: block; margin-top: 0.15rem; font-size: 0.66rem; color: var(--text-muted);
      .preview { color: var(--accent); font-style: normal; font-weight: 700; }
    }

    .fecha { display: block; font-size: 0.76rem; color: var(--primary); font-weight: 600; &.vencida { color: var(--critical); } }
    .dias { display: block; margin-top: 0.1rem; font-size: 0.66rem; color: var(--success); &.vencida { color: var(--critical); } }

    .acciones-fila { display: inline-flex; gap: 0.3rem; flex-wrap: wrap; justify-content: flex-end; }
    .danger { color: var(--critical); border-color: rgba(220, 38, 38, 0.4); }

    .formulario { display: flex; flex-direction: column; gap: 1rem; padding: 1.35rem 1.5rem; }
    .bloque-titulo { display: flex; align-items: center; gap: 0.45rem; margin: 0; font-size: 1rem; font-weight: 800; color: var(--primary); }
    .bloque-titulo i { color: var(--accent); }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.85rem 1rem; }
    .campo-full { grid-column: 1 / -1; }
    .campo { display: flex; flex-direction: column; gap: 0.28rem; }
    .campo label { font-size: 0.74rem; font-weight: 700; color: var(--primary); }
    .campo input, .campo select {
      border: 1px solid var(--border-color); border-radius: var(--radius-md);
      padding: 0.55rem 0.7rem; font-size: 0.84rem; font-family: inherit; color: var(--primary); background: white;
      &:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    }
    .check-inline { display: inline-flex; align-items: center; gap: 0.45rem; font-size: 0.82rem; color: var(--primary); font-weight: 600; }
    .check-inline input { accent-color: var(--accent); }

    .error-box { display: flex; align-items: center; gap: 0.5rem; background: var(--error-bg); color: var(--error); border-radius: var(--radius-md); padding: 0.75rem 1rem; font-size: 0.82rem; }
    .acciones { display: flex; justify-content: flex-end; gap: 0.6rem; }

    .loading-box, .empty-box {
      display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
      padding: 3rem 1.5rem; text-align: center;
      i { font-size: 2.5rem; color: var(--text-muted); }
      h3 { margin: 0; font-size: 1rem; color: var(--primary); }
      p { margin: 0 0 0.75rem; font-size: 0.82rem; color: var(--text-muted); }
    }
    .loading-box { flex-direction: row; justify-content: center; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
  `]
})
export class SuscripcionPanelComponent implements OnInit {
  private saasApi = inject(SaasApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  public esNueva = false;
  public cargando = signal(true);
  public guardando = signal(false);
  public error = signal<string | null>(null);

  public suscripciones = signal<Suscripcion[]>([]);
  public planes = signal<Plan[]>([]);
  public tenants = signal<Tenant[]>([]);
  public planPorSuscripcion: Record<number, number | null> = {};

  public nueva: SuscripcionCreateDto = {
    tenant_id: 0,
    plan_id: 0,
    fecha_inicio: undefined,
    fecha_vencimiento: undefined,
    renovacion_automatica: true
  };

  ngOnInit(): void {
    this.esNueva = this.route.snapshot.url.some((segmento) => segmento.path === 'nueva');
    this.cargarCatalogos();
    if (this.esNueva) {
      this.precargar();
    } else {
      this.cargarSuscripciones();
    }
  }

  public contar(estado: string): number {
    return this.suscripciones().filter((s) => s.estado === estado).length;
  }

  public porVencer(): Suscripcion[] {
    return this.suscripciones().filter((s) => {
      const dias = this.diasRestantes(s.fecha_vencimiento);
      return dias !== null && dias >= 0 && dias <= 7;
    });
  }

  public diasRestantes(fecha: string): number | null {
    if (!fecha) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vence = new Date(`${fecha}T00:00:00`);
    if (Number.isNaN(vence.getTime())) return null;
    return Math.ceil((vence.getTime() - hoy.getTime()) / 86_400_000);
  }

  public vencida(fecha: string): boolean {
    const dias = this.diasRestantes(fecha);
    return dias !== null && dias < 0;
  }

  public textoDias(fecha: string): string {
    const dias = this.diasRestantes(fecha);
    if (dias === null) return '';
    if (dias >= 0) return `${dias} días`;
    return `vencida hace ${Math.abs(dias)} días`;
  }

  public nombreTenant(id: number): string {
    return this.tenants().find((t) => t.id === id)?.razon_social ?? `Empresa #${id}`;
  }

  /**
   * [EXAMEN-2] CU03: plan visible en la fila = el plan elegido en el select
   * (vista previa) o el plan actual si aún no se eligió ninguno.
   */
  public planSeleccionado(s: Suscripcion): Plan | undefined {
    const seleccion = this.planPorSuscripcion[s.id];
    if (seleccion) return this.planes().find((p) => p.id === seleccion);
    return s.plan ?? undefined;
  }

  public precioVisible(s: Suscripcion): number {
    return this.planSeleccionado(s)?.precio_mensual ?? s.plan?.precio_mensual ?? 0;
  }

  public asignar(): void {
    this.error.set(null);
    if (!this.nueva.tenant_id || !this.nueva.plan_id) {
      this.error.set('Selecciona la empresa y el plan.');
      return;
    }

    const datos: SuscripcionCreateDto = {
      ...this.nueva,
      fecha_inicio: this.nueva.fecha_inicio || undefined,
      fecha_vencimiento: this.nueva.fecha_vencimiento || undefined
    };

    this.guardando.set(true);
    this.saasApi.asignarSuscripcion(datos).subscribe({
      next: (suscripcion) => {
        this.guardando.set(false);
        this.toast.success('Suscripción asignada.');
        this.router.navigate(['/plataforma/suscripciones', suscripcion.id, 'checkout']);
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(this.mensajeError(err, 'No se pudo asignar la suscripción.'));
      }
    });
  }

  public cambiarPlan(suscripcion: Suscripcion): void {
    const planId = this.planPorSuscripcion[suscripcion.id];
    if (!planId) return;

    this.saasApi.cambiarPlan(suscripcion.id, planId).subscribe({
      next: (actualizada) => {
        this.planPorSuscripcion[suscripcion.id] = null;
        // Si la respuesta llega sin el objeto `plan` cargado, se rellena con
        // el catálogo local para que nombre y precio se actualicen al instante.
        const planNuevo = actualizada.plan ?? this.planes().find((p) => p.id === actualizada.plan_id);
        const corregida: Suscripcion = planNuevo ? { ...actualizada, plan: planNuevo } : actualizada;
        this.suscripciones.update((lista) => lista.map((s) => s.id === corregida.id ? corregida : s));
        this.toast.success(`Plan cambiado a ${planNuevo?.nombre ?? 'el plan seleccionado'}.`);
      },
      error: (err) => this.toast.error(this.mensajeError(err, 'No se pudo cambiar el plan. Verifica el uso actual del tenant.'))
    });
  }

  public renovar(suscripcion: Suscripcion): void {
    this.saasApi.renovarSuscripcion(suscripcion.id).subscribe({
      next: (actualizada) => {
        this.suscripciones.update((lista) => lista.map((s) => s.id === actualizada.id ? actualizada : s));
        this.toast.success('Suscripción renovada.');
      },
      error: () => this.toast.error('No se pudo renovar la suscripción.')
    });
  }

  public suspender(suscripcion: Suscripcion): void {
    this.saasApi.suspenderSuscripcion(suscripcion.id, 'Suspensión manual desde plataforma').subscribe({
      next: () => {
        this.toast.warning('Suscripción suspendida.');
        this.cargarSuscripciones();
      },
      error: () => this.toast.error('No se pudo suspender la suscripción.')
    });
  }

  public reactivar(suscripcion: Suscripcion): void {
    this.saasApi.reactivarSuscripcion(suscripcion.id).subscribe({
      next: () => {
        this.toast.success('Suscripción reactivada.');
        this.cargarSuscripciones();
      },
      error: () => this.toast.error('No se pudo reactivar la suscripción.')
    });
  }

  public cancelar(suscripcion: Suscripcion): void {
    if (!confirm('¿Cancelar esta suscripción? Las rutas de negocio del tenant quedarán bloqueadas.')) return;
    this.saasApi.cancelarSuscripcion(suscripcion.id, 'Cancelación desde plataforma').subscribe({
      next: () => {
        this.toast.warning('Suscripción cancelada.');
        this.cargarSuscripciones();
      },
      error: () => this.toast.error('No se pudo cancelar la suscripción.')
    });
  }

  private cargarSuscripciones(): void {
    this.cargando.set(true);
    this.saasApi.listarSuscripciones().subscribe({
      next: (suscripciones) => {
        this.suscripciones.set(suscripciones);
        // [EXAMEN-2] Inicializa el select "Cambiar plan" en su opción
        // placeholder (el nombre del plan actual). Si queda `undefined`, el
        // ngModel no matchea ninguna opción y el select se muestra vacío.
        suscripciones.forEach((s) => {
          if (this.planPorSuscripcion[s.id] === undefined) this.planPorSuscripcion[s.id] = null;
        });
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudieron cargar las suscripciones.');
      }
    });
  }

  private cargarCatalogos(): void {
    this.saasApi.listarPlanes().subscribe({
      next: (planes) => this.planes.set(planes.filter((p) => p.estado === 'ACTIVO')),
      error: () => this.toast.warning('No se pudieron cargar los planes.')
    });
    this.saasApi.listarTenants({ limit: 200 }).subscribe({
      next: ({ items }) => this.tenants.set(items),
      error: () => this.toast.warning('No se pudieron cargar las empresas.')
    });
  }

  private precargar(): void {
    const plan = Number(this.route.snapshot.queryParamMap.get('plan'));
    if (plan) this.nueva.plan_id = plan;
    const tenant = Number(this.route.snapshot.queryParamMap.get('tenant'));
    if (tenant) this.nueva.tenant_id = tenant;
  }

  private mensajeError(err: any, porDefecto: string): string {
    const detalle = err?.error?.detail ?? err?.error?.message;
    if (typeof detalle === 'string') return detalle;
    if (Array.isArray(detalle) && detalle.length) return String(detalle[0]?.msg ?? porDefecto);
    return porDefecto;
  }
}
