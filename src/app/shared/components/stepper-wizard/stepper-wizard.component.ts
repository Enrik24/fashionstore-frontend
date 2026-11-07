import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PasoWizard {
  /** Identificador estable del paso. */
  clave: string;
  /** Título corto que se muestra en la barra de progreso. */
  titulo: string;
  /** Descripción opcional bajo el título. */
  descripcion?: string;
  /** Icono de Remix Icon (opcional). */
  icono?: string;
}

/**
 * [EXAMEN-2] CU04: asistente por pasos reutilizable.
 * Muestra la barra de progreso, valida el avance y proyecta el contenido del
 * paso activo. El componente no conoce los formularios: solo orquesta.
 */
@Component({
  selector: 'app-stepper-wizard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="stepper-wizard">
      <header class="wizard-header">
        <div class="wizard-progress" role="progressbar"
             [attr.aria-valuenow]="pasoActual + 1"
             [attr.aria-valuemin]="1"
             [attr.aria-valuemax]="pasos.length">
          <div class="wizard-progress-fill" [style.width.%]="porcentaje()"></div>
        </div>

        <ol class="wizard-steps">
          @for (paso of pasos; track paso.clave; let i = $index) {
            <li class="wizard-step"
                [class.activo]="i === pasoActual"
                [class.completado]="i < pasoActual"
                [class.bloqueado]="i > pasoActual && !permiteSaltar">
              <button type="button"
                      class="wizard-step-btn"
                      [disabled]="i > pasoActual && !permiteSaltar"
                      (click)="irA(i)">
                <span class="wizard-step-num">
                  @if (i < pasoActual) {
                    <i class="ri-check-line"></i>
                  } @else if (paso.icono) {
                    <i [class]="paso.icono"></i>
                  } @else {
                    {{ i + 1 }}
                  }
                </span>
                <span class="wizard-step-text">
                  <span class="wizard-step-titulo">{{ paso.titulo }}</span>
                  @if (paso.descripcion) {
                    <span class="wizard-step-desc">{{ paso.descripcion }}</span>
                  }
                </span>
              </button>
            </li>
          }
        </ol>
      </header>

      <div class="wizard-body">
        <ng-content></ng-content>
      </div>

      @if (mostrarAcciones) {
        <footer class="wizard-actions">
          <button type="button" class="btn btn-outline" (click)="anterior()" [disabled]="pasoActual === 0 || cargando">
            <i class="ri-arrow-left-line"></i> Anterior
          </button>
          <span class="wizard-paso-label">Paso {{ pasoActual + 1 }} de {{ pasos.length }}</span>
          @if (pasoActual < pasos.length - 1) {
            <button type="button" class="btn btn-accent" (click)="siguiente()" [disabled]="!puedeAvanzar || cargando">
              {{ cargando ? 'Guardando…' : 'Siguiente' }}
              <i class="ri-arrow-right-line"></i>
            </button>
          } @else {
            <button type="button" class="btn btn-accent" (click)="finalizar()" [disabled]="!puedeAvanzar || cargando">
              {{ cargando ? 'Finalizando…' : (textoFinalizar || 'Finalizar') }}
              <i class="ri-check-double-line"></i>
            </button>
          }
        </footer>
      }
    </section>
  `,
  styles: [`
    .stepper-wizard {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .wizard-header {
      padding: 1.25rem 1.5rem 0.75rem;
      border-bottom: 1px solid var(--border-light);
    }

    .wizard-progress {
      height: 6px;
      border-radius: var(--radius-full);
      background: var(--border-light);
      overflow: hidden;
      margin-bottom: 1.1rem;
    }

    .wizard-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), var(--accent-light));
      transition: width var(--transition-normal);
    }

    .wizard-steps {
      display: flex;
      gap: 0.5rem;
      list-style: none;
      margin: 0;
      padding: 0;
      overflow-x: auto;
    }

    .wizard-step { flex: 1 1 0; min-width: 130px; }

    .wizard-step-btn {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      width: 100%;
      padding: 0.45rem;
      border: none;
      border-radius: var(--radius-md);
      background: transparent;
      text-align: left;
      color: var(--text-muted);
      cursor: pointer;
      transition: background var(--transition-fast);

      &:hover:not(:disabled) { background: var(--bg-main); }
      &:disabled { cursor: not-allowed; opacity: 0.55; }
    }

    .wizard-step-num {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
      background: var(--border-light);
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .wizard-step.activo .wizard-step-num {
      background: var(--accent);
      color: #fff;
      box-shadow: 0 0 0 4px var(--accent-glow);
    }

    .wizard-step.completado .wizard-step-num {
      background: var(--success);
      color: #fff;
    }

    .wizard-step-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      line-height: 1.2;
    }

    .wizard-step-titulo { font-size: 0.8rem; font-weight: 700; color: var(--primary); }
    .wizard-step-desc { font-size: 0.68rem; color: var(--text-muted); }
    .wizard-step.activo .wizard-step-titulo { color: var(--accent); }

    .wizard-body { padding: 1.5rem; }

    .wizard-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-light);
      background: var(--bg-main);
      flex-wrap: wrap;
    }

    .wizard-paso-label { font-size: 0.75rem; color: var(--text-muted); }

    @media (max-width: 576px) {
      .wizard-step-desc { display: none; }
      .wizard-step { min-width: 78px; }
      .wizard-actions button { flex: 1; }
      .wizard-paso-label { order: -1; width: 100%; text-align: center; }
    }
  `]
})
export class StepperWizardComponent {
  @Input({ required: true }) pasos: PasoWizard[] = [];
  @Input() pasoActual = 0;
  @Input() puedeAvanzar = true;
  @Input() permiteSaltar = false;
  @Input() cargando = false;
  @Input() mostrarAcciones = true;
  @Input() textoFinalizar?: string;

  @Output() pasoActualChange = new EventEmitter<number>();
  @Output() pasoCambiado = new EventEmitter<number>();
  @Output() finalizado = new EventEmitter<void>();

  public porcentaje(): number {
    if (!this.pasos.length) return 0;
    return Math.round(((this.pasoActual + 1) / this.pasos.length) * 100);
  }

  public irA(indice: number): void {
    if (indice < 0 || indice >= this.pasos.length) return;
    if (indice > this.pasoActual && !this.permiteSaltar) return;
    this.cambiarPaso(indice);
  }

  public siguiente(): void {
    if (!this.puedeAvanzar) return;
    this.irA(this.pasoActual + 1);
  }

  public anterior(): void {
    this.irA(this.pasoActual - 1);
  }

  public finalizar(): void {
    if (!this.puedeAvanzar) return;
    this.finalizado.emit();
  }

  private cambiarPaso(indice: number): void {
    this.pasoActual = indice;
    this.pasoActualChange.emit(indice);
    this.pasoCambiado.emit(indice);
  }
}
