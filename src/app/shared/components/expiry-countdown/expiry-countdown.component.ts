import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * [EXAMEN-2] CU16: cuenta regresiva del vencimiento de una orden o pago.
 * Emite `vencido` una sola vez cuando el plazo llega a cero.
 */
@Component({
  selector: 'app-expiry-countdown',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="expiry-countdown" [class.is-urgent]="urgente" [class.is-expired]="expirado">
      <i [class]="expirado ? 'ri-time-line' : 'ri-timer-line'"></i>
      @if (expirado) {
        <span>Plazo vencido</span>
      } @else {
        <span>{{ texto }}</span>
      }
    </span>
  `,
  styles: [`
    .expiry-countdown {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.78rem;
      font-weight: 700;
      color: #475569;
    }
    .is-urgent { color: #b45309; }
    .is-expired { color: #b91c1c; }
  `]
})
export class ExpiryCountdownComponent implements OnChanges, OnDestroy {
  @Input() fechaExpiracion: string | null = null;
  @Input() etiqueta = 'Vence en';
  @Output() vencido = new EventEmitter<void>();

  texto = '';
  urgente = false;
  expirado = false;

  private temporizador: ReturnType<typeof setInterval> | null = null;
  private notificado = false;

  ngOnChanges(): void {
    this.notificado = false;
    this.reiniciarTemporizador();
    this.actualizar();
  }

  ngOnDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  private reiniciarTemporizador(): void {
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = setInterval(() => this.actualizar(), 30_000);
  }

  private actualizar(): void {
    const fin = this.fechaExpiracion ? Date.parse(this.fechaExpiracion) : NaN;
    if (Number.isNaN(fin)) {
      this.texto = 'Sin plazo definido';
      this.expirado = false;
      this.urgente = false;
      return;
    }

    const restante = fin - Date.now();
    if (restante <= 0) {
      this.texto = 'Plazo vencido';
      this.expirado = true;
      this.urgente = true;
      if (!this.notificado) {
        this.notificado = true;
        // Se difiere para no emitir durante el ciclo de detección de cambios.
        setTimeout(() => this.vencido.emit(), 0);
      }
      return;
    }

    this.expirado = false;
    this.urgente = restante <= 3_600_000;
    this.texto = `${this.etiqueta} ${this.formatear(restante)}`;
  }

  private formatear(restante: number): string {
    const totalMinutos = Math.ceil(restante / 60_000);
    const dias = Math.floor(totalMinutos / 1440);
    const horas = Math.floor((totalMinutos % 1440) / 60);
    const minutos = totalMinutos % 60;
    if (dias > 0) return `${dias} d ${horas} h`;
    if (horas > 0) return `${horas} h ${minutos} min`;
    return `${minutos} min`;
  }
}
