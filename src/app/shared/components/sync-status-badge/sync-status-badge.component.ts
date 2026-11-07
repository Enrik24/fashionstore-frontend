import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

const ETIQUETAS: Record<string, string> = {
  IDLE: 'Sincronizado',
  SINCRONIZANDO: 'Sincronizando',
  ERROR: 'Error de sincronización',
  SIN_RED: 'Sin conexión',
  ONLINE: 'En línea',
  OFFLINE: 'Modo offline',
  PENDIENTE: 'Cambios pendientes',
  MIGRADO: 'Carrito migrado'
};

/**
 * [EXAMEN-2] CU08: indicador compacto del estado del motor de sincronización.
 * Se reutiliza en POS, carrito, barra superior y centro de sincronización.
 */
@Component({
  selector: 'app-sync-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="sync-status-badge"
      [class.is-compact]="compacto"
      [class.is-offline]="esSinRed"
      [class.is-syncing]="estadoNormalizado === 'SINCRONIZANDO'"
      [class.is-error]="estadoNormalizado === 'ERROR'"
      role="status"
      aria-live="polite"
    >
      <span class="status-dot" aria-hidden="true"></span>
      <span class="status-label">{{ etiqueta }}</span>

      @if (!compacto) {
        @if (pendientes > 0) {
          <span class="status-counter" title="Operaciones pendientes de envío">
            <i class="ri-upload-cloud-2-line"></i> {{ pendientes }}
          </span>
        }
        @if (conflictos > 0) {
          <span class="status-counter counter-conflict" title="Conflictos sin resolver">
            <i class="ri-error-warning-line"></i> {{ conflictos }}
          </span>
        }
      }
    </span>
  `,
  styles: [`
    .sync-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.3rem 0.75rem;
      border-radius: var(--radius-full, 9999px);
      border: 1px solid var(--border-color, #e2e8f0);
      background: #ffffff;
      color: #334155;
      font-size: 0.78rem;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
    }
    .status-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
      flex: 0 0 auto;
    }
    .is-offline .status-dot { background: #f59e0b; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15); }
    .is-syncing .status-dot { background: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); animation: pulse 1.2s infinite; }
    .is-error .status-dot { background: #ef4444; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15); }
    .status-counter {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-full, 9999px);
      background: #f1f5f9;
      font-size: 0.7rem;
    }
    .counter-conflict { background: #fef3c7; color: #92400e; }
    .is-compact { padding: 0.2rem 0.55rem; font-size: 0.7rem; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `]
})
export class SyncStatusBadgeComponent {
  @Input() estado: string | null = 'IDLE';
  @Input() pendientes = 0;
  @Input() conflictos = 0;
  @Input() compacto = false;

  get estadoNormalizado(): string {
    return (this.estado ?? 'IDLE').toUpperCase();
  }

  get esSinRed(): boolean {
    return this.estadoNormalizado === 'SIN_RED' || this.estadoNormalizado === 'OFFLINE';
  }

  get etiqueta(): string {
    return ETIQUETAS[this.estadoNormalizado] ?? this.estado ?? 'Sin estado';
  }
}
