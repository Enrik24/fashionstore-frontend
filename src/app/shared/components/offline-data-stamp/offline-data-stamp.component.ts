import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * [EXAMEN-2] CU05/CU09: sello visible de frescura de los datos locales.
 * Comunica al usuario la versión del paquete y la antigüedad de la descarga.
 */
@Component({
  selector: 'app-offline-data-stamp',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="offline-data-stamp" [class.is-stale]="vencido">
      <i [class]="icono"></i>
      <span class="stamp-text">
        <strong>{{ etiqueta }}</strong>
        @if (fechaTexto) {
          <span>· {{ fechaTexto }}</span>
        }
        @if (version) {
          <span class="stamp-version">v{{ version }}</span>
        }
      </span>
    </span>
  `,
  styles: [`
    .offline-data-stamp {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.25rem 0.7rem;
      border-radius: var(--radius-full, 9999px);
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #047857;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .offline-data-stamp.is-stale {
      background: #fffbeb;
      border-color: #fcd34d;
      color: #92400e;
    }
    .stamp-text { display: inline-flex; align-items: center; gap: 0.25rem; flex-wrap: wrap; }
    .stamp-version {
      margin-left: 0.25rem;
      padding: 0 0.35rem;
      border-radius: 9999px;
      background: rgba(0, 0, 0, 0.06);
      font-size: 0.68rem;
    }
  `]
})
export class OfflineDataStampComponent implements OnChanges {
  @Input() fecha: string | null = null;
  @Input() version: string | null = null;
  @Input() etiqueta = 'Datos locales';
  /** Horas tras las cuales el sello se marca como vencido. */
  @Input() horasVigencia = 24;

  fechaTexto = '';
  vencido = false;

  get icono(): string {
    return this.vencido ? 'ri-time-line' : 'ri-database-2-line';
  }

  ngOnChanges(): void {
    this.fechaTexto = this.formatear(this.fecha);
    this.vencido = this.calcularVencido(this.fecha);
  }

  private calcularVencido(fecha: string | null): boolean {
    if (!fecha) return false;
    const momento = Date.parse(fecha);
    if (Number.isNaN(momento)) return false;
    return Date.now() - momento > this.horasVigencia * 3_600_000;
  }

  private formatear(fecha: string | null): string {
    if (!fecha) return '';
    const momento = new Date(fecha);
    if (Number.isNaN(momento.getTime())) return '';
    const diferencia = Date.now() - momento.getTime();
    const minutos = Math.floor(diferencia / 60_000);
    if (minutos < 1) return 'hace unos segundos';
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `hace ${horas} h`;
    const dias = Math.floor(horas / 24);
    if (dias < 30) return `hace ${dias} d`;
    return momento.toLocaleDateString('es-BO', { dateStyle: 'short' });
  }
}
