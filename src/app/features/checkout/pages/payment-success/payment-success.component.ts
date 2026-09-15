import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderService } from '../../../../core/services/order.service';
import { CartService } from '../../../../core/services/cart.service';
import { PaymentService } from '../../../../core/services/payment.service';
import { Orden } from '../../../../core/models/cart.model';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="success-page">
      <div class="container py-8">
        <div class="success-card card animate-fade-in">
          <div class="success-icon-box">
            <i class="ri-checkbox-circle-fill success-icon"></i>
          </div>

          <h1 class="success-title">¡Pago Realizado con Éxito!</h1>
          <p class="success-subtitle">
            Gracias por tu compra. Hemos recibido tu pago y estamos preparando tus prendas.
          </p>

          @if (order) {
            <div class="order-info-box">
              <div class="info-row">
                <span class="info-label">Número de Orden:</span>
                <span class="info-val order-num">{{ order.numero_orden }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Fecha:</span>
                <span class="info-val">{{ order.fecha | date:'medium' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Total Pagado:</span>
                <span class="info-val total-price">Bs. {{ order.total | number:'1.2-2' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Estado:</span>
                <span class="badge badge-success">{{ order.estado }}</span>
              </div>
            </div>

            <!-- Order Items Mini-list -->
            <div class="items-summary-box">
              <h4 class="items-title">Prendas Adquiridas</h4>
              @for (det of order.detalles; track det.id) {
                <div class="item-summary-row">
                  <span>{{ det.cantidad }}x {{ det.variante_producto?.producto?.nombre || 'Prenda' }}</span>
                  <span class="font-bold">Bs. {{ det.subtotal | number:'1.2-2' }}</span>
                </div>
              }
            </div>
          }

          <div class="actions-group">
            <a routerLink="/catalog" class="btn btn-primary btn-lg">
              <i class="ri-store-2-line"></i> Seguir Comprando
            </a>
            <a routerLink="/home" class="btn btn-outline btn-lg">
              <i class="ri-home-5-line"></i> Ir al Inicio
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .success-page {
      min-height: 100vh;
      background-color: var(--bg-main);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem 0;
    }

    .success-card {
      max-width: 600px;
      margin: 0 auto;
      text-align: center;
      padding: 3rem 2rem;
      border-radius: var(--radius-xl);
    }

    .success-icon-box {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: var(--success-bg);
      color: var(--success);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }

    .success-icon {
      font-size: 3rem;
    }

    .success-title {
      font-size: 1.85rem;
      font-weight: 800;
      color: var(--primary);
      margin-bottom: 0.5rem;
    }

    .success-subtitle {
      color: var(--text-muted);
      font-size: 0.9375rem;
      margin-bottom: 2rem;
      line-height: 1.5;
    }

    .order-info-box {
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      text-align: left;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.35rem 0;
      font-size: 0.875rem;
    }

    .info-label {
      color: var(--text-muted);
      font-weight: 600;
    }

    .order-num {
      font-family: monospace;
      font-weight: 700;
      color: var(--primary);
    }

    .total-price {
      font-weight: 800;
      color: var(--accent);
      font-size: 1.1rem;
    }

    .items-summary-box {
      background: white;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      padding: 1rem;
      margin-bottom: 2rem;
      text-align: left;
    }

    .items-title {
      font-size: 0.8125rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
    }

    .item-summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
      padding: 0.35rem 0;
      border-bottom: 1px dashed var(--border-light);
      &:last-child { border-bottom: none; }
    }

    .font-bold { font-weight: 700; }

    .actions-group {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    @media (max-width: 600px) {
      .actions-group { flex-direction: column; }
    }
  `]
})
export class PaymentSuccessComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);
  private cartService = inject(CartService);
  private paymentService = inject(PaymentService);

  public order: Orden | null = null;

  ngOnInit(): void {
    // Clear the cart on successful checkout
    this.cartService.loadCart().subscribe();

    this.route.queryParams.subscribe(params => {
      const orderId = Number(params['orden_id']);
      const sessionId = params['session_id'];
      const paypalOrderId = params['paypal_order_id'];

      if (!orderId) {
        return;
      }

      // Confirmar el pago con el backend:
      // - Stripe: POST /pagos/stripe/confirmar-retorno (respaldado por el webhook en producción)
      // - PayPal: POST /pagos/paypal/capturar
      const confirm$ = sessionId
        ? this.paymentService.confirmarStripeRetorno(sessionId, orderId)
        : paypalOrderId
          ? this.paymentService.capturePayPalOrder({ paypal_order_id: paypalOrderId, orden_id: orderId })
          : null;

      const loadOrder = () => this.loadOrder(orderId);

      if (confirm$) {
        confirm$.subscribe({
          next: () => loadOrder(),
          error: () => loadOrder() // El webhook puede marcarla; cargamos igual
        });
      } else {
        loadOrder();
      }
    });
  }

  private loadOrder(orderId: number): void {
    this.orderService.getOrderById(orderId).subscribe({
      next: (ord) => {
        this.order = ord;
      }
    });
  }
}
