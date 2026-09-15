import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CouponApiService } from '../../../../core/services/coupon-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Cupon, CuponCreateDto, CuponUpdateDto, TipoCupon, EstadoCupon } from '../../../../core/models/coupon.model';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-coupons',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent],
  template: `
    <div class="page-container animate-fade-in">
      <!-- KPI Stats Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon-box bg-blue">
            <i class="ri-coupon-3-line"></i>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Total Cupones</span>
            <span class="kpi-value">{{ totalCoupons() }}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box bg-green">
            <i class="ri-checkbox-circle-line"></i>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Cupones Activos</span>
            <span class="kpi-value">{{ activeCoupons() }}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box bg-purple">
            <i class="ri-fire-line"></i>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Total Usos Aplicados</span>
            <span class="kpi-value">{{ totalUses() }}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box bg-amber">
            <i class="ri-time-line"></i>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Expirados / Agotados</span>
            <span class="kpi-value">{{ expiredOrDepletedCoupons() }}</span>
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
              placeholder="Buscar por código o descripción..."
              [value]="searchQuery()"
              (input)="onSearchChange($event)"
            />
          </div>

          <div class="filter-group">
            <select class="form-control filter-select" [value]="statusFilter()" (change)="onStatusFilterChange($event)">
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos</option>
              <option value="AGOTADO">Agotados</option>
              <option value="EXPIRADO">Expirados</option>
            </select>

            <select class="form-control filter-select" [value]="typeFilter()" (change)="onTypeFilterChange($event)">
              <option value="ALL">Todos los tipos</option>
              <option value="PORCENTAJE">Porcentaje (%)</option>
              <option value="MONTO_FIJO">Monto Fijo ($)</option>
            </select>
          </div>
        </div>

        <div class="toolbar-right">
          <button class="btn btn-accent" (click)="openCreateCouponModal()">
            <i class="ri-add-line"></i> Nuevo Cupón
          </button>
        </div>
      </div>

      <!-- Coupons Table Card -->
      <div class="card table-card">
        <div class="table-card-header">
          <div class="header-count">
            <h3 class="table-title">Cupones de Descuento (CU18)</h3>
            <span class="count-badge">{{ filteredCoupons().length }} cupones</span>
          </div>
          <button class="btn btn-secondary btn-sm" (click)="loadCoupons()" [disabled]="isLoading()">
            <i class="ri-refresh-line" [class.spin-icon]="isLoading()"></i> Actualizar
          </button>
        </div>

        <div class="table-responsive">
          <table class="table-custom">
            <thead>
              <tr>
                <th>Código de Cupón</th>
                <th>Descuento</th>
                <th>Vigencia</th>
                <th>Límite de Usos</th>
                <th>Compra Mínima</th>
                <th>Estado</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (isLoading()) {
                <tr>
                  <td colspan="7" class="text-center py-8">
                    <i class="ri-loader-4-line spin-icon text-2xl text-accent"></i>
                    <p class="text-muted mt-2">Cargando cupones de descuento...</p>
                  </td>
                </tr>
              } @else if (filteredCoupons().length === 0) {
                <tr>
                  <td colspan="7" class="text-center py-8 text-muted">
                    <i class="ri-coupon-3-line text-3xl mb-2"></i>
                    <p>No se encontraron cupones registrados con los filtros actuales.</p>
                  </td>
                </tr>
              } @else {
                @for (coupon of filteredCoupons(); track coupon.id) {
                  <tr>
                    <td>
                      <div class="coupon-code-cell">
                        <div class="coupon-pill" (click)="copyCode(coupon.codigo)" title="Click para copiar código">
                          <i class="ri-file-copy-line copy-icon"></i>
                          <span class="code-text">{{ coupon.codigo }}</span>
                        </div>
                        @if (coupon.descripcion) {
                          <span class="coupon-desc text-muted">{{ coupon.descripcion }}</span>
                        }
                      </div>
                    </td>
                    <td>
                      <div class="discount-badge" [class.is-percent]="coupon.tipo === 'PORCENTAJE'">
                        <i [class]="coupon.tipo === 'PORCENTAJE' ? 'ri-percent-line' : 'ri-money-dollar-circle-line'"></i>
                        <strong>
                          {{ coupon.tipo === 'PORCENTAJE' ? (coupon.valor + '% OFF') : ('$' + coupon.valor + ' OFF') }}
                        </strong>
                      </div>
                    </td>
                    <td>
                      <div class="dates-cell">
                        <div class="date-row">
                          <span class="date-label">Desde:</span>
                          <span class="date-val">{{ coupon.fecha_inicio | date:'dd/MM/yyyy HH:mm' }}</span>
                        </div>
                        <div class="date-row">
                          <span class="date-label">Hasta:</span>
                          <span class="date-val">{{ coupon.fecha_fin | date:'dd/MM/yyyy HH:mm' }}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="usage-cell">
                        <div class="usage-text">
                          <span class="font-semibold">{{ coupon.usos_actuales }}</span>
                          <span class="text-muted"> / {{ coupon.usos_maximos ? coupon.usos_maximos : '∞' }} usos</span>
                        </div>
                        @if (coupon.usos_maximos) {
                          <div class="usage-bar-bg">
                            <div 
                              class="usage-bar-fill" 
                              [style.width.%]="calcUsagePercent(coupon.usos_actuales, coupon.usos_maximos)"
                              [class.bar-full]="coupon.usos_actuales >= coupon.usos_maximos"
                            ></div>
                          </div>
                        }
                      </div>
                    </td>
                    <td>
                      @if (coupon.monto_minimo && coupon.monto_minimo > 0) {
                        <span class="min-amount-badge">\${{ coupon.monto_minimo | number:'1.2-2' }}</span>
                      } @else {
                        <span class="text-xs text-muted">Sin mínimo</span>
                      }
                    </td>
                    <td>
                      <span class="status-badge" [ngClass]="getStatusBadgeClass(coupon.estado)">
                        <span class="status-dot"></span>
                        {{ coupon.estado }}
                      </span>
                    </td>
                    <td>
                      <div class="action-buttons-flex">
                        <button 
                          class="btn-action-icon" 
                          [title]="coupon.estado === 'ACTIVO' ? 'Desactivar Cupón' : 'Activar Cupón'"
                          (click)="toggleCouponStatus(coupon)"
                        >
                          <i [class]="coupon.estado === 'ACTIVO' ? 'ri-pause-circle-line' : 'ri-play-circle-line'"></i>
                        </button>
                        <button class="btn-action-icon" title="Editar Cupón" (click)="openEditCouponModal(coupon)">
                          <i class="ri-edit-line"></i>
                        </button>
                        <button class="btn-action-icon btn-action-danger" title="Eliminar Cupón" (click)="deleteCoupon(coupon)">
                          <i class="ri-delete-bin-line"></i>
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

      <!-- Create / Edit Coupon Modal -->
      <app-modal
        [isOpen]="isCouponModalOpen()"
        [title]="isEditingCoupon() ? 'Editar Cupón de Descuento' : 'Crear Nuevo Cupón de Descuento'"
        [subtitle]="isEditingCoupon() ? 'Modifica los parámetros y condiciones del cupón' : 'Define el código, porcentaje o monto de ahorro para los clientes'"
        icon="ri-coupon-3-line"
        [maxWidth]="'680px'"
        (closeEvent)="closeCouponModal()"
      >
        <form [formGroup]="couponForm" (ngSubmit)="saveCoupon()" class="modal-form">
          <div class="grid grid-cols-2 form-row">
            <div class="form-group">
              <div class="label-with-action">
                <label class="form-label" for="c-codigo">Código de Cupón <span class="required">*</span></label>
                @if (!isEditingCoupon()) {
                  <button type="button" class="btn-text-action" (click)="generateRandomCode()">
                    <i class="ri-magic-line"></i> Generar
                  </button>
                }
              </div>
              <div class="input-with-icon-right">
                <input 
                  id="c-codigo" 
                  type="text" 
                  formControlName="codigo" 
                  class="form-control code-input" 
                  placeholder="Ej. VERANO2026"
                  (input)="onCodeInput($event)"
                />
              </div>
              @if (couponForm.get('codigo')?.invalid && couponForm.get('codigo')?.touched) {
                <span class="form-error">Código requerido (mínimo 3 caracteres alfanuméricos)</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label">Tipo de Descuento <span class="required">*</span></label>
              <div class="type-toggle-group">
                <label class="type-option" [class.selected]="couponForm.get('tipo')?.value === 'PORCENTAJE'">
                  <input type="radio" formControlName="tipo" value="PORCENTAJE" class="hidden-radio" />
                  <i class="ri-percent-line"></i>
                  <span>Porcentaje (%)</span>
                </label>
                <label class="type-option" [class.selected]="couponForm.get('tipo')?.value === 'MONTO_FIJO'">
                  <input type="radio" formControlName="tipo" value="MONTO_FIJO" class="hidden-radio" />
                  <i class="ri-money-dollar-circle-line"></i>
                  <span>Monto Fijo ($)</span>
                </label>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 form-row">
            <div class="form-group">
              <label class="form-label" for="c-valor">
                Valor del Descuento 
                <span class="required">*</span>
                <span class="text-xs text-muted">
                  ({{ couponForm.get('tipo')?.value === 'PORCENTAJE' ? 'Ej. 15 para 15%' : 'Ej. 50 para $50.00' }})
                </span>
              </label>
              <div class="value-input-wrapper">
                <span class="value-prefix">{{ couponForm.get('tipo')?.value === 'PORCENTAJE' ? '%' : '$' }}</span>
                <input 
                  id="c-valor" 
                  type="number" 
                  step="0.01" 
                  min="0.01" 
                  [max]="couponForm.get('tipo')?.value === 'PORCENTAJE' ? 100 : 99999" 
                  formControlName="valor" 
                  class="form-control with-prefix" 
                  placeholder="0.00"
                />
              </div>
              @if (couponForm.get('valor')?.invalid && couponForm.get('valor')?.touched) {
                <span class="form-error">Ingresa un valor válido mayor a 0</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="c-monto-min">Monto Mínimo de Compra ($)</label>
              <div class="value-input-wrapper">
                <span class="value-prefix">$</span>
                <input 
                  id="c-monto-min" 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  formControlName="monto_minimo" 
                  class="form-control with-prefix" 
                  placeholder="0.00 (Opcional)"
                />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 form-row">
            <div class="form-group">
              <label class="form-label" for="c-fecha-ini">Fecha & Hora de Inicio <span class="required">*</span></label>
              <input id="c-fecha-ini" type="datetime-local" formControlName="fecha_inicio" class="form-control" />
              @if (couponForm.get('fecha_inicio')?.invalid && couponForm.get('fecha_inicio')?.touched) {
                <span class="form-error">Fecha de inicio requerida</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="c-fecha-fin">Fecha & Hora de Fin <span class="required">*</span></label>
              <input id="c-fecha-fin" type="datetime-local" formControlName="fecha_fin" class="form-control" />
              @if (couponForm.get('fecha_fin')?.invalid && couponForm.get('fecha_fin')?.touched) {
                <span class="form-error">Fecha de fin requerida</span>
              }
            </div>
          </div>

          <div class="grid grid-cols-2 form-row">
            <div class="form-group">
              <label class="form-label" for="c-usos-max">Límite de Usos Máximos</label>
              <input 
                id="c-usos-max" 
                type="number" 
                min="1" 
                formControlName="usos_maximos" 
                class="form-control" 
                placeholder="Ej. 100 (Vacío = Ilimitado)"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="c-estado">Estado del Cupón</label>
              <select id="c-estado" formControlName="estado" class="form-control">
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
                <option value="EXPIRADO">EXPIRADO</option>
                <option value="AGOTADO">AGOTADO</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="c-desc">Descripción / Campaña Promocional</label>
            <input 
              id="c-desc" 
              type="text" 
              formControlName="descripcion" 
              class="form-control" 
              placeholder="Ej. 20% de descuento en colección de Verano 2026"
            />
          </div>

          <div class="modal-actions-box">
            <button type="button" class="btn btn-outline" (click)="closeCouponModal()">Cancelar</button>
            <button type="submit" class="btn btn-accent" [disabled]="couponForm.invalid || isSaving()">
              <i class="ri-save-line" *ngIf="!isSaving()"></i>
              <i class="ri-loader-4-line spin-icon" *ngIf="isSaving()"></i>
              {{ isEditingCoupon() ? 'Guardar Cambios' : 'Crear Cupón' }}
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
      border-radius: var(--radius-md, 8px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;

      &.bg-blue {
        background: #eff6ff;
        color: #2563eb;
      }
      &.bg-green {
        background: #f0fdf4;
        color: #16a34a;
      }
      &.bg-purple {
        background: #faf5ff;
        color: #9333ea;
      }
      &.bg-amber {
        background: #fffbeb;
        color: #d97706;
      }
    }

    .kpi-info {
      display: flex;
      flex-direction: column;
    }

    .kpi-label {
      font-size: 0.8125rem;
      color: var(--text-muted, #64748b);
      font-weight: 500;
    }

    .kpi-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary, #0f172a);
      line-height: 1.2;
    }

    /* Toolbar */
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
      color: var(--text-muted, #64748b);
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .filter-select {
      min-width: 150px;
      font-size: 0.875rem;
    }

    /* Table */
    .table-card {
      padding: 0;
      overflow: hidden;
    }

    .table-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color, #e2e8f0);
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
      color: var(--primary, #0f172a);
      margin: 0;
    }

    .count-badge {
      background: #f1f5f9;
      color: var(--secondary, #475569);
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.6rem;
      border-radius: var(--radius-full, 9999px);
    }

    .coupon-code-cell {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .coupon-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #f8fafc;
      border: 1px dashed var(--accent, #3b82f6);
      padding: 0.25rem 0.65rem;
      border-radius: var(--radius-sm, 6px);
      cursor: pointer;
      width: fit-content;
      transition: all 0.2s ease;

      &:hover {
        background: #eff6ff;
        border-color: #2563eb;
        transform: scale(1.02);

        .copy-icon {
          color: #2563eb;
        }
      }
    }

    .copy-icon {
      font-size: 0.875rem;
      color: var(--text-muted, #64748b);
    }

    .code-text {
      font-family: 'Courier New', Courier, monospace;
      font-weight: 700;
      font-size: 0.9375rem;
      color: var(--primary, #0f172a);
      letter-spacing: 0.05em;
    }

    .coupon-desc {
      font-size: 0.75rem;
    }

    .discount-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: #ecfdf5;
      color: #047857;
      padding: 0.3rem 0.65rem;
      border-radius: var(--radius-md, 6px);
      font-size: 0.875rem;
      font-weight: 600;

      &.is-percent {
        background: #f5f3ff;
        color: #6d28d9;
      }
    }

    .dates-cell {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .date-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
    }

    .date-label {
      color: var(--text-muted, #64748b);
      min-width: 40px;
    }

    .date-val {
      font-weight: 500;
      color: var(--primary, #0f172a);
    }

    .usage-cell {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      min-width: 110px;
    }

    .usage-text {
      font-size: 0.8125rem;
    }

    .usage-bar-bg {
      width: 100%;
      height: 6px;
      background: #e2e8f0;
      border-radius: 9999px;
      overflow: hidden;
    }

    .usage-bar-fill {
      height: 100%;
      background: var(--accent, #3b82f6);
      border-radius: 9999px;
      transition: width 0.3s ease;

      &.bar-full {
        background: #ef4444;
      }
    }

    .min-amount-badge {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--secondary, #475569);
      background: #f1f5f9;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: var(--radius-full, 9999px);
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .status-active {
      background: #f0fdf4;
      color: #15803d;
      .status-dot { background: #16a34a; }
    }

    .status-inactive {
      background: #f1f5f9;
      color: #64748b;
      .status-dot { background: #94a3b8; }
    }

    .status-depleted {
      background: #fef2f2;
      color: #b91c1c;
      .status-dot { background: #ef4444; }
    }

    .status-expired {
      background: #fffbeb;
      color: #b45309;
      .status-dot { background: #f59e0b; }
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
      border-radius: var(--radius-sm, 6px);
      border: 1px solid var(--border-color, #e2e8f0);
      background: white;
      color: var(--secondary, #475569);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: #f8fafc;
        color: var(--primary, #0f172a);
        border-color: var(--primary, #0f172a);
      }

      &.btn-action-danger:hover {
        background: #fef2f2;
        color: #ef4444;
        border-color: #ef4444;
      }
    }

    /* Modal Form Styles */
    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-row {
      gap: 1rem;
    }

    .label-with-action {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .btn-text-action {
      background: none;
      border: none;
      color: var(--accent, #3b82f6);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0;

      &:hover {
        text-decoration: underline;
      }
    }

    .code-input {
      text-transform: uppercase;
      font-family: 'Courier New', Courier, monospace;
      font-weight: 700;
      letter-spacing: 0.05em;
    }

    .type-toggle-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .type-option {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      padding: 0.6rem 0.75rem;
      border: 1px solid var(--border-color, #cbd5e1);
      border-radius: var(--radius-md, 6px);
      cursor: pointer;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--secondary, #475569);
      transition: all 0.2s ease;

      &.selected {
        background: #eff6ff;
        border-color: var(--accent, #3b82f6);
        color: var(--accent, #3b82f6);
        font-weight: 700;
      }
    }

    .hidden-radio {
      display: none;
    }

    .value-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .value-prefix {
      position: absolute;
      left: 0.85rem;
      font-weight: 700;
      color: var(--text-muted, #64748b);
    }

    .with-prefix {
      padding-left: 2rem !important;
    }

    .form-error {
      color: #ef4444;
      font-size: 0.75rem;
      margin-top: 0.25rem;
      display: block;
    }

    .modal-actions-box {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-light, #f1f5f9);
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class CouponsComponent implements OnInit {
  private couponApi = inject(CouponApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  public coupons = signal<Cupon[]>([]);
  public isLoading = signal<boolean>(true);
  public isSaving = signal<boolean>(false);
  public searchQuery = signal<string>('');
  public statusFilter = signal<string>('ALL');
  public typeFilter = signal<string>('ALL');

  // Modal Signals
  public isCouponModalOpen = signal<boolean>(false);
  public isEditingCoupon = signal<boolean>(false);
  public selectedCouponId = signal<number | null>(null);

  public couponForm: FormGroup = this.fb.group({
    codigo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    tipo: ['PORCENTAJE', [Validators.required]],
    valor: [10, [Validators.required, Validators.min(0.01)]],
    descripcion: [''],
    fecha_inicio: ['', [Validators.required]],
    fecha_fin: ['', [Validators.required]],
    usos_maximos: [null],
    monto_minimo: [null],
    estado: ['ACTIVO', [Validators.required]]
  });

  // KPI Computeds
  public totalCoupons = computed(() => this.coupons().length);
  public activeCoupons = computed(() => this.coupons().filter(c => c.estado === 'ACTIVO').length);
  public totalUses = computed(() => this.coupons().reduce((acc, c) => acc + (c.usos_actuales || 0), 0));
  public expiredOrDepletedCoupons = computed(() => 
    this.coupons().filter(c => c.estado === 'EXPIRADO' || c.estado === 'AGOTADO').length
  );

  public filteredCoupons = computed(() => {
    let list = this.coupons();
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    const type = this.typeFilter();

    if (query) {
      list = list.filter(c => 
        c.codigo.toLowerCase().includes(query) || 
        (c.descripcion && c.descripcion.toLowerCase().includes(query))
      );
    }

    if (status !== 'ALL') {
      list = list.filter(c => c.estado === status);
    }

    if (type !== 'ALL') {
      list = list.filter(c => c.tipo === type);
    }

    return list;
  });

  ngOnInit(): void {
    this.loadCoupons();
  }

  loadCoupons(): void {
    this.isLoading.set(true);
    this.couponApi.getCoupons(0, 200).subscribe({
      next: (data) => {
        this.coupons.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando cupones:', err);
        this.toast.error('Error al cargar la lista de cupones.');
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  onStatusFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.statusFilter.set(val);
  }

  onTypeFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.typeFilter.set(val);
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.toUpperCase();
    this.couponForm.get('codigo')?.setValue(input.value, { emitEvent: false });
  }

  generateRandomCode(): void {
    const prefix = 'FASHION';
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `${prefix}-${randomPart}`;
    this.couponForm.patchValue({ codigo: code });
  }

  copyCode(code: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        this.toast.success(`Código ${code} copiado al portapapeles.`);
      });
    }
  }

  calcUsagePercent(actual: number, max: number): number {
    if (!max || max <= 0) return 0;
    return Math.min(100, Math.round((actual / max) * 100));
  }

  getStatusBadgeClass(status: EstadoCupon): string {
    switch (status) {
      case 'ACTIVO': return 'status-active';
      case 'INACTIVO': return 'status-inactive';
      case 'AGOTADO': return 'status-depleted';
      case 'EXPIRADO': return 'status-expired';
      default: return 'status-inactive';
    }
  }

  openCreateCouponModal(): void {
    this.isEditingCoupon.set(false);
    this.selectedCouponId.set(null);

    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    this.couponForm.reset({
      codigo: '',
      tipo: 'PORCENTAJE',
      valor: 10,
      descripcion: '',
      fecha_inicio: this.formatDateForInput(now),
      fecha_fin: this.formatDateForInput(nextMonth),
      usos_maximos: null,
      monto_minimo: null,
      estado: 'ACTIVO'
    });

    this.isCouponModalOpen.set(true);
  }

  openEditCouponModal(coupon: Cupon): void {
    this.isEditingCoupon.set(true);
    this.selectedCouponId.set(coupon.id);

    this.couponForm.patchValue({
      codigo: coupon.codigo,
      tipo: coupon.tipo,
      valor: coupon.valor,
      descripcion: coupon.descripcion || '',
      fecha_inicio: this.formatDateForInput(new Date(coupon.fecha_inicio)),
      fecha_fin: this.formatDateForInput(new Date(coupon.fecha_fin)),
      usos_maximos: coupon.usos_maximos ?? null,
      monto_minimo: coupon.monto_minimo ?? null,
      estado: coupon.estado
    });

    this.isCouponModalOpen.set(true);
  }

  closeCouponModal(): void {
    this.isCouponModalOpen.set(false);
    this.couponForm.reset();
  }

  saveCoupon(): void {
    if (this.couponForm.invalid) {
      this.couponForm.markAllAsTouched();
      return;
    }

    const formVal = this.couponForm.value;

    const startDate = new Date(formVal.fecha_inicio);
    const endDate = new Date(formVal.fecha_fin);

    if (endDate <= startDate) {
      this.toast.error('La fecha de fin debe ser posterior a la fecha de inicio.');
      return;
    }

    this.isSaving.set(true);

    if (this.isEditingCoupon()) {
      const couponId = this.selectedCouponId()!;
      const updateDto: CuponUpdateDto = {
        codigo: formVal.codigo.trim().toUpperCase(),
        tipo: formVal.tipo,
        valor: Number(formVal.valor),
        descripcion: formVal.descripcion?.trim() || undefined,
        fecha_inicio: startDate.toISOString(),
        fecha_fin: endDate.toISOString(),
        usos_maximos: formVal.usos_maximos ? Number(formVal.usos_maximos) : null,
        monto_minimo: formVal.monto_minimo ? Number(formVal.monto_minimo) : null,
        estado: formVal.estado
      };

      this.couponApi.updateCoupon(couponId, updateDto).subscribe({
        next: (updated) => {
          this.toast.success(`Cupón ${updated.codigo} actualizado con éxito.`);
          this.isSaving.set(false);
          this.closeCouponModal();
          this.loadCoupons();
        },
        error: (err) => {
          console.error('Error actualizando cupón:', err);
          const detail = err.error?.detail || 'No se pudo actualizar el cupón.';
          this.toast.error(detail);
          this.isSaving.set(false);
        }
      });
    } else {
      const createDto: CuponCreateDto = {
        codigo: formVal.codigo.trim().toUpperCase(),
        tipo: formVal.tipo,
        valor: Number(formVal.valor),
        descripcion: formVal.descripcion?.trim() || undefined,
        fecha_inicio: startDate.toISOString(),
        fecha_fin: endDate.toISOString(),
        usos_maximos: formVal.usos_maximos ? Number(formVal.usos_maximos) : null,
        monto_minimo: formVal.monto_minimo ? Number(formVal.monto_minimo) : null,
        estado: formVal.estado
      };

      this.couponApi.createCoupon(createDto).subscribe({
        next: (created) => {
          this.toast.success(`Cupón ${created.codigo} creado con éxito.`);
          this.isSaving.set(false);
          this.closeCouponModal();
          this.loadCoupons();
        },
        error: (err) => {
          console.error('Error creando cupón:', err);
          const detail = err.error?.detail || 'No se pudo registrar el cupón.';
          this.toast.error(detail);
          this.isSaving.set(false);
        }
      });
    }
  }

  toggleCouponStatus(coupon: Cupon): void {
    const nextStatus: EstadoCupon = coupon.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    this.couponApi.updateCoupon(coupon.id, { estado: nextStatus }).subscribe({
      next: (updated) => {
        this.toast.success(`Cupón ${coupon.codigo} cambiado a ${nextStatus}.`);
        this.loadCoupons();
      },
      error: (err) => {
        console.error('Error cambiando estado del cupón:', err);
        this.toast.error('No se pudo cambiar el estado del cupón.');
      }
    });
  }

  deleteCoupon(coupon: Cupon): void {
    if (confirm(`¿Estás seguro de que deseas eliminar el cupón "${coupon.codigo}"?`)) {
      this.couponApi.deleteCoupon(coupon.id).subscribe({
        next: () => {
          this.toast.success(`Cupón ${coupon.codigo} eliminado correctamente.`);
          this.loadCoupons();
        },
        error: (err) => {
          console.error('Error eliminando cupón:', err);
          const detail = err.error?.detail || 'No se pudo eliminar el cupón.';
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
