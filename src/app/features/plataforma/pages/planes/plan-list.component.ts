import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SaasApiService } from '../../../../core/services/saas-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Plan } from '../../../../core/models/saas.model';
import { SectionTitleComponent } from '../../../../shared/components/section-title/section-title.component';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';

/**
 * [EXAMEN-2] CU02: catálogo de planes.
 * Presenta tarjetas comparativas y enlaza al alta/edición con aviso de impacto.
 */
@Component({
  selector: 'app-plan-list',
  standalone: true,
  imports: [CommonModule, RouterLink, SectionTitleComponent, StatusBadgePipe, CurrencyFormatPipe],
  template: `
    <div class="page">
      <app-section-title
        titulo="Planes"
        subtitulo="Básico, Profesional y Empresarial comparados por límites y funcionalidades."
        icono="ri-vip-crown-2-line">
        <a acciones routerLink="/plataforma/planes/nuevo" class="btn btn-accent">
          <i class="ri-add-line"></i> Nuevo plan
        </a>
      </app-section-title>

      @if (cargando()) {
        <div class="loading-box card"><i class="ri-loader-4-line spin"></i> Cargando planes…</div>
      } @else if (planes().length === 0) {
        <div class="empty-box card">
          <i class="ri-vip-crown-line"></i>
          <h3>Todavía no hay planes</h3>
          <p>Crea el plan Básico para empezar a asignar suscripciones.</p>
          <a routerLink="/plataforma/planes/nuevo" class="btn btn-accent">Crear plan</a>
        </div>
      } @else {
        <div class="planes-grid">
          @for (plan of ordenados(); track plan.id) {
            <article class="plan-card card" [class.destacado]="esDestacado(plan)">
              @if (esDestacado(plan)) {
                <span class="cinta"><i class="ri-star-smile-line"></i> Recomendado</span>
              }
              <header class="plan-cabecera">
                <h2>{{ plan.nombre }}</h2>
                <span class="badge" [ngClass]="(plan.estado | statusBadge).class">{{ (plan.estado | statusBadge).label }}</span>
              </header>
              @if (plan.descripcion) {
                <p class="plan-desc">{{ plan.descripcion }}</p>
              }

              <div class="plan-precio">
                <strong>{{ plan.precio_mensual | currencyFormat:'Bs.' }}</strong>
                <span>/ mes</span>
              </div>

              <ul class="plan-atributos">
                <li>
                  <i class="ri-store-3-line"></i>
                  <span><strong>{{ plan.max_sucursales }}</strong> sucursales</span>
                </li>
                <li>
                  <i class="ri-user-settings-line"></i>
                  <span><strong>{{ plan.max_usuarios ?? '∞' }}</strong> usuarios</span>
                </li>
                <li>
                  <i class="ri-t-shirt-2-line"></i>
                  <span><strong>{{ plan.max_productos ?? '∞' }}</strong> productos</span>
                </li>
                <li>
                  <i class="ri-robot-2-line"></i>
                  <span>Reportes IA: <strong>{{ plan.permite_reportes_ia ? 'Sí' : 'No' }}</strong></span>
                </li>
                <li>
                  <i class="ri-bank-card-line"></i>
                  <span>Pago diferido: <strong>{{ plan.permite_pago_diferido ? 'Sí' : 'No' }}</strong></span>
                </li>
                <li>
                  <i class="ri-database-2-line"></i>
                  <span>Respaldos: <strong>{{ plan.backup_automatico ? 'Automático' : 'Manual' }}</strong></span>
                </li>
                <li>
                  <i class="ri-customer-service-2-line"></i>
                  <span>Soporte prioritario: <strong>{{ plan.soporte_prioritario ? 'Sí' : 'No' }}</strong></span>
                </li>
              </ul>

              <footer class="plan-acciones">
                <a class="btn btn-outline btn-sm" [routerLink]="['/plataforma/planes', plan.id]">
                  <i class="ri-edit-line"></i> Editar
                </a>
                <a class="btn btn-primary btn-sm" [routerLink]="['/plataforma/suscripciones/nueva']"
                   [queryParams]="{ plan: plan.id }">
                  <i class="ri-add-circle-line"></i> Asignar
                </a>
              </footer>
            </article>
          }
        </div>

        <p class="nota-pie">
          <i class="ri-information-line"></i>
          Al reducir un límite, el formulario de edición muestra los tenants afectados antes de guardar.
        </p>
      }
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1rem; }

    .planes-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(275px, 1fr)); gap: 1rem; }

    .plan-card {
      position: relative;
      display: flex; flex-direction: column; gap: 0.9rem;
      padding: 1.35rem 1.35rem 1.15rem;
      border: 1px solid var(--border-color);
      &.destacado { border-color: var(--accent); box-shadow: 0 10px 30px rgba(225, 29, 72, 0.12); }
    }

    .cinta {
      position: absolute; top: -0.7rem; left: 1.2rem;
      display: inline-flex; align-items: center; gap: 0.25rem;
      background: var(--accent); color: white;
      font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;
      padding: 0.2rem 0.55rem; border-radius: var(--radius-full);
    }

    .plan-cabecera { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
    .plan-cabecera h2 { margin: 0; font-size: 1.1rem; font-weight: 800; color: var(--primary); }
    .plan-desc { margin: -0.4rem 0 0; font-size: 0.75rem; color: var(--text-muted); }

    .plan-precio { display: flex; align-items: baseline; gap: 0.3rem; }
    .plan-precio strong { font-size: 1.6rem; font-weight: 800; color: var(--primary); }
    .plan-precio span { font-size: 0.78rem; color: var(--text-muted); }

    .plan-atributos { list-style: none; margin: 0; padding: 0.9rem 0 0; border-top: 1px solid var(--border-light); display: flex; flex-direction: column; gap: 0.55rem; }
    .plan-atributos li { display: flex; align-items: center; gap: 0.45rem; font-size: 0.8rem; color: var(--text-muted); }
    .plan-atributos i { color: var(--accent); font-size: 0.95rem; }
    .plan-atributos strong { color: var(--primary); }

    .plan-acciones { display: flex; gap: 0.5rem; margin-top: auto; padding-top: 0.9rem; }
    .plan-acciones .btn { flex: 1; justify-content: center; }

    .nota-pie { display: flex; align-items: center; gap: 0.4rem; font-size: 0.72rem; color: var(--text-muted); margin: 0; }

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
  `]
})
export class PlanListComponent implements OnInit {
  private saasApi = inject(SaasApiService);
  private toast = inject(ToastService);

  public planes = signal<Plan[]>([]);
  public cargando = signal(true);

  public ordenados = computed(() =>
    [...this.planes()].sort((a, b) => a.orden - b.orden || a.precio_mensual - b.precio_mensual)
  );

  ngOnInit(): void {
    this.saasApi.listarPlanes().subscribe({
      next: (planes) => {
        this.planes.set(this.ordenar(planes));
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudieron cargar los planes.');
      }
    });
  }

  public esDestacado(plan: Plan): boolean {
    const activos = this.planes().filter((p) => p.estado === 'ACTIVO');
    const intermedio = activos[Math.min(1, activos.length - 1)];
    return intermedio?.id === plan.id && activos.length > 1;
  }

  private ordenar(planes: Plan[]): Plan[] {
    return [...planes].sort((a, b) => a.orden - b.orden || a.precio_mensual - b.precio_mensual);
  }
}
