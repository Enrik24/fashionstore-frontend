import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-mujer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="category-page container">
      <!-- Banner -->
      <div class="category-hero mujer-hero animate-fade-in">
        <div class="hero-overlay"></div>
        <div class="category-hero-content">
          <span class="badge badge-primary">COLECCIÓN FEMENINA 2026</span>
          <h1 class="hero-title">Colección Mujer</h1>
          <p class="hero-subtitle">Descubre vestidos de temporada, blusas elegantes y conjuntos diseñados para realzar tu belleza.</p>
        </div>
      </div>

      <!-- Sample Product Showcase (Mujer) -->
      <div class="showcase-section">
        <div class="showcase-header">
          <h3>Prendas Destacadas para Mujer</h3>
          <span class="text-muted">Diseños disponibles en sucursales</span>
        </div>

        <div class="grid grid-cols-3 product-grid">
          <div class="product-preview-card card card-hover">
            <div class="product-badge product-badge-accent">Colección Verano</div>
            <div class="product-img-box mujer-img-box">
              <i class="ri-sparkling-fill product-placeholder-icon"></i>
            </div>
            <div class="product-info">
              <span class="product-category">Vestidos</span>
              <h4 class="product-title">Vestido Midi Floral Bohemio</h4>
              <div class="product-pricing">
                <span class="price-current">Bs. 240.00</span>
                <span class="stock-indicator in-stock"><i class="ri-checkbox-circle-fill"></i> Disponible en tienda</span>
              </div>
            </div>
          </div>

          <div class="product-preview-card card card-hover">
            <div class="product-badge product-badge-accent">Tendencia</div>
            <div class="product-img-box mujer-img-box">
              <i class="ri-t-shirt-line product-placeholder-icon"></i>
            </div>
            <div class="product-info">
              <span class="product-category">Blusas & Tops</span>
              <h4 class="product-title">Blusa de Seda Cuello V</h4>
              <div class="product-pricing">
                <span class="price-current">Bs. 175.00</span>
                <span class="stock-indicator in-stock"><i class="ri-checkbox-circle-fill"></i> Disponible en tienda</span>
              </div>
            </div>
          </div>

          <div class="product-preview-card card card-hover">
            <div class="product-badge product-badge-accent">Alta Costura</div>
            <div class="product-img-box mujer-img-box">
              <i class="ri-handbag-line product-placeholder-icon"></i>
            </div>
            <div class="product-info">
              <span class="product-category">Conjuntos & Sastres</span>
              <h4 class="product-title">Conjunto Pantalón & Saco Terracota</h4>
              <div class="product-pricing">
                <span class="price-current">Bs. 380.00</span>
                <span class="stock-indicator in-stock"><i class="ri-checkbox-circle-fill"></i> Disponible en tienda</span>
              </div>
            </div>
          </div>
        </div>

        <div class="info-cta card glass text-center">
          <i class="ri-augmented-reality-line cta-icon text-accent"></i>
          <h4>Pruébate virtualmente con Realidad Aumentada</h4>
          <p class="text-muted">Con nuestro vestidor virtual podrás ver cómo te lucirá cualquier vestido o conjunto antes de visitarnos.</p>
          <div class="info-cta-actions">
            <a routerLink="/auth/register" class="btn btn-accent">Crear Cuenta Gratis</a>
            <a routerLink="/home" class="btn btn-outline">Volver al Inicio</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .category-page {
      padding: 2rem 1.5rem 5rem;
      display: flex;
      flex-direction: column;
      gap: 3.5rem;
    }

    .category-hero {
      position: relative;
      border-radius: var(--radius-xl);
      padding: 4.5rem 3rem;
      color: white;
      overflow: hidden;
    }

    .mujer-hero {
      background: linear-gradient(135deg, #831843 0%, #be123c 50%, #4c0519 100%);
    }

    .hero-overlay {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at top right, rgba(255, 255, 255, 0.15), transparent 70%);
    }

    .category-hero-content {
      position: relative;
      z-index: 2;
      max-width: 540px;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .hero-title {
      font-size: 2.75rem;
      color: white;
    }

    .hero-subtitle {
      font-size: 1.05rem;
      color: #fce7f3;
      line-height: 1.6;
    }

    .showcase-header {
      margin-bottom: 2rem;
    }

    .product-grid {
      gap: 1.5rem;
      margin-bottom: 3.5rem;
    }

    .product-preview-card {
      position: relative;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .product-badge-accent {
      position: absolute;
      top: 1.5rem;
      left: 1.5rem;
      background: var(--accent);
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.25rem 0.6rem;
      border-radius: var(--radius-full);
      z-index: 2;
    }

    .product-img-box {
      height: 220px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .mujer-img-box {
      background: #fdf2f8;
      .product-placeholder-icon {
        color: #f472b6;
      }
    }

    .product-placeholder-icon {
      font-size: 4rem;
    }

    .product-category {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .product-title {
      font-size: 1.05rem;
      font-weight: 700;
      margin: 0.25rem 0 0.5rem;
    }

    .product-pricing {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .price-current {
      font-size: 1.2rem;
      font-weight: 800;
      color: var(--primary);
    }

    .stock-indicator {
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .in-stock {
      color: var(--success);
    }

    .info-cta {
      padding: 3rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      max-width: 600px;
      margin: 0 auto;
    }

    .cta-icon {
      font-size: 2.5rem;
    }

    .info-cta-actions {
      display: flex;
      gap: 1rem;
      margin-top: 0.5rem;
    }
  `]
})
export class MujerComponent {}
