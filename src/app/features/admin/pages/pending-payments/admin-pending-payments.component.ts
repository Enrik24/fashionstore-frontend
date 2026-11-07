import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PendingPaymentService } from '../../../../core/offline/pending-payment.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EventoStripe } from '../../../../core/models/pago-diferido.model';
import {
  PendingPaymentsTableComponent,
  PagoListado
} from '../../../../shared/components/pending-payments-table/pending-payments-table.component';
import { PaymentStatusChipComponent } from '../../../../shared/components/payment-status-chip/payment-status-chip.component';

/**
 * [EXAMEN-2] CU16: pagos diferidos del tenant.
 * Conciliación orden-pago, reembolsos, eventos de Stripe y aviso de pagos
 * cuya orden fue rechazada.
 */
@Component({
  selector: 'app-admin-pending-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, PendingPaymentsTableComponent, PaymentStatusChipComponent],
  template: `
    <section class="admin-pagos-page">
      <header class="page-head">
        <div>
          <h1><i class="ri-bank-card-2-line"></i> Pagos diferidos</h1>
          <p>Conciliación de órdenes y pagos, reembolsos y eventos de Stripe del tenant.</p>
        </div>
        <div class="head-acciones">
          <select class="form-control estado-select" [(ngModel)]="filtroEstado" (ngModelChange)="cargar()">
            @for (opcion of estados; track opcion.valor) {
              <option [value]="opcion.valor">{{ opcion.etiqueta }}</option>
            }
          </select>
          <button type="button" class="btn btn-outline btn-sm" [disabled]="cargando()" (click)="cargar()">
            <i class="ri-refresh-line"></i> Actualizar
          </button>
        </div>
      </header>

      <div class="kpis">
        <article class="card kpi">
          <span>En seguimiento</span>
          <strong>{{ pagos().length }}</strong>
        </article>
        <article class="card kpi kpi-warning">
          <span>Requieren acción</span>
          <strong>{{ requierenAccion() }}</strong>
        </article>
        <article class="card kpi kpi-success">
          <span>Confirmados</span>
          <strong>{{ confirmados() }}</strong>
        </article>
        <article class="card kpi kpi-danger">
          <span>Rechazados / error</span>
          <strong>{{ rechazados() }}</strong>
        </article>
        <article class="card kpi">
          <span>Monto en seguimiento</span>
          <strong>Bs. {{ montoSeguimiento() | number:'1.2-2' }}</strong>
        </article>
      </div>

      @if (requierenAccion() > 0) {
        <div class="aviso aviso-warning">
          <i class="ri-error-warning-line"></i>
          <div>
            <strong>{{ requierenAccion() }} pago(s) con orden rechazada o acción pendiente</strong>
            <p>Revisa la conciliación y, si el cobro se confirmó, registra el reembolso (RN-018).</p>
          </div>
        </div>
      }

      <div class="card tabla-card">
        <app-pending-payments-table
          [pagos]="pagos()"
          [cargando]="cargando()"
          [procesando]="procesando()"
          mensajeVacio="No hay pagos diferidos para el filtro seleccionado."
          (reintentar)="reintentar($event)"
          (cancelar)="cancelar($event)"
          (reembolsar)="reembolsar($event)"
          (verEventos)="verEventos($event)"
        ></app-pending-payments-table>
      </div>

      @if (eventosAbiertos()) {
        <div class="card eventos-card">
          <header class="eventos-head">
            <h2><i class="ri-list-check"></i> Eventos de Stripe · pago #{{ pagoEventosId() }}</h2>
            <button type="button" class="btn btn-icon btn-outline btn-sm" (click)="cerrarEventos()" aria-label="Cerrar eventos">
              <i class="ri-close-line"></i>
            </button>
          </header>

          @if (cargandoEventos()) {
            <div class="estado"><i class="ri-loader-4-line spin-icon"></i> Cargando eventos…</div>
          } @else if (eventos().length === 0) {
            <div class="estado">No hay eventos registrados para este pago.</div>
          } @else {
            <div class="table-responsive">
              <table class="table-custom">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Tipo</th>
                    <th>Recepción</th>
                    <th>Procesado</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  @for (evento of eventos(); track evento.id) {
                    <tr>
                      <td class="cell-id">{{ evento.stripe_event_id }}</td>
                      <td>{{ evento.tipo }}</td>
                      <td>{{ evento.fecha_recepcion | date:'dd/MM/yy HH:mm' }}</td>
                      <td>
                        <span class="badge" [ngClass]="evento.procesado ? 'badge-synced' : 'badge-pending'">
                          {{ evento.procesado ? 'Sí' : 'Pendiente' }}
                        </span>
                      </td>
                      <td class="cell-error">{{ evento.error_detalle || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .admin-pagos-page { display: flex; flex-direction: column; gap: 1rem; }
    .page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
    .page-head h1 { margin: 0; font-size: 1.45rem; color: var(--primary); display: inline-flex; align-items: center; gap: 0.4rem; }
    .page-head p { margin: 0.25rem 0 0; color: var(--text-muted); font-size: 0.86rem; }
    .head-acciones { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .estado-select { min-width: 190px; font-size: 0.78rem; }
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.7rem; }
    .kpi { padding: 0.8rem 0.95rem; display: flex; flex-direction: column; gap: 0.1rem; }
    .kpi span { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; font-weight: 700; }
    .kpi strong { font-size: 1.4rem; font-weight: 800; color: var(--primary); }
    .kpi-warning strong { color: #b45309; }
    .kpi-success strong { color: #15803d; }
    .kpi-danger strong { color: #b91c1c; }
    .aviso { display: flex; gap: 0.5rem; align-items: flex-start; padding: 0.7rem 0.9rem; border-radius: 0.6rem; font-size: 0.82rem; }
    .aviso-warning { background: #fffbeb; border: 1px solid #fcd34d; color: #92400e; }
    .aviso p { margin: 0.15rem 0 0; font-size: 0.76rem; }
    .tabla-card, .eventos-card { padding: 1rem 1.1rem; }
    .eventos-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .eventos-head h2 { margin: 0; font-size: 0.95rem; color: var(--primary); display: inline-flex; align-items: center; gap: 0.35rem; }
    .cell-id { font-family: monospace; font-size: 0.7rem; }
    .cell-error { color: #b91c1c; font-size: 0.72rem; }
    .estado { display: flex; justify-content: center; align-items: center; gap: 0.4rem; padding: 1.2rem; color: #64748b; font-size: 0.8rem; }
  `]
})
export class AdminPendingPaymentsComponent implements OnInit {
  private pending = inject(PendingPaymentService);
  private toast = inject(ToastService);

  readonly estados = [
    { valor: '', etiqueta: 'Todos los estados' },
    { valor: 'PENDIENTE_ENVIO', etiqueta: 'Pendiente de envío' },
    { valor: 'EN_COLA', etiqueta: 'En cola' },
    { valor: 'EN_PROCESO', etiqueta: 'En proceso' },
    { valor: 'REQUIERE_ACCION_CLIENTE', etiqueta: 'Requiere acción' },
    { valor: 'CONFIRMADO', etiqueta: 'Confirmado' },
    { valor: 'RECHAZADO', etiqueta: 'Rechazado' },
    { valor: 'EXPIRADO', etiqueta: 'Expirado' },
    { valor: 'REEMBOLSADO', etiqueta: 'Reembolsado' },
    { valor: 'ERROR_CRITICO', etiqueta: 'Error crítico' }
  ];

  pagos = signal<PagoListado[]>([]);
  cargando = signal(true);
  procesando = signal<string | null>(null);
  filtroEstado = '';
  eventosAbiertos = signal(false);
  eventos = signal<EventoStripe[]>([]);
  cargandoEventos = signal(false);
  pagoEventosId = signal<number | null>(null);

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const filtros = this.filtroEstado ? { estado: this.filtroEstado } : {};
      this.pagos.set(await this.pending.listarPendientes(filtros));
    } catch (error) {
      this.toast.error(this.mensajeError(error), 'No se pudieron cargar los pagos');
    } finally {
      this.cargando.set(false);
    }
  }

  requierenAccion(): number {
    return this.pagos().filter(
      (pago) => pago.requiere_accion || pago.estado === 'RECHAZADO' || pago.estado === 'ERROR_CRITICO'
    ).length;
  }

  confirmados(): number {
    return this.pagos().filter((pago) => pago.estado === 'CONFIRMADO').length;
  }

  rechazados(): number {
    return this.pagos().filter(
      (pago) => ['RECHAZADO', 'ERROR_CRITICO', 'EXPIRADO'].includes(pago.estado)
    ).length;
  }

  montoSeguimiento(): number {
    return this.pagos()
      .filter((pago) => ['PENDIENTE_ENVIO', 'EN_COLA', 'EN_PROCESO', 'REQUIERE_ACCION_CLIENTE'].includes(pago.estado))
      .reduce((total, pago) => total + Number(pago.monto ?? 0), 0);
  }

  async reintentar(uuidPago: string): Promise<void> {
    this.procesando.set(uuidPago);
    try {
      const pago = await this.pending.reintentar(uuidPago);
      this.toast.info(`Pago ${uuidPago.slice(0, 8)}… actualizado a ${pago.estado}.`, 'Reintento registrado');
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

  async reembolsar(evento: { pagoId: number; monto: number }): Promise<void> {
    const confirmado = window.confirm(
      `¿Registrar el reembolso de Bs. ${Number(evento.monto).toFixed(2)} para el pago #${evento.pagoId}?`
    );
    if (!confirmado) return;

    this.procesando.set(String(evento.pagoId));
    try {
      const resultado = await this.pending.reembolsar(evento.pagoId, evento.monto, 'Orden rechazada después del cobro (RN-018)');
      this.toast.success(
        resultado.reembolsado
          ? `Reembolso ${resultado.reembolso_id ?? ''} registrado por Bs. ${Number(resultado.monto ?? evento.monto).toFixed(2)}.`
          : 'El reembolso quedó registrado para revisión.',
        'Reembolso'
      );
      await this.cargar();
    } catch (error) {
      this.toast.error(this.mensajeError(error), 'No se pudo reembolsar');
    } finally {
      this.procesando.set(null);
    }
  }

  async verEventos(pagoId: number): Promise<void> {
    this.pagoEventosId.set(pagoId);
    this.eventosAbiertos.set(true);
    this.cargandoEventos.set(true);
    try {
      this.eventos.set(await this.pending.listarEventos(pagoId));
    } catch (error) {
      this.eventos.set([]);
      this.toast.error(this.mensajeError(error), 'No se pudieron cargar los eventos');
    } finally {
      this.cargandoEventos.set(false);
    }
  }

  cerrarEventos(): void {
    this.eventosAbiertos.set(false);
    this.eventos.set([]);
    this.pagoEventosId.set(null);
  }

  private mensajeError(error: unknown): string {
    if (error instanceof Error) return error.message;
    const detalle = (error as { error?: { detail?: string } })?.error?.detail;
    return detalle ?? 'Error inesperado al consultar los pagos.';
  }
}
