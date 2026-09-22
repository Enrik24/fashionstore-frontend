import { Component, Input, Output, EventEmitter, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Producto } from '../../../../core/models/catalog.model';
import { FavoritesService } from '../../../../core/services/favorites.service';
import { ActivePromotionsService } from '../../../../core/services/active-promotions.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="product-card card card-hover">
      <!-- Image & Badges -->
      <div class="product-media" [routerLink]="['/catalog', product.id]">
        <img 
          [src]="getProductImage()" 
          [alt]="product.nombre" 
          class="product-image"
          loading="lazy"
        />

        <!-- Badge de descuento (arriba-izquierda, opuesto al corazón) -->
        @if (descuento()) {
          <span class="discount-badge">-{{ descuento() }}%</span>
        } @else if (es2x1()) {
          <span class="discount-badge badge-2x1">2×1</span>
        }

        <!-- CU25: Corazón de favoritos (arriba-derecha) -->
        <button
          type="button"
          class="favorite-btn"
          [class.active]="esFavorito()"
          [title]="esFavorito() ? 'Quitar de favoritos' : 'Agregar a favoritos'"
          [attr.aria-label]="esFavorito() ? 'Quitar de favoritos' : 'Agregar a favoritos'"
          (click)="toggleFavorito($event)"
        >
          <i [class]="esFavorito() ? 'ri-heart-fill' : 'ri-heart-line'"></i>
        </button>
      </div>

      <!-- Content -->
      <div class="product-body">
        <div class="product-meta">
          <span class="product-sku">{{ product.sku }}</span>
          @if (product.temporada) {
            <span class="product-season">{{ product.temporada.nombre }}</span>
          }
        </div>

        <h3 class="product-title" [routerLink]="['/catalog', product.id]">
          {{ product.nombre }}
        </h3>

        @if ((product.total_valoraciones || 0) > 0) {
          <div class="product-rating">
            <i class="ri-star-fill"></i>
            <span class="rating-value">{{ product.promedio_valoracion | number:'1.1-1' }}</span>
            <span class="rating-total">({{ product.total_valoraciones }})</span>
          </div>
        }

        <div class="product-footer">
          <div class="product-price">
            @if (descuento()) {
              <div class="price-with-discount">
                <span class="price-original">Bs. {{ product.precio | number:'1.2-2' }}</span>
                <div class="price-discounted">
                  <span class="currency">Bs.</span>
                  <span class="amount">{{ precioConDescuento() | number:'1.2-2' }}</span>
                </div>
              </div>
            } @else {
              <span class="currency">Bs.</span>
              <span class="amount">{{ product.precio | number:'1.2-2' }}</span>
            }
          </div>

          <a [routerLink]="['/catalog', product.id]" class="btn btn-sm btn-outline-accent">
            Ver Detalle <i class="ri-arrow-right-line"></i>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .product-card {
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow: hidden;
      height: 100%;
      border-radius: var(--radius-lg);
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      transition: all var(--transition-normal);
    }

    .product-media {
      position: relative;
      width: 100%;
      padding-top: 110%; /* 1:1.1 aspect ratio */
      overflow: hidden;
      background-color: #f1f5f9;
      cursor: pointer;
    }

    .product-image {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform var(--transition-slow);

      .product-card:hover & {
        transform: scale(1.05);
      }
    }

    /* Badge de descuento — arriba-izquierda */
    .discount-badge {
      position: absolute;
      top: 0.6rem;
      left: 0.6rem;
      z-index: 3;
      background: #ef4444;
      color: #ffffff;
      font-size: 0.8rem;
      font-weight: 800;
      font-family: 'Outfit', sans-serif;
      padding: 0.25rem 0.55rem;
      border-radius: 999px;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.45);
      letter-spacing: 0.02em;
      animation: badge-pop 0.25s cubic-bezier(.36,.07,.19,.97);
    }

    .discount-badge.badge-2x1 {
      background: #7c3aed;
      box-shadow: 0 2px 8px rgba(124, 58, 237, 0.45);
    }

    @keyframes badge-pop {
      0%   { transform: scale(0.6); opacity: 0; }
      80%  { transform: scale(1.1); }
      100% { transform: scale(1);   opacity: 1; }
    }

    .product-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      flex: 1;
      justify-content: space-between;
    }

    .product-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 0.35rem;
    }

    .product-sku {
      font-family: monospace;
      font-weight: 600;
    }

    .product-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--primary);
      line-height: 1.35;
      margin-bottom: 1rem;
      cursor: pointer;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;

      &:hover {
        color: var(--accent);
      }
    }

    .product-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border-light);
    }

    .product-price {
      display: flex;
      align-items: baseline;
      gap: 0.2rem;
      color: var(--primary);
    }

    .price-with-discount {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .price-original {
      font-size: 0.78rem;
      color: var(--text-muted);
      text-decoration: line-through;
    }

    .price-discounted {
      display: flex;
      align-items: baseline;
      gap: 0.2rem;
    }

    .currency {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--accent);
    }

    .amount {
      font-size: 1.25rem;
      font-weight: 800;
      font-family: 'Outfit', sans-serif;
    }

    /* CU25: Corazón de favoritos */
    .favorite-btn {
      position: absolute;
      top: 0.6rem;
      right: 0.6rem;
      z-index: 3;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.92);
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.05rem;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15);
      transition: transform 0.15s ease, color 0.15s ease, background 0.15s ease;

      &:hover {
        transform: scale(1.08);
        color: var(--accent);
      }

      &.active {
        color: var(--accent);
        background: #ffffff;
      }
    }

    /* CU26: Estrellas compactas */
    .product-rating {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-bottom: 0.6rem;
      font-size: 0.8125rem;
      color: #64748b;

      i { color: #f59e0b; font-size: 0.9rem; }
      .rating-value { font-weight: 700; color: var(--primary); }
      .rating-total { color: var(--text-muted); }
    }
  `]
})
export class ProductCardComponent implements OnInit {
  @Input({ required: true }) product!: Producto;

  private favoritesService = inject(FavoritesService);
  private promotionsService = inject(ActivePromotionsService);

  ngOnInit(): void {
    this.promotionsService.load();
  }

  getProductImage(): string {
    const fallback = 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=800&auto=format&fit=crop';
    const imgs: any = (this.product as any)?.imagenes;
    if (Array.isArray(imgs) && imgs.length > 0 && imgs[0]) {
      return imgs[0];
    }
    // El backend a veces devuelve imagenes como string serializado '["url"]'
    if (typeof imgs === 'string' && imgs.trim().length > 0) {
      try {
        const parsed = JSON.parse(imgs);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]) return parsed[0];
      } catch {
        return imgs;
      }
    }
    return fallback;
  }

  descuento(): number | null {
    return this.promotionsService.getDiscountForProduct(
      this.product.id,
      this.product.categoria_id
    );
  }

  es2x1(): boolean {
    return this.promotionsService.has2x1(this.product.id, this.product.categoria_id);
  }

  precioConDescuento(): number {
    const d = this.descuento();
    if (!d) return this.product.precio;
    return this.product.precio * (1 - d / 100);
  }

  esFavorito(): boolean {
    return this.favoritesService.isFavorite(this.product.id);
  }

  toggleFavorito(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.favoritesService.toggle(this.product.id);
  }
}