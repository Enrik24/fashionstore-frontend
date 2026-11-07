import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LogConflicto } from '../../../core/models/offline.model';
import { ClasificacionConflicto } from '../../../core/offline/conflict.service';

export interface DecisionConflicto {
  id: number;
  decision: 'CONFIRMAR' | 'RECHAZAR' | 'AJUSTAR';
  observacion?: string;
}

/**
 * [EXAMEN-2] CU09: tarjeta de conflicto con comparación local vs central
 * y acciones de resolución o descarte.
 */
@Component({
  selector: 'app-conflict-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <article class="conflict-card" [class.is-resolved]="conflicto.resuelto">
      <header class="conflict-header">
        <div class="conflict-title">
          <span class="badge" [ngClass]="'badge-' + (clasificacion.color === 'danger' ? 'danger' : clasificacion.color)">
            {{ clasificacion.etiqueta }}
          </span>
          <span class="conflict-severity" [class]="'severity-' + clasificacion.severidad.toLowerCase()">
            Severidad {{ clasificacion.severidad }}
          </span>
        </div>
        <span class="conflict-date">{{ conflicto.fecha | date:'dd/MM/yy HH:mm' }}</span>
      </header>

      <p class="conflict-action">
        <i class="ri-lightbulb-line"></i> {{ clasificacion.accionSugerida }}
      </p>

      <div class="conflict-meta">
        <span><i class="ri-hashtag"></i> Conflicto #{{ conflicto.id }}</span>
        @if (conflicto.uuid_operacion) {
          <span><i class="ri-fingerprint-line"></i> {{ conflicto.uuid_operacion | slice:0:12 }}…</span>
        }
      </div>

      @if (comparacion) {
        <div class="conflict-compare">
          <div class="compare-column">
            <span class="compare-title"><i class="ri-smartphone-line"></i> Local</span>
            <pre>{{ comparacion.local }}</pre>
          </div>
          <div class="compare-column">
            <span class="compare-title"><i class="ri-server-line"></i> Central</span>
            <pre>{{ comparacion.central }}</pre>
          </div>
        </div>
      }

      @if (!conflicto.resuelto) {
        <div class="conflict-form">
          <label class="form-label" [for]="'obs-' + conflicto.id">Observación (opcional)</label>
          <input
            class="form-control"
            [id]="'obs-' + conflicto.id"
            type="text"
            placeholder="Motivo de la decisión"
            [(ngModel)]="observacion"
          />
        </div>

        <footer class="conflict-actions">
          <button type="button" class="btn btn-primary btn-sm" (click)="decidir('CONFIRMAR')">
            <i class="ri-check-line"></i> Confirmar local
          </button>
          <button type="button" class="btn btn-outline btn-sm" (click)="decidir('AJUSTAR')">
            <i class="ri-equalizer-line"></i> Ajustar
          </button>
          <button type="button" class="btn btn-danger btn-sm" (click)="decidir('RECHAZAR')">
            <i class="ri-close-line"></i> Rechazar
          </button>
          <button type="button" class="btn btn-outline btn-sm" (click)="descartar.emit({ id: conflicto.id, motivo: observacion })">
            <i class="ri-delete-bin-line"></i> Descartar
          </button>
        </footer>
      } @else {
        <footer class="conflict-actions">
          <span class="resolved-label">
            <i class="ri-checkbox-circle-line"></i> Resuelto
            @if (conflicto.estrategia_resolucion) { · {{ conflicto.estrategia_resolucion }} }
          </span>
        </footer>
      }
    </article>
  `,
  styles: [`
    .conflict-card {
      background: #ffffff;
      border: 1px solid var(--border-color, #e2e8f0);
      border-left: 4px solid #f59e0b;
      border-radius: 0.8rem;
      padding: 1rem 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
    }
    .conflict-card.is-resolved { opacity: 0.75; border-left-color: #22c55e; }
    .conflict-header { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .conflict-title { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .conflict-severity {
      padding: 0.12rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.66rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .severity-alta { background: #fee2e2; color: #991b1b; }
    .severity-media { background: #fef3c7; color: #92400e; }
    .severity-baja { background: #e0f2fe; color: #075985; }
    .conflict-date { font-size: 0.72rem; color: #94a3b8; }
    .conflict-action { margin: 0; font-size: 0.82rem; color: #475569; display: flex; gap: 0.35rem; }
    .conflict-meta { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.72rem; color: #64748b; }
    .conflict-compare { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.6rem; }
    .compare-column { background: #f8fafc; border-radius: 0.5rem; padding: 0.5rem 0.65rem; }
    .compare-title { font-size: 0.7rem; font-weight: 700; color: #475569; display: inline-flex; gap: 0.25rem; align-items: center; }
    .compare-column pre {
      margin: 0.35rem 0 0;
      font-size: 0.68rem;
      white-space: pre-wrap;
      word-break: break-word;
      color: #334155;
      max-height: 120px;
      overflow: auto;
    }
    .conflict-form { display: flex; flex-direction: column; gap: 0.25rem; }
    .conflict-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; }
    .resolved-label { font-size: 0.78rem; font-weight: 700; color: #15803d; }
  `]
})
export class ConflictCardComponent {
  @Input() conflicto!: LogConflicto;
  @Input() clasificacion: ClasificacionConflicto = {
    etiqueta: 'Conflicto de sincronización',
    color: 'warning',
    accionSugerida: 'Revisar el detalle y resolver manualmente.',
    severidad: 'MEDIA'
  };
  @Input() comparacion: { local: string; central: string } | null = null;

  @Output() resolver = new EventEmitter<DecisionConflicto>();
  @Output() descartar = new EventEmitter<{ id: number; motivo?: string }>();

  observacion = '';

  decidir(decision: DecisionConflicto['decision']): void {
    this.resolver.emit({
      id: this.conflicto.id,
      decision,
      observacion: this.observacion || undefined
    });
  }
}
