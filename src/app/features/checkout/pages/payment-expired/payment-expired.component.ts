import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PendingPaymentService } from '../../../../core/offline/pending-payment.service';
import { ToastService } from '../../../../core/services/toast.service';

/**
 * [EXAMEN-2] CU16 / RN-016: resultado de expiración con liberación de stock.
 * La UI comunica que la orden venció y que el stock fue liberado.
 */
@Component({
  selector: 'app-payment-expired',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="expirado-page">
      <div class="card expirado-card">
        <div class="expirado-icon"><i class="ri-time-line"></i></div>
        <h1>El pago expiró</h1>
        <p>
          El plazo para completar el pago diferido venció. La orden fue cancelada y
          <strong>el stock reservado fue liberado</strong>.
        </p>

        @if (uuidPago()) {
          <span class="uuid-chip"><i class="ri-fingerprint-line"></i> {{ uuidPago() | slice:0:14 }}…</span>
        }

        @if (liberando()) {
          <div class="estado"><i class="ri-loader-4-line spin-icon"></i> Confirmando liberación de stock…</div>
        } @else if (liberado()) {
          <div class="aviso aviso-exito">
            <i class="ri-checkbox-circle-line"></i>
            <div>
              <strong>Stock liberado</strong>
              <p>La operación quedó registrada en la bitácora local.</p>
            </div>
          </div>
        } @else {
          <div class="aviso aviso-warning">
            <i class="ri-information-line"></i>
            <p>Si el pago estaba siendo procesado, revisa tus pagos pendientes antes de volver a comprar.</p>
          </div>
        }

        <div class="expirado-acciones">
          <a routerLink="/catalog" class="btn btn-accent btn-sm">
            <i class="ri-store-2-line"></i> Volver al catálogo
          </a>
          <a routerLink="/profile/pagos-pendientes" class="btn btn-outline btn-sm">
            <i class="ri-list-check"></i> Mis pagos pendientes
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .expirado-page { min-height: 100vh; background: var(--bg-main); display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; }
    .expirado-card { width: 100%; max-width: 520px; padding: 2rem 1.8rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.7rem; }
    .expirado-icon { width: 64px; height: 64px; border-radius: 50%; background: #fef3c7; color: #b45309; display: flex; align-items: center; justify-content: center; font-size: 2rem; }
    .expirado-card h1 { margin: 0; font-size: 1.4rem; color: var(--primary); }
    .expirado-card p { margin: 0; color: #475569; font-size: 0.88rem; }
    .uuid-chip { display: inline-flex; align-items: center; gap: 0.3rem; background: #f1f5f9; border-radius: 9999px; padding: 0.2rem 0.65rem; font-size: 0.7rem; font-weight: 700; color: #475569; }
    .estado { display: flex; align-items: center; gap: 0.4rem; color: #64748b; font-size: 0.8rem; }
    .aviso { display: flex; gap: 0.5rem; align-items: flex-start; text-align: left; padding: 0.65rem 0.8rem; border-radius: 0.6rem; font-size: 0.8rem; width: 100%; }
    .aviso p { margin: 0.15rem 0 0; font-size: 0.76rem; }
    .aviso-exito { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
    .aviso-warning { background: #fffbeb; border: 1px solid #fcd34d; color: #92400e; }
    .expirado-acciones { display: flex; gap: 0.4rem; flex-wrap: wrap; justify-content: center; margin-top: 0.4rem; }
  `]
})
export class PaymentExpiredComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private pending = inject(PendingPaymentService);
  private toast = inject(ToastService);

  uuidPago = signal<string | null>(null);
  liberando = signal(false);
  liberado = signal(false);

  async ngOnInit(): Promise<void> {
    const uuid = this.route.snapshot.queryParamMap.get('uuidPago')
      ?? this.route.snapshot.paramMap.get('uuidPago');
    this.uuidPago.set(uuid);
    if (!uuid) return;

    this.liberando.set(true);
    try {
      await this.pending.cancelar(uuid);
      this.liberado.set(true);
      await this.pending.detectarExpiracion();
    } catch {
      // La expiración pudo haber sido procesada ya; no se muestra error al usuario.
      this.toast.info('La orden ya no está activa; el stock se liberó previamente.', 'Pago expirado');
    } finally {
      this.liberando.set(false);
    }
  }
}
