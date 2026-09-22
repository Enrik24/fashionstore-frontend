import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProfileService } from '../../../../core/services/profile.service';
import { OrderService } from '../../../../core/services/order.service';
import { ToastService } from '../../../../core/services/toast.service';
import { OrderHistoryItem } from '../../../../core/models/profile.model';

@Component({
  selector: 'app-orders-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="orders-container animate-fade-in">
      <div class="section-header">
        <div>
          <h2 class="section-title">Historial de Mis Compras</h2>
          <p class="section-subtitle">Revisa el detalle de tus pedidos online y compras presenciales</p>
        </div>
        <button class="btn btn-secondary btn-sm" (click)="cargarHistorial()">
          <i class="ri-refresh-line"></i> Actualizar
        </button>
      </div>

      @if (loading()) {
        <div class="loading-state card">
          <i class="ri-loader-4-line ri-spin"></i>
          <span>Cargando tus órdenes de compra...</span>
        </div>
      } @else {
        <div class="orders-list">
          @for (order of orders(); track order.id) {
            <div class="card order-card">
              <div class="order-header" (click)="toggleOrderExpand(order.id)">
                <div class="order-main-info">
                  <div class="order-icon-box">
                    <i class="ri-shopping-bag-3-fill"></i>
                  </div>
                  <div>
                    <div class="order-code">
                      Orden #{{ order.numero_orden || order.codigo || order.id }}
                    </div>
                    <div class="order-date">
                      <i class="ri-calendar-line"></i> {{ (order.fecha || order.created_at) | date:'dd/MM/yyyy HH:mm' }}
                    </div>
                  </div>
                </div>

                <div class="order-summary-meta">
                  <div class="order-price">
                    <span class="price-label">Total:</span>
                    <span class="price-val">Bs. {{ (order.total || 0) | number:'1.2-2' }}</span>
                  </div>
                  <span class="badge" [ngClass]="getStatusClass(order.estado)">
                    {{ order.estado }}
                  </span>
                  <i class="ri-arrow-down-s-line chevron" [class.rotated]="expandedOrders().has(order.id)"></i>
                </div>
              </div>

              <!-- Expanded Details -->
              @if (expandedOrders().has(order.id)) {
                <div class="order-body animate-fade-in">
              <!-- Acciones de la orden (CU26 / CU28) -->
              <div class="order-actions">
                <button
                  class="btn btn-outline-accent btn-sm"
                  [disabled]="!esOrdenDevolvible(order)"
                  [title]="esOrdenDevolvible(order) ? 'Solicitar devolución o cambio de prendas' : tituloNoDevolvible(order)"
                  (click)="irASolicitarDevolucion(order)"
                >
                  <i class="ri-arrow-go-back-line"></i> Solicitar devolución/cambio
                </button>
                @if (!esOrdenDevolvible(order)) {
                  <span class="action-hint">{{ tituloNoDevolvible(order) }}</span>
                }
              </div>
                  <!-- Comprobante Section -->
                  @if (order.comprobante) {
                    <div class="comprobante-section">
                      <div class="comprobante-header">
                        <i class="ri-file-text-line"></i>
                        <span class="comprobante-title">Comprobante de Pago</span>
                      </div>
                      <div class="comprobante-details">
                        <div class="comprobante-info">
                          <div class="comprobante-item">
                            <span class="comprobante-label">Número:</span>
                            <span class="comprobante-number">{{ order.comprobante.numero }}</span>
                          </div>
                          <div class="comprobante-item">
                            <span class="comprobante-label">Tipo:</span>
                            <span class="badge-comprobante">{{ order.comprobante.tipo }}</span>
                          </div>
                          <div class="comprobante-item">
                            <span class="comprobante-label">Fecha:</span>
                            <span>{{ order.comprobante.fecha_emision | date:'dd/MM/yyyy HH:mm' }}</span>
                          </div>
                        </div>
                        <button class="btn btn-primary btn-sm" (click)="descargarComprobante(order.id)">
                          <i class="ri-download-2-line"></i> Descargar PDF
                        </button>
                      </div>
                    </div>
                  }

                  <div class="order-details-grid">
                    <div>
                      <span class="detail-label">Método de Pago:</span>
                      <span class="detail-val font-medium">{{ order.metodo_pago || 'Pago QR / Tarjeta' }}</span>
                    </div>
                    <div>
                      <span class="detail-label">Tipo de Entrega:</span>
                      <span class="detail-val font-medium">{{ order.tipo_entrega || 'Envío a Domicilio' }}</span>
                    </div>
                    @if (order.direccion_envio) {
                      <div class="col-span-2">
                        <span class="detail-label">Dirección de Entrega:</span>
                        <span class="detail-val">{{ order.direccion_envio }}</span>
                      </div>
                    }
                  </div>

                  <div class="order-items-list mt-3">
                    <h4 class="items-title">Prendas en esta orden:</h4>
                    <div class="items-table">
                      @for (item of getOrderItems(order); track item.id || $index) {
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
                          <div class="item-subtotal">
                            Bs. {{ (item.subtotal || (item.precio_unitario * item.cantidad) || 0) | number:'1.2-2' }}
                          </div>
                          @if (esOrdenValorable(order) && getProductoId(item)) {
                            <div class="item-action">
                              <button
                                class="btn btn-sm btn-outline-accent"
                                title="Valorar este producto"
                                (click)="irAValorar(item); $event.stopPropagation()"
                              >
                                <i class="ri-star-line"></i> Valorar
                              </button>
                            </div>
                          }
                        </div>
                      } @empty {
                        <p class="text-sm text-muted py-2">Detalle de prendas no disponible.</p>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          } @empty {
            <div class="card empty-card">
              <i class="ri-shopping-basket-line text-4xl text-muted mb-2"></i>
              <h3>Aún no tienes compras realizadas</h3>
              <p class="text-muted">Explora nuestras últimas colecciones de moda y realiza tu primer pedido.</p>
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
    .orders-container { max-width: 900px; margin: 0 auto; }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .section-title { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0; }
    .section-subtitle { font-size: 0.875rem; color: #64748b; margin: 0.25rem 0 0 0; }
    .orders-list { display: flex; flex-direction: column; gap: 1rem; }
    .order-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .order-header {
      padding: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
      transition: background 0.2s;
    }
    .order-header:hover { background: #f8fafc; }
    .order-main-info { display: flex; align-items: center; gap: 1rem; }
    .order-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #e0e7ff;
      color: #4338ca;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }
    .order-code { font-weight: 700; font-size: 1rem; color: #0f172a; }
    .order-date { font-size: 0.8125rem; color: #64748b; margin-top: 0.2rem; display: flex; align-items: center; gap: 0.3rem; }
    .order-summary-meta { display: flex; align-items: center; gap: 1.25rem; }
    .order-price { display: flex; flex-direction: column; align-items: flex-end; }
    .price-label { font-size: 0.75rem; color: #64748b; }
    .price-val { font-weight: 800; font-size: 1.125rem; color: #0f172a; }
    .chevron { font-size: 1.25rem; color: #94a3b8; transition: transform 0.2s; }
    .chevron.rotated { transform: rotate(180deg); }
    .order-body {
      padding: 1.25rem;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }
    .order-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      font-size: 0.875rem;
      background: #ffffff;
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .detail-label { color: #64748b; font-size: 0.75rem; display: block; }
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
    .item-variants { display: flex; gap: 0.35rem; margin-top: 0.2rem; }
    .badge-sub { font-size: 0.7rem; background: #e2e8f0; padding: 0.1rem 0.35rem; border-radius: 4px; color: #475569; }
    .item-qty { font-size: 0.875rem; color: #64748b; font-weight: 500; }
    .item-subtotal { font-weight: 700; font-size: 0.9375rem; color: #0f172a; }
    .item-action { margin-left: auto; display: flex; align-items: center; }

    /* CU26 / CU28: acciones por orden */
    .order-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
      padding: 0.6rem 0.75rem;
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
    }

    .action-hint { font-size: 0.75rem; color: #94a3b8; }
    .badge { padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .badge-success { background: #dcfce7; color: #15803d; }
    .badge-warning { background: #fef3c7; color: #b45309; }
    .badge-danger { background: #fee2e2; color: #b91c1c; }
    .badge-neutral { background: #f1f5f9; color: #475569; }
    .empty-card { text-align: center; padding: 4rem 1.5rem; display: flex; flex-direction: column; align-items: center; }
    .loading-state { text-align: center; padding: 3rem; color: #64748b; display: flex; align-items: center; justify-content: center; gap: 0.75rem; }

    /* Estilos del comprobante */
    .comprobante-section {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 10px;
      padding: 1.25rem;
      margin-bottom: 1rem;
      color: white;
    }
    .comprobante-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      font-size: 0.9375rem;
      margin-bottom: 0.75rem;
    }
    .comprobante-header i { font-size: 1.25rem; }
    .comprobante-title { text-transform: uppercase; letter-spacing: 0.5px; }
    .comprobante-details {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .comprobante-info {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .comprobante-item {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .comprobante-label {
      font-size: 0.7rem;
      opacity: 0.85;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .comprobante-number {
      font-weight: 700;
      font-size: 1.125rem;
      letter-spacing: 0.5px;
    }
    .badge-comprobante {
      background: rgba(255, 255, 255, 0.2);
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      backdrop-filter: blur(10px);
    }
    .comprobante-details .btn {
      background: white;
      color: #667eea;
      border: none;
      font-weight: 600;
      white-space: nowrap;
    }
    .comprobante-details .btn:hover {
      background: #f8fafc;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  `]
})
export class OrdersHistoryComponent implements OnInit {
  private profileService = inject(ProfileService);
  private orderService = inject(OrderService);
  private router = inject(Router);
  private toast = inject(ToastService);

  /** Plazo máximo en días para solicitar devoluciones/cambios (CU28, espejo de `PLAZO_DEVOLUCION_DIAS` del backend). */
  public readonly PLAZO_DEVOLUCION_DIAS = 30;
  /** Estados de orden que permiten solicitar devoluciones y valorar productos (CU26/CU28). */
  private readonly ESTADOS_PERMITIDOS = ['PAGADO', 'EN_PROCESO', 'ENVIADO', 'ENTREGADO'];
  orders = signal<any[]>([]);
  loading = signal<boolean>(true);
  expandedOrders = signal<Set<number>>(new Set());

  ngOnInit(): void {
    this.cargarHistorial();
  }

  cargarHistorial() {
    this.loading.set(true);
    this.profileService.getPurchaseHistory().subscribe({
      next: (data) => {
        this.orders.set(data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  toggleOrderExpand(id: number) {
    this.expandedOrders.update(set => {
      const copy = new Set(set);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  }

  getOrderItems(order: any): any[] {
    return order.detalles || order.items || [];
  }

  getItemName(item: any): string {
    return item.variante_producto?.producto?.nombre || item.nombre_producto || 'Prenda FashionStore';
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

  getStatusClass(estado: string): string {
    const st = (estado || '').toUpperCase();
    if (st.includes('COMPLET') || st.includes('PAGAD') || st.includes('ENTREGAD')) return 'badge-success';
    if (st.includes('PENDIENT') || st.includes('PROCES')) return 'badge-warning';
    if (st.includes('CANCEL') || st.includes('RECHAZ')) return 'badge-danger';
    return 'badge-neutral';
  }

  descargarComprobante(ordenId: number): void {
    const url = this.orderService.getOrderReceiptPdfUrl(ordenId);
    window.open(url, '_blank');
  }

  /** ID del producto de un ítem de la orden (forma pública o admin de la API). */
  getProductoId(item: any): number | null {
    const id = item.variante_producto?.producto?.id ?? item.producto_id ?? null;
    return typeof id === 'number' ? id : null;
  }

  /** CU26: la orden puede valorarse si está pagada o en proceso de entrega. */
  esOrdenValorable(order: any): boolean {
    const estado = String(order?.estado || '').toUpperCase();
    return this.ESTADOS_PERMITIDOS.includes(estado);
  }

  /** CU28: la orden es devolvible si puede valorarse y aún está dentro del plazo de devolución. */
  esOrdenDevolvible(order: any): boolean {
    if (!this.esOrdenValorable(order)) return false;

    const fecha = order?.fecha || order?.created_at;
    if (!fecha) return false;

    const compra = new Date(fecha).getTime();
    if (!Number.isFinite(compra)) return false;

    const diasTranscurridos = (Date.now() - compra) / 86400000;
    return diasTranscurridos <= this.PLAZO_DEVOLUCION_DIAS;
  }

  /** CU28: mensaje informativo cuando la orden no admite devoluciones. */
  tituloNoDevolvible(order: any): string {
    if (!this.esOrdenValorable(order)) {
      return `Las devoluciones solo aplican para órdenes pagadas o en proceso de entrega (estado actual: ${order?.estado || 'desconocido'})`;
    }
    return `El plazo de devolución de ${this.PLAZO_DEVOLUCION_DIAS} días ya venció para esta orden`;
  }

  /** CU26: abre el detalle del producto directamente en la sección de valoraciones. */
  irAValorar(item: any): void {
    const productoId = this.getProductoId(item);
    if (!productoId) {
      this.toast.error('No se pudo identificar el producto a valorar.');
      return;
    }
    this.router.navigate(['/catalog', productoId], { fragment: 'reviews' });
  }

  /** CU28: abre el wizard de solicitud de devolución/cambio para la orden seleccionada. */
  irASolicitarDevolucion(order: any): void {
    if (!this.esOrdenDevolvible(order)) {
      this.toast.warning(this.tituloNoDevolvible(order));
      return;
    }
    this.router.navigate(['/profile/returns/new', order.id]);
  }
}
