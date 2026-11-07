import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PlanFeatureService, FuncionalidadPlanNombre } from '../../../core/services/plan-feature.service';

/**
 * [EXAMEN-2] RN-003 / CU10, CU12: bloqueo de funcionalidades fuera del plan.
 * Si el plan la incluye, proyecta el contenido; si no, muestra el motivo y la
 * acción de mejora con el texto del enunciado.
 */
@Component({
  selector: 'app-plan-feature-lock',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (permitido) {
      <ng-content></ng-content>
    } @else {
      <div class="plan-feature-lock" role="alert">
        <div class="lock-icon"><i class="ri-lock-2-fill"></i></div>
        <h3>{{ titulo || 'Función no incluida en tu plan' }}</h3>
        <p>{{ mensaje }}</p>
        <div class="lock-actions">
          <a routerLink="/admin/mi-suscripcion" class="btn btn-accent">
            <i class="ri-arrow-up-circle-line"></i> Ver planes y mejorar
          </a>
        </div>
      </div>
    }
  `,
  styles: [`
    .plan-feature-lock {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.5rem;
      padding: 2.5rem 1.5rem;
      background: var(--locked-bg);
      border: 1px dashed rgba(100, 116, 139, 0.45);
      border-radius: var(--radius-lg);
    }
    .lock-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      color: var(--locked);
      font-size: 1.6rem;
      margin-bottom: 0.4rem;
    }
    h3 { font-size: 1.05rem; color: var(--primary); }
    p { color: var(--text-muted); font-size: 0.85rem; max-width: 540px; }
    .lock-actions { margin-top: 0.75rem; }
  `]
})
export class PlanFeatureLockComponent {
  private planFeature = inject(PlanFeatureService);

  @Input({ required: true }) funcionalidad: FuncionalidadPlanNombre = 'reportes_ia';
  @Input() titulo?: string;

  public get permitido(): boolean {
    switch (this.funcionalidad) {
      case 'reportes_ia': return this.planFeature.puedeReportesIA();
      case 'pago_diferido': return this.planFeature.puedePagoDiferido();
      case 'carrito_offline': return this.planFeature.puedeCarritoOffline();
      case 'respaldos': return this.planFeature.puedeRespaldos();
      case 'restauracion': return this.planFeature.puedeRestaurar();
      default: return false;
    }
  }

  public get mensaje(): string {
    return this.planFeature.mensajeBloqueo(this.funcionalidad);
  }
}
