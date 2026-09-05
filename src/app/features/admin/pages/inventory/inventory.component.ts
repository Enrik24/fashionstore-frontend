import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InventoryApiService } from '../../../../core/services/inventory-api.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Inventario, MovimientoInventario, MovimientoInventarioCreateDto, TipoMovimiento } from '../../../../core/models/inventory.model';
import { Sucursal } from '../../../../core/models/branch.model';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, StatusBadgePipe],
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
              placeholder="Buscar por producto..."
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

      <!-- Inventory Table -->
      <div class="card table-card">
        <div class="table-card-header">
          <div class="header-count">
            <h3 class="table-title">Control de Existencias por Sucursal (CU19)</h3>
            <span class="count-badge">{{ filteredInventory().length }} registros</span>
          </div>
          <button class="btn btn-secondary btn-sm" (click)="loadInventory()" [disabled]="isLoading()">
            <i class="ri-refresh-line" [class.spin-icon]="isLoading()"></i> Actualizar
          </button>
        </div>

        <div class="table-responsive">
          <table class="table-custom">
            <thead>
              <tr>
                <th>Prenda / Variante</th>
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
              @if (isLoading()) {
                <tr>
                  <td colspan="8" class="text-center py-8">
                    <i class="ri-loader-4-line spin-icon text-2xl text-accent"></i>
                    <p class="text-muted mt-2">Cargando existencias de inventario...</p>
                  </td>
                </tr>
              } @else if (filteredInventory().length === 0) {
                <tr>
                  <td colspan="8" class="text-center py-8 text-muted">
                    <i class="ri-archive-line text-3xl mb-2"></i>
                    <p>No se encontraron registros de inventario para esta búsqueda.</p>
                  </td>
                </tr>
              } @else {
                @for (item of filteredInventory(); track item.id) {
                  <tr [class.row-alert]="item.cantidad <= item.stock_minimo">
                    <td>
                      <div class="inventory-product-cell">
                        <div class="inventory-icon"><i class="ri-t-shirt-2-line"></i></div>
                        <div>
                          <strong>{{ item.variante?.producto?.nombre || 'Prenda #' + item.variante_id }}</strong>
                          <div class="text-xs text-muted">SKU: {{ item.variante?.producto?.sku || 'N/A' }}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="badge badge-primary">{{ item.sucursal?.nombre || 'Sucursal #' + item.sucursal_id }}</span>
                    </td>
                    <td>
                      <div class="variant-tags">
                        <span class="variant-tag">Talla: {{ item.variante?.talla?.nombre || 'M' }}</span>
                        <span class="variant-tag">Color: {{ item.variante?.color?.nombre || 'Negro' }}</span>
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
              }
            </tbody>
          </table>
        </div>
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
            <select id="m-inv" formControlName="inventario_id" class="form-control">
              @for (inv of inventoryList(); track inv.id) {
                <option [value]="inv.id">
                  {{ inv.variante?.producto?.nombre || 'Prenda #' + inv.variante_id }} - {{ inv.sucursal?.nombre }} (Actual: {{ inv.cantidad }} u.)
                </option>
              }
            </select>
          </div>

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
        @if (selectedInventoryForAdjust()) {
          <form [formGroup]="adjustForm" (ngSubmit)="saveQuickAdjust()" class="modal-form">
            <div class="adjust-info-box card glass mb-4">
              <h4>{{ selectedInventoryForAdjust()?.variante?.producto?.nombre }}</h4>
              <p class="text-xs text-muted">Sucursal: {{ selectedInventoryForAdjust()?.sucursal?.nombre }} | Existencia actual: {{ selectedInventoryForAdjust()?.cantidad }} u.</p>
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
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Antes / Después</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                @if (movementsHistory().length === 0) {
                  <tr>
                    <td colspan="5" class="text-center py-6 text-muted">
                      No hay historial de movimientos disponible.
                    </td>
                  </tr>
                } @else {
                  @for (m of movementsHistory(); track m.id) {
                    <tr>
                      <td><span class="text-xs text-muted">{{ m.fecha | date:'dd/MM/yyyy HH:mm' }}</span></td>
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
      min-width: 250px;
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

    .row-alert {
      background: rgba(239, 68, 68, 0.03);
    }

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
    }

    .adjust-info-box {
      padding: 1rem;
      border-radius: var(--radius-md);
      margin-bottom: 1rem;
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

  // Movement Modal
  public isMovementModalOpen = signal<boolean>(false);
  public movementForm: FormGroup = this.fb.group({
    inventario_id: [null, [Validators.required]],
    tipo: ['ENTRADA', [Validators.required]],
    cantidad: [10, [Validators.required, Validators.min(1)]],
    motivo: ['', [Validators.required, Validators.minLength(4)]]
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
        item.variante?.producto?.nombre?.toLowerCase().includes(query) ||
        item.variante?.producto?.sku?.toLowerCase().includes(query)
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

  ngOnInit(): void {
    this.loadInventory();
    this.loadBranches();
  }

  loadInventory(): void {
    this.isLoading.set(true);
    this.inventoryApi.getGlobalInventory(0, 100).subscribe({
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

  onSearchChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  onBranchFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedBranchFilter.set(val);
  }

  onStatusFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedStatusFilter.set(val);
  }

  openRegisterMovementModal(item?: Inventario): void {
    const defaultId = item ? item.id : (this.inventoryList().length > 0 ? this.inventoryList()[0].id : null);
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
