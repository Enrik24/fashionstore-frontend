import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { FavoritesService } from '../../../../core/services/favorites.service';
import { CatalogApiService } from '../../../../core/services/catalog-api.service';
import { AlertService } from '../../../../core/services/alert.service';
import { ProductoFavorito } from '../../../../core/models/favorite.model';
import { VarianteProducto } from '../../../../core/models/catalog.model';

@Component({
  selector: 'app-favorites-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="favorites-page animate-fade-in">
      <div class="section-header">
        <div>
          <h2 class="section-title"><i class="ri-heart-3-line"></i> Mis Favoritos</h2>
          <p class="section-subtitle">Tus prendas guardadas para comprarlas después. La disponibilidad se actualiza en tiempo real.</p>
        </div>
        <button class="btn btn-secondary btn-sm" (click)="cargarFavoritos()">
          <i class="ri-refresh-line"></i> Actualizar
        </button>
      </div>

      @if (loading()) {
        <div class="loading-state card">
          <i class="ri-loader-4-line spin-icon"></i>
          <span>Cargando tus productos favoritos...</span>
        </div>
      } @else if (favoritos().length === 0) {
        <div class="empty-state card">
          <div class="empty-icon-box">
            <i class="ri-heart-3-line"></i>
          </div>
          <h3>Aún no tienes favoritos</h3>
          <p>Explora el catálogo y guarda las prendas que más te gusten tocando el corazón.</p>
          <a routerLink="/catalog" class="btn btn-accent">
            <i class="ri-store-2-line"></i> Explorar Catálogo
          </a>
        </div>
      } @else {
        <div class="favorites-grid">
          @for (favorito of favoritos(); track favorito.id) {
            <div class="favorite-card card">
              <div class="favorite-media">
                <img [src]="getImagen(favorito)" [alt]="favorito.producto.nombre" loading="lazy" />

                <button
                  class="remove-btn"
                  title="Quitar de favoritos"
                  (click)="quitarFavorito(favorito)"
                >
                  <i class="ri-heart-fill"></i>
                </button>

                @if (!favorito.disponible) {
                  <span class="availability-badge">No disponible</span>
                }
              </div>

              <div class="favorite-body">
                <span class="favorite-sku">{{ favorito.producto.sku }}</span>
                <h3 class="favorite-name" [routerLink]="['/catalog', favorito.producto_id]">
                  {{ favorito.producto.nombre }}
                </h3>

                <div class="favorite-price">
                  <span class="currency">Bs.</span>
                  <span class="amount">{{ favorito.producto.precio | number:'1.2-2' }}</span>
                </div>

                <div class="favorite-actions">
                  @if (!favorito.disponible) {
                    <button class="btn btn-outline btn-sm" disabled title="Producto no disponible temporalmente">
                      <i class="ri-close-circle-line"></i> No disponible
                    </button>
                  } @else if (variantesActivas().has(favorito.producto_id)) {
                    <div class="variant-picker">
                      <span class="picker-hint">Selecciona talla / color:</span>
                      <div class="variant-options">
                        @for (variante of getVariantes(favorito.producto_id); track variante.id) {
                          <button
                            class="variant-chip"
                            [disabled]="moviendo() === favorito.producto_id"
                            (click)="moverAlCarrito(favorito, variante.id)"
                          >
                            {{ getEtiquetaVariante(variante) }}
                          </button>
                        }
                      </div>
                      <button class="btn btn-outline btn-sm" (click)="cerrarSelectorVariantes(favorito.producto_id)">
                        Cancelar
                      </button>
                    </div>
                  } @else {
                    <button
                      class="btn btn-accent btn-sm add-cart-btn"
                      [disabled]="moviendo() === favorito.producto_id"
                      (click)="seleccionarVariante(favorito)"
                    >
                      @if (moviendo() === favorito.producto_id) {
                        <i class="ri-loader-4-line spin-icon"></i> Agregando...
                      } @else {
                        <i class="ri-shopping-cart-2-line"></i> Agregar al Carrito
                      }
                    </button>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .favorites-page {
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

      i { color: var(--accent); }
    }

    .section-subtitle {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

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
      background: #fdf2f4;
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.25rem;
    }

    .favorites-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1.25rem;
    }

    .favorite-card {
      padding: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .favorite-media {
      position: relative;
      width: 100%;
      padding-top: 105%;
      background: #f1f5f9;
      overflow: hidden;
    }

    .favorite-media img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .remove-btn {
      position: absolute;
      top: 0.6rem;
      right: 0.6rem;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.92);
      color: var(--accent);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15);

      &:hover { background: #ffffff; }
    }

    .availability-badge {
      position: absolute;
      left: 0.6rem;
      bottom: 0.6rem;
      background: rgba(185, 28, 28, 0.92);
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      text-transform: uppercase;
    }

    .favorite-body {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      flex: 1;
    }

    .favorite-sku {
      font-size: 0.7rem;
      color: var(--text-muted);
      font-family: monospace;
    }

    .favorite-name {
      font-size: 1rem;
      font-weight: 700;
      color: var(--primary);
      line-height: 1.3;
      cursor: pointer;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;

      &:hover { color: var(--accent); }
    }

    .favorite-price {
      display: flex;
      align-items: baseline;
      gap: 0.2rem;
      color: var(--primary);
      margin-bottom: 0.35rem;
    }

    .favorite-price .currency {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--accent);
    }

    .favorite-price .amount {
      font-size: 1.2rem;
      font-weight: 800;
      font-family: 'Outfit', sans-serif;
    }

    .favorite-actions {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .add-cart-btn { width: 100%; justify-content: center; }

    .variant-picker {
      background: #f8fafc;
      border-radius: 10px;
      padding: 0.6rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .picker-hint { font-size: 0.7rem; color: var(--text-muted); }

    .variant-options {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .variant-chip {
      border: 1.5px solid #e2e8f0;
      background: white;
      border-radius: 999px;
      padding: 0.25rem 0.6rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #475569;
      cursor: pointer;

      &:hover { border-color: var(--accent); color: var(--accent); }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }

    .spin-icon { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class FavoritesPageComponent implements OnInit {
  private favoritesService = inject(FavoritesService);
  private catalogApi = inject(CatalogApiService);
  private alertService = inject(AlertService);

  public favoritos = signal<ProductoFavorito[]>([]);
  public loading = signal<boolean>(true);
  public moviendo = signal<number | null>(null);
  /** Productos cuyo selector de variantes está desplegado. */
  public variantesActivas = signal<Set<number>>(new Set());
  private variantesPorProducto = new Map<number, VarianteProducto[]>();

  ngOnInit(): void {
    this.cargarFavoritos();
  }

  cargarFavoritos(): void {
    this.loading.set(true);
    this.variantesActivas.set(new Set());
    this.favoritesService.getFavorites(0, 100).subscribe({
      next: (favoritos) => {
        this.favoritos.set(favoritos || []);
        this.loading.set(false);
      },
      error: () => {
        this.favoritos.set([]);
        this.loading.set(false);
      }
    });
  }

  getImagen(favorito: ProductoFavorito): string {
    const imgs = favorito.producto?.imagenes;
    if (Array.isArray(imgs) && imgs.length > 0 && imgs[0]) {
      return imgs[0];
    }
    return 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=800&auto=format&fit=crop';
  }

  getVariantes(productoId: number): VarianteProducto[] {
    return this.variantesPorProducto.get(productoId) || [];
  }

  getEtiquetaVariante(variante: VarianteProducto): string {
    const talla = variante.talla?.valor || variante.talla?.nombre || 'Única';
    const color = variante.color?.nombre || 'Estándar';
    return `${talla} / ${color}`;
  }

  /** Si el producto tiene varias variantes, despliega el selector; si tiene una sola, agrega directo (CU25). */
  seleccionarVariante(favorito: ProductoFavorito): void {
    this.moviendo.set(favorito.producto_id);

    const variantesEnMemoria = favorito.producto?.variantes || [];
    const peticion$: Observable<VarianteProducto[]> = variantesEnMemoria.length > 0
      ? new Observable<VarianteProducto[]>((observer) => {
          observer.next(variantesEnMemoria as VarianteProducto[]);
          observer.complete();
        })
      : this.catalogApi.getProductVariants(favorito.producto_id);

    peticion$.subscribe({
      next: (variantes) => {
        const lista = variantes || [];
        this.variantesPorProducto.set(favorito.producto_id, lista);
        this.moviendo.set(null);

        if (lista.length === 0) {
          this.alertService.warning(
            'Sin variantes disponibles',
            'Este producto no tiene variantes registradas para agregar al carrito.'
          );
          return;
        }

        if (lista.length === 1) {
          this.moverAlCarrito(favorito, lista[0].id);
          return;
        }

        this.variantesActivas.update(set => {
          const copia = new Set(set);
          copia.add(favorito.producto_id);
          return copia;
        });
      },
      error: () => {
        this.moviendo.set(null);
        this.alertService.error('Error', 'No se pudieron obtener las variantes del producto.');
      }
    });
  }

  cerrarSelectorVariantes(productoId: number): void {
    this.variantesActivas.update(set => {
      const copia = new Set(set);
      copia.delete(productoId);
      return copia;
    });
  }

  moverAlCarrito(favorito: ProductoFavorito, varianteProductoId: number): void {
    this.moviendo.set(favorito.producto_id);
    this.favoritesService.moveToCart(favorito.producto_id, varianteProductoId, 1, false).subscribe({
      next: () => {
        this.moviendo.set(null);
        this.cerrarSelectorVariantes(favorito.producto_id);
      },
      error: () => this.moviendo.set(null)
    });
  }

  async quitarFavorito(favorito: ProductoFavorito): Promise<void> {
    const confirmed = await this.alertService.deleteConfirm(
      '¿Quitar de favoritos?',
      `Se eliminará "${favorito.producto.nombre}" de tu lista de favoritos.`
    );

    if (confirmed) {
      this.favoritesService.quitar(favorito.producto_id).subscribe({
        next: () => this.favoritos.update(list => list.filter(f => f.id !== favorito.id)),
        error: () => { /* El servicio ya notifica el error */ }
      });
    }
  }
}
