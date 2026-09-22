import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PromotionApiService } from '../../../../core/services/promotion-api.service';
import { CatalogApiService } from '../../../../core/services/catalog-api.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import {
  Promocion,
  PromocionCreateDto,
  PromocionUpdateDto,
  TipoPromocion,
  EstadoPromocion
} from '../../../../core/models/promotion.model';
import { Producto, Categoria } from '../../../../core/models/catalog.model';
import { Sucursal } from '../../../../core/models/branch.model';

@Component({
  selector: 'app-promotions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent],
  template: `
    <div class="page-container animate-fade-in">
      <!-- KPI Stats Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon-box bg-blue">
            <i class="ri-price-tag-3-line"></i>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Total Promociones</span>
            <span class="kpi-value">{{ promotions().length }}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box bg-green">
            <i class="ri-checkbox-circle-line"></i>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Activas</span>
            <span class="kpi-value">{{ activePromotions() }}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box bg-purple">
            <i class="ri-fire-line"></i>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Vigentes Hoy</span>
            <span class="kpi-value">{{ vigentesHoy() }}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box bg-amber">
            <i class="ri-time-line"></i>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Programadas / Finalizadas</span>
            <span class="kpi-value">{{ programadasOFinalizadas() }}</span>
          </div>
        </div>
      </div>

      <!-- Toolbar & Filters -->
      <div class="toolbar-card card">
        <div class="toolbar-left">
          <div class="search-input-box">
            <i class="ri-search-line search-icon"></i>
            <input
              type="text"
              class="form-control with-icon"
              placeholder="Buscar por nombre o descripción..."
              [value]="searchQuery()"
              (input)="onSearchChange($event)"
            />
          </div>

          <div class="filter-group">
            <select class="form-control filter-select" [value]="statusFilter()" (change)="onStatusFilterChange($event)">
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVA">Activas</option>
              <option value="INACTIVA">Inactivas</option>
              <option value="PROGRAMADA">Programadas</option>
              <option value="FINALIZADA">Finalizadas</option>
            </select>

            <select class="form-control filter-select" [value]="typeFilter()" (change)="onTypeFilterChange($event)">
              <option value="ALL">Todos los tipos</option>
              <option value="PORCENTAJE">Porcentaje (%)</option>
              <option value="MONTO_FIJO">Monto Fijo (Bs.)</option>
              <option value="DOS_POR_UNO">2x1</option>
              <option value="ENVIO_GRATIS">Envío Gratis</option>
            </select>

            <label class="checkbox-inline">
              <input type="checkbox" [checked]="soloVigentes()" (change)="onSoloVigentesChange($event)" />
              <span>Solo vigentes</span>
            </label>
          </div>
        </div>

        <div class="toolbar-right">
          <button class="btn btn-outline btn-sm" (click)="loadPromotions()">
            <i class="ri-refresh-line"></i> Actualizar
          </button>
          <button class="btn btn-accent btn-sm" (click)="openCreateModal()">
            <i class="ri-add-line"></i> Nueva Promoción
          </button>
        </div>
      </div>

      <!-- Promotions Table -->
      <div class="table-card card">
        @if (isLoading()) {
          <div class="loading-box">
            <i class="ri-loader-4-line spin-icon"></i>
            <span>Cargando promociones comerciales...</span>
          </div>
        } @else if (filteredPromotions().length === 0) {
          <div class="empty-box">
            <i class="ri-price-tag-3-line empty-icon"></i>
            <h3>No hay promociones registradas</h3>
            <p>Crea tu primera promoción comercial para atraer más clientes a la tienda.</p>
            <button class="btn btn-accent btn-sm" (click)="openCreateModal()">
              <i class="ri-add-line"></i> Crear Promoción
            </button>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Promoción</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Vigencia</th>
                  <th>Aplicabilidad</th>
                  <th>Estado</th>
                  <th class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (promo of filteredPromotions(); track promo.id) {
                  <tr>
                    <td>
                      <div class="promo-info">
                        <span class="promo-name">{{ promo.nombre }}</span>
                        @if (promo.descripcion) {
                          <span class="promo-desc">{{ promo.descripcion }}</span>
                        }
                      </div>
                    </td>
                    <td>
                      <span class="type-badge" [ngClass]="getTypeBadgeClass(promo.tipo)">
                        <i [class]="getTypeIcon(promo.tipo)"></i> {{ getTypeLabel(promo.tipo) }}
                      </span>
                    </td>
                    <td>
                      @if (promo.tipo === 'PORCENTAJE') {
                        <span class="value-strong">{{ promo.valor }}%</span>
                      } @else if (promo.tipo === 'MONTO_FIJO') {
                        <span class="value-strong">Bs. {{ promo.valor | number:'1.2-2' }}</span>
                      } @else {
                        <span class="text-xs text-muted">No aplica</span>
                      }
                    </td>
                    <td>
                      <div class="dates-cell">
                        <span><i class="ri-calendar-line"></i> {{ promo.fecha_inicio | date:'dd/MM/yyyy HH:mm' }}</span>
                        <span><i class="ri-calendar-check-line"></i> {{ promo.fecha_fin | date:'dd/MM/yyyy HH:mm' }}</span>
                      </div>
                    </td>
                    <td>
                      <div class="applicability-chips">
                        @for (chip of getApplicabilityChips(promo); track chip) {
                          <span class="app-chip">{{ chip }}</span>
                        }
                      </div>
                    </td>
                    <td>
                      <span class="status-badge" [ngClass]="getStatusBadgeClass(promo.estado)">
                        <span class="status-dot"></span>
                        {{ promo.estado }}
                      </span>
                      @if (promo.advertencia) {
                        <span class="warning-text"><i class="ri-alert-line"></i> {{ promo.advertencia }}</span>
                      }
                    </td>
                    <td>
                      <div class="action-buttons-flex">
                        <button
                          class="btn-action-icon"
                          [title]="promo.estado === 'ACTIVA' ? 'Desactivar Promoción' : 'Activar Promoción'"
                          (click)="togglePromotionStatus(promo)"
                        >
                          <i [class]="promo.estado === 'ACTIVA' ? 'ri-pause-circle-line' : 'ri-play-circle-line'"></i>
                        </button>
                        <button class="btn-action-icon" title="Editar Promoción" (click)="openEditModal(promo)">
                          <i class="ri-edit-line"></i>
                        </button>
                        <button class="btn-action-icon btn-action-danger" title="Eliminar Promoción" (click)="deletePromotion(promo)">
                          <i class="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
      <!-- Create / Edit Promotion Modal -->
      <app-modal
        [isOpen]="isPromotionModalOpen()"
        [title]="isEditingPromotion() ? 'Editar Promoción Comercial' : 'Crear Nueva Promoción'"
        [subtitle]="isEditingPromotion() ? 'Modifica los parámetros, vigencia y aplicabilidad de la promoción' : 'Define el tipo de descuento, la vigencia y los productos o categorías aplicables'"
        icon="ri-price-tag-3-line"
        [maxWidth]="'820px'"
        (closeEvent)="closePromotionModal()"
      >
        <form [formGroup]="promotionForm" (ngSubmit)="savePromotion()" class="modal-form">
          <div class="grid grid-cols-2 form-row">
            <div class="form-group">
              <label class="form-label" for="p-nombre">Nombre de la Promoción <span class="required">*</span></label>
              <input
                id="p-nombre"
                type="text"
                formControlName="nombre"
                class="form-control"
                placeholder="Ej. Black Friday 2026"
              />
              @if (promotionForm.get('nombre')?.invalid && promotionForm.get('nombre')?.touched) {
                <span class="form-error">Nombre requerido (mínimo 3 caracteres)</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label">Tipo de Promoción <span class="required">*</span></label>
              <div class="type-toggle-group">
                @for (tipo of tiposPromocion; track tipo.value) {
                  <label class="type-option" [class.selected]="promotionForm.get('tipo')?.value === tipo.value">
                    <input type="radio" formControlName="tipo" [value]="tipo.value" class="hidden-radio" />
                    <i [class]="tipo.icon"></i>
                    <span>{{ tipo.label }}</span>
                  </label>
                }
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 form-row">
            <div class="form-group">
              <label class="form-label" for="p-valor">
                Valor del Descuento
                @if (!requiereValor()) {
                  <span class="text-xs text-muted">(No aplica para {{ getTypeLabel(promotionForm.get('tipo')?.value) }})</span>
                } @else if (promotionForm.get('tipo')?.value === 'PORCENTAJE') {
                  <span class="required">*</span>
                  <span class="text-xs text-muted">(Ej. 15 para 15%)</span>
                } @else {
                  <span class="required">*</span>
                  <span class="text-xs text-muted">(Ej. 50 para Bs. 50.00)</span>
                }
              </label>
              <div class="value-input-wrapper">
                <span class="value-prefix">{{ promotionForm.get('tipo')?.value === 'PORCENTAJE' ? '%' : 'Bs.' }}</span>
                <input
                  id="p-valor"
                  type="number"
                  step="0.01"
                  min="0.01"
                  [max]="promotionForm.get('tipo')?.value === 'PORCENTAJE' ? 100 : 99999"
                  formControlName="valor"
                  class="form-control with-prefix"
                  placeholder="0.00"
                />
              </div>
              @if (promotionForm.get('valor')?.invalid && promotionForm.get('valor')?.touched && requiereValor()) {
                <span class="form-error">Ingresa un valor válido mayor a 0 (máximo 100 para porcentaje)</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="p-estado">Estado Inicial</label>
              <select id="p-estado" formControlName="estado" class="form-control">
                <option value="ACTIVA">ACTIVA</option>
                <option value="INACTIVA">INACTIVA</option>
                <option value="PROGRAMADA">PROGRAMADA</option>
                <option value="FINALIZADA">FINALIZADA</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 form-row">
            <div class="form-group">
              <label class="form-label" for="p-fecha-ini">Fecha &amp; Hora de Inicio <span class="required">*</span></label>
              <input id="p-fecha-ini" type="datetime-local" formControlName="fecha_inicio" class="form-control" />
              @if (promotionForm.get('fecha_inicio')?.invalid && promotionForm.get('fecha_inicio')?.touched) {
                <span class="form-error">Fecha de inicio requerida</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="p-fecha-fin">Fecha &amp; Hora de Fin <span class="required">*</span></label>
              <input id="p-fecha-fin" type="datetime-local" formControlName="fecha_fin" class="form-control" />
              @if (promotionForm.get('fecha_fin')?.invalid && promotionForm.get('fecha_fin')?.touched) {
                <span class="form-error">Fecha de fin requerida</span>
              }
              @if (promotionForm.errors?.['rangoFechas']) {
                <span class="form-error">La fecha de fin debe ser posterior a la fecha de inicio</span>
              }
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="p-desc">Descripción</label>
            <input
              id="p-desc"
              type="text"
              formControlName="descripcion"
              class="form-control"
              placeholder="Ej. Descuento especial de temporada en toda la colección"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="p-cond">Términos y Condiciones</label>
            <textarea
              id="p-cond"
              rows="2"
              formControlName="condiciones"
              class="form-control"
              placeholder="Ej. Válido solo para compras online mayores a Bs. 200"
            ></textarea>
          </div>

          <!-- Aplicabilidad -->
          <div class="applicability-section">
            <div class="section-title-row">
              <h4 class="form-section-title"><i class="ri-filter-3-line"></i> Aplicabilidad</h4>
              <span class="text-xs text-muted">Sin productos ni categorías, la promoción aplica a todo el catálogo.</span>
            </div>

            @if (!tieneAplicabilidad()) {
              <div class="advertencia-box">
                <i class="ri-alert-line"></i>
                <span>La promoción no tendrá efecto si no seleccionas al menos un producto o una categoría.</span>
              </div>
            }

            <div class="applicability-grid">
              <!-- Productos -->
              <div class="selector-panel">
                <div class="selector-header">
                  <span class="selector-title"><i class="ri-t-shirt-2-line"></i> Productos ({{ selectedProductos().length }})</span>
                </div>
                <div class="search-input-box small">
                  <i class="ri-search-line search-icon"></i>
                  <input
                    type="text"
                    class="form-control with-icon"
                    placeholder="Buscar producto por nombre o SKU..."
                    [value]="productSearch()"
                    (input)="onProductSearchChange($event)"
                  />
                </div>
                <div class="checkbox-list">
                  @for (product of filteredProductsForModal(); track product.id) {
                    <label class="checkbox-row">
                      <input
                        type="checkbox"
                        [checked]="isSelected('producto_ids', product.id)"
                        (change)="toggleSelection('producto_ids', product.id)"
                      />
                      <span class="checkbox-label">{{ product.nombre }}</span>
                      <small class="text-muted">{{ product.sku }}</small>
                    </label>
                  } @empty {
                    <span class="text-xs text-muted">No se encontraron productos.</span>
                  }
                </div>
                @if (selectedProductos().length > 0) {
                  <div class="selected-chips">
                    @for (product of selectedProductos(); track product.id) {
                      <span class="chip">
                        {{ product.nombre }}
                        <button type="button" class="chip-close" (click)="toggleSelection('producto_ids', product.id)">
                          <i class="ri-close-line"></i>
                        </button>
                      </span>
                    }
                  </div>
                }
              </div>

              <!-- Categorías y Sucursales -->
              <div class="selector-panel">
                <div class="selector-header">
                  <span class="selector-title"><i class="ri-apps-2-line"></i> Categorías ({{ selectedCategorias().length }})</span>
                </div>
                <div class="checkbox-list compact">
                  @for (category of categories; track category.id) {
                    <label class="checkbox-row">
                      <input
                        type="checkbox"
                        [checked]="isSelected('categoria_ids', category.id)"
                        (change)="toggleSelection('categoria_ids', category.id)"
                      />
                      <span class="checkbox-label">{{ category.nombre }}</span>
                    </label>
                  } @empty {
                    <span class="text-xs text-muted">No hay categorías registradas.</span>
                  }
                </div>

                <div class="selector-header mt-2">
                  <span class="selector-title"><i class="ri-store-3-line"></i> Sucursales ({{ selectedSucursales().length }})</span>
                </div>
                <div class="checkbox-list compact">
                  @for (branch of branches; track branch.id) {
                    <label class="checkbox-row">
                      <input
                        type="checkbox"
                        [checked]="isSelected('sucursal_ids', branch.id)"
                        (change)="toggleSelection('sucursal_ids', branch.id)"
                      />
                      <span class="checkbox-label">{{ branch.nombre }}</span>
                    </label>
                  } @empty {
                    <span class="text-xs text-muted">No hay sucursales registradas.</span>
                  }
                </div>
                <span class="text-xs text-muted">Sin sucursales seleccionadas = aplica a todas.</span>
              </div>
            </div>
          </div>

          <div class="modal-actions-box">
            <button type="button" class="btn btn-outline" (click)="closePromotionModal()">Cancelar</button>
            <button type="submit" class="btn btn-accent" [disabled]="promotionForm.invalid || isSaving()">
              @if (isSaving()) {
                <i class="ri-loader-4-line spin-icon"></i>
              } @else {
                <i class="ri-save-line"></i>
              }
              {{ isEditingPromotion() ? 'Guardar Cambios' : 'Crear Promoción' }}
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

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
    }

    .kpi-card {
      background: white;
      border-radius: var(--radius-lg, 12px);
      border: 1px solid var(--border-color, #e2e8f0);
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      transition: transform 0.2s ease, box-shadow 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }
    }

    .kpi-icon-box {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .bg-blue { background: #e0e7ff; color: #4338ca; }
    .bg-green { background: #dcfce7; color: #15803d; }
    .bg-purple { background: #f3e8ff; color: #7e22ce; }
    .bg-amber { background: #fef3c7; color: #b45309; }

    .kpi-info {
      display: flex;
      flex-direction: column;
    }

    .kpi-label {
      font-size: 0.75rem;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    .kpi-value {
      font-size: 1.6rem;
      font-weight: 800;
      color: #0f172a;
      font-family: 'Outfit', sans-serif;
    }

    /* Toolbar */
    .toolbar-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.25rem;
      flex-wrap: wrap;
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      flex: 1;
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .search-input-box {
      position: relative;
      display: flex;
      align-items: center;
      min-width: 260px;
    }

    .search-input-box.small {
      min-width: 100%;
      margin-bottom: 0.5rem;
    }

    .search-icon {
      position: absolute;
      left: 0.85rem;
      color: #94a3b8;
      pointer-events: none;
    }

    .form-control.with-icon { padding-left: 2.5rem; }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .filter-select {
      min-width: 180px;
    }

    .checkbox-inline {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.875rem;
      color: #475569;
      cursor: pointer;
    }

    /* Table */
    .table-card {
      padding: 0;
      overflow: hidden;
    }

    .table-responsive {
      width: 100%;
      overflow-x: auto;
    }

    .admin-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .admin-table thead th {
      background: #f8fafc;
      text-align: left;
      padding: 0.85rem 1rem;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
      white-space: nowrap;
    }

    .admin-table tbody td {
      padding: 0.9rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      color: #334155;
    }

    .admin-table tbody tr:hover {
      background: #f8fafc;
    }

    .promo-info {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      min-width: 180px;
    }

    .promo-name { font-weight: 700; color: #0f172a; }
    .promo-desc { font-size: 0.75rem; color: #64748b; }

    .type-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.25rem 0.6rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .type-percent { background: #e0e7ff; color: #4338ca; }
    .type-amount { background: #fee2e2; color: #b91c1c; }
    .type-two-for-one { background: #fef3c7; color: #b45309; }
    .type-free-shipping { background: #dcfce7; color: #15803d; }

    .value-strong { font-weight: 800; color: #0f172a; }

    .dates-cell {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      font-size: 0.75rem;
      color: #475569;
      white-space: nowrap;

      i { color: #94a3b8; margin-right: 0.25rem; }
    }

    .applicability-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      max-width: 240px;
    }

    .app-chip {
      background: #f1f5f9;
      color: #475569;
      border-radius: 6px;
      padding: 0.15rem 0.45rem;
      font-size: 0.7rem;
      font-weight: 600;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.6rem;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .status-active { background: #dcfce7; color: #15803d; }
    .status-inactive { background: #f1f5f9; color: #475569; }
    .status-scheduled { background: #e0e7ff; color: #4338ca; }
    .status-finished { background: #fee2e2; color: #b91c1c; }

    .warning-text {
      display: block;
      margin-top: 0.35rem;
      font-size: 0.7rem;
      color: #b45309;
    }

    .action-buttons-flex {
      display: flex;
      gap: 0.35rem;
      justify-content: flex-end;
    }

    .btn-action-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: white;
      color: #475569;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;

      &:hover { background: #f1f5f9; color: #0f172a; }
    }

    .btn-action-danger:hover { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }

    .text-right { text-align: right; }
    .text-xs { font-size: 0.75rem; }
    .text-muted { color: #94a3b8; }
    .mt-2 { margin-top: 0.75rem; }

    .loading-box, .empty-box {
      padding: 3rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.6rem;
      color: #64748b;
    }

    .empty-icon { font-size: 3rem; color: #cbd5e1; }
    .spin-icon { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    /* Modal form */
    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .type-toggle-group {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
    }

    .type-option {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.6rem 0.75rem;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #475569;
      background: white;
      transition: all 0.15s ease;

      i { font-size: 1.1rem; color: #94a3b8; }

      &.selected {
        border-color: var(--accent, #e11d48);
        background: rgba(225, 29, 72, 0.04);
        color: var(--accent, #e11d48);

        i { color: var(--accent, #e11d48); }
      }
    }

    .hidden-radio { display: none; }

    .value-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .value-prefix {
      position: absolute;
      left: 0.85rem;
      font-weight: 700;
      color: #64748b;
      pointer-events: none;
      font-size: 0.8125rem;
    }

    .form-control.with-prefix { padding-left: 3rem; }

    .applicability-section {
      border-top: 1px solid #f1f5f9;
      padding-top: 1rem;
    }

    .section-title-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.6rem;
      flex-wrap: wrap;
    }

    .form-section-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin: 0;

      i { color: var(--accent, #e11d48); }
    }

    .advertencia-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #fef3c7;
      color: #b45309;
      border-radius: 10px;
      padding: 0.6rem 0.8rem;
      font-size: 0.8125rem;
      margin-bottom: 0.75rem;
    }

    .applicability-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .selector-panel {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 0.85rem;
      background: #fcfdff;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .selector-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .selector-title {
      font-size: 0.8125rem;
      font-weight: 700;
      color: #334155;

      i { color: #64748b; margin-right: 0.25rem; }
    }

    .checkbox-list {
      max-height: 190px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      padding-right: 0.25rem;
    }

    .checkbox-list.compact { max-height: 130px; }

    .checkbox-row {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.8125rem;
      color: #334155;
      cursor: pointer;
      padding: 0.2rem 0.25rem;
      border-radius: 6px;

      &:hover { background: #f1f5f9; }
    }

    .checkbox-label { flex: 1; }

    .selected-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      margin-top: 0.35rem;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: #e0e7ff;
      color: #4338ca;
      border-radius: 999px;
      padding: 0.15rem 0.5rem;
      font-size: 0.7rem;
      font-weight: 600;
    }

    .chip-close {
      border: none;
      background: none;
      color: inherit;
      cursor: pointer;
      padding: 0;
      font-size: 0.8rem;
      line-height: 1;
    }

    .modal-actions-box {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 0.85rem;
      border-top: 1px solid #f1f5f9;
    }

    @media (max-width: 900px) {
      .form-row, .applicability-grid { grid-template-columns: 1fr; }
      .type-toggle-group { grid-template-columns: 1fr; }
    }
  `]
})
export class PromotionsComponent implements OnInit, OnDestroy {
  private promotionApi = inject(PromotionApiService);
  private catalogApi = inject(CatalogApiService);
  private branchApi = inject(BranchApiService);
  private toast = inject(ToastService);
  private alertService = inject(AlertService);
  private fb = inject(FormBuilder);

  public promotions = signal<Promocion[]>([]);
  public isLoading = signal<boolean>(true);
  public isSaving = signal<boolean>(false);
  public searchQuery = signal<string>('');
  public statusFilter = signal<string>('ALL');
  public typeFilter = signal<string>('ALL');
  public soloVigentes = signal<boolean>(false);
  public productSearch = signal<string>('');

  // Modal Signals
  public isPromotionModalOpen = signal<boolean>(false);
  public isEditingPromotion = signal<boolean>(false);
  public selectedPromotionId = signal<number | null>(null);

  // Catálogo para aplicabilidad
  public products: Producto[] = [];
  public categories: Categoria[] = [];
  public branches: Sucursal[] = [];

  public tiposPromocion: Array<{ value: TipoPromocion; label: string; icon: string }> = [
    { value: 'PORCENTAJE', label: 'Porcentaje', icon: 'ri-percent-line' },
    { value: 'MONTO_FIJO', label: 'Monto Fijo', icon: 'ri-money-dollar-circle-line' },
    { value: 'DOS_POR_UNO', label: '2x1', icon: 'ri-gift-line' },
    { value: 'ENVIO_GRATIS', label: 'Envío Gratis', icon: 'ri-truck-line' }
  ];

  public promotionForm: FormGroup = this.fb.group(
    {
      nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
      descripcion: [''],
      tipo: ['PORCENTAJE', [Validators.required]],
      valor: [10],
      condiciones: [''],
      fecha_inicio: ['', [Validators.required]],
      fecha_fin: ['', [Validators.required]],
      estado: ['ACTIVA', [Validators.required]],
      producto_ids: [[] as number[]],
      categoria_ids: [[] as number[]],
      sucursal_ids: [[] as number[]]
    },
    { validators: [PromotionsComponent.rangoFechasValidator] }
  );

  private tipoSubscription?: Subscription;

  constructor() {
    this.tipoSubscription = this.promotionForm.get('tipo')!.valueChanges.subscribe(() => {
      this.aplicarValidadoresValor();
    });
    this.aplicarValidadoresValor();
  }

  // KPI Computeds
  public activePromotions = computed(() => this.promotions().filter(p => p.estado === 'ACTIVA').length);

  public vigentesHoy = computed(() => {
    const ahora = new Date().getTime();
    return this.promotions().filter(p => {
      const inicio = new Date(p.fecha_inicio).getTime();
      const fin = new Date(p.fecha_fin).getTime();
      return inicio <= ahora && ahora <= fin;
    }).length;
  });

  public programadasOFinalizadas = computed(() =>
    this.promotions().filter(p => p.estado === 'PROGRAMADA' || p.estado === 'FINALIZADA').length
  );

  public filteredPromotions = computed(() => {
    let list = this.promotions();
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    const type = this.typeFilter();
    const soloVigentes = this.soloVigentes();

    if (query) {
      list = list.filter(p =>
        p.nombre.toLowerCase().includes(query) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(query)) ||
        (p.condiciones && p.condiciones.toLowerCase().includes(query))
      );
    }

    if (status !== 'ALL') {
      list = list.filter(p => p.estado === status);
    }

    if (type !== 'ALL') {
      list = list.filter(p => p.tipo === type);
    }

    if (soloVigentes) {
      const ahora = new Date().getTime();
      list = list.filter(p => {
        const inicio = new Date(p.fecha_inicio).getTime();
        const fin = new Date(p.fecha_fin).getTime();
        return inicio <= ahora && ahora <= fin;
      });
    }

    return list;
  });

  public requiereValor = computed(() => {
    const tipo = this.promotionForm.get('tipo')?.value as TipoPromocion;
    return tipo === 'PORCENTAJE' || tipo === 'MONTO_FIJO';
  });

  public tieneAplicabilidad = computed(() => {
    const productos = (this.promotionForm.get('producto_ids')?.value as number[]) || [];
    const categorias = (this.promotionForm.get('categoria_ids')?.value as number[]) || [];
    return productos.length > 0 || categorias.length > 0;
  });

  public selectedProductos = computed(() => {
    const ids = (this.promotionForm.get('producto_ids')?.value as number[]) || [];
    return this.products.filter(p => ids.includes(p.id));
  });

  public selectedCategorias = computed(() => {
    const ids = (this.promotionForm.get('categoria_ids')?.value as number[]) || [];
    return this.categories.filter(c => ids.includes(c.id));
  });

  public selectedSucursales = computed(() => {
    const ids = (this.promotionForm.get('sucursal_ids')?.value as number[]) || [];
    return this.branches.filter(b => ids.includes(b.id));
  });

  public filteredProductsForModal = computed(() => {
    const term = this.productSearch().trim().toLowerCase();
    const list = term
      ? this.products.filter(p =>
          p.nombre.toLowerCase().includes(term) || (p.sku || '').toLowerCase().includes(term)
        )
      : this.products;
    return list.slice(0, 80);
  });

  static rangoFechasValidator(group: any) {
    const inicio = group.get('fecha_inicio')?.value;
    const fin = group.get('fecha_fin')?.value;
    if (inicio && fin && new Date(fin) <= new Date(inicio)) {
      return { rangoFechas: true };
    }
    return null;
  }

  ngOnInit(): void {
    this.loadPromotions();
    this.loadCatalogData();
  }

  ngOnDestroy(): void {
    this.tipoSubscription?.unsubscribe();
  }

  loadPromotions(): void {
    this.isLoading.set(true);
    this.promotionApi.getPromotions({
      skip: 0,
      limit: 200,
      estado: this.statusFilter() !== 'ALL' ? (this.statusFilter() as EstadoPromocion) : '',
      tipo: this.typeFilter() !== 'ALL' ? (this.typeFilter() as TipoPromocion) : '',
      solo_vigentes: this.soloVigentes()
    }).subscribe({
      next: (data) => {
        this.promotions.set((data || []).map(p => ({
          ...p,
          producto_ids: p.producto_ids || [],
          categoria_ids: p.categoria_ids || [],
          sucursal_ids: p.sucursal_ids || []
        })));
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando promociones:', err);
        this.toast.error('Error al cargar la lista de promociones.');
        this.isLoading.set(false);
      }
    });
  }

  loadCatalogData(): void {
    this.catalogApi.getProducts(0, 500).subscribe({
      next: (products) => this.products = products || [],
      error: () => this.products = []
    });

    this.catalogApi.getCategories().subscribe({
      next: (categories) => this.categories = categories || [],
      error: () => this.categories = []
    });

    this.branchApi.getBranches(0, 100).subscribe({
      next: (branches) => this.branches = branches || [],
      error: () => this.branches = []
    });
  }

  onSearchChange(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  onStatusFilterChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
  }

  onTypeFilterChange(event: Event): void {
    this.typeFilter.set((event.target as HTMLSelectElement).value);
  }

  onSoloVigentesChange(event: Event): void {
    this.soloVigentes.set((event.target as HTMLInputElement).checked);
  }

  onProductSearchChange(event: Event): void {
    this.productSearch.set((event.target as HTMLInputElement).value);
  }

  isSelected(field: 'producto_ids' | 'categoria_ids' | 'sucursal_ids', id: number): boolean {
    const current = (this.promotionForm.get(field)?.value as number[]) || [];
    return current.includes(id);
  }

  toggleSelection(field: 'producto_ids' | 'categoria_ids' | 'sucursal_ids', id: number): void {
    const control = this.promotionForm.get(field);
    if (!control) return;
    const current = (control.value as number[]) || [];
    const next = current.includes(id)
      ? current.filter(item => item !== id)
      : [...current, id];
    control.setValue(next);
  }

  getTypeLabel(tipo: TipoPromocion): string {
    switch (tipo) {
      case 'PORCENTAJE': return 'Porcentaje';
      case 'MONTO_FIJO': return 'Monto Fijo';
      case 'DOS_POR_UNO': return '2x1';
      case 'ENVIO_GRATIS': return 'Envío Gratis';
      default: return tipo;
    }
  }

  getTypeIcon(tipo: TipoPromocion): string {
    switch (tipo) {
      case 'PORCENTAJE': return 'ri-percent-line';
      case 'MONTO_FIJO': return 'ri-money-dollar-circle-line';
      case 'DOS_POR_UNO': return 'ri-gift-line';
      case 'ENVIO_GRATIS': return 'ri-truck-line';
      default: return 'ri-price-tag-3-line';
    }
  }

  getTypeBadgeClass(tipo: TipoPromocion): string {
    switch (tipo) {
      case 'PORCENTAJE': return 'type-percent';
      case 'MONTO_FIJO': return 'type-amount';
      case 'DOS_POR_UNO': return 'type-two-for-one';
      case 'ENVIO_GRATIS': return 'type-free-shipping';
      default: return 'type-percent';
    }
  }

  getStatusBadgeClass(status: EstadoPromocion): string {
    switch (status) {
      case 'ACTIVA': return 'status-active';
      case 'INACTIVA': return 'status-inactive';
      case 'PROGRAMADA': return 'status-scheduled';
      case 'FINALIZADA': return 'status-finished';
      default: return 'status-inactive';
    }
  }

  getApplicabilityChips(promo: Promocion): string[] {
    const chips: string[] = [];

    const productos = promo.producto_ids || [];
    if (productos.length === 1) {
      const nombre = this.products.find(p => p.id === productos[0])?.nombre;
      chips.push(nombre ? `1 producto: ${nombre}` : `1 producto (#${productos[0]})`);
    } else if (productos.length > 1) {
      chips.push(`${productos.length} productos`);
    }

    const categorias = promo.categoria_ids || [];
    categorias.forEach(id => {
      const nombre = this.categories.find(c => c.id === id)?.nombre;
      chips.push(nombre ? `Categoría: ${nombre}` : `Categoría #${id}`);
    });

    const sucursales = promo.sucursal_ids || [];
    if (sucursales.length === 0) {
      chips.push('Todas las sucursales');
    } else if (sucursales.length === 1) {
      const nombre = this.branches.find(b => b.id === sucursales[0])?.nombre;
      chips.push(nombre ? nombre : `Sucursal #${sucursales[0]}`);
    } else {
      chips.push(`${sucursales.length} sucursales`);
    }

    if (chips.length === 0) {
      chips.push('Sin aplicabilidad');
    }

    return chips;
  }

  private aplicarValidadoresValor(): void {
    const control = this.promotionForm.get('valor');
    if (!control) return;

    const tipo = this.promotionForm.get('tipo')?.value as TipoPromocion;

    if (tipo === 'PORCENTAJE') {
      control.setValidators([Validators.required, Validators.min(0.01), Validators.max(100)]);
    } else if (tipo === 'MONTO_FIJO') {
      control.setValidators([Validators.required, Validators.min(0.01)]);
    } else {
      control.clearValidators();
      control.setValue(null, { emitEvent: false });
    }

    control.updateValueAndValidity({ emitEvent: false });
  }

  openCreateModal(): void {
    this.isEditingPromotion.set(false);
    this.selectedPromotionId.set(null);
    this.productSearch.set('');

    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    this.promotionForm.reset({
      nombre: '',
      descripcion: '',
      tipo: 'PORCENTAJE',
      valor: 10,
      condiciones: '',
      fecha_inicio: this.formatDateForInput(now),
      fecha_fin: this.formatDateForInput(nextMonth),
      estado: 'ACTIVA',
      producto_ids: [],
      categoria_ids: [],
      sucursal_ids: []
    });
    this.aplicarValidadoresValor();

    this.isPromotionModalOpen.set(true);
  }

  openEditModal(promo: Promocion): void {
    this.isEditingPromotion.set(true);
    this.selectedPromotionId.set(promo.id);
    this.productSearch.set('');

    this.promotionForm.reset({
      nombre: promo.nombre,
      descripcion: promo.descripcion || '',
      tipo: promo.tipo,
      valor: promo.valor ?? null,
      condiciones: promo.condiciones || '',
      fecha_inicio: this.formatDateForInput(new Date(promo.fecha_inicio)),
      fecha_fin: this.formatDateForInput(new Date(promo.fecha_fin)),
      estado: promo.estado,
      producto_ids: promo.producto_ids || [],
      categoria_ids: promo.categoria_ids || [],
      sucursal_ids: promo.sucursal_ids || []
    });
    this.aplicarValidadoresValor();

    this.isPromotionModalOpen.set(true);
  }

  closePromotionModal(): void {
    this.isPromotionModalOpen.set(false);
    this.promotionForm.reset();
    this.productSearch.set('');
  }

  savePromotion(): void {
    if (this.promotionForm.invalid) {
      this.promotionForm.markAllAsTouched();
      if (this.promotionForm.errors?.['rangoFechas']) {
        this.toast.error('La fecha de fin debe ser posterior a la fecha de inicio.');
      }
      return;
    }

    const formVal = this.promotionForm.value;
    const startDate = new Date(formVal.fecha_inicio);
    const endDate = new Date(formVal.fecha_fin);

    if (endDate <= startDate) {
      this.toast.error('La fecha de fin debe ser posterior a la fecha de inicio.');
      return;
    }

    if (!this.tieneAplicabilidad()) {
      this.toast.warning('La promoción no tendrá efecto: no seleccionaste productos ni categorías.');
    }

    this.isSaving.set(true);

    const payloadBase = {
      nombre: formVal.nombre.trim(),
      descripcion: formVal.descripcion?.trim() || undefined,
      tipo: formVal.tipo as TipoPromocion,
      valor: (formVal.tipo === 'DOS_POR_UNO' || formVal.tipo === 'ENVIO_GRATIS') ? null : Number(formVal.valor),
      fecha_inicio: startDate.toISOString(),
      fecha_fin: endDate.toISOString(),
      condiciones: formVal.condiciones?.trim() || undefined,
      estado: formVal.estado as EstadoPromocion,
      producto_ids: formVal.producto_ids || [],
      categoria_ids: formVal.categoria_ids || [],
      sucursal_ids: formVal.sucursal_ids || []
    };

    if (this.isEditingPromotion()) {
      const updateDto: PromocionUpdateDto = { ...payloadBase };
      this.promotionApi.updatePromotion(this.selectedPromotionId()!, updateDto).subscribe({
        next: (updated) => this.onPromocionGuardada(updated, 'actualizada'),
        error: (err) => this.manejarErrorGuardado(err, 'No se pudo actualizar la promoción.')
      });
    } else {
      const createDto: PromocionCreateDto = { ...payloadBase };
      this.promotionApi.createPromotion(createDto).subscribe({
        next: (created) => this.onPromocionGuardada(created, 'creada'),
        error: (err) => this.manejarErrorGuardado(err, 'No se pudo registrar la promoción.')
      });
    }
  }

  private onPromocionGuardada(promo: Promocion, accion: string): void {
    this.toast.success(`Promoción "${promo.nombre}" ${accion} con éxito.`);
    if (promo.advertencia) {
      this.alertService.warning('Promoción sin efecto', promo.advertencia);
    }
    this.isSaving.set(false);
    this.closePromotionModal();
    this.loadPromotions();
  }

  private manejarErrorGuardado(err: any, defaultMessage: string): void {
    console.error('Error guardando promoción:', err);
    const detail = typeof err?.error?.detail === 'string'
      ? err.error.detail
      : Array.isArray(err?.error?.detail)
        ? err.error.detail.map((d: any) => d.msg || d).join(' | ')
        : defaultMessage;

    if (err?.status === 409) {
      this.alertService.error('Solapamiento de promociones', detail);
    } else {
      this.toast.error(detail);
    }

    this.isSaving.set(false);
  }

  togglePromotionStatus(promo: Promocion): void {
    const nextStatus: EstadoPromocion = promo.estado === 'ACTIVA' ? 'INACTIVA' : 'ACTIVA';
    this.promotionApi.changeStatus(promo.id, nextStatus).subscribe({
      next: (updated) => {
        this.toast.success(`Promoción "${promo.nombre}" cambiada a ${updated.estado}.`);
        this.loadPromotions();
      },
      error: (err) => {
        console.error('Error cambiando estado de la promoción:', err);
        const detail = typeof err?.error?.detail === 'string'
          ? err.error.detail
          : 'No se pudo cambiar el estado de la promoción.';

        if (err?.status === 409) {
          this.alertService.error('Solapamiento de promociones', detail);
        } else {
          this.toast.error(detail);
        }
      }
    });
  }

  async deletePromotion(promo: Promocion): Promise<void> {
    const confirmed = await this.alertService.deleteConfirm(
      '¿Eliminar promoción?',
      `¿Estás seguro de que deseas eliminar la promoción "${promo.nombre}"? Si ya estuvo activa, solo se desactivará.`
    );

    if (confirmed) {
      this.promotionApi.deletePromotion(promo.id).subscribe({
        next: () => {
          this.toast.success(`Promoción "${promo.nombre}" eliminada correctamente.`);
          this.loadPromotions();
        },
        error: (err) => {
          console.error('Error eliminando promoción:', err);
          const detail = typeof err?.error?.detail === 'string'
            ? err.error.detail
            : 'No se pudo eliminar la promoción.';
          this.toast.error(detail);
        }
      });
    }
  }

  private formatDateForInput(date: Date): string {
    const pad = (n: number) => n < 10 ? '0' + n : n.toString();
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}

