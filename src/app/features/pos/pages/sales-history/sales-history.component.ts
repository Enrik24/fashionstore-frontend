import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PosService } from '../../../../core/services/pos.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { VentaPresencial } from '../../../../core/models/cart.model';
import { Sucursal } from '../../../../core/models/branch.model';

@Component({
  selector: 'app-sales-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="sales-history-container animate-fade-in">
      <!-- Header -->
      <div class="section-header">
        <div>
          <h2 class="section-title">
            <i class="ri-history-line"></i> Historial de Ventas Presenciales
          </h2>
          <p class="section-subtitle">Consulta y reimprime comprobantes de ventas en caja</p>
        </div>
        <div class="header-actions">
          <a routerLink="/pos" class="btn btn-accent">
            <i class="ri-computer-line"></i> Ir al POS
          </a>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-card card">
        <div class="filters-grid">
          <div class="filter-group">
            <label class="filter-label">Sucursal</label>
            <select class="form-control" [(ngModel)]="selectedBranchId" (change)="loadSales()">
              <option [ngValue]="null">Todas las sucursales</option>
              @for (branch of branches(); track branch.id) {
                <option [ngValue]="branch.id">{{ branch.nombre }}</option>
              }
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">Registros por página</label>
            <select class="form-control" [(ngModel)]="pageSize" (change)="loadSales()">
              <option [ngValue]="20">20</option>
              <option [ngValue]="50">50</option>
              <option [ngValue]="100">100</option>
            </select>
          </div>
          <div class="filter-actions">
            <button class="btn btn-secondary w-full" (click)="loadSales()">
              <i class="ri-refresh-line"></i> Actualizar
            </button>
          </div>
        </div>
      </div>

      <!-- Sales List -->
      @if (loading()) {
        <div class="loading-state card">
          <i class="ri-loader-4-line ri-spin"></i>
          <span>Cargando ventas...</span>
        </div>
      } @else {
        <div class="sales-list">
          @for (sale of sales(); track sale.id) {
            <div class="card sale-card">
              <div class="sale-header">
                <div class="sale-main-info">
                  <div class="sale-icon-box">
                    <i class="ri-store-2-fill"></i>
                  </div>
                  <div>
                    <div class="sale-id">Venta #{{ sale.id }}</div>
                    <div class="sale-date">
                      <i class="ri-calendar-line"></i> {{ sale.fecha | date:'dd/MM/yyyy HH:mm' }}
                    </div>
                    @if (sale.cajero_id) {
                      <div class="sale-cashier">
                        <i class="ri-user-line"></i> Cajero ID: {{ sale.cajero_id }}
                      </div>
                    }
                  </div>
                </div>

                <div class="sale-summary-meta">
                  <div class="sale-method">
                    <i class="ri-money-dollar-circle-line"></i>
                    <span>{{ formatPaymentMethod(sale.metodo_pago) }}</span>
                  </div>
                  <div class="sale-price">
                    <span class="price-label">Total:</span>
                    <span class="price-val">Bs. {{ (sale.orden?.total || 0) | number:'1.2-2' }}</span>
                  </div>
                  <button 
                    class="btn-expand" 
                    (click)="toggleSaleExpand(sale.id)"
                    [class.expanded]="expandedSales().has(sale.id)"
                  >
                    <i class="ri-arrow-down-s-line"></i>
                  </button>
                </div>
              </div>

              <!-- Expanded Details -->
              @if (expandedSales().has(sale.id)) {
                <div class="sale-body animate-fade-in">
                  <!-- Comprobante Info -->
                  @if (sale.orden?.comprobante) {
                    <div class="comprobante-box">
                      <div class="comprobante-info-grid">
                        <div class="comprobante-detail">
                          <i class="ri-file-text-line"></i>
                          <div>
                            <span class="comp-label">N° Comprobante</span>
                            <span class="comp-value">{{ sale.orden?.comprobante?.numero || 'N/A' }}</span>
                          </div>
                        </div>
                        <div class="comprobante-detail">
                          <i class="ri-bookmark-line"></i>
                          <div>
                            <span class="comp-label">Tipo</span>
                            <span class="comp-value">{{ sale.orden?.comprobante?.tipo || 'N/A' }}</span>
                          </div>
                        </div>
                        <div class="comprobante-detail">
                          <i class="ri-shopping-bag-line"></i>
                          <div>
                            <span class="comp-label">N° Orden</span>
                            <span class="comp-value">{{ sale.orden?.numero_orden || 'N/A' }}</span>
                          </div>
                        </div>
                      </div>
                      <button class="btn btn-primary btn-reprint" (click)="printReceipt(sale.id)">
                        <i class="ri-printer-line"></i> Reimprimir Comprobante
                      </button>
                    </div>
                  }

                  <!-- Order Items -->
                  @if (sale.orden && sale.orden.detalles && sale.orden.detalles.length > 0) {
                    <div class="items-section">
                      <h4 class="items-title">Productos vendidos</h4>
                      <div class="items-table">
                        @for (item of sale.orden!.detalles; track item.id) {
                          <div class="item-row">
                            <div class="item-info">
                              <span class="item-name">
                                {{ getItemName(item) }}
                              </span>
                              <div class="item-variants">
                                @if (getItemTalla(item)) {
                                  <span class="badge-sub">{{ getItemTalla(item) }}</span>
                                }
                                @if (getItemColor(item)) {
                                  <span class="badge-sub">{{ getItemColor(item) }}</span>
                                }
                              </div>
                            </div>
                            <div class="item-qty">x{{ item.cantidad }}</div>
                            <div class="item-price">
                              Bs. {{ item.subtotal | number:'1.2-2' }}
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- Totals -->
                  <div class="sale-totals">
                    @if (sale.orden && sale.orden.descuentos && sale.orden.descuentos > 0) {
                      <div class="total-line">
                        <span>Descuento:</span>
                        <span class="text-success">- Bs. {{ sale.orden!.descuentos | number:'1.2-2' }}</span>
                      </div>
                    }
                    <div class="total-line total-final">
                      <span>Total Cobrado:</span>
                      <span>Bs. {{ (sale.orden?.total || 0) | number:'1.2-2' }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          } @empty {
            <div class="card empty-card">
              <i class="ri-shopping-basket-line text-4xl text-muted mb-2"></i>
              <h3>No hay ventas registradas</h3>
              <p class="text-muted">Las ventas presenciales aparecerán aquí</p>
              <a routerLink="/pos" class="btn btn-primary mt-3">
                <i class="ri-computer-line"></i> Ir al POS
              </a>
            </div>
          }
        </div>

        <!-- Pagination Info -->
        @if (sales().length > 0) {
          <div class="pagination-info">
            Mostrando {{ sales().length }} ventas
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .sales-history-container { max-width: 1100px; margin: 0 auto; padding: 2rem 1rem; }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      gap: 1rem;
    }
    .section-title { 
      font-size: 1.75rem; 
      font-weight: 700; 
      color: #0f172a; 
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .section-subtitle { 
      font-size: 0.9375rem; 
      color: #64748b; 
      margin: 0.25rem 0 0 0; 
    }
    .header-actions { display: flex; gap: 0.75rem; }

    /* Filters */
    .filters-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      align-items: end;
    }
    .filter-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .filter-label { font-size: 0.8125rem; font-weight: 600; color: #475569; }
    .filter-actions { display: flex; align-items: flex-end; }

    /* Sales List */
    .sales-list { display: flex; flex-direction: column; gap: 1rem; }
    .sale-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      transition: box-shadow 0.2s;
    }
    .sale-card:hover { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }

    .sale-header {
      padding: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .sale-main-info { display: flex; align-items: center; gap: 1rem; }
    .sale-icon-box {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }
    .sale-id { font-weight: 700; font-size: 1.0625rem; color: #0f172a; }
    .sale-date, .sale-cashier { 
      font-size: 0.8125rem; 
      color: #64748b; 
      margin-top: 0.2rem; 
      display: flex; 
      align-items: center; 
      gap: 0.3rem; 
    }

    .sale-summary-meta { 
      display: flex; 
      align-items: center; 
      gap: 1.25rem; 
    }
    .sale-method {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.875rem;
      color: #475569;
      padding: 0.4rem 0.75rem;
      background: #f1f5f9;
      border-radius: 6px;
    }
    .sale-price { display: flex; flex-direction: column; align-items: flex-end; }
    .price-label { font-size: 0.75rem; color: #64748b; }
    .price-val { font-weight: 800; font-size: 1.125rem; color: #0f172a; }

    .btn-expand {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 1.25rem;
      color: #64748b;
    }
    .btn-expand:hover { background: #f8fafc; border-color: #cbd5e1; }
    .btn-expand.expanded i { transform: rotate(180deg); }
    .btn-expand i { transition: transform 0.2s; }

    /* Expanded Body */
    .sale-body {
      padding: 1.25rem;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }

    /* Comprobante Box */
    .comprobante-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 10px;
      padding: 1.25rem;
      margin-bottom: 1rem;
      color: white;
    }
    .comprobante-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .comprobante-detail {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .comprobante-detail i { font-size: 1.5rem; opacity: 0.9; }
    .comp-label {
      font-size: 0.7rem;
      opacity: 0.85;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: block;
    }
    .comp-value {
      font-weight: 700;
      font-size: 1rem;
      display: block;
      margin-top: 0.2rem;
    }
    .btn-reprint {
      background: white;
      color: #667eea;
      border: none;
      font-weight: 600;
      width: 100%;
    }
    .btn-reprint:hover {
      background: #f8fafc;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    /* Items Section */
    .items-section {
      background: white;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .items-title { 
      font-size: 0.875rem; 
      font-weight: 600; 
      color: #334155; 
      margin: 0 0 0.75rem 0; 
    }
    .item-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .item-row:last-child { border-bottom: none; }
    .item-info { flex: 1; }
    .item-name { font-weight: 600; font-size: 0.875rem; color: #0f172a; }
    .item-variants { display: flex; gap: 0.35rem; margin-top: 0.3rem; }
    .badge-sub { 
      font-size: 0.7rem; 
      background: #e2e8f0; 
      padding: 0.15rem 0.4rem; 
      border-radius: 4px; 
      color: #475569; 
    }
    .item-qty { font-size: 0.875rem; color: #64748b; font-weight: 500; }
    .item-price { font-weight: 700; font-size: 0.9375rem; color: #0f172a; }

    /* Totals */
    .sale-totals {
      background: white;
      border-radius: 8px;
      padding: 1rem;
    }
    .total-line {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      font-size: 0.9375rem;
    }
    .total-final {
      border-top: 2px solid #e2e8f0;
      margin-top: 0.5rem;
      padding-top: 0.75rem;
      font-weight: 700;
      font-size: 1.125rem;
      color: #0f172a;
    }

    /* States */
    .loading-state { 
      text-align: center; 
      padding: 3rem; 
      color: #64748b; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      gap: 0.75rem; 
    }
    .empty-card { 
      text-align: center; 
      padding: 4rem 1.5rem; 
      display: flex; 
      flex-direction: column; 
      align-items: center; 
    }

    .pagination-info {
      text-align: center;
      padding: 1rem;
      color: #64748b;
      font-size: 0.875rem;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .sale-header { flex-direction: column; align-items: flex-start; }
      .sale-summary-meta { width: 100%; justify-content: space-between; }
      .comprobante-info-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class SalesHistoryComponent implements OnInit {
  private posService = inject(PosService);
  private branchService = inject(BranchApiService);
  private toastService = inject(ToastService);

  sales = signal<VentaPresencial[]>([]);
  branches = signal<Sucursal[]>([]);
  loading = signal<boolean>(true);
  expandedSales = signal<Set<number>>(new Set());

  selectedBranchId: number | null = null;
  pageSize: number = 50;

  ngOnInit(): void {
    this.loadBranches();
    this.loadSales();
  }

  loadBranches(): void {
    this.branchService.getBranches().subscribe({
      next: (data) => this.branches.set(data),
      error: (err) => console.error('Error cargando sucursales:', err)
    });
  }

  loadSales(): void {
    this.loading.set(true);
    this.posService.getInPersonSales(
      0, 
      this.pageSize, 
      this.selectedBranchId || undefined
    ).subscribe({
      next: (data) => {
        this.sales.set(data || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando ventas:', err);
        this.toastService.error('Error al cargar el historial de ventas');
        this.loading.set(false);
      }
    });
  }

  toggleSaleExpand(id: number): void {
    this.expandedSales.update(set => {
      const copy = new Set(set);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  }

  printReceipt(saleId: number): void {
    const url = this.posService.getSalePdfUrl(saleId);
    window.open(url, '_blank');
  }

  formatPaymentMethod(method: string): string {
    const methods: Record<string, string> = {
      'EFECTIVO': 'Efectivo',
      'TARJETA_DEBITO': 'Tarjeta Débito',
      'TARJETA_CREDITO': 'Tarjeta Crédito',
      'TARJETA_POS': 'Tarjeta POS',
      'QR': 'Código QR'
    };
    return methods[method] || method;
  }

  getItemName(item: any): string {
    return item.variante_producto?.producto?.nombre || 'Prenda';
  }

  getItemTalla(item: any): string | null {
    return item.variante_producto?.talla?.valor || 
           item.variante_producto?.talla?.nombre || null;
  }

  getItemColor(item: any): string | null {
    return item.variante_producto?.color?.nombre || null;
  }
}
