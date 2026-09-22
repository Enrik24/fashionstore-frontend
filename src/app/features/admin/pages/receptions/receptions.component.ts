import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ReceptionApiService } from '../../../../core/services/reception-api.service';
import { SupplierApiService } from '../../../../core/services/supplier-api.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { CatalogApiService } from '../../../../core/services/catalog-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { Recepcion } from '../../../../core/models/reception.model';
import { Proveedor } from '../../../../core/models/supplier.model';
import { Sucursal } from '../../../../core/models/branch.model';
import { Producto, VarianteProducto } from '../../../../core/models/catalog.model';

interface ItemForm {
  productoId: number | null;
  variantes: VarianteProducto[];
  variante_producto_id: number | null;
  cantidad: number;
  costo_unitario: number | null;
  isLoadingVariantes?: boolean;
}

@Component({
  selector: 'app-receptions',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  template: `
    <div class="page-container animate-fade-in">
      <div class="toolbar-card card">
        <div class="toolbar-left">
          <select class="form-control" [(ngModel)]="filterProveedorId" (change)="loadReceptions()">
            <option [ngValue]="null">Todos los proveedores</option>
            @for (s of suppliers(); track s.id) {
              <option [ngValue]="s.id">{{ s.nombre }}</option>
            }
          </select>
          <select class="form-control" [(ngModel)]="filterSucursalId" (change)="loadReceptions()">
            <option [ngValue]="null">Todas las sucursales</option>
            @for (b of branches(); track b.id) {
              <option [ngValue]="b.id">{{ b.nombre }}</option>
            }
          </select>
        </div>
        <div class="toolbar-right">
          <button class="btn btn-secondary btn-sm" (click)="loadReceptions()" [disabled]="isLoading()">
            <i class="ri-refresh-line"></i> Actualizar
          </button>
          <button class="btn btn-accent" (click)="openCreateModal()">
            <i class="ri-download-cloud-2-line"></i> Nueva Recepción
          </button>
        </div>
      </div>

      <div class="card table-card">
        <div class="table-card-header">
          <div class="header-count">
            <h3 class="table-title">Recepciones de Mercadería (RF06)</h3>
            <span class="count-badge">{{ receptions().length }} ingresos</span>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table-custom">
            <thead>
              <tr>
                <th>Número</th>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>Sucursal</th>
                <th>Factura</th>
                <th class="text-right">Uds.</th>
                <th class="text-right">Costo total</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (isLoading()) {
                <tr><td colspan="8" class="text-center py-8 text-muted">Cargando recepciones...</td></tr>
              } @else if (receptions().length === 0) {
                <tr><td colspan="8" class="text-center py-8 text-muted">Sin recepciones. Registra el primer ingreso con "Nueva Recepción".</td></tr>
              } @else {
                @for (r of receptions(); track r.id) {
                  <tr>
                    <td><strong class="mono">{{ r.numero }}</strong></td>
                    <td class="text-sm">{{ r.fecha_hora | date:'short' }}</td>
                    <td>{{ r.proveedor_nombre || ('#' + r.proveedor_id) }}</td>
                    <td>{{ r.sucursal_nombre || ('#' + r.sucursal_id) }}</td>
                    <td class="text-sm">{{ r.nro_factura || 'S/N' }}</td>
                    <td class="text-right"><strong>{{ r.total_unidades }}</strong></td>
                    <td class="text-right">Bs. {{ r.total_costo }}</td>
                    <td class="text-right">
                      <button class="btn-action-icon" title="Ver detalle" (click)="openDetail(r)">
                        <i class="ri-eye-line"></i>
                      </button>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal crear -->
      <app-modal
        [isOpen]="isCreateOpen()"
        title="Nueva Recepción de Mercadería"
        subtitle="El stock se suma automáticamente con movimiento RECEPCION"
        icon="ri-download-cloud-2-line"
        (closeEvent)="closeCreateModal()"
      >
        <div class="modal-form">
          <div class="grid grid-cols-2 form-row">
            <div class="form-group">
              <label class="form-label">Proveedor *</label>
              <select class="form-control" [(ngModel)]="formProveedorId">
                <option [ngValue]="null">Seleccionar...</option>
                @for (s of suppliers(); track s.id) {
                  <option [ngValue]="s.id">{{ s.nombre }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Sucursal destino *</label>
              <select class="form-control" [(ngModel)]="formSucursalId">
                <option [ngValue]="null">Seleccionar...</option>
                @for (b of branches(); track b.id) {
                  <option [ngValue]="b.id">{{ b.nombre }}</option>
                }
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 form-row">
            <div class="form-group">
              <label class="form-label">Nro. Factura / Documento</label>
              <input type="text" class="form-control" [(ngModel)]="formFactura" placeholder="FAC-00123" />
            </div>
            <div class="form-group">
              <label class="form-label">Observaciones</label>
              <input type="text" class="form-control" [(ngModel)]="formObs" placeholder="Colección verano, caja 1..." />
            </div>
          </div>

          <div class="items-box">
            <div class="items-header">
              <strong>Items (variante + cantidad + costo)</strong>
              <button class="btn btn-outline btn-sm" (click)="addItem()"><i class="ri-add-line"></i> Agregar item</button>
            </div>
            @if (isLoadingProducts()) {
              <p class="text-sm text-muted">Cargando productos y variantes...</p>
            } @else if (filteredProducts().length === 0) {
              <p class="text-sm text-muted">No hay productos registrados. Crea primero un producto con talla/color en <strong>Productos & Prendas</strong>.</p>
            }
            @for (it of items(); track $index) {
              <div class="item-row">
                <select class="form-control" [(ngModel)]="it.productoId" (change)="onProductChange(it)" title="Producto">
                  <option [ngValue]="null">Producto... ({{ filteredProducts().length }})</option>
                  @for (p of filteredProducts(); track p.id) {
                    <option [ngValue]="p.id">{{ p.nombre }} ({{ p.sku }})</option>
                  }
                </select>
                <select class="form-control" [(ngModel)]="it.variante_producto_id" [disabled]="!it.productoId || !!it.isLoadingVariantes" title="Variante (talla/color)">
                  @if (!it.productoId) {
                    <option [ngValue]="null">Primero elige producto...</option>
                  } @else if (it.isLoadingVariantes) {
                    <option [ngValue]="null">Cargando variantes...</option>
                  } @else if (it.variantes.length === 0) {
                    <option [ngValue]="null">Sin variantes: créalas en Productos</option>
                  } @else {
                    <option [ngValue]="null">Variante... ({{ it.variantes.length }})</option>
                    @for (v of it.variantes; track v.id) {
                      <option [ngValue]="v.id">{{ variantLabel(v) }}</option>
                    }
                  }
                </select>
                <input type="number" class="form-control" min="1" step="1" [(ngModel)]="it.cantidad" placeholder="Cant." title="Cantidad a ingresar" style="max-width:90px" />
                <input type="number" class="form-control" min="0" step="0.01" [(ngModel)]="it.costo_unitario" placeholder="Costo c/u" title="Costo unitario" style="max-width:110px" />
                <button class="btn-action-icon btn-action-danger" (click)="removeItem($index)" title="Quitar item"><i class="ri-delete-bin-line"></i></button>
              </div>
            }
          </div>

          <div class="modal-actions-box">
            <button type="button" class="btn btn-outline" (click)="closeCreateModal()">Cancelar</button>
            <button type="button" class="btn btn-accent" [disabled]="isSaving() || !canSave()" (click)="save()">
              {{ isSaving() ? 'Registrando...' : 'Registrar ingreso' }}
            </button>
          </div>
        </div>
      </app-modal>

      <!-- Modal detalle -->
      <app-modal
        [isOpen]="isDetailOpen()"
        [title]="selected()?.numero || 'Recepción'"
        subtitle="Detalle de variantes ingresadas"
        icon="ri-file-list-3-line"
        (closeEvent)="closeDetail()"
      >
        @if (selected()) {
          <div class="detail-meta">
            <span><strong>Proveedor:</strong> {{ selected()!.proveedor_nombre }}</span>
            <span><strong>Sucursal:</strong> {{ selected()!.sucursal_nombre }}</span>
            <span><strong>Factura:</strong> {{ selected()!.nro_factura || 'S/N' }}</span>
            @if (selected()!.observaciones) {
              <span><strong>Obs:</strong> {{ selected()!.observaciones }}</span>
            }
          </div>
          <table class="table-custom">
            <thead><tr><th>Variante</th><th>Producto</th><th class="text-right">Cant.</th><th class="text-right">Costo c/u</th></tr></thead>
            <tbody>
              @for (d of selected()!.detalles; track d.id) {
                <tr>
                  <td class="mono">{{ d.sku_variante || ('#' + d.variante_producto_id) }}</td>
                  <td>{{ d.producto_nombre || '-' }}</td>
                  <td class="text-right"><strong>{{ d.cantidad }}</strong></td>
                  <td class="text-right">{{ d.costo_unitario ?? '-' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </app-modal>
    </div>
  `,
  styles: [`
    .page-container { display: flex; flex-direction: column; gap: 1.5rem; }
    .toolbar-card { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; flex-wrap: wrap; gap: 1rem; }
    .toolbar-left { display: flex; gap: .75rem; flex-wrap: wrap; }
    .toolbar-left .form-control { min-width: 220px; }
    .toolbar-right { display: flex; gap: .5rem; }
    .table-card { padding: 0; overflow: hidden; }
    .table-card-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); }
    .table-title { font-size: 1.15rem; font-weight: 700; color: var(--primary); margin: 0; }
    .count-badge { background: #f1f5f9; font-size: .75rem; font-weight: 600; padding: .25rem .6rem; border-radius: var(--radius-full); }
    .header-count { display: flex; align-items: center; gap: .75rem; }
    .mono { font-family: monospace; }
    .btn-action-icon { width: 32px; height: 32px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: white; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
    .btn-action-icon:hover { border-color: var(--primary); color: var(--primary); }
    .btn-action-danger:hover { background: var(--error-bg); color: var(--error); border-color: var(--error); }
    .modal-form { display: flex; flex-direction: column; gap: 1rem; }
    .form-row { gap: 1rem; }
    .items-box { border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: .75rem; display: flex; flex-direction: column; gap: .5rem; }
    .items-header { display: flex; align-items: center; justify-content: space-between; }
    .item-row { display: flex; gap: .5rem; align-items: center; }
    .item-row .form-control { flex: 1; }
    .modal-actions-box { display: flex; justify-content: flex-end; gap: .75rem; padding-top: 1rem; border-top: 1px solid var(--border-light); }
    .detail-meta { display: flex; flex-direction: column; gap: .25rem; margin-bottom: 1rem; font-size: .85rem; }
  `]
})
export class ReceptionsComponent implements OnInit {
  private api = inject(ReceptionApiService);
  private suppliersApi = inject(SupplierApiService);
  private branchApi = inject(BranchApiService);
  private catalogApi = inject(CatalogApiService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);

  receptions = signal<Recepcion[]>([]);
  suppliers = signal<Proveedor[]>([]);
  branches = signal<Sucursal[]>([]);
  products = signal<Producto[]>([]);
  isLoading = signal(true);
  isLoadingProducts = signal(true);
  isSaving = signal(false);

  filteredProducts = computed(() => {
    const all = this.products();
    if (!this.formProveedorId) return all;
    const bySupplier = all.filter(p => p.proveedor_id === this.formProveedorId);
    // Si el proveedor aún no tiene productos asociados, mostrar todos para no bloquear
    return bySupplier.length > 0 ? bySupplier : all;
  });
  filterProveedorId: number | null = null;
  filterSucursalId: number | null = null;

  isCreateOpen = signal(false);
  isDetailOpen = signal(false);
  selected = signal<Recepcion | null>(null);

  formProveedorId: number | null = null;
  formSucursalId: number | null = null;
  formFactura = '';
  formObs = '';
  items = signal<ItemForm[]>([]);

  ngOnInit(): void {
    this.suppliersApi.getSuppliers(0, 100).subscribe({ next: s => this.suppliers.set(s || []) });
    this.branchApi.getBranches(0, 100).subscribe({ next: b => this.branches.set(b || []) });
    this.isLoadingProducts.set(true);
    this.catalogApi.getProducts(0, 500).subscribe({
      next: p => { this.products.set(p || []); this.isLoadingProducts.set(false); },
      error: () => this.isLoadingProducts.set(false)
    });
    this.route.queryParams.subscribe(q => {
      if (q['proveedorId']) this.filterProveedorId = Number(q['proveedorId']);
      this.loadReceptions();
    });
  }

  loadReceptions(): void {
    this.isLoading.set(true);
    this.api.getReceptions(0, 200, this.filterProveedorId || undefined, this.filterSucursalId || undefined).subscribe({
      next: r => { this.receptions.set(r || []); this.isLoading.set(false); },
      error: () => this.isLoading.set(false)
    });
  }

  openCreateModal(): void {
    this.formProveedorId = this.filterProveedorId;
    this.formSucursalId = this.filterSucursalId;
    this.formFactura = '';
    this.formObs = '';
    this.items.set([{ productoId: null, variantes: [], variante_producto_id: null, cantidad: 1, costo_unitario: null }]);
    this.isCreateOpen.set(true);
  }

  closeCreateModal(): void { this.isCreateOpen.set(false); }

  addItem(): void {
    this.items.update(l => [...l, { productoId: null, variantes: [], variante_producto_id: null, cantidad: 1, costo_unitario: null }]);
  }

  removeItem(i: number): void {
    this.items.update(l => l.filter((_, idx) => idx !== i));
  }

  variantLabel(v: VarianteProducto): string {
    const sku = v.sku_variante || ('#' + v.id);
    const talla = v.talla?.valor || v.talla?.nombre || '';
    const color = v.color?.nombre || '';
    const extra = [talla, color].filter(Boolean).join(' / ');
    return extra ? `${sku} — ${extra}` : sku;
  }

  onProductChange(it: ItemForm): void {
    if (!it.productoId) { it.variantes = []; it.variante_producto_id = null; return; }
    it.isLoadingVariantes = true;
    it.variante_producto_id = null;
    this.catalogApi.getProductVariants(it.productoId).subscribe({
      next: v => { it.variantes = v || []; it.isLoadingVariantes = false; },
      error: () => {
        it.variantes = [];
        it.isLoadingVariantes = false;
        this.toast.error('No se pudieron cargar las variantes del producto.');
      }
    });
  }

  canSave(): boolean {
    return !!this.formProveedorId && !!this.formSucursalId &&
      this.items().length > 0 &&
      this.items().every(i => !!i.variante_producto_id && (i.cantidad || 0) >= 1);
  }

  save(): void {
    if (!this.canSave() || this.isSaving()) return;
    this.isSaving.set(true);
    this.api.createReception({
      proveedor_id: this.formProveedorId!,
      sucursal_id: this.formSucursalId!,
      nro_factura: this.formFactura || undefined,
      observaciones: this.formObs || undefined,
      items: this.items().map(i => ({
        variante_producto_id: i.variante_producto_id!,
        cantidad: Number(i.cantidad),
        costo_unitario: i.costo_unitario != null ? Number(i.costo_unitario) : undefined
      }))
    }).subscribe({
      next: r => {
        this.toast.success(`Recepción ${r.numero} registrada: +${r.total_unidades} uds.`);
        this.isSaving.set(false);
        this.closeCreateModal();
        this.loadReceptions();
      },
      error: () => this.isSaving.set(false)
    });
  }

  openDetail(r: Recepcion): void { this.selected.set(r); this.isDetailOpen.set(true); }
  closeDetail(): void { this.isDetailOpen.set(false); this.selected.set(null); }
}
