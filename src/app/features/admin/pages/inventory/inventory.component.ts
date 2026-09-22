import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InventoryApiService } from '../../../../core/services/inventory-api.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Inventario, MovimientoInventario, MovimientoInventarioCreateDto, TipoMovimiento } from '../../../../core/models/inventory.model';
import { Sucursal } from '../../../../core/models/branch.model';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';

export interface GroupedProductInventory {
  productId: number;
  productName: string;
  productSku: string;
  productCategory?: string;
  productImage?: string;
  items: Inventario[];
  totalStock: number;
  totalReserved: number;
  totalSold: number;
  hasLowStock: boolean;
  isOutOfStock: boolean;
  branchNames: string[];
  variantsCount: number;
}

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, PaginationComponent, StatusBadgePipe],
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
              placeholder="Buscar por producto, talla, color, SKU..."
              [value]="searchQuery()"
              (input)="onSearchChange($event)"
            />
          </div>

          <div class="filter-group">
            <select class="form-control select-filter" [value]="selectedBranchFilter()" (change)="onBranchFilterChange($event)">
              <option value="">Todas las Sucursales</option>
              @for (branch of branches(); track branch.id) {
                <option [value]="branch.id">{{ branch.nombre }}</option>
              }
            </select>

            <select class="form-control select-filter" [value]="selectedStatusFilter()" (change)="onStatusFilterChange($event)">
              <option value="">Todos los Estados</option>
              <option value="DISPONIBLE">Disponible</option>
              <option value="BAJO_STOCK">Bajo Stock</option>
              <option value="AGOTADO">Agotado</option>
            </select>
          </div>
        </div>

        <div class="toolbar-right">
          <button class="btn btn-secondary" (click)="openMovementsHistoryModal()">
            <i class="ri-history-line"></i> Historial de Movimientos
          </button>
          <button class="btn btn-accent" (click)="openRegisterMovementModal()">
            <i class="ri-arrow-up-down-line"></i> Registrar Movimiento
          </button>
        </div>
      </div>

      <!-- Inventory Container -->
      <div class="card inventory-main-card">
        <div class="table-card-header">
          <div class="header-count">
            <h3 class="table-title">Control de Existencias por Sucursal</h3>
            <span class="count-badge count-badge-primary">
              <i class="ri-shopping-bag-3-line"></i> {{ groupedInventory().length }} productos
            </span>
            <span class="count-badge">
              <i class="ri-t-shirt-2-line"></i> {{ filteredInventory().length }} variantes en stock
            </span>
          </div>

          <div class="header-actions">
            @if (viewMode() === 'accordion') {
              <div class="expand-collapse-group">
                <button 
                  type="button"
                  class="btn-text-action" 
                  (click)="expandAll()" 
                  title="Expandir todos los productos"
                >
                  <i class="ri-expand-vertical-line"></i> Expandir todo
                </button>
                <span class="action-divider">|</span>
                <button 
                  type="button"
                  class="btn-text-action" 
                  (click)="collapseAll()" 
                  title="Colapsar todos los productos"
                >
                  <i class="ri-collapse-vertical-line"></i> Colapsar todo
                </button>
              </div>
            }

            <div class="view-toggle-group">
              <button 
                type="button"
                class="view-toggle-btn" 
                [class.active]="viewMode() === 'accordion'"
                (click)="switchViewMode('accordion')"
                title="Vista Acordeón Agrupado por Producto"
              >
                <i class="ri-folder-reduce-line"></i> Agrupado
              </button>
              <button 
                type="button"
                class="view-toggle-btn" 
                [class.active]="viewMode() === 'flat'"
                (click)="switchViewMode('flat')"
                title="Vista Plana Tradicional"
              >
                <i class="ri-table-line"></i> Lista Plana
              </button>
            </div>

            <button class="btn btn-secondary btn-sm" (click)="loadInventory()" [disabled]="isLoading()">
              <i class="ri-refresh-line" [class.spin-icon]="isLoading()"></i> Actualizar
            </button>
          </div>
        </div>

        @if (isLoading()) {
          <div class="loading-state py-12 text-center">
            <i class="ri-loader-4-line spin-icon text-3xl text-accent"></i>
            <p class="text-muted mt-3">Cargando existencias y variantes de inventario...</p>
          </div>
        } @else if (filteredInventory().length === 0) {
          <div class="empty-state py-12 text-center">
            <div class="empty-icon"><i class="ri-archive-line"></i></div>
            <h4>No se encontraron registros de inventario</h4>
            <p class="text-muted">Prueba cambiando los filtros de búsqueda, sucursal o estado.</p>
          </div>
        } @else {
          <!-- VISTA ACORDEÓN AGRUPADA POR PRODUCTO -->
          @if (viewMode() === 'accordion') {
            <div class="accordion-inventory-list">
              @for (group of paginatedGroupedInventory(); track group.productId) {
                <div class="product-accordion-item" [class.is-expanded]="isProductExpanded(group.productId)">
                  <!-- Encabezado del Acordeón (Fila de Producto) -->
                  <div class="accordion-header" (click)="toggleProduct(group.productId)">
                    <div class="accordion-header-left">
                      <button 
                        type="button" 
                        class="toggle-chevron-btn" 
                        [class.expanded]="isProductExpanded(group.productId)"
                        aria-label="Alternar variantes de producto"
                      >
                        <i class="ri-arrow-right-s-line"></i>
                      </button>

                      <div class="product-thumb-box">
                        @if (group.productImage) {
                          <img [src]="group.productImage" [alt]="group.productName" class="product-thumb-img" />
                        } @else {
                          <div class="product-thumb-fallback"><i class="ri-t-shirt-2-line"></i></div>
                        }
                      </div>

                      <div class="product-main-info">
                        <div class="product-name-row">
                          <h4 class="product-title">{{ group.productName }}</h4>
                          @if (group.productCategory) {
                            <span class="category-pill">{{ group.productCategory }}</span>
                          }
                        </div>
                        <div class="product-sub-row">
                          <span class="sku-tag"><i class="ri-barcode-line"></i> SKU: {{ group.productSku }}</span>
                          <span class="branches-tag">
                            <i class="ri-store-2-line"></i> 
                            {{ group.branchNames.join(', ') || 'Sin sucursal asignada' }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="accordion-header-right">
                      <!-- Resumen de Variantes / Tallas -->
                      <div class="metric-pill variants-count-pill">
                        <i class="ri-stack-line"></i>
                        <span><strong>{{ group.variantsCount }}</strong> {{ group.variantsCount === 1 ? 'talla / variante' : 'tallas / variantes' }}</span>
                      </div>

                      <!-- Resumen de Stock Total -->
                      <div class="metric-pill stock-total-pill" [class.stock-zero]="group.totalStock === 0" [class.stock-warn]="group.hasLowStock">
                        <span class="pill-label">Total:</span>
                        <strong class="pill-value">{{ group.totalStock }} u.</strong>
                      </div>

                      <!-- Estado General del Producto -->
                      <div class="status-box">
                        @if (group.totalStock === 0) {
                          <span class="badge badge-danger"><i class="ri-close-circle-line"></i> Agotado</span>
                        } @else if (group.hasLowStock) {
                          <span class="badge badge-warning"><i class="ri-alert-line"></i> Bajo Stock</span>
                        } @else {
                          <span class="badge badge-success"><i class="ri-checkbox-circle-line"></i> Disponible</span>
                        }
                      </div>
                    </div>
                  </div>

                  <!-- Cuerpo Expandido con Tabla de Tallas / Variantes -->
                  @if (isProductExpanded(group.productId)) {
                    <div class="accordion-body animate-slide-down">
                      <div class="variant-table-wrapper">
                        <table class="table-custom variant-subtable">
                          <thead>
                            <tr>
                              <th>Talla</th>
                              <th>Color</th>
                              <th>Sucursal</th>
                              <th>Stock Físico</th>
                              <th>Reservado</th>
                              <th>Vendido</th>
                              <th>Disponible</th>
                              <th>Estado</th>
                              <th class="text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (item of group.items; track item.id) {
                              <tr [class.row-alert]="item.cantidad <= item.stock_minimo">
                                <td>
                                  <div class="size-badge-box">
                                    <span class="size-badge">
                                      {{ item.variante_producto?.talla?.valor || item.variante_producto?.talla?.nombre || 'Única' }}
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <div class="color-badge-box">
                                    @if (item.variante_producto?.color?.codigo_hex) {
                                      <span 
                                        class="color-dot" 
                                        [style.background-color]="item.variante_producto?.color?.codigo_hex"
                                      ></span>
                                    }
                                    <span class="color-name">
                                      {{ item.variante_producto?.color?.nombre || 'Estándar' }}
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <span class="branch-badge">
                                    <i class="ri-store-line"></i> {{ item.sucursal?.nombre || 'Sucursal #' + item.sucursal_id }}
                                  </span>
                                </td>
                                <td>
                                  <div class="stock-cell">
                                    <strong class="stock-number" [class.text-danger]="item.cantidad <= item.stock_minimo">
                                      {{ item.cantidad }} u.
                                    </strong>
                                    <span class="min-stock-hint" title="Stock Mínimo Configurado">
                                      (Mín: {{ item.stock_minimo }} u.)
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <span class="text-sm text-muted">{{ item.cantidad_reservada }} u.</span>
                                </td>
                                <td>
                                  <span class="text-sm text-muted">{{ item.cantidad_vendida }} u.</span>
                                </td>
                                <td>
                                  <span class="available-qty" [class.text-danger]="item.cantidad_disponible === 0">
                                    {{ item.cantidad_disponible }} u.
                                  </span>
                                </td>
                                <td>
                                  @if (item.cantidad === 0) {
                                    <span class="badge badge-danger">Agotado</span>
                                  } @else if (item.cantidad <= item.stock_minimo) {
                                    <span class="badge badge-warning">Bajo Stock</span>
                                  } @else {
                                    <span class="badge badge-success">Disponible</span>
                                  }
                                </td>
                                <td>
                                  <div class="action-buttons-flex">
                                    <button 
                                      type="button"
                                      class="btn-action-icon" 
                                      title="Ajuste Rápido de Stock" 
                                      (click)="openQuickAdjustModal(item)"
                                    >
                                      <i class="ri-equalizer-line"></i>
                                    </button>
                                    <button 
                                      type="button"
                                      class="btn-action-icon btn-action-accent" 
                                      title="Registrar Entrada/Salida" 
                                      (click)="openRegisterMovementModal(item)"
                                    >
                                      <i class="ri-add-circle-line"></i>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- VISTA PLANA TRADICIONAL (TABLA COMPLETA) -->
          @if (viewMode() === 'flat') {
            <div class="table-responsive">
              <table class="table-custom">
                <thead>
                  <tr>
                    <th>Prenda / Producto</th>
                    <th>Sucursal</th>
                    <th>Talla & Color</th>
                    <th>Stock Actual</th>
                    <th>Reservado</th>
                    <th>Vendido</th>
                    <th>Estado</th>
                    <th class="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of paginatedFilteredInventory(); track item.id) {
                    <tr [class.row-alert]="item.cantidad <= item.stock_minimo">
                      <td>
                        <div class="inventory-product-cell">
                          <div class="inventory-icon"><i class="ri-t-shirt-2-line"></i></div>
                          <div>
                            <strong>{{ item.variante_producto?.producto?.nombre || 'Prenda #' + item.variante_producto_id }}</strong>
                            <div class="text-xs text-muted">SKU: {{ item.variante_producto?.producto?.sku || 'N/A' }}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="badge badge-primary">{{ item.sucursal?.nombre || 'Sucursal #' + item.sucursal_id }}</span>
                      </td>
                      <td>
                        <div class="variant-tags">
                          <span class="variant-tag size-tag">Talla: {{ item.variante_producto?.talla?.valor || item.variante_producto?.talla?.nombre || '-' }}</span>
                          <span class="variant-tag color-tag">Color: {{ item.variante_producto?.color?.nombre || '-' }}</span>
                        </div>
                      </td>
                      <td>
                        <span class="stock-qty-badge" [class.stock-danger]="item.cantidad <= item.stock_minimo">
                          {{ item.cantidad }} u.
                        </span>
                      </td>
                      <td>
                        <span class="text-xs text-muted">{{ item.cantidad_reservada }} u.</span>
                      </td>
                      <td>
                        <span class="text-xs text-muted">{{ item.cantidad_vendida }} u.</span>
                      </td>
                      <td>
                        @if (item.cantidad === 0) {
                          <span class="badge badge-danger">Agotado</span>
                        } @else if (item.cantidad <= item.stock_minimo) {
                          <span class="badge badge-warning">Bajo Stock</span>
                        } @else {
                          <span class="badge badge-success">Disponible</span>
                        }
                      </td>
                      <td>
                        <div class="action-buttons-flex">
                          <button class="btn-action-icon" title="Ajuste Rápido de Stock" (click)="openQuickAdjustModal(item)">
                            <i class="ri-equalizer-line"></i>
                          </button>
                          <button class="btn-action-icon" title="Registrar Entrada/Salida" (click)="openRegisterMovementModal(item)">
                            <i class="ri-add-circle-line"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <!-- Paginación de Inventario -->
          <app-pagination
            [currentPage]="currentPage()"
            [totalItems]="viewMode() === 'accordion' ? groupedInventory().length : filteredInventory().length"
            [pageSize]="pageSize()"
            [pageSizeOptions]="[5, 10, 20, 50]"
            (pageChange)="onPageChange($event)"
            (pageSizeChange)="onPageSizeChange($event)"
          ></app-pagination>
        }
      </div>

      <!-- Register Movement Modal -->
      <app-modal
        [isOpen]="isMovementModalOpen()"
        title="Registrar Movimiento de Inventario"
        subtitle="Registra entradas de proveedor, transferencias o ajustes de stock con motivo"
        icon="ri-arrow-up-down-line"
        (closeEvent)="closeMovementModal()"
      >
        <form [formGroup]="movementForm" (ngSubmit)="saveMovement()" class="modal-form">
          <div class="form-group">
            <label class="form-label" for="m-inv">Seleccionar Registro de Inventario <span class="required">*</span></label>
            <select id="m-inv" formControlName="inventario_id" class="form-control" (change)="onMovementInventoryChange($event)">
              @for (inv of inventoryList(); track inv.id) {
                <option [value]="inv.id">
                  {{ inv.variante_producto?.producto?.nombre || 'Prenda #' + inv.variante_producto_id }} [{{ getVariantLabel(inv) }}] — {{ inv.sucursal?.nombre }} (Stock: {{ inv.cantidad }} u.)
                </option>
              }
            </select>
          </div>

          @if (selectedMovementInventory(); as inv) {
            <div class="selected-variant-card">
              <div class="variant-preview-header">
                <div class="preview-icon"><i class="ri-t-shirt-2-line"></i></div>
                <div class="preview-info">
                  <span class="preview-title">{{ inv.variante_producto?.producto?.nombre || 'Prenda #' + inv.variante_producto_id }}</span>
                  <span class="preview-sku">SKU: {{ inv.variante_producto?.producto?.sku || 'N/A' }} | Sucursal: <strong>{{ inv.sucursal?.nombre }}</strong></span>
                </div>
              </div>
              <div class="preview-badges">
                <span class="preview-badge"><i class="ri-ruler-2-line"></i> Talla: <strong>{{ inv.variante_producto?.talla?.valor || inv.variante_producto?.talla?.nombre || 'Sin Talla' }}</strong></span>
                <span class="preview-badge"><i class="ri-palette-line"></i> Color: <strong>{{ inv.variante_producto?.color?.nombre || 'Sin Color' }}</strong></span>
                <span class="preview-badge stock-badge"><i class="ri-inbox-archive-line"></i> Stock Actual: <strong>{{ inv.cantidad }} u.</strong></span>
              </div>
            </div>
          }

          <div class="grid grid-cols-2 form-row">
            <div class="form-group">
              <label class="form-label" for="m-tipo">Tipo de Movimiento <span class="required">*</span></label>
              <select id="m-tipo" formControlName="tipo" class="form-control">
                <option value="ENTRADA">ENTRADA (Recepción Proveedor)</option>
                <option value="SALIDA">SALIDA (Merma o Traslado)</option>
                <option value="AJUSTE">AJUSTE (Auditoría física)</option>
                <option value="DEVOLUCION">DEVOLUCIÓN</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="m-cant">Cantidad de Unidades <span class="required">*</span></label>
              <input id="m-cant" type="number" min="1" formControlName="cantidad" class="form-control" placeholder="10">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="m-motivo">Motivo / Justificación del Movimiento <span class="required">*</span></label>
            <textarea id="m-motivo" rows="3" formControlName="motivo" class="form-control" placeholder="Ej. Recepción de lote 45 de fábrica nacional..."></textarea>
          </div>

          <div class="modal-actions-box">
            <button type="button" class="btn btn-outline" (click)="closeMovementModal()">Cancelar</button>
            <button type="submit" class="btn btn-accent" [disabled]="movementForm.invalid || isSaving()">
              @if (isSaving()) {
                <i class="ri-loader-4-line spin-icon"></i> Procesando...
              } @else {
                <i class="ri-checkbox-circle-line"></i> Confirmar Movimiento
              }
            </button>
          </div>
        </form>
      </app-modal>

      <!-- Quick Adjust Modal -->
      <app-modal
        [isOpen]="isAdjustModalOpen()"
        title="Ajuste Directo de Existencias"
        subtitle="Modifica la cantidad física total registrada en sucursal"
        icon="ri-equalizer-line"
        (closeEvent)="closeAdjustModal()"
      >
        @if (selectedInventoryForAdjust(); as item) {
          <form [formGroup Philip]="adjustForm" [formGroup]="adjustForm" (ngSubmit)="saveQuickAdjust()" class="modal-form">
            <div class="adjust-info-box card glass mb-4">
              <div class="variant-preview-header">
                <div class="preview-icon"><i class="ri-t-shirt-2-line"></i></div>
                <div class="preview-info">
                  <h4 style="margin: 0; font-size: 1rem; font-weight: 700;">{{ item.variante_producto?.producto?.nombre }}</h4>
                  <span class="preview-sku">SKU: {{ item.variante_producto?.producto?.sku || 'N/A' }} | Sucursal: <strong>{{ item.sucursal?.nombre }}</strong></span>
                </div>
              </div>
              <div class="preview-badges mt-2">
                <span class="preview-badge"><i class="ri-ruler-2-line"></i> Talla: <strong>{{ item.variante_producto?.talla?.valor || item.variante_producto?.talla?.nombre || 'Sin Talla' }}</strong></span>
                <span class="preview-badge"><i class="ri-palette-line"></i> Color: <strong>{{ item.variante_producto?.color?.nombre || 'Sin Color' }}</strong></span>
                <span class="preview-badge stock-badge"><i class="ri-inbox-archive-line"></i> Existencia actual: <strong>{{ item.cantidad }} u.</strong></span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="a-qty">Nueva Cantidad Total <span class="required">*</span></label>
              <input id="a-qty" type="number" min="0" formControlName="cantidad" class="form-control" placeholder="0">
            </div>

            <div class="form-group">
              <label class="form-label" for="a-motivo">Motivo del Ajuste <span class="required">*</span></label>
              <textarea id="a-motivo" rows="2" formControlName="motivo" class="form-control" placeholder="Ej. Recuento físico trimestral..."></textarea>
            </div>

            <div class="modal-actions-box">
              <button type="button" class="btn btn-outline" (click)="closeAdjustModal()">Cancelar</button>
              <button type="submit" class="btn btn-accent" [disabled]="adjustForm.invalid || isSaving()">
                Guardar Ajuste
              </button>
            </div>
          </form>
        }
      </app-modal>

      <!-- Movements History Modal -->
      <app-modal
        [isOpen]="isHistoryModalOpen()"
        title="Historial de Movimientos de Inventario"
        subtitle="Registro de transacciones de entrada, salida y ajustes en bitácora"
        icon="ri-history-line"
        maxWidth="850px"
        (closeEvent)="closeMovementsHistoryModal()"
      >
        <div class="movements-history-table">
          <div class="table-responsive">
            <table class="table-custom">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Prenda / Variante</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Antes / Después</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                @if (movementsHistory().length === 0) {
                  <tr>
                    <td colspan="6" class="text-center py-6 text-muted">
                      No hay historial de movimientos disponible.
                    </td>
                  </tr>
                } @else {
                  @for (m of movementsHistory(); track m.id) {
                    <tr>
                      <td><span class="text-xs text-muted">{{ m.fecha | date:'dd/MM/yyyy HH:mm' }}</span></td>
                      <td>
                        @if (m.inventario?.variante_producto?.producto?.nombre) {
                          <div class="text-xs">
                            <strong>{{ m.inventario?.variante_producto?.producto?.nombre }}</strong>
                            <div class="text-muted">
                              Talla: {{ m.inventario?.variante_producto?.talla?.valor || m.inventario?.variante_producto?.talla?.nombre || '-' }} | 
                              Color: {{ m.inventario?.variante_producto?.color?.nombre || '-' }}
                            </div>
                          </div>
                        } @else {
                          <span class="text-xs text-muted">Inventario #{{ m.inventario_id }}</span>
                        }
                      </td>
                      <td>
                        <span class="badge badge-primary">{{ m.tipo }}</span>
                      </td>
                      <td><strong>{{ m.cantidad }} u.</strong></td>
                      <td>
                        <span class="text-xs">{{ m.cantidad_anterior }} &rarr; {{ m.cantidad_posterior }} u.</span>
                      </td>
                      <td><span class="text-xs">{{ m.motivo }}</span></td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>

          <div class="modal-actions-box mt-4">
            <button type="button" class="btn btn-outline" (click)="closeMovementsHistoryModal()">Cerrar</button>
          </div>
        </div>
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

    .toolbar-right {
      display: flex;
      gap: 0.75rem;
    }

    .inventory-main-card {
      padding: 0;
      overflow: hidden;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-card);
      box-shadow: var(--shadow-sm);
    }

    .table-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
      background: white;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-count {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .table-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--primary);
      margin: 0;
      margin-right: 0.5rem;
    }

    .count-badge {
      background: #f1f5f9;
      color: var(--secondary);
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.65rem;
      border-radius: var(--radius-full);
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;

      &.count-badge-primary {
        background: rgba(15, 23, 42, 0.08);
        color: var(--primary);
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .expand-collapse-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
    }

    .btn-text-action {
      background: transparent;
      border: none;
      color: var(--secondary);
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
      transition: all var(--transition-fast);

      &:hover {
        background: #f1f5f9;
        color: var(--accent);
      }
    }

    .action-divider {
      color: var(--border-color);
    }

    .view-toggle-group {
      display: flex;
      background: #f1f5f9;
      padding: 0.2rem;
      border-radius: var(--radius-sm);
      gap: 0.2rem;
    }

    .view-toggle-btn {
      background: transparent;
      border: none;
      padding: 0.35rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      transition: all var(--transition-fast);

      &.active {
        background: white;
        color: var(--primary);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      &:hover:not(.active) {
        color: var(--primary);
      }
    }

    /* ACORDEÓN AGRUPADO POR PRODUCTO */
    .accordion-inventory-list {
      display: flex;
      flex-direction: column;
    }

    .product-accordion-item {
      border-bottom: 1px solid var(--border-color);
      transition: background-color var(--transition-fast);

      &:last-child {
        border-bottom: none;
      }

      &.is-expanded {
        background: #fafcff;
      }
    }

    .accordion-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      cursor: pointer;
      user-select: none;
      gap: 1.5rem;
      transition: background-color var(--transition-fast);

      &:hover {
        background: rgba(15, 23, 42, 0.02);
      }
    }

    .accordion-header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 1;
      min-width: 0;
    }

    .toggle-chevron-btn {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
      background: white;
      color: var(--secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform var(--transition-normal), background-color var(--transition-fast);
      flex-shrink: 0;
      font-size: 1.15rem;

      &.expanded {
        transform: rotate(90deg);
        background: var(--primary);
        color: white;
        border-color: var(--primary);
      }
    }

    .product-thumb-box {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-sm);
      overflow: hidden;
      flex-shrink: 0;
      background: #f1f5f9;
      border: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .product-thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .product-thumb-fallback {
      font-size: 1.35rem;
      color: var(--text-muted);
    }

    .product-main-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }

    .product-name-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .product-title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--primary);
      margin: 0;
      line-height: 1.3;
    }

    .category-pill {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-full);
      background: rgba(15, 23, 42, 0.06);
      color: var(--secondary);
    }

    .product-sub-row {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      font-size: 0.775rem;
      color: var(--text-muted);
      flex-wrap: wrap;
    }

    .sku-tag {
      font-family: monospace;
      font-weight: 600;
      color: var(--secondary);
      background: #f1f5f9;
      padding: 0.1rem 0.4rem;
      border-radius: var(--radius-sm);
    }

    .branches-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }

    .accordion-header-right {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-shrink: 0;
    }

    .metric-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-md);
      font-size: 0.8125rem;
      background: white;
      border: 1px solid var(--border-color);

      &.variants-count-pill {
        color: var(--secondary);
        background: #f8fafc;
        i { color: var(--accent); }
      }

      &.stock-total-pill {
        background: #f0fdf4;
        border-color: #bbf7d0;
        color: #166534;

        .pill-label {
          font-size: 0.75rem;
          color: #15803d;
        }
        .pill-value {
          font-size: 0.9375rem;
        }

        &.stock-warn {
          background: #fffbeb;
          border-color: #fde68a;
          color: #92400e;
          .pill-label { color: #b45309; }
        }

        &.stock-zero {
          background: #fef2f2;
          border-color: #fecaca;
          color: #991b1b;
          .pill-label { color: #b91c1c; }
        }
      }
    }

    /* Subtabla de variantes */
    .accordion-body {
      background: #ffffff;
      padding: 0 1.5rem 1.25rem 3.5rem;
      border-top: 1px dashed var(--border-color);
    }

    .variant-table-wrapper {
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      overflow: hidden;
      margin-top: 0.75rem;
    }

    .variant-subtable {
      margin-bottom: 0;

      thead th {
        background: #f1f5f9;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: var(--secondary);
        padding: 0.65rem 1rem;
        border-bottom: 1px solid var(--border-color);
      }

      tbody td {
        padding: 0.65rem 1rem;
        font-size: 0.85rem;
        vertical-align: middle;
        border-bottom: 1px solid #edf2f7;
      }

      tbody tr:last-child td {
        border-bottom: none;
      }

      tbody tr:hover {
        background: #f1f5f9;
      }
    }

    .size-badge-box {
      display: inline-flex;
      align-items: center;
    }

    .size-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      padding: 0.2rem 0.5rem;
      background: var(--primary);
      color: white;
      font-weight: 700;
      font-size: 0.8125rem;
      border-radius: var(--radius-sm);
      letter-spacing: 0.02em;
    }

    .color-badge-box {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
    }

    .color-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 1px solid rgba(0, 0, 0, 0.15);
      flex-shrink: 0;
    }

    .color-name {
      font-weight: 500;
      color: var(--secondary);
    }

    .branch-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.775rem;
      background: white;
      border: 1px solid var(--border-color);
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
      color: var(--secondary);
    }

    .stock-cell {
      display: flex;
      align-items: baseline;
      gap: 0.35rem;
    }

    .stock-number {
      font-weight: 700;
      font-size: 0.9375rem;
      color: var(--primary);

      &.text-danger {
        color: var(--error);
      }
    }

    .min-stock-hint {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    .available-qty {
      font-weight: 600;
      color: #047857;

      &.text-danger {
        color: var(--error);
      }
    }

    .btn-action-icon {
      width: 30px;
      height: 30px;
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

      &.btn-action-accent:hover {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
      }
    }

    /* VISTA PLANA ORIGINAL */
    .inventory-product-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .inventory-icon {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      background: rgba(15, 23, 42, 0.06);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.15rem;
      flex-shrink: 0;
    }

    .variant-tags {
      display: flex;
      gap: 0.35rem;
    }

    .variant-tag {
      font-size: 0.7rem;
      background: #f1f5f9;
      padding: 0.15rem 0.4rem;
      border-radius: var(--radius-sm);
      color: var(--secondary);
    }

    .stock-qty-badge {
      font-weight: 700;
      font-size: 0.9375rem;
      color: var(--primary);

      &.stock-danger {
        color: var(--error);
      }
    }

    .action-buttons-flex {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.4rem;
    }

    .row-alert {
      background: rgba(239, 68, 68, 0.03);
    }

    /* MODAL AND COMMON STYLES */
    .selected-variant-card {
      background: #f8fafc;
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: var(--radius-md, 8px);
      padding: 0.875rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .variant-preview-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .preview-icon {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-sm, 6px);
      background: rgba(15, 23, 42, 0.08);
      color: var(--primary, #0f172a);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .preview-info {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .preview-title {
      font-weight: 600;
      font-size: 0.95rem;
      color: var(--primary, #0f172a);
    }

    .preview-sku {
      font-size: 0.75rem;
      color: var(--text-muted, #64748b);
    }

    .preview-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .preview-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      background: white;
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: var(--radius-sm, 6px);
      padding: 0.25rem 0.6rem;
      color: var(--secondary, #334155);

      i {
        color: var(--accent, #be123c);
        font-size: 0.875rem;
      }

      &.stock-badge {
        background: rgba(16, 185, 129, 0.1);
        border-color: rgba(16, 185, 129, 0.3);
        color: #065f46;
        font-weight: 600;

        i {
          color: #059669;
        }
      }
    }

    .adjust-info-box {
      padding: 1rem;
      border-radius: var(--radius-md);
      margin-bottom: 1rem;
      background: #f8fafc;
      border: 1px solid var(--border-color, #e2e8f0);
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

    .empty-state {
      .empty-icon {
        font-size: 3rem;
        color: var(--text-muted);
        margin-bottom: 0.5rem;
      }
      h4 {
        margin-bottom: 0.25rem;
      }
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    @media (max-width: 992px) {
      .accordion-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
      .accordion-header-right {
        width: 100%;
        justify-content: space-between;
      }
      .accordion-body {
        padding-left: 1rem;
        padding-right: 1rem;
      }
    }
  `]
})
export class InventoryComponent implements OnInit {
  private inventoryApi = inject(InventoryApiService);
  private branchApi = inject(BranchApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  public inventoryList = signal<Inventario[]>([]);
  public branches = signal<Sucursal[]>([]);
  public movementsHistory = signal<MovimientoInventario[]>([]);

  public isLoading = signal<boolean>(true);
  public isSaving = signal<boolean>(false);

  public searchQuery = signal<string>('');
  public selectedBranchFilter = signal<string>('');
  public selectedStatusFilter = signal<string>('');

  // Paginación
  public currentPage = signal<number>(1);
  public pageSize = signal<number>(10);

  // Accordion & View Mode
  public viewMode = signal<'accordion' | 'flat'>('accordion');
  public expandedProductIds = signal<Set<number>>(new Set<number>());

  // Movement Modal
  public isMovementModalOpen = signal<boolean>(false);
  public selectedMovementInventoryId = signal<number | null>(null);
  public movementForm: FormGroup = this.fb.group({
    inventario_id: [null, [Validators.required]],
    tipo: ['ENTRADA', [Validators.required]],
    cantidad: [10, [Validators.required, Validators.min(1)]],
    motivo: ['', [Validators.required, Validators.minLength(4)]]
  });

  public selectedMovementInventory = computed(() => {
    const id = this.selectedMovementInventoryId();
    if (!id) return null;
    return this.inventoryList().find(item => item.id === +id) || null;
  });

  // Adjust Modal
  public isAdjustModalOpen = signal<boolean>(false);
  public selectedInventoryForAdjust = signal<Inventario | null>(null);
  public adjustForm: FormGroup = this.fb.group({
    cantidad: [0, [Validators.required, Validators.min(0)]],
    motivo: ['', [Validators.required, Validators.minLength(4)]]
  });

  // History Modal
  public isHistoryModalOpen = signal<boolean>(false);

  public filteredInventory = computed(() => {
    let list = this.inventoryList();
    const query = this.searchQuery().toLowerCase().trim();
    const branchFilter = this.selectedBranchFilter();
    const statusFilter = this.selectedStatusFilter();

    if (query) {
      list = list.filter(item => 
        item.variante_producto?.producto?.nombre?.toLowerCase().includes(query) ||
        item.variante_producto?.producto?.sku?.toLowerCase().includes(query) ||
        item.variante_producto?.talla?.valor?.toLowerCase().includes(query) ||
        item.variante_producto?.talla?.nombre?.toLowerCase().includes(query) ||
        item.variante_producto?.color?.nombre?.toLowerCase().includes(query) ||
        item.sucursal?.nombre?.toLowerCase().includes(query)
      );
    }

    if (branchFilter) {
      list = list.filter(item => item.sucursal_id === +branchFilter);
    }

    if (statusFilter) {
      if (statusFilter === 'AGOTADO') {
        list = list.filter(item => item.cantidad === 0);
      } else if (statusFilter === 'BAJO_STOCK') {
        list = list.filter(item => item.cantidad > 0 && item.cantidad <= item.stock_minimo);
      } else if (statusFilter === 'DISPONIBLE') {
        list = list.filter(item => item.cantidad > item.stock_minimo);
      }
    }

    return list;
  });

  public groupedInventory = computed<GroupedProductInventory[]>(() => {
    const list = this.filteredInventory();
    const groupsMap = new Map<number, GroupedProductInventory>();

    for (const item of list) {
      const prod = item.variante_producto?.producto;
      const prodId = prod?.id || item.variante_producto?.producto_id || (item.variante_producto_id * 1000);
      const prodName = prod?.nombre || `Prenda #${item.variante_producto_id}`;
      const prodSku = prod?.sku || 'N/A';
      const prodCategory = prod?.categoria?.nombre;
      const prodImg = (prod?.imagenes && prod.imagenes.length > 0) ? prod.imagenes[0] : undefined;

      let group = groupsMap.get(prodId);
      if (!group) {
        group = {
          productId: prodId,
          productName: prodName,
          productSku: prodSku,
          productCategory: prodCategory,
          productImage: prodImg,
          items: [],
          totalStock: 0,
          totalReserved: 0,
          totalSold: 0,
          hasLowStock: false,
          isOutOfStock: false,
          branchNames: [],
          variantsCount: 0
        };
        groupsMap.set(prodId, group);
      }

      group.items.push(item);
      group.totalStock += item.cantidad || 0;
      group.totalReserved += item.cantidad_reservada || 0;
      group.totalSold += item.cantidad_vendida || 0;

      if (item.sucursal?.nombre && !group.branchNames.includes(item.sucursal.nombre)) {
        group.branchNames.push(item.sucursal.nombre);
      }
    }

    const result: GroupedProductInventory[] = [];
    for (const group of groupsMap.values()) {
      group.variantsCount = group.items.length;
      group.isOutOfStock = group.totalStock === 0;
      group.hasLowStock = group.items.some(it => it.cantidad <= it.stock_minimo && it.cantidad > 0);
      result.push(group);
    }

    return result.sort((a, b) => b.productId - a.productId);
  });

  public paginatedGroupedInventory = computed(() => {
    const list = this.groupedInventory();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  public paginatedFilteredInventory = computed(() => {
    const list = this.filteredInventory();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  ngOnInit(): void {
    this.loadInventory();
    this.loadBranches();
  }

  loadInventory(): void {
    this.isLoading.set(true);
    this.inventoryApi.getGlobalInventory(0, 1000).subscribe({
      next: (data) => {
        this.inventoryList.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadBranches(): void {
    this.branchApi.getBranches().subscribe(b => this.branches.set(b));
  }

  switchViewMode(mode: 'accordion' | 'flat'): void {
    this.viewMode.set(mode);
    this.currentPage.set(1);
  }

  // Accordion Controls
  toggleProduct(productId: number): void {
    const current = new Set(this.expandedProductIds());
    if (current.has(productId)) {
      current.delete(productId);
    } else {
      current.add(productId);
    }
    this.expandedProductIds.set(current);
  }

  isProductExpanded(productId: number): boolean {
    return this.expandedProductIds().has(productId);
  }

  expandAll(): void {
    const allIds = new Set(this.groupedInventory().map(g => g.productId));
    this.expandedProductIds.set(allIds);
  }

  collapseAll(): void {
    this.expandedProductIds.set(new Set());
  }

  getVariantLabel(inv: Inventario): string {
    const talla = inv.variante_producto?.talla?.valor || inv.variante_producto?.talla?.nombre || 'Sin Talla';
    const color = inv.variante_producto?.color?.nombre || 'Sin Color';
    return `Talla: ${talla}, Color: ${color}`;
  }

  onSearchChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
    this.currentPage.set(1);
    if (val.trim()) {
      // Auto expand matches on search
      this.expandAll();
    }
  }

  onBranchFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedBranchFilter.set(val);
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

  onMovementInventoryChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedMovementInventoryId.set(val ? +val : null);
  }

  openRegisterMovementModal(item?: Inventario): void {
    const defaultId = item ? item.id : (this.inventoryList().length > 0 ? this.inventoryList()[0].id : null);
    this.selectedMovementInventoryId.set(defaultId);
    this.movementForm.reset({
      inventario_id: defaultId,
      tipo: 'ENTRADA',
      cantidad: 15,
      motivo: 'Recepción de existencias de proveedor'
    });
    this.isMovementModalOpen.set(true);
  }

  closeMovementModal(): void {
    this.isMovementModalOpen.set(false);
  }

  saveMovement(): void {
    if (this.movementForm.invalid || this.isSaving()) return;

    this.isSaving.set(true);
    const formVal = this.movementForm.value;

    const dto: MovimientoInventarioCreateDto = {
      inventario_id: +formVal.inventario_id,
      tipo: formVal.tipo as TipoMovimiento,
      cantidad: +formVal.cantidad,
      motivo: formVal.motivo
    };

    this.inventoryApi.registerMovement(dto).subscribe({
      next: () => {
        this.toast.success('Movimiento de inventario registrado y existencias actualizadas.');
        this.isSaving.set(false);
        this.closeMovementModal();
        this.loadInventory();
      },
      error: () => this.isSaving.set(false)
    });
  }

  openQuickAdjustModal(item: Inventario): void {
    this.selectedInventoryForAdjust.set(item);
    this.adjustForm.reset({
      cantidad: item.cantidad,
      motivo: 'Ajuste de inventario por arqueo'
    });
    this.isAdjustModalOpen.set(true);
  }

  closeAdjustModal(): void {
    this.isAdjustModalOpen.set(false);
    this.selectedInventoryForAdjust.set(null);
  }

  saveQuickAdjust(): void {
    const item = this.selectedInventoryForAdjust();
    if (!item || this.adjustForm.invalid || this.isSaving()) return;

    this.isSaving.set(true);
    const formVal = this.adjustForm.value;

    this.inventoryApi.updateInventoryQuantity(item.id, +formVal.cantidad, formVal.motivo).subscribe({
      next: () => {
        this.toast.success('Existencia actualizada correctamente.');
        this.isSaving.set(false);
        this.closeAdjustModal();
        this.loadInventory();
      },
      error: () => this.isSaving.set(false)
    });
  }

  openMovementsHistoryModal(): void {
    this.inventoryApi.getMovements(0, 100).subscribe({
      next: (movements) => {
        this.movementsHistory.set(movements);
        this.isHistoryModalOpen.set(true);
      },
      error: () => {
        this.movementsHistory.set([]);
        this.isHistoryModalOpen.set(true);
      }
    });
  }

  closeMovementsHistoryModal(): void {
    this.isHistoryModalOpen.set(false);
  }
}
