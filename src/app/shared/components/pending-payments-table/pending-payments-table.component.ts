import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PagoLocal } from '../../../core/models/offline.model';
import { PagoDiferido } from '../../../core/models/pago-diferido.model';
import { PaymentStatusChipComponent } from '../payment-status-chip/payment-status-chip.component';

export type PagoListado = PagoLocal | PagoDiferido;

/**
 * [EXAMEN-2] CU16: tabla reutilizable de pagos diferidos pendientes.
 * Se usa en el perfil del cliente y en la conciliación del administrador.
 */
@Component({
  selector: 'app-pending-payments-table',
  standalone: true,
  imports: [CommonModule, PaymentStatusChipComponent],
  template: `
    <div class="pending-payments-table">
      @if (cargando) {
        <div class="table-empty">
          <i class="ri-loader-4-line spin-icon"></i> Cargando pagos...
        </div>
      } @else if (pagos.length === 0) {
        <div class="table-empty">
          <i class="ri-checkbox-circle-line"></i> {{ mensajeVacio }}
        </div>
      } @else {
        <div class="table-responsive">
          <table class="table-custom">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Vence</th>
                <th>Intentos</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (pago of pagos; track uuid(pago)) {
                <tr [class.row-action]="pago.requiere_accion">
                  <td>
                    <div class="cell-orden">
                      <strong>{{ numeroOrden(pago) }}</strong>
                      <small>{{ uuid(pago) | slice:0:10 }}…</small>
                    </div>
                  </td>
                  <td class="cell-monto">{{ pago.moneda || 'BOB' }} {{ pago.monto | number:'1.2-2' }}</td>
                  <td>
                    <app-payment-status-chip [estado]="pago.estado" [simulado]="pago.simulado === true" />
                  </td>
                  <td>
                    @if (pago.fecha_expiracion) {
                      <span class="cell-fecha">{{ pago.fecha_expiracion | date:'dd/MM/yy HH:mm' }}</span>
                    } @else {
                      <span class="cell-muted">Sin plazo</span>
                    }
                  </td>
                  <td class="cell-intentos">{{ pago.intentos }}</td>
                  <td class="cell-actions">
                    @if (puedeReintentar(pago)) {
                      <button type="button" class="btn btn-outline btn-sm" [disabled]="procesando === uuid(pago)" (click)="reintentar.emit(uuid(pago))">
                        <i class="ri-refresh-line"></i> Reintentar
                      </button>
                    }
                    @if (puedeCancelar(pago)) {
                      <button type="button" class="btn btn-danger btn-sm" [disabled]="procesando === uuid(pago)" (click)="cancelar.emit(uuid(pago))">
                        <i class="ri-close-line"></i> Cancelar
                      </button>
                    }
                    @if (puedeReembolsar(pago)) {
                      <button type="button" class="btn btn-outline-accent btn-sm" (click)="reembolsar.emit({ pagoId: idRemoto(pago)!, monto: pago.monto })">
                        <i class="ri-refund-2-line"></i> Reembolsar
                      </button>
                    }
                    @if (idRemoto(pago) !== null) {
                      <button type="button" class="btn btn-outline btn-sm" (click)="verEventos.emit(idRemoto(pago)!)">
                        <i class="ri-list-check"></i> Eventos
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
    .table-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 2rem 1rem;
      color: #64748b;
      font-size: 0.9rem;
    }
    .cell-orden { display: flex; flex-direction: column; gap: 0.1rem; }
    .cell-orden small { color: #94a3b8; font-size: 0.68rem; }
    .cell-monto { font-weight: 700; white-space: nowrap; }
    .cell-fecha { font-size: 0.78rem; white-space: nowrap; }
    .cell-muted { color: #94a3b8; font-size: 0.76rem; }
    .cell-intentos { text-align: center; font-weight: 600; }
    .cell-actions { display: flex; gap: 0.35rem; flex-wrap: wrap; justify-content: flex-end; }
    .row-action { background: #fffbeb; }
    .text-right { text-align: right; }
  `]
})
export class PendingPaymentsTableComponent {
  @Input() pagos: PagoListado[] = [];
  @Input() cargando = false;
  @Input() mensajeVacio = 'No hay pagos diferidos pendientes.';
  @Input() procesando: string | null = null;

  @Output() reintentar = new EventEmitter<string>();
  @Output() cancelar = new EventEmitter<string>();
  @Output() reembolsar = new EventEmitter<{ pagoId: number; monto: number }>();
  @Output() verEventos = new EventEmitter<number>();

  uuid(pago: PagoListado): string {
    return pago.uuid_pago;
  }

  numeroOrden(pago: PagoListado): string {
    const remoto = pago as PagoDiferido;
    if (remoto.numero_orden) return remoto.numero_orden;
    return `Orden #${pago.orden_id ?? 'local'}`;
  }

  idRemoto(pago: PagoListado): number | null {
    const remoto = pago as PagoDiferido;
    if (typeof remoto.id === 'number') return remoto.id;
    const local = pago as PagoLocal;
    return typeof local.pago_id === 'number' ? local.pago_id : null;
  }

  puedeReintentar(pago: PagoListado): boolean {
    return ['PENDIENTE_ENVIO', 'EN_COLA', 'RECHAZADO', 'ERROR_CRITICO'].includes(pago.estado);
  }

  puedeCancelar(pago: PagoListado): boolean {
    return ['PENDIENTE_ENVIO', 'EN_COLA', 'EN_PROCESO', 'REQUIERE_ACCION_CLIENTE', 'RECHAZADO'].includes(pago.estado);
  }

  puedeReembolsar(pago: PagoListado): boolean {
    return pago.estado === 'CONFIRMADO' && this.idRemoto(pago) !== null;
  }
}
