import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export type RecursoLimitado = 'sucursales' | 'usuarios' | 'productos';

/**
 * [EXAMEN-2] CU04 / RN-002: aviso de límite alcanzado con sugerencia de mejora.
 */
@Component({
  selector: 'app-plan-limit-alert',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (alcanzado) {
      <div class="plan-limit-alert" role="alert">
        <div class="limit-icon"><i class="ri-lock-2-line"></i></div>
        <div class="limit-content">
          <strong>Alcanzaste el límite de tu plan</strong>
          <p>{{ texto }}</p>
          <div class="progress-track" [attr.aria-label]="'Uso de ' + recurso">
            <div class="progress-fill is-limit" [style.width.%]="porcentaje"></div>
          </div>
        </div>
        <a routerLink="/admin/mi-suscripcion" class="btn btn-accent btn-sm">
          <i class="ri-arrow-up-circle-line"></i> Mejorar plan
        </a>
      </div>
    }
  `,
  styles: [`
    .plan-limit-alert {
      display: flex;
      align-items: flex-start;
      gap: 0.9rem;
      background: var(--locked-bg);
      border: 1px solid rgba(100, 116, 139, 0.35);
      border-radius: var(--radius-lg);
      padding: 1rem;
      flex-wrap: wrap;
    }
    .limit-icon {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      color: var(--locked);
      font-size: 1.15rem;
      flex-shrink: 0;
    }
    .limit-content { flex: 1; min-width: 200px; }
    .limit-content strong { color: var(--primary); font-size: 0.9rem; }
    .limit-content p { color: var(--text-muted); font-size: 0.8rem; margin: 0.2rem 0 0.6rem; }
    .progress-fill.is-limit { background: var(--critical); }
  `]
})
export class PlanLimitAlertComponent {
  @Input({ required: true }) recurso: RecursoLimitado = 'sucursales';
  @Input() usado = 0;
  @Input() limite: number | null = null;
  @Input() mensaje?: string;

  public get alcanzado(): boolean {
    return this.limite !== null && this.usado >= this.limite;
  }

  public get porcentaje(): number {
    if (!this.limite || this.limite <= 0) return 100;
    return Math.min(100, Math.round((this.usado / this.limite) * 100));
  }

  public get texto(): string {
    if (this.mensaje) return this.mensaje;
    const etiqueta = this.recurso.charAt(0).toUpperCase() + this.recurso.slice(1);
    return `${etiqueta}: ${this.usado} de ${this.limite ?? 0} permitidos. Sube a un plan superior para continuar.`;
  }
}
