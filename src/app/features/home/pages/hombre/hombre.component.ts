import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-hombre',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="category-page container">
      <!-- Banner -->
      <div class="category-hero hombre-hero animate-fade-in">
        <div class="hero-overlay"></div>
        <div class="category-hero-content">
          <span class="badge badge-primary">MODA MASCULINA 2026</span>
          <h1 class="hero-title">Colección Hombre</h1>
          <p class="hero-subtitle">Elegancia contemporánea, ropa casual y trajes ejecutivos con acabados de primera calidad.</p>
        </div>
      </div>

      <!-- Sample Product Showcase (Hombre) -->
      <div class="showcase-section">
        <div class="showcase-header">
          <h3>Prendas Destacadas para Hombre</h3>
          <span class="text-muted">Diseños disponibles en sucursales</span>
        </div>

        <div class="grid grid-cols-3 product-grid">
          <div class="product-preview-card card card-hover">
            <div class="product-badge">Top Ventas</div>
            <div class="product-img-box">
              <i class="ri-t-shirt-2-line product-placeholder-icon"></i>
            </div>
            <div class="product-info">
              <span class="product-category">Camisas & Polos</span>
              <h4 class="product-title">Camisa Slim Fit Oxford</h4>
              <div class="product-pricing">
                <span class="price-current">Bs. 189.00</span>
                <span class="stock-indicator in-stock"><i class="ri-checkbox-circle-fill"></i> Disponible en tienda</span>
              </div>
            </div>
          </div>

          <div class="product-preview-card card card-hover">
            <div class="product-badge">Novedad</div>
            <div class="product-img-box">
              <i class="ri-shirt-line product-placeholder-icon"></i>
            </div>
            <div class="product-info">
              <span class="product-category">Pantalones</span>
              <h4 class="product-title">Pantalón Chino Comfort</h4>
              <div class="product-pricing">
                <span class="price-current">Bs. 220.00</span>
                <span class="stock-indicator in-stock"><i class="ri-checkbox-circle-fill"></i> Disponible en tienda</span>
              </div>
            </div>
          </div>

          <div class="product-preview-card card card-hover">
            <div class="product-badge">Exclusivo</div>
            <div class="product-img-box">
              <i class="ri-user-star-line product-placeholder-icon"></i>
            </div>
            <div class="product-info">
              <span class="product-category">Trajes & Blazers</span>
              <h4 class="product-title">Blazer Ejecutivo Navy</h4>
              <div class="product-pricing">
                <span class="price-current">Bs. 450.00</span>
                <span class="stock-indicator in-stock"><i class="ri-checkbox-circle-fill"></i> Disponible en tienda</span>
              </div>
            </div>
          </div>
        </div>

        <div class="info-cta card glass text-center">
          <i class="ri-store-3-line cta-icon text-accent"></i>
          <h4>¿Deseas probarte estas prendas?</h4>
          <p class="text-muted">Inicia sesión para reservar tu talla en cualquiera de nuestras sucursales en Cochabamba, La Paz o Santa Cruz.</p>
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

    .hombre-hero {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0369a1 100%);
    }

    .hero-overlay {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at top right, rgba(255, 255, 255, 0.1), transparent 70%);
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
      color: #cbd5e1;
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

    .product-badge {
      position: absolute;
      top: 1.5rem;
      left: 1.5rem;
      background: var(--primary);
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.25rem 0.6rem;
      border-radius: var(--radius-full);
      z-index: 2;
    }

    .product-img-box {
      height: 220px;
      background: #f1f5f9;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .product-placeholder-icon {
      font-size: 4rem;
      color: #94a3b8;
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
export class HombreComponent {}
