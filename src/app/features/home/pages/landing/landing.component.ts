import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="landing-page">
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="hero-backdrop"></div>
        <div class="container hero-container">
          <div class="hero-content animate-fade-in">
            <div class="hero-tag">
              <span class="pulse-dot"></span>
              <span>NUEVA COLECCIÓN 2026 &bull; INTELIGENCIA EN MODA</span>
            </div>
            <h1 class="hero-title">
              Viste con Estilo, <br>
              <span class="gradient-text font-serif">Experimenta con IA</span>
            </h1>
            <p class="hero-description">
              Descubre las últimas tendencias en moda para hombre y mujer. Reserva tus prendas favoritas para probártelas en tu sucursal más cercana o visualízalas en tiempo real con nuestro vestidor virtual en realidad aumentada.
            </p>
            <div class="hero-actions">
              <a routerLink="/home/mujer" class="btn btn-accent btn-lg">
                <i class="ri-women-line"></i> Explorar Mujer
              </a>
              <a routerLink="/home/hombre" class="btn btn-outline btn-lg hero-btn-secondary">
                <i class="ri-men-line"></i> Explorar Hombre
              </a>
              @if (!authService.isAuthenticated()) {
                <a routerLink="/auth/register" class="btn btn-secondary btn-lg">
                  <i class="ri-sparkling-fill"></i> Crear Cuenta
                </a>
              }
            </div>

            <!-- Quick Metrics -->
            <div class="hero-stats">
              <div class="stat-item">
                <span class="stat-number">100%</span>
                <span class="stat-label">Moda Exclusiva</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span class="stat-number">3+</span>
                <span class="stat-label">Ciudades y Sucursales</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span class="stat-number">AR</span>
                <span class="stat-label">Vestidor Virtual</span>
              </div>
            </div>
          </div>

          <div class="hero-visual">
            <div class="visual-card visual-card-1 glass animate-slide-down">
              <div class="visual-badge"><i class="ri-t-shirt-air-line"></i> Nueva Temporada</div>
              <div class="visual-image-placeholder">
                <div class="category-icon-large"><i class="ri-sparkling-2-line"></i></div>
                <div class="visual-card-title">Colección Primavera - Verano</div>
                <div class="visual-card-price">Desde Bs. 149.00</div>
              </div>
            </div>
            <div class="floating-badge badge-top-right glass">
              <i class="ri-store-3-line text-accent"></i>
              <div>
                <strong>Reserva en Tienda</strong>
                <span>Pruébate antes de comprar</span>
              </div>
            </div>
            <div class="floating-badge badge-bottom-left glass">
              <i class="ri-flashlight-fill text-gold"></i>
              <div>
                <strong>Stock en Tiempo Real</strong>
                <span>Multi-sucursal sincronizado</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Category Split Banners (Hombre & Mujer) -->
      <section class="container categories-section">
        <div class="section-header text-center">
          <span class="section-subtitle">EXPLORA NUESTRO CATÁLOGO</span>
          <h2 class="section-title">Elige tu Estilo</h2>
          <p class="section-desc">Diseños vanguardistas confeccionados con los más altos estándares de calidad textil.</p>
        </div>

        <div class="grid grid-cols-2 categories-grid">
          <!-- Card Mujer -->
          <div class="category-card category-women card-hover">
            <div class="category-overlay"></div>
            <div class="category-content">
              <span class="category-tag">TENDENCIAS 2026</span>
              <h3 class="category-title">Colección Mujer</h3>
              <p class="category-text">Vestidos de gala, blusas casuales, conjuntos formales y accesorios de alta costura.</p>
              <a routerLink="/home/mujer" class="btn btn-accent">
                Ver Colección Mujer <i class="ri-arrow-right-line"></i>
              </a>
            </div>
          </div>

          <!-- Card Hombre -->
          <div class="category-card category-men card-hover">
            <div class="category-overlay"></div>
            <div class="category-content">
              <span class="category-tag">ESTILO URBANO & FORMAL</span>
              <h3 class="category-title">Colección Hombre</h3>
              <p class="category-text">Trajes ejecutivos, camisas premium, jeans modernos y calzado de primera línea.</p>
              <a routerLink="/home/hombre" class="btn btn-primary">
                Ver Colección Hombre <i class="ri-arrow-right-line"></i>
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- Smart Features Section -->
      <section class="features-section">
        <div class="container">
          <div class="section-header text-center">
            <span class="section-subtitle">INNOVACIÓN FASHIONSTORE</span>
            <h2 class="section-title">¿Por qué comprar con nosotros?</h2>
          </div>

          <div class="grid grid-cols-4 features-grid">
            <div class="feature-card card">
              <div class="feature-icon-box">
                <i class="ri-augmented-reality-line"></i>
              </div>
              <h4 class="feature-title">Vestidor Virtual RA</h4>
              <p class="feature-text">Visualiza cómo te lucirán las prendas en tiempo real usando realidad aumentada desde tu dispositivo móvil.</p>
            </div>

            <div class="feature-card card">
              <div class="feature-icon-box">
                <i class="ri-calendar-check-line"></i>
              </div>
              <h4 class="feature-title">Reserva de Prendas</h4>
              <p class="feature-text">Selecciona tus tallas y colores, reserva en tu sucursal más cercana y te tendremos todo listo en el probador.</p>
            </div>

            <div class="feature-card card">
              <div class="feature-icon-box">
                <i class="ri-building-line"></i>
              </div>
              <h4 class="feature-title">Red de Sucursales</h4>
              <p class="feature-text">Consulta disponibilidad de existencias en tiempo real en nuestras tiendas de Cochabamba, La Paz y Santa Cruz.</p>
            </div>

            <div class="feature-card card">
              <div class="feature-icon-box">
                <i class="ri-brain-line"></i>
              </div>
              <h4 class="feature-title">Asistente con IA</h4>
              <p class="feature-text">Recomendaciones personalizadas basadas en tus preferencias, estilo corporal, temporada y combinaciones.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Call to Action Banner -->
      <section class="container cta-section">
        <div class="cta-banner glass-dark">
          <div class="cta-content">
            <span class="cta-badge">EXPERIENCIA EXCLUSIVA</span>
            <h2 class="cta-title">Únete a FashionStore hoy mismo</h2>
            <p class="cta-text">Regístrate para disfrutar de reservas express, catálogo interactivo y notificaciones de nuevos ingresos.</p>
            <div class="cta-buttons">
              @if (!authService.isAuthenticated()) {
                <a routerLink="/auth/register" class="btn btn-accent btn-lg">
                  <i class="ri-user-star-line"></i> Registrarme Ahora
                </a>
                <a routerLink="/auth/login" class="btn btn-outline-accent btn-lg">
                  Iniciar Sesión
                </a>
              } @else {
                <a routerLink="/home/mujer" class="btn btn-accent btn-lg">
                  <i class="ri-shopping-bag-3-line"></i> Ir de Compras
                </a>
              }
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .landing-page {
      display: flex;
      flex-direction: column;
      gap: 5rem;
      padding-bottom: 5rem;
    }

    /* Hero */
    .hero-section {
      position: relative;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%);
      color: white;
      padding: 5rem 0 6rem;
      overflow: hidden;
    }

    .hero-backdrop {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(rgba(225, 29, 72, 0.15) 1px, transparent 1px);
      background-size: 32px 32px;
      opacity: 0.6;
    }

    .hero-container {
      position: relative;
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 3.5rem;
      align-items: center;
    }

    .hero-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .hero-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.85rem;
      border-radius: var(--radius-full);
      background: rgba(225, 29, 72, 0.15);
      border: 1px solid rgba(225, 29, 72, 0.3);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--accent-light);
      width: fit-content;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 8px var(--accent);
      animation: pulseGlow 2s infinite;
    }

    .hero-title {
      font-size: 3.25rem;
      color: white;
      font-weight: 800;
      line-height: 1.15;
    }

    .gradient-text {
      background: linear-gradient(135deg, #ffffff 0%, #fb7185 50%, #f59e0b 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero-description {
      font-size: 1.05rem;
      color: #cbd5e1;
      line-height: 1.65;
      max-width: 580px;
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-top: 0.5rem;
    }

    .hero-btn-secondary {
      color: white;
      border-color: rgba(255, 255, 255, 0.3);
      &:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: white;
      }
    }

    .hero-stats {
      display: flex;
      align-items: center;
      gap: 2rem;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .stat-item {
      display: flex;
      flex-direction: column;
    }

    .stat-number {
      font-family: 'Outfit', sans-serif;
      font-size: 1.5rem;
      font-weight: 800;
      color: white;
    }

    .stat-label {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .stat-divider {
      width: 1px;
      height: 32px;
      background: rgba(255, 255, 255, 0.15);
    }

    /* Hero Visual */
    .hero-visual {
      position: relative;
      display: flex;
      justify-content: center;
    }

    .visual-card {
      width: 100%;
      max-width: 360px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: var(--radius-xl);
      padding: 1.5rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    .visual-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--gold-light);
      margin-bottom: 1rem;
    }

    .visual-image-placeholder {
      background: linear-gradient(135deg, rgba(225, 29, 72, 0.2) 0%, rgba(15, 23, 42, 0.6) 100%);
      border-radius: var(--radius-lg);
      padding: 3rem 1.5rem;
      text-align: center;
      border: 1px dashed rgba(255, 255, 255, 0.2);
    }

    .category-icon-large {
      font-size: 3.5rem;
      color: var(--accent-light);
      margin-bottom: 1rem;
    }

    .visual-card-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: white;
      margin-bottom: 0.25rem;
    }

    .visual-card-price {
      font-size: 0.9375rem;
      color: var(--gold-light);
      font-weight: 600;
    }

    .floating-badge {
      position: absolute;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-lg);
      font-size: 0.8125rem;
      color: var(--primary);
      box-shadow: var(--shadow-xl);

      strong {
        display: block;
        font-weight: 700;
      }
      span {
        font-size: 0.75rem;
        color: var(--text-muted);
      }
      i {
        font-size: 1.4rem;
      }
    }

    .badge-top-right {
      top: -15px;
      right: -20px;
    }

    .badge-bottom-left {
      bottom: -20px;
      left: -20px;
    }

    /* Section Headers */
    .section-header {
      margin-bottom: 3rem;
    }

    .section-subtitle {
      font-size: 0.8125rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: var(--accent);
      display: block;
      margin-bottom: 0.5rem;
    }

    .section-title {
      font-size: 2.25rem;
      margin-bottom: 0.5rem;
    }

    .section-desc {
      font-size: 1rem;
      color: var(--text-muted);
      max-width: 600px;
      margin: 0 auto;
    }

    /* Categories Split */
    .categories-grid {
      gap: 2rem;
    }

    .category-card {
      position: relative;
      border-radius: var(--radius-xl);
      padding: 4rem 3rem;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      min-height: 380px;
      background-size: cover;
      background-position: center;
    }

    .category-women {
      background: linear-gradient(135deg, #831843 0%, #be123c 50%, #4c0519 100%);
      color: white;
    }

    .category-men {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0369a1 100%);
      color: white;
    }

    .category-overlay {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at top right, rgba(255, 255, 255, 0.1), transparent 70%);
    }

    .category-content {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 420px;
    }

    .category-tag {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      opacity: 0.85;
    }

    .category-title {
      font-size: 2rem;
      color: white;
    }

    .category-text {
      font-size: 0.9375rem;
      opacity: 0.9;
      line-height: 1.5;
      margin-bottom: 0.5rem;
    }

    /* Features */
    .features-section {
      background: white;
      padding: 5rem 0;
      border-top: 1px solid var(--border-color);
      border-bottom: 1px solid var(--border-color);
    }

    .features-grid {
      gap: 1.5rem;
    }

    .feature-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      border: 1px solid var(--border-color);
      transition: all var(--transition-normal);

      &:hover {
        border-color: var(--accent);
        transform: translateY(-4px);
      }
    }

    .feature-icon-box {
      width: 52px;
      height: 52px;
      border-radius: var(--radius-md);
      background: rgba(225, 29, 72, 0.08);
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.75rem;
    }

    .feature-title {
      font-size: 1.15rem;
      font-weight: 700;
    }

    .feature-text {
      font-size: 0.875rem;
      color: var(--text-muted);
      line-height: 1.6;
    }

    /* CTA */
    .cta-banner {
      border-radius: var(--radius-xl);
      padding: 4.5rem 3rem;
      text-align: center;
      background: linear-gradient(135deg, var(--primary-dark) 0%, #1e1b4b 100%);
    }

    .cta-content {
      max-width: 640px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
    }

    .cta-badge {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: var(--accent-light);
    }

    .cta-title {
      font-size: 2.5rem;
      color: white;
    }

    .cta-text {
      color: #cbd5e1;
      font-size: 1.05rem;
      line-height: 1.6;
    }

    .cta-buttons {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
    }

    @media (max-width: 992px) {
      .hero-container {
        grid-template-columns: 1fr;
      }
      .hero-visual {
        margin-top: 2rem;
      }
      .badge-top-right, .badge-bottom-left {
        display: none;
      }
      .features-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 576px) {
      .hero-title {
        font-size: 2.25rem;
      }
      .categories-grid {
        grid-template-columns: 1fr;
      }
      .features-grid {
        grid-template-columns: 1fr;
      }
      .cta-title {
        font-size: 1.85rem;
      }
      .cta-buttons {
        flex-direction: column;
        width: 100%;
      }
    }
  `]
})
export class LandingComponent {
  public authService = inject(AuthService);
}
