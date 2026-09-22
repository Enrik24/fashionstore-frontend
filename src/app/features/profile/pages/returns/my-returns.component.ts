import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReturnsApiService } from '../../../../core/services/returns-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SolicitudDevolucion, EstadoSolicitudDevolucion } from '../../../../core/models/return.model';

@Component({
  selector: 'app-my-returns',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="my-returns-page animate-fade-in">
      <div class="section-header">
        <div>
          <h2 class="section-title"><i class="ri-arrow-go-back-line"></i> Mis Devoluciones</h2>
          <p class="section-subtitle">Sigue el estado de tus solicitudes de devolución y cambio.</p>
        </div>
        <div class="header-actions">
          <a routerLink="/profile/orders" class="btn btn-outline btn-sm">
            <i class="ri-shopping-bag-3-line"></i> Mis Compras
          </a>
          <button class="btn btn-secondary btn-sm" (click)="cargarSolicitudes()">
            <i class="ri-refresh-line"></i> Actualizar
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state card">
          <i class="ri-loader-4-line spin-icon"></i>
          <span>Cargando tus solicitudes de devolución...</span>
        </div>
      } @else if (solicitudes().length === 0) {
        <div class="empty-state card">
          <div class="empty-icon-box">
            <i class="ri-arrow-go-back-line"></i>
          </div>
          <h3>Sin solicitudes de devolución</h3>
          <p>Aquí verás el seguimiento de tus devoluciones y cambios. Si una prenda no te queda, solicítala desde tus compras.</p>
          <a routerLink="/profile/orders" class="btn btn-accent">
            <i class="ri-shopping-bag-3-line"></i> Ir a Mis Compras
          </a>
        </div>
      } @else {
        <div class="returns-list">
          @for (solicitud of solicitudes(); track solicitud.id) {
            <div class="card return-card">
              <div class="return-header" (click)="toggleExpand(solicitud.id)">
                <div class="return-main-info">
                  <div class="return-icon-box" [ngClass]="getEstadoBoxClass(solicitud.estado)">
                    <i [class]="getTipoIcon(solicitud.tipo)"></i>
                  </div>
                  <div>
                    <div class="return-code">{{ solicitud.numero_solicitud }}</div>
                    <div class="return-date">
                      <i class="ri-calendar-line"></i> {{ solicitud.fecha_solicitud | date:'dd/MM/yyyy HH:mm' }}
                      · Orden #{{ solicitud.orden_id }}
                    </div>
                  </div>
                </div>

                <div class="return-summary-meta">
                  <span class="badge" [ngClass]="getEstadoClass(solicitud.estado)">
                    {{ solicitud.estado }}
                  </span>
                  <i class="ri-arrow-down-s-line chevron" [class.rotated]="expanded().has(solicitud.id)"></i>
                </div>
              </div>

              @if (expanded().has(solicitud.id)) {
                <div class="return-body animate-fade-in">
                  <div class="return-meta-grid">
                    <div>
                      <span class="detail-label">Tipo de solicitud:</span>
                      <span class="detail-val">{{ solicitud.tipo === 'CAMBIO' ? 'Cambio por otra talla/color' : 'Devolución con reembolso' }}</span>
                    </div>
                    <div>
                      <span class="detail-label">Motivo:</span>
                      <span class="detail-val">{{ getMotivoLabel(solicitud.motivo) }}</span>
                    </div>
                    @if (solicitud.motivo_detalle) {
                      <div class="col-span-2">
                        <span class="detail-label">Detalle del motivo:</span>
                        <span class="detail-val">{{ solicitud.motivo_detalle }}</span>
                      </div>
                    }
                    @if (solicitud.monto_reembolso !== null && solicitud.monto_reembolso !== undefined) {
                      <div>
                        <span class="detail-label">Monto estimado:</span>
                        <span class="detail-val font-bold">Bs. {{ solicitud.monto_reembolso | number:'1.2-2' }}</span>
                      </div>
                    }
                    @if (solicitud.observaciones_staff) {
                      <div class="col-span-2">
                        <span class="detail-label">Observaciones del personal:</span>
                        <span class="detail-val note">{{ solicitud.observaciones_staff }}</span>
                      </div>
                    }
                  </div>

                  <div class="items-list">
                    <h4 class="items-title">Prendas incluidas:</h4>
                    @for (detalle of solicitud.detalles; track detalle.id) {
                      <div class="item-row">
                        <div class="item-pic">
                          @if (getDetalleImagen(detalle)) {
                            <img [src]="getDetalleImagen(detalle)" [alt]="getDetalleNombre(detalle)" />
                          } @else {
                            <i class="ri-t-shirt-line"></i>
                          }
                        </div>
                        <div class="item-info">
                          <span class="item-name">{{ getDetalleNombre(detalle) }}</span>
                          <div class="item-variants">
                            @if (getDetalleTalla(detalle)) { <span class="badge-sub">Talla: {{ getDetalleTalla(detalle) }}</span> }
                            @if (getDetalleColor(detalle)) { <span class="badge-sub">Color: {{ getDetalleColor(detalle) }}</span> }
                            @if (detalle.variante_cambio) {
                              <span class="badge-sub change">
                                Cambio a: {{ getCambioTalla(detalle) }} / {{ getCambioColor(detalle) }}
                              </span>
                            }
                          </div>
                        </div>
                        <div class="item-qty">x{{ detalle.cantidad }}</div>
                        <div class="item-subtotal">
                          Bs. {{ (detalle.precio_unitario * detalle.cantidad) | number:'1.2-2' }}
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .my-returns-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .section-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .section-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--primary);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
    }

    .section-title i { color: var(--accent); }

    .section-subtitle {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .header-actions { display: flex; gap: 0.5rem; }

    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 3rem;
      color: var(--text-muted);
    }

    .empty-state {
      padding: 4rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }

    .empty-icon-box {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: #f1f5f9;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.25rem;
    }

    .returns-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .return-card { overflow: hidden; }

    .return-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.25rem;
      cursor: pointer;
    }

    .return-main-info { display: flex; align-items: center; gap: 1rem; }

    .return-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }

    .box-warning { background: #fef3c7; color: #b45309; }
    .box-info { background: #e0f2fe; color: #0369a1; }
    .box-success { background: #dcfce7; color: #15803d; }
    .box-danger { background: #fee2e2; color: #b91c1c; }

    .return-code { font-weight: 700; font-size: 1rem; color: #0f172a; }

    .return-date {
      font-size: 0.8125rem;
      color: #64748b;
      margin-top: 0.2rem;
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }

    .return-summary-meta { display: flex; align-items: center; gap: 1.25rem; }

    .chevron { font-size: 1.25rem; color: #94a3b8; transition: transform 0.2s; }
    .chevron.rotated { transform: rotate(180deg); }

    .return-body {
      padding: 1.25rem;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }

    .return-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      font-size: 0.875rem;
      background: #ffffff;
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      margin-bottom: 1rem;
    }

    .col-span-2 { grid-column: span 2; }
    .detail-label { color: #64748b; font-size: 0.75rem; display: block; }
    .detail-val { color: #0f172a; }
    .detail-val.font-bold { font-weight: 700; }
    .detail-val.note { font-style: italic; color: #475569; }

    .items-title { font-size: 0.875rem; font-weight: 600; color: #334155; margin: 0 0 0.5rem 0; }

    .item-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.6rem 0;
      border-bottom: 1px solid #e2e8f0;
    }

    .item-row:last-child { border-bottom: none; }

    .item-pic {
      width: 44px;
      height: 44px;
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

    .item-variants { display: flex; gap: 0.35rem; margin-top: 0.2rem; flex-wrap: wrap; }

    .badge-sub {
      font-size: 0.7rem;
      background: #e2e8f0;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      color: #475569;
    }

    .badge-sub.change { background: #e0e7ff; color: #4338ca; }

    .item-qty { font-size: 0.875rem; color: #64748b; font-weight: 500; }
    .item-subtotal { font-weight: 700; font-size: 0.9375rem; color: #0f172a; }

    .badge {
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-success { background: #dcfce7; color: #15803d; }
    .badge-info { background: #e0f2fe; color: #0369a1; }
    .badge-warning { background: #fef3c7; color: #b45309; }
    .badge-danger { background: #fee2e2; color: #b91c1c; }
    .badge-neutral { background: #f1f5f9; color: #475569; }

    .spin-icon { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class MyReturnsComponent implements OnInit {
  private returnsApi = inject(ReturnsApiService);
  private toast = inject(ToastService);

  public solicitudes = signal<SolicitudDevolucion[]>([]);
  public loading = signal<boolean>(true);
  public expanded = signal<Set<number>>(new Set());

  ngOnInit(): void {
    this.cargarSolicitudes();
  }

  cargarSolicitudes(): void {
    this.loading.set(true);
    this.returnsApi.getMyRequests(0, 50).subscribe({
      next: (data) => {
        this.solicitudes.set(data || []);
        this.loading.set(false);
      },
      error: () => {
        this.solicitudes.set([]);
        this.loading.set(false);
        this.toast.error('No se pudieron cargar tus solicitudes de devolución.');
      }
    });
  }

  toggleExpand(id: number): void {
    this.expanded.update(set => {
      const copia = new Set(set);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });
  }

  getEstadoClass(estado: EstadoSolicitudDevolucion): string {
    switch (estado) {
      case 'PENDIENTE':
      case 'EN_REVISION':
      case 'PENDIENTE_REEMBOLSO':
        return 'badge-warning';
      case 'APROBADA':
        return 'badge-info';
      case 'COMPLETADA':
        return 'badge-success';
      case 'RECHAZADA':
        return 'badge-danger';
      default:
        return 'badge-neutral';
    }
  }

  getEstadoBoxClass(estado: EstadoSolicitudDevolucion): string {
    switch (estado) {
      case 'COMPLETADA': return 'box-success';
      case 'RECHAZADA': return 'box-danger';
      case 'PENDIENTE':
      case 'EN_REVISION':
      case 'PENDIENTE_REEMBOLSO':
        return 'box-warning';
      default: return 'box-info';
    }
  }

  getTipoIcon(tipo: string): string {
    return tipo === 'CAMBIO' ? 'ri-exchange-line' : 'ri-money-dollar-circle-line';
  }

  getMotivoLabel(motivo: string): string {
    switch (motivo) {
      case 'TALLA_INCORRECTA': return 'Talla incorrecta';
      case 'COLOR_INCORRECTO': return 'Color incorrecto';
      case 'DEFECTO_FABRICA': return 'Defecto de fábrica';
      case 'OTRO': return 'Otro motivo';
      default: return motivo;
    }
  }

  getDetalleNombre(detalle: any): string {
    return detalle.variante_producto?.producto?.nombre || 'Prenda FashionStore';
  }

  getDetalleImagen(detalle: any): string | null {
    const imgs = detalle.variante_producto?.producto?.imagenes;
    return imgs && imgs.length > 0 ? imgs[0] : null;
  }

  getDetalleTalla(detalle: any): string | null {
    return detalle.variante_producto?.talla?.valor || detalle.variante_producto?.talla?.nombre || null;
  }

  getDetalleColor(detalle: any): string | null {
    return detalle.variante_producto?.color?.nombre || null;
  }

  getCambioTalla(detalle: any): string {
    return detalle.variante_cambio?.talla?.valor || detalle.variante_cambio?.talla?.nombre || '—';
  }

  getCambioColor(detalle: any): string {
    return detalle.variante_cambio?.color?.nombre || '—';
  }
}
