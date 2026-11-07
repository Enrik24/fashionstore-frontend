import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SaasApiService } from '../../../../core/services/saas-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ImpactoPlan, PlanCreateDto, PlanConUso, PlanUpdateDto } from '../../../../core/models/saas.model';
import { SectionTitleComponent } from '../../../../shared/components/section-title/section-title.component';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';

/**
 * [EXAMEN-2] CU02: alta y edición de un plan.
 * Al reducir un límite muestra el aviso de impacto con los tenants afectados
 * antes de confirmar la actualización.
 */
@Component({
  selector: 'app-plan-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SectionTitleComponent, CurrencyFormatPipe],
  template: `
    <div class="page">
      <app-section-title
        [titulo]="esEdicion ? 'Editar plan' : 'Nuevo plan'"
        [subtitulo]="esEdicion ? 'Modifica límites, funcionalidades y política de respaldos.' : 'Define los límites y funcionalidades del plan.'"
        icono="ri-vip-crown-2-line">
        <a acciones routerLink="/plataforma/planes" class="btn btn-outline">
          <i class="ri-arrow-left-line"></i> Volver
        </a>
      </app-section-title>

      @if (cargando()) {
        <div class="loading-box card"><i class="ri-loader-4-line spin"></i> Cargando plan…</div>
      } @else {
        <form class="formulario" (ngSubmit)="guardar()" #formulario="ngForm" novalidate>
          <section class="card bloque">
            <h2 class="bloque-titulo"><i class="ri-information-line"></i> Datos generales</h2>
            <div class="grid">
              <div class="campo campo-full">
                <label for="nombre">Nombre *</label>
                <input id="nombre" name="nombre" [(ngModel)]="datos.nombre" required maxlength="80"
                       placeholder="Ej. Profesional" />
              </div>

              <div class="campo campo-full">
                <label for="descripcion">Descripción</label>
                <textarea id="descripcion" name="descripcion" rows="2" [(ngModel)]="datos.descripcion"
                          maxlength="250" placeholder="Para quién está pensado este plan"></textarea>
              </div>

              <div class="campo">
                <label for="precio">Precio mensual (Bs.) *</label>
                <input id="precio" name="precio" type="number" min="0" step="0.01"
                       [(ngModel)]="datos.precio_mensual" required />
              </div>

              <div class="campo">
                <label for="orden">Orden de presentación</label>
                <input id="orden" name="orden" type="number" min="0" [(ngModel)]="datos.orden" />
              </div>

              <div class="campo">
                <label for="estado">Estado</label>
                <select id="estado" name="estado" [(ngModel)]="datos.estado">
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </div>
            </div>
          </section>

          <section class="card bloque">
            <h2 class="bloque-titulo"><i class="ri-bar-chart-box-line"></i> Límites</h2>
            <p class="bloque-desc">Un límite reducido puede dejar a un tenant por encima de su plan.</p>
            <div class="grid grid-3">
              <div class="campo">
                <label for="max_sucursales">Máximo de sucursales *</label>
                <input id="max_sucursales" name="max_sucursales" type="number" min="1"
                       [(ngModel)]="datos.max_sucursales" required (change)="marcarImpactoPendiente()" />
              </div>

              <div class="campo">
                <label for="max_usuarios">Máximo de usuarios</label>
                <input id="max_usuarios" name="max_usuarios" type="number" min="1"
                       [(ngModel)]="datos.max_usuarios" placeholder="Vacío = ilimitado" (change)="marcarImpactoPendiente()" />
              </div>

              <div class="campo">
                <label for="max_productos">Máximo de productos</label>
                <input id="max_productos" name="max_productos" type="number" min="1"
                       [(ngModel)]="datos.max_productos" placeholder="Vacío = ilimitado" (change)="marcarImpactoPendiente()" />
              </div>
            </div>
          </section>

          <section class="card bloque">
            <h2 class="bloque-titulo"><i class="ri-function-line"></i> Funcionalidades</h2>
            <div class="checks">
              <label class="check">
                <input type="checkbox" name="reportes_ia" [(ngModel)]="datos.permite_reportes_ia" />
                <span><strong>Reportes IA</strong><small>Consultas generativas sobre ventas e inventario.</small></span>
              </label>
              <label class="check">
                <input type="checkbox" name="pago_diferido" [(ngModel)]="datos.permite_pago_diferido" />
                <span><strong>Pago diferido</strong><small>Carrito y checkout sin conexión con cobro posterior.</small></span>
              </label>
              <label class="check">
                <input type="checkbox" name="soporte_prioritario" [(ngModel)]="datos.soporte_prioritario" />
                <span><strong>Soporte prioritario</strong><small>Atención preferente del equipo de plataforma.</small></span>
              </label>
            </div>
          </section>

          <section class="card bloque">
            <h2 class="bloque-titulo"><i class="ri-database-2-line"></i> Respaldos</h2>
            <div class="checks">
              <label class="check">
                <input type="checkbox" name="backup_automatico" [(ngModel)]="datos.backup_automatico" />
                <span><strong>Respaldo automático</strong><small>Se ejecuta según la frecuencia configurada.</small></span>
              </label>
              <label class="check">
                <input type="checkbox" name="permite_restauracion" [(ngModel)]="datos.permite_restauracion" />
                <span><strong>Permite restauración</strong><small>El tenant puede solicitar restaurar un respaldo.</small></span>
              </label>
            </div>

            <div class="grid grid-3">
              <div class="campo">
                <label for="backup_frecuencia_horas">Frecuencia (horas)</label>
                <input id="backup_frecuencia_horas" name="backup_frecuencia_horas" type="number" min="1"
                       [(ngModel)]="datos.backup_frecuencia_horas" placeholder="Ej. 24" />
              </div>
              <div class="campo">
                <label for="backup_retencion_dias">Retención (días)</label>
                <input id="backup_retencion_dias" name="backup_retencion_dias" type="number" min="1"
                       [(ngModel)]="datos.backup_retencion_dias" />
              </div>
              <div class="campo">
                <label for="backup_manual_mensual">Respaldos manuales al mes</label>
                <input id="backup_manual_mensual" name="backup_manual_mensual" type="number" min="0"
                       [(ngModel)]="datos.backup_manual_mensual" placeholder="Vacío = ilimitado" />
              </div>
            </div>
          </section>

          @if (esEdicion) {
            <section class="card bloque impacto">
              <div class="impacto-cabecera">
                <div>
                  <h2 class="bloque-titulo"><i class="ri-alert-line"></i> Aviso de impacto</h2>
                  <p class="bloque-desc">
                    Calcula cuántos tenants quedarían por encima de los límites guardados.
                  </p>
                </div>
                <button type="button" class="btn btn-outline btn-sm" (click)="verImpacto()" [disabled]="consultandoImpacto()">
                  <i class="ri-refresh-line"></i>
                  {{ consultandoImpacto() ? 'Calculando…' : 'Ver impacto' }}
                </button>
              </div>

              @if (impacto(); as i) {
                <div class="impacto-resultado" [class.afectados]="i.total_afectados > 0">
                  <strong>{{ i.total_afectados }}</strong>
                  <span>{{ i.total_afectados === 1 ? 'tenant afectado' : 'tenants afectados' }} con {{ i.max_sucursales }} sucursales permitidas.</span>
                </div>
                @if (i.tenants_afectados.length) {
                  <ul class="afectados">
                    @for (tenant of i.tenants_afectados; track tenant.tenant_id) {
                      <li>
                        <a [routerLink]="['/plataforma/empresas', tenant.tenant_id]">{{ tenant.razon_social }}</a>
                        <span>{{ tenant.sucursales_actuales ?? 0 }} sucursales</span>
                      </li>
                    }
                  </ul>
                }
              } @else if (impactoPendiente()) {
                <p class="impacto-pendiente"><i class="ri-error-warning-line"></i> Cambiaste un límite: revisa el impacto antes de guardar.</p>
              }
            </section>
          }

          @if (error()) {
            <div class="error-box" role="alert"><i class="ri-error-warning-line"></i> {{ error() }}</div>
          }

          <div class="acciones">
            <a routerLink="/plataforma/planes" class="btn btn-outline">Cancelar</a>
            <button type="submit" class="btn btn-accent" [disabled]="guardando() || formulario.invalid">
              <i class="ri-save-3-line"></i>
              {{ guardando() ? 'Guardando…' : (esEdicion ? 'Guardar cambios' : 'Crear plan') }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1rem; max-width: 1000px; }
    .formulario { display: flex; flex-direction: column; gap: 1rem; }
    .bloque { padding: 1.35rem 1.5rem; }
    .bloque-titulo { display: flex; align-items: center; gap: 0.45rem; margin: 0 0 0.25rem; font-size: 1rem; font-weight: 800; color: var(--primary); }
    .bloque-titulo i { color: var(--accent); }
    .bloque-desc { margin: 0 0 0.9rem; font-size: 0.76rem; color: var(--text-muted); }

    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.9rem 1rem; margin-top: 0.75rem; }
    .grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .campo-full { grid-column: 1 / -1; }

    .campo { display: flex; flex-direction: column; gap: 0.28rem; }
    .campo label { font-size: 0.74rem; font-weight: 700; color: var(--primary); }
    .campo input, .campo select, .campo textarea {
      border: 1px solid var(--border-color); border-radius: var(--radius-md);
      padding: 0.55rem 0.7rem; font-size: 0.84rem; font-family: inherit;
      color: var(--primary); background: white;
      &:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    }
    .campo textarea { resize: vertical; }

    .checks { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.7rem; margin-top: 0.75rem; }
    .check {
      display: flex; gap: 0.55rem; align-items: flex-start;
      border: 1px solid var(--border-color); border-radius: var(--radius-md);
      padding: 0.7rem 0.8rem; cursor: pointer;
      &:has(input:checked) { border-color: var(--accent); background: rgba(225, 29, 72, 0.04); }
      input { margin-top: 0.15rem; accent-color: var(--accent); }
      span { display: flex; flex-direction: column; gap: 0.1rem; }
      strong { font-size: 0.8rem; color: var(--primary); }
      small { font-size: 0.68rem; color: var(--text-muted); }
    }

    .impacto-cabecera { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
    .impacto-resultado {
      display: flex; align-items: baseline; gap: 0.4rem;
      padding: 0.8rem 1rem; border-radius: var(--radius-md);
      background: var(--success-bg); color: var(--success);
      &.afectados { background: var(--error-bg); color: var(--critical); }
    }
    .impacto-resultado strong { font-size: 1.6rem; }
    .impacto-resultado span { font-size: 0.8rem; font-weight: 600; }

    .afectados { list-style: none; margin: 0.6rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
    .afectados li { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.78rem; border-bottom: 1px dashed var(--border-light); padding-bottom: 0.3rem; }
    .afectados a { color: var(--primary); font-weight: 700; text-decoration: none; &:hover { color: var(--accent); } }
    .afectados span { color: var(--text-muted); }

    .impacto-pendiente { display: flex; align-items: center; gap: 0.35rem; margin: 0.6rem 0 0; font-size: 0.76rem; color: var(--gold); }

    .error-box { display: flex; align-items: center; gap: 0.5rem; background: var(--error-bg); color: var(--error); border-radius: var(--radius-md); padding: 0.75rem 1rem; font-size: 0.82rem; }
    .acciones { display: flex; justify-content: flex-end; gap: 0.6rem; }

    .loading-box { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 3rem; color: var(--text-muted); }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .grid, .grid-3 { grid-template-columns: 1fr; }
      .acciones { flex-direction: column-reverse; }
      .acciones .btn { width: 100%; }
    }
  `]
})
export class PlanFormComponent implements OnInit {
  private saasApi = inject(SaasApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  public esEdicion = false;
  public planId = 0;
  public cargando = signal(false);
  public guardando = signal(false);
  public consultandoImpacto = signal(false);
  public impacto = signal<ImpactoPlan | null>(null);
  public impactoPendiente = signal(false);
  public error = signal<string | null>(null);

  public datos: PlanCreateDto = this.datosIniciales();

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.esEdicion = !!id;
    this.planId = Number(id);
    if (this.esEdicion) this.cargarPlan();
  }

  public marcarImpactoPendiente(): void {
    if (this.esEdicion) this.impactoPendiente.set(true);
  }

  public verImpacto(): void {
    if (!this.esEdicion) return;
    this.consultandoImpacto.set(true);
    this.impactoPendiente.set(false);
    this.saasApi.obtenerImpactoPlan(this.planId, this.cambios()).subscribe({
      next: (impacto) => {
        this.impacto.set(impacto);
        this.consultandoImpacto.set(false);
      },
      error: () => {
        this.consultandoImpacto.set(false);
        this.toast.warning('No se pudo calcular el impacto; revisa los límites manualmente.');
      }
    });
  }

  public guardar(): void {
    this.error.set(null);
    if (!this.datos.nombre?.trim() || this.datos.precio_mensual === null || this.datos.max_sucursales === null) {
      this.error.set('Completa el nombre, el precio y el máximo de sucursales.');
      return;
    }

    if (this.esEdicion && this.impactoPendiente() && !this.impacto()) {
      this.error.set('Revisa el aviso de impacto antes de guardar los límites reducidos.');
      return;
    }

    this.guardando.set(true);
    const peticion = this.esEdicion
      ? this.saasApi.actualizarPlan(this.planId, this.cambios())
      : this.saasApi.crearPlan(this.datos);

    peticion.subscribe({
      next: (plan) => {
        this.guardando.set(false);
        this.toast.success(this.esEdicion ? 'Plan actualizado.' : `Plan ${plan.nombre} creado.`);
        this.router.navigate(['/plataforma/planes']);
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(this.mensajeError(err));
      }
    });
  }

  private cargarPlan(): void {
    this.cargando.set(true);
    this.saasApi.obtenerPlan(this.planId).subscribe({
      next: (plan) => {
        this.datos = this.desdePlan(plan);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudo cargar el plan.');
      }
    });
  }

  private desdePlan(plan: PlanConUso): PlanCreateDto {
    return {
      nombre: plan.nombre,
      descripcion: plan.descripcion ?? '',
      precio_mensual: plan.precio_mensual,
      max_sucursales: plan.max_sucursales,
      permite_reportes_ia: plan.permite_reportes_ia,
      permite_pago_diferido: plan.permite_pago_diferido,
      estado: plan.estado,
      orden: plan.orden,
      soporte_prioritario: plan.soporte_prioritario,
      max_usuarios: plan.max_usuarios ?? null,
      max_productos: plan.max_productos ?? null,
      backup_automatico: plan.backup_automatico,
      backup_frecuencia_horas: plan.backup_frecuencia_horas ?? null,
      backup_retencion_dias: plan.backup_retencion_dias,
      backup_manual_mensual: plan.backup_manual_mensual ?? null,
      permite_restauracion: plan.permite_restauracion
    };
  }

  private cambios(): PlanUpdateDto {
    const { nombre, descripcion, precio_mensual, max_sucursales, permite_reportes_ia,
      permite_pago_diferido, estado, orden, soporte_prioritario, max_usuarios,
      max_productos, backup_automatico, backup_frecuencia_horas, backup_retencion_dias,
      backup_manual_mensual, permite_restauracion } = this.datos;
    return {
      nombre, descripcion, precio_mensual, max_sucursales, permite_reportes_ia,
      permite_pago_diferido, estado, orden, soporte_prioritario,
      max_usuarios: max_usuarios || null,
      max_productos: max_productos || null,
      backup_automatico, backup_frecuencia_horas: backup_frecuencia_horas || null,
      backup_retencion_dias, backup_manual_mensual: backup_manual_mensual ?? null,
      permite_restauracion
    };
  }

  private datosIniciales(): PlanCreateDto {
    return {
      nombre: '',
      descripcion: '',
      precio_mensual: 0,
      max_sucursales: 1,
      permite_reportes_ia: false,
      permite_pago_diferido: false,
      estado: 'ACTIVO',
      orden: 0,
      soporte_prioritario: false,
      max_usuarios: null,
      max_productos: null,
      backup_automatico: false,
      backup_frecuencia_horas: null,
      backup_retencion_dias: 30,
      backup_manual_mensual: 0,
      permite_restauracion: false
    };
  }

  private mensajeError(err: any): string {
    const detalle = err?.error?.detail ?? err?.error?.message;
    if (typeof detalle === 'string') return detalle;
    if (Array.isArray(detalle) && detalle.length) return String(detalle[0]?.msg ?? 'Revisa los datos.');
    return 'No se pudo guardar el plan.';
  }
}
