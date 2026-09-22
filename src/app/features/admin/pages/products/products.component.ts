import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogApiService } from '../../../../core/services/catalog-api.service';
import { SupplierApiService } from '../../../../core/services/supplier-api.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Producto, Categoria, Temporada, Talla, Color, Coleccion, ProductoCreateDto, ProductoUpdateDto, StockPorSucursalItem } from '../../../../core/models/catalog.model';
import { Proveedor } from '../../../../core/models/supplier.model';
import { Sucursal } from '../../../../core/models/branch.model';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { forkJoin, of } from 'rxjs';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';

export interface VariantStockRow {
  sucursal_id: number;
  talla_id: number | null;
  color_id: number;
  cantidad: number;
  costo_variante?: number | null;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, PaginationComponent, CurrencyFormatPipe, StatusBadgePipe],
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

            <select class="form-control select-filter" [value]="selectedGenderFilter()" (change)="onGenderFilterChange($event)">
              <option value="">Todos los Géneros</option>
              <option value="HOMBRE">Hombre</option>
              <option value="MUJER">Mujer</option>
              <option value="UNISEX">Unisex</option>
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
                <th>Género</th>
                <th>Categoría</th>
                <th>Temporada</th>
                <th>Proveedor</th>
                <th>Precio</th>
                <th>Costo / Margen</th>
                <th>Estado</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (isLoading()) {
                <tr>
                  <td colspan="9" class="text-center py-8">
                    <i class="ri-loader-4-line spin-icon text-2xl text-accent"></i>
                    <p class="text-muted mt-2">Cargando catálogo de productos...</p>
                  </td>
                </tr>
              } @else if (filteredProducts().length === 0) {
                <tr>
                  <td colspan="9" class="text-center py-8 text-muted">
                    <i class="ri-t-shirt-2-line text-3xl mb-2"></i>
                    <p>No se encontraron productos registrados con los filtros seleccionados.</p>
                  </td>
                </tr>
              } @else {
                @for (product of paginatedProducts(); track product.id) {
                  <tr>
                    <td>
                      <span class="sku-badge">{{ product.sku }}</span>
                    </td>
                    <td>
                      <div class="product-cell">
                        <div class="product-thumb">
                          @if (product.imagenes && product.imagenes.length > 0) {
                            <img [src]="product.imagenes[0]" [alt]="product.nombre" class="product-thumb-img">
                          } @else {
                            <i class="ri-t-shirt-line"></i>
                          }
                        </div>
                        <div>
                          <div class="product-name">{{ product.nombre }}</div>
                          <div class="product-desc-sub">{{ product.descripcion | slice:0:45 }}...</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="badge" [ngClass]="product.genero === 'HOMBRE' ? 'badge-primary' : (product.genero === 'MUJER' ? 'badge-accent' : 'badge-secondary')">
                        {{ product.genero || 'UNISEX' }}
                      </span>
                    </td>
                    <td>
                      <span class="badge badge-primary">{{ product.categoria?.nombre || getCategoryName(product.categoria_id) }}</span>
                    </td>
                    <td>
                      <span class="text-xs text-muted">{{ product.temporada?.nombre || getSeasonName(product.temporada_id) }}</span>
                    </td>
                    <td>
                      <span class="text-xs font-medium">{{ product.proveedor?.nombre || getSupplierName(product.proveedor_id) }}</span>
                    </td>
                    <td>
                      <span class="font-bold text-primary">{{ product.precio | currencyFormat }}</span>
                    </td>
                    <td>
                      <span class="text-xs font-medium">{{ (product.costo_compra ?? 0) | currencyFormat }}</span>
                      <div class="text-xs" [style.color]="(product.precio - (product.costo_compra ?? 0)) < 0 ? 'var(--error)' : 'var(--text-muted)'">
                        {{ product.precio > 0 ? (((product.precio - (product.costo_compra ?? 0)) / product.precio * 100) | number:'1.0-0') : '0' }}% margen
                      </div>
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

        <!-- Paginación de Productos -->
        <app-pagination
          [currentPage]="currentPage()"
          [totalItems]="filteredProducts().length"
          [pageSize]="pageSize()"
          [pageSizeOptions]="[5, 10, 20, 50]"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)"
        ></app-pagination>
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
            <label class="form-label" for="p-desc">Descripción Detallada <span class="optional-hint">(opcional)</span></label>
            <textarea id="p-desc" rows="2" formControlName="descripcion" class="form-control" placeholder="Composición 100% algodón peinado, corte ajustado..."></textarea>
          </div>

          <div class="grid grid-cols-4 form-row">
            <div class="form-group">
              <label class="form-label" for="p-precio">Precio Unitario (Bs.) <span class="required">*</span></label>
              <input id="p-precio" type="number" step="0.50" formControlName="precio" class="form-control" placeholder="189.00">
            </div>

            <div class="form-group">
              <label class="form-label" for="p-costo">Costo Compra (Bs.) <span class="required">*</span></label>
              <input id="p-costo" type="number" step="0.50" min="0" formControlName="costo_compra" class="form-control" placeholder="90.00" title="Lo que te costó al proveedor. Vacío en variantes = hereda este valor">
              @if (productForm.get('precio')?.value && productForm.get('costo_compra')?.value !== null) {
                <small class="text-xs" [style.color]="(productForm.get('precio')?.value - productForm.get('costo_compra')?.value) < 0 ? 'var(--error)' : 'var(--text-muted)'">
                  Margen: Bs. {{ (productForm.get('precio')?.value - productForm.get('costo_compra')?.value) | number:'1.2-2' }}
                  ({{ productForm.get('precio')?.value > 0 ? ((productForm.get('precio')?.value - productForm.get('costo_compra')?.value) / productForm.get('precio')?.value * 100 | number:'1.1-1') : '0' }}%)
                  @if ((productForm.get('precio')?.value - productForm.get('costo_compra')?.value) < 0) { — ¡Vendes a pérdida! }
                </small>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="p-genero">Género</label>
              <select id="p-genero" formControlName="genero" class="form-control">
                <option value="HOMBRE">Hombre</option>
                <option value="MUJER">Mujer</option>
                <option value="UNISEX">Unisex</option>
              </select>
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

          <div class="form-group">
            <label class="form-label">Colecciones</label>
            @if (collections().length === 0) {
              <small class="text-xs text-muted">Aún no hay colecciones. Créalas en Características de Producto.</small>
            } @else {
              <div class="collections-checklist">
                @for (col of collections(); track col.id) {
                  <label class="check-item">
                    <input type="checkbox" [checked]="isCollectionSelected(col.id)" (change)="toggleCollection(col.id)" />
                    <span>{{ col.nombre }}</span>
                  </label>
                }
              </div>
              <small class="text-xs text-muted">Un producto puede pertenecer a varias colecciones.</small>
            }
          </div>

          <!-- Image Upload Section -->
          <div class="image-upload-section">
            <label class="form-label">
              <i class="ri-image-add-line"></i> Fotografías de la Prenda
              <span class="text-xs text-muted font-normal">(Cloudinary)</span>
            </label>

            <!-- Dropzone -->
            <div 
              class="upload-dropzone" 
              [class.is-uploading]="isUploadingImage()"
              (click)="fileInput.click()"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onFileDrop($event)"
            >
              <input 
                #fileInput 
                type="file" 
                accept="image/png,image/jpeg,image/webp,image/jpg" 
                multiple 
                style="display: none;" 
                (change)="onFilesSelected($event)"
              >
              @if (isUploadingImage()) {
                <i class="ri-loader-4-line spin-icon dropzone-icon"></i>
                <span class="dropzone-text">Subiendo imagen(es) a Cloudinary...</span>
                <span class="dropzone-hint">Por favor espera</span>
              } @else {
                <i class="ri-upload-cloud-2-line dropzone-icon"></i>
                <span class="dropzone-text">Haz clic o arrastra fotos aquí</span>
                <span class="dropzone-hint">Formatos soportados: JPG, PNG, WEBP</span>
              }
            </div>

            <!-- Previews -->
            @if (uploadedImages().length > 0) {
              <div class="image-preview-grid">
                @for (img of uploadedImages(); track img.url; let idx = $index) {
                  <div class="image-preview-card" [class.is-primary]="primaryImageIndex() === idx">
                    <img [src]="img.url" [alt]="'Foto ' + (idx + 1)" class="preview-img">
                    @if (primaryImageIndex() === idx) {
                      <span class="preview-badge-main">
                        <i class="ri-star-fill"></i> Principal
                      </span>
                    } @else {
                      <button 
                        type="button" 
                        class="btn-set-primary" 
                        title="Marcar como imagen principal" 
                        (click)="setPrimaryImage(idx, $event)"
                      >
                        <i class="ri-star-line"></i> Principal
                      </button>
                    }
                    <button 
                      type="button" 
                      class="btn-remove-img" 
                      title="Eliminar imagen" 
                      (click)="removeUploadedImage(idx, $event)"
                    >
                      <i class="ri-close-line"></i>
                    </button>
                  </div>
                }
              </div>
            }
          </div>

          @if (!isEditingProduct()) {
            <!-- Initial Stock / Variants Distribution -->
            <div class="initial-stock-section">
              <div class="stock-header-flex">
                <div>
                  <h4 class="stock-sec-title"><i class="ri-t-shirt-line"></i> Tallas, Colores y Existencias Iniciales</h4>
                  <p class="text-xs text-muted mb-0">Configura combinaciones (ej. S, M, L o "Sin Talla" para gorras/accesorios) con su stock por sucursal:</p>
                </div>
                <button type="button" class="btn btn-sm btn-outline" (click)="addVariantRow()">
                  <i class="ri-add-line"></i> Agregar Talla / Fila
                </button>
              </div>

              @if (variantRows().length === 0) {
                <div class="empty-variants-box">
                  <p class="text-xs text-muted mb-0">No has configurado existencias iniciales. Haz clic en "+ Agregar Talla / Fila" para añadir una combinación.</p>
                </div>
              } @else {
                <div class="variant-table-container">
                  <table class="variant-table">
                    <thead>
                      <tr>
                        <th>Sucursal</th>
                        <th>Talla</th>
                        <th>Color</th>
                        <th style="width: 100px;">Cantidad</th>
                        <th style="width: 110px;">Costo (Bs.)</th>
                        <th style="width: 44px; text-align: center;"></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of variantRows(); track idx; let idx = $index) {
                        <tr>
                          <td>
                            <select 
                              class="form-control-xs" 
                              [value]="row.sucursal_id"
                              (change)="updateVariantRow(idx, 'sucursal_id', $any($event.target).value)"
                            >
                              @for (branch of branches(); track branch.id) {
                                <option [value]="branch.id">{{ branch.nombre }}</option>
                              }
                            </select>
                          </td>
                          <td>
                            <select 
                              class="form-control-xs" 
                              [value]="row.talla_id === null ? 'null' : row.talla_id"
                              (change)="updateVariantRow(idx, 'talla_id', $any($event.target).value)"
                            >
                              <option value="null">-- Sin Talla (Gorra/Accesorio) --</option>
                              @for (t of sizes(); track t.id) {
                                <option [value]="t.id">{{ t.valor || t.nombre }}</option>
                              }
                            </select>
                          </td>
                          <td>
                            <select 
                              class="form-control-xs" 
                              [value]="row.color_id"
                              (change)="updateVariantRow(idx, 'color_id', $any($event.target).value)"
                            >
                              @for (c of colors(); track c.id) {
                                <option [value]="c.id">{{ c.nombre }}</option>
                              }
                            </select>
                          </td>
                          <td>
                            <input 
                              type="number" 
                              class="form-control-xs" 
                              min="0"
                              [value]="row.cantidad"
                              (input)="updateVariantRow(idx, 'cantidad', $any($event.target).value)"
                            >
                          </td>
                          <td>
                            <input 
                              type="number" 
                              class="form-control-xs" 
                              min="0"
                              step="0.50"
                              [value]="row.costo_variante ?? ''"
                              [placeholder]="productForm.get('costo_compra')?.value ?? ''"
                              title="Vacío = hereda costo base"
                              (input)="updateVariantRow(idx, 'costo_variante', $any($event.target).value)"
                            >
                          </td>
                          <td style="text-align: center;">
                            <button 
                              type="button" 
                              class="btn-delete-row" 
                              title="Eliminar fila" 
                              (click)="removeVariantRow(idx)"
                            >
                              <i class="ri-delete-bin-line"></i>
                            </button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
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

    .image-upload-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 0.25rem;
    }

    .upload-dropzone {
      border: 2px dashed var(--border-color);
      border-radius: var(--radius-md);
      padding: 1.25rem 1rem;
      text-align: center;
      cursor: pointer;
      background: #f8fafc;
      transition: all var(--transition-fast);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;

      &:hover {
        border-color: var(--accent);
        background: rgba(197, 160, 89, 0.05);
      }

      &.is-uploading {
        pointer-events: none;
        opacity: 0.75;
      }
    }

    .dropzone-icon {
      font-size: 1.75rem;
      color: var(--accent);
    }

    .dropzone-text {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--primary);
    }

    .dropzone-hint {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    .image-preview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 0.6rem;
      margin-top: 0.25rem;
    }

    .image-preview-card {
      position: relative;
      width: 100%;
      aspect-ratio: 1;
      border-radius: var(--radius-sm);
      overflow: hidden;
      border: 2px solid var(--border-color);
      background: #f1f5f9;
      transition: all var(--transition-fast);

      &.is-primary {
        border-color: var(--accent);
        box-shadow: 0 0 0 2px rgba(197, 160, 89, 0.3);
      }
    }

    .preview-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .preview-badge-main {
      position: absolute;
      top: 4px;
      left: 4px;
      background: var(--accent);
      color: white;
      font-size: 0.55rem;
      font-weight: 700;
      padding: 2px 5px;
      border-radius: 3px;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 2px;
      letter-spacing: 0.3px;
    }

    .btn-set-primary {
      position: absolute;
      bottom: 4px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      font-size: 0.55rem;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 3px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 2px;
      white-space: nowrap;
      opacity: 0;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--accent);
        color: white;
      }

      .image-preview-card:hover & {
        opacity: 1;
      }
    }

    .btn-remove-img {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.9);
      color: white;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: #dc2626;
        transform: scale(1.1);
      }
    }

    .product-thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: var(--radius-sm);
    }

    .initial-stock-section {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 0.85rem;
      margin-top: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .stock-header-flex {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.65rem;
      gap: 0.75rem;
    }

    .stock-sec-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin: 0 0 0.15rem 0;
    }

    .variant-table-container {
      max-height: 190px;
      overflow-y: auto;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      background: var(--bg-card);
    }

    .variant-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
    }

    .variant-table th {
      background: var(--bg-subtle, rgba(0,0,0,0.03));
      color: var(--text-muted);
      font-weight: 600;
      padding: 5px 8px;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .variant-table td {
      padding: 4px 8px;
      border-bottom: 1px solid var(--border-color);
      vertical-align: middle;
    }

    .variant-table tr:last-child td {
      border-bottom: none;
    }

    .form-control-xs {
      padding: 3px 6px;
      font-size: 0.78rem;
      height: 28px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
      background: var(--bg-card);
      color: var(--text-main);
      width: 100%;
      outline: none;

      &:focus {
        border-color: var(--accent);
      }
    }

    .btn-delete-row {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      width: 26px;
      height: 26px;
      border-radius: var(--radius-sm);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
      transition: all var(--transition-fast);

      &:hover {
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
      }
    }

    .empty-variants-box {
      text-align: center;
      padding: 0.85rem;
      border: 1px dashed var(--border-color);
      border-radius: var(--radius-sm);
      background: var(--bg-subtle, rgba(0,0,0,0.02));
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }

    .collections-checklist {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 0.35rem 0;
    }

    .check-item {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--secondary);
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-full);
      padding: 0.3rem 0.75rem;
      cursor: pointer;
    }

    .check-item input { cursor: pointer; }

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
  public collections = signal<Coleccion[]>([]);

  /** Colecciones seleccionadas en el formulario (N:M con el producto). */
  public selectedCollectionIds: number[] = [];

  public isLoading = signal<boolean>(true);
  public isSaving = signal<boolean>(false);

  public searchQuery = signal<string>('');
  public selectedCategoryFilter = signal<string>('');
  public selectedGenderFilter = signal<string>('');
  public selectedStatusFilter = signal<string>('');

  // Paginación
  public currentPage = signal<number>(1);
  public pageSize = signal<number>(10);

  // Modal
  public isProductModalOpen = signal<boolean>(false);
  public isEditingProduct = signal<boolean>(false);
  public selectedProductId = signal<number | null>(null);

  // Estado de imágenes (control de nuevas vs existentes para limpieza de huérfanas en Cloudinary)
  public uploadedImages = signal<{ url: string; public_id?: string; isNew: boolean }[]>([]);
  public isUploadingImage = signal<boolean>(false);
  public primaryImageIndex = signal<number>(0);

  // Variantes y existencias dinámicas (talla, color, sucursal, cantidad)
  public variantRows = signal<VariantStockRow[]>([]);

  public productForm: FormGroup = this.fb.group({
    sku: ['', [Validators.required, Validators.minLength(3)]],
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    descripcion: [''],
    precio: [150.00, [Validators.required, Validators.min(1)]],
    costo_compra: [90.00, [Validators.required, Validators.min(0)]],
    genero: ['UNISEX'],
    categoria_id: [null, [Validators.required]],
    temporada_id: [null],
    proveedor_id: [null],
    estado: ['ACTIVO']
  });

  public filteredProducts = computed(() => {
    let list = this.products();
    const query = this.searchQuery().toLowerCase().trim();
    const catFilter = this.selectedCategoryFilter();
    const genderFilter = this.selectedGenderFilter();
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

    if (genderFilter) {
      list = list.filter(p => (p.genero || 'UNISEX') === genderFilter);
    }

    if (statusFilter) {
      list = list.filter(p => p.estado === statusFilter);
    }

    return [...list].sort((a, b) => b.id - a.id);
  });

  public paginatedProducts = computed(() => {
    const list = this.filteredProducts();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.isLoading.set(true);
    this.currentPage.set(1); // Resetear a página 1 para que los productos nuevos sean visibles

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
    this.catalogApi.getCollections().subscribe(cs => this.collections.set(cs || []));

    this.catalogApi.getProducts(0, 500).subscribe({
      next: (products) => {
        this.products.set(products);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  getCategoryName(catId?: number | null): string {
    if (!catId) return 'General';
    const cat = this.categories().find(c => c.id === catId);
    return cat ? cat.nombre : 'General';
  }

  getSeasonName(seasonId?: number | null): string {
    if (!seasonId) return 'General';
    const season = this.seasons().find(s => s.id === seasonId);
    return season ? season.nombre : 'General';
  }

  getSupplierName(supplierId?: number | null): string {
    if (!supplierId) return 'Nacional';
    const sup = this.suppliers().find(s => s.id === supplierId);
    return sup ? sup.nombre : 'Nacional';
  }

  onSearchChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
    this.currentPage.set(1);
  }

  onCategoryFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedCategoryFilter.set(val);
    this.currentPage.set(1);
  }

  onGenderFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedGenderFilter.set(val);
    this.currentPage.set(1);
  }

  onStatusFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedStatusFilter.set(val);
    this.currentPage.set(1);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  // --- Métodos de Subida de Imágenes a Cloudinary ---
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files) {
      this.uploadFiles(event.dataTransfer.files);
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadFiles(input.files);
      input.value = '';
    }
  }

  uploadFiles(files: FileList | File[]): void {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    this.isUploadingImage.set(true);
    let pendingCount = fileArray.length;

    fileArray.forEach(file => {
      this.catalogApi.uploadImage(file).subscribe({
        next: (res) => {
          this.uploadedImages.update(prev => [
            ...prev,
            { url: res.secure_url || res.url, public_id: res.public_id, isNew: true }
          ]);
          pendingCount--;
          if (pendingCount <= 0) {
            this.isUploadingImage.set(false);
            this.toast.success('Imagen(es) subida(s) correctamente a Cloudinary');
          }
        },
        error: (err) => {
          console.error('Error subiendo imagen:', err);
          pendingCount--;
          if (pendingCount <= 0) {
            this.isUploadingImage.set(false);
          }
          this.toast.error('Error al subir una de las imágenes a Cloudinary.');
        }
      });
    });
  }

  removeUploadedImage(index: number, event: Event): void {
    event.stopPropagation();
    const img = this.uploadedImages()[index];
    if (!img) return;

    // Si es una imagen recién subida en este formulario, eliminarla de Cloudinary para no dejar huérfanas
    if (img.public_id && img.isNew) {
      this.catalogApi.deleteImage(img.public_id).subscribe({
        next: () => {
          this.toast.info('Imagen eliminada de Cloudinary');
        },
        error: (e) => console.error('Error al eliminar de Cloudinary:', e)
      });
    }

    this.uploadedImages.update(prev => prev.filter((_, i) => i !== index));

    // Ajustar el índice de la imagen principal si es necesario
    const currentPrimary = this.primaryImageIndex();
    if (index === currentPrimary) {
      // Si se eliminó la imagen principal, la nueva principal será la primera
      this.primaryImageIndex.set(0);
    } else if (index < currentPrimary) {
      // Si se eliminó una imagen antes de la principal, ajustar el índice
      this.primaryImageIndex.set(currentPrimary - 1);
    }
  }

  setPrimaryImage(index: number, event: Event): void {
    event.stopPropagation();
    if (index >= 0 && index < this.uploadedImages().length) {
      this.primaryImageIndex.set(index);
      this.toast.info('Imagen principal actualizada');
    }
  }

  getOrderedImages(): { url: string; public_id?: string; isNew: boolean }[] {
    const images = [...this.uploadedImages()];
    const primaryIdx = this.primaryImageIndex();

    if (primaryIdx > 0 && primaryIdx < images.length) {
      // Mover la imagen principal al inicio del array
      const [primaryImage] = images.splice(primaryIdx, 1);
      images.unshift(primaryImage);
    }

    return images;
  }

  addVariantRow(): void {
    const defaultBranch = this.branches().length > 0 ? this.branches()[0].id : 1;
    const defaultColor = this.colors().length > 0 ? this.colors()[0].id : 1;
    const defaultSize = this.sizes().length > 0 ? this.sizes()[0].id : null;
    this.variantRows.update(prev => [
      ...prev,
      { sucursal_id: defaultBranch, talla_id: defaultSize, color_id: defaultColor, cantidad: 10 }
    ]);
  }

  removeVariantRow(index: number): void {
    this.variantRows.update(prev => prev.filter((_, i) => i !== index));
  }

  updateVariantRow(index: number, field: keyof VariantStockRow, value: any): void {
    this.variantRows.update(rows => {
      const updated = [...rows];
      let parsedValue: any = value;
      if (field === 'talla_id') {
        parsedValue = (value === '' || value === 'null' || value === null) ? null : +value;
      } else if (field === 'cantidad') {
        parsedValue = Math.max(0, parseInt(value, 10) || 0);
      } else if (field === 'costo_variante') {
        parsedValue = (value === '' || value === null || value === undefined) ? null : Math.max(0, parseFloat(value) || 0);
      } else {
        parsedValue = +value;
      }
      updated[index] = {
        ...updated[index],
        [field]: parsedValue
      };
      return updated;
    });
  }

  openCreateProductModal(): void {
    this.isEditingProduct.set(false);
    this.selectedProductId.set(null);
    this.uploadedImages.set([]);
    this.primaryImageIndex.set(0);
    this.selectedCollectionIds = [];
    this.productForm.reset({
      sku: 'PRD-' + Date.now().toString().slice(-6) + Math.floor(10 + Math.random() * 90),
      nombre: '',
      descripcion: '',
      precio: 180.00,
      costo_compra: 108.00,
      genero: 'UNISEX',
      categoria_id: this.categories().length > 0 ? this.categories()[0].id : null,
      temporada_id: null,
      proveedor_id: null,
      estado: 'ACTIVO'
    });

    const defaultBranch = this.branches().length > 0 ? this.branches()[0].id : 1;
    const defaultColor = this.colors().length > 0 ? this.colors()[0].id : 1;
    const defaultSize = this.sizes().length > 0 ? this.sizes()[0].id : null;

    this.variantRows.set([
      { sucursal_id: defaultBranch, talla_id: defaultSize, color_id: defaultColor, cantidad: 25 }
    ]);
    this.isProductModalOpen.set(true);
  }

  openEditProductModal(product: Producto): void {
    this.isEditingProduct.set(true);
    this.selectedProductId.set(product.id);
    this.selectedCollectionIds = [];
    this.catalogApi.getProductCollections(product.id).subscribe({
      next: (cols) => { this.selectedCollectionIds = (cols || []).map(c => c.id); },
      error: () => { this.selectedCollectionIds = []; }
    });
    // Cargar imágenes existentes como isNew: false para no borrarlas al cancelar
    const existingImgs = (product.imagenes || []).map(url => ({
      url,
      isNew: false
    }));
    this.uploadedImages.set(existingImgs);
    this.primaryImageIndex.set(0);

    this.productForm.patchValue({
      sku: product.sku,
      nombre: product.nombre,
      descripcion: product.descripcion,
      precio: product.precio,
      costo_compra: product.costo_compra ?? 0,
      genero: product.genero || 'UNISEX',
      categoria_id: product.categoria_id,
      temporada_id: product.temporada_id || null,
      proveedor_id: product.proveedor_id || null,
      estado: product.estado
    });
    this.isProductModalOpen.set(true);
  }

  closeProductModal(): void {
    // Limpieza de huérfanas: si el admin subió imágenes en esta sesión y cancela el modal, se eliminan de Cloudinary
    const orphans = this.uploadedImages().filter(img => img.isNew && img.public_id);
    if (orphans.length > 0) {
      orphans.forEach(img => {
        if (img.public_id) {
          this.catalogApi.deleteImage(img.public_id).subscribe({
            next: () => console.log(`Imagen huérfana eliminada de Cloudinary: ${img.public_id}`),
            error: (e) => console.error(`Error al eliminar imagen huérfana ${img.public_id}:`, e)
          });
        }
      });
      this.toast.info('Imágenes temporales canceladas eliminadas de Cloudinary.');
    }

    this.uploadedImages.set([]);
    this.isProductModalOpen.set(false);
  }

  saveProduct(): void {
    if (this.productForm.invalid || this.isSaving()) return;

    this.isSaving.set(true);
    const formVal = this.productForm.value;
    // Usar getOrderedImages() para que la imagen principal sea la primera
    const imageUrls = this.getOrderedImages().map(img => img.url);
    const coleccionesElegidas = [...this.selectedCollectionIds];

    if (this.isEditingProduct() && this.selectedProductId()) {
      const updateDto: ProductoUpdateDto = {
        nombre: formVal.nombre,
        descripcion: formVal.descripcion,
        precio: +formVal.precio,
        costo_compra: formVal.costo_compra !== null && formVal.costo_compra !== undefined && formVal.costo_compra !== '' ? +formVal.costo_compra : undefined,
        genero: formVal.genero,
        categoria_id: +formVal.categoria_id,
        temporada_id: formVal.temporada_id ? +formVal.temporada_id : undefined,
        proveedor_id: formVal.proveedor_id ? +formVal.proveedor_id : undefined,
        estado: formVal.estado,
        imagenes: imageUrls
      };

      this.catalogApi.updateProduct(this.selectedProductId()!, updateDto).subscribe({
        next: () => {
          this.syncProductCollections(this.selectedProductId()!, coleccionesElegidas, () => {
            this.toast.success('Producto actualizado exitosamente.');
            this.isSaving.set(false);
            this.uploadedImages.set([]); // Limpia para no ejecutar cleanup al cerrar
            this.isProductModalOpen.set(false);
            this.loadAllData();
          });
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      const stockItems: StockPorSucursalItem[] = this.variantRows().map(r => ({
        sucursal_id: +r.sucursal_id,
        talla_id: r.talla_id !== null ? +r.talla_id : null,
        color_id: +r.color_id,
        cantidad: +r.cantidad || 0,
        costo_variante: r.costo_variante !== null && r.costo_variante !== undefined && r.costo_variante !== ('' as any) ? +r.costo_variante : null
      }));

      const createDto: ProductoCreateDto = {
        sku: formVal.sku,
        nombre: formVal.nombre,
        descripcion: formVal.descripcion,
        precio: +formVal.precio,
        costo_compra: +formVal.costo_compra || 0,
        genero: formVal.genero,
        categoria_id: +formVal.categoria_id,
        temporada_id: formVal.temporada_id ? +formVal.temporada_id : undefined,
        proveedor_id: formVal.proveedor_id ? +formVal.proveedor_id : undefined,
        estado: formVal.estado,
        imagenes: imageUrls,
        stock_por_sucursal: stockItems.length > 0 ? stockItems : undefined
      };

      this.catalogApi.createProduct(createDto).subscribe({
        next: (created) => {
          this.syncProductCollections(created.id, coleccionesElegidas, () => {
            this.toast.success('Producto creado y agregado al catálogo con imágenes y existencias.');
            this.isSaving.set(false);
            this.uploadedImages.set([]); // Limpia para no ejecutar cleanup al cerrar
            this.isProductModalOpen.set(false);
            this.loadAllData();
          });
        },
        error: () => this.isSaving.set(false)
      });
    }
  }

  isCollectionSelected(id: number): boolean {
    return this.selectedCollectionIds.includes(id);
  }

  toggleCollection(id: number): void {
    this.selectedCollectionIds = this.isCollectionSelected(id)
      ? this.selectedCollectionIds.filter(x => x !== id)
      : [...this.selectedCollectionIds, id];
  }

  /**
   * Sincroniza las colecciones del producto (agrega las nuevas, quita las desmarcadas).
   * Al crear, el producto no tiene colecciones previas: solo agrega.
   */
  private syncProductCollections(productId: number, elegidas: number[], done: () => void): void {
    this.catalogApi.getProductCollections(productId).subscribe({
      next: (actuales) => {
        const actualesIds = (actuales || []).map(c => c.id);
        const agregar = elegidas.filter(id => !actualesIds.includes(id));
        const quitar = actualesIds.filter(id => !elegidas.includes(id));
        if (agregar.length === 0 && quitar.length === 0) {
          done();
          return;
        }
        forkJoin({
          agregadas: agregar.length > 0
            ? forkJoin(agregar.map(id => this.catalogApi.associateProductCollection(productId, id)))
            : of([]),
          quitadas: quitar.length > 0
            ? forkJoin(quitar.map(id => this.catalogApi.removeProductCollection(productId, id)))
            : of([])
        }).subscribe({
          next: () => done(),
          error: () => {
            this.toast.error('Producto guardado, pero hubo un error sincronizando colecciones.');
            done();
          }
        });
      },
      error: () => done()
    });
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
