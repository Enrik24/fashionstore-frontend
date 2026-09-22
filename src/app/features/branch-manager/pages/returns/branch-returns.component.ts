import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReturnsApiService } from '../../../../core/services/returns-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import {
  SolicitudDevolucion,
  EstadoSolicitudDevolucion,
  RevisionSolicitudDto
} from '../../../../core/models/return.model';

@Component({
  selector: 'app-branch-returns',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  template: `
    <div class="branch-returns-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">
            <i class="ri-arrow-go-back-line"></i> Gestión de Devoluciones en Tienda
          </h1>
          <p class="page-subtitle">Revisa las solicitudes de devolución y cambio de tu sucursal.</p>
        </div>

        <button class="btn btn-outline btn-sm" (click)="cargarSolicitudes()">
          <i class="ri-refresh-line"></i> Actualizar Lista
        </button>
      </div>

      <!-- Filters Bar -->
      <div class="filters-card card mb-4">
        <div class="filters-grid">
          <div class="filter-item">
            <label class="form-label">Filtrar por Estado</label>
            <select class="form-control" [(ngModel)]="estadoFiltro" (change)="cargarSolicitudes()">
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="EN_REVISION">En revisión</option>
              <option value="APROBADA">Aprobadas</option>
              <option value="RECHAZADA">Rechazadas</option>
              <option value="COMPLETADA">Completadas</option>
              <option value="PENDIENTE_REEMBOLSO">Pendientes de reembolso</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Returns List -->
      @if (loading) {
        <div class="loading-box card">
          <i class="ri-loader-4-line spin-icon"></i>
          <span>Cargando solicitudes de devolución...</span>
        </div>
      } @else if (solicitudes.length === 0) {
        <div class="empty-box card">
          <i class="ri-arrow-go-back-line empty-icon"></i>
          <h3>No hay solicitudes encontradas</h3>
          <p>No se encontraron solicitudes con los filtros seleccionados.</p>
        </div>
      } @else {
        <div class="returns-grid">
          @for (solicitud of solicitudes; track solicitud.id) {
            <div class="return-card card" [class.highlight]="solicitud.estado === 'PENDIENTE'">
              <div class="res-card-header">
                <div class="res-meta">
                  <span class="res-code">{{ solicitud.numero_solicitud }}</span>
                  <span class="res-date">
                    <i class="ri-time-line"></i> {{ solicitud.fecha_solicitud | date:'dd/MM/yyyy HH:mm' }}
                  </span>
                </div>

                <span class="badge" [ngClass]="getEstadoClass(solicitud.estado)">
                  {{ solicitud.estado }}
                </span>
              </div>

              <div class="meta-box">
                <div class="meta-row">
                  <span class="meta-label">Orden:</span>
                  <span class="meta-val">#{{ solicitud.orden_id }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Tipo:</span>
                  <span class="meta-val">{{ solicitud.tipo === 'CAMBIO' ? 'Cambio' : 'Devolución' }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Motivo:</span>
                  <span class="meta-val">{{ getMotivoLabel(solicitud.motivo) }}</span>
                </div>
                @if (solicitud.monto_reembolso !== null && solicitud.monto_reembolso !== undefined) {
                  <div class="meta-row">
                    <span class="meta-label">Monto estimado:</span>
                    <span class="meta-val font-bold">Bs. {{ solicitud.monto_reembolso | number:'1.2-2' }}</span>
                  </div>
                }
              </div>

              <div class="res-items-box">
                <span class="items-header">Prendas involucradas:</span>
                @for (detalle of solicitud.detalles; track detalle.id) {
                  <div class="res-item-row">
                    <span>
                      <b>{{ detalle.cantidad }}x</b>
                      {{ detalle.variante_producto?.producto?.nombre || 'Prenda FashionStore' }}
                      @if (detalle.variante_producto?.talla || detalle.variante_producto?.color) {
                        <small class="text-muted">
                          ({{ detalle.variante_producto?.talla?.valor || detalle.variante_producto?.talla?.nombre }} / {{ detalle.variante_producto?.color?.nombre }})
                        </small>
                      }
                    </span>
                    <span class="badge badge-info">
                      @if (detalle.variante_cambio) {
                        Cambio a {{ detalle.variante_cambio.talla?.valor || detalle.variante_cambio.talla?.nombre }} / {{ detalle.variante_cambio.color?.nombre }}
                      } @else {
                        Devolución
                      }
                    </span>
                  </div>
                }
              </div>

              @if (solicitud.observaciones_staff) {
                <div class="res-notes">
                  <i class="ri-information-line"></i>
                  <span><b>Observaciones:</b> {{ solicitud.observaciones_staff }}</span>
                </div>
              }

              <div class="res-actions">
                <button class="btn btn-outline btn-sm" (click)="verDetalle(solicitud.id)">
                  <i class="ri-eye-line"></i> Ver Detalle
                </button>

                @if (solicitud.estado === 'PENDIENTE' || solicitud.estado === 'EN_REVISION') {
                  <button class="btn btn-success btn-sm" (click)="aprobar(solicitud)">
                    <i class="ri-checkbox-circle-line"></i> Aprobar
                  </button>
                  <button class="btn btn-danger btn-sm" (click)="abrirRechazo(solicitud)">
                    <i class="ri-close-circle-line"></i> Rechazar
                  </button>
                } @else if (solicitud.estado === 'PENDIENTE_REEMBOLSO') {
                  <button class="btn btn-warning btn-sm" [disabled]="procesandoReembolso === solicitud.id" (click)="reintentarReembolso(solicitud)">
                    @if (procesandoReembolso === solicitud.id) {
                      <i class="ri-loader-4-line spin-icon"></i> Procesando...
                    } @else {
                      <i class="ri-money-dollar-circle-line"></i> Reintentar Reembolso
                    }
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Modal Detalle -->
      <app-modal
        [isOpen]="isDetalleOpen()"
        [title]="detalle()?.numero_solicitud ? 'Solicitud ' + detalle()!.numero_solicitud : 'Detalle de Solicitud'"
        [subtitle]="'Orden #' + (detalle()?.orden_id ?? '') + ' · Estado: ' + (detalle()?.estado ?? '')"
        [icon]="'ri-arrow-go-back-line'"
        [maxWidth]="'720px'"
        (closeEvent)="cerrarDetalle()"
      >
        @if (cargandoDetalle()) {
          <div class="modal-loading">
            <i class="ri-loader-4-line spin-icon"></i> Cargando detalle...
          </div>
        } @else if (detalle()) {
          <div class="detail-body">
            <div class="detail-meta-grid">
              <div>
                <span class="detail-label">Tipo de solicitud:</span>
                <span class="detail-val">{{ detalle()!.tipo === 'CAMBIO' ? 'Cambio por otra talla/color' : 'Devolución con reembolso' }}</span>
              </div>
              <div>
                <span class="detail-label">Motivo:</span>
                <span class="detail-val">{{ getMotivoLabel(detalle()!.motivo) }}</span>
              </div>
              @if (detalle()!.motivo_detalle) {
                <div class="col-span-2">
                  <span class="detail-label">Detalle del cliente:</span>
                  <span class="detail-val">{{ detalle()!.motivo_detalle }}</span>
                </div>
              }
              <div>
                <span class="detail-label">Monto estimado:</span>
                <span class="detail-val font-bold">Bs. {{ detalle()!.monto_reembolso | number:'1.2-2' }}</span>
              </div>
              <div>
                <span class="detail-label">Fecha de solicitud:</span>
                <span class="detail-val">{{ detalle()!.fecha_solicitud | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
              @if (detalle()!.observaciones_staff) {
                <div class="col-span-2">
                  <span class="detail-label">Observaciones del personal:</span>
                  <span class="detail-val note">{{ detalle()!.observaciones_staff }}</span>
                </div>
              }
            </div>

            <div class="detail-items">
              <h4 class="items-title">Prendas de la solicitud:</h4>
              @for (item of detalle()!.detalles; track item.id) {
                <div class="detail-item-row">
                  <div class="item-pic">
                    @if (getDetalleImagen(item)) {
                      <img [src]="getDetalleImagen(item)" [alt]="getDetalleNombre(item)" />
                    } @else {
                      <i class="ri-t-shirt-line"></i>
                    }
                  </div>
                  <div class="item-info">
                    <span class="item-name">{{ getDetalleNombre(item) }}</span>
                    <div class="item-variants">
                      @if (getDetalleTalla(item)) { <span class="badge-sub">Talla: {{ getDetalleTalla(item) }}</span> }
                      @if (getDetalleColor(item)) { <span class="badge-sub">Color: {{ getDetalleColor(item) }}</span> }
                      @if (item.variante_cambio) {
                        <span class="badge-sub change">
                          Cambio a: {{ item.variante_cambio.talla?.valor || item.variante_cambio.talla?.nombre }} / {{ item.variante_cambio.color?.nombre }}
                        </span>
                      }
                    </div>
                  </div>
                  <div class="item-qty">x{{ item.cantidad }}</div>
                  <div class="item-subtotal">Bs. {{ (item.precio_unitario * item.cantidad) | number:'1.2-2' }}</div>
                </div>
              }
            </div>
          </div>
        }
      </app-modal>

      <!-- Modal Rechazo -->
      <app-modal
        [isOpen]="isRechazoOpen()"
        [title]="'Rechazar Solicitud'"
        [subtitle]="'Explica al cliente por qué se rechaza la solicitud'"
        [icon]="'ri-close-circle-line'"
        [maxWidth]="'520px'"
        (closeEvent)="cerrarRechazo()"
      >
        @if (rechazando) {
          <div class="form-group">
            <label class="form-label" for="r-obs">Observaciones <span class="required">*</span></label>
            <textarea
              id="r-obs"
              rows="4"
              class="form-control"
              [(ngModel)]="observacionesRechazo"
              placeholder="Ej. La prenda presenta señales de uso y no cumple las condiciones de devolución."
            ></textarea>
          </div>

          <div class="modal-actions-box">
            <button class="btn btn-outline" (click)="cerrarRechazo()">Cancelar</button>
            <button class="btn btn-danger" [disabled]="!observacionesRechazo.trim() || guardandoRechazo" (click)="confirmarRechazo()">
              @if (guardandoRechazo) {
                <i class="ri-loader-4-line spin-icon"></i>
              } @else {
                <i class="ri-close-circle-line"></i>
              }
              Confirmar Rechazo
            </button>
          </div>
        }
      </app-modal>
    </div>
  `,
  styles: [`
    .branch-returns-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .page-title { font-size: 1.6rem; font-weight: 800; color: var(--primary); display: flex; align-items: center; gap: 0.6rem; margin: 0; }
    .page-title i { color: var(--accent); }
    .page-subtitle { color: var(--text-muted); font-size: 0.875rem; margin-top: 0.25rem; }
    .filters-card { padding: 1rem; }
    .filters-grid { display: grid; grid-template-columns: minmax(220px, 280px); gap: 1rem; }
    .loading-box, .empty-box { padding: 3rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; color: var(--text-muted); }
    .empty-icon { font-size: 3rem; color: #cbd5e1; }
    .returns-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.25rem; }
    .return-card { padding: 0; overflow: hidden; display: flex; flex-direction: column; }
    .return-card.highlight { border-color: #f59e0b; box-shadow: 0 0 0 1px #f59e0b33; }
    .res-card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding: 1rem 1rem 0; }
    .res-meta { display: flex; flex-direction: column; gap: 0.2rem; }
    .res-code { font-weight: 700; color: #0f172a; }
    .res-date { font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 0.3rem; }
    .meta-box { padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.35rem; }
    .meta-row { display: flex; justify-content: space-between; font-size: 0.8125rem; }
    .meta-label { color: #64748b; }
    .meta-val { color: #0f172a; }
    .meta-val.font-bold { font-weight: 700; }
    .res-items-box { padding: 0 1rem 1rem; }
    .items-header { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; display: block; margin-bottom: 0.35rem; }
    .res-item-row { display: flex; justify-content: space-between; font-size: 0.8125rem; padding: 0.25rem 0; }
    .res-notes { font-size: 0.75rem; font-style: italic; color: var(--text-muted); background: #fdf2f4; padding: 0.5rem 0.75rem; border-radius: 6px; margin: 0 1rem 1rem; display: flex; gap: 0.35rem; }
    .res-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; padding: 1rem; border-top: 1px solid #f1f5f9; }
    .modal-loading { display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); }
    .detail-body { display: flex; flex-direction: column; gap: 1rem; }
    .detail-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.875rem; background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0; }
    .col-span-2 { grid-column: span 2; }
    .detail-label { color: #64748b; font-size: 0.75rem; display: block; }
    .detail-val { color: #0f172a; }
    .detail-val.font-bold { font-weight: 700; }
    .detail-val.note { font-style: italic; color: #475569; }
    .detail-items { display: flex; flex-direction: column; gap: 0.4rem; }
    .items-title { font-size: 0.875rem; font-weight: 600; color: #334155; margin: 0; }
    .detail-item-row { display: flex; align-items: center; gap: 1rem; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; }
    .detail-item-row:last-child { border-bottom: none; }
    .item-pic { width: 44px; height: 44px; border-radius: 6px; background: #e2e8f0; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .item-pic img { width: 100%; height: 100%; object-fit: cover; }
    .item-info { flex: 1; }
    .item-name { font-weight: 600; font-size: 0.875rem; color: #0f172a; }
    .item-variants { display: flex; gap: 0.35rem; margin-top: 0.2rem; flex-wrap: wrap; }
    .badge-sub { font-size: 0.7rem; background: #e2e8f0; padding: 0.1rem 0.35rem; border-radius: 4px; color: #475569; }
    .badge-sub.change { background: #e0e7ff; color: #4338ca; }
    .item-qty { font-size: 0.875rem; color: #64748b; font-weight: 500; }
    .item-subtotal { font-weight: 700; font-size: 0.9375rem; color: #0f172a; }
    .badge { padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .badge-success { background: #dcfce7; color: #15803d; }
    .badge-info { background: #e0f2fe; color: #0369a1; }
    .badge-warning { background: #fef3c7; color: #b45309; }
    .badge-danger { background: #fee2e2; color: #b91c1c; }
    .badge-primary { background: #e0e7ff; color: #4338ca; }
    .text-muted { color: var(--text-muted); }
    .spin-icon { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class BranchReturnsComponent implements OnInit {
  private returnsApi = inject(ReturnsApiService);
  private toast = inject(ToastService);
  private alertService = inject(AlertService);

  public solicitudes: SolicitudDevolucion[] = [];
  public loading: boolean = true;
  public estadoFiltro: EstadoSolicitudDevolucion | '' = '';

  // Modal detalle
  public isDetalleOpen = signal<boolean>(false);
  public detalle = signal<SolicitudDevolucion | null>(null);
  public cargandoDetalle = signal<boolean>(false);

  // Modal rechazo
  public isRechazoOpen = signal<boolean>(false);
  public rechazando: SolicitudDevolucion | null = null;
  public observacionesRechazo: string = '';
  public guardandoRechazo: boolean = false;

  // Acciones
  public procesandoReembolso: number | null = null;

  ngOnInit(): void {
    this.cargarSolicitudes();
  }

  cargarSolicitudes(): void {
    this.loading = true;
    this.returnsApi.getStaffRequests(this.estadoFiltro, null, 0, 50).subscribe({
      next: (data) => {
        this.solicitudes = data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando devoluciones:', err);
        this.toast.error('No se pudieron cargar las solicitudes de devolución.');
        this.loading = false;
      }
    });
  }

  verDetalle(id: number): void {
    this.isDetalleOpen.set(true);
    this.cargandoDetalle.set(true);
    this.detalle.set(null);

    this.returnsApi.getRequest(id).subscribe({
      next: (solicitud) => {
        this.detalle.set(solicitud);
        this.cargandoDetalle.set(false);
      },
      error: () => {
        this.cargandoDetalle.set(false);
        this.toast.error('No se pudo cargar el detalle de la solicitud.');
        this.isDetalleOpen.set(false);
      }
    });
  }

  cerrarDetalle(): void {
    this.isDetalleOpen.set(false);
    this.detalle.set(null);
  }

  abrirRechazo(solicitud: SolicitudDevolucion): void {
    this.rechazando = solicitud;
    this.observacionesRechazo = '';
    this.isRechazoOpen.set(true);
  }

  cerrarRechazo(): void {
    this.isRechazoOpen.set(false);
    this.rechazando = null;
    this.observacionesRechazo = '';
    this.guardandoRechazo = false;
  }

  async aprobar(solicitud: SolicitudDevolucion): Promise<void> {
    const confirmed = await this.alertService.confirm(
      '¿Aprobar solicitud?',
      `Se aprobará la solicitud ${solicitud.numero_solicitud}. Se procesará el cambio o reembolso según corresponda.`
    );

    if (!confirmed) return;

    this.returnsApi.reviewRequest(solicitud.id, { accion: 'APROBAR' }).subscribe({
      next: () => {
        this.toast.success(`Solicitud ${solicitud.numero_solicitud} aprobada.`);
        this.cargarSolicitudes();
      },
      error: (err) => {
        const mensaje = typeof err?.error?.detail === 'string'
          ? err.error.detail
          : 'No se pudo aprobar la solicitud.';
        this.alertService.error('Error al aprobar', mensaje);
      }
    });
  }

  confirmarRechazo(): void {
    if (!this.rechazando || !this.observacionesRechazo.trim()) {
      this.toast.warning('Las observaciones son obligatorias al rechazar una solicitud.');
      return;
    }

    this.guardandoRechazo = true;
    this.returnsApi.reviewRequest(this.rechazando.id, {
      accion: 'RECHAZAR',
      observaciones: this.observacionesRechazo.trim()
    }).subscribe({
      next: () => {
        this.toast.success(`Solicitud ${this.rechazando?.numero_solicitud} rechazada.`);
        this.cerrarRechazo();
        this.cargarSolicitudes();
      },
      error: (err) => {
        this.guardandoRechazo = false;
        const mensaje = typeof err?.error?.detail === 'string'
          ? err.error.detail
          : 'No se pudo rechazar la solicitud.';
        this.alertService.error('Error al rechazar', mensaje);
      }
    });
  }

  reintentarReembolso(solicitud: SolicitudDevolucion): void {
    this.procesandoReembolso = solicitud.id;
    this.returnsApi.processRefund(solicitud.id).subscribe({
      next: (actualizada) => {
        this.procesandoReembolso = null;
        this.toast.success(`Reembolso procesado: ${actualizada.estado}`);
        this.cargarSolicitudes();
      },
      error: (err) => {
        this.procesandoReembolso = null;
        const mensaje = typeof err?.error?.detail === 'string'
          ? err.error.detail
          : 'No se pudo procesar el reembolso.';
        this.alertService.error('Error en reembolso', mensaje);
      }
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
        return 'badge-primary';
    }
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
}
