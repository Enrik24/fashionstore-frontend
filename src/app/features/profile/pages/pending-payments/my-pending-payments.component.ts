import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PendingPaymentService } from '../../../../core/offline/pending-payment.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PaymentStatusChipComponent } from '../../../../shared/components/payment-status-chip/payment-status-chip.component';
import {
  PendingPaymentsTableComponent,
  PagoListado
} from '../../../../shared/components/pending-payments-table/pending-payments-table.component';

/**
 * [EXAMEN-2] CU16: mis pagos pendientes (cliente).
 * Lista estado, monto, expiración y último error con reintento o cancelación.
 */
@Component({
  selector: 'app-my-pending-payments',
  standalone: true,
  imports: [CommonModule, RouterLink, PendingPaymentsTableComponent, PaymentStatusChipComponent],
  template: `
    <section class="pagos-page">
      <header class="page-head">
        <div>
          <h1><i class="ri-bank-card-line"></i> Mis pagos pendientes</h1>
          <p>Pagos diferidos generados desde tus compras offline.</p>
        </div>
        <button type="button" class="btn btn-outline btn-sm" [disabled]="cargando()" (click)="cargar()">
          <i class="ri-refresh-line"></i> Actualizar
        </button>
      </header>

      <div class="resumen-chips">
        <span class="chip"><i class="ri-time-line"></i> {{ pagos().length }} en seguimiento</span>
        <span class="chip chip-warning"><i class="ri-shield-keyhole-line"></i> {{ requierenAccion() }} requieren acción</span>
        <span class="chip chip-monto"><i class="ri-money-dollar-circle-line"></i> Bs. {{ montoTotal() | number:'1.2-2' }}</span>
      </div>

      <div class="card tabla-card">
        <app-pending-payments-table
          [pagos]="pagos()"
          [cargando]="cargando()"
          [procesando]="procesando()"
          mensajeVacio="No tienes pagos diferidos pendientes."
          (reintentar)="reintentar($event)"
          (cancelar)="cancelar($event)"
        ></app-pending-payments-table>
      </div>

      @if (pagosConError().length > 0) {
        <div class="card errores-card">
          <h2><i class="ri-error-warning-line"></i> Detalle de errores</h2>
          <ul>
            @for (pago of pagosConError(); track pago.uuid_pago) {
              <li>
                <div>
                  <strong>{{ pago.uuid_pago | slice:0:12 }}…</strong>
                  <span>{{ pago.ultimo_error }}</span>
                </div>
                <app-payment-status-chip [estado]="pago.estado" [simulado]="pago.simulado === true" />
              </li>
            }
          </ul>
        </div>
      }

      @if (pagosRealizables().length > 0) {
        <div class="card pagar-card">
          <h2><i class="ri-secure-payment-line"></i> Pagos listos para confirmar</h2>
          <p>Estos pedidos ya fueron enviados y esperan la confirmación del cobro.</p>
          <div class="pagar-lista">
            @for (pago of pagosRealizables(); track pago.uuid_pago) {
              <div class="pagar-row">
                <div>
                  <strong>Bs. {{ pago.monto | number:'1.2-2' }}</strong>
                  <small>{{ pago.uuid_pago | slice:0:14 }}… · vence {{ pago.fecha_expiracion ? (pago.fecha_expiracion | date:'dd/MM/yy HH:mm') : 'sin plazo' }}</small>
                </div>
                <a [routerLink]="['/checkout/pago-pendiente', pago.uuid_pago]" class="btn btn-accent btn-sm">
                  <i class="ri-bank-card-line"></i> Pagar ahora
                </a>
              </div>
            }
          </div>
        </div>
      }

      <div class="card ayuda-card">
        <i class="ri-information-line"></i>
        <p>
          Si un pago expira, la orden se cancela y el stock se libera automáticamente (RN-016).
          Un reintento nunca genera un segundo cobro (RN-015).
        </p>
      </div>
    </section>
  `,
  styles: [`
    .pagos-page { display: flex; flex-direction: column; gap: 1rem; }
    .page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
    .page-head h1 { margin: 0; font-size: 1.45rem; color: var(--primary); display: inline-flex; align-items: center; gap: 0.4rem; }
    .page-head p { margin: 0.25rem 0 0; color: var(--text-muted); font-size: 0.86rem; }
    .resumen-chips { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .chip { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.25rem 0.7rem; border-radius: 9999px; background: #f1f5f9; color: #475569; font-size: 0.74rem; font-weight: 700; }
    .chip-warning { background: #fffbeb; color: #92400e; }
    .chip-monto { background: #ecfdf5; color: #047857; }
    .tabla-card { padding: 1rem 1.1rem; }
    .errores-card, .pagar-card, .ayuda-card { padding: 1rem 1.1rem; }
    .errores-card h2, .pagar-card h2 { margin: 0 0 0.5rem; font-size: 0.95rem; color: var(--primary); display: inline-flex; align-items: center; gap: 0.35rem; }
    .errores-card ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 0.4rem; }
    .errores-card li { display: flex; justify-content: space-between; align-items: center; gap: 0.6rem; background: #fef2f2; border-radius: 0.5rem; padding: 0.5rem 0.65rem; }
    .errores-card li div { display: flex; flex-direction: column; gap: 0.1rem; }
    .errores-card li strong { font-size: 0.75rem; color: #991b1b; }
    .errores-card li span { font-size: 0.72rem; color: #7f1d1d; }
    .pagar-card p { margin: 0 0 0.5rem; color: #64748b; font-size: 0.78rem; }
    .pagar-lista { display: flex; flex-direction: column; gap: 0.4rem; }
    .pagar-row { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; background: #f8fafc; border-radius: 0.5rem; padding: 0.55rem 0.7rem; }
    .pagar-row div { display: flex; flex-direction: column; gap: 0.1rem; }
    .pagar-row strong { font-size: 0.85rem; color: var(--primary); }
    .pagar-row small { font-size: 0.7rem; color: #64748b; }
    .ayuda-card { display: flex; gap: 0.5rem; align-items: flex-start; color: #475569; font-size: 0.78rem; }
    .ayuda-card p { margin: 0; }
  `]
})
export class MyPendingPaymentsComponent implements OnInit {
  private pending = inject(PendingPaymentService);
  private toast = inject(ToastService);

  pagos = signal<PagoListado[]>([]);
  cargando = signal(true);
  procesando = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const pagos = await this.pending.listarPendientes();
      this.pagos.set(pagos);
    } catch (error) {
      this.toast.error(this.mensajeError(error), 'No se pudieron cargar los pagos');
    } finally {
      this.cargando.set(false);
    }
  }

  requierenAccion(): number {
    return this.pagos().filter((pago) => pago.requiere_accion).length;
  }

  montoTotal(): number {
    return this.pagos().reduce((total, pago) => total + Number(pago.monto ?? 0), 0);
  }

  pagosConError(): Array<PagoListado & { ultimo_error: string }> {
    return this.pagos().filter(
      (pago): pago is PagoListado & { ultimo_error: string } => !!pago.ultimo_error
    );
  }

  pagosRealizables(): PagoListado[] {
    return this.pagos().filter((pago) =>
      ['EN_COLA', 'EN_PROCESO', 'REQUIERE_ACCION_CLIENTE', 'RECHAZADO'].includes(pago.estado)
        && !!pago.uuid_pago
    );
  }

  async reintentar(uuidPago: string): Promise<void> {
    this.procesando.set(uuidPago);
    try {
      const pago = await this.pending.reintentar(uuidPago);
      this.toast.info(`Estado actualizado: ${pago.estado}.`, 'Reintento de pago');
      await this.cargar();
    } catch (error) {
      this.toast.error(this.mensajeError(error), 'No se pudo reintentar');
    } finally {
      this.procesando.set(null);
    }
  }

  async cancelar(uuidPago: string): Promise<void> {
    this.procesando.set(uuidPago);
    try {
      await this.pending.cancelar(uuidPago);
      this.toast.info('Pago cancelado y stock liberado.', 'Pago cancelado');
      await this.cargar();
    } catch (error) {
      this.toast.error(this.mensajeError(error), 'No se pudo cancelar');
    } finally {
      this.procesando.set(null);
    }
  }

  private mensajeError(error: unknown): string {
    if (error instanceof Error) return error.message;
    const detalle = (error as { error?: { detail?: string } })?.error?.detail;
    return detalle ?? 'Error inesperado al consultar los pagos.';
  }
}
