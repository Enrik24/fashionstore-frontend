import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { computed } from '@angular/core';
import { ReturnsApiService } from '../../../../core/services/returns-api.service';
import { OrderService } from '../../../../core/services/order.service';
import { CatalogApiService } from '../../../../core/services/catalog-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AlertService } from '../../../../core/services/alert.service';
import { Orden, DetalleOrden } from '../../../../core/models/cart.model';
import { VarianteProducto } from '../../../../core/models/catalog.model';
import {
  SolicitudDevolucionCreateDto,
  TipoSolicitudDevolucion,
  MotivoDevolucion,
  TIPOS_SOLICITUD,
  MOTIVOS_DEVOLUCION
} from '../../../../core/models/return.model';

interface ItemSeleccionado {
  detalle: DetalleOrden;
  seleccionado: boolean;
  cantidad: number;
  varianteCambioId: number | null;
  variantesDisponibles: VarianteProducto[] | null;
  cargandoVariantes: boolean;
}

@Component({
  selector: 'app-request-return',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="request-return-page animate-fade-in">
      <div class="page-header">
        <a routerLink="/profile/orders" class="back-link">
          <i class="ri-arrow-left-line"></i> Volver a Mis Compras
        </a>
        <h1 class="page-title">
          <i class="ri-arrow-go-back-line"></i> Solicitar Devolución o Cambio
        </h1>
        @if (orden()) {
          <p class="page-subtitle">Orden #{{ orden()!.numero_orden || orden()!.id }} · Total Bs. {{ orden()!.total | number:'1.2-2' }}</p>
        }
      </div>

      @if (loading()) {
        <div class="loading-state card">
          <i class="ri-loader-4-line spin-icon"></i>
          <span>Cargando la información de tu orden de compra...</span>
        </div>
      } @else if (!orden()) {
        <div class="empty-state card">
          <i class="ri-error-warning-line empty-icon"></i>
          <h3>No se pudo cargar la orden</h3>
          <p>La orden no existe o no tienes permiso para verla.</p>
          <a routerLink="/profile/orders" class="btn btn-accent">Volver a Mis Compras</a>
        </div>
      } @else {
        <!-- Indicador de pasos -->
        <div class="steps-indicator">
          @for (paso of pasosWizard; track paso.numero) {
            <div
              class="step-chip"
              [class.active]="pasoActual() === paso.numero"
              [class.done]="pasoActual() > paso.numero"
            >
              <span class="step-number">
                @if (pasoActual() > paso.numero) {
                  <i class="ri-check-line"></i>
                } @else {
                  {{ paso.numero }}
                }
              </span>
              <span class="step-label">{{ paso.etiqueta }}</span>
            </div>
          }
        </div>

        <!-- Paso 1: seleccionar prendas -->
        @if (pasoActual() === 1) {
          <div class="step-card card">
            <h3 class="step-title"><i class="ri-checkbox-multiple-line"></i> Paso 1 — Selecciona las prendas</h3>
            <p class="step-hint">Marca las prendas que deseas devolver o cambiar e indica la cantidad.</p>

            @for (item of itemsSeleccionados(); track item.detalle.id) {
              <div class="selectable-item" [class.selected]="item.seleccionado">
                <label class="item-check-row">
                  <input
                    type="checkbox"
                    [checked]="item.seleccionado"
                    (change)="toggleItem(item, $event)"
                  />
                  <div class="item-info">
                    <span class="item-name">{{ getNombreDetalle(item.detalle) }}</span>
                    <div class="item-variants">
                      @if (getTallaDetalle(item.detalle)) { <span class="badge-sub">Talla: {{ getTallaDetalle(item.detalle) }}</span> }
                      @if (getColorDetalle(item.detalle)) { <span class="badge-sub">Color: {{ getColorDetalle(item.detalle) }}</span> }
                    </div>
                  </div>
                  <div class="item-subtotal">
                    Bs. {{ item.detalle.subtotal | number:'1.2-2' }}
                  </div>
                </label>

                @if (item.seleccionado) {
                  <div class="qty-row">
                    <span class="qty-label">Cantidad a devolver:</span>
                    <div class="qty-picker">
                      <button type="button" class="btn-qty" [disabled]="item.cantidad <= 1" (click)="cambiarCantidad(item, -1)">-</button>
                      <span class="qty-val">{{ item.cantidad }} / {{ item.detalle.cantidad }}</span>
                      <button type="button" class="btn-qty" [disabled]="item.cantidad >= item.detalle.cantidad" (click)="cambiarCantidad(item, 1)">+</button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Paso 2: tipo y motivo -->
        @if (pasoActual() === 2) {
          <div class="step-card card">
            <h3 class="step-title"><i class="ri-file-list-3-line"></i> Paso 2 — Tipo y motivo</h3>

            <div class="form-group">
              <label class="form-label">Tipo de solicitud <span class="required">*</span></label>
              <div class="type-grid">
                @for (tipo of tiposSolicitud; track tipo.value) {
                  <label class="type-option" [class.selected]="tipoSolicitud() === tipo.value">
                    <input
                      type="radio"
                      name="tipoSolicitud"
                      [value]="tipo.value"
                      [checked]="tipoSolicitud() === tipo.value"
                      (change)="cambiarTipoSolicitud(tipo.value)"
                      class="hidden-radio"
                    />
                    <span>{{ tipo.label }}</span>
                  </label>
                }
              </div>
            </div>

            <div class="grid grid-cols-2 form-row">
              <div class="form-group">
                <label class="form-label" for="rr-motivo">Motivo <span class="required">*</span></label>
                <select
                  id="rr-motivo"
                  class="form-control"
                  [value]="motivo()"
                  (change)="motivo.set(obtenerValorSelect($event))"
                >
                  @for (m of motivosDisponibles; track m.value) {
                    <option [value]="m.value">{{ m.label }}</option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="rr-detalle">Detalle del motivo</label>
                <input
                  id="rr-detalle"
                  type="text"
                  class="form-control"
                  [(ngModel)]="motivoDetalle"
                  placeholder="Ej. La talla M me quedó pequeña"
                />
              </div>
            </div>

            <!-- PASO2_CAMBIO_PLACEHOLDER -->

            @if (tipoSolicitud() === 'CAMBIO') {
              <div class="cambio-section">
                <h4 class="sub-title"><i class="ri-exchange-line"></i> Nueva variante deseada</h4>
                <p class="step-hint">Selecciona la nueva talla/color para cada prenda seleccionada.</p>

                @for (item of itemsMarcados(); track item.detalle.id) {
                  <div class="cambio-row">
                    <span class="cambio-producto">{{ getNombreDetalle(item.detalle) }}</span>

                    @if (item.cargandoVariantes) {
                      <span class="text-xs text-muted"><i class="ri-loader-4-line spin-icon"></i> Buscando variantes disponibles...</span>
                    } @else if (item.variantesDisponibles && item.variantesDisponibles.length > 0) {
                      <select
                        class="form-control"
                        [value]="item.varianteCambioId ?? ''"
                        (change)="seleccionarVarianteCambio(item, $event)"
                      >
                        <option value="">-- Selecciona nueva variante --</option>
                        @for (variante of item.variantesDisponibles; track variante.id) {
                          <option [value]="variante.id">{{ getEtiquetaVariante(variante) }}</option>
                        }
                      </select>
                    } @else {
                      <div class="no-variants-warning">
                        <i class="ri-information-line"></i>
                        <span>No se encontraron otras tallas o colores para este producto. Si deseas la restitución del dinero, selecciona la opción superior <strong>"Devolución (reembolso)"</strong>.</span>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Paso 3: resumen y confirmación -->
        @if (pasoActual() === 3) {
          <div class="step-card card">
            <h3 class="step-title"><i class="ri-file-check-line"></i> Paso 3 — Resumen y confirmación</h3>

            <div class="summary-meta-grid">
              <div>
                <span class="detail-label">Tipo de solicitud:</span>
                <span class="detail-val">{{ tipoSolicitud() === 'CAMBIO' ? 'Cambio por otra talla/color' : 'Devolución con reembolso' }}</span>
              </div>
              <div>
                <span class="detail-label">Motivo:</span>
                <span class="detail-val">{{ etiquetaMotivo() }}</span>
              </div>
              @if (motivoDetalle.trim()) {
                <div class="col-span-2">
                  <span class="detail-label">Detalle:</span>
                  <span class="detail-val">{{ motivoDetalle }}</span>
                </div>
              }
              <div>
                <span class="detail-label">Monto estimado de reembolso:</span>
                <span class="detail-val font-bold">Bs. {{ montoEstimado() | number:'1.2-2' }}</span>
              </div>
            </div>

            @for (item of itemsMarcados(); track item.detalle.id) {
              <div class="summary-item">
                <span class="summary-qty">x{{ item.cantidad }}</span>
                <div class="summary-info">
                  <span class="summary-name">{{ getNombreDetalle(item.detalle) }}</span>
                  @if (tipoSolicitud() === 'CAMBIO') {
                    <span class="summary-change">→ Nueva variante: {{ etiquetaVarianteCambio(item) }}</span>
                  }
                </div>
                <span class="summary-subtotal">Bs. {{ (item.detalle.precio_unitario * item.cantidad) | number:'1.2-2' }}</span>
              </div>
            }

            <div class="confirm-note">
              <i class="ri-information-line"></i>
              <span>Al enviar la solicitud, el personal de la sucursal será notificado para revisarla. Podrás seguir su estado en "Mis Devoluciones".</span>
            </div>
          </div>
        }

        <div class="wizard-nav">
          @if (pasoActual() > 1) {
            <button class="btn btn-outline" (click)="pasoAnterior()">
              <i class="ri-arrow-left-line"></i> Anterior
            </button>
          } @else {
            <a routerLink="/profile/orders" class="btn btn-outline">
              <i class="ri-close-line"></i> Cancelar
            </a>
          }

          @if (pasoActual() < 3) {
            <button class="btn btn-accent" [disabled]="!puedeAvanzar()" (click)="pasoSiguiente()">
              Siguiente <i class="ri-arrow-right-line"></i>
            </button>
          } @else {
            <button class="btn btn-accent" [disabled]="enviando()" (click)="enviarSolicitud()">
              @if (enviando()) {
                <i class="ri-loader-4-line spin-icon"></i> Enviando...
              } @else {
                <i class="ri-send-plane-line"></i> Enviar solicitud
              }
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .request-return-page { display: flex; flex-direction: column; gap: 1.5rem; max-width: 960px; margin: 0 auto; }
    .page-header { display: flex; flex-direction: column; gap: 0.35rem; }
    .back-link { display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 600; color: var(--secondary); font-size: 0.875rem; }
    .back-link:hover { color: var(--accent); }
    .page-title { font-size: 1.6rem; font-weight: 800; color: var(--primary); display: flex; align-items: center; gap: 0.6rem; margin: 0; }
    .page-title i { color: var(--accent); }
    .page-subtitle { color: var(--text-muted); font-size: 0.875rem; }
    .loading-state, .empty-state { display: flex; align-items: center; justify-content: center; gap: 0.75rem; padding: 3rem; color: var(--text-muted); flex-direction: column; text-align: center; }
    .empty-icon { font-size: 2.5rem; color: #cbd5e1; }
    .steps-indicator { display: flex; gap: 0.6rem; flex-wrap: wrap; }
    .step-chip { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.85rem; border-radius: 999px; background: #f1f5f9; color: #64748b; font-size: 0.8125rem; font-weight: 600; }
    .step-number { width: 22px; height: 22px; border-radius: 50%; background: #cbd5e1; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; }
    .step-chip.active { background: #fff5f7; color: var(--accent); }
    .step-chip.active .step-number { background: var(--accent); }
    .step-chip.done { background: #dcfce7; color: #15803d; }
    .step-chip.done .step-number { background: #15803d; }
    .step-card { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .step-title { font-size: 1.1rem; font-weight: 800; color: var(--primary); display: flex; align-items: center; gap: 0.5rem; margin: 0; }
    .step-hint { font-size: 0.8125rem; color: var(--text-muted); margin: 0; }
    .sub-title { font-size: 0.95rem; font-weight: 700; color: var(--primary); margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.4rem; }
    .selectable-item { border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.6rem; }
    .selectable-item.selected { border-color: var(--accent); background: #fffafb; }
    .item-check-row { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; }
    .item-check-row input[type="checkbox"] { width: 1.1rem; height: 1.1rem; accent-color: var(--accent); }
    .item-info { flex: 1; }
    .item-name { font-weight: 600; font-size: 0.9rem; color: #0f172a; }
    .item-variants { display: flex; gap: 0.35rem; margin-top: 0.2rem; flex-wrap: wrap; }
    .badge-sub { font-size: 0.7rem; background: #e2e8f0; padding: 0.1rem 0.35rem; border-radius: 4px; color: #475569; }
    .item-subtotal { font-weight: 700; font-size: 0.95rem; color: #0f172a; }
    .qty-row { display: flex; align-items: center; gap: 0.75rem; padding-left: 1.85rem; }
    .qty-label { font-size: 0.75rem; color: var(--text-muted); }
    .qty-picker { display: flex; align-items: center; gap: 0.4rem; }
    .btn-qty { width: 28px; height: 28px; border-radius: 8px; border: 1px solid #e2e8f0; background: white; cursor: pointer; font-weight: 700; }
    .btn-qty:disabled { opacity: 0.5; cursor: not-allowed; }
    .qty-val { font-size: 0.8125rem; font-weight: 600; }
    .type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
    .type-option { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; border: 1.5px solid #e2e8f0; border-radius: 10px; cursor: pointer; font-size: 0.875rem; font-weight: 600; color: #475569; background: white; }
    .type-option.selected { border-color: var(--accent); background: #fff5f7; color: var(--accent); }
    .hidden-radio { display: none; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .cambio-section { border-top: 1px solid #f1f5f9; padding-top: 1rem; }
    .cambio-row { display: flex; flex-direction: column; gap: 0.35rem; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.75rem; margin-bottom: 0.6rem; }
    .cambio-producto { font-size: 0.875rem; font-weight: 600; color: #0f172a; }
    .text-xs { font-size: 0.75rem; }
    .text-muted { color: var(--text-muted); }
    .summary-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.875rem; background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0; }
    .col-span-2 { grid-column: span 2; }
    .detail-label { color: #64748b; font-size: 0.75rem; display: block; }
    .detail-val { color: #0f172a; }
    .detail-val.font-bold { font-weight: 700; }
    .summary-item { display: flex; align-items: center; gap: 1rem; padding: 0.6rem 0; border-bottom: 1px solid #f1f5f9; }
    .summary-item:last-of-type { border-bottom: none; }
    .summary-qty { font-weight: 700; color: var(--primary); }
    .summary-info { flex: 1; display: flex; flex-direction: column; gap: 0.15rem; }
    .summary-name { font-weight: 600; font-size: 0.9rem; color: #0f172a; }
    .summary-change { font-size: 0.75rem; color: #4338ca; }
    .summary-subtotal { font-weight: 700; color: #0f172a; }
    .confirm-note { display: flex; align-items: flex-start; gap: 0.5rem; background: #f1f5f9; color: #475569; border-radius: 10px; padding: 0.75rem 1rem; font-size: 0.8125rem; }
    .no-variants-warning { display: flex; align-items: flex-start; gap: 0.5rem; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 0.6rem 0.8rem; border-radius: 8px; font-size: 0.78rem; line-height: 1.4; }
    .wizard-nav { display: flex; align-items: center; justify-content: space-between; }
    .spin-icon { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    @media (max-width: 768px) {
      .form-row, .type-grid, .summary-meta-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class RequestReturnComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private returnsApi = inject(ReturnsApiService);
  private orderService = inject(OrderService);
  private catalogApi = inject(CatalogApiService);
  private toast = inject(ToastService);
  private alertService = inject(AlertService);

  public orden = signal<Orden | null>(null);
  public loading = signal<boolean>(true);
  public enviando = signal<boolean>(false);
  public pasoActual = signal<number>(1);

  public itemsSeleccionados = signal<ItemSeleccionado[]>([]);
  public tipoSolicitud = signal<TipoSolicitudDevolucion>('DEVOLUCION');
  public motivo = signal<MotivoDevolucion>('TALLA_INCORRECTA');
  public motivoDetalle: string = '';

  public tiposSolicitud = TIPOS_SOLICITUD;
  public motivosDisponibles = MOTIVOS_DEVOLUCION;

  public pasosWizard = [
    { numero: 1, etiqueta: 'Prendas' },
    { numero: 2, etiqueta: 'Tipo y motivo' },
    { numero: 3, etiqueta: 'Confirmar' }
  ];

  public itemsMarcados = computed(() =>
    this.itemsSeleccionados().filter(item => item.seleccionado)
  );

  public montoEstimado = computed(() =>
    this.itemsMarcados().reduce(
      (acc, item) => acc + (Number(item.detalle.precio_unitario) * item.cantidad), 0
    )
  );

  public etiquetaMotivo = computed(() =>
    this.motivosDisponibles.find(m => m.value === this.motivo())?.label || this.motivo()
  );

  ngOnInit(): void {
    const orderId = Number(this.route.snapshot.paramMap.get('orderId'));
    if (!orderId) {
      this.loading.set(false);
      return;
    }
    this.cargarOrden(orderId);
  }

  cargarOrden(orderId: number): void {
    this.loading.set(true);
    this.orderService.getOrderById(orderId).subscribe({
      next: (orden) => {
        this.orden.set(orden);
        this.itemsSeleccionados.set((orden.detalles || []).map(detalle => ({
          detalle,
          seleccionado: false,
          cantidad: 1,
          varianteCambioId: null,
          variantesDisponibles: null,
          cargandoVariantes: false
        })));
        this.loading.set(false);
      },
      error: () => {
        this.orden.set(null);
        this.loading.set(false);
        this.toast.error('No se pudo cargar la orden para la devolución.');
      }
    });
  }

  /** Paso 1: mínimo una prenda seleccionada. Paso 2: nueva variante obligatoria si es CAMBIO. */
  puedeAvanzar(): boolean {
    if (this.pasoActual() === 1) {
      return this.itemsMarcados().length > 0;
    }
    if (this.pasoActual() === 2) {
      const marcados = this.itemsMarcados();
      if (marcados.length === 0) return false;
      if (this.tipoSolicitud() === 'CAMBIO') {
        return marcados.every(item => !!item.varianteCambioId);
      }
      return true;
    }
    return true;
  }

  cambiarTipoSolicitud(tipo: TipoSolicitudDevolucion): void {
    this.tipoSolicitud.set(tipo);
    if (tipo === 'CAMBIO') {
      this.itemsMarcados().forEach(item => {
        if (item.variantesDisponibles === null && !item.cargandoVariantes) {
          this.precargarVariantes(item.detalle.id);
        }
      });
    }
  }

  pasoSiguiente(): void {
    if (!this.puedeAvanzar()) {
      if (this.pasoActual() === 1) {
        this.toast.warning('Selecciona al menos una prenda para continuar.');
      } else {
        this.toast.warning('Selecciona la nueva variante para cada prenda a cambiar.');
      }
      return;
    }
    const nuevoPaso = Math.min(3, this.pasoActual() + 1);
    this.pasoActual.set(nuevoPaso);
    if (nuevoPaso === 2 && this.tipoSolicitud() === 'CAMBIO') {
      this.itemsMarcados().forEach(item => {
        if (item.variantesDisponibles === null && !item.cargandoVariantes) {
          this.precargarVariantes(item.detalle.id);
        }
      });
    }
  }

  pasoAnterior(): void {
    this.pasoActual.update(paso => Math.max(1, paso - 1));
  }

  toggleItem(item: ItemSeleccionado, event: Event): void {
    const seleccionado = (event.target as HTMLInputElement).checked;
    this.itemsSeleccionados.update(lista =>
      lista.map(x => x.detalle.id === item.detalle.id
        ? { ...x, seleccionado, varianteCambioId: seleccionado ? x.varianteCambioId : null }
        : x
      )
    );

    if (seleccionado && this.tipoSolicitud() === 'CAMBIO') {
      this.precargarVariantes(item.detalle.id);
    }
  }

  cambiarCantidad(item: ItemSeleccionado, delta: number): void {
    this.itemsSeleccionados.update(lista =>
      lista.map(x => {
        if (x.detalle.id !== item.detalle.id) return x;
        const maximo = x.detalle.cantidad || 1;
        const nueva = Math.min(maximo, Math.max(1, x.cantidad + delta));
        return { ...x, cantidad: nueva };
      })
    );
  }

  /** Carga las variantes del producto para ofrecer el cambio (excluye la variante original). */
  precargarVariantes(detalleId: number): void {
    const item = this.itemsSeleccionados().find(x => x.detalle.id === detalleId);
    if (!item || item.variantesDisponibles !== null || item.cargandoVariantes) return;

    const productoId = item.detalle.variante_producto?.producto_id || (item.detalle.variante_producto as any)?.producto?.id;
    if (!productoId) return;

    const varianteActualId = item.detalle.variante_producto_id || item.detalle.variante_producto?.id;

    this.itemsSeleccionados.update(lista =>
      lista.map(x => x.detalle.id === detalleId ? { ...x, cargandoVariantes: true } : x)
    );

    this.catalogApi.getProductVariants(productoId).subscribe({
      next: (variantes) => {
        const disponibles = (variantes || []).filter(v => v.id !== varianteActualId);
        this.itemsSeleccionados.update(lista =>
          lista.map(x => x.detalle.id === detalleId
            ? { ...x, variantesDisponibles: disponibles, cargandoVariantes: false }
            : x
          )
        );
      },
      error: (err) => {
        console.error('Error al obtener variantes para cambio:', err);
        this.itemsSeleccionados.update(lista =>
          lista.map(x => x.detalle.id === detalleId
            ? { ...x, variantesDisponibles: [], cargandoVariantes: false }
            : x
          )
        );
      }
    });
  }

  seleccionarVarianteCambio(item: ItemSeleccionado, event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    const varianteId = raw ? Number(raw) : null;
    this.itemsSeleccionados.update(lista =>
      lista.map(x => x.detalle.id === item.detalle.id ? { ...x, varianteCambioId: varianteId } : x)
    );
  }

  obtenerValorSelect(event: Event): MotivoDevolucion {
    return (event.target as HTMLSelectElement).value as MotivoDevolucion;
  }

  getNombreDetalle(detalle: DetalleOrden): string {
    return detalle.variante_producto?.producto?.nombre || 'Prenda FashionStore';
  }

  getTallaDetalle(detalle: DetalleOrden): string | null {
    return detalle.variante_producto?.talla?.valor || detalle.variante_producto?.talla?.nombre || null;
  }

  getColorDetalle(detalle: DetalleOrden): string | null {
    return detalle.variante_producto?.color?.nombre || null;
  }

  getEtiquetaVariante(variante: VarianteProducto): string {
    const talla = variante.talla?.valor || variante.talla?.nombre || 'Única';
    const color = variante.color?.nombre || 'Estándar';
    const sku = variante.sku_variante ? ` · ${variante.sku_variante}` : '';
    return `${talla} / ${color}${sku}`;
  }

  etiquetaVarianteCambio(item: ItemSeleccionado): string {
    if (!item.varianteCambioId) return 'Sin seleccionar';
    const variante = (item.variantesDisponibles || []).find(v => v.id === item.varianteCambioId);
    return variante ? this.getEtiquetaVariante(variante) : `Variante #${item.varianteCambioId}`;
  }

  async enviarSolicitud(): Promise<void> {
    const ordenActual = this.orden();
    const marcados = this.itemsMarcados();

    if (!ordenActual || marcados.length === 0) {
      this.toast.warning('Selecciona al menos una prenda para enviar la solicitud.');
      return;
    }

    if (this.tipoSolicitud() === 'CAMBIO' && marcados.some(item => !item.varianteCambioId)) {
      this.toast.warning('Selecciona la nueva variante para cada prenda a cambiar.');
      return;
    }

    const dto: SolicitudDevolucionCreateDto = {
      orden_id: ordenActual.id,
      sucursal_id: ordenActual.sucursal_id ?? null,
      tipo: this.tipoSolicitud(),
      motivo: this.motivo(),
      motivo_detalle: this.motivoDetalle?.trim() ? this.motivoDetalle.trim() : null,
      items: marcados.map(item => ({
        detalle_orden_id: item.detalle.id,
        cantidad: item.cantidad,
        variante_cambio_id: item.varianteCambioId
      }))
    };

    this.enviando.set(true);

    this.returnsApi.createRequest(dto).subscribe({
      next: (solicitud) => {
        this.enviando.set(false);
        this.alertService.success(
          'Solicitud registrada',
          `Tu solicitud ${solicitud.numero_solicitud} fue registrada. El personal de la sucursal será notificado.`
        );
        this.router.navigate(['/profile/returns']);
      },
      error: (err) => {
        this.enviando.set(false);
        const mensaje = typeof err?.error?.detail === 'string'
          ? err.error.detail
          : 'No se pudo registrar la solicitud de devolución.';
        this.alertService.error('No se pudo registrar la solicitud', mensaje);
      }
    });
  }
}
