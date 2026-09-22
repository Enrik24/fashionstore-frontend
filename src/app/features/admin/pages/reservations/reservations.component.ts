import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReservationService } from '../../../../core/services/reservation.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Reserva } from '../../../../core/models/reservation.model';
import { Sucursal } from '../../../../core/models/branch.model';

@Component({
  selector: 'app-admin-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container animate-fade-in">
      <div class="page-header-card card">
        <div class="page-header-info">
          <div class="page-header-icon"><i class="ri-calendar-check-line"></i></div>
          <div>
            <h1 class="page-title">Reservas Realizadas</h1>
            <p class="page-subtitle">Consulta de reservas completadas por los clientes. Vista de solo lectura.</p>
          </div>
        </div>
      </div>

      <div class="kpi-row">
        <div class="card kpi-card">
          <span class="kpi-label">Reservas realizadas</span>
          <span class="kpi-value">{{ filtradas().length }}</span>
        </div>
        <div class="card kpi-card">
          <span class="kpi-label">Prendas reservadas</span>
          <span class="kpi-value">{{ totalPrendas() }}</span>
        </div>
      </div>

      <div class="card filters-card">
        <input type="text" class="form-control" [(ngModel)]="busqueda" (ngModelChange)="pagina.set(1)" placeholder="Buscar por N° de reserva..." />
        <select class="form-control" [(ngModel)]="filtroSucursal" (ngModelChange)="pagina.set(1)">
          <option [ngValue]="null">Todas las sucursales</option>
          @for (s of sucursales(); track s.id) { <option [ngValue]="s.id">{{ s.nombre }}</option> }
        </select>
        <select class="form-control" [(ngModel)]="filtroEstado" (ngModelChange)="pagina.set(1)">
          <option value="COMPLETADA">Solo realizadas (completadas)</option>
          <option value="TODAS">Todas (incl. pendientes/canceladas)</option>
          <option value="PENDIENTE">Pendientes</option>
          <option value="PREPARADA">Preparadas</option>
          <option value="EN_PRUEBA">En prueba</option>
          <option value="CANCELADA">Canceladas</option>
          <option value="CADUCADA">Caducadas</option>
        </select>
      </div>

      @if (isLoading()) {
        <div class="card loading-box"><i class="ri-loader-4-line spin"></i> Cargando reservas...</div>
      } @else {
        <div class="card table-card">
          <table class="data-table">
            <thead><tr><th>N° Reserva</th><th>Fecha reserva</th><th>Sucursal</th><th>Estado</th><th class="num">Prendas</th><th></th></tr></thead>
            <tbody>
              @for (r of paginaActual(); track r.id) {
                <tr>
                  <td class="mono">{{ r.numero_reserva }}</td>
                  <td>{{ r.fecha_reserva | date:'short' }}</td>
                  <td>{{ nombreSucursal(r.sucursal_id) }}</td>
                  <td><span class="badge" [class]="estadoClass(r.estado)">{{ r.estado }}</span></td>
                  <td class="num">{{ cuentaPrendas(r) }}</td>
                  <td><button class="btn-icon-view" (click)="verDetalle(r)" title="Ver detalle"><i class="ri-eye-line"></i></button></td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="empty-cell">No hay reservas realizadas con los filtros aplicados.</td></tr>
              }
            </tbody>
          </table>
          <div class="pager">
            <button class="btn btn-sm" [disabled]="pagina() === 1" (click)="paginaAnterior()">← Anterior</button>
            <span>Página {{ pagina() }} de {{ totalPaginas() }}</span>
            <button class="btn btn-sm" [disabled]="pagina() >= totalPaginas()" (click)="paginaSiguiente()">Siguiente →</button>
          </div>
        </div>
      }

      @if (detalle()) {
        <div class="modal-backdrop" (click)="detalle.set(null)">
          <div class="modal-card card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Reserva {{ detalle()?.numero_reserva }}</h3>
              <button class="btn-icon-danger" (click)="detalle.set(null)"><i class="ri-close-line"></i></button>
            </div>
            <div class="modal-meta">
              <span><strong>Estado:</strong> {{ detalle()?.estado }}</span>
              <span><strong>Fecha:</strong> {{ detalle()?.fecha_reserva | date:'medium' }}</span>
              <span><strong>Sucursal:</strong> {{ nombreSucursal(detalle()?.sucursal_id) }}</span>
              @if (detalle()?.horario_aproximado) { <span><strong>Horario:</strong> {{ detalle()?.horario_aproximado }}</span> }
              @if (detalle()?.notas) { <span><strong>Notas:</strong> {{ detalle()?.notas }}</span> }
            </div>
            <table class="data-table">
              <thead><tr><th>Producto</th><th>Talla</th><th>Color</th><th class="num">Cant.</th><th>Estado</th></tr></thead>
              <tbody>
                @for (d of detalle()?.detalles ?? []; track d.id) {
                  <tr>
                    <td>{{ d.variante_producto?.producto?.nombre || ('Variante #' + d.variante_producto_id) }}</td>
                    <td>{{ d.variante_producto?.talla?.valor || d.variante_producto?.talla?.nombre || '—' }}</td>
                    <td>{{ d.variante_producto?.color?.nombre || '—' }}</td>
                    <td class="num">{{ d.cantidad }}</td>
                    <td><span class="badge">{{ d.estado }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-header-card { padding: 1.25rem 1.5rem; margin-bottom: 1rem; }
    .page-header-info { display: flex; align-items: center; gap: 1rem; }
    .page-header-icon { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #8b5cf6, #5b21b6); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; color: #fff; }
    .page-title { font-size: 1.25rem; font-weight: 700; margin: 0; }
    .page-subtitle { font-size: 0.82rem; color: #64748b; margin: 0.15rem 0 0; }
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
    .empty-cell { text-align: center; padding: 2rem; color: #64748b; }
    .loading-box { padding: 2.5rem; text-align: center; color: #64748b; }
    .badge { padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.72rem; font-weight: 700; background: #f1f5f9; color: #475569; }
    .badge-ok { background: rgba(16,185,129,0.12); color: #059669; }
    .badge-warn { background: rgba(245,158,11,0.12); color: #d97706; }
    .badge-bad { background: rgba(239,68,68,0.12); color: #dc2626; }
    .badge-info { background: rgba(139,92,246,0.12); color: #7c3aed; }
    .btn-icon-view { background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.2); color: #7c3aed; border-radius: 6px; padding: 0.3rem 0.5rem; font-size: 0.85rem; cursor: pointer; }
    .btn-icon-danger { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #f87171; border-radius: 6px; padding: 0.3rem 0.5rem; cursor: pointer; }
    .pager { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 0.75rem; font-size: 0.82rem; color: #64748b; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
    .modal-card { max-width: 720px; width: 100%; max-height: 85vh; overflow-y: auto; padding: 1.5rem; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .modal-header h3 { margin: 0; font-size: 1.1rem; }
    .modal-meta { display: flex; gap: 1.25rem; flex-wrap: wrap; font-size: 0.82rem; color: #475569; margin-bottom: 1rem; }
    .spin { animation: spin 1s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class ReservationsComponent implements OnInit {
  private reservationService = inject(ReservationService);
  private branchApi = inject(BranchApiService);
  private toast = inject(ToastService);

  isLoading = signal(true);
  reservas = signal<Reserva[]>([]);
  sucursales = signal<Sucursal[]>([]);
  busqueda = '';
  filtroSucursal: number | null = null;
  filtroEstado = 'COMPLETADA';
  pagina = signal(1);
  readonly pageSize = 15;
  detalle = signal<Reserva | null>(null);

  filtradas = computed(() => {
    const q = this.busqueda.trim().toLowerCase();
    return this.reservas().filter(r => {
      if (this.filtroEstado !== 'TODAS' && (r.estado as string) !== this.filtroEstado) return false;
      if (this.filtroSucursal && r.sucursal_id !== this.filtroSucursal) return false;
      if (q && !(r.numero_reserva || '').toLowerCase().includes(q)) return false;
      return true;
    });
  });

  totalPaginas = computed(() => Math.max(1, Math.ceil(this.filtradas().length / this.pageSize)));
  paginaActual = computed(() => this.filtradas().slice((this.pagina() - 1) * this.pageSize, this.pagina() * this.pageSize));
  totalPrendas = computed(() => this.filtradas().reduce((acc, r) => acc + this.cuentaPrendas(r), 0));

  ngOnInit(): void {
    this.branchApi.getBranches(0, 500).subscribe({ next: d => this.sucursales.set(d || []), error: () => undefined });
    this.reservationService.getBranchReservations().subscribe({
      next: d => { this.reservas.set(d || []); this.isLoading.set(false); },
      error: (err) => { this.toast.show(err.error?.detail || 'Error al cargar reservas', 'error'); this.isLoading.set(false); }
    });
  }

  cuentaPrendas(r: Reserva): number {
    return (r.detalles || []).reduce((acc, d) => acc + (d.cantidad || 0), 0);
  }

  paginaAnterior(): void {
    this.pagina.update(p => p - 1);
  }

  paginaSiguiente(): void {
    this.pagina.update(p => p + 1);
  }

  nombreSucursal(id?: number | null): string {
    if (!id) return '—';
    return this.sucursales().find(s => s.id === id)?.nombre || (this.reservas().find(r => r.sucursal_id === id)?.sucursal as any)?.nombre || `Sucursal #${id}`;
  }

  estadoClass(estado: string): string {
    if (estado === 'COMPLETADA') return 'badge badge-ok';
    if (estado === 'CANCELADA' || estado === 'CADUCADA') return 'badge badge-bad';
    if (estado === 'PENDIENTE') return 'badge badge-warn';
    return 'badge badge-info';
  }

  verDetalle(r: Reserva): void {
    this.reservationService.getReservationById(r.id).subscribe({
      next: d => this.detalle.set(d),
      error: () => this.detalle.set(r)
    });
  }
}
