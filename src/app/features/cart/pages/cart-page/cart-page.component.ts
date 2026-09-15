import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CartService } from '../../../../core/services/cart.service';
import { ItemCarrito } from '../../../../core/models/cart.model';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="cart-page">
      <div class="container py-8">
        <div class="page-header">
          <h1 class="page-title">
            <i class="ri-shopping-cart-2-line"></i> Tu Carrito de Compras
          </h1>
          <p class="page-subtitle">Revisa tus prendas seleccionadas antes de proceder al pago seguro.</p>
        </div>

        @if (cartService.loadingSignal() && !cartService.cartSignal()) {
          <div class="loading-state">
            <i class="ri-loader-4-line spin-icon"></i>
            <span>Cargando tu carrito...</span>
          </div>
        } @else if (!cartService.cartSignal() || cartService.cartSignal()?.items?.length === 0) {
          <!-- Empty Cart -->
          <div class="empty-cart card">
            <div class="empty-cart-icon">
              <i class="ri-shopping-bag-line"></i>
            </div>
            <h2>Tu carrito está vacío</h2>
            <p>Parece que aún no has añadido ninguna prenda. Explora nuestras últimas colecciones y tendencias.</p>
            <a routerLink="/catalog" class="btn btn-accent btn-lg">
              <i class="ri-store-2-line"></i> Explorar Catálogo
            </a>
          </div>
        } @else {
          <!-- Cart Grid -->
          <div class="cart-grid">
            <!-- Left: Items Table -->
            <div class="cart-items-section">
              <div class="cart-table-card card">
                <div class="table-header-row">
                  <span class="th-prod">Prenda</span>
                  <span class="th-price">Precio</span>
                  <span class="th-qty">Cantidad</span>
                  <span class="th-sub">Subtotal</span>
                  <span class="th-act"></span>
                </div>

                <div class="items-list">
                  @for (item of cartService.cartSignal()?.items; track item.id) {
                    <div class="item-row">
                      <!-- Product Info -->
                      <div class="item-product">
                        <img 
                          [src]="getProductImage(item)" 
                          [alt]="item.variante_producto?.producto?.nombre || 'Producto'" 
                          class="item-img"
                          (error)="handleImageError($event)"
                        />
                        <div class="item-info">
                          <h4 class="item-name">
                            {{ item.variante_producto?.producto?.nombre || 'Prenda de Moda' }}
                          </h4>
                          <span class="item-sku">SKU: {{ item.variante_producto?.sku_variante }}</span>
                          <div class="item-tags">
                            @if (item.variante_producto?.talla) {
                              <span class="badge badge-primary">Talla: {{ item.variante_producto?.talla?.valor || item.variante_producto?.talla?.nombre }}</span>
                            }
                            @if (item.variante_producto?.color) {
                              <span class="badge badge-info">Color: {{ item.variante_producto?.color?.nombre }}</span>
                            }
                          </div>
                        </div>
                      </div>

                      <!-- Price -->
                      <div class="item-price">
                        <span class="currency">Bs.</span> {{ item.precio_unitario | number:'1.2-2' }}
                      </div>

                      <!-- Quantity Controls -->
                      <div class="item-qty">
                        <div class="qty-picker">
                          <button 
                            class="btn-qty" 
                            (click)="updateQuantity(item, item.cantidad - 1)"
                            [disabled]="item.cantidad <= 1"
                          >
                            -
                          </button>
                          <span class="qty-val">{{ item.cantidad }}</span>
                          <button 
                            class="btn-qty" 
                            (click)="updateQuantity(item, item.cantidad + 1)"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <!-- Subtotal -->
                      <div class="item-subtotal">
                        <span class="currency">Bs.</span> {{ item.subtotal | number:'1.2-2' }}
                      </div>

                      <!-- Remove -->
                      <div class="item-actions">
                        <button 
                          class="btn-remove" 
                          (click)="removeItem(item)" 
                          title="Eliminar del carrito"
                        >
                          <i class="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    </div>
                  }
                </div>

                <!-- Footer Actions -->
                <div class="cart-actions-footer">
                  <a routerLink="/catalog" class="btn btn-outline btn-sm">
                    <i class="ri-arrow-left-line"></i> Seguir Comprando
                  </a>
                  <button class="btn btn-danger btn-sm" (click)="clearCart()">
                    <i class="ri-delete-bin-7-line"></i> Vaciar Carrito
                  </button>
                </div>
              </div>
            </div>

            <!-- Right: Summary & Coupon -->
            <div class="cart-summary-section">
              <!-- Coupon Card -->
              <div class="coupon-card card">
                <h3 class="summary-title">
                  <i class="ri-coupon-3-line"></i> Cupón de Descuento
                </h3>
                <div class="coupon-input-group">
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
                @if (cartService.cartSignal()?.cupon) {
                  <div class="applied-coupon-badge">
                    <i class="ri-check-line"></i> Cupón activo: <strong>{{ cartService.cartSignal()?.cupon?.codigo }}</strong>
                  </div>
                }
              </div>

              <!-- Order Summary Card -->
              <div class="summary-card card">
                <h3 class="summary-title">Resumen del Pedido</h3>

                <div class="summary-rows">
                  <div class="summary-row">
                    <span class="row-label">Subtotal</span>
                    <span class="row-val">Bs. {{ cartService.subtotalSignal() | number:'1.2-2' }}</span>
                  </div>

                  @if (cartService.discountSignal() > 0) {
                    <div class="summary-row discount-row">
                      <span class="row-label">Descuento aplicado</span>
                      <span class="row-val">- Bs. {{ cartService.discountSignal() | number:'1.2-2' }}</span>
                    </div>
                  }

                  <div class="summary-row">
                    <span class="row-label">Envío</span>
                    <span class="row-val free-shipping">Calculado al finalizar</span>
                  </div>

                  <div class="divider"></div>

                  <div class="summary-row total-row">
                    <span class="row-label">Total a Pagar</span>
                    <span class="row-val total-amount">
                      Bs. {{ cartService.totalSignal() | number:'1.2-2' }}
                    </span>
                  </div>
                </div>

                <a routerLink="/checkout" class="btn btn-accent btn-lg btn-checkout">
                  <i class="ri-shield-check-line"></i> Proceder al Pago Seguro
                </a>

                <div class="security-guarantee">
                  <i class="ri-lock-2-line"></i>
                  <span>Transacción 100% segura y encriptada SSL</span>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .cart-page {
      min-height: 100vh;
      background-color: var(--bg-main);
      padding-bottom: 4rem;
    }

    .py-8 {
      padding-top: 2rem;
      padding-bottom: 2rem;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .page-title {
      font-size: 2rem;
      font-weight: 800;
      color: var(--primary);
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .page-subtitle {
      color: var(--text-muted);
      font-size: 0.9375rem;
      margin-top: 0.25rem;
    }

    .empty-cart {
      padding: 4rem 2rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      max-width: 600px;
      margin: 2rem auto;

      .empty-cart-icon {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.5rem;
        color: var(--text-muted);
        margin-bottom: 0.5rem;
      }

      h2 {
        font-size: 1.5rem;
        color: var(--primary);
      }

      p {
        color: var(--text-muted);
        margin-bottom: 1rem;
      }
    }

    .cart-grid {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 2rem;
      align-items: start;
    }

    .cart-table-card {
      padding: 1.5rem;
    }

    .table-header-row {
      display: grid;
      grid-template-columns: 3fr 1fr 1.2fr 1fr 40px;
      padding-bottom: 0.75rem;
      border-bottom: 1.5px solid var(--border-color);
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .items-list {
      display: flex;
      flex-direction: column;
    }

    .item-row {
      display: grid;
      grid-template-columns: 3fr 1fr 1.2fr 1fr 40px;
      align-items: center;
      padding: 1.25rem 0;
      border-bottom: 1px solid var(--border-light);
    }

    .item-product {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .item-img {
      width: 64px;
      height: 64px;
      border-radius: var(--radius-md);
      object-fit: cover;
    }

    .item-name {
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--primary);
    }

    .item-sku {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-family: monospace;
      display: block;
    }

    .item-tags {
      display: flex;
      gap: 0.35rem;
      margin-top: 0.25rem;
    }

    .item-price, .item-subtotal {
      font-weight: 700;
      color: var(--primary);
      font-size: 0.9375rem;
    }

    .item-subtotal {
      color: var(--accent);
    }

    .qty-picker {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: white;
    }

    .btn-qty {
      width: 28px;
      height: 28px;
      border: none;
      background: none;
      cursor: pointer;
      font-weight: 700;
      color: var(--primary);
      &:hover:not(:disabled) { background: #f1f5f9; }
      &:disabled { opacity: 0.3; }
    }

    .qty-val {
      padding: 0 0.5rem;
      font-size: 0.875rem;
      font-weight: 700;
    }

    .btn-remove {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 1.15rem;
      cursor: pointer;
      &:hover { color: var(--error); }
    }

    .cart-actions-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1.5rem;
    }

    .cart-summary-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .coupon-card, .summary-card {
      padding: 1.5rem;
    }

    .summary-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .coupon-input-group {
      display: flex;
      gap: 0.5rem;
    }

    .applied-coupon-badge {
      margin-top: 0.75rem;
      font-size: 0.8125rem;
      color: var(--success);
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .summary-rows {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.9375rem;
      color: var(--secondary);
    }

    .discount-row {
      color: var(--success);
      font-weight: 600;
    }

    .free-shipping {
      color: var(--text-muted);
      font-size: 0.8125rem;
    }

    .divider {
      height: 1px;
      background-color: var(--border-light);
      margin: 0.5rem 0;
    }

    .total-row {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--primary);
    }

    .total-amount {
      color: var(--accent);
      font-size: 1.35rem;
      font-family: 'Outfit', sans-serif;
    }

    .btn-checkout {
      width: 100%;
      text-align: center;
    }

    .security-guarantee {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 1rem;
    }

    .spin-icon { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    @media (max-width: 992px) {
      .cart-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class CartPageComponent implements OnInit {
  public cartService = inject(CartService);
  private router = inject(Router);

  public couponCode: string = '';
  public applyingCoupon: boolean = false;
  readonly DEFAULT_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=400&auto=format&fit=crop';

  ngOnInit(): void {
    this.cartService.loadCart().subscribe();
  }

  getProductImage(item: ItemCarrito): string {
    const imgs = item?.variante_producto?.producto?.imagenes;
    if (Array.isArray(imgs) && imgs.length > 0 && imgs[0]) {
      return imgs[0];
    }
    return this.DEFAULT_PRODUCT_IMAGE;
  }

  handleImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = this.DEFAULT_PRODUCT_IMAGE;
    }
  }

  updateQuantity(item: ItemCarrito, newQty: number): void {
    if (newQty < 1) return;
    this.cartService.updateItemQuantity(item.id, newQty).subscribe();
  }

  removeItem(item: ItemCarrito): void {
    this.cartService.removeItem(item.id).subscribe();
  }

  clearCart(): void {
    if (confirm('¿Estás seguro de que deseas vaciar tu carrito?')) {
      this.cartService.clearCart().subscribe();
    }
  }

  applyCoupon(): void {
    if (!this.couponCode.trim()) return;
    this.applyingCoupon = true;
    this.cartService.applyCoupon(this.couponCode.trim()).subscribe({
      next: () => {
        this.applyingCoupon = false;
        this.couponCode = '';
      },
      error: () => {
        this.applyingCoupon = false;
      }
    });
  }
}
