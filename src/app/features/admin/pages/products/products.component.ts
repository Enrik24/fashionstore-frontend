import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogApiService } from '../../../../core/services/catalog-api.service';
import { SupplierApiService } from '../../../../core/services/supplier-api.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Producto, Categoria, Temporada, Talla, Color, ProductoCreateDto, ProductoUpdateDto, StockPorSucursalItem } from '../../../../core/models/catalog.model';
import { Proveedor } from '../../../../core/models/supplier.model';
import { Sucursal } from '../../../../core/models/branch.model';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, CurrencyFormatPipe, StatusBadgePipe],
  template: `
    <div class="page-container animate-fade-in">
      <!-- Toolbar -->
      <div class="toolbar-card card">
        <div class="toolbar-left">
          <div class="search-input-box">
            <i class="ri-search-line search-icon"></i>
            <input 
              type="text" 
              class="form-control with-icon" 
              placeholder="Buscar por SKU o nombre de prenda..."
              [value]="searchQuery()"
              (input)="onSearchChange($event)"
            />
          </div>

          <div class="filter-group">
            <select class="form-control select-filter" [value]="selectedCategoryFilter()" (change)="onCategoryFilterChange($event)">
              <option value="">Todas las Categorías</option>
              @for (cat of categories(); track cat.id) {
                <option [value]="cat.id">{{ cat.nombre }}</option>
              }
            </select>

            <select class="form-control select-filter" [value]="selectedStatusFilter()" (change)="onStatusFilterChange($event)">
              <option value="">Todos los Estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos</option>
              <option value="AGOTADO">Agotados</option>
              <option value="PROXIMO_INGRESO">Próximo Ingreso</option>
            </select>
          </div>
        </div>

        <div class="toolbar-right">
          <button class="btn btn-accent" (click)="openCreateProductModal()">
            <i class="ri-add-line"></i> Nuevo Producto
          </button>
        </div>
      </div>

      <!-- Products Table -->
      <div class="card table-card">
        <div class="table-card-header">
          <div class="header-count">
            <h3 class="table-title">Catálogo de Prendas & Productos (CU06)</h3>
            <span class="count-badge">{{ filteredProducts().length }} productos</span>
          </div>
          <button class="btn btn-secondary btn-sm" (click)="loadAllData()" [disabled]="isLoading()">
            <i class="ri-refresh-line" [class.spin-icon]="isLoading()"></i> Actualizar
          </button>
        </div>

        <div class="table-responsive">
          <table class="table-custom">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Prenda / Producto</th>
                <th>Categoría</th>
                <th>Temporada</th>
                <th>Proveedor</th>
                <th>Precio</th>
                <th>Estado</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (isLoading()) {
                <tr>
                  <td colspan="8" class="text-center py-8">
                    <i class="ri-loader-4-line spin-icon text-2xl text-accent"></i>
                    <p class="text-muted mt-2">Cargando catálogo de productos...</p>
                  </td>
                </tr>
              } @else if (filteredProducts().length === 0) {
                <tr>
                  <td colspan="8" class="text-center py-8 text-muted">
                    <i class="ri-t-shirt-2-line text-3xl mb-2"></i>
                    <p>No se encontraron productos registrados con los filtros seleccionados.</p>
                  </td>
                </tr>
              } @else {
                @for (product of filteredProducts(); track product.id) {
                  <tr>
                    <td>
                      <span class="sku-badge">{{ product.sku }}</span>
                    </td>
                    <td>
                      <div class="product-cell">
                        <div class="product-thumb">
                          <i class="ri-t-shirt-line"></i>
                        </div>
                        <div>
                          <div class="product-name">{{ product.nombre }}</div>
                          <div class="product-desc-sub">{{ product.descripcion | slice:0:45 }}...</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="badge badge-primary">{{ product.categoria?.nombre || getCategoryName(product.categoria_id) }}</span>
                    </td>
                    <td>
                      <span class="text-xs text-muted">{{ product.temporada?.nombre || 'General' }}</span>
                    </td>
                    <td>
                      <span class="text-xs font-medium">{{ product.proveedor?.nombre || 'Nacional' }}</span>
                    </td>
                    <td>
                      <span class="font-bold text-primary">{{ product.precio | currencyFormat }}</span>
                    </td>
                    <td>
                      <span class="badge" [ngClass]="(product.estado | statusBadge).class">
                        {{ (product.estado | statusBadge).label }}
                      </span>
                    </td>
                    <td>
                      <div class="action-buttons-flex">
                        <button class="btn-action-icon" title="Editar Producto" (click)="openEditProductModal(product)">
                          <i class="ri-edit-line"></i>
                        </button>
                        <button 
                          class="btn-action-icon" 
                          [class.btn-action-danger]="product.estado === 'ACTIVO'"
                          [class.btn-action-success]="product.estado !== 'ACTIVO'"
                          [title]="product.estado === 'ACTIVO' ? 'Desactivar Prenda' : 'Activar Prenda'" 
                          (click)="toggleProductStatus(product)"
                        >
                          <i [class]="product.estado === 'ACTIVO' ? 'ri-eye-off-line' : 'ri-eye-line'"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Create / Edit Product Modal -->
      <app-modal
        [isOpen]="isProductModalOpen()"
        [title]="isEditingProduct() ? 'Editar Prenda' : 'Registrar Nueva Prenda'"
        subtitle="Completa los atributos del catálogo, precios y distribución de existencias"
        icon="ri-t-shirt-2-line"
        maxWidth="750px"
        (closeEvent)="closeProductModal()"
      >
        <form [formGroup]="productForm" (ngSubmit)="saveProduct()" class="modal-form">
          <div class="grid grid-cols-2 form-row">
            <div class="form-group">
              <label class="form-label" for="p-sku">Código SKU <span class="required">*</span></label>
              <input id="p-sku" type="text" formControlName="sku" class="form-control" placeholder="Ej. CAM-SLIM-001">
            </div>

            <div class="form-group">
              <label class="form-label" for="p-nombre">Nombre de la Prenda <span class="required">*</span></label>
              <input id="p-nombre" type="text" formControlName="nombre" class="form-control" placeholder="Ej. Camisa Slim Fit Oxford">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="p-desc">Descripción Detallada <span class="required">*</span></label>
            <textarea id="p-desc" rows="2" formControlName="descripcion" class="form-control" placeholder="Composición 100% algodón peinado, corte ajustado..."></textarea>
          </div>

          <div class="grid grid-cols-3 form-row">
            <div class="form-group">
              <label class="form-label" for="p-precio">Precio Unitario (Bs.) <span class="required">*</span></label>
              <input id="p-precio" type="number" step="0.50" formControlName="precio" class="form-control" placeholder="189.00">
            </div>

            <div class="form-group">
              <label class="form-label" for="p-cat">Categoría <span class="required">*</span></label>
              <select id="p-cat" formControlName="categoria_id" class="form-control">
                @for (cat of categories(); track cat.id) {
                  <option [value]="cat.id">{{ cat.nombre }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="p-temp">Temporada</label>
              <select id="p-temp" formControlName="temporada_id" class="form-control">
                <option [value]="null">Sin temporada</option>
                @for (temp of seasons(); track temp.id) {
                  <option [value]="temp.id">{{ temp.nombre }}</option>
                }
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 form-row">
            <div class="form-group">
              <label class="form-label" for="p-prov">Proveedor</label>
              <select id="p-prov" formControlName="proveedor_id" class="form-control">
                <option [value]="null">Proveedor General</option>
                @for (prov of suppliers(); track prov.id) {
                  <option [value]="prov.id">{{ prov.nombre }} (NIT: {{ prov.nit }})</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="p-estado">Estado</label>
              <select id="p-estado" formControlName="estado" class="form-control">
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
                <option value="AGOTADO">AGOTADO</option>
                <option value="PROXIMO_INGRESO">PRÓXIMO INGRESO</option>
              </select>
            </div>
          </div>

          @if (!isEditingProduct()) {
            <!-- Initial Stock Distribution -->
            <div class="initial-stock-section">
              <h4 class="stock-sec-title"><i class="ri-archive-line"></i> Stock Inicial de Apertura (Opcional)</h4>
              <p class="text-xs text-muted mb-3">Distribuye existencias iniciales para la primera sucursal:</p>
              
              <div class="grid grid-cols-3 form-row">
                <div class="form-group">
                  <label class="form-label">Sucursal:</label>
                  <select class="form-control text-xs" #stockSucursal>
                    @for (branch of branches(); track branch.id) {
                      <option [value]="branch.id">{{ branch.nombre }}</option>
                    }
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Talla y Color:</label>
                  <div class="flex gap-1">
                    <select class="form-control text-xs" #stockTalla>
                      @for (t of sizes(); track t.id) {
                        <option [value]="t.id">{{ t.nombre }}</option>
                      }
                    </select>
                    <select class="form-control text-xs" #stockColor>
                      @for (c of colors(); track c.id) {
                        <option [value]="c.id">{{ c.nombre }}</option>
                      }
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Cantidad Inicial:</label>
                  <input type="number" class="form-control" value="25" min="0" #stockQty>
                </div>
              </div>
            </div>
          }

          <div class="modal-actions-box">
            <button type="button" class="btn btn-outline" (click)="closeProductModal()">Cancelar</button>
            <button type="submit" class="btn btn-accent" [disabled]="productForm.invalid || isSaving()">
              {{ isEditingProduct() ? 'Guardar Cambios' : 'Registrar Prenda' }}
            </button>
          </div>
        </form>
      </app-modal>
    </div>
  `,
  styles: [`
    .page-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .toolbar-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 1;
      flex-wrap: wrap;
    }

    .search-input-box {
      position: relative;
      min-width: 280px;
    }

    .search-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
    }

    .filter-group {
      display: flex;
      gap: 0.75rem;
    }

    .select-filter {
      min-width: 170px;
    }

    .table-card {
      padding: 0;
      overflow: hidden;
    }

    .table-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
      background: white;
    }

    .header-count {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .table-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--primary);
      margin: 0;
    }

    .count-badge {
      background: #f1f5f9;
      color: var(--secondary);
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.6rem;
      border-radius: var(--radius-full);
    }

    .sku-badge {
      font-family: monospace;
      font-weight: 700;
      background: #f1f5f9;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
      color: var(--primary);
    }

    .product-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .product-thumb {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-sm);
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--secondary);
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .product-name {
      font-weight: 600;
      color: var(--primary);
    }

    .product-desc-sub {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .action-buttons-flex {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.4rem;
    }

    .btn-action-icon {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
      background: white;
      color: var(--secondary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: #f8fafc;
        color: var(--primary);
        border-color: var(--primary);
      }

      &.btn-action-danger:hover {
        background: var(--error-bg);
        color: var(--error);
        border-color: var(--error);
      }

      &.btn-action-success:hover {
        background: var(--success-bg);
        color: var(--success);
        border-color: var(--success);
      }
    }

    .initial-stock-section {
      background: #f8fafc;
      border: 1px dashed var(--border-color);
      border-radius: var(--radius-md);
      padding: 1rem;
      margin-top: 0.5rem;
    }

    .stock-sec-title {
      font-size: 0.875rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      color: var(--primary);
      margin-bottom: 0.25rem;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-row {
      gap: 1rem;
    }

    .modal-actions-box {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-light);
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class ProductsComponent implements OnInit {
  private catalogApi = inject(CatalogApiService);
  private supplierApi = inject(SupplierApiService);
  private branchApi = inject(BranchApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  public products = signal<Producto[]>([]);
  public categories = signal<Categoria[]>([]);
  public seasons = signal<Temporada[]>([]);
  public suppliers = signal<Proveedor[]>([]);
  public branches = signal<Sucursal[]>([]);
  public sizes = signal<Talla[]>([]);
  public colors = signal<Color[]>([]);

  public isLoading = signal<boolean>(true);
  public isSaving = signal<boolean>(false);

  public searchQuery = signal<string>('');
  public selectedCategoryFilter = signal<string>('');
  public selectedStatusFilter = signal<string>('');

  // Modal
  public isProductModalOpen = signal<boolean>(false);
  public isEditingProduct = signal<boolean>(false);
  public selectedProductId = signal<number | null>(null);

  public productForm: FormGroup = this.fb.group({
    sku: ['', [Validators.required, Validators.minLength(3)]],
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    descripcion: ['', [Validators.required]],
    precio: [150.00, [Validators.required, Validators.min(1)]],
    categoria_id: [null, [Validators.required]],
    temporada_id: [null],
    proveedor_id: [null],
    estado: ['ACTIVO']
  });

  public filteredProducts = computed(() => {
    let list = this.products();
    const query = this.searchQuery().toLowerCase().trim();
    const catFilter = this.selectedCategoryFilter();
    const statusFilter = this.selectedStatusFilter();

    if (query) {
      list = list.filter(p => 
        p.nombre.toLowerCase().includes(query) || 
        p.sku.toLowerCase().includes(query)
      );
    }

    if (catFilter) {
      list = list.filter(p => p.categoria_id === +catFilter);
    }

    if (statusFilter) {
      list = list.filter(p => p.estado === statusFilter);
    }

    return list;
  });

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.isLoading.set(true);

    this.catalogApi.getCategories().subscribe(c => {
      this.categories.set(c);
      if (c.length > 0 && !this.productForm.get('categoria_id')?.value) {
        this.productForm.patchValue({ categoria_id: c[0].id });
      }
    });

    this.catalogApi.getSeasons().subscribe(s => this.seasons.set(s));
    this.supplierApi.getSuppliers().subscribe(s => this.suppliers.set(s));
    this.branchApi.getBranches().subscribe(b => this.branches.set(b));
    this.catalogApi.getSizes().subscribe(sz => this.sizes.set(sz));
    this.catalogApi.getColors().subscribe(cl => this.colors.set(cl));

    this.catalogApi.getProducts(0, 100).subscribe({
      next: (products) => {
        this.products.set(products);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  getCategoryName(catId: number): string {
    const cat = this.categories().find(c => c.id === catId);
    return cat ? cat.nombre : 'General';
  }

  onSearchChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  onCategoryFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedCategoryFilter.set(val);
  }

  onStatusFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedStatusFilter.set(val);
  }

  openCreateProductModal(): void {
    this.isEditingProduct.set(false);
    this.selectedProductId.set(null);
    this.productForm.reset({
      sku: 'PRD-' + Math.floor(1000 + Math.random() * 9000),
      nombre: '',
      descripcion: '',
      precio: 180.00,
      categoria_id: this.categories().length > 0 ? this.categories()[0].id : null,
      temporada_id: null,
      proveedor_id: null,
      estado: 'ACTIVO'
    });
    this.isProductModalOpen.set(true);
  }

  openEditProductModal(product: Producto): void {
    this.isEditingProduct.set(true);
    this.selectedProductId.set(product.id);
    this.productForm.patchValue({
      sku: product.sku,
      nombre: product.nombre,
      descripcion: product.descripcion,
      precio: product.precio,
      categoria_id: product.categoria_id,
      temporada_id: product.temporada_id || null,
      proveedor_id: product.proveedor_id || null,
      estado: product.estado
    });
    this.isProductModalOpen.set(true);
  }

  closeProductModal(): void {
    this.isProductModalOpen.set(false);
  }

  saveProduct(): void {
    if (this.productForm.invalid || this.isSaving()) return;

    this.isSaving.set(true);
    const formVal = this.productForm.value;

    if (this.isEditingProduct() && this.selectedProductId()) {
      const updateDto: ProductoUpdateDto = {
        nombre: formVal.nombre,
        descripcion: formVal.descripcion,
        precio: +formVal.precio,
        categoria_id: +formVal.categoria_id,
        temporada_id: formVal.temporada_id ? +formVal.temporada_id : undefined,
        proveedor_id: formVal.proveedor_id ? +formVal.proveedor_id : undefined,
        estado: formVal.estado
      };

      this.catalogApi.updateProduct(this.selectedProductId()!, updateDto).subscribe({
        next: () => {
          this.toast.success('Producto actualizado exitosamente.');
          this.isSaving.set(false);
          this.closeProductModal();
          this.loadAllData();
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      const stockItems: StockPorSucursalItem[] = [];
      if (this.branches().length > 0 && this.sizes().length > 0 && this.colors().length > 0) {
        stockItems.push({
          sucursal_id: this.branches()[0].id,
          talla_id: this.sizes()[0].id,
          color_id: this.colors()[0].id,
          cantidad: 20
        });
      }

      const createDto: ProductoCreateDto = {
        sku: formVal.sku,
        nombre: formVal.nombre,
        descripcion: formVal.descripcion,
        precio: +formVal.precio,
        categoria_id: +formVal.categoria_id,
        temporada_id: formVal.temporada_id ? +formVal.temporada_id : undefined,
        proveedor_id: formVal.proveedor_id ? +formVal.proveedor_id : undefined,
        estado: formVal.estado,
        stock_por_sucursal: stockItems
      };

      this.catalogApi.createProduct(createDto).subscribe({
        next: () => {
          this.toast.success('Producto creado y agregado al catálogo con existencias iniciales.');
          this.isSaving.set(false);
          this.closeProductModal();
          this.loadAllData();
        },
        error: () => this.isSaving.set(false)
      });
    }
  }

  toggleProductStatus(product: Producto): void {
    const nextStatus = product.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    this.catalogApi.updateProduct(product.id, { estado: nextStatus }).subscribe({
      next: () => {
        this.toast.info(`Estado de prenda cambiado a ${nextStatus}`);
        this.loadAllData();
      }
    });
  }
}
