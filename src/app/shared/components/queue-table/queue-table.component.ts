import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperacionOfflineLocal } from '../../../core/models/offline.model';
import { StatusBadgePipe } from '../../pipes/status-badge.pipe';

const ETIQUETAS_TIPO: Record<string, string> = {
  RESERVA: 'Reserva',
  VENTA_CONTADO: 'Venta contado',
  CARRITO: 'Carrito',
  DEVOLUCION_CAMBIO: 'Devolución',
  REPOSICION: 'Reposición',
  ORDEN_PAGO_DIFERIDO: 'Orden pago diferido',
  PAGO_DIFERIDO: 'Pago diferido',
  ACTUALIZACION_CLIENTE: 'Actualización cliente'
};

/**
 * [EXAMEN-2] CU08: tabla FIFO de operaciones locales con estado y reintento.
 */
@Component({
  selector: 'app-queue-table',
  standalone: true,
  imports: [CommonModule, StatusBadgePipe],
  template: `
    <div class="queue-table-wrapper">
      @if (cargando) {
        <div class="queue-empty">
          <i class="ri-loader-4-line spin-icon"></i> Cargando cola local...
        </div>
      } @else if (operaciones.length === 0) {
        <div class="queue-empty">
          <i class="ri-checkbox-circle-line"></i>
          <span>{{ mensajeVacio }}</span>
        </div>
      } @else {
        <div class="table-responsive">
          <table class="table-custom queue-table">
            <thead>
              <tr>
                <th>Sec.</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Registro local</th>
                <th>Intentos</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (operacion of operaciones; track operacion.uuid_operacion) {
                <tr [class.row-conflict]="operacion.estado_sincronizacion === 'CONFLICTO'">
                  <td class="cell-secuencia">#{{ operacion.secuencia_local }}</td>
                  <td>
                    <div class="cell-tipo">
                      <strong>{{ tipo(operacion.tipo_operacion) }}</strong>
                      <small>{{ operacion.uuid_operacion | slice:0:8 }}…</small>
                    </div>
                  </td>
                  <td>
                    <span class="badge" [ngClass]="estadoInfo(operacion.estado_sincronizacion).class">
                      {{ estadoInfo(operacion.estado_sincronizacion).label }}
                    </span>
                    @if (operacion.error_detalle) {
                      <small class="cell-error" [title]="operacion.error_detalle">{{ operacion.error_detalle }}</small>
                    }
                  </td>
                  <td>{{ operacion.fecha_registro_local | date:'dd/MM/yy HH:mm' }}</td>
                  <td class="cell-intentos">{{ operacion.intentos }}</td>
                  <td class="cell-actions">
                    @if (puedeReintentar(operacion)) {
                      <button
                        type="button"
                        class="btn btn-outline btn-sm"
                        [disabled]="procesando === operacion.uuid_operacion"
                        (click)="reintentar.emit(operacion.uuid_operacion)"
                        title="Reintentar operación"
                      >
                        <i class="ri-refresh-line"></i> Reintentar
                      </button>
                    }
                    @if (operacion.estado_sincronizacion === 'CONFLICTO') {
                      <button
                        type="button"
                        class="btn btn-outline-accent btn-sm"
                        (click)="verConflicto.emit(operacion)"
                        title="Ver conflicto asociado"
                      >
                        <i class="ri-error-warning-line"></i> Ver conflicto
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .queue-table-wrapper { width: 100%; }
    .queue-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 2rem 1rem;
      color: #64748b;
      font-size: 0.9rem;
    }
    .queue-table { font-size: 0.82rem; }
    .queue-table th { white-space: nowrap; }
    .cell-secuencia { font-weight: 700; color: #475569; white-space: nowrap; }
    .cell-tipo { display: flex; flex-direction: column; gap: 0.1rem; }
    .cell-tipo small { color: #94a3b8; font-size: 0.68rem; }
    .cell-error {
      display: block;
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #b91c1c;
      font-size: 0.68rem;
    }
    .cell-intentos { text-align: center; font-weight: 600; }
    .cell-actions { display: flex; gap: 0.35rem; justify-content: flex-end; flex-wrap: wrap; }
    .row-conflict { background: #fffbeb; }
    .text-right { text-align: right; }
  `]
})
export class QueueTableComponent {
  @Input() operaciones: OperacionOfflineLocal[] = [];
  @Input() cargando = false;
  @Input() mensajeVacio = 'No hay operaciones en la cola local.';
  @Input() procesando: string | null = null;

  @Output() reintentar = new EventEmitter<string>();
  @Output() verConflicto = new EventEmitter<OperacionOfflineLocal>();

  private readonly pipe = new StatusBadgePipe();

  tipo(tipo: string): string {
    return ETIQUETAS_TIPO[tipo] ?? tipo;
  }

  estadoInfo(estado: string): { label: string; class: string } {
    return this.pipe.transform(estado);
  }

  puedeReintentar(operacion: OperacionOfflineLocal): boolean {
    return ['PENDIENTE', 'RECHAZADA', 'ERROR_CRITICO'].includes(operacion.estado_sincronizacion);
  }
}
