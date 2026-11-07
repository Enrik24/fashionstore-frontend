import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OfflineCatalogService } from '../../../../core/offline/offline-catalog.service';
import { ConnectivityService } from '../../../../core/offline/connectivity.service';
import {
  ProductoOffline,
  StockOffline,
  VarianteOffline
} from '../../../../core/models/offline.model';
import { OfflineDataStampComponent } from '../../../../shared/components/offline-data-stamp/offline-data-stamp.component';

interface VarianteConStock {
  variante: VarianteOffline;
  stock: StockOffline | null;
}

/**
 * [EXAMEN-2] CU05: catálogo servido desde IndexedDB con búsqueda local.
 * No ofrece compra digital: solo consulta y acceso a la reserva offline.
 */
@Component({
  selector: 'app-offline-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, OfflineDataStampComponent],
  template: `
    <div class="offline-page">
      <div class="container offline-container">
        <header class="page-head">
          <div>
            <span class="eyebrow"><i class="ri-search-eye-line"></i> CU05 · Consulta local</span>
            <h1>Catálogo offline</h1>
            <p>Prendas guardadas en este dispositivo. No se realizan compras digitales sin conexión.</p>
          </div>
          <app-offline-data-stamp [fecha]="sello()" etiqueta="Datos locales" />
        </header>

        @if (!enLinea()) {
          <div class="aviso"><i class="ri-wifi-off-line"></i> Estás consultando la copia local; los precios pueden ser referenciales.</div>
        }

        <section class="card filtros">
          <div class="buscador">
            <i class="ri-search-line"></i>
            <input
              type="search"
              class="form-control"
              placeholder="Buscar por nombre, SKU o categoría…"
              [(ngModel)]="termino"
              (ngModelChange)="buscar()"
            />
          </div>
          <label class="check">
            <input type="checkbox" [(ngModel)]="soloConStock" (ngModelChange)="buscar()" />
            Solo con stock local
          </label>
          <span class="contador">{{ resultados().length }} prendas</span>
        </section>

        @if (cargando()) {
          <div class="estado"><i class="ri-loader-4-line spin-icon"></i> Leyendo catálogo local…</div>
        } @else if (resultados().length === 0) {
          <div class="estado">
            <i class="ri-inbox-line"></i>
            <div>
              <strong>No hay prendas para mostrar</strong>
              <p>Descarga el paquete offline o ajusta la búsqueda.</p>
              <a routerLink="/offline/descarga" class="btn btn-outline btn-sm">Ir a descarga</a>
            </div>
          </div>
        } @else {
          <div class="productos-grid">
            @for (producto of resultados(); track producto.id) {
              <article class="card producto-card" (click)="seleccionar(producto)">
                <div class="producto-imagen">
                  @if (imagen(producto); as src) {
                    <img [src]="src" [alt]="producto.nombre" loading="lazy" />
                  } @else {
                    <i class="ri-t-shirt-2-line"></i>
                  }
                  <span class="badge badge-primary producto-sku">{{ producto.sku }}</span>
                </div>
                <div class="producto-info">
                  <h3>{{ producto.nombre }}</h3>
                  <span class="producto-categoria">{{ producto.categoria || 'Sin categoría' }}</span>
                  <strong class="producto-precio">Bs. {{ producto.precio | number:'1.2-2' }}</strong>
                </div>
              </article>
            }
          </div>
        }

        @if (seleccionado(); as producto) {
          <div class="detalle-overlay" (click)="cerrar()">
            <div class="card detalle-card" (click)="$event.stopPropagation()">
              <header class="detalle-head">
                <div>
                  <h2>{{ producto.nombre }}</h2>
                  <span>{{ producto.sku }} · {{ producto.categoria || 'Sin categoría' }}</span>
                </div>
                <button type="button" class="btn btn-icon btn-outline" (click)="cerrar()" aria-label="Cerrar detalle">
                  <i class="ri-close-line"></i>
                </button>
              </header>

              <p class="detalle-desc">{{ producto.descripcion || 'Prenda disponible en la colección local.' }}</p>

              <h3 class="detalle-sub">Variantes y stock local</h3>
              @if (cargandoVariantes()) {
                <div class="estado"><i class="ri-loader-4-line spin-icon"></i> Consultando variantes…</div>
              } @else if (variantes().length === 0) {
                <p class="detalle-desc">No hay variantes descargadas para esta prenda.</p>
              } @else {
                <div class="variantes-lista">
                  @for (item of variantes(); track item.variante.id) {
                    <div class="variante-row">
                      <div>
                        <strong>{{ item.variante.talla || 'Única' }} · {{ item.variante.color || 'Sin color' }}</strong>
                        <small>{{ item.variante.sku_variante }}</small>
                      </div>
                      <span class="badge" [ngClass]="stockClase(item)">
                        {{ stockTexto(item) }}
                      </span>
                    </div>
                  }
                </div>
              }

              <footer class="detalle-acciones">
                <a
                  routerLink="/offline/reserva"
                  [queryParams]="{ producto: producto.id }"
                  class="btn btn-accent btn-sm"
                >
                  <i class="ri-calendar-check-line"></i> Reservar en tienda
                </a>
                <button type="button" class="btn btn-outline btn-sm" (click)="cerrar()">Volver al catálogo</button>
              </footer>
            </div>
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
    .aviso { display: flex; gap: 0.5rem; align-items: center; padding: 0.7rem 0.9rem; border-radius: 0.65rem; background: #fffbeb; border: 1px solid #fcd34d; color: #92400e; font-size: 0.8rem; }
    .filtros { padding: 0.8rem 1rem; display: flex; gap: 0.8rem; align-items: center; flex-wrap: wrap; }
    .buscador { position: relative; flex: 1 1 260px; display: flex; align-items: center; }
    .buscador i { position: absolute; left: 0.75rem; color: #94a3b8; }
    .buscador .form-control { padding-left: 2.1rem; }
    .check { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: #475569; }
    .contador { font-size: 0.76rem; font-weight: 700; color: #64748b; }
    .productos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 1rem; }
    .producto-card { overflow: hidden; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; }
    .producto-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1); }
    .producto-imagen { position: relative; height: 190px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 2.4rem; color: #cbd5e1; }
    .producto-imagen img { width: 100%; height: 100%; object-fit: cover; }
    .producto-sku { position: absolute; left: 0.5rem; bottom: 0.5rem; font-size: 0.65rem; }
    .producto-info { padding: 0.75rem 0.85rem 0.9rem; display: flex; flex-direction: column; gap: 0.2rem; }
    .producto-info h3 { margin: 0; font-size: 0.9rem; color: var(--primary); line-height: 1.25; }
    .producto-categoria { font-size: 0.7rem; color: #94a3b8; }
    .producto-precio { margin-top: 0.25rem; font-size: 0.95rem; color: var(--accent); }
    .estado { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 2.5rem 1rem; color: #64748b; text-align: center; }
    .estado div { display: flex; flex-direction: column; gap: 0.3rem; align-items: center; }
    .estado i { font-size: 1.6rem; }
    .detalle-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 200; }
    .detalle-card { width: 100%; max-width: 560px; max-height: 85vh; overflow: auto; padding: 1.3rem 1.4rem; }
    .detalle-head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; }
    .detalle-head h2 { margin: 0; font-size: 1.2rem; color: var(--primary); }
    .detalle-head span { font-size: 0.75rem; color: #94a3b8; }
    .detalle-desc { color: #475569; font-size: 0.84rem; margin: 0.7rem 0; }
    .detalle-sub { font-size: 0.9rem; color: var(--primary); margin: 0.8rem 0 0.4rem; }
    .variantes-lista { display: flex; flex-direction: column; gap: 0.4rem; }
    .variante-row { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; padding: 0.5rem 0.65rem; background: #f8fafc; border-radius: 0.5rem; font-size: 0.8rem; }
    .variante-row div { display: flex; flex-direction: column; gap: 0.1rem; }
    .variante-row small { color: #94a3b8; font-size: 0.68rem; }
    .detalle-acciones { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem; }
  `]
})
export class OfflineCatalogComponent implements OnInit {
  private catalog = inject(OfflineCatalogService);
  private connectivity = inject(ConnectivityService);

  enLinea = this.connectivity.enLinea;
  termino = '';
  soloConStock = false;
  cargando = signal(true);
  resultados = signal<ProductoOffline[]>([]);
  sello = signal<string | null>(null);
  seleccionado = signal<ProductoOffline | null>(null);
  variantes = signal<VarianteConStock[]>([]);
  cargandoVariantes = signal(false);

  async ngOnInit(): Promise<void> {
    const [sello] = await Promise.all([this.catalog.selloActual(), this.buscar()]);
    this.sello.set(sello);
  }

  async buscar(): Promise<void> {
    this.cargando.set(true);
    try {
      const productos = await this.catalog.buscarLocal(this.termino, {
        soloConStock: this.soloConStock,
        limite: 80
      });
      this.resultados.set(productos);
    } finally {
      this.cargando.set(false);
    }
  }

  async seleccionar(producto: ProductoOffline): Promise<void> {
    this.seleccionado.set(producto);
    this.cargandoVariantes.set(true);
    this.variantes.set([]);
    try {
      const variantes = await this.catalog.variantesDeProducto(producto.id);
      const conStock: VarianteConStock[] = [];
      for (const variante of variantes) {
        conStock.push({ variante, stock: await this.catalog.stockLocal(variante.id) });
      }
      this.variantes.set(conStock);
    } finally {
      this.cargandoVariantes.set(false);
    }
  }

  cerrar(): void {
    this.seleccionado.set(null);
  }

  imagen(producto: ProductoOffline): string | null {
    return producto.imagenes?.[0] ?? null;
  }

  stockTexto(item: VarianteConStock): string {
    if (!item.stock) return 'Sin stock local';
    return item.stock.cantidad_disponible > 0
      ? `${item.stock.cantidad_disponible} disponibles`
      : 'Agotado';
  }

  stockClase(item: VarianteConStock): string {
    if (!item.stock) return 'badge-warning';
    return item.stock.cantidad_disponible > 0 ? 'badge-success' : 'badge-danger';
  }
}
