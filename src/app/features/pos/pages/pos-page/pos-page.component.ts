import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { QRCodeModule } from 'angularx-qrcode';
import { PosService } from '../../../../core/services/pos.service';
import { PublicCatalogService } from '../../../../core/services/public-catalog.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { PromotionApiService } from '../../../../core/services/promotion-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Producto, VarianteProducto } from '../../../../core/models/catalog.model';
import { Sucursal } from '../../../../core/models/branch.model';
import { Inventario } from '../../../../core/models/inventory.model';
import { MetodoPagoPresencial, VentaPresencial } from '../../../../core/models/cart.model';
import { ClientProfile } from '../../../../core/models/user.model';
import { PromocionPublica } from '../../../../core/models/promotion.model';

interface PosItem {
  variant: VarianteProducto;
  product: Producto;
  cantidad: number;
  /** Precio base de catálogo (sin promoción). */
  precio_base: number;
  /** Precio unitario con promoción aplicada (es lo que se cobra y se registra). */
  precio_unitario: number;
  subtotal: number;
  promoNombre?: string;
}

@Component({
  selector: 'app-pos-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, QRCodeModule],
  template: `
    <div class="pos-layout">
      <!-- Topbar -->
      <header class="pos-topbar glass">
        <div class="pos-brand">
          <div class="pos-logo">
            <i class="ri-computer-line"></i>
          </div>
          <div>
            <h2 class="pos-title">Punto de Venta (POS Cajero)</h2>
            <span class="pos-tag">FASHIONSTORE TERMINAL</span>
          </div>
        </div>

        <div class="pos-branch-select">
          <label class="pos-label">Sucursal:</label>
          <select 
            class="form-control form-control-sm" 
            [(ngModel)]="selectedBranchId" 
            (change)="onBranchChange()"
            [disabled]="branches.length === 0"
          >
            @for (branch of branches; track branch.id) {
              <option [ngValue]="branch.id">{{ branch.nombre }}</option>
            }
          </select>
          @if (loadingBranchStock) {
            <i class="ri-loader-4-line spin-icon branch-loading" title="Consultando stock de la sucursal..."></i>
          }
        </div>

        <div class="pos-actions-top">
          <a routerLink="/home" class="btn btn-outline btn-sm">
            <i class="ri-store-2-line"></i> Tienda
          </a>
        </div>
      </header>

      <!-- Main POS Grid -->
      <div class="pos-main">
        <!-- Left: Product Catalog / Quick Add -->
        <div class="pos-catalog-panel">
          <!-- Search box -->
          <div class="pos-search-box card">
            <i class="ri-search-line search-icon"></i>
            <input 
              type="text" 
              class="form-control" 
              placeholder="Buscar por nombre o SKU de prenda..." 
              [(ngModel)]="searchQuery" 
              (keyup.enter)="searchProducts()"
            />
            <button class="btn btn-primary btn-sm" (click)="searchProducts()">Buscar</button>
          </div>
          <div class="genero-filter-row">
            <span class="genero-filter-label">Sección:</span>
            <button type="button" class="genero-filter-btn" [class.active]="!filtroGenero" (click)="setFiltroGenero(null)">Todos</button>
            <button type="button" class="genero-filter-btn" [class.active]="filtroGenero === 'HOMBRE'" (click)="setFiltroGenero('HOMBRE')"><i class="ri-men-line"></i> Hombre</button>
            <button type="button" class="genero-filter-btn" [class.active]="filtroGenero === 'MUJER'" (click)="setFiltroGenero('MUJER')"><i class="ri-women-line"></i> Mujer</button>
            <button type="button" class="genero-filter-btn" [class.active]="filtroGenero === 'UNISEX'" (click)="setFiltroGenero('UNISEX')"><i class="ri-group-line"></i> Unisex</button>
          </div>

          <!-- Products Grid -->
          @if (promociones.length > 0) {
            <div class="promo-strip card">
              <div class="promo-strip-title"><i class="ri-price-tag-3-line"></i> Promociones activas en {{ selectedBranchName }}</div>
              <div class="promo-chips">
                @for (p of promociones; track p.id) {
                  <span class="promo-chip" [title]="p.descripcion || p.nombre">
                    <strong>{{ etiquetaPromo(p) }}</strong> {{ p.nombre }}
                  </span>
                }
              </div>
            </div>
          }
          <div class="pos-products-grid">
            @for (prod of products; track prod.id) {
              <div class="pos-prod-card card" (click)="selectProductForVariants(prod)">
                <img [src]="prod.imagenes[0] || 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=400&auto=format&fit=crop'" [alt]="prod.nombre" class="prod-thumbnail" />
                @if (etiquetaProducto(prod)) {
                  <span class="promo-badge">{{ etiquetaProducto(prod) }}</span>
                }
                <div class="prod-meta">
                  <span class="prod-sku">{{ prod.sku }}</span>
                  <h4 class="prod-name">{{ prod.nombre }}</h4>
                  <span class="genero-badge" [ngClass]="generoClass(prod.genero)">
                    <i [class]="generoIcon(prod.genero)"></i> {{ generoLabel(prod.genero) }}
                  </span>
                  <span class="prod-price">
                    Bs. {{ precioPromoProducto(prod) | number:'1.2-2' }}
                    @if (tienePromoPrecio(prod)) {
                      <s class="prod-old-price">Bs. {{ prod.precio | number:'1.2-2' }}</s>
                    }
                  </span>
                  @if (getProductStock(prod) !== null) {
                    <span class="prod-stock" [ngClass]="getProductStock(prod) === 0 ? 'text-error' : 'text-success'">
                      <i class="ri-archive-line"></i> {{ getProductStock(prod) }} disp. en sucursal
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Right: Current Sale Ticket -->
        <div class="pos-ticket-panel">
          <div class="ticket-card card">
            <div class="ticket-header">
              <h3 class="ticket-title">
                <i class="ri-receipt-line"></i> Ticket de Venta Actual
              </h3>
              <button class="btn-clear-ticket" (click)="clearTicket()">Limpiar</button>
            </div>

            <!-- Customer Data -->
            <div class="ticket-customer-box">
              <label class="form-label mb-1">Cliente / Facturación</label>
              @if (selectedCustomer) {
                <div class="customer-selected-card">
                  <div class="cust-info">
                    <div class="cust-name">
                      <i class="ri-user-star-fill text-accent"></i>
                      <strong>{{ selectedCustomer.nombre }} {{ selectedCustomer.apellido }}</strong>
                    </div>
                    <div class="cust-details">
                      <span>NIT/CI: <b>{{ selectedCustomer.nit_ci }}</b></span>
                      @if (selectedCustomer.correo) {
                        <span>&bull; {{ selectedCustomer.correo }}</span>
                      }
                    </div>
                  </div>
                  <button type="button" class="btn-clear-cust" (click)="clearCustomer()" title="Remover cliente">
                    <i class="ri-close-line"></i>
                  </button>
                </div>
              } @else {
                <div class="customer-search-group">
                  <input
                    type="text"
                    class="form-control form-control-sm"
                    placeholder="NIT, CI o Nombre (ej. 9876543-1A)"
                    [(ngModel)]="nitCiCliente"
                    (ngModelChange)="guardarTicket()"
                    (keyup.enter)="searchCustomer()"
                  />
                  <button 
                    type="button" 
                    class="btn btn-primary btn-sm btn-search-cust" 
                    (click)="searchCustomer()" 
                    [disabled]="searchingCustomer || !nitCiCliente.trim()"
                  >
                    @if (searchingCustomer) {
                      <i class="ri-loader-4-line spin-icon"></i>
                    } @else {
                      <i class="ri-search-line"></i>
                    }
                  </button>
                </div>
                @if (customerNotFound) {
                  <div class="customer-hint warning">
                    <i class="ri-information-line"></i> Cliente no registrado. Se emitirá a nombre del NIT/CI indicado.
                  </div>
                }
              }
            </div>

            <!-- Items List -->
            <div class="ticket-items-list">
              @if (ticketItems.length === 0) {
                <div class="empty-ticket">
                  <i class="ri-shopping-cart-line"></i>
                  <span>No hay prendas agregadas a la venta</span>
                </div>
              } @else {
                @for (item of ticketItems; track item.variant.id) {
                  <div class="ticket-item-row">
                    <div class="t-item-info">
                      <strong>{{ item.product.nombre }}</strong>
                      <small>{{ item.variant.talla?.valor || item.variant.talla?.nombre || 'Talla única' }} / {{ item.variant.color?.nombre }}</small>
                      @if (item.promoNombre) {
                        <small class="promo-tag"><i class="ri-price-tag-3-line"></i> {{ item.promoNombre }} · <s>Bs. {{ item.precio_base | number:'1.2-2' }}</s></small>
                      }
                      @if (getVariantStock(item.variant.id) !== null) {
                        <small [ngClass]="item.cantidad > (getVariantStock(item.variant.id) || 0) ? 'text-error' : 'text-muted'">
                          Stock en sucursal: {{ getVariantStock(item.variant.id) }}
                        </small>
                      }
                    </div>

                    <div class="t-item-qty">
                      <button class="qty-btn" (click)="changeQty(item, -1)">-</button>
                      <span>{{ item.cantidad }}</span>
                      <button class="qty-btn" (click)="changeQty(item, 1)">+</button>
                    </div>

                    <div class="t-item-price">
                      <span>Bs. {{ item.subtotal | number:'1.2-2' }}</span>
                    </div>

                    <button class="t-item-del" (click)="removeItem(item)">
                      <i class="ri-close-line"></i>
                    </button>
                  </div>
                }
              }
            </div>

            <!-- Totals & Payment Method -->
            <div class="ticket-footer">
              <div class="coupon-row">
                <input
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Cupón de descuento"
                  [(ngModel)]="couponCode"
                  (ngModelChange)="guardarTicket()"
                />
              </div>

              <div class="payment-method-row">
                <label class="form-label">Método de Pago:</label>
                <div class="pm-buttons">
                  <button
                    type="button"
                    class="pm-btn"
                    [class.active]="paymentMethod === 'EFECTIVO'"
                    (click)="paymentMethod = 'EFECTIVO'; guardarTicket()"
                  >
                    <i class="ri-money-dollar-circle-line"></i> Efectivo
                  </button>
                  <button
                    type="button"
                    class="pm-btn"
                    [class.active]="paymentMethod === 'TARJETA_POS'"
                    (click)="paymentMethod = 'TARJETA_POS'; guardarTicket()"
                  >
                    <i class="ri-bank-card-line"></i> Tarjeta POS
                  </button>
                  <button
                    type="button"
                    class="pm-btn"
                    [class.active]="paymentMethod === 'QR'"
                    (click)="paymentMethod = 'QR'; guardarTicket()"
                  >
                    <i class="ri-qr-code-line"></i> QR
                  </button>
                </div>
              </div>

              <div class="ticket-branch-row">
                <i class="ri-store-2-line"></i>
                <span>Venta en: <strong>{{ selectedBranchName }}</strong></span>
              </div>

              <div class="ticket-total-box">
                <span class="total-lbl">Total a Cobrar:</span>
                <span class="total-amt">Bs. {{ calculateTotal() | number:'1.2-2' }}</span>
              </div>
              @if (calculateSavings() > 0) {
                <div class="ticket-savings-row">
                  <i class="ri-price-tag-3-line"></i>
                  <span>Ahorro por promociones: <strong>Bs. {{ calculateSavings() | number:'1.2-2' }}</strong></span>
                </div>
              }

              <button 
                class="btn btn-accent btn-lg btn-charge"
                [disabled]="ticketItems.length === 0 || processingSale"
                (click)="submitSale()"
              >
                @if (processingSale) {
                  <i class="ri-loader-4-line spin-icon"></i> Registrando Venta...
                } @else {
                  <i class="ri-check-line"></i> Cobrar y Emitir Comprobante
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Variant Selector Modal for Clicked Product -->
      @if (selectedProductForModal) {
        <div class="modal-backdrop" (click)="selectedProductForModal = null">
          <div class="modal-dialog card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Seleccionar Talla y Color</h3>
              <button class="btn-close" (click)="selectedProductForModal = null">
                <i class="ri-close-line"></i>
              </button>
            </div>
            <div class="modal-body">
              <h4>{{ selectedProductForModal.nombre }}</h4>
              <p class="text-muted">Elige la variante física a ingresar al ticket:</p>

              <div class="variants-modal-list">
                @for (v of selectedProductForModal.variantes; track v.id) {
                  <button 
                    class="variant-select-btn" 
                    [disabled]="getVariantStock(v.id) === 0"
                    (click)="addVariantToTicket(selectedProductForModal, v)"
                  >
                    <div class="v-details">
                      <span class="v-sku">{{ v.sku_variante || selectedProductForModal.sku }}</span>
                      <span class="v-attrs">{{ v.talla?.valor || v.talla?.nombre || 'Talla única' }} / {{ v.color?.nombre }}</span>
                    </div>
                    <div class="v-right">
                      @if (getVariantStock(v.id) !== null) {
                        <span class="v-stock" [ngClass]="getVariantStock(v.id) === 0 ? 'text-error' : 'text-success'">
                          {{ getVariantStock(v.id) }} disp.
                        </span>
                      }
                      <span class="v-add-badge">
                        @if (getVariantStock(v.id) === 0) {
                          <i class="ri-close-line"></i> Sin stock
                        } @else {
                          <i class="ri-add-line"></i> Agregar
                        }
                      </span>
                    </div>
                  </button>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- QR Payment Simulation Modal -->
      @if (qrModalVisible) {
        <div class="modal-backdrop" (click)="cancelarQr()">
          <div class="modal-dialog card text-center p-6 qr-modal" (click)="$event.stopPropagation()">
            <div class="qr-header">
              <i class="ri-qr-code-line qr-title-icon"></i>
              <h2 class="text-xl font-bold mb-1">Cobro con QR</h2>
              <p class="text-muted mb-2">El cliente escanea el código con su app para pagar <strong>Bs. {{ qrMonto | number:'1.2-2' }}</strong></p>
            </div>

            @if (!qrExpirado) {
              <div class="qr-code-box">
                <qrcode [qrdata]="qrPayload" [width]="220" [errorCorrectionLevel]="'M'"></qrcode>
              </div>
              <div class="qr-timer" [class.qr-timer-urgent]="qrSegundos < 60">
                <i class="ri-timer-line"></i> El código vence en {{ qrTiempoRestante() }}
              </div>
              <div class="qr-detail-line"><span>Sucursal:</span> <strong>{{ selectedBranchName }}</strong></div>

              <div class="completed-modal-actions mt-3">
                <button class="btn btn-accent btn-lg w-full mb-2" (click)="confirmarPagoQr()">
                  <i class="ri-check-double-line"></i> Confirmar Pago
                </button>
                <button class="btn btn-outline w-full" (click)="cancelarQr()">
                  <i class="ri-close-line"></i> Cancelar Cobro
                </button>
              </div>
            } @else {
              <div class="qr-expired-box">
                <i class="ri-time-line" style="font-size: 3rem; color: var(--error);"></i>
                <h3 class="font-bold mt-2">Código QR vencido</h3>
                <p class="text-muted mb-4">Genera un nuevo código para continuar con el cobro.</p>
              </div>
              <div class="completed-modal-actions">
                <button class="btn btn-accent btn-lg w-full mb-2" (click)="abrirQrModal()">
                  <i class="ri-refresh-line"></i> Generar Nuevo QR
                </button>
                <button class="btn btn-outline w-full" (click)="cancelarQr()">
                  <i class="ri-close-line"></i> Volver al Ticket
                </button>
              </div>
            }
          </div>
        </div>
      }

      <!-- Sale Completed Modal -->
      @if (completedSale) {
        <div class="modal-backdrop" (click)="completedSale = null">
          <div class="modal-dialog card text-center p-6" (click)="$event.stopPropagation()">
            <div class="success-icon-box mb-3">
              <i class="ri-checkbox-circle-fill text-success" style="font-size: 3.5rem;"></i>
            </div>
            <h2 class="text-xl font-bold mb-1">¡Venta Presencial Exitosa!</h2>
            <p class="text-muted mb-4">Venta registrada en sistema y comprobante generado.</p>

            <div class="sale-summary-card mb-4 text-left">
              <div class="summary-line"><span>Venta ID:</span> <strong>#{{ completedSale.id }}</strong></div>
              <div class="summary-line"><span>N° Orden:</span> <strong>{{ completedSale.orden?.numero_orden || completedSale.orden_id }}</strong></div>
              <div class="summary-line"><span>N° Comprobante:</span> <strong class="text-accent">{{ completedSale.orden?.comprobante?.numero || 'Generado' }}</strong></div>
              <div class="summary-line"><span>Método de Pago:</span> <strong>{{ completedSale.metodo_pago }}</strong></div>
              <div class="summary-line total-line"><span>Total Cobrado:</span> <strong class="text-accent">Bs. {{ (completedSale.orden?.total || calculateTotal()) | number:'1.2-2' }}</strong></div>
            </div>

            <div class="completed-modal-actions">
              <button class="btn btn-accent btn-lg w-full mb-2" (click)="viewPdf(completedSale.id)">
                <i class="ri-printer-line"></i> Ver / Imprimir Comprobante (PDF)
              </button>
              <button class="btn btn-outline w-full" (click)="completedSale = null">
                <i class="ri-add-line"></i> Realizar Nueva Venta
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .pos-layout {
      min-height: 100vh;
      background: #f1f5f9;
      display: flex;
      flex-direction: column;
    }

    .pos-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1.5rem;
      background: white;
      border-bottom: 1px solid var(--border-color);
    }

    .pos-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .pos-logo {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      background: var(--primary);
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
    }

    .pos-title {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--primary);
      margin: 0;
    }

    .pos-tag {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: var(--text-muted);
    }

    .pos-branch-select {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .pos-label {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    .branch-loading {
      font-size: 1rem;
      color: var(--accent);
    }

    .pos-main {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 420px;
      gap: 1.5rem;
      padding: 1.5rem;
    }

    .pos-catalog-panel {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .pos-search-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
    }

    .search-icon { font-size: 1.25rem; color: var(--text-muted); }

    .pos-products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1rem;
      overflow-y: auto;
      max-height: calc(100vh - 200px);
    }

    .promo-strip {
      padding: 0.6rem 1rem;
      background: linear-gradient(135deg, rgba(236,72,153,0.08), rgba(236,72,153,0.02));
      border: 1px dashed var(--accent);
    }
    .promo-strip-title {
      font-size: 0.75rem;
      font-weight: 800;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.4rem;
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }
    .promo-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .promo-chip {
      font-size: 0.75rem;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-full);
      padding: 0.2rem 0.65rem;
      color: var(--primary);
      strong { color: var(--accent); margin-right: 0.25rem; }
    }

    .pos-prod-card {
      position: relative;
      padding: 0.75rem;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--accent);
        transform: translateY(-2px);
      }
    }

    .prod-thumbnail {
      width: 100%;
      height: 120px;
      object-fit: cover;
      border-radius: var(--radius-sm);
      margin-bottom: 0.5rem;
    }

    .prod-sku {
      font-size: 0.7rem;
      color: var(--text-muted);
      font-family: monospace;
    }

    .prod-name {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--primary);
      margin: 0.2rem 0;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .genero-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.68rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.12rem 0.5rem;
      border-radius: var(--radius-full);
      margin: 0.2rem 0;
    }
    .genero-hombre { background: rgba(59,130,246,0.12); color: #2563eb; }
    .genero-mujer { background: rgba(236,72,153,0.12); color: #db2777; }
    .genero-unisex { background: rgba(100,116,139,0.12); color: #475569; }

    .genero-filter-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
    }
    .genero-filter-label { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); }
    .genero-filter-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.3rem 0.75rem;
      border-radius: var(--radius-full);
      border: 1px solid var(--border-color);
      background: white;
      color: var(--text-muted);
      cursor: pointer;
      &.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
      }
    }

    .prod-price {
      font-weight: 800;
      color: var(--accent);
      font-size: 0.9375rem;
    }

    .prod-old-price {
      font-size: 0.72rem;
      color: var(--text-muted);
      font-weight: 400;
      margin-left: 0.3rem;
    }

    .promo-badge {
      position: absolute;
      top: 0.5rem;
      left: 0.5rem;
      background: var(--accent);
      color: white;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-sm);
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }

    .promo-tag {
      color: var(--accent) !important;
      font-weight: 700;
      s { color: var(--text-muted); font-weight: 400; }
    }

    .ticket-savings-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8125rem;
      color: var(--accent);
      background: rgba(236,72,153,0.08);
      border-radius: var(--radius-sm);
      padding: 0.45rem 0.75rem;
    }

    .prod-stock {
      margin-top: 0.25rem;
      font-size: 0.7rem;
      font-weight: 700;
    }

    /* Ticket Panel */
    .ticket-card {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 1.5rem;
    }

    .ticket-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border-light);
      margin-bottom: 1rem;
    }

    .ticket-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--primary);
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .btn-clear-ticket {
      background: none;
      border: none;
      color: var(--error);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }

    /* Customer search box */
    .ticket-customer-box {
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border-light);
    }

    .customer-search-group {
      display: flex;
      gap: 0.35rem;
    }

    .btn-search-cust {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 0.65rem;
    }

    .customer-selected-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: var(--radius-sm);
      padding: 0.5rem 0.75rem;
    }

    .cust-info {
      display: flex;
      flex-direction: column;
      font-size: 0.8125rem;
    }

    .cust-name {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      color: var(--primary);
      font-weight: 700;
    }

    .cust-details {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .btn-clear-cust {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 1.1rem;
      padding: 0.2rem;
      &:hover { color: var(--error); }
    }

    .customer-hint {
      font-size: 0.75rem;
      margin-top: 0.35rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .customer-hint.warning {
      color: #b45309;
    }

    .ticket-items-list {
      flex: 1;
      overflow-y: auto;
      min-height: 200px;
      max-height: 300px;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .empty-ticket {
      padding: 2rem;
      text-align: center;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .ticket-item-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem;
      background: #f8fafc;
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
    }

    .t-item-info {
      display: flex;
      flex-direction: column;
      flex: 1;
      strong { color: var(--primary); font-size: 0.8125rem; }
      small { color: var(--text-muted); }
    }

    .t-item-qty {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .qty-btn {
      width: 20px;
      height: 20px;
      background: #e2e8f0;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-weight: 700;
    }

    .t-item-price {
      font-weight: 700;
      color: var(--primary);
      padding: 0 0.5rem;
    }

    .t-item-del {
      background: none;
      border: none;
      color: var(--error);
      cursor: pointer;
      font-size: 1rem;
    }

    .ticket-footer {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-light);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .pm-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 0.35rem;
    }

    .pm-btn {
      padding: 0.4rem;
      font-size: 0.75rem;
      font-weight: 600;
      background: #f1f5f9;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      cursor: pointer;

      &.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
      }
    }

    .ticket-total-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
    }

    .ticket-branch-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8125rem;
      color: var(--text-muted);

      strong { color: var(--primary); }
    }

    .total-lbl { font-size: 1rem; font-weight: 700; color: var(--primary); }
    .total-amt { font-size: 1.5rem; font-weight: 800; color: var(--accent); font-family: 'Outfit', sans-serif; }

    .btn-charge { width: 100%; }

    /* Modal */
    .modal-backdrop {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);
      z-index: 2000; display: flex; align-items: center; justify-content: center;
    }

    .modal-dialog { width: 100%; max-width: 440px; background: white; padding: 1.5rem; }
    .modal-header { display: flex; justify-content: space-between; margin-bottom: 1rem; }
    .btn-close { background: none; border: none; font-size: 1.25rem; cursor: pointer; }

    .variants-modal-list { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem; }
    .variant-select-btn {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.75rem; border: 1px solid var(--border-color);
      border-radius: var(--radius-md); background: #f8fafc; cursor: pointer;
      &:hover { border-color: var(--accent); background: white; }
    }
    .v-sku { font-family: monospace; font-size: 0.75rem; color: var(--text-muted); display: block; }
    .v-attrs { font-weight: 700; font-size: 0.875rem; color: var(--primary); }
    .v-add-badge { color: var(--accent); font-weight: 700; font-size: 0.8125rem; }
    .v-stock { font-weight: 700; font-size: 0.8125rem; }
    .v-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.15rem;
    }
    .variant-select-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      border-style: dashed;
    }

    .sale-summary-card {
      background: #f8fafc; padding: 1rem; border-radius: var(--radius-md); font-size: 0.875rem;
    }

    .summary-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.4rem;
      color: var(--text-muted);

      strong {
        color: var(--primary);
      }

      &.total-line {
        margin-top: 0.5rem;
        padding-top: 0.5rem;
        border-top: 1px dashed var(--border-color);
        font-size: 1rem;
      }
    }

    .completed-modal-actions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    /* QR simulation modal */
    .qr-modal { max-width: 400px; }
    .qr-title-icon { font-size: 2rem; color: var(--accent); }
    .qr-code-box {
      display: flex;
      justify-content: center;
      padding: 1rem;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      margin: 0.5rem 0;
    }
    .qr-timer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 0.5rem;
    }
    .qr-timer-urgent { color: var(--error); }
    .qr-detail-line {
      display: flex;
      justify-content: space-between;
      font-size: 0.8125rem;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
    }
    .qr-expired-box { padding: 1rem 0; }

    .text-accent {
      color: var(--accent) !important;
    }

    .spin-icon { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class PosPageComponent implements OnInit, OnDestroy {
  private posService = inject(PosService);
  private catalogService = inject(PublicCatalogService);
  private branchService = inject(BranchApiService);
  private promotionService = inject(PromotionApiService);
  private toast = inject(ToastService);

  public branches: Sucursal[] = [];
  public selectedBranchId: number = 1;
  public searchQuery: string = '';
  public filtroGenero: string | null = null;
  public products: Producto[] = [];

  /** Stock disponible por variante en la sucursal seleccionada (variante_id -> cantidad_disponible) */
  public branchStock: Record<number, number> = {};
  public loadingBranchStock: boolean = false;

  public ticketItems: PosItem[] = [];
  public nitCiCliente: string = '';
  public selectedCustomer: ClientProfile | null = null;
  public searchingCustomer: boolean = false;
  public customerNotFound: boolean = false;

  public couponCode: string = '';
  public paymentMethod: MetodoPagoPresencial = 'EFECTIVO';
  public processingSale: boolean = false;

  /** Promociones activas y vigentes de la sucursal seleccionada */
  public promociones: PromocionPublica[] = [];

  public selectedProductForModal: Producto | null = null;
  public completedSale: VentaPresencial | null = null;

  /** Borrador del ticket persistido en el navegador (sobrevive a recargas). */
  private readonly TICKET_STORAGE_KEY = 'fs_pos_ticket_v1';

  /** Simulación de cobro QR: payload codificado, segundos restantes y timer. */
  public qrPayload: string = '';
  public qrSegundos: number = 0;
  public qrExpirado: boolean = false;
  public qrMonto: number = 0;
  private qrTimer: any = null;
  private readonly QR_VIGENCIA_SEG = 300; // 5 minutos

  ngOnDestroy(): void {
    this.limpiarQrTimer();
  }

  ngOnInit(): void {
    this.restaurarTicket();
    this.branchService.getBranches().subscribe(branches => {
      this.branches = branches.filter(b => b.estado === 'ACTIVO');
      // Se conserva la sucursal seleccionada si sigue activa; si no, se usa la primera
      if (this.branches.length > 0 && !this.branches.some(b => b.id === Number(this.selectedBranchId))) {
        this.selectedBranchId = this.branches[0].id;
      }
      this.loadBranchStock();
      this.loadPromotions();
    });

    this.searchProducts();
  }

  /** Sucursal con la que se está operando actualmente en la terminal */
  get selectedBranch(): Sucursal | null {
    return this.branches.find(b => b.id === Number(this.selectedBranchId)) || null;
  }

  get selectedBranchName(): string {
    return this.selectedBranch?.nombre || 'Sucursal no definida';
  }

  /**
   * Cambio de sucursal en la terminal: recarga el stock disponible de la nueva sucursal
   * y avisa al cajero de la sucursal activa (la venta se registrará en esa sucursal).
   */
  onBranchChange(): void {
    this.selectedBranchId = Number(this.selectedBranchId);
    this.selectedProductForModal = null;
    this.loadBranchStock();
    this.loadPromotions();
    this.reaplicarPromosTicket();
    this.guardarTicket();
    this.toast.info(`Sucursal activa: ${this.selectedBranchName}`);
  }

  /** Guarda el borrador del ticket en el navegador para sobrevivir a recargas. */
  guardarTicket(): void {
    try {
      const borrador = {
        branchId: this.selectedBranchId,
        paymentMethod: this.paymentMethod,
        couponCode: this.couponCode,
        nitCiCliente: this.nitCiCliente,
        customer: this.selectedCustomer,
        items: this.ticketItems.map(i => ({
          variant: i.variant,
          product: i.product,
          cantidad: i.cantidad
        }))
      };
      localStorage.setItem(this.TICKET_STORAGE_KEY, JSON.stringify(borrador));
    } catch { /* almacenamiento no disponible: el POS sigue funcionando en memoria */ }
  }

  /** Restaura el borrador del ticket guardado (precios y promos se recalculan). */
  private restaurarTicket(): void {
    try {
      const raw = localStorage.getItem(this.TICKET_STORAGE_KEY);
      if (!raw) return;
      const b = JSON.parse(raw);
      if (b.branchId) this.selectedBranchId = Number(b.branchId);
      if (b.paymentMethod) this.paymentMethod = b.paymentMethod;
      this.couponCode = b.couponCode || '';
      this.nitCiCliente = b.nitCiCliente || '';
      this.selectedCustomer = b.customer || null;
      this.customerNotFound = !b.customer && !!this.nitCiCliente;
      this.ticketItems = (b.items || []).map((s: any) => {
        const base = this.precioBase(s.product, s.variant);
        const r = this.aplicarPromoConBase(s.product, base, s.cantidad);
        return {
          variant: s.variant,
          product: s.product,
          cantidad: s.cantidad,
          precio_base: base,
          precio_unitario: r.unit,
          subtotal: Math.round(r.unit * s.cantidad * 100) / 100,
          promoNombre: r.promoNombre
        } as PosItem;
      });
    } catch { /* borrador corrupto: se inicia ticket vacío */ }
  }

  private limpiarTicketGuardado(): void {
    try { localStorage.removeItem(this.TICKET_STORAGE_KEY); } catch { /* noop */ }
  }
  loadBranchStock(): void {
    const sucursalId = Number(this.selectedBranchId);
    if (!sucursalId) {
      this.branchStock = {};
      return;
    }

    this.loadingBranchStock = true;
    this.branchService.getBranchProducts(sucursalId).subscribe({
      next: (inventarios: Inventario[]) => {
        const mapa: Record<number, number> = {};
        (inventarios || []).forEach(inv => {
          mapa[inv.variante_producto_id] = inv.cantidad_disponible ?? inv.cantidad ?? 0;
        });
        this.branchStock = mapa;
        this.loadingBranchStock = false;
        this.advertirStockInsuficienteEnTicket();
      },
      error: () => {
        // Si el inventario de la sucursal no se puede consultar, el POS sigue operando
        // sin validación previa de stock (el backend valida al registrar la venta).
        this.branchStock = {};
        this.loadingBranchStock = false;
      }
    });
  }

  /**
   * Stock disponible de una variante en la sucursal seleccionada.
   * Devuelve null cuando no se pudo consultar el inventario de la sucursal.
   */
  getVariantStock(variantId: number): number | null {
    const disponible = this.branchStock[variantId];
    return disponible === undefined ? null : disponible;
  }

  /** Stock total del producto (suma de sus variantes) en la sucursal seleccionada */
  getProductStock(product: Producto): number | null {
    if (!product.variantes || product.variantes.length === 0) return null;

    let total: number | null = null;
    product.variantes.forEach(variante => {
      const disponible = this.getVariantStock(variante.id);
      if (disponible !== null) {
        total = (total ?? 0) + disponible;
      }
    });
    return total;
  }

  /** Carga las promociones activas y vigentes de la sucursal seleccionada */
  loadPromotions(): void {
    const sucursalId = Number(this.selectedBranchId);
    if (!sucursalId) {
      this.promociones = [];
      return;
    }
    this.promotionService.getActivePromotions(sucursalId).subscribe({
      next: (promos) => {
        this.promociones = promos || [];
        // Los precios del borrador restaurado se recalculan con las promos vigentes
        this.reaplicarPromosTicket();
        this.guardarTicket();
      },
      error: () => { this.promociones = []; }
    });
  }

  /** Promociones que aplican a un producto (por producto o por categoría). */
  promosParaProducto(product: Producto): PromocionPublica[] {
    const catId = (product as any).categoria_id;
    return (this.promociones || []).filter(p => {
      const porProducto = (p.producto_ids || []).includes(product.id);
      const porCategoria = catId != null && (p.categoria_ids || []).includes(catId);
      return porProducto || porCategoria;
    });
  }

  etiquetaPromo(p: PromocionPublica): string {
    if (p.tipo === 'PORCENTAJE') return `-${p.valor ?? 0}%`;
    if (p.tipo === 'MONTO_FIJO') return `-Bs ${(p.valor ?? 0)}`;
    if (p.tipo === 'DOS_POR_UNO') return '2x1';
    return p.nombre;
  }

  /** Etiqueta corta de la mejor promo con descuento directo (para el badge del producto). */
  etiquetaProducto(product: Producto): string | null {
    const aplicables = this.promosParaProducto(product).filter(p => p.tipo !== 'ENVIO_GRATIS');
    if (aplicables.length === 0) return null;
    const pct = aplicables.filter(p => p.tipo === 'PORCENTAJE').sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0))[0];
    if (pct) return this.etiquetaPromo(pct);
    const monto = aplicables.filter(p => p.tipo === 'MONTO_FIJO').sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0))[0];
    if (monto) return this.etiquetaPromo(monto);
    return this.etiquetaPromo(aplicables[0]);
  }

  private precioBase(product: Producto, variant: VarianteProducto): number {
    return Number(variant.precio_adicional ? product.precio + variant.precio_adicional : product.precio);
  }

  /**
   * Calcula el precio unitario con la mejor promoción aplicable.
   * PORCENTAJE/MONTO_FIJO: descuento directo. DOS_POR_UNO: precio efectivo
   * prorrateado (cada 2da unidad gratis) según la cantidad del ticket.
   */
  private aplicarPromoConBase(product: Producto, base: number, cantidad: number): { unit: number; promoNombre?: string } {
    const promos = this.promosParaProducto(product);
    let best: { unit: number; promoNombre?: string } = { unit: base };
    for (const p of promos) {
      if (p.tipo === 'PORCENTAJE' && (p.valor ?? 0) > 0) {
        const unit = Math.max(0, Math.round(base * (1 - (p.valor ?? 0) / 100) * 100) / 100);
        if (unit < best.unit) best = { unit, promoNombre: `${p.nombre} (-${p.valor}%)` };
      } else if (p.tipo === 'MONTO_FIJO' && (p.valor ?? 0) > 0) {
        const unit = Math.max(0, Math.round((base - (p.valor ?? 0)) * 100) / 100);
        if (unit < best.unit) best = { unit, promoNombre: `${p.nombre} (-Bs ${p.valor})` };
      } else if (p.tipo === 'DOS_POR_UNO' && cantidad >= 2) {
        const pagas = cantidad - Math.floor(cantidad / 2);
        const unit = Math.round((base * pagas / cantidad) * 100) / 100;
        if (unit < best.unit) best = { unit, promoNombre: `${p.nombre} (2x1: pagas ${pagas} de ${cantidad})` };
      }
    }
    return best;
  }

  /** Precio con promo para 1 unidad (vitrina del catálogo POS). */
  precioPromoProducto(product: Producto): number {
    return this.aplicarPromoConBase(product, Number(product.precio), 1).unit;
  }

  tienePromoPrecio(product: Producto): boolean {
    return this.precioPromoProducto(product) < Number(product.precio);
  }

  /** Recalcula las promos de todo el ticket (ej. al cambiar de sucursal). */
  private reaplicarPromosTicket(): void {
    this.ticketItems.forEach(item => {
      const r = this.aplicarPromoConBase(item.product, item.precio_base, item.cantidad);
      item.precio_unitario = r.unit;
      item.promoNombre = r.promoNombre;
      item.subtotal = Math.round(r.unit * item.cantidad * 100) / 100;
    });
  }
  private advertirStockInsuficienteEnTicket(): void {
    const itemsSinStock = this.ticketItems.filter(item => {
      const disponible = this.getVariantStock(item.variant.id);
      return disponible !== null && item.cantidad > disponible;
    });

    if (itemsSinStock.length > 0) {
      this.toast.warning(`Atención: ${itemsSinStock.length} prenda(s) del ticket no tienen stock suficiente en ${this.selectedBranchName}.`);
    }
  }

  searchProducts(): void {
    this.catalogService.getCatalog({
      q: this.searchQuery,
      limite: 24,
      genero: (this.filtroGenero || undefined) as any
    }).subscribe({
      next: (res) => {
        this.products = res.items || [];
      }
    });
  }

  setFiltroGenero(g: string | null): void {
    this.filtroGenero = g;
    this.searchProducts();
  }

  generoLabel(g?: string | null): string {
    if (g === 'HOMBRE') return 'Hombre';
    if (g === 'MUJER') return 'Mujer';
    return 'Unisex';
  }

  generoIcon(g?: string | null): string {
    if (g === 'HOMBRE') return 'ri-men-line';
    if (g === 'MUJER') return 'ri-women-line';
    return 'ri-group-line';
  }

  generoClass(g?: string | null): string {
    if (g === 'HOMBRE') return 'genero-badge genero-hombre';
    if (g === 'MUJER') return 'genero-badge genero-mujer';
    return 'genero-badge genero-unisex';
  }

  searchCustomer(): void {
    const q = this.nitCiCliente.trim();
    if (!q) return;
    this.searchingCustomer = true;
    this.customerNotFound = false;

    this.posService.searchClients(q).subscribe({
      next: (clients) => {
        this.searchingCustomer = false;
        if (clients && clients.length > 0) {
          this.selectedCustomer = clients[0];
          this.nitCiCliente = clients[0].nit_ci;
          this.customerNotFound = false;
          this.guardarTicket();
          this.toast.success(`Cliente seleccionado: ${clients[0].nombre} ${clients[0].apellido}`);
        } else {
          this.customerNotFound = true;
          this.guardarTicket();
          this.toast.info('Cliente no registrado en la base de datos. Se emitirá a nombre del NIT/CI indicado.');
        }
      },
      error: () => {
        this.searchingCustomer = false;
        this.customerNotFound = true;
      }
    });
  }

  clearCustomer(): void {
    this.selectedCustomer = null;
    this.nitCiCliente = '';
    this.customerNotFound = false;
    this.guardarTicket();
  }

  viewPdf(saleId: number): void {
    const url = this.posService.getSalePdfUrl(saleId);
    window.open(url, '_blank');
  }

  selectProductForVariants(product: Producto): void {
    if (product.variantes && product.variantes.length === 1) {
      this.addVariantToTicket(product, product.variantes[0]);
    } else if (product.variantes && product.variantes.length > 1) {
      this.selectedProductForModal = product;
    } else {
      this.toast.warning('Este producto no tiene variantes configuradas');
    }
  }

  addVariantToTicket(product: Producto, variant: VarianteProducto): void {
    const existing = this.ticketItems.find(item => item.variant.id === variant.id);
    const cantidadEnTicket = existing ? existing.cantidad : 0;
    const disponible = this.getVariantStock(variant.id);

    if (disponible !== null && cantidadEnTicket + 1 > disponible) {
      this.toast.warning(`Stock insuficiente de ${product.nombre} en ${this.selectedBranchName}. Disponible: ${disponible}`);
      return;
    }

    if (existing) {
      existing.cantidad++;
      const r = this.aplicarPromoConBase(product, existing.precio_base, existing.cantidad);
      existing.precio_unitario = r.unit;
      existing.promoNombre = r.promoNombre;
      existing.subtotal = Math.round(r.unit * existing.cantidad * 100) / 100;
    } else {
      const base = this.precioBase(product, variant);
      const r = this.aplicarPromoConBase(product, base, 1);
      this.ticketItems.push({
        product,
        variant,
        cantidad: 1,
        precio_base: base,
        precio_unitario: r.unit,
        subtotal: r.unit,
        promoNombre: r.promoNombre
      });
    }
    this.selectedProductForModal = null;
    this.guardarTicket();
    this.toast.info(`Añadido: ${product.nombre}`);
  }

  changeQty(item: PosItem, delta: number): void {
    if (delta > 0) {
      const disponible = this.getVariantStock(item.variant.id);
      if (disponible !== null && item.cantidad + delta > disponible) {
        this.toast.warning(`Stock insuficiente en ${this.selectedBranchName}. Disponible: ${disponible}`);
        return;
      }
    }

    item.cantidad += delta;
    if (item.cantidad <= 0) {
      this.removeItem(item);
    } else {
      const r = this.aplicarPromoConBase(item.product, item.precio_base, item.cantidad);
      item.precio_unitario = r.unit;
      item.promoNombre = r.promoNombre;
      item.subtotal = Math.round(r.unit * item.cantidad * 100) / 100;
      this.guardarTicket();
    }
  }

  removeItem(item: PosItem): void {
    this.ticketItems = this.ticketItems.filter(i => i !== item);
    this.guardarTicket();
  }

  clearTicket(): void {
    this.ticketItems = [];
    this.clearCustomer();
    this.couponCode = '';
    this.limpiarTicketGuardado();
  }

  calculateTotal(): number {
    return this.ticketItems.reduce((sum, item) => sum + item.subtotal, 0);
  }

  /** Total ahorrado por promociones respecto al precio base. */
  calculateSavings(): number {
    const ahorro = this.ticketItems.reduce((sum, item) => sum + (item.precio_base * item.cantidad - item.subtotal), 0);
    return Math.max(0, Math.round(ahorro * 100) / 100);
  }

  submitSale(): void {
    if (this.ticketItems.length === 0) return;

    // Con QR se muestra primero el código para simular el pago del cliente;
    // la venta se registra solo al confirmar el pago en el modal.
    if (this.paymentMethod === 'QR') {
      this.abrirQrModal();
      return;
    }
    this.registrarVenta();
  }

  /** Modal QR visible cuando hay un payload generado. */
  get qrModalVisible(): boolean {
    return this.qrPayload !== '';
  }

  /** Genera el QR de cobro (simulado) con los datos del ticket y abre el modal. */
  abrirQrModal(): void {
    if (this.ticketItems.length === 0) return;
    const total = Math.round(this.calculateTotal() * 100) / 100;
    const nit = this.selectedCustomer?.nit_ci || this.nitCiCliente.trim() || 'S/N';
    const items = this.ticketItems.reduce((n, i) => n + i.cantidad, 0);
    this.qrMonto = total;
    this.qrPayload = [
      'FASHIONSTORE|POS',
      `Sucursal:${this.selectedBranchName}`,
      `Total:Bs ${total.toFixed(2)}`,
      `NIT:${nit}`,
      `Items:${items}`,
      `Fecha:${new Date().toISOString()}`
    ].join('|');
    this.qrExpirado = false;
    this.qrSegundos = this.QR_VIGENCIA_SEG;
    this.limpiarQrTimer();
    this.qrTimer = setInterval(() => {
      this.qrSegundos--;
      if (this.qrSegundos <= 0) {
        this.qrSegundos = 0;
        this.qrExpirado = true;
        this.limpiarQrTimer();
      }
    }, 1000);
  }

  /** El cliente "pagó": se cierra el QR y se registra la venta con método QR. */
  confirmarPagoQr(): void {
    if (this.qrExpirado) return;
    this.cerrarQrModal();
    this.toast.success('Pago QR confirmado por el cliente');
    this.registrarVenta();
  }

  cancelarQr(): void {
    this.cerrarQrModal();
    this.toast.info('Cobro QR cancelado. El ticket se conserva.');
  }

  private cerrarQrModal(): void {
    this.limpiarQrTimer();
    this.qrPayload = '';
    this.qrExpirado = false;
  }

  private limpiarQrTimer(): void {
    if (this.qrTimer !== null) {
      clearInterval(this.qrTimer);
      this.qrTimer = null;
    }
  }

  /** Minutos:segundos restantes del QR. */
  qrTiempoRestante(): string {
    const m = Math.floor(this.qrSegundos / 60);
    const s = this.qrSegundos % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  private registrarVenta(): void {
    if (this.ticketItems.length === 0) return;

    this.processingSale = true;
    this.posService.createInPersonSale({
      sucursal_id: this.selectedBranchId,
      cliente_id: this.selectedCustomer?.id || undefined,
      nit_ci_cliente: this.selectedCustomer?.nit_ci || this.nitCiCliente.trim() || undefined,
      metodo_pago: this.paymentMethod,
      cupon_codigo: this.couponCode.trim() || undefined,
      detalles: this.ticketItems.map(i => ({
        variante_producto_id: i.variant.id,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario
      }))
    }).subscribe({
      next: (sale) => {
        this.processingSale = false;
        this.completedSale = sale;
        this.clearTicket();
        this.loadBranchStock();
        this.toast.success('¡Venta completada con éxito!');
      },
      error: (err) => {
        this.processingSale = false;
        this.toast.error(err.error?.detail || 'Error al procesar la venta');
      }
    });
  }
}

