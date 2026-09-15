import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PosService } from '../../../../core/services/pos.service';
import { PublicCatalogService } from '../../../../core/services/public-catalog.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Producto, VarianteProducto } from '../../../../core/models/catalog.model';
import { Sucursal } from '../../../../core/models/branch.model';
import { MetodoPagoPresencial, VentaPresencial } from '../../../../core/models/cart.model';
import { ClientProfile } from '../../../../core/models/user.model';

interface PosItem {
  variant: VarianteProducto;
  product: Producto;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

@Component({
  selector: 'app-pos-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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
          <select class="form-control form-control-sm" [(ngModel)]="selectedBranchId">
            @for (branch of branches; track branch.id) {
              <option [ngValue]="branch.id">{{ branch.nombre }}</option>
            }
          </select>
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

          <!-- Products Grid -->
          <div class="pos-products-grid">
            @for (prod of products; track prod.id) {
              <div class="pos-prod-card card" (click)="selectProductForVariants(prod)">
                <img [src]="prod.imagenes[0] || 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=400&auto=format&fit=crop'" [alt]="prod.nombre" class="prod-thumbnail" />
                <div class="prod-meta">
                  <span class="prod-sku">{{ prod.sku }}</span>
                  <h4 class="prod-name">{{ prod.nombre }}</h4>
                  <span class="prod-price">Bs. {{ prod.precio | number:'1.2-2' }}</span>
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
                      <small>{{ item.variant.talla?.valor || item.variant.talla?.nombre }} / {{ item.variant.color?.nombre }}</small>
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
                />
              </div>

              <div class="payment-method-row">
                <label class="form-label">Método de Pago:</label>
                <div class="pm-buttons">
                  <button 
                    type="button" 
                    class="pm-btn" 
                    [class.active]="paymentMethod === 'EFECTIVO'"
                    (click)="paymentMethod = 'EFECTIVO'"
                  >
                    <i class="ri-money-dollar-circle-line"></i> Efectivo
                  </button>
                  <button 
                    type="button" 
                    class="pm-btn" 
                    [class.active]="paymentMethod === 'TARJETA_POS'"
                    (click)="paymentMethod = 'TARJETA_POS'"
                  >
                    <i class="ri-bank-card-line"></i> Tarjeta POS
                  </button>
                  <button 
                    type="button" 
                    class="pm-btn" 
                    [class.active]="paymentMethod === 'QR'"
                    (click)="paymentMethod = 'QR'"
                  >
                    <i class="ri-qr-code-line"></i> QR
                  </button>
                </div>
              </div>

              <div class="ticket-total-box">
                <span class="total-lbl">Total a Cobrar:</span>
                <span class="total-amt">Bs. {{ calculateTotal() | number:'1.2-2' }}</span>
              </div>

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
                  <button class="variant-select-btn" (click)="addVariantToTicket(selectedProductForModal, v)">
                    <div class="v-details">
                      <span class="v-sku">{{ v.sku_variante || selectedProductForModal.sku }}</span>
                      <span class="v-attrs">{{ v.talla?.valor || v.talla?.nombre }} / {{ v.color?.nombre }}</span>
                    </div>
                    <span class="v-add-badge"><i class="ri-add-line"></i> Agregar</span>
                  </button>
                }
              </div>
            </div>
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

    .pos-prod-card {
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

    .prod-price {
      font-weight: 800;
      color: var(--accent);
      font-size: 0.9375rem;
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

    .text-accent {
      color: var(--accent) !important;
    }

    .spin-icon { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class PosPageComponent implements OnInit {
  private posService = inject(PosService);
  private catalogService = inject(PublicCatalogService);
  private branchService = inject(BranchApiService);
  private toast = inject(ToastService);

  public branches: Sucursal[] = [];
  public selectedBranchId: number = 1;
  public searchQuery: string = '';
  public products: Producto[] = [];

  public ticketItems: PosItem[] = [];
  public nitCiCliente: string = '';
  public selectedCustomer: ClientProfile | null = null;
  public searchingCustomer: boolean = false;
  public customerNotFound: boolean = false;

  public couponCode: string = '';
  public paymentMethod: MetodoPagoPresencial = 'EFECTIVO';
  public processingSale: boolean = false;

  public selectedProductForModal: Producto | null = null;
  public completedSale: VentaPresencial | null = null;

  ngOnInit(): void {
    this.branchService.getBranches().subscribe(branches => {
      this.branches = branches.filter(b => b.estado === 'ACTIVO');
      if (this.branches.length > 0) {
        this.selectedBranchId = this.branches[0].id;
      }
    });

    this.searchProducts();
  }

  searchProducts(): void {
    this.catalogService.getCatalog({ q: this.searchQuery, limite: 24 }).subscribe({
      next: (res) => {
        this.products = res.items || [];
      }
    });
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
          this.toast.success(`Cliente seleccionado: ${clients[0].nombre} ${clients[0].apellido}`);
        } else {
          this.customerNotFound = true;
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
    if (existing) {
      existing.cantidad++;
      existing.subtotal = existing.cantidad * existing.precio_unitario;
    } else {
      const price = Number(variant.precio_adicional ? product.precio + variant.precio_adicional : product.precio);
      this.ticketItems.push({
        product,
        variant,
        cantidad: 1,
        precio_unitario: price,
        subtotal: price
      });
    }
    this.selectedProductForModal = null;
    this.toast.info(`Añadido: ${product.nombre}`);
  }

  changeQty(item: PosItem, delta: number): void {
    item.cantidad += delta;
    if (item.cantidad <= 0) {
      this.removeItem(item);
    } else {
      item.subtotal = item.cantidad * item.precio_unitario;
    }
  }

  removeItem(item: PosItem): void {
    this.ticketItems = this.ticketItems.filter(i => i !== item);
  }

  clearTicket(): void {
    this.ticketItems = [];
    this.clearCustomer();
    this.couponCode = '';
  }

  calculateTotal(): number {
    return this.ticketItems.reduce((sum, item) => sum + item.subtotal, 0);
  }

  submitSale(): void {
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
        this.toast.success('¡Venta completada con éxito!');
      },
      error: (err) => {
        this.processingSale = false;
        this.toast.error(err.error?.detail || 'Error al procesar la venta');
      }
    });
  }
}

