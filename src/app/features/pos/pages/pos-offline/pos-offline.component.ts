import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PosService } from '../../../../core/services/pos.service';
import { OfflineCatalogService } from '../../../../core/offline/offline-catalog.service';
import { OfflineQueueService } from '../../../../core/offline/offline-queue.service';
import { OfflineDocumentService } from '../../../../core/offline/offline-document.service';
import { IndexedDbService } from '../../../../core/offline/indexed-db.service';
import { DeviceService } from '../../../../core/offline/device.service';
import { ConnectivityService } from '../../../../core/offline/connectivity.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { StorageService } from '../../../../core/services/storage.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Sucursal } from '../../../../core/models/branch.model';
import { VentaPresencialCreate } from '../../../../core/models/cart.model';
import {
  ComprobanteLocal,
  OrdenLocal,
  PayloadVentaContado,
  ProductoOffline,
  StockOffline,
  VarianteOffline
} from '../../../../core/models/offline.model';
import { SyncStatusBadgeComponent } from '../../../../shared/components/sync-status-badge/sync-status-badge.component';

interface LineaPosOffline {
  producto: ProductoOffline;
  variante: VarianteOffline;
  stock: StockOffline | null;
  cantidad: number;
}

/**
 * [EXAMEN-2] CU07: venta de contado sin conexión (modo de la terminal POS).
 * Catálogo local, cambio, UUID, descuento de stock no confirmado y
 * comprobante temporal con la leyenda de venta offline.
 */
@Component({
  selector: 'app-pos-offline',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SyncStatusBadgeComponent],
  template: `
    <div class="pos-offline-page">
      <div class="container pos-container">
        <header class="pos-head">
          <div>
            <span class="eyebrow"><i class="ri-store-3-line"></i> CU07 · POS sin conexión</span>
            <h1>Venta de contado offline</h1>
            <p>Opera con el catálogo local; la venta se sincroniza al recuperar la red.</p>
          </div>
          <div class="head-acciones">
            <app-sync-status-badge [estado]="enLinea() ? 'ONLINE' : 'SIN_RED'" [compacto]="true" />
            <a routerLink="/pos" class="btn btn-outline btn-sm"><i class="ri-arrow-left-line"></i> POS en línea</a>
          </div>
        </header>

        @if (!enLinea()) {
          <div class="aviso aviso-warning">
            <i class="ri-wifi-off-line"></i>
            <div>
              <strong>Modo offline activo</strong>
              <p>El stock mostrado es local y puede diferir del central. La venta quedará en la cola FIFO.</p>
            </div>
          </div>
        }

        @if (comprobante(); as comp) {
          <section class="card exito-card">
            <div class="exito-icon"><i class="ri-checkbox-circle-fill"></i></div>
            <h2>Venta registrada localmente</h2>
            <p>
              Comprobante temporal <strong>{{ comp.numero_temporal }}</strong> por
              Bs. {{ comp.total | number:'1.2-2' }}.
              Se reemplazará por el comprobante oficial al sincronizar.
            </p>
            <div class="exito-resumen">
              <span><i class="ri-fingerprint-line"></i> UUID {{ uuidVenta() | slice:0:12 }}…</span>
              <span class="badge badge-pending">En cola de sincronización</span>
            </div>
            <div class="comprobante-detalle">
              @for (linea of comp.detalle; track $index) {
                <span>{{ linea }}</span>
              }
            </div>
            <div class="exito-acciones">
              <button type="button" class="btn btn-outline btn-sm" (click)="imprimir(comp)">
                <i class="ri-printer-line"></i> Imprimir
              </button>
              <button type="button" class="btn btn-outline btn-sm" (click)="descargar(comp)">
                <i class="ri-download-2-line"></i> Descargar
              </button>
              <a routerLink="/offline/sincronizacion" class="btn btn-outline btn-sm">
                <i class="ri-loop-left-line"></i> Ver cola
              </a>
              <button type="button" class="btn btn-accent btn-sm" (click)="nuevaVenta()">
                <i class="ri-add-line"></i> Nueva venta
              </button>
            </div>
          </section>
        } @else {
          <div class="pos-grid">
            <section class="card catalogo-card">
              <div class="buscador">
                <i class="ri-search-line"></i>
                <input
                  class="form-control"
                  type="search"
                  placeholder="Buscar prenda en el catálogo local…"
                  [(ngModel)]="termino"
                  (ngModelChange)="buscar()"
                />
              </div>

              @if (cargando()) {
                <div class="estado"><i class="ri-loader-4-line spin-icon"></i> Buscando…</div>
              } @else if (productos().length === 0) {
                <div class="estado"><i class="ri-inbox-line"></i> Sin resultados locales.</div>
              } @else {
                <div class="productos-grid">
                  @for (producto of productos(); track producto.id) {
                    <button
                      type="button"
                      class="producto-card"
                      [class.selected]="productoSeleccionado()?.id === producto.id"
                      (click)="seleccionarProducto(producto)"
                    >
                      @if (producto.imagenes[0]) {
                        <img [src]="producto.imagenes[0]" [alt]="producto.nombre" />
                      } @else {
                        <span class="producto-placeholder"><i class="ri-t-shirt-2-line"></i></span>
                      }
                      <span class="producto-info">
                        <strong>{{ producto.nombre }}</strong>
                        <small>{{ producto.sku }}</small>
                        <span class="producto-precio">Bs. {{ producto.precio | number:'1.2-2' }}</span>
                      </span>
                    </button>
                  }
                </div>
              }

              @if (productoSeleccionado(); as producto) {
                <div class="variantes-box">
                  <h3>{{ producto.nombre }}</h3>
                  @if (cargandoVariantes()) {
                    <div class="estado"><i class="ri-loader-4-line spin-icon"></i> Cargando variantes…</div>
                  } @else {
                    <div class="variantes-grid">
                      @for (item of variantes(); track item.variante.id) {
                        <button
                          type="button"
                          class="variante-chip"
                          [class.selected]="varianteSeleccionadaId() === item.variante.id"
                          (click)="seleccionarVariante(item.variante, item.stock)"
                        >
                          <strong>{{ item.variante.talla || 'Única' }} · {{ item.variante.color || 'Sin color' }}</strong>
                          <span class="badge" [ngClass]="stockClase(item.stock)">{{ stockTexto(item.stock) }}</span>
                          <span class="variante-precio">Bs. {{ precioVariante(item.variante, producto) | number:'1.2-2' }}</span>
                        </button>
                      }
                    </div>
                  }
                </div>
              }
            </section>

            <section class="card ticket-card">
              <div class="ticket-head">
                <h2><i class="ri-shopping-basket-line"></i> Ticket</h2>
                <select class="form-control sucursal-select" [(ngModel)]="sucursalId">
                  @for (sucursal of sucursales(); track sucursal.id) {
                    <option [ngValue]="sucursal.id">{{ sucursal.nombre }}</option>
                  }
                </select>
              </div>

              <div class="ticket-lineas">
                @if (lineas().length === 0) {
                  <div class="estado"><i class="ri-shopping-basket-line"></i> Agrega prendas al ticket.</div>
                } @else {
                  @for (linea of lineas(); track linea.variante.id) {
                    <div class="linea-row">
                      <div class="linea-info">
                        <strong>{{ linea.producto.nombre }}</strong>
                        <small>{{ linea.variante.talla || 'Única' }} · {{ linea.variante.color || 'Sin color' }}</small>
                        @if (!stockSuficiente(linea)) {
                          <span class="linea-alerta"><i class="ri-alert-line"></i> Stock local insuficiente</span>
                        }
                      </div>
                      <div class="linea-cantidad">
                        <button type="button" class="btn-qty" (click)="cambiarCantidad(linea, -1)">-</button>
                        <span>{{ linea.cantidad }}</span>
                        <button type="button" class="btn-qty" (click)="cambiarCantidad(linea, 1)">+</button>
                      </div>
                      <span class="linea-subtotal">Bs. {{ subtotal(linea) | number:'1.2-2' }}</span>
                      <button type="button" class="btn-remove" (click)="quitarLinea(linea)" aria-label="Quitar">
                        <i class="ri-delete-bin-line"></i>
                      </button>
                    </div>
                  }
                }
              </div>

              <div class="ticket-totales">
                <div><span>Artículos</span><strong>{{ totalItems() }}</strong></div>
                <div class="total-row"><span>Total local</span><strong>Bs. {{ total() | number:'1.2-2' }}</strong></div>
              </div>

              <div class="pago-box">
                <div class="form-group">
                  <label class="form-label">NIT/CI del cliente (opcional)</label>
                  <input class="form-control" [(ngModel)]="nitCi" placeholder="Ej. 12345678" />
                </div>
                <div class="form-group">
                  <label class="form-label">Monto recibido (efectivo)</label>
                  <input class="form-control" type="number" min="0" step="0.01" [(ngModel)]="montoRecibido" (ngModelChange)="calcularCambio()" />
                </div>
                <div class="cambio-row" [class.cambio-ok]="cambio() >= 0">
                  <span>Cambio</span>
                  <strong>Bs. {{ cambio() | number:'1.2-2' }}</strong>
                </div>
              </div>

              @if (error()) {
                <div class="aviso aviso-error"><i class="ri-error-warning-line"></i> {{ error() }}</div>
              }

              <button
                type="button"
                class="btn btn-accent btn-lg btn-block"
                [disabled]="!puedeCobrar()"
                (click)="cobrar()"
              >
                @if (procesando()) {
                  <i class="ri-loader-4-line spin-icon"></i> Registrando…
                } @else {
                  <i class="ri-money-dollar-circle-line"></i> Cobrar y generar comprobante
                }
              </button>
              <p class="nota-pie"><i class="ri-information-line"></i> Se descuenta stock local no confirmado y se encola la operación VENTA_CONTADO.</p>
            </section>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .pos-offline-page { min-height: 100vh; background: var(--bg-main); padding: 1.5rem 0 3rem; }
    .pos-container { max-width: 1280px; margin: 0 auto; padding: 0 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
    .pos-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
    .eyebrow { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.7rem; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.04em; }
    .pos-head h1 { margin: 0.2rem 0 0; font-size: 1.7rem; font-weight: 800; color: var(--primary); }
    .pos-head p { margin: 0.25rem 0 0; color: var(--text-muted); font-size: 0.86rem; }
    .head-acciones { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
    .aviso { display: flex; gap: 0.5rem; align-items: flex-start; padding: 0.65rem 0.85rem; border-radius: 0.6rem; font-size: 0.8rem; }
    .aviso-warning { background: #fffbeb; border: 1px solid #fcd34d; color: #92400e; }
    .aviso-error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
    .aviso p { margin: 0.15rem 0 0; }
    .pos-grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(360px, 0.9fr); gap: 1rem; align-items: start; }
    .catalogo-card, .ticket-card { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .buscador { position: relative; display: flex; align-items: center; }
    .buscador i { position: absolute; left: 0.7rem; color: #94a3b8; }
    .buscador .form-control { padding-left: 2rem; }
    .productos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.6rem; max-height: 430px; overflow: auto; }
    .producto-card { display: flex; flex-direction: column; border: 1px solid var(--border-color, #e2e8f0); border-radius: 0.6rem; background: #ffffff; overflow: hidden; cursor: pointer; text-align: left; }
    .producto-card.selected { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(236, 72, 153, 0.15); }
    .producto-card img, .producto-placeholder { width: 100%; height: 110px; object-fit: cover; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 1.6rem; }
    .producto-info { padding: 0.45rem 0.55rem 0.6rem; display: flex; flex-direction: column; gap: 0.1rem; }
    .producto-info strong { font-size: 0.76rem; color: var(--primary); line-height: 1.2; }
    .producto-info small { font-size: 0.64rem; color: #94a3b8; }
    .producto-precio { font-size: 0.76rem; font-weight: 700; color: var(--accent); }
    .variantes-box { border-top: 1px dashed #e2e8f0; padding-top: 0.7rem; }
    .variantes-box h3 { margin: 0 0 0.4rem; font-size: 0.85rem; color: var(--primary); }
    .variantes-grid { display: flex; flex-direction: column; gap: 0.35rem; }
    .variante-chip { display: flex; align-items: center; gap: 0.5rem; padding: 0.45rem 0.55rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; background: #ffffff; cursor: pointer; font-size: 0.76rem; text-align: left; }
    .variante-chip.selected { border-color: var(--accent); background: #fff1f2; }
    .variante-chip strong { flex: 1; }
    .variante-precio { font-weight: 700; color: var(--accent); font-size: 0.72rem; }
    .ticket-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
    .ticket-head h2 { margin: 0; font-size: 0.95rem; color: var(--primary); display: inline-flex; gap: 0.3rem; align-items: center; }
    .sucursal-select { max-width: 180px; font-size: 0.75rem; padding: 0.35rem 0.5rem; }
    .ticket-lineas { display: flex; flex-direction: column; gap: 0.35rem; max-height: 270px; overflow: auto; }
    .linea-row { display: flex; align-items: center; gap: 0.45rem; border-bottom: 1px dashed #e2e8f0; padding-bottom: 0.35rem; }
    .linea-info { flex: 1; display: flex; flex-direction: column; gap: 0.1rem; }
    .linea-info strong { font-size: 0.76rem; }
    .linea-info small { font-size: 0.66rem; color: #64748b; }
    .linea-alerta { font-size: 0.64rem; color: #b45309; font-weight: 700; }
    .linea-cantidad { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.76rem; }
    .btn-qty { width: 22px; height: 22px; border-radius: 0.3rem; border: 1px solid #cbd5e1; background: #ffffff; cursor: pointer; }
    .linea-subtotal { font-size: 0.76rem; font-weight: 700; white-space: nowrap; }
    .btn-remove { border: 0; background: transparent; color: #b91c1c; cursor: pointer; }
    .ticket-totales { border-top: 2px solid #e2e8f0; padding-top: 0.5rem; display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.8rem; }
    .ticket-totales div { display: flex; justify-content: space-between; }
    .total-row { font-size: 1rem; font-weight: 800; color: var(--primary); }
    .pago-box { background: #f8fafc; border-radius: 0.6rem; padding: 0.65rem 0.75rem; display: flex; flex-direction: column; gap: 0.45rem; }
    .pago-box .form-group { margin: 0; }
    .pago-box .form-label { font-size: 0.7rem; margin-bottom: 0.2rem; }
    .cambio-row { display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 700; color: #b91c1c; }
    .cambio-ok { color: #15803d; }
    .btn-block { width: 100%; justify-content: center; }
    .nota-pie { margin: 0; font-size: 0.68rem; color: #94a3b8; display: flex; gap: 0.3rem; }
    .estado { display: flex; justify-content: center; align-items: center; gap: 0.4rem; padding: 1.2rem; color: #64748b; font-size: 0.8rem; text-align: center; }
    .exito-card { padding: 1.8rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.6rem; max-width: 640px; margin: 1rem auto; }
    .exito-icon { font-size: 2.8rem; color: #16a34a; }
    .exito-card h2 { margin: 0; color: var(--primary); }
    .exito-card p { margin: 0; color: #475569; font-size: 0.86rem; max-width: 480px; }
    .exito-resumen { display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center; font-size: 0.75rem; color: #475569; }
    .comprobante-detalle { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.76rem; color: #334155; background: #f8fafc; border-radius: 0.5rem; padding: 0.6rem 0.8rem; width: 100%; }
    .exito-acciones { display: flex; gap: 0.4rem; flex-wrap: wrap; justify-content: center; margin-top: 0.4rem; }
    @media (max-width: 980px) { .pos-grid { grid-template-columns: 1fr; } }
  `]
})
export class PosOfflineComponent implements OnInit {
  private pos = inject(PosService);
  private catalog = inject(OfflineCatalogService);
  private queue = inject(OfflineQueueService);
  private documents = inject(OfflineDocumentService);
  private indexedDb = inject(IndexedDbService);
  private device = inject(DeviceService);
  private connectivity = inject(ConnectivityService);
  private branchService = inject(BranchApiService);
  private auth = inject(AuthService);
  private storage = inject(StorageService);
  private toast = inject(ToastService);

  enLinea = this.connectivity.enLinea;
  termino = '';
  productos = signal<ProductoOffline[]>([]);
  cargando = signal(true);
  productoSeleccionado = signal<ProductoOffline | null>(null);
  variantes = signal<Array<{ variante: VarianteOffline; stock: StockOffline | null }>>([]);
  cargandoVariantes = signal(false);
  varianteSeleccionadaId = signal<number | null>(null);
  lineas = signal<LineaPosOffline[]>([]);
  sucursales = signal<Sucursal[]>([]);
  sucursalId: number | null = null;
  nitCi = '';
  montoRecibido = 0;
  cambio = signal(0);
  procesando = signal(false);
  error = signal<string | null>(null);
  comprobante = signal<ComprobanteLocal | null>(null);
  uuidVenta = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.buscar(), this.cargarSucursales()]);
  }

  async buscar(): Promise<void> {
    this.cargando.set(true);
    try {
      this.productos.set(await this.catalog.buscarLocal(this.termino, { limite: 40 }));
    } finally {
      this.cargando.set(false);
    }
  }

  async seleccionarProducto(producto: ProductoOffline): Promise<void> {
    this.productoSeleccionado.set(producto);
    this.varianteSeleccionadaId.set(null);
    this.cargandoVariantes.set(true);
    try {
      const variantes = await this.catalog.variantesDeProducto(producto.id);
      const conStock = [];
      for (const variante of variantes) {
        conStock.push({ variante, stock: await this.catalog.stockLocal(variante.id) });
      }
      this.variantes.set(conStock);
    } finally {
      this.cargandoVariantes.set(false);
    }
  }

  seleccionarVariante(variante: VarianteOffline, stock: StockOffline | null): void {
    this.varianteSeleccionadaId.set(variante.id);
    const producto = this.productoSeleccionado();
    if (!producto) return;

    const existente = this.lineas().find((linea) => linea.variante.id === variante.id);
    if (existente) {
      this.cambiarCantidad(existente, 1);
      return;
    }

    this.lineas.update((lineas) => [
      ...lineas,
      { producto, variante, stock, cantidad: 1 }
    ]);
    this.toast.info(`${producto.nombre} agregado al ticket.`);
  }

  cambiarCantidad(linea: LineaPosOffline, delta: number): void {
    this.lineas.update((lineas) =>
      lineas.map((item) =>
        item === linea ? { ...item, cantidad: Math.max(1, item.cantidad + delta) } : item
      )
    );
  }

  quitarLinea(linea: LineaPosOffline): void {
    this.lineas.update((lineas) => lineas.filter((item) => item !== linea));
  }

  subtotal(linea: LineaPosOffline): number {
    return this.redondear(linea.cantidad * this.precioVariante(linea.variante, linea.producto));
  }

  total(): number {
    return this.redondear(this.lineas().reduce((total, linea) => total + this.subtotal(linea), 0));
  }

  totalItems(): number {
    return this.lineas().reduce((total, linea) => total + linea.cantidad, 0);
  }

  calcularCambio(): void {
    this.cambio.set(this.pos.calcularCambio(this.montoRecibido, this.total()));
  }

  puedeCobrar(): boolean {
    if (this.procesando() || this.lineas().length === 0 || !this.sucursalId) return false;
    return Number(this.montoRecibido) >= this.total();
  }

  stockSuficiente(linea: LineaPosOffline): boolean {
    return !linea.stock || linea.stock.cantidad_disponible >= linea.cantidad;
  }

  stockTexto(stock: StockOffline | null): string {
    if (!stock) return 'Sin stock local';
    return stock.cantidad_disponible > 0 ? `${stock.cantidad_disponible} disp.` : 'Agotado';
  }

  stockClase(stock: StockOffline | null): string {
    if (!stock) return 'badge-warning';
    return stock.cantidad_disponible > 0 ? 'badge-success' : 'badge-danger';
  }

  precioVariante(variante: VarianteOffline, producto: ProductoOffline): number {
    return Number(variante.precio_variante ?? variante.precio ?? producto.precio ?? 0);
  }

  async cobrar(): Promise<void> {
    if (!this.sucursalId) {
      this.error.set('Selecciona la sucursal de la venta.');
      return;
    }
    if (this.lineas().length === 0) {
      this.error.set('El ticket está vacío.');
      return;
    }
    if (Number(this.montoRecibido) < this.total()) {
      this.error.set('El monto recibido es menor al total.');
      return;
    }

    this.procesando.set(true);
    this.error.set(null);
    try {
      const uuid = this.generarUuid();
      this.uuidVenta.set(uuid);
      const total = this.total();
      const detalles = this.lineas().map((linea) => ({
        variante_producto_id: linea.variante.id,
        cantidad: linea.cantidad,
        precio_unitario: this.precioVariante(linea.variante, linea.producto)
      }));

      const payload: PayloadVentaContado = {
        uuid_venta: uuid,
        sucursal_id: this.sucursalId,
        nit_ci_cliente: this.nitCi || undefined,
        metodo_pago: 'EFECTIVO',
        detalles
      };

      await this.queue.encolar('VENTA_CONTADO', payload as unknown as Record<string, unknown>, {
        sucursalId: this.sucursalId,
        uuidOperacion: uuid
      });

      const ahora = new Date().toISOString();
      const orden: OrdenLocal = {
        uuid_orden: uuid,
        uuid_carrito: uuid,
        uuid_pago: null,
        tenant_id: this.storage.getTenantActivo<{ id: number }>()?.id ?? 0,
        dispositivo_id: this.device.obtenerDispositivoId(),
        usuario_id: this.auth.currentUserSignal()?.id ?? 0,
        cliente_id: null,
        sucursal_id: this.sucursalId,
        estado: 'PENDIENTE_SINCRONIZACION',
        total_local: total,
        moneda: 'BOB',
        items: this.totalItems(),
        expira_en: null,
        created_at: ahora,
        updated_at: ahora
      };
      await this.indexedDb.guardar('ordenes_locales', orden);

      for (const linea of this.lineas()) {
        await this.catalog.descontarStockLocal(linea.variante.id, linea.cantidad, this.sucursalId);
      }

      const datos: VentaPresencialCreate = {
        sucursal_id: this.sucursalId,
        nit_ci_cliente: this.nitCi || undefined,
        metodo_pago: 'EFECTIVO',
        detalles
      };
      const detalleTexto = this.lineas().map((linea) =>
        `${linea.cantidad} x ${linea.producto.nombre} (${linea.variante.talla || 'Única'}) — Bs. ${this.subtotal(linea).toFixed(2)}`
      );
      const comprobante = await this.pos.generarComprobanteTemporal(datos, total, 'BOB', detalleTexto);
      this.comprobante.set(comprobante);
      this.toast.success('Venta registrada localmente. Se sincronizará al recuperar la red.', 'Venta offline');
    } catch (error) {
      this.error.set(this.mensajeError(error));
    } finally {
      this.procesando.set(false);
    }
  }

  nuevaVenta(): void {
    this.comprobante.set(null);
    this.uuidVenta.set(null);
    this.lineas.set([]);
    this.montoRecibido = 0;
    this.cambio.set(0);
    this.nitCi = '';
    this.productoSeleccionado.set(null);
    this.varianteSeleccionadaId.set(null);
    this.error.set(null);
  }

  imprimir(comprobante: ComprobanteLocal): void {
    if (!this.documents.imprimir(comprobante)) {
      this.toast.warning('El navegador bloqueó la ventana de impresión.', 'No se pudo imprimir');
    }
  }

  descargar(comprobante: ComprobanteLocal): void {
    if (!this.documents.descargar(comprobante)) {
      this.toast.warning('No se pudo generar el archivo del comprobante.', 'Descarga no disponible');
    }
  }

  private async cargarSucursales(): Promise<void> {
    try {
      const sucursales = await firstValueFrom(this.branchService.getBranches());
      const activas = sucursales.filter((sucursal) => sucursal.estado === 'ACTIVO');
      this.sucursales.set(activas);
      this.sucursalId = this.auth.currentUserSignal()?.sucursal_id ?? activas[0]?.id ?? null;
    } catch {
      const sucursalId = this.auth.currentUserSignal()?.sucursal_id ?? 1;
      this.sucursales.set([{ id: sucursalId, nombre: `Sucursal ${sucursalId}` } as Sucursal]);
      this.sucursalId = sucursalId;
    }
  }

  private redondear(valor: number): number {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }

  private generarUuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `xxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (caracter) => {
      const aleatorio = Math.floor(Math.random() * 16);
      const valor = caracter === 'x' ? aleatorio : (aleatorio & 0x3) | 0x8;
      return valor.toString(16);
    });
  }

  private mensajeError(error: unknown): string {
    if (error instanceof Error) return error.message;
    const detalle = (error as { error?: { detail?: string } })?.error?.detail;
    return detalle ?? 'No se pudo registrar la venta local.';
  }
}
