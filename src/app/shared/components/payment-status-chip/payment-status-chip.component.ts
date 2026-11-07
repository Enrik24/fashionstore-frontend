import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusBadgePipe } from '../../pipes/status-badge.pipe';

/**
 * [EXAMEN-2] CU16: chip de estado de un pago diferido.
 * Reutiliza el pipe central de estados para no duplicar catálogos.
 */
@Component({
  selector: 'app-payment-status-chip',
  standalone: true,
  imports: [CommonModule, StatusBadgePipe],
  template: `
    <span class="payment-status-chip" [ngClass]="estadoInfo.class" [class.is-pulse]="enProceso">
      <i [class]="icono"></i>
      <span>{{ estadoInfo.label }}</span>
      @if (simulado) {
        <span class="chip-simulado">simulado</span>
      }
    </span>
  `,
  styles: [`
    .payment-status-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.2rem 0.6rem;
      border-radius: var(--radius-full, 9999px);
      font-size: 0.72rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .chip-simulado {
      padding: 0 0.35rem;
      border-radius: 9999px;
      background: rgba(0, 0, 0, 0.08);
      font-size: 0.62rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .is-pulse i { animation: pulse 1.2s infinite; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.35; }
    }
  `]
})
export class PaymentStatusChipComponent {
  @Input() estado: string | null = null;
  @Input() simulado = false;

  private readonly pipe = new StatusBadgePipe();

  get estadoInfo(): { label: string; class: string } {
    return this.pipe.transform(this.estado);
  }

  get enProceso(): boolean {
    const normalizado = (this.estado ?? '').toUpperCase();
    return normalizado === 'EN_PROCESO' || normalizado === 'EN_COLA' || normalizado === 'SINCRONIZANDO';
  }

  get icono(): string {
    const normalizado = (this.estado ?? '').toUpperCase();
    switch (normalizado) {
      case 'CONFIRMADO': return 'ri-checkbox-circle-line';
      case 'RECHAZADO':
      case 'ERROR_CRITICO': return 'ri-close-circle-line';
      case 'EXPIRADO': return 'ri-time-line';
      case 'REEMBOLSADO': return 'ri-refund-2-line';
      case 'CANCELADO': return 'ri-forbid-line';
      case 'REQUIERE_ACCION_CLIENTE': return 'ri-shield-keyhole-line';
      case 'EN_PROCESO':
      case 'EN_COLA': return 'ri-loader-4-line';
      default: return 'ri-hourglass-line';
    }
  }
}
