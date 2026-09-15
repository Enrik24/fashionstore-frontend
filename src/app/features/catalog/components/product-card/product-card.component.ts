import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Producto } from '../../../../core/models/catalog.model';

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
        
        <div class="product-badges">
          @if (product.estado === 'ACTIVO') {
            <span class="badge badge-success">Disponible</span>
          } @else if (product.estado === 'AGOTADO') {
            <span class="badge badge-danger">Agotado</span>
          } @else if (product.estado === 'PROXIMO_INGRESO') {
            <span class="badge badge-warning">Próximamente</span>
          }
        </div>
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

        <div class="product-footer">
          <div class="product-price">
            <span class="currency">Bs.</span>
            <span class="amount">{{ product.precio | number:'1.2-2' }}</span>
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

    .product-badges {
      position: absolute;
      top: 0.75rem;
      left: 0.75rem;
      right: 0.75rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      z-index: 2;
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
  `]
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Producto;

  getProductImage(): string {
    if (this.product.imagenes && this.product.imagenes.length > 0) {
      return this.product.imagenes[0];
    }
    return 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=800&auto=format&fit=crop';
  }
}
