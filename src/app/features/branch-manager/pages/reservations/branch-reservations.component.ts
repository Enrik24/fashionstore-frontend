import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReservationService } from '../../../../core/services/reservation.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AlertService } from '../../../../core/services/alert.service';
import { Reserva, EstadoReserva } from '../../../../core/models/reservation.model';
import { Sucursal } from '../../../../core/models/branch.model';
import { MetodoPagoPresencial } from '../../../../core/models/cart.model';

@Component({
  selector: 'app-branch-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="branch-reservations-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">
            <i class="ri-calendar-check-line"></i> Gestión de Reservas en Tienda
          </h1>
          <p class="page-subtitle">Controla el flujo de prendas reservadas para prueba y atención presencial.</p>
        </div>

        <button class="btn btn-outline btn-sm" (click)="loadReservations()">
          <i class="ri-refresh-line"></i> Actualizar Lista
        </button>
      </div>

      <!-- Filters Bar -->
      <div class="filters-card card mb-4">
        <div class="filters-grid">
          <div class="filter-item">
            <label class="form-label">Filtrar por Estado</label>
            <select class="form-control" [(ngModel)]="selectedStatus" (change)="loadReservations()">
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="PREPARADA">Preparadas</option>
              <option value="EN_PRUEBA">En Probador (Prueba)</option>
              <option value="COMPLETADA">Completadas</option>
              <option value="CANCELADA">Canceladas</option>
              <option value="CADUCADA">Caducadas</option>
            </select>
          </div>

          <div class="filter-item">
            <label class="form-label">Filtrar por Sucursal</label>
            <select class="form-control" [(ngModel)]="selectedBranchId" (change)="loadReservations()">
              <option [ngValue]="undefined">Todas las sucursales</option>
              @for (branch of branches; track branch.id) {
                <option [ngValue]="branch.id">{{ branch.nombre }}</option>
              }
            </select>
          </div>
        </div>
      </div>

      <!-- Reservations List -->
      @if (loading) {
        <div class="loading-box card">
          <i class="ri-loader-4-line spin-icon"></i>
          <span>Cargando reservas de sucursal...</span>
        </div>
      } @else if (reservations.length === 0) {
        <div class="empty-box card">
          <i class="ri-calendar-todo-line empty-icon"></i>
          <h3>No hay reservas encontradas</h3>
          <p>No se encontraron reservas con los filtros seleccionados.</p>
        </div>
      } @else {
        <div class="reservations-grid">
          @for (res of reservations; track res.id) {
            <div class="reservation-card card" [class.highlight]="res.estado === 'PENDIENTE'">
              <!-- Card Header -->
              <div class="res-card-header">
                <div class="res-meta">
                  <span class="res-code">{{ res.numero_reserva }}</span>
                  <span class="res-date">
                    <i class="ri-time-line"></i> {{ res.fecha_reserva | date:'dd/MM/yyyy HH:mm' }}
                  </span>
                </div>

                <span class="badge" [ngClass]="getBadgeClass(res.estado)">
                  {{ res.estado }}
                </span>
              </div>

              <!-- Customer Info -->
              <div class="customer-box">
                <i class="ri-user-3-line customer-icon"></i>
                <div class="customer-info">
                  <strong>Cliente: {{ res.cliente?.nombre || 'Cliente FashionStore' }} {{ res.cliente?.apellido || '' }}</strong>
                  <span>Contacto: {{ res.cliente?.telefono || res.cliente?.correo || 'Sin teléfono' }}</span>
                </div>
              </div>

              <!-- Branch Info -->
              @if (res.sucursal) {
                <div class="branch-tag">
                  <i class="ri-store-2-line"></i> {{ res.sucursal.nombre }}
                </div>
              }

              <!-- Items List -->
              <div class="res-items-box">
                <span class="items-header">Prendas Reservadas:</span>
                @for (det of res.detalles; track det.id) {
                  <div class="res-item-row">
                    <span>
                      <b>{{ det.cantidad }}x</b> 
                      {{ det.variante_producto?.producto?.nombre || 'Variante #' + det.variante_producto_id }}
                      @if (det.variante_producto?.talla || det.variante_producto?.color) {
                        <small class="text-muted">({{ det.variante_producto?.talla?.valor || det.variante_producto?.talla?.nombre }} / {{ det.variante_producto?.color?.nombre }})</small>
                      }
                    </span>
                    <span class="badge badge-info">{{ det.estado }}</span>
                  </div>
                }
              </div>

              @if (res.notas) {
                <div class="res-notes">
                  <i class="ri-chat-1-line"></i>
                  <span>"{{ res.notas }}"</span>
                </div>
              }

              <!-- Action Buttons based on status -->
              <div class="res-actions">
                @if (res.estado === 'PENDIENTE') {
                  <button class="btn btn-sm btn-primary" (click)="prepareReservation(res)">
                    <i class="ri-check-line"></i> Preparar Prenda
                  </button>
                } @else if (res.estado === 'PREPARADA') {
                  <button class="btn btn-sm btn-success" (click)="startTrialReservation(res)">
                    <i class="ri-user-follow-line"></i> Enviar a Probador
                  </button>
                  <button class="btn btn-sm btn-accent" (click)="openCompleteModal(res)">
                    <i class="ri-money-dollar-box-line"></i> Cobrar / Finalizar
                  </button>
                } @else if (res.estado === 'EN_PRUEBA') {
                  <button class="btn btn-sm btn-accent" (click)="openCompleteModal(res)">
                    <i class="ri-money-dollar-box-line"></i> Completar Venta
                  </button>
                }

                @if (res.estado !== 'COMPLETADA' && res.estado !== 'CANCELADA' && res.estado !== 'CADUCADA') {
                  <button class="btn btn-sm btn-danger" (click)="cancelReservation(res)">
                    <i class="ri-close-line"></i> Cancelar
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Complete Reservation Modal -->
      @if (showCompleteModal && activeReserva) {
        <div class="modal-backdrop" (click)="showCompleteModal = false">
          <div class="modal-dialog card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3 class="modal-title">Completar Venta de Reserva</h3>
              <button class="btn-close" (click)="showCompleteModal = false">
                <i class="ri-close-line"></i>
              </button>
            </div>

            <div class="modal-body">
              <p class="modal-desc">
                Selecciona las prendas que el cliente decidió comprar tras probárselas:
              </p>

              <div class="items-to-buy-list">
                @for (item of completionItems; track item.detalle_reserva_id) {
                  <label class="item-checkbox-row">
                    <input type="checkbox" [(ngModel)]="item.comprado" />
                    <span>{{ getDetailName(item.detalle_reserva_id) }}</span>
                  </label>
                }
              </div>

              <div class="form-group mt-3">
                <label class="form-label">Método de Pago Presencial</label>
                <select class="form-control" [(ngModel)]="completionPaymentMethod">
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA_POS">Tarjeta (POS)</option>
                  <option value="QR">Pago QR</option>
                </select>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="showCompleteModal = false">Cancelar</button>
              <button class="btn btn-accent" (click)="submitComplete()">
                <i class="ri-check-double-line"></i> Finalizar Venta Presencial
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .branch-reservations-page {
      padding: 1.5rem 0;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--primary);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .page-subtitle {
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .mb-4 { margin-bottom: 1.5rem; }

    .filters-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .reservations-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.5rem;
    }

    .reservation-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      border: 1px solid var(--border-color);

      &.highlight {
        border-color: var(--accent);
        box-shadow: 0 4px 12px var(--accent-glow);
      }
    }

    .res-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border-light);
    }

    .res-code {
      font-family: monospace;
      font-weight: 800;
      color: var(--primary);
      font-size: 1rem;
      display: block;
    }

    .res-date {
      font-size: 0.75rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .customer-box {
      display: flex;
      gap: 0.75rem;
      background: #f8fafc;
      padding: 0.75rem;
      border-radius: var(--radius-md);
      margin-bottom: 0.75rem;
    }

    .customer-icon {
      font-size: 1.25rem;
      color: var(--accent);
    }

    .customer-info {
      display: flex;
      flex-direction: column;
      font-size: 0.8125rem;

      strong { color: var(--primary); }
      span { color: var(--text-muted); }
    }

    .branch-tag {
      font-size: 0.8125rem;
      color: var(--secondary);
      font-weight: 600;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .res-items-box {
      margin-bottom: 1rem;
    }

    .items-header {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      display: block;
      margin-bottom: 0.35rem;
    }

    .res-item-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.8125rem;
      padding: 0.25rem 0;
    }

    .res-notes {
      font-size: 0.75rem;
      font-style: italic;
      color: var(--text-muted);
      background: #fdf2f4;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-sm);
      margin-bottom: 1rem;
      display: flex;
      gap: 0.35rem;
    }

    .res-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      padding-top: 1rem;
      border-top: 1px solid var(--border-light);
    }

    .loading-box, .empty-box {
      padding: 3rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      color: var(--text-muted);
    }

    .empty-icon { font-size: 3rem; color: var(--text-muted); }
    .spin-icon { font-size: 2rem; color: var(--accent); animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 2000;
      display: flex; align-items: center; justify-content: center;
      padding: 1rem;
    }

    .modal-dialog {
      width: 100%; max-width: 480px; background: white;
      border-radius: var(--radius-xl); padding: 0; overflow: hidden;
    }

    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-light);
      display: flex; justify-content: space-between; align-items: center;
    }

    .btn-close { background: none; border: none; font-size: 1.25rem; cursor: pointer; }
    .modal-body { padding: 1.5rem; }
    .modal-desc { font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem; }

    .items-to-buy-list {
      display: flex; flex-direction: column; gap: 0.5rem;
      background: #f8fafc; padding: 0.75rem; border-radius: var(--radius-md);
    }

    .item-checkbox-row {
      display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; cursor: pointer;
    }

    .mt-3 { margin-top: 1rem; }

    .modal-footer {
      display: flex; justify-content: flex-end; gap: 0.75rem;
      padding: 1rem 1.5rem; border-top: 1px solid var(--border-light);
    }
  `]
})
export class BranchReservationsComponent implements OnInit {
  private resService = inject(ReservationService);
  private branchService = inject(BranchApiService);
  private toast = inject(ToastService);
  private alertService = inject(AlertService);

  public reservations: Reserva[] = [];
  public branches: Sucursal[] = [];
  public selectedStatus: string = '';
  public selectedBranchId?: number;
  public loading: boolean = false;

  // Complete Modal
  public showCompleteModal: boolean = false;
  public activeReserva: Reserva | null = null;
  public completionItems: { detalle_reserva_id: number; comprado: boolean }[] = [];
  public completionPaymentMethod: MetodoPagoPresencial = 'EFECTIVO';

  ngOnInit(): void {
    this.branchService.getBranches().subscribe(branches => this.branches = branches);
    this.loadReservations();
  }

  loadReservations(): void {
    this.loading = true;
    this.resService.getBranchReservations(this.selectedBranchId, this.selectedStatus || undefined).subscribe({
      next: (data) => {
        this.reservations = data || [];
        this.loading = false;
      },
      error: () => {
        this.reservations = [];
        this.loading = false;
      }
    });
  }

  getBadgeClass(status: EstadoReserva): string {
    switch (status) {
      case 'PENDIENTE': return 'badge-warning';
      case 'PREPARADA': return 'badge-info';
      case 'EN_PRUEBA': return 'badge-primary';
      case 'COMPLETADA': return 'badge-success';
      case 'CANCELADA':
      case 'CADUCADA': return 'badge-danger';
      default: return 'badge-primary';
    }
  }

  prepareReservation(res: Reserva): void {
    this.resService.prepareReservation(res.id).subscribe({
      next: () => {
        this.toast.success('Reserva marcada como PREPARADA en tienda');
        this.loadReservations();
      },
      error: (err) => {
        const msg = typeof err.error?.detail === 'string' ? err.error.detail : 'Error al actualizar reserva';
        this.toast.error(msg);
      }
    });
  }

  startTrialReservation(res: Reserva): void {
    this.resService.startTrialReservation(res.id).subscribe({
      next: () => {
        this.toast.success('Prendas enviadas a probador (EN PRUEBA)');
        this.loadReservations();
      },
      error: (err) => {
        const msg = typeof err.error?.detail === 'string' ? err.error.detail : 'Error al actualizar reserva';
        this.toast.error(msg);
      }
    });
  }

  async cancelReservation(res: Reserva): Promise<void> {
    const confirmed = await this.alertService.deleteConfirm(
      '¿Cancelar reserva?',
      `¿Estás seguro de cancelar la reserva ${res.numero_reserva}?`
    );
    if (confirmed) {
      this.resService.cancelReservation(res.id).subscribe({
        next: () => {
          this.toast.info('Reserva cancelada');
          this.loadReservations();
        },
        error: (err) => {
          const msg = typeof err.error?.detail === 'string' ? err.error.detail : 'Error al cancelar reserva';
          this.toast.error(msg);
        }
      });
    }
  }

  openCompleteModal(res: Reserva): void {
    this.activeReserva = res;
    this.completionItems = res.detalles.map(d => ({
      detalle_reserva_id: d.id,
      comprado: true
    }));
    this.showCompleteModal = true;
  }

  getDetailName(detalleId: number): string {
    if (!this.activeReserva) return `Item #${detalleId}`;
    const det = this.activeReserva.detalles.find(d => d.id === detalleId);
    if (!det) return `Item #${detalleId}`;
    const prodName = det.variante_producto?.producto?.nombre || 'Prenda';
    const talla = det.variante_producto?.talla?.valor || det.variante_producto?.talla?.nombre || '';
    const color = det.variante_producto?.color?.nombre || '';
    const attr = [talla, color].filter(Boolean).join(' / ');
    return `${det.cantidad}x ${prodName} ${attr ? '(' + attr + ')' : ''}`;
  }

  submitComplete(): void {
    if (!this.activeReserva) return;

    this.resService.completeReservation(this.activeReserva.id, {
      items: this.completionItems,
      metodo_pago: this.completionPaymentMethod
    }).subscribe({
      next: () => {
        this.toast.success('¡Venta presencial completada con éxito!');
        this.showCompleteModal = false;
        this.activeReserva = null;
        this.loadReservations();
      },
      error: (err) => {
        const msg = typeof err.error?.detail === 'string' ? err.error.detail : 'Error al completar la venta';
        this.toast.error(msg);
      }
    });
  }
}

