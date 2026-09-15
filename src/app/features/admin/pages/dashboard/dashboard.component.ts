import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserApiService } from '../../../../core/services/user-api.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { CatalogApiService } from '../../../../core/services/catalog-api.service';
import { InventoryApiService } from '../../../../core/services/inventory-api.service';
import { SupplierApiService } from '../../../../core/services/supplier-api.service';
import { Inventario } from '../../../../core/models/inventory.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-container animate-fade-in">
      <!-- Welcome Header -->
      <div class="dashboard-header card glass">
        <div class="header-text">
          <h1 class="welcome-title">Panel de Control & Indicadores</h1>
          <p class="welcome-desc">Resumen operativo de FashionStore: usuarios, catálogo, sucursales y existencias de inventario.</p>
        </div>
        <div class="header-actions">
          <a routerLink="/admin/products" class="btn btn-accent btn-sm">
            <i class="ri-add-line"></i> Nuevo Producto
          </a>
          <a routerLink="/admin/inventory" class="btn btn-secondary btn-sm">
            <i class="ri-arrow-up-down-line"></i> Ajustar Stock
          </a>
        </div>
      </div>

      <!-- KPI Metrics Grid -->
      <div class="grid grid-cols-4 kpi-grid">
        <!-- Users Card -->
        <div class="kpi-card card">
          <div class="kpi-icon-box kpi-users">
            <i class="ri-user-settings-line"></i>
          </div>
          <div class="kpi-details">
            <span class="kpi-label">Total Usuarios</span>
            <h3 class="kpi-value">{{ totalUsers() }}</h3>
            <span class="kpi-subtext">Administradores, Cajeros y Clientes</span>
          </div>
        </div>

        <!-- Branches Card -->
        <div class="kpi-card card">
          <div class="kpi-icon-box kpi-branches">
            <i class="ri-store-3-line"></i>
          </div>
          <div class="kpi-details">
            <span class="kpi-label">Sucursales Activas</span>
            <h3 class="kpi-value">{{ totalBranches() }}</h3>
            <span class="kpi-subtext">Cochabamba, La Paz, Santa Cruz</span>
          </div>
        </div>

        <!-- Products Card -->
        <div class="kpi-card card">
          <div class="kpi-icon-box kpi-products">
            <i class="ri-t-shirt-2-line"></i>
          </div>
          <div class="kpi-details">
            <span class="kpi-label">Prendas en Catálogo</span>
            <h3 class="kpi-value">{{ totalProducts() }}</h3>
            <span class="kpi-subtext">Modelos y variantes activas</span>
          </div>
        </div>

        <!-- Stock Alerts Card -->
        <div class="kpi-card card" [class.alert-border]="stockAlerts().length > 0">
          <div class="kpi-icon-box kpi-alerts">
            <i class="ri-alert-line"></i>
          </div>
          <div class="kpi-details">
            <span class="kpi-label">Alertas de Stock</span>
            <h3 class="kpi-value text-error">{{ stockAlerts().length }}</h3>
            <span class="kpi-subtext">Ítems por debajo del stock mínimo</span>
          </div>
        </div>
      </div>

      <!-- Stock Alerts / Warnings Panel -->
      <div class="card dashboard-alerts-card">
        <div class="card-header-flex">
          <h3 class="card-title"><i class="ri-alarm-warning-line text-warning"></i> Alertas y Monitoreo de Stock</h3>
          <a routerLink="/admin/inventory" class="btn btn-outline btn-sm">Ver Todo el Stock</a>
        </div>

        @if (isLoading()) {
          <div class="empty-state-box">
            <i class="ri-loader-4-line spin-icon"></i>
            <p>Consultando estado de inventario...</p>
          </div>
        } @else if (stockAlerts().length === 0) {
          <div class="empty-state-box">
            <div class="success-icon-box"><i class="ri-checkbox-circle-fill"></i></div>
            <h4>Niveles de inventario óptimos</h4>
            <p class="text-muted">No existen variantes de productos por debajo del stock de seguridad mínimo en este momento.</p>
          </div>
        } @else {
          <div class="alerts-list">
            @for (alert of stockAlerts(); track alert.id) {
              <div class="alert-item">
                <div class="alert-item-icon">
                  <i class="ri-alert-fill"></i>
                </div>
                <div class="alert-item-content">
                  <span class="alert-title">{{ alert.variante_producto?.producto?.nombre || 'Variante #' + alert.variante_producto_id }}</span>
                  <span class="alert-desc">Sucursal: {{ alert.sucursal?.nombre || 'Sucursal #' + alert.sucursal_id }} | Stock Actual: <strong>{{ alert.cantidad }}</strong> (Mínimo: {{ alert.stock_minimo }})</span>
                </div>
                <a routerLink="/admin/inventory" class="btn btn-danger btn-sm">
                  Reabastecer
                </a>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .dashboard-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem 2rem;
    }

    .welcome-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--primary);
      margin-bottom: 0.25rem;
    }

    .welcome-desc {
      font-size: 0.875rem;
      color: var(--text-muted);
      max-width: 650px;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    /* KPI Grid */
    .kpi-grid {
      gap: 1.25rem;
    }

    .kpi-card {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding: 1.25rem 1.5rem;

      &.alert-border {
        border-left: 4px solid var(--error);
      }
    }

    .kpi-icon-box {
      width: 50px;
      height: 50px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      flex-shrink: 0;

      &.kpi-users { background: rgba(59, 130, 246, 0.1); color: var(--info); }
      &.kpi-branches { background: rgba(16, 185, 129, 0.1); color: var(--success); }
      &.kpi-products { background: rgba(225, 29, 72, 0.1); color: var(--accent); }
      &.kpi-alerts { background: rgba(239, 68, 68, 0.1); color: var(--error); }
    }

    .kpi-details {
      display: flex;
      flex-direction: column;
    }

    .kpi-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .kpi-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--primary);
      line-height: 1.2;
    }

    .kpi-subtext {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    .card-header-flex {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border-light);
    }

    .card-title {
      font-size: 1.1rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .empty-state-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1.5rem;
      text-align: center;
      gap: 0.75rem;
    }

    .success-icon-box {
      font-size: 3rem;
      color: var(--success);
    }

    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .alert-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem 1rem;
      border-radius: var(--radius-md);
      background: var(--error-bg);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .alert-item-icon {
      font-size: 1.25rem;
      color: var(--error);
      margin-right: 0.75rem;
    }

    .alert-item-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .alert-title {
      font-weight: 700;
      font-size: 0.875rem;
      color: var(--primary);
    }

    .alert-desc {
      font-size: 0.75rem;
      color: var(--secondary);
    }

    .spin-icon {
      font-size: 2rem;
      color: var(--accent);
      animation: spin 1s linear infinite;
    }

    @media (max-width: 1024px) {
      .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .dashboard-details-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 576px) {
      .dashboard-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
      .kpi-grid {
        grid-template-columns: 1fr;
      }
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private userApi = inject(UserApiService);
  private branchApi = inject(BranchApiService);
  private catalogApi = inject(CatalogApiService);
  private inventoryApi = inject(InventoryApiService);

  public totalUsers = signal<number>(0);
  public totalBranches = signal<number>(0);
  public totalProducts = signal<number>(0);
  public stockAlerts = signal<Inventario[]>([]);
  public isLoading = signal<boolean>(true);

  ngOnInit(): void {
    this.loadMetrics();
  }

  private loadMetrics(): void {
    this.isLoading.set(true);

    this.userApi.getUsers(0, 100).subscribe({
      next: (users) => this.totalUsers.set(users.length),
      error: () => {}
    });

    this.branchApi.getBranches(0, 100).subscribe({
      next: (branches) => this.totalBranches.set(branches.length),
      error: () => {}
    });

    this.catalogApi.getProducts(0, 100).subscribe({
      next: (products) => this.totalProducts.set(products.length),
      error: () => {}
    });

    this.inventoryApi.getStockAlerts().subscribe({
      next: (alerts) => {
        this.stockAlerts.set(alerts);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }
}
