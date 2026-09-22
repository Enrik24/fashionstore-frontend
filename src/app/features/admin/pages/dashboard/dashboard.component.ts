import { Component, OnInit, OnDestroy, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { DashboardService, DashboardVm } from '../../../../core/services/dashboard.service';
import { ToastService } from '../../../../core/services/toast.service';
import { DashboardFilters, KpiConfig, RangePreset, WidgetStatus } from '../../../../core/models/dashboard.model';
import { Sucursal } from '../../../../core/models/branch.model';
import { KpiCardComponent } from '../../../../shared/components/kpi-card/kpi-card.component';
import { ChartCardComponent } from '../../../../shared/components/chart-card/chart-card.component';
import { DashboardFiltersComponent } from '../../../../shared/components/dashboard-filters/dashboard-filters.component';
import { rangeFor } from '../../../../core/utils/date-range.util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, KpiCardComponent, ChartCardComponent, DashboardFiltersComponent],
  providers: [provideCharts(withDefaultRegisterables())],
  template: `
    <div class="dashboard-container animate-fade-in" [class.tv-mode]="tvMode()">
      <div class="dashboard-header card glass">
        <div class="header-text">
          <h1 class="welcome-title">Panel de Control & Indicadores</h1>
          <p class="welcome-desc">Resumen ejecutivo FashionStore: ventas, inventario, reservas y clientes. Las alertas de stock llegan por la campana superior.</p>
        </div>
        <div class="header-actions">
          <a routerLink="/admin/products" class="btn btn-accent btn-sm"><i class="ri-add-line"></i> Nuevo Producto</a>
          <a routerLink="/admin/inventory" class="btn btn-secondary btn-sm"><i class="ri-arrow-up-down-line"></i> Ajustar Stock</a>
          <a routerLink="/admin/reports" class="btn btn-outline btn-sm"><i class="ri-bar-chart-line"></i> Reportes</a>
        </div>
      </div>

      <div class="dashboard-meta">
        <span><i class="ri-refresh-line"></i> Actualizado {{ lastUpdatedLabel() }}</span>
        <span class="range">{{ filters().fechaInicio }} → {{ filters().fechaFin }}</span>
        <select class="form-control refresh-sel" [(ngModel)]="refreshOpt" (change)="applyRefresh()" aria-label="Auto-refresh">
          <option value="0">Sin auto-refresh</option>
          <option value="30000">Cada 30 s</option>
          <option value="60000">Cada 1 min</option>
          <option value="300000">Cada 5 min</option>
        </select>
        <button class="btn btn-outline btn-sm" (click)="loadDashboard()">Refrescar</button>
        <button class="btn btn-outline btn-sm" (click)="toggleTv()">{{ tvMode() ? 'Salir TV' : 'Modo TV' }}</button>
        <button class="btn btn-outline btn-sm" (click)="print()"><i class="ri-printer-line"></i> PDF</button>
        <button class="btn btn-outline btn-sm" (click)="snapshot()">Guardar snapshot</button>
      </div>

      <app-dashboard-filters [value]="filters()" [sucursales]="sucursales()" (changed)="onFilters($event)" />

      @if (score()) {
        <div class="card score-card" [ngClass]="'tone-' + score()!.tono">
          <strong>Salud del negocio: {{ score()!.valor }}/100 — {{ score()!.etiqueta }}</strong>
          <span class="hint" title="40% ventas (Δ%), 25% reservas, 20% cobertura stock, 15% clientes activos">Ponderado K04/K06/K13/K10</span>
        </div>
      }

      <section class="grid grid-cols-4 kpi-grid" aria-live="polite">
        @if (loading()) {
          @for (i of [1,2,3,4,5,6,7,8]; track i) { <div class="kpi-skeleton"></div> }
        } @else {
          @for (kpi of kpiCards(); track kpi.id) { <app-kpi-card [kpi]="kpi" /> }
        }
      </section>

      @if (globalError()) {
        <div class="card error-banner" role="alert">
          <i class="ri-error-warning-line"></i> {{ globalError() }}
          <button class="btn btn-outline btn-sm" (click)="loadDashboard()">Reintentar</button>
        </div>
      }

      <section class="grid grid-cols-2 dashboard-charts">
        <app-chart-card title="Comparativa de períodos" icon="ri-line-chart-line" [type]="vm()?.comparativa?.type ?? 'bar'"
          [data]="vm()?.comparativa?.data ?? {labels:[],datasets:[]}" [options]="vm()?.comparativa?.options ?? {}"
          [status]="chartStatus('ventas')" (retry)="loadDashboard()" />
        <app-chart-card title="Top productos más vendidos" icon="ri-trophy-line" [type]="vm()?.topProductos?.type ?? 'bar'"
          [data]="vm()?.topProductos?.data ?? {labels:[],datasets:[]}" [options]="vm()?.topProductos?.options ?? {}"
          [status]="chartStatus('ventas')" (retry)="loadDashboard()" />
      </section>
      <section class="grid grid-cols-3 dashboard-charts">
        <app-chart-card title="Mix de canal" icon="ri-pie-chart-line" [type]="'doughnut'"
          [data]="vm()?.mixCanal?.data ?? {labels:[],datasets:[]}" [options]="vm()?.mixCanal?.options ?? {}"
          [status]="chartStatus('ventas')" (retry)="loadDashboard()" />
        <app-chart-card title="Reservas por estado" icon="ri-calendar-check-line" [type]="'bar'"
          [data]="vm()?.reservasPorEstado?.data ?? {labels:[],datasets:[]}" [options]="vm()?.reservasPorEstado?.options ?? {}"
          [status]="chartStatus('reservas')" (retry)="loadDashboard()" />
        <app-chart-card title="Stock crítico (actual vs mínimo)" icon="ri-alert-line" [type]="'bar'"
          [data]="vm()?.stockCritico?.data ?? {labels:[],datasets:[]}" [options]="vm()?.stockCritico?.options ?? {}"
          [status]="chartStatus('inventario')" (retry)="loadDashboard()" />
      </section>
    </div>
  `,
  styles: [`
    .dashboard-container { display: flex; flex-direction: column; gap: 1.25rem; }
    .dashboard-header { display: flex; align-items: center; justify-content: space-between; padding: 1.5rem 2rem; }
    .welcome-title { font-size: 1.5rem; font-weight: 800; color: var(--primary); margin-bottom: .25rem; }
    .welcome-desc { font-size: .875rem; color: var(--text-muted); max-width: 700px; }
    .header-actions { display: flex; gap: .5rem; flex-wrap: wrap; }
    .dashboard-meta { display: flex; align-items: center; gap: .75rem; font-size: .8rem; color: var(--text-muted); flex-wrap: wrap; }
    .range { font-weight: 600; color: var(--primary); }
    .refresh-sel { width: auto; }
    .kpi-grid { gap: 1.25rem; }
    .kpi-skeleton { height: 110px; border-radius: var(--radius-md); background: linear-gradient(90deg, var(--border-light) 25%, #e9eef5 37%, var(--border-light) 63%); background-size: 400% 100%; animation: shimmer 1.4s ease infinite; }
    @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
    .dashboard-charts { gap: 1.25rem; }
    .score-card { padding: 1rem 1.25rem; display: flex; gap: 1rem; align-items: center; }
    .tone-success { border-left: 4px solid var(--success); } .tone-warning { border-left: 4px solid var(--warning); } .tone-error { border-left: 4px solid var(--error); }
    .hint { font-size: .75rem; color: var(--text-muted); }
    .error-banner { padding: 1rem 1.25rem; display: flex; gap: .75rem; align-items: center; border-left: 4px solid var(--error); }
    .tv-mode .kpi-grid { grid-template-columns: repeat(6, 1fr); }
    .tv-mode app-dashboard-filters, .tv-mode .header-actions { display: none; }
    @media (max-width: 1024px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } .dashboard-charts { grid-template-columns: 1fr; } }
    @media (max-width: 576px) { .dashboard-header { flex-direction: column; align-items: flex-start; gap: 1rem; } .kpi-grid { grid-template-columns: 1fr; } }
    @media print { .dashboard-meta, .header-actions, app-dashboard-filters { display: none !important; } .dashboard-container { gap: .75rem; } }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private dashboardSvc = inject(DashboardService);
  private branchApi = inject(BranchApiService);
  private reports = inject(ReportsService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  readonly filters = signal<DashboardFilters>({ preset: '30d', ...rangeFor('30d'), comparar: true });
  readonly sucursales = signal<Sucursal[]>([]);
  readonly vm = signal<DashboardVm | null>(null);
  readonly loading = signal(true);
  readonly globalError = signal('');
  readonly lastUpdated = signal<Date | null>(null);
  readonly tvMode = signal(false);
  readonly refreshOpt: number = 300000;
  private timer: any = null;

  readonly kpiCards = computed<KpiConfig[]>(() => this.vm()?.kpiCards ?? []);
  readonly score = computed(() => this.vm()?.score ?? null);
  readonly lastUpdatedLabel = computed(() => {
    const d = this.lastUpdated();
    if (!d) return 'nunca';
    const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
    return mins < 1 ? 'ahora mismo' : `hace ${mins} min`;
  });

  ngOnInit(): void {
    this.branchApi.getBranches(0, 500).subscribe({ next: s => this.sucursales.set(s ?? []), error: () => {} });
    this.loadDashboard();
    this.startAutoRefresh(this.refreshOpt);
    this.destroyRef.onDestroy(() => clearInterval(this.timer));
  }

  ngOnDestroy(): void { clearInterval(this.timer); }

  onFilters(f: DashboardFilters): void {
    const days = Math.round((new Date(f.fechaFin).getTime() - new Date(f.fechaInicio).getTime()) / 86400000) + 1;
    if (days > 366) { this.toast.warning('Rango limitado a 366 días', 'Filtros'); return; }
    this.filters.set(f);
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.globalError.set('');
    this.dashboardSvc.getDashboardBundle(this.filters()).subscribe({
      next: (vm) => {
        this.vm.set(vm);
        this.loading.set(false);
        this.lastUpdated.set(new Date());
        if (Object.values(vm.estado).includes('error')) this.toast.warning('Algunos indicadores no cargaron', 'Dashboard parcial');
      },
      error: () => { this.loading.set(false); this.globalError.set('No se pudo cargar el dashboard.'); this.toast.error('Dashboard no disponible', 'Error'); }
    });
  }

  chartStatus(key: string): 'loading' | 'success' | 'empty' | 'error' {
    if (this.loading()) return 'loading';
    const st = this.vm()?.estado[key] ?? 'success';
    if (st === 'error') return 'error';
    if (st === 'empty') return 'empty';
    const dataLen = key === 'reservas'
      ? (this.vm()?.reservasPorEstado?.data.datasets[0]?.data.length ?? 1)
      : key === 'inventario'
        ? (this.vm()?.stockCritico?.data.datasets[0]?.data.length ?? 1)
        : 1;
    if (dataLen === 0) return 'empty';
    return 'success';
  }

  applyRefresh(): void {
    const ms = Number((document.querySelector('.refresh-sel') as HTMLSelectElement)?.value ?? 0);
    this.startAutoRefresh(ms);
    try { localStorage.setItem('fs_dashboard_refresh', String(ms)); } catch { /* noop */ }
  }

  private startAutoRefresh(ms: number): void {
    clearInterval(this.timer);
    if (!ms) return;
    this.timer = setInterval(() => { if (!document.hidden) this.loadDashboard(); }, ms);
  }

  toggleTv(): void {
    this.tvMode.update(v => !v);
    try {
      if (this.tvMode()) document.documentElement.requestFullscreen?.().catch(() => {});
      else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    } catch { /* noop */ }
  }

  print(): void { window.print(); }

  snapshot(): void {
    const f = this.filters();
    this.reports.saveSnapshot(`Snapshot dashboard ${f.fechaInicio}→${f.fechaFin}`, 'VENTAS',
      { fechaInicio: f.fechaInicio, fechaFin: f.fechaFin, sucursalId: f.sucursalId }).subscribe({
      next: () => this.toast.success('Snapshot guardado en /admin/reports', 'Dashboard'),
      error: () => this.toast.error('No se pudo guardar', 'Snapshot')
    });
  }
}
