import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../../../../core/services/profile.service';
import { ReservationHistoryItem } from '../../../../core/models/profile.model';

@Component({
  selector: 'app-reservations-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="reservations-container animate-fade-in">
      <div class="section-header">
        <div>
          <h2 class="section-title">Mis Reservas en Tienda</h2>
          <p class="section-subtitle">Tus prendas reservadas para prueba o retiro en sucursal física</p>
        </div>
        <button class="btn btn-secondary btn-sm" (click)="cargarReservas()">
          <i class="ri-refresh-line"></i> Actualizar
        </button>
      </div>

      @if (loading()) {
        <div class="loading-state card">
          <i class="ri-loader-4-line ri-spin"></i>
          <span>Cargando tus reservas...</span>
        </div>
      } @else {
        <div class="reservations-list">
          @for (reserva of reservations(); track reserva.id) {
            <div class="card res-card">
              <div class="res-header">
                <div class="res-main-info">
                  <div class="res-icon-box">
                    <i class="ri-calendar-check-fill"></i>
                  </div>
                  <div>
                    <div class="res-code">
                      Reserva: <span class="font-mono">{{ reserva.codigo || reserva.codigo_reserva || ('#' + reserva.id) }}</span>
                    </div>
                    <div class="res-branch">
                      <i class="ri-store-3-line"></i> Sucursal: <strong>{{ reserva.sucursal?.nombre || reserva.sucursal_nombre || 'Sucursal Principal' }}</strong>
                    </div>
                  </div>
                </div>

                <div class="res-meta-right">
                  <div class="res-dates">
                    <span class="text-xs text-muted">Fecha: {{ (reserva.fecha_creacion || reserva.fecha_reserva || reserva.created_at) | date:'dd/MM/yyyy HH:mm' }}</span>
                    @if (reserva.fecha_expiracion) {
                      <span class="text-xs text-danger">Vence: {{ reserva.fecha_expiracion | date:'dd/MM/yyyy HH:mm' }}</span>
                    }
                  </div>
                  <span class="badge" [ngClass]="getStatusClass(reserva.estado)">
                    {{ reserva.estado }}
                  </span>
                </div>
              </div>

              <!-- Res Details -->
              <div class="res-body">
                <div class="res-items-list">
                  <h4 class="items-title">Prendas reservadas:</h4>
                  @for (item of (reserva.detalles || reserva.items || []); track item.id || $index) {
                    <div class="item-row">
                      <div class="item-pic">
                        @if (getItemImage(item)) {
                          <img [src]="getItemImage(item)" [alt]="getItemName(item)" />
                        } @else {
                          <i class="ri-t-shirt-line"></i>
                        }
                      </div>
                      <div class="item-info">
                        <span class="item-name">{{ getItemName(item) }}</span>
                        <div class="item-variants">
                          @if (getItemTalla(item)) { <span class="badge-sub">Talla: {{ getItemTalla(item) }}</span> }
                          @if (getItemColor(item)) { <span class="badge-sub">Color: {{ getItemColor(item) }}</span> }
                        </div>
                      </div>
                      <div class="item-qty">
                        x{{ item.cantidad }}
                      </div>
                      <div class="item-price">
                        Bs. {{ (item.precio_unitario || 0) | number:'1.2-2' }}
                      </div>
                    </div>
                  } @empty {
                    <p class="text-sm text-muted py-1">Detalle de prendas de la reserva.</p>
                  }
                </div>

                @if (getReservaTotal(reserva) > 0) {
                  <div class="res-total-row mt-3">
                    <span class="font-medium text-sm">Total Estimado a Pagar en Tienda:</span>
                    <span class="font-bold text-lg text-primary">Bs. {{ getReservaTotal(reserva) | number:'1.2-2' }}</span>
                  </div>
                }
              </div>
            </div>
          } @empty {
            <div class="card empty-card">
              <i class="ri-calendar-event-line text-4xl text-muted mb-2"></i>
              <h3>No tienes reservas activas</h3>
              <p class="text-muted">Puedes reservar prendas desde el catálogo para probártelas en tu sucursal más cercana.</p>
              <a routerLink="/catalog" class="btn btn-primary mt-3">
                <i class="ri-store-2-line"></i> Explorar Catálogo
              </a>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .reservations-container { max-width: 900px; margin: 0 auto; }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .section-title { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0; }
    .section-subtitle { font-size: 0.875rem; color: #64748b; margin: 0.25rem 0 0 0; }
    .reservations-list { display: flex; flex-direction: column; gap: 1rem; }
    .res-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .res-header {
      padding: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border-bottom: 1px solid #f1f5f9;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .res-main-info { display: flex; align-items: center; gap: 1rem; }
    .res-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #fef3c7;
      color: #b45309;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }
    .res-code { font-weight: 700; font-size: 1rem; color: #0f172a; }
    .res-branch { font-size: 0.8125rem; color: #64748b; margin-top: 0.2rem; }
    .res-meta-right { display: flex; align-items: center; gap: 1rem; }
    .res-dates { display: flex; flex-direction: column; align-items: flex-end; }
    .res-body { padding: 1.25rem; background: #f8fafc; }
    .items-title { font-size: 0.875rem; font-weight: 600; color: #334155; margin: 0 0 0.5rem 0; }
    .item-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .item-row:last-child { border-bottom: none; }
    .item-pic {
      width: 40px;
      height: 40px;
      border-radius: 6px;
      background: #e2e8f0;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .item-pic img { width: 100%; height: 100%; object-fit: cover; }
    .item-info { flex: 1; }
    .item-name { font-weight: 600; font-size: 0.875rem; color: #0f172a; }
    .item-variants { display: flex; gap: 0.35rem; margin-top: 0.2rem; }
    .badge-sub { font-size: 0.7rem; background: #e2e8f0; padding: 0.1rem 0.35rem; border-radius: 4px; color: #475569; }
    .item-qty { font-size: 0.875rem; color: #64748b; }
    .item-price { font-weight: 700; font-size: 0.875rem; color: #0f172a; }
    .res-total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 0.75rem;
    }
    .badge { padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .badge-success { background: #dcfce7; color: #15803d; }
    .badge-warning { background: #fef3c7; color: #b45309; }
    .badge-danger { background: #fee2e2; color: #b91c1c; }
    .badge-neutral { background: #f1f5f9; color: #475569; }
    .empty-card { text-align: center; padding: 4rem 1.5rem; display: flex; flex-direction: column; align-items: center; }
    .loading-state { text-align: center; padding: 3rem; color: #64748b; display: flex; align-items: center; justify-content: center; gap: 0.75rem; }
  `]
})
export class ReservationsHistoryComponent implements OnInit {
  private profileService = inject(ProfileService);

  reservations = signal<any[]>([]);
  loading = signal<boolean>(true);

  ngOnInit(): void {
    this.cargarReservas();
  }

  cargarReservas() {
    this.loading.set(true);
    this.profileService.getReservationsHistory().subscribe({
      next: (data) => {
        this.reservations.set(data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  getItemName(item: any): string {
    return item.variante_producto?.producto?.nombre || item.nombre_producto || 'Prenda en Reserva';
  }

  getItemImage(item: any): string | null {
    const imgs = item.variante_producto?.producto?.imagenes;
    if (imgs && imgs.length > 0) return imgs[0];
    return item.imagen_url || null;
  }

  getItemTalla(item: any): string | null {
    return item.variante_producto?.talla?.valor || item.talla || null;
  }

  getItemColor(item: any): string | null {
    return item.variante_producto?.color?.nombre || item.color || null;
  }

  getReservaTotal(reserva: any): number {
    if (reserva.total_estimado) return reserva.total_estimado;
    const detalles = reserva.detalles || reserva.items || [];
    return detalles.reduce((sum: number, d: any) => sum + ((d.precio_unitario || 0) * (d.cantidad || 1)), 0);
  }

  getStatusClass(estado: string): string {
    const st = (estado || '').toUpperCase();
    if (st.includes('CONFIRM') || st.includes('RECOG') || st.includes('COMPLET')) return 'badge-success';
    if (st.includes('PENDIENT') || st.includes('CREAD')) return 'badge-warning';
    if (st.includes('CANCEL') || st.includes('EXPIRAD') || st.includes('VENCID')) return 'badge-danger';
    return 'badge-neutral';
  }
}
