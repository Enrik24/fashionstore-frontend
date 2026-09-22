import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../../../core/services/cart.service';
import { OrderService } from '../../../../core/services/order.service';
import { PaymentService } from '../../../../core/services/payment.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { Sucursal } from '../../../../core/models/branch.model';
import { Orden } from '../../../../core/models/cart.model';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="checkout-page">
      <div class="container py-8">
        <div class="checkout-header">
          <h1 class="checkout-title">
            <i class="ri-shield-check-line"></i> Finalizar Compra
          </h1>
          <p class="checkout-subtitle">Completa los datos de envío y selecciona tu método de pago preferido.</p>
        </div>

        @if (!cartService.cartSignal() || cartService.cartSignal()?.items?.length === 0) {
          <div class="empty-cart card">
            <p>No tienes productos en tu carrito para procesar una compra.</p>
            <a routerLink="/catalog" class="btn btn-primary btn-sm">Ir al Catálogo</a>
          </div>
        } @else {
          <div class="checkout-grid">
            <!-- Left: Form Steps -->
            <div class="checkout-form-col">
              <!-- Step 1: Delivery Mode -->
              <div class="step-card card">
                <div class="step-header">
                  <span class="step-number">1</span>
                  <h3 class="step-title">Método de Entrega</h3>
                </div>

                <div class="delivery-options">
                  <label class="delivery-option-card" [class.selected]="deliveryType === 'SHIPPING'">
                    <input type="radio" name="deliveryType" value="SHIPPING" [(ngModel)]="deliveryType" />
                    <div class="option-content">
                      <i class="ri-truck-line option-icon"></i>
                      <div>
                        <strong>Envío a Domicilio</strong>
                        <span>Entrega directa en tu dirección</span>
                      </div>
                    </div>
                  </label>

                  <label class="delivery-option-card" [class.selected]="deliveryType === 'PICKUP'">
                    <input type="radio" name="deliveryType" value="PICKUP" [(ngModel)]="deliveryType" />
                    <div class="option-content">
                      <i class="ri-store-2-line option-icon"></i>
                      <div>
                        <strong>Retiro en Sucursal</strong>
                        <span>Recógelo en cualquiera de nuestras tiendas</span>
                      </div>
                    </div>
                  </label>
                </div>

                @if (deliveryType === 'SHIPPING') {
                  <div class="form-group mt-4">
                    <label class="form-label">Dirección de Entrega Completa <span class="required">*</span></label>
                    <textarea 
                      class="form-control" 
                      rows="3" 
                      [(ngModel)]="shippingAddress" 
                      placeholder="Calle, número, zona, referencias, ciudad..."
                    ></textarea>
                  </div>
                } @else {
                  <div class="form-group mt-4">
                    <label class="form-label">Seleccionar Sucursal de Retiro <span class="required">*</span></label>
                    <select class="form-control" [(ngModel)]="selectedBranchId">
                      <option [ngValue]="undefined">-- Selecciona una sucursal --</option>
                      @for (branch of branches; track branch.id) {
                        <option [ngValue]="branch.id">{{ branch.nombre }} - {{ branch.direccion }}</option>
                      }
                    </select>
                  </div>
                }
              </div>

              <!-- Step 2: Payment Method -->
              <div class="step-card card">
                <div class="step-header">
                  <span class="step-number">2</span>
                  <h3 class="step-title">Método de Pago Digital</h3>
                </div>

                <div class="payment-methods-grid">
                  <label class="payment-card" [class.selected]="paymentMethod === 'STRIPE'">
                    <input type="radio" name="paymentMethod" value="STRIPE" [(ngModel)]="paymentMethod" />
                    <div class="payment-content">
                      <div class="payment-logo stripe-logo">
                        <i class="ri-bank-card-fill"></i>
                        <span>Tarjeta de Crédito / Débito (Stripe)</span>
                      </div>
                      <span class="payment-desc">Visa, Mastercard, American Express</span>
                    </div>
                  </label>

                  <label class="payment-card" [class.selected]="paymentMethod === 'PAYPAL'">
                    <input type="radio" name="paymentMethod" value="PAYPAL" [(ngModel)]="paymentMethod" />
                    <div class="payment-content">
                      <div class="payment-logo paypal-logo">
                        <i class="ri-paypal-fill"></i>
                        <span>PayPal Checkout</span>
                      </div>
                      <span class="payment-desc">Paga seguro con tu cuenta de PayPal</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <!-- Right: Order Summary & Place Order -->
            <div class="checkout-summary-col">
              <!-- CU27: bloque de cupón en checkout -->
              <div class="coupon-card card">
                <h3 class="summary-title">
                  <i class="ri-coupon-3-line"></i> ¿Tienes un Cupón?
                </h3>

                @if (cartService.cartSignal()?.cupon) {
                  <div class="applied-coupon-badge">
                    <i class="ri-check-line"></i>
                    <span>Cupón activo: <strong>{{ cartService.cartSignal()?.cupon?.codigo }}</strong></span>
                    <button
                      type="button"
                      class="remove-coupon-btn"
                      title="Quitar cupón del carrito"
                      [disabled]="removingCoupon"
                      (click)="removeCoupon()"
                    >
                      <i class="ri-close-line"></i>
                    </button>
                  </div>
                } @else {
                  <p class="coupon-hint">Ingresa tu código promocional para obtener descuentos adicionales.</p>
                  <div class="coupon-input-group secondary">
                    <input
                      type="text"
                      class="form-control"
                      placeholder="Código (ej. VERANO20)"
                      [(ngModel)]="couponCode"
                      (keyup.enter)="applyCoupon()"
                    />
                    <button
                      class="btn btn-primary"
                      [disabled]="!couponCode || applyingCoupon"
                      (click)="applyCoupon()"
                    >
                      @if (applyingCoupon) {
                        <i class="ri-loader-4-line spin-icon"></i>
                      } @else {
                        Aplicar
                      }
                    </button>
                  </div>
                  @if (couponError()) {
                    <div class="coupon-error">
                      <i class="ri-error-warning-line"></i> {{ couponError() }}
                    </div>
                  }
                }
              </div>

              <div class="summary-card card">
                <h3 class="summary-title">Resumen de la Orden</h3>

                <div class="checkout-items-preview">
                  @for (item of cartService.cartSignal()?.items; track item.id) {
                    <div class="item-preview-row">
                      <div class="preview-name">
                        <span>{{ item.cantidad }}x {{ item.variante_producto?.producto?.nombre }}</span>
                        <small>{{ item.variante_producto?.talla?.valor || item.variante_producto?.talla?.nombre }} / {{ item.variante_producto?.color?.nombre }}</small>
                      </div>
                      <span class="preview-price">Bs. {{ item.subtotal | number:'1.2-2' }}</span>
                    </div>
                  }
                </div>

                <div class="divider"></div>

                <div class="summary-calc">
                  <div class="calc-row">
                    <span>Subtotal</span>
                    <span>Bs. {{ cartService.subtotalSignal() | number:'1.2-2' }}</span>
                  </div>
                  @if (cartService.discountSignal() > 0) {
                    <div class="calc-row discount">
                      <span>
                        Descuento cupón
                        @if (cartService.cartSignal()?.cupon) {
                          <span class="coupon-code">({{ cartService.cartSignal()?.cupon?.codigo }})</span>
                        }
                      </span>
                      <span>- Bs. {{ cartService.discountSignal() | number:'1.2-2' }}</span>
                    </div>
                  }
                  <div class="calc-row">
                    <span>Envío</span>
                    <span class="free-text">GRATIS</span>
                  </div>
                  <div class="divider"></div>
                  <div class="calc-row total">
                    <span>Total Final</span>
                    <span class="total-val">Bs. {{ cartService.totalSignal() | number:'1.2-2' }}</span>
                  </div>
                </div>

                <button 
                  class="btn btn-accent btn-lg btn-pay" 
                  [disabled]="processingPayment || !isFormValid()"
                  (click)="processCheckout()"
                >
                  @if (processingPayment) {
                    <i class="ri-loader-4-line spin-icon"></i> Procesando Pago...
                  } @else {
                    <i class="ri-lock-line"></i> Pagar Bs. {{ cartService.totalSignal() | number:'1.2-2' }}
                  }
                </button>

                <div class="secure-badge">
                  <i class="ri-shield-check-fill"></i>
                  <span>Pagos procesados con encriptación de 256 bits</span>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .checkout-page {
      min-height: 100vh;
      background-color: var(--bg-main);
      padding-bottom: 4rem;
    }

    .py-8 {
      padding-top: 2rem;
      padding-bottom: 2rem;
    }

    .checkout-header {
      margin-bottom: 2rem;
    }

    .checkout-title {
      font-size: 2rem;
      font-weight: 800;
      color: var(--primary);
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .checkout-subtitle {
      color: var(--text-muted);
      font-size: 0.9375rem;
    }

    .checkout-grid {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 2rem;
      align-items: start;
    }

    .checkout-form-col {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .step-card {
      padding: 1.75rem;
    }

    .step-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    .step-number {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--accent);
      color: white;
      font-weight: 800;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .step-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--primary);
    }

    .delivery-options, .payment-methods-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .delivery-option-card, .payment-card {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      border: 1.5px solid var(--border-color);
      border-radius: var(--radius-md);
      cursor: pointer;
      background: white;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--primary);
      }

      &.selected {
        border-color: var(--accent);
        background: rgba(225, 29, 72, 0.03);
      }

      input {
        margin-top: 0.25rem;
        cursor: pointer;
      }
    }

    .option-content, .payment-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;

      strong {
        color: var(--primary);
        font-size: 0.9375rem;
      }

      span {
        color: var(--text-muted);
        font-size: 0.75rem;
      }
    }

    .option-icon {
      font-size: 1.5rem;
      color: var(--accent);
      margin-bottom: 0.25rem;
    }

    .payment-logo {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-weight: 700;
      color: var(--primary);
      font-size: 0.875rem;

      i { font-size: 1.25rem; color: var(--accent); }
    }

    .mt-4 { margin-top: 1rem; }

    .summary-card {
      padding: 1.5rem;
    }

    /* CU27: bloque de cupón en checkout */
    .coupon-card {
      padding: 1.5rem;
      margin-bottom: 1.25rem;
    }

    .coupon-hint {
      font-size: 0.8125rem;
      color: var(--text-muted);
      margin: 0 0 0.6rem 0;
    }

    .coupon-input-group.secondary {
      display: flex;
      gap: 0.5rem;
    }

    .applied-coupon-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--success);
      margin: 0;
    }

    .remove-coupon-btn {
      margin-left: auto;
      border: none;
      background: none;
      color: inherit;
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
      padding: 0.15rem;
      border-radius: 6px;

      &:hover { background: rgba(0, 0, 0, 0.06); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .coupon-code {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .coupon-error {
      margin-top: 0.6rem;
      font-size: 0.8125rem;
      color: var(--danger, #e11d48);
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .summary-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 1rem;
    }

    .checkout-items-preview {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-height: 200px;
      overflow-y: auto;
    }

    .item-preview-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
    }

    .preview-name {
      display: flex;
      flex-direction: column;
      color: var(--primary);
      font-weight: 600;

      small { color: var(--text-muted); font-size: 0.75rem; }
    }

    .preview-price {
      font-weight: 700;
      color: var(--primary);
    }

    .divider {
      height: 1px;
      background-color: var(--border-light);
      margin: 1rem 0;
    }

    .summary-calc {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .calc-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.9375rem;
      color: var(--secondary);

      &.discount { color: var(--success); font-weight: 600; }
      &.total {
        font-size: 1.15rem;
        font-weight: 800;
        color: var(--primary);
      }
    }

    .free-text {
      color: var(--success);
      font-weight: 700;
      font-size: 0.8125rem;
    }

    .total-val {
      color: var(--accent);
      font-size: 1.35rem;
      font-family: 'Outfit', sans-serif;
    }

    .btn-pay {
      width: 100%;
    }

    .secure-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 1rem;

      i { color: var(--success); }
    }

    .spin-icon { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    @media (max-width: 900px) {
      .checkout-grid { grid-template-columns: 1fr; }
      .delivery-options, .payment-methods-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class CheckoutPageComponent implements OnInit {
  public cartService = inject(CartService);
  private orderService = inject(OrderService);
  private paymentService = inject(PaymentService);
  private branchService = inject(BranchApiService);
  private toast = inject(ToastService);
  private authService = inject(AuthService);
  private router = inject(Router);

  public deliveryType: 'SHIPPING' | 'PICKUP' = 'SHIPPING';
  public shippingAddress: string = '';
  public selectedBranchId?: number;
  public paymentMethod: 'STRIPE' | 'PAYPAL' = 'STRIPE';
  public branches: Sucursal[] = [];
  public processingPayment: boolean = false;

  /** CU27: estado del bloque de cupón en checkout. */
  public couponCode: string = '';
  public applyingCoupon: boolean = false;
  public removingCoupon: boolean = false;
  public couponError = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.toast.info('Inicia sesión para proceder con el pago');
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }

    this.branchService.getBranches().subscribe(branches => {
      this.branches = branches.filter(b => b.estado === 'ACTIVO');
    });

    const user = this.authService.currentUserSignal();
    if (user && user.nombre) {
      this.shippingAddress = 'Dirección de entrega principal del cliente';
    }
  }

  isFormValid(): boolean {
    if (this.deliveryType === 'SHIPPING' && !this.shippingAddress.trim()) {
      return false;
    }
    if (this.deliveryType === 'PICKUP' && !this.selectedBranchId) {
      return false;
    }
    return true;
  }

  /** CU27: aplica el cupón digitado usando el mismo flujo del carrito. */
  applyCoupon(): void {
    if (!this.couponCode.trim()) return;

    this.applyingCoupon = true;
    this.couponError.set(null);

    this.cartService.applyCoupon(this.couponCode.trim()).subscribe({
      next: () => {
        this.applyingCoupon = false;
        this.couponCode = '';
      },
      error: (err) => {
        this.applyingCoupon = false;
        const msg = typeof err?.error?.detail === 'string'
          ? err.error.detail
          : 'Cupón inválido o no aplicable';
        this.couponError.set(msg);
      }
    });
  }

  /** CU27: quita el cupón aplicado y restaura el total original. */
  removeCoupon(): void {
    this.removingCoupon = true;
    this.couponError.set(null);

    this.cartService.removeCoupon().subscribe({
      next: () => {
        this.removingCoupon = false;
      },
      error: () => {
        this.removingCoupon = false;
      }
    });
  }

  processCheckout(): void {
    if (!this.isFormValid()) {
      this.toast.warning('Por favor completa todos los campos de entrega');
      return;
    }

    this.processingPayment = true;

    // 1. Create order from cart
    this.orderService.createOrderFromCart({
      sucursal_id: this.deliveryType === 'PICKUP' ? this.selectedBranchId : undefined,
      direccion_envio: this.deliveryType === 'SHIPPING' ? this.shippingAddress : undefined,
      tipo: 'DIGITAL'
    }).subscribe({
      next: (order: Orden) => {
        // 2. Trigger Payment Gateway
        if (this.paymentMethod === 'STRIPE') {
          this.initiateStripePayment(order);
        } else {
          this.initiatePayPalPayment(order);
        }
      },
      error: (err) => {
        this.processingPayment = false;
        const msg = err.error?.detail || 'Error al procesar la orden';
        this.toast.error(msg);
      }
    });
  }

  private initiateStripePayment(order: Orden): void {
    const successUrl = `${window.location.origin}/checkout/success?orden_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${window.location.origin}/checkout/cancel?orden_id=${order.id}`;

    this.paymentService.createStripeCheckoutSession({
      orden_id: order.id,
      success_url: successUrl,
      cancel_url: cancelUrl
    }).subscribe({
      next: (res) => {
        this.processingPayment = false;
        if (res.checkout_url && res.checkout_url.startsWith('http')) {
          window.location.href = res.checkout_url;
        } else {
          // Simulation / Direct mock redirect
          this.router.navigate(['/checkout/success'], { 
            queryParams: { orden_id: order.id, session_id: res.session_id || 'mock_session' } 
          });
        }
      },
      error: (err) => {
        this.processingPayment = false;
        const msg = err.error?.detail || 'Error al conectar con Stripe';
        this.toast.error(msg);
      }
    });
  }

  private initiatePayPalPayment(order: Orden): void {
    const returnUrl = `${window.location.origin}/checkout/success?orden_id=${order.id}&paypal_order_id={PAYPAL_ORDER_ID}`;
    const cancelUrl = `${window.location.origin}/checkout/cancel?orden_id=${order.id}`;

    this.paymentService.createPayPalOrder({
      orden_id: order.id,
      return_url: returnUrl,
      cancel_url: cancelUrl
    }).subscribe({
      next: (res) => {
        this.processingPayment = false;
        if (res.approve_url && res.approve_url.startsWith('http')) {
          window.location.href = res.approve_url;
        } else {
          // Simulation
          this.router.navigate(['/checkout/success'], {
            queryParams: { orden_id: order.id, paypal_order_id: res.order_id || 'mock_paypal_order' }
          });
        }
      },
      error: (err) => {
        this.processingPayment = false;
        const msg = err.error?.detail || 'Error al conectar con PayPal';
        this.toast.error(msg);
      }
    });
  }
}
