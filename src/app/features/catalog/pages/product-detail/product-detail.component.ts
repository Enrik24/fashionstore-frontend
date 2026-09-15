import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { PublicCatalogService } from '../../../../core/services/public-catalog.service';
import { CartService } from '../../../../core/services/cart.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { StockWebSocketService } from '../../../../core/services/stock-websocket.service';
import { Producto, VarianteProducto, Talla, Color } from '../../../../core/models/catalog.model';
import { DisponibilidadSucursal, DisponibilidadProductoResponse } from '../../../../core/models/public-catalog.model';
import { StockAvailabilityComponent } from '../../components/stock-availability/stock-availability.component';
import { ReservationModalComponent } from '../../components/reservation-modal/reservation-modal.component';
import { ProductCardComponent } from '../../components/product-card/product-card.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterLink, 
    StockAvailabilityComponent, 
    ReservationModalComponent,
    ProductCardComponent
  ],
  template: `
    <div class="product-detail-page">
      <div class="container py-8">
        <!-- Back button & Breadcrumb -->
        <div class="detail-nav">
          <a routerLink="/catalog" class="back-link">
            <i class="ri-arrow-left-line"></i> Volver al Catálogo
          </a>
        </div>

        @if (loading()) {
          <div class="loading-state">
            <i class="ri-loader-4-line spin-icon"></i>
            <span>Cargando detalles del producto...</span>
          </div>
        } @else if (product) {
          <div class="product-main-grid">
            <!-- Left: Image Gallery -->
            <div class="gallery-col">
              <div class="main-image-box card">
                <img 
                  [src]="selectedImage || product.imagenes[0] || 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=800&auto=format&fit=crop'" 
                  [alt]="product.nombre" 
                  class="main-image"
                />
              </div>

              @if (product.imagenes && product.imagenes.length > 1) {
                <div class="thumbnails-row">
                  @for (img of product.imagenes; track img) {
                    <button 
                      class="thumbnail-btn" 
                      [class.active]="selectedImage === img"
                      (click)="selectedImage = img"
                    >
                      <img [src]="img" [alt]="product.nombre" />
                    </button>
                  }
                </div>
              }
            </div>

            <!-- Right: Product Info & Actions -->
            <div class="info-col">
              <div class="product-info-card card">
                <!-- Badges -->
                <div class="badges-row">
                  @if (product.categoria) {
                    <span class="badge badge-primary">{{ product.categoria.nombre }}</span>
                  }
                  @if (product.temporada) {
                    <span class="badge badge-info">{{ product.temporada.nombre }}</span>
                  }
                  <span class="product-sku">SKU: {{ product.sku }}</span>
                </div>

                <h1 class="product-title">{{ product.nombre }}</h1>

                <div class="price-box">
                  <span class="currency">Bs.</span>
                  <span class="amount">{{ product.precio | number:'1.2-2' }}</span>
                </div>

                <div class="description-box">
                  <p>{{ product.descripcion || 'Sin descripción disponible.' }}</p>
                </div>

                <div class="divider"></div>

                <!-- Sizes Selector -->
                @if (availableSizes.length > 0) {
                  <div class="option-group">
                    <label class="option-label">
                      <span>Seleccionar Talla</span>
                      @if (selectedSize) {
                        <span class="selected-text">{{ selectedSize.valor || selectedSize.nombre }}</span>
                      }
                    </label>
                    <div class="sizes-row">
                      @for (size of availableSizes; track size.id) {
                        <button 
                          type="button"
                          class="size-pill"
                          [class.selected]="selectedSize?.id === size.id"
                          (click)="onSelectSize(size)"
                        >
                          {{ size.valor || size.nombre }}
                        </button>
                      }
                    </div>
                  </div>
                }

                <!-- Colors Selector -->
                @if (availableColors.length > 0) {
                  <div class="option-group">
                    <label class="option-label">
                      <span>Seleccionar Color</span>
                      @if (selectedColor) {
                        <span class="selected-text">{{ selectedColor.nombre }}</span>
                      }
                    </label>
                    <div class="colors-row">
                      @for (color of availableColors; track color.id) {
                        <button 
                          type="button"
                          class="color-pill"
                          [class.selected]="selectedColor?.id === color.id"
                          [style.background-color]="color.codigo_hex || '#cbd5e1'"
                          [title]="color.nombre"
                          (click)="onSelectColor(color)"
                        >
                          @if (selectedColor?.id === color.id) {
                            <i class="ri-check-line" [style.color]="isColorDark(color.codigo_hex) ? 'white' : 'black'"></i>
                          }
                        </button>
                      }
                    </div>
                  </div>
                }

                <!-- Selected Variant Info -->
                @if (selectedVariant) {
                  <div class="variant-alert">
                    <i class="ri-checkbox-circle-fill"></i>
                    <span>Variante seleccionada: <strong>{{ selectedVariant.sku_variante || product.sku }}</strong></span>
                  </div>
                }

                <!-- Quantity & Actions -->
                <div class="actions-row">
                  <div class="quantity-picker">
                    <button class="qty-btn" (click)="decreaseQty()" [disabled]="quantity <= 1">-</button>
                    <span class="qty-val">{{ quantity }}</span>
                    <button class="qty-btn" (click)="increaseQty()">+</button>
                  </div>

                  <button 
                    class="btn btn-accent btn-lg add-to-cart-btn"
                    [disabled]="!selectedVariant || addingToCart"
                    (click)="addToCart()"
                  >
                    @if (addingToCart) {
                      <i class="ri-loader-4-line spin-icon"></i> Añadiendo...
                    } @else {
                      <i class="ri-shopping-cart-2-line"></i> Añadir al Carrito
                    }
                  </button>
                </div>
              </div>

              <!-- Branch Availability -->
              <app-stock-availability 
                [branchList]="branchAvailability" 
                [loading]="loadingAvailability"
                [wsConnected]="isWsConnected"
                [availableSizes]="availableSizes"
                [availableColors]="availableColors"
                [selectedSize]="selectedSize"
                [selectedColor]="selectedColor"
                (selectBranch)="openReservationModal($event)"
                (selectSize)="onSelectSize($event)"
                (selectColor)="onSelectColor($event)"
              ></app-stock-availability>
            </div>
          </div>

          <!-- Related Products -->
          @if (relatedProducts.length > 0) {
            <div class="related-section">
              <h2 class="section-title">Prendas Relacionadas</h2>
              <div class="related-grid">
                @for (rel of relatedProducts; track rel.id) {
                  <app-product-card [product]="rel"></app-product-card>
                }
              </div>
            </div>
          }
        }
      </div>

      <!-- Reservation Modal -->
      @if (showReservationModal && selectedBranchForReservation && product && selectedVariant) {
        <app-reservation-modal
          [product]="product"
          [variant]="selectedVariant"
          [branch]="selectedBranchForReservation"
          (closed)="onReservationModalClosed($event)"
        ></app-reservation-modal>
      }
    </div>
  `,
  styles: [`
    .product-detail-page {
      min-height: 100vh;
      background-color: var(--bg-main);
      padding-bottom: 4rem;
    }

    .py-8 {
      padding-top: 2rem;
      padding-bottom: 2rem;
    }

    .detail-nav {
      margin-bottom: 1.5rem;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      color: var(--secondary);
      font-size: 0.875rem;

      &:hover {
        color: var(--accent);
      }
    }

    .product-main-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2.5rem;
      align-items: start;
    }

    .gallery-col {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .main-image-box {
      width: 100%;
      height: 480px;
      padding: 0;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f1f5f9;
    }

    .main-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .thumbnails-row {
      display: flex;
      gap: 0.75rem;
      overflow-x: auto;
    }

    .thumbnail-btn {
      width: 72px;
      height: 72px;
      border-radius: var(--radius-md);
      border: 2px solid transparent;
      overflow: hidden;
      cursor: pointer;
      padding: 0;
      background: white;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      &.active {
        border-color: var(--accent);
      }
    }

    .product-info-card {
      padding: 2rem;
    }

    .badges-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .product-sku {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-family: monospace;
      margin-left: auto;
    }

    .product-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--primary);
      line-height: 1.25;
      margin-bottom: 1rem;
    }

    .price-box {
      display: flex;
      align-items: baseline;
      gap: 0.35rem;
      margin-bottom: 1.25rem;
    }

    .currency {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--accent);
    }

    .amount {
      font-size: 2.25rem;
      font-weight: 800;
      font-family: 'Outfit', sans-serif;
      color: var(--primary);
    }

    .description-box {
      font-size: 0.9375rem;
      color: var(--secondary);
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }

    .divider {
      height: 1px;
      background-color: var(--border-light);
      margin: 1.5rem 0;
    }

    .option-group {
      margin-bottom: 1.5rem;
    }

    .option-label {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 0.5rem;
    }

    .selected-text {
      color: var(--accent);
      font-weight: 600;
    }

    .sizes-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .size-pill {
      padding: 0.5rem 1rem;
      font-weight: 600;
      font-size: 0.875rem;
      border-radius: var(--radius-md);
      border: 1.5px solid var(--border-color);
      background: white;
      color: var(--secondary);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--primary);
      }

      &.selected {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
      }
    }

    .colors-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .color-pill {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 0 1px var(--border-color);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform var(--transition-fast);

      &:hover {
        transform: scale(1.1);
      }

      &.selected {
        box-shadow: 0 0 0 3px var(--accent);
        transform: scale(1.1);
      }
    }

    .variant-alert {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--success-bg);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: var(--success);
      padding: 0.6rem 1rem;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
    }

    .actions-row {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .quantity-picker {
      display: flex;
      align-items: center;
      border: 1.5px solid var(--border-color);
      border-radius: var(--radius-md);
      overflow: hidden;
      background: white;
    }

    .qty-btn {
      width: 42px;
      height: 48px;
      background: transparent;
      border: none;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--primary);
      cursor: pointer;
      &:hover:not(:disabled) { background: #f1f5f9; }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }

    .qty-val {
      padding: 0 1rem;
      font-weight: 700;
      font-size: 1rem;
    }

    .add-to-cart-btn {
      flex: 1;
      height: 48px;
    }

    .related-section {
      margin-top: 4rem;
    }

    .section-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--primary);
      margin-bottom: 1.5rem;
    }

    .related-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1.5rem;
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin { 100% { transform: rotate(360deg); } }

    @media (max-width: 900px) {
      .product-main-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private catalogService = inject(PublicCatalogService);
  private cartService = inject(CartService);
  private toast = inject(ToastService);
  private stockWs = inject(StockWebSocketService);
  public authService = inject(AuthService);

  public product: Producto | null = null;
  public relatedProducts: Producto[] = [];
  public branchAvailability: DisponibilidadSucursal[] = [];
  public selectedImage: string = '';
  public quantity: number = 1;

  public availableSizes: Talla[] = [];
  public availableColors: Color[] = [];
  public selectedSize: Talla | null = null;
  public selectedColor: Color | null = null;
  public selectedVariant: VarianteProducto | null = null;

  public loading = signal<boolean>(false);
  public loadingAvailability: boolean = false;
  public isWsConnected: boolean = false;
  public addingToCart: boolean = false;

  private subscriptions: Subscription[] = [];

  // Reservation Modal State
  public showReservationModal: boolean = false;
  public selectedBranchForReservation: DisponibilidadSucursal | null = null;

  ngOnInit(): void {
    // Escuchar actualizaciones en tiempo real del WebSocket
    this.subscriptions.push(
      this.stockWs.availability$.subscribe(branches => {
        if (branches && branches.length > 0) {
          this.branchAvailability = branches;
        }
      }),
      this.stockWs.isConnected$.subscribe(connected => {
        this.isWsConnected = connected;
      }),
      this.stockWs.isLoading$.subscribe(loading => {
        this.loadingAvailability = loading;
      })
    );

    this.subscriptions.push(
      this.route.params.subscribe(params => {
        const id = Number(params['id']);
        if (id) {
          this.loadProduct(id);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.stockWs.disconnect();
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  loadProduct(id: number): void {
    this.loading.set(true);
    this.catalogService.getProductDetail(id).subscribe({
      next: (prod) => {
        this.product = prod;
        this.selectedImage = prod.imagenes?.[0] || '';
        this.extractSizesAndColors(prod);
        this.loading.set(false);
        // Conectar WebSocket para este producto
        this.stockWs.connect(id);
        this.refreshAvailability();
        this.loadRelated(id);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudo cargar la información del producto');
        this.router.navigate(['/catalog']);
      }
    });
  }

  extractSizesAndColors(product: Producto): void {
    if (!product.variantes || product.variantes.length === 0) return;

    const sizeMap = new Map<number, Talla>();
    const colorMap = new Map<number, Color>();

    product.variantes.forEach(v => {
      if (v.talla) sizeMap.set(v.talla.id, v.talla);
      if (v.color) colorMap.set(v.color.id, v.color);
    });

    this.availableSizes = Array.from(sizeMap.values());
    this.availableColors = Array.from(colorMap.values());

    if (this.availableSizes.length > 0) this.selectedSize = this.availableSizes[0];
    if (this.availableColors.length > 0) this.selectedColor = this.availableColors[0];

    this.updateSelectedVariant();
  }

  onSelectSize(size: Talla): void {
    this.selectedSize = size;
    this.updateSelectedVariant();
    this.refreshAvailability();
  }

  onSelectColor(color: Color): void {
    this.selectedColor = color;
    this.updateSelectedVariant();
    this.refreshAvailability();
  }

  updateSelectedVariant(): void {
    if (!this.product || !this.product.variantes) return;

    this.selectedVariant = this.product.variantes.find(v => {
      const matchSize = this.selectedSize ? v.talla_id === this.selectedSize.id : true;
      const matchColor = this.selectedColor ? v.color_id === this.selectedColor.id : true;
      return matchSize && matchColor;
    }) || this.product.variantes[0] || null;
  }

  loadAvailability(productId: number, tallaId?: number, colorId?: number): void {
    this.loadingAvailability = true;
    this.catalogService.getProductAvailability(productId, tallaId, colorId).subscribe({
      next: (res: DisponibilidadProductoResponse | DisponibilidadSucursal[]) => {
        if (Array.isArray(res)) {
          this.branchAvailability = res;
        } else {
          this.branchAvailability = res && res.disponibilidad ? res.disponibilidad : [];
        }
        this.loadingAvailability = false;
      },
      error: () => {
        this.loadingAvailability = false;
      }
    });
  }

  refreshAvailability(): void {
    if (!this.product) return;
    const tallaId = this.selectedVariant?.talla_id ?? undefined;
    const colorId = this.selectedVariant?.color_id ?? undefined;

    // Enviar solicitud por WebSocket en tiempo real
    this.stockWs.requestUpdate(tallaId, colorId);

    // Si WebSocket no está conectado todavía, respaldar con HTTP
    if (!this.isWsConnected) {
      this.loadAvailability(this.product.id, tallaId, colorId);
    }
  }

  loadRelated(productId: number): void {
    this.catalogService.getRelatedProducts(productId).subscribe({
      next: (prods) => {
        this.relatedProducts = prods || [];
      }
    });
  }

  increaseQty(): void {
    this.quantity++;
  }

  decreaseQty(): void {
    if (this.quantity > 1) this.quantity--;
  }

  addToCart(): void {
    if (!this.authService.isAuthenticated()) {
      this.toast.info('Debes iniciar sesión para añadir productos al carrito');
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: `/catalog/${this.product?.id}` } });
      return;
    }

    if (!this.selectedVariant) {
      this.toast.warning('Por favor selecciona una talla y un color');
      return;
    }

    this.addingToCart = true;
    this.cartService.addItem(this.selectedVariant.id, this.quantity).subscribe({
      next: () => {
        this.addingToCart = false;
      },
      error: () => {
        this.addingToCart = false;
      }
    });
  }

  openReservationModal(branch: DisponibilidadSucursal): void {
    this.selectedBranchForReservation = branch;
    this.showReservationModal = true;
  }

  onReservationModalClosed(success: boolean): void {
    this.showReservationModal = false;
    this.selectedBranchForReservation = null;
    if (success && this.product) {
      this.refreshAvailability();
    }
  }

  isColorDark(hex?: string): boolean {
    if (!hex) return false;
    const c = hex.substring(1);
    const rgb = parseInt(c, 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >>  8) & 0xff;
    const b = (rgb >>  0) & 0xff;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luma < 128;
  }
}
