import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../../core/services/order.service';
import { PosService } from '../../../../core/services/pos.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Orden, VentaPresencial } from '../../../../core/models/cart.model';
import { Sucursal } from '../../../../core/models/branch.model';

type CanalVenta = 'online' | 'presencial';
/** Estados que cuentan como venta realizada (pagada y no cancelada). */
const ESTADOS_REALIZADA = ['PAGADO', 'EN_PROCESO', 'ENVIADO', 'ENTREGADO'];

@Component({
  selector: 'app-admin-sales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container animate-fade-in">
      <div class="page-header-card card">
        <div class="page-header-info">
          <div class="page-header-icon"><i class="ri-shopping-bag-3-line"></i></div>
          <div>
            <h1 class="page-title">Ventas Realizadas</h1>
            <p class="page-subtitle">Consulta de ventas online y presenciales. Vista de solo lectura.</p>
          </div>
        </div>
      </div>

      <div class="attr-tabs-container card">
        <div class="attr-tabs">
          <button class="attr-tab" [class.active]="canal() === 'online'" (click)="setCanal('online')">
            <i class="ri-global-line"></i><span>Ventas Online</span>
            <span class="tab-count">{{ ordenesOnline().length }}</span>
          </button>
          <button class="attr-tab" [class.active]="canal() === 'presencial'" (click)="setCanal('presencial')">
            <i class="ri-store-2-line"></i><span>Ventas Presenciales</span>
            <span class="tab-count">{{ ventasPresenciales().length }}</span>
          </button>
        </div>
      </div>

      <div class="kpi-row">
        <div class="card kpi-card">
          <span class="kpi-label">{{ canal() === 'online' ? 'Órdenes realizadas' : 'Ventas en caja' }}</span>
          <span class="kpi-value">{{ resumen().count }}</span>
        </div>
        <div class="card kpi-card">
          <span class="kpi-label">Monto total (Bs)</span>
          <span class="kpi-value">{{ resumen().total | number:'1.2-2' }}</span>
        </div>
      </div>

      <div class="card filters-card">
        <input type="text" class="form-control" [(ngModel)]="busqueda" (ngModelChange)="pagina.set(1)"
          [placeholder]="canal() === 'online' ? 'Buscar por N° de orden...' : 'Buscar por N° de orden o NIT/CI...'" />
        <select class="form-control" [(ngModel)]="filtroSucursal" (ngModelChange)="pagina.set(1)">
          <option [ngValue]="null">Todas las sucursales</option>
          @for (s of sucursales(); track s.id) { <option [ngValue]="s.id">{{ s.nombre }}</option> }
        </select>
        @if (canal() === 'online') {
          <select class="form-control" [(ngModel)]="filtroEstado" (ngModelChange)="pagina.set(1)">
            <option value="REALIZADAS">Solo realizadas</option>
            <option value="TODAS">Todas (incl. pendientes/canceladas)</option>
            <option value="PENDIENTE_PAGO">Pendientes de pago</option>
            <option value="CANCELADO">Canceladas</option>
          </select>
        }
      </div>

      @if (isLoading()) {
        <div class="card loading-box"><i class="ri-loader-4-line spin"></i> Cargando ventas...</div>
      } @else if (canal() === 'online') {
        <div class="card table-card">
          <table class="data-table">
            <thead><tr><th>N° Orden</th><th>Fecha</th><th>Sucursal</th><th>Estado</th><th class="num">Total</th><th></th></tr></thead>
            <tbody>
              @for (o of paginaOnline(); track o.id) {
                <tr>
                  <td class="mono">{{ o.numero_orden }}</td>
                  <td>{{ o.fecha | date:'short' }}</td>
                  <td>{{ nombreSucursal(o.sucursal_id) }}</td>
                  <td><span class="badge" [class]="estadoClass(o.estado)">{{ o.estado }}</span></td>
                  <td class="num">Bs {{ o.total | number:'1.2-2' }}</td>
                  <td><button class="btn-icon-view" (click)="verDetalle(o)" title="Ver detalle"><i class="ri-eye-line"></i></button></td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="empty-cell">No hay ventas online realizadas con los filtros aplicados.</td></tr>
              }
            </tbody>
          </table>
          <div class="pager">
            <button class="btn btn-sm" [disabled]="pagina() === 1" (click)="paginaAnterior()">← Anterior</button>
            <span>Página {{ pagina() }} de {{ totalPaginasOnline() }}</span>
            <button class="btn btn-sm" [disabled]="pagina() >= totalPaginasOnline()" (click)="paginaSiguiente()">Siguiente →</button>
          </div>
        </div>
      } @else {
        <div class="card table-card">
          <table class="data-table">
            <thead><tr><th># Venta</th><th>Fecha</th><th>Sucursal</th><th>Método pago</th><th class="num">Total</th><th></th></tr></thead>
            <tbody>
              @for (v of paginaPresencial(); track v.id) {
                <tr>
                  <td class="mono">#{{ v.id }} <span class="muted">({{ v.orden?.numero_orden }})</span></td>
                  <td>{{ v.fecha | date:'short' }}</td>
                  <td>{{ nombreSucursal(v.sucursal_id) }}</td>
                  <td><span class="badge badge-info">{{ v.metodo_pago }}</span></td>
                  <td class="num">Bs {{ (v.orden?.total ?? 0) | number:'1.2-2' }}</td>
                  <td>
                    <button class="btn-icon-view" (click)="verDetallePresencial(v)" title="Ver detalle"><i class="ri-eye-line"></i></button>
                    <a class="btn-icon-view" [href]="posService.getSalePdfUrl(v.id)" target="_blank" title="Comprobante PDF"><i class="ri-file-pdf-2-line"></i></a>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="empty-cell">No hay ventas presenciales con los filtros aplicados.</td></tr>
              }
            </tbody>
          </table>
          <div class="pager">
            <button class="btn btn-sm" [disabled]="pagina() === 1" (click)="paginaAnterior()">← Anterior</button>
            <span>Página {{ pagina() }} de {{ totalPaginasPresencial() }}</span>
            <button class="btn btn-sm" [disabled]="pagina() >= totalPaginasPresencial()" (click)="paginaSiguiente()">Siguiente →</button>
          </div>
        </div>
      }

      @if (detalleOrden()) {
        <div class="modal-backdrop" (click)="detalleOrden.set(null)">
          <div class="modal-card card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Orden {{ detalleOrden()?.numero_orden }}</h3>
              <button class="btn-icon-danger" (click)="detalleOrden.set(null)"><i class="ri-close-line"></i></button>
            </div>
            <div class="modal-meta">
              <span><strong>Estado:</strong> {{ detalleOrden()?.estado }}</span>
              <span><strong>Fecha:</strong> {{ detalleOrden()?.fecha | date:'medium' }}</span>
              @if (detalleOrden()?.direccion_envio) { <span><strong>Envío:</strong> {{ detalleOrden()?.direccion_envio }}</span> }
            </div>
            <table class="data-table">
              <thead><tr><th>Producto</th><th>Talla</th><th>Color</th><th class="num">Cant.</th><th class="num">P. Unit.</th><th class="num">Subtotal</th></tr></thead>
              <tbody>
                @for (d of detalleOrden()?.detalles ?? []; track d.id) {
                  <tr>
                    <td>{{ d.variante_producto?.producto?.nombre || ('Variante #' + d.variante_producto_id) }}</td>
                    <td>{{ d.variante_producto?.talla?.valor || d.variante_producto?.talla?.nombre || '—' }}</td>
                    <td>{{ d.variante_producto?.color?.nombre || '—' }}</td>
                    <td class="num">{{ d.cantidad }}</td>
                    <td class="num">Bs {{ d.precio_unitario | number:'1.2-2' }}</td>
                    <td class="num">Bs {{ d.subtotal | number:'1.2-2' }}</td>
                  </tr>
                }
              </tbody>
            </table>
            <div class="modal-total">Total: Bs {{ (detalleOrden()?.total ?? 0) | number:'1.2-2' }}</div>
          </div>
        </div>
      }

      @if (detalleVenta()) {
        <div class="modal-backdrop" (click)="detalleVenta.set(null)">
          <div class="modal-card card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Venta presencial #{{ detalleVenta()?.id }}</h3>
              <button class="btn-icon-danger" (click)="detalleVenta.set(null)"><i class="ri-close-line"></i></button>
            </div>
            <div class="modal-meta">
              <span><strong>Pago:</strong> {{ detalleVenta()?.metodo_pago }}</span>
              <span><strong>Fecha:</strong> {{ detalleVenta()?.fecha | date:'medium' }}</span>
              <span><strong>Sucursal:</strong> {{ nombreSucursal(detalleVenta()?.sucursal_id) }}</span>
            </div>
            <table class="data-table">
              <thead><tr><th>Producto</th><th>Talla</th><th>Color</th><th class="num">Cant.</th><th class="num">P. Unit.</th><th class="num">Subtotal</th></tr></thead>
              <tbody>
                @for (d of detalleVenta()?.orden?.detalles ?? []; track d.id) {
                  <tr>
                    <td>{{ d.variante_producto?.producto?.nombre || ('Variante #' + d.variante_producto_id) }}</td>
                    <td>{{ d.variante_producto?.talla?.valor || d.variante_producto?.talla?.nombre || '—' }}</td>
                    <td>{{ d.variante_producto?.color?.nombre || '—' }}</td>
                    <td class="num">{{ d.cantidad }}</td>
                    <td class="num">Bs {{ d.precio_unitario | number:'1.2-2' }}</td>
                    <td class="num">Bs {{ d.subtotal | number:'1.2-2' }}</td>
                  </tr>
                }
              </tbody>
            </table>
            <div class="modal-total">Total: Bs {{ (detalleVenta()?.orden?.total ?? 0) | number:'1.2-2' }}</div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-header-card { padding: 1.25rem 1.5rem; margin-bottom: 1rem; }
    .page-header-info { display: flex; align-items: center; gap: 1rem; }
    .page-header-icon { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #0ea5e9, #0369a1); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; color: #fff; }
    .page-title { font-size: 1.25rem; font-weight: 700; margin: 0; }
    .page-subtitle { font-size: 0.82rem; color: #64748b; margin: 0.15rem 0 0; }
    .attr-tabs-container { padding: 0.5rem 0.75rem; margin-bottom: 1rem; }
    .attr-tabs { display: flex; gap: 0.25rem; }
    .attr-tab { display: flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1rem; border-radius: 8px; border: none; background: transparent; color: #64748b; font-size: 0.85rem; font-weight: 500; cursor: pointer; }
    .attr-tab.active { background: rgba(14,165,233,0.12); color: #0284c7; font-weight: 600; }
    .tab-count { background: rgba(0,0,0,0.06); border-radius: 99px; font-size: 0.72rem; padding: 0.1rem 0.45rem; font-weight: 600; }
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
    .kpi-card { padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.25rem; }
    .kpi-label { font-size: 0.78rem; color: #64748b; font-weight: 600; }
    .kpi-value { font-size: 1.5rem; font-weight: 800; }
    .filters-card { padding: 1rem 1.25rem; margin-bottom: 1rem; display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .filters-card .form-control { flex: 1; min-width: 180px; }
    .table-card { padding: 0.5rem 0; overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .data-table th, .data-table td { padding: 0.65rem 1rem; text-align: left; border-bottom: 1px solid #f1f5f9; }
    .data-table th { color: #64748b; font-size: 0.75rem; text-transform: uppercase; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .mono { font-family: monospace; font-size: 0.8rem; }
    .muted { color: #94a3b8; font-size: 0.75rem; }
    .empty-cell { text-align: center; padding: 2rem; color: #64748b; }
    .loading-box { padding: 2.5rem; text-align: center; color: #64748b; }
    .badge { padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.72rem; font-weight: 700; background: #f1f5f9; color: #475569; }
    .badge-ok { background: rgba(16,185,129,0.12); color: #059669; }
    .badge-warn { background: rgba(245,158,11,0.12); color: #d97706; }
    .badge-bad { background: rgba(239,68,68,0.12); color: #dc2626; }
    .badge-info { background: rgba(14,165,233,0.12); color: #0284c7; }
    .btn-icon-view { background: rgba(14,165,233,0.1); border: 1px solid rgba(14,165,233,0.2); color: #0284c7; border-radius: 6px; padding: 0.3rem 0.5rem; font-size: 0.85rem; cursor: pointer; text-decoration: none; display: inline-block; margin-right: 0.25rem; }
    .btn-icon-danger { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #f87171; border-radius: 6px; padding: 0.3rem 0.5rem; cursor: pointer; }
    .pager { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 0.75rem; font-size: 0.82rem; color: #64748b; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
    .modal-card { max-width: 720px; width: 100%; max-height: 85vh; overflow-y: auto; padding: 1.5rem; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .modal-header h3 { margin: 0; font-size: 1.1rem; }
    .modal-meta { display: flex; gap: 1.25rem; flex-wrap: wrap; font-size: 0.82rem; color: #475569; margin-bottom: 1rem; }
    .modal-total { text-align: right; font-weight: 800; font-size: 1.05rem; margin-top: 1rem; }
    .spin { animation: spin 1s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class SalesComponent implements OnInit {
  private orderService = inject(OrderService);
  public posService = inject(PosService);
  private branchApi = inject(BranchApiService);
  private toast = inject(ToastService);

  canal = signal<CanalVenta>('online');
  isLoading = signal(true);
  ordenes = signal<Orden[]>([]);
  ventasPresenciales = signal<VentaPresencial[]>([]);
  sucursales = signal<Sucursal[]>([]);
  busqueda = '';
  filtroSucursal: number | null = null;
  filtroEstado = 'REALIZADAS';
  pagina = signal(1);
  readonly pageSize = 15;
  detalleOrden = signal<Orden | null>(null);
  detalleVenta = signal<VentaPresencial | null>(null);

  /** Solo órdenes DIGITAL (las PRESENCIALES se ven en la otra pestaña con su detalle de caja). */
  ordenesOnline = computed(() => this.ordenes().filter(o => (o.tipo as string) !== 'PRESENCIAL'));

  filtradasOnline = computed(() => {
    const q = this.busqueda.trim().toLowerCase();
    return this.ordenesOnline().filter(o => {
      if (this.filtroEstado === 'REALIZADAS' && !ESTADOS_REALIZADA.includes(o.estado as string)) return false;
      if (this.filtroEstado !== 'REALIZADAS' && this.filtroEstado !== 'TODAS' && (o.estado as string) !== this.filtroEstado) return false;
      if (this.filtroSucursal && o.sucursal_id !== this.filtroSucursal) return false;
      if (q && !(o.numero_orden || '').toLowerCase().includes(q)) return false;
      return true;
    });
  });

  filtradasPresencial = computed(() => {
    const q = this.busqueda.trim().toLowerCase();
    return this.ventasPresenciales().filter(v => {
      if (this.filtroSucursal && v.sucursal_id !== this.filtroSucursal) return false;
      if (q && !((v.orden?.numero_orden || '').toLowerCase().includes(q) || String(v.id).includes(q))) return false;
      return true;
    });
  });

  totalPaginasOnline = computed(() => Math.max(1, Math.ceil(this.filtradasOnline().length / this.pageSize)));
  totalPaginasPresencial = computed(() => Math.max(1, Math.ceil(this.filtradasPresencial().length / this.pageSize)));
  paginaOnline = computed(() => this.filtradasOnline().slice((this.pagina() - 1) * this.pageSize, this.pagina() * this.pageSize));
  paginaPresencial = computed(() => this.filtradasPresencial().slice((this.pagina() - 1) * this.pageSize, this.pagina() * this.pageSize));

  resumen = computed(() => {
    const list = this.canal() === 'online' ? this.filtradasOnline() : this.filtradasPresencial();
    const total = list.reduce((acc: number, it: any) => acc + Number(it?.total ?? it?.orden?.total ?? 0), 0);
    return { count: list.length, total };
  });

  ngOnInit(): void {
    this.branchApi.getBranches(0, 500).subscribe({ next: d => this.sucursales.set(d || []), error: () => undefined });
    this.orderService.listAllOrders(0, 50).subscribe({
      next: d => { this.ordenes.set(d || []); this.checkDone(); },
      error: (err) => { this.toast.show(err.error?.detail || 'Error al cargar órdenes', 'error'); this.checkDone(); }
    });
    this.posService.getInPersonSales(0, 100).subscribe({
      next: d => { this.ventasPresenciales.set(d || []); this.checkDone(); },
      error: () => this.checkDone()
    });
  }

  private loaded = 0;
  private checkDone(): void {
    this.loaded++;
    if (this.loaded >= 2) this.isLoading.set(false);
  }

  setCanal(c: CanalVenta): void {
    this.canal.set(c);
    this.pagina.set(1);
    this.busqueda = '';
  }

  paginaAnterior(): void {
    this.pagina.update(p => p - 1);
  }

  paginaSiguiente(): void {
    this.pagina.update(p => p + 1);
  }

  nombreSucursal(id?: number | null): string {
    if (!id) return '—';
    return this.sucursales().find(s => s.id === id)?.nombre || `Sucursal #${id}`;
  }

  estadoClass(estado: string): string {
    if (ESTADOS_REALIZADA.includes(estado)) return 'badge badge-ok';
    if (estado === 'CANCELADO') return 'badge badge-bad';
    return 'badge badge-warn';
  }

  verDetalle(o: Orden): void {
    this.orderService.getOrderById(o.id).subscribe({
      next: d => this.detalleOrden.set(d),
      error: () => this.detalleOrden.set(o)
    });
  }

  verDetallePresencial(v: VentaPresencial): void {
    this.detalleVenta.set(v.orden ? v : { ...v, orden: v.orden } as VentaPresencial);
    if (!v.orden && v.orden_id) {
      this.orderService.getOrderById(v.orden_id).subscribe({
        next: o => this.detalleVenta.set({ ...v, orden: o })
      });
    }
  }
}
