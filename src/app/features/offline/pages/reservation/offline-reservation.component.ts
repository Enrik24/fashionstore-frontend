import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ReservationService, ReservaLocalCreada } from '../../../../core/services/reservation.service';
import { OfflineCatalogService } from '../../../../core/offline/offline-catalog.service';
import { OfflineDocumentService } from '../../../../core/offline/offline-document.service';
import { ConnectivityService } from '../../../../core/offline/connectivity.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Sucursal } from '../../../../core/models/branch.model';
import {
  ProductoOffline,
  StockOffline,
  VarianteOffline
} from '../../../../core/models/offline.model';
import { ComprobanteLocal } from '../../../../core/models/offline.model';
import { OfflineDataStampComponent } from '../../../../shared/components/offline-data-stamp/offline-data-stamp.component';

interface LineaReserva {
  variante: VarianteOffline;
  productoNombre: string;
  stock: StockOffline | null;
  cantidad: number;
  forzada: boolean;
}

/**
 * [EXAMEN-2] CU06: reserva offline desde el catálogo local.
 * Valida stock local, permite forzar con advertencia y genera comprobante temporal.
 */
@Component({
  selector: 'app-offline-reservation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, OfflineDataStampComponent],
  template: `
    <div class="offline-page">
      <div class="container offline-container">
        <header class="page-head">
          <div>
            <span class="eyebrow"><i class="ri-calendar-check-line"></i> CU06 · Reserva sin conexión</span>
            <h1>Reserva offline</h1>
            <p>Selecciona prendas del catálogo local y registra la reserva en la cola de sincronización.</p>
          </div>
          <app-offline-data-stamp [fecha]="sello()" etiqueta="Catálogo local" />
        </header>

        @if (comprobante(); as comp) {
          <section class="card exito-card">
            <div class="exito-icon"><i class="ri-checkbox-circle-fill"></i></div>
            <h2>Reserva registrada localmente</h2>
            <p>
              Número temporal <strong>{{ comp.numero_temporal }}</strong>. Se confirmará con el servidor
              al recuperar la conexión; el comprobante se reemplazará automáticamente.
            </p>
            @if (creada(); as creada) {
              <div class="exito-resumen">
                <span><i class="ri-hashtag"></i> {{ creada.reserva.numero_reserva }}</span>
                <span><i class="ri-calendar-line"></i> {{ creada.reserva.fecha_reserva | date:'dd/MM/yyyy' }}</span>
                <span><i class="ri-store-2-line"></i> Sucursal {{ creada.reserva.sucursal_id }}</span>
                <span class="badge badge-pending">En cola de sincronización</span>
              </div>
              <div class="comprobante-detalle">
                @for (linea of comp.detalle; track $index) {
                  <span>{{ linea }}</span>
                }
              </div>
            }
            <div class="exito-acciones">
              <button type="button" class="btn btn-outline btn-sm" (click)="imprimir(comp)">
                <i class="ri-printer-line"></i> Imprimir comprobante
              </button>
              <button type="button" class="btn btn-outline btn-sm" (click)="descargar(comp)">
                <i class="ri-download-2-line"></i> Descargar
              </button>
              <a routerLink="/offline/sincronizacion" class="btn btn-outline btn-sm">
                <i class="ri-loop-left-line"></i> Ver cola
              </a>
              <button type="button" class="btn btn-accent btn-sm" (click)="nuevaReserva()">
                <i class="ri-add-line"></i> Nueva reserva
              </button>
            </div>
          </section>
        } @else {
          <div class="reserva-grid">
            <section class="card seleccion-card">
              <h2 class="card-title"><i class="ri-search-line"></i> 1. Selecciona prendas</h2>

              <div class="buscador">
                <i class="ri-search-line"></i>
                <input
                  class="form-control"
                  type="search"
                  placeholder="Buscar en el catálogo local…"
                  [(ngModel)]="termino"
                  (ngModelChange)="buscar()"
                />
              </div>

              @if (cargando()) {
                <div class="estado"><i class="ri-loader-4-line spin-icon"></i> Buscando…</div>
              } @else if (productos().length === 0) {
                <div class="estado"><i class="ri-inbox-line"></i> Sin resultados locales.</div>
              } @else {
                <div class="productos-lista">
                  @for (producto of productos(); track producto.id) {
                    <button
                      type="button"
                      class="producto-row"
                      [class.selected]="productoSeleccionado()?.id === producto.id"
                      (click)="seleccionarProducto(producto)"
                    >
                      @if (producto.imagenes[0]) {
                        <img [src]="producto.imagenes[0]" [alt]="producto.nombre" />
                      } @else {
                        <span class="producto-placeholder"><i class="ri-t-shirt-2-line"></i></span>
                      }
                      <span class="producto-texto">
                        <strong>{{ producto.nombre }}</strong>
                        <small>{{ producto.sku }} · Bs. {{ producto.precio | number:'1.2-2' }}</small>
                      </span>
                      <i class="ri-arrow-right-s-line"></i>
                    </button>
                  }
                </div>
              }

              @if (productoSeleccionado(); as producto) {
                <div class="variantes-box">
                  <h3>{{ producto.nombre }}</h3>
                  @if (cargandoVariantes()) {
                    <div class="estado"><i class="ri-loader-4-line spin-icon"></i> Cargando variantes…</div>
                  } @else if (variantes().length === 0) {
                    <p class="muted">Esta prenda no tiene variantes descargadas.</p>
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
                        </button>
                      }
                    </div>

                    @if (varianteSeleccionadaId() !== null) {
                      <div class="agregar-linea">
                        <label class="form-label">Cantidad</label>
                        <input class="form-control cantidad" type="number" min="1" [(ngModel)]="cantidad" />
                        <button type="button" class="btn btn-accent btn-sm" (click)="agregarLinea(producto)">
                          <i class="ri-add-line"></i> Agregar
                        </button>
                      </div>
                      @if (advertenciaStock()) {
                        <div class="aviso aviso-warning">
                          <i class="ri-alert-line"></i>
                          <div>
                            <strong>Stock local insuficiente</strong>
                            <p>{{ advertenciaStock() }}</p>
                          </div>
                        </div>
                      }
                    }
                  }
                </div>
              }
            </section>

            <section class="card confirmacion-card">
              <h2 class="card-title"><i class="ri-file-list-3-line"></i> 2. Datos de la reserva</h2>

              <div class="form-group">
                <label class="form-label">Sucursal <span class="required">*</span></label>
                <select class="form-control" [(ngModel)]="sucursalId">
                  <option [ngValue]="null">-- Selecciona una sucursal --</option>
                  @for (sucursal of sucursales(); track sucursal.id) {
                    <option [ngValue]="sucursal.id">{{ sucursal.nombre }}</option>
                  }
                </select>
              </div>

              <div class="fila-doble">
                <div class="form-group">
                  <label class="form-label">Fecha <span class="required">*</span></label>
                  <input class="form-control" type="date" [(ngModel)]="fecha" [min]="hoy" />
                </div>
                <div class="form-group">
                  <label class="form-label">Horario aproximado</label>
                  <input class="form-control" type="time" [(ngModel)]="horario" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Notas</label>
                <textarea class="form-control" rows="2" placeholder="Referencia para el personal de tienda" [(ngModel)]="notas"></textarea>
              </div>

              <div class="lineas-reserva">
                <h3>Prendas reservadas</h3>
                @if (lineas().length === 0) {
                  <p class="muted">Aún no agregaste prendas.</p>
                } @else {
                  @for (linea of lineas(); track linea.variante.id) {
                    <div class="linea-row">
                      <div>
                        <strong>{{ linea.productoNombre }}</strong>
                        <small>{{ linea.variante.talla || 'Única' }} · {{ linea.variante.color || 'Sin color' }}</small>
                        @if (!stockSuficiente(linea)) {
                          <span class="linea-alerta"><i class="ri-alert-line"></i> Forzada sin stock suficiente</span>
                        }
                      </div>
                      <div class="linea-cantidad">
                        <button type="button" class="btn-qty" (click)="cambiarCantidad(linea, -1)">-</button>
                        <span>{{ linea.cantidad }}</span>
                        <button type="button" class="btn-qty" (click)="cambiarCantidad(linea, 1)">+</button>
                      </div>
                      <button type="button" class="btn-remove" (click)="quitarLinea(linea)" aria-label="Quitar prenda">
                        <i class="ri-delete-bin-line"></i>
                      </button>
                    </div>
                  }
                }
              </div>

              @if (hayLineasForzadas()) {
                <label class="check-forzar">
                  <input type="checkbox" [(ngModel)]="forzarReserva" />
                  Confirmo reservar aunque el stock local sea insuficiente (puede generar conflicto).
                </label>
              }

              @if (error()) {
                <div class="aviso aviso-error"><i class="ri-error-warning-line"></i> {{ error() }}</div>
              }

              <button
                type="button"
                class="btn btn-accent btn-lg btn-block"
                [disabled]="!puedeConfirmar()"
                (click)="confirmar()"
              >
                @if (guardando()) {
                  <i class="ri-loader-4-line spin-icon"></i> Registrando…
                } @else {
                  <i class="ri-calendar-check-line"></i> Registrar reserva local
                }
              </button>

              <p class="nota-pie">
                <i class="ri-information-line"></i>
                La reserva se guarda en el dispositivo y se envía al servidor en orden FIFO.
              </p>
            </section>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .offline-page { min-height: 100vh; background: var(--bg-main); padding: 2rem 0 4rem; }
    .offline-container { max-width: 1120px; margin: 0 auto; padding: 0 1.5rem; display: flex; flex-direction: column; gap: 1.1rem; }
    .page-head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; flex-wrap: wrap; }
    .eyebrow { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.04em; }
    .page-head h1 { margin: 0.25rem 0 0; font-size: 1.9rem; font-weight: 800; color: var(--primary); }
    .page-head p { margin: 0.3rem 0 0; color: var(--text-muted); font-size: 0.9rem; }
    .reserva-grid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.9fr); gap: 1rem; align-items: start; }
    .seleccion-card, .confirmacion-card { padding: 1.2rem 1.3rem; display: flex; flex-direction: column; gap: 0.8rem; }
    .card-title { margin: 0; font-size: 1rem; color: var(--primary); display: inline-flex; align-items: center; gap: 0.4rem; }
    .buscador { position: relative; display: flex; align-items: center; }
    .buscador i { position: absolute; left: 0.75rem; color: #94a3b8; }
    .buscador .form-control { padding-left: 2.1rem; }
    .productos-lista { display: flex; flex-direction: column; gap: 0.4rem; max-height: 260px; overflow: auto; }
    .producto-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.45rem; border: 1px solid var(--border-color, #e2e8f0); border-radius: 0.6rem; background: #ffffff; text-align: left; cursor: pointer; }
    .producto-row.selected { border-color: var(--accent); background: #fff1f2; }
    .producto-row img, .producto-placeholder { width: 44px; height: 44px; border-radius: 0.45rem; object-fit: cover; background: #f1f5f9; display: inline-flex; align-items: center; justify-content: center; color: #94a3b8; flex: 0 0 auto; }
    .producto-texto { display: flex; flex-direction: column; gap: 0.1rem; flex: 1; }
    .producto-texto strong { font-size: 0.82rem; color: var(--primary); }
    .producto-texto small { font-size: 0.7rem; color: #64748b; }
    .variantes-box { border-top: 1px dashed var(--border-color, #e2e8f0); padding-top: 0.7rem; }
    .variantes-box h3 { margin: 0 0 0.4rem; font-size: 0.9rem; color: var(--primary); }
    .variantes-grid { display: flex; flex-direction: column; gap: 0.35rem; }
    .variante-chip { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; padding: 0.5rem 0.6rem; border: 1px solid var(--border-color, #e2e8f0); border-radius: 0.5rem; background: #ffffff; cursor: pointer; font-size: 0.78rem; }
    .variante-chip.selected { border-color: var(--accent); background: #fff1f2; }
    .agregar-linea { display: flex; gap: 0.5rem; align-items: flex-end; margin-top: 0.6rem; flex-wrap: wrap; }
    .agregar-linea .form-label { margin: 0; font-size: 0.72rem; }
    .cantidad { max-width: 90px; }
    .aviso { display: flex; gap: 0.5rem; align-items: flex-start; padding: 0.65rem 0.8rem; border-radius: 0.6rem; font-size: 0.78rem; }
    .aviso-warning { background: #fffbeb; border: 1px solid #fcd34d; color: #92400e; }
    .aviso-error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
    .aviso p { margin: 0.15rem 0 0; }
    .fila-doble { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
    .lineas-reserva { border-top: 1px solid var(--border-color, #e2e8f0); padding-top: 0.7rem; }
    .lineas-reserva h3 { margin: 0 0 0.4rem; font-size: 0.82rem; color: var(--primary); }
    .linea-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.45rem 0; border-bottom: 1px dashed #e2e8f0; }
    .linea-row > div:first-child { flex: 1; display: flex; flex-direction: column; gap: 0.1rem; }
    .linea-row strong { font-size: 0.78rem; }
    .linea-row small { font-size: 0.68rem; color: #64748b; }
    .linea-alerta { font-size: 0.66rem; color: #b45309; font-weight: 700; }
    .linea-cantidad { display: inline-flex; align-items: center; gap: 0.35rem; }
    .btn-qty { width: 24px; height: 24px; border-radius: 0.35rem; border: 1px solid #cbd5e1; background: #ffffff; cursor: pointer; }
    .btn-remove { border: 0; background: transparent; color: #b91c1c; cursor: pointer; }
    .check-forzar { display: flex; gap: 0.4rem; align-items: flex-start; font-size: 0.74rem; color: #92400e; }
    .btn-block { width: 100%; justify-content: center; }
    .nota-pie { margin: 0; font-size: 0.7rem; color: #94a3b8; display: flex; gap: 0.3rem; }
    .estado { display: flex; justify-content: center; align-items: center; gap: 0.4rem; padding: 1rem; color: #64748b; font-size: 0.8rem; }
    .muted { color: #94a3b8; font-size: 0.78rem; }
    .exito-card { padding: 1.8rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.6rem; max-width: 640px; margin: 1rem auto; }
    .exito-icon { font-size: 2.8rem; color: #16a34a; }
    .exito-card h2 { margin: 0; color: var(--primary); }
    .exito-card p { margin: 0; color: #475569; font-size: 0.86rem; max-width: 480px; }
    .exito-resumen { display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center; font-size: 0.75rem; color: #475569; }
    .comprobante-detalle { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.76rem; color: #334155; background: #f8fafc; border-radius: 0.5rem; padding: 0.6rem 0.8rem; width: 100%; }
    .exito-acciones { display: flex; gap: 0.4rem; flex-wrap: wrap; justify-content: center; margin-top: 0.5rem; }
    .required { color: #dc2626; }
    @media (max-width: 860px) { .reserva-grid { grid-template-columns: 1fr; } }
  `]
})
export class OfflineReservationComponent implements OnInit {
  private reservation = inject(ReservationService);
  private catalog = inject(OfflineCatalogService);
  private documents = inject(OfflineDocumentService);
  private branchService = inject(BranchApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);

  sello = signal<string | null>(null);
  productos = signal<ProductoOffline[]>([]);
  cargando = signal(false);
  productoSeleccionado = signal<ProductoOffline | null>(null);
  variantes = signal<Array<{ variante: VarianteOffline; stock: StockOffline | null }>>([]);
  cargandoVariantes = signal(false);
  varianteSeleccionadaId = signal<number | null>(null);
  varianteStock = signal<StockOffline | null>(null);
  advertenciaStock = signal<string | null>(null);
  lineas = signal<LineaReserva[]>([]);
  sucursales = signal<Sucursal[]>([]);
  sucursalId: number | null = null;
  fecha = this.fechaManana();
  horario = '10:00';
  notas = '';
  cantidad = 1;
  forzarReserva = false;
  guardando = signal(false);
  error = signal<string | null>(null);
  comprobante = signal<ComprobanteLocal | null>(null);
  creada = signal<ReservaLocalCreada | null>(null);

  get hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }

  get termino(): string {
    return this._termino;
  }

  set termino(valor: string) {
    this._termino = valor;
  }

  private _termino = '';

  async ngOnInit(): Promise<void> {
    this.sello.set(await this.catalog.selloActual());
    await this.buscar();
    await this.cargarSucursales();
    const productoId = Number(this.route.snapshot.queryParamMap.get('producto'));
    if (Number.isFinite(productoId) && productoId > 0) {
      const producto = this.productos().find((item) => item.id === productoId);
      if (producto) await this.seleccionarProducto(producto);
    }
  }

  async buscar(): Promise<void> {
    this.cargando.set(true);
    try {
      this.productos.set(await this.catalog.buscarLocal(this._termino, { limite: 30 }));
    } finally {
      this.cargando.set(false);
    }
  }

  async seleccionarProducto(producto: ProductoOffline): Promise<void> {
    this.productoSeleccionado.set(producto);
    this.varianteSeleccionadaId.set(null);
    this.varianteStock.set(null);
    this.advertenciaStock.set(null);
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
    this.varianteStock.set(stock);
    this.validarStock();
  }

  validarStock(): void {
    const stock = this.varianteStock();
    if (!stock) {
      this.advertenciaStock.set('No hay stock local descargado; la reserva puede quedar en conflicto al sincronizar.');
      return;
    }
    if (stock.cantidad_disponible < this.cantidad) {
      this.advertenciaStock.set(`Solicitado: ${this.cantidad}. Disponible local: ${stock.cantidad_disponible}.`);
    } else {
      this.advertenciaStock.set(null);
    }
  }

  agregarLinea(producto: ProductoOffline): void {
    const varianteId = this.varianteSeleccionadaId();
    if (varianteId === null) return;
    const item = this.variantes().find((v) => v.variante.id === varianteId);
    if (!item) return;

    const cantidad = Math.max(1, Math.floor(Number(this.cantidad) || 1));
    const existente = this.lineas().find((linea) => linea.variante.id === varianteId);
    if (existente) {
      this.lineas.update((lineas) =>
        lineas.map((linea) =>
          linea.variante.id === varianteId
            ? { ...linea, cantidad: linea.cantidad + cantidad }
            : linea
        )
      );
    } else {
      this.lineas.update((lineas) => [
        ...lineas,
        {
          variante: item.variante,
          productoNombre: producto.nombre,
          stock: item.stock,
          cantidad,
          forzada: !!this.advertenciaStock()
        }
      ]);
    }
    this.cantidad = 1;
    this.advertenciaStock.set(null);
    this.toast.success('Prenda agregada a la reserva.');
  }

  cambiarCantidad(linea: LineaReserva, delta: number): void {
    this.lineas.update((lineas) =>
      lineas.map((item) =>
        item === linea ? { ...item, cantidad: Math.max(1, item.cantidad + delta) } : item
      )
    );
  }

  quitarLinea(linea: LineaReserva): void {
    this.lineas.update((lineas) => lineas.filter((item) => item !== linea));
  }

  stockSuficiente(linea: LineaReserva): boolean {
    return !linea.stock || linea.stock.cantidad_disponible >= linea.cantidad;
  }

  hayLineasForzadas(): boolean {
    return this.lineas().some((linea) => !this.stockSuficiente(linea));
  }

  puedeConfirmar(): boolean {
    if (this.guardando() || this.lineas().length === 0 || !this.sucursalId || !this.fecha) return false;
    if (this.hayLineasForzadas() && !this.forzarReserva) return false;
    return true;
  }

  async confirmar(): Promise<void> {
    if (!this.sucursalId) {
      this.error.set('Selecciona la sucursal de la reserva.');
      return;
    }
    if (this.lineas().length === 0) {
      this.error.set('Agrega al menos una prenda.');
      return;
    }
    if (this.hayLineasForzadas() && !this.forzarReserva) {
      this.error.set('Confirma que deseas reservar sin stock local suficiente.');
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    try {
      const clienteId = this.auth.currentUserSignal()?.id ?? null;
      const fechaHora = `${this.fecha}T${this.horario || '12:00'}:00`;
      const resultado = await this.reservation.crearReservaLocal(
        {
          sucursal_id: this.sucursalId,
          fecha_reserva: fechaHora,
          horario_aproximado: this.horario || undefined,
          notas: this.notas || undefined,
          detalles: this.lineas().map((linea) => ({
            variante_producto_id: linea.variante.id,
            cantidad: linea.cantidad
          }))
        },
        clienteId
      );
      this.creada.set(resultado);
      this.comprobante.set(resultado.comprobante);
      this.toast.success('Reserva registrada localmente. Se sincronizará al recuperar la red.', 'Reserva guardada');
    } catch (error) {
      this.error.set(this.mensajeError(error));
    } finally {
      this.guardando.set(false);
    }
  }

  nuevaReserva(): void {
    this.comprobante.set(null);
    this.creada.set(null);
    this.lineas.set([]);
    this.productoSeleccionado.set(null);
    this.varianteSeleccionadaId.set(null);
    this.forzarReserva = false;
    this.notas = '';
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

  stockTexto(stock: StockOffline | null): string {
    if (!stock) return 'Sin stock local';
    return stock.cantidad_disponible > 0 ? `${stock.cantidad_disponible} disp.` : 'Agotado';
  }

  stockClase(stock: StockOffline | null): string {
    if (!stock) return 'badge-warning';
    return stock.cantidad_disponible > 0 ? 'badge-success' : 'badge-danger';
  }

  private async cargarSucursales(): Promise<void> {
    try {
      const sucursales = await firstValueFrom(this.branchService.getBranches());
      const activas = sucursales.filter((sucursal) => sucursal.estado === 'ACTIVO');
      this.sucursales.set(activas);
      this.sucursalId = this.auth.currentUserSignal()?.sucursal_id ?? activas[0]?.id ?? null;
    } catch {
      const sucursalId = this.auth.currentUserSignal()?.sucursal_id ?? null;
      this.sucursales.set(sucursalId ? [{ id: sucursalId, nombre: `Sucursal ${sucursalId}` } as Sucursal] : []);
      this.sucursalId = sucursalId;
    }
  }

  private fechaManana(): string {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 1);
    return fecha.toISOString().slice(0, 10);
  }

  private mensajeError(error: unknown): string {
    if (error instanceof Error) return error.message;
    const detalle = (error as { error?: { detail?: string } })?.error?.detail;
    return detalle ?? 'No se pudo registrar la reserva local.';
  }
}
