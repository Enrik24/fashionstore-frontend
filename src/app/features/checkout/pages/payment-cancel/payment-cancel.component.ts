import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrderService } from '../../../../core/services/order.service';
import { PaymentService } from '../../../../core/services/payment.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Orden } from '../../../../core/models/cart.model';

@Component({
  selector: 'app-payment-cancel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="cancel-page">
      <div class="container py-8">
        <div class="cancel-card card animate-fade-in">
          <div class="cancel-icon-box">
            <i class="ri-close-circle-fill cancel-icon"></i>
          </div>

          <h1 class="cancel-title">Pago Cancelado</h1>
          @if (order(); as ord) {
            <p class="cancel-subtitle">
              El proceso de pago no se completó. Tu pedido
              <strong>{{ ord.numero_orden }}</strong>
              (Bs. {{ ord.total | number:'1.2-2' }}) quedó en espera de pago.
            </p>
          } @else {
            <p class="cancel-subtitle">
              El proceso de pago no se completó.
            </p>
          }

          <div class="actions-group">
            @if (orderId() && canRetry()) {
              <button class="btn btn-accent btn-lg" (click)="retryPayment()" [disabled]="isProcessing()">
                <i class="ri-refresh-line"></i> {{ isProcessing() ? 'Procesando...' : 'Reintentar pago' }}
              </button>
              <button class="btn btn-outline btn-lg" (click)="restoreCart()" [disabled]="isProcessing()">
                <i class="ri-shopping-cart-2-line"></i> Devolver al carrito
              </button>
            } @else {
              <a routerLink="/cart" class="btn btn-accent btn-lg">
                <i class="ri-shopping-cart-2-line"></i> Volver al Carrito
              </a>
            }
            <a routerLink="/catalog" class="btn btn-outline btn-lg">
              <i class="ri-store-2-line"></i> Seguir Explorando
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cancel-page {
      min-height: 100vh;
      background-color: var(--bg-main);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem 0;
    }

    .cancel-card {
      max-width: 540px;
      margin: 0 auto;
      text-align: center;
      padding: 3rem 2rem;
      border-radius: var(--radius-xl);
    }

    .cancel-icon-box {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: var(--error-bg);
      color: var(--error);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }

    .cancel-icon { font-size: 3rem; }

    .cancel-title {
      font-size: 1.85rem;
      font-weight: 800;
      color: var(--primary);
      margin-bottom: 0.5rem;
    }

    .cancel-subtitle {
      color: var(--text-muted);
      font-size: 0.9375rem;
      margin-bottom: 2rem;
      line-height: 1.5;
    }

    .actions-group {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    @media (max-width: 600px) {
      .actions-group { flex-direction: column; }
    }
  `]
})
export class PaymentCancelComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orderService = inject(OrderService);
  private paymentService = inject(PaymentService);
  private toast = inject(ToastService);

  orderId = signal<number | null>(null);
  order = signal<Orden | null>(null);
  isProcessing = signal(false);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const id = Number(params['orden_id']);
      if (id) {
        this.orderId.set(id);
        this.orderService.getOrderById(id).subscribe({
          next: ord => this.order.set(ord),
          error: () => this.order.set(null)
        });
      }
    });
  }

  canRetry(): boolean {
    const ord = this.order();
    return !!ord && (ord.estado === 'PENDIENTE_PAGO' as any);
  }

  retryPayment(): void {
    const id = this.orderId();
    if (!id || this.isProcessing()) return;
    this.isProcessing.set(true);
    const successUrl = `${window.location.origin}/checkout/success?orden_id=${id}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${window.location.origin}/checkout/cancel?orden_id=${id}`;
    this.paymentService.createStripeCheckoutSession({ orden_id: id, success_url: successUrl, cancel_url: cancelUrl }).subscribe({
      next: res => {
        this.isProcessing.set(false);
        if (res.checkout_url && res.checkout_url.startsWith('http')) {
          window.location.href = res.checkout_url;
        } else {
          this.toast.error('Stripe no devolvió una URL de pago válida.');
        }
      },
      error: err => {
        this.isProcessing.set(false);
        this.toast.error(err.error?.detail || 'No se pudo reintentar el pago. La orden puede ya estar pagada o cancelada.');
      }
    });
  }

  restoreCart(): void {
    const id = this.orderId();
    if (!id || this.isProcessing()) return;
    this.isProcessing.set(true);
    this.orderService.restoreCartFromOrder(id).subscribe({
      next: () => {
        this.isProcessing.set(false);
        this.toast.success('Prendas devueltas a tu carrito.');
        this.router.navigate(['/cart']);
      },
      error: err => {
        this.isProcessing.set(false);
        this.toast.error(err.error?.detail || 'No se pudo devolver al carrito.');
      }
    });
  }
}
