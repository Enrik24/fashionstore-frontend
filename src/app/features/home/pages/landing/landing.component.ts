import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AiService } from '../../../../core/services/ai.service';
import { PublicCatalogService } from '../../../../core/services/public-catalog.service';
import { Producto } from '../../../../core/models/catalog.model';
import { ProductCardComponent } from '../../../catalog/components/product-card/product-card.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent],
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
              Descubre las últimas tendencias en moda para hombre y mujer en nuestro catálogo interactivo. Reserva tus prendas favoritas para probártelas en tu sucursal más cercana, visualízalas en tiempo real con nuestro vestidor virtual en realidad aumentada o consulta al <strong>asistente virtual con IA</strong> para encontrar tu estilo ideal.
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
                <img
                  src="assets/images/hero-temporada.jpg"
                  alt="Look urbano de la Colección Primavera - Verano 2026"
                  class="visual-photo"
                />
                <div class="visual-photo-caption">
                  <div class="visual-card-title">Colección Primavera - Verano</div>
                  <div class="visual-card-price">Desde Bs. 149.00</div>
                </div>
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
          <p class="section-desc">
            Diseños vanguardistas confeccionados con los más altos estándares de calidad textil.
            Recorre el catálogo completo y filtra por talla, color o temporada.
          </p>
        </div>

        <div class="grid grid-cols-2 categories-grid">
          <!-- Card Mujer -->
          <div class="category-card category-women card-hover">
            <img
              src="assets/images/coleccion-mujer.jpg"
              alt="Modelo con look de la Colección Mujer 2026"
              class="category-bg"
              loading="lazy"
            />
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
            <img
              src="assets/images/coleccion-hombre.jpg"
              alt="Modelo con look de la Colección Hombre 2026"
              class="category-bg"
              loading="lazy"
            />
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

        <div class="assistant-hint glass">
          <i class="ri-sparkling-fill"></i>
          <p>
            <strong>¿No sabes por dónde empezar?</strong> Abre el chat <strong>Fashion IA</strong> en la
            esquina inferior derecha: nuestro asistente virtual con IA analiza el catálogo interactivo y te
            arma un outfit completo según la ocasión, tu talla y tu estilo. Inicia sesión para conversar con él
            y reservar las prendas que más te gusten en tu sucursal más cercana.
          </p>
        </div>
      </section>

      <!-- Sección Recomendaciones -->
      <section class="container recommendations-section">
        <div class="section-header-flex">
          <div>
            <div class="section-badge-inline">
              <i class="ri-sparkling-fill text-accent"></i>
              <span>{{ recommendationBadge() }}</span>
            </div>
            <h2 class="section-title">
              @if (isPersonalized()) {
                Recomendaciones Para Ti
              } @else {
                Recomendaciones
              }
            </h2>
            <p class="section-desc">
              {{ recommendationMessage() }}
            </p>
          </div>
          <a routerLink="/catalog" class="btn btn-outline-accent btn-sm view-all-btn">
            Explorar Catálogo Completo <i class="ri-arrow-right-line"></i>
          </a>
        </div>

        @if (isLoadingRecommendations()) {
          <div class="recommendations-loading py-12 text-center">
            <i class="ri-loader-4-line spin-icon text-3xl text-accent"></i>
            <p class="text-muted mt-3">Cargando recomendaciones destacadas...</p>
          </div>
        } @else if (recommendedProducts().length > 0) {
          <div class="recommendations-grid">
            @for (product of recommendedProducts(); track product.id) {
              <app-product-card [product]="product" class="animate-fade-in"></app-product-card>
            }
          </div>
        }
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

      <!-- AI Fashion Trends Section (CU20) -->
      <section class="container ai-trends-section">
        <div class="section-header text-center">
          <span class="section-subtitle"><i class="ri-sparkling-fill text-accent"></i> INTELIGENCIA ARTIFICIAL GENERATIVA</span>
          <h2 class="section-title">Tendencias de Moda & Pronóstico de Estilo 2026</h2>
          <p class="section-desc">Análisis predictivo de tendencias y popularidad calculado en tiempo real por nuestros modelos de IA.</p>
        </div>

        <div class="trends-grid">
          @for (trend of trends(); track trend.nombre) {
            <div class="trend-card card animate-fade-in">
              <div class="trend-header">
                <span class="trend-cat-tag">{{ trend.categoria }}</span>
                <div class="popularity-badge">
                  <i class="ri-fire-fill text-warning"></i>
                  <span>{{ trend.popularidad_score }}% popularidad</span>
                </div>
              </div>
              <h3 class="trend-name">{{ trend.nombre }}</h3>
              <p class="trend-desc">{{ trend.descripcion }}</p>
              <div class="trend-action">
                <a routerLink="/catalog" class="trend-link">
                  Explorar prendas de este estilo <i class="ri-arrow-right-line"></i>
                </a>
              </div>
            </div>
          } @empty {
            <div class="trend-card card">
              <div class="trend-header">
                <span class="trend-cat-tag">Urbano & Casual</span>
                <div class="popularity-badge"><i class="ri-fire-fill text-warning"></i> 94%</div>
              </div>
              <h3 class="trend-name">Minimalismo Contemporáneo</h3>
              <p class="trend-desc">Cortes limpios, tonos neutros y tejidos sostenibles de máxima durabilidad.</p>
              <div class="trend-action">
                <a routerLink="/catalog" class="trend-link">Explorar <i class="ri-arrow-right-line"></i></a>
              </div>
            </div>
            <div class="trend-card card">
              <div class="trend-header">
                <span class="trend-cat-tag">Gala & Noche</span>
                <div class="popularity-badge"><i class="ri-fire-fill text-warning"></i> 89%</div>
              </div>
              <h3 class="trend-name">Elegancia Nocturna</h3>
              <p class="trend-desc">Vestidos de seda, trajes satinados y cortes asimétricos para ocasiones especiales.</p>
              <div class="trend-action">
                <a routerLink="/catalog" class="trend-link">Explorar <i class="ri-arrow-right-line"></i></a>
              </div>
            </div>
            <div class="trend-card card">
              <div class="trend-header">
                <span class="trend-cat-tag">Deportivo Chic</span>
                <div class="popularity-badge"><i class="ri-fire-fill text-warning"></i> 91%</div>
              </div>
              <h3 class="trend-name">Athleisure de Alta Costura</h3>
              <p class="trend-desc">Prendas con tecnología transpirable adaptadas para el día a día en la ciudad.</p>
              <div class="trend-action">
                <a routerLink="/catalog" class="trend-link">Explorar <i class="ri-arrow-right-line"></i></a>
              </div>
            </div>
          }
        </div>
      </section>

      <!-- Call to Action Banner -->
      <section class="container cta-section">
        <div class="cta-banner glass-dark">
          <div class="cta-content">
            <span class="cta-badge">EXPERIENCIA EXCLUSIVA</span>
            <h2 class="cta-title">Únete a FashionStore hoy mismo</h2>
            <p class="cta-text">Regístrate para disfrutar de reservas express, catálogo interactivo, recomendaciones de nuestro asistente virtual con IA y notificaciones de nuevos ingresos.</p>
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
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, rgba(225, 29, 72, 0.2) 0%, rgba(15, 23, 42, 0.6) 100%);
      border-radius: var(--radius-lg);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .visual-photo {
      display: block;
      width: 100%;
      height: 280px;
      object-fit: cover;
      object-position: center 18%;
    }

    .visual-photo-caption {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      padding: 1.25rem 1.5rem;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, 0.85) 60%, rgba(15, 23, 42, 0.96) 100%);
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

    .category-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 25%;
      z-index: 0;
      transition: transform var(--transition-slow);
    }

    .category-card:hover .category-bg {
      transform: scale(1.06);
    }

    .category-overlay {
      position: absolute;
      inset: 0;
      z-index: 1;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.15) 0%, rgba(15, 23, 42, 0.55) 55%, rgba(15, 23, 42, 0.9) 100%);
    }

    .category-women .category-overlay {
      background: linear-gradient(180deg, rgba(131, 24, 67, 0.25) 0%, rgba(76, 5, 25, 0.68) 55%, rgba(30, 2, 11, 0.94) 100%);
    }

    .category-men .category-overlay {
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.2) 0%, rgba(15, 23, 42, 0.7) 55%, rgba(2, 6, 23, 0.94) 100%);
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

    .assistant-hint {
      margin-top: 2rem;
      padding: 1.25rem 1.5rem;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
      background: var(--bg-card);
      display: flex;
      align-items: flex-start;
      gap: 1rem;

      i {
        font-size: 1.5rem;
        color: var(--accent);
        line-height: 1.4;
      }

      p {
        margin: 0;
        font-size: 0.9375rem;
        line-height: 1.6;
        color: var(--text-muted);
      }

      strong {
        color: var(--primary);
      }
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

    .ai-trends-section {
      padding: 2rem 0;
    }

    .trends-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }

    .trend-card {
      padding: 1.75rem;
      border-radius: var(--radius-lg, 16px);
      background: #ffffff;
      border: 1px solid var(--border-color, #e2e8f0);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
    }

    .trend-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0,0,0,0.06);
    }

    .trend-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .trend-cat-tag {
      background: rgba(99, 102, 241, 0.1);
      color: #4f46e5;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.6rem;
      border-radius: 99px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .popularity-badge {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.8rem;
      font-weight: 700;
      color: #0f172a;
    }

    .trend-name {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 700;
      color: #0f172a;
    }

    .trend-desc {
      margin: 0;
      font-size: 0.875rem;
      color: #64748b;
      line-height: 1.5;
      flex: 1;
    }

    .trend-action {
      margin-top: 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px solid #f1f5f9;
    }

    .trend-link {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--accent, #ec4899);
      text-decoration: none;
      transition: gap 0.2s ease;
    }

    .trend-link:hover {
      gap: 0.6rem;
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

    /* Recommendations Section */
    .recommendations-section {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .section-header-flex {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 1.25rem;
    }

    .section-badge-inline {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 0.5rem;
    }

    .view-all-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .recommendations-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
    }

    .recommendations-loading {
      background: rgba(248, 250, 252, 0.6);
      border: 1px dashed var(--border-color);
      border-radius: var(--radius-lg);
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
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
      .recommendations-grid {
        grid-template-columns: repeat(2, 1fr);
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
      .recommendations-grid {
        grid-template-columns: 1fr;
      }
      .section-header-flex {
        flex-direction: column;
        align-items: flex-start;
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
      .visual-photo {
        height: 220px;
      }
      .assistant-hint {
        flex-direction: column;
        gap: 0.5rem;
      }
    }
  `]
})
export class LandingComponent implements OnInit {
  public authService = inject(AuthService);
  private aiService = inject(AiService);
  private publicCatalogService = inject(PublicCatalogService);

  public trends = signal<any[]>([]);
  public recommendedProducts = signal<Producto[]>([]);
  public isLoadingRecommendations = signal<boolean>(true);
  public isPersonalized = signal<boolean>(false);
  public recommendationBadge = signal<string>('SELECCIÓN ESPECIAL • NOVEDADES');
  public recommendationMessage = signal<string>(
    'Descubre las prendas más recientes añadidas a nuestra tienda, seleccionadas cuidadosamente para hombre, mujer y estilos unisex.'
  );

  ngOnInit(): void {
    this.loadRecommendations();

    this.aiService.getTrends().subscribe({
      next: (res) => {
        if (res && res.tendencias_destacadas) {
          this.trends.set(res.tendencias_destacadas);
        }
      },
      error: () => {}
    });
  }

  loadRecommendations(): void {
    this.isLoadingRecommendations.set(true);

    if (this.authService.isAuthenticated()) {
      this.aiService.getRecommendations({ limite: 4 }).subscribe({
        next: (res) => {
          if (res && res.recomendaciones && res.recomendaciones.length > 0) {
            const mapped: Producto[] = res.recomendaciones.map((rec: any) => ({
              id: rec.producto_id || rec.id,
              sku: rec.sku || `REC-${rec.producto_id || rec.id}`,
              nombre: rec.nombre,
              descripcion: rec.razon || 'Recomendación personalizada de moda',
              precio: Number(rec.precio || 0),
              imagenes: this.normalizarImagenes(rec.imagenes, rec.imagen_url),
              estado: 'ACTIVO' as any,
              genero: rec.genero,
              categoria_id: rec.categoria_id ?? 0,
              categoria: rec.categoria ? { id: 0, nombre: rec.categoria, descripcion: '' } : undefined
            }));

            this.recommendedProducts.set(mapped.slice(0, 4));
            this.isPersonalized.set(true);
            this.recommendationBadge.set(
              res.estilo_detectado
                ? `PERSONALIZADO CON IA • ${res.estilo_detectado.toUpperCase()}`
                : 'PERSONALIZADO CON IA'
            );
            if (res.mensaje_personalizado) {
              this.recommendationMessage.set(res.mensaje_personalizado);
            }
            this.isLoadingRecommendations.set(false);
            return;
          }
          this.loadDefaultRecommendations();
        },
        error: (err) => {
          console.warn('No se pudieron obtener recomendaciones personalizadas de IA, usando catálogo:', err);
          this.loadDefaultRecommendations();
        }
      });
    } else {
      this.loadDefaultRecommendations();
    }
  }

  private normalizarImagenes(imagenes: any, imagenUrl?: any): string[] {
    if (Array.isArray(imagenes) && imagenes.length > 0) return imagenes;
    if (typeof imagenes === 'string' && imagenes.trim().length > 0) {
      try {
        const parsed = JSON.parse(imagenes);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        return [imagenes];
      }
    }
    if (imagenUrl) return [imagenUrl];
    return [];
  }

  loadDefaultRecommendations(): void {
    this.isPersonalized.set(false);
    this.recommendationBadge.set('SELECCIÓN ESPECIAL • NOVEDADES');
    this.recommendationMessage.set(
      'Descubre las prendas más recientes añadidas a nuestra tienda, seleccionadas cuidadosamente para hombre, mujer y estilos unisex.'
    );

    this.publicCatalogService.getCatalog({ limite: 30 }).subscribe({
      next: (res) => {
        if (res && res.items && res.items.length > 0) {
          const items = res.items;

          // Separar los productos más recientes por género
          const menItems = items.filter(p => p.genero === 'HOMBRE');
          const womenOrUnisexItems = items.filter(p => p.genero === 'MUJER' || p.genero === 'UNISEX');

          const selected: Producto[] = [];

          // Tomar los 2 más recientes de Hombre y los 2 más recientes de Mujer / Unisex
          const takeMen = menItems.slice(0, 2);
          const takeWomen = womenOrUnisexItems.slice(0, 2);

          selected.push(...takeMen, ...takeWomen);

          // Si falta alguno para completar 4, rellenar con los productos más recientes restantes
          if (selected.length < 4) {
            const selectedIds = new Set(selected.map(s => s.id));
            for (const item of items) {
              if (!selectedIds.has(item.id)) {
                selected.push(item);
                selectedIds.add(item.id);
                if (selected.length === 4) break;
              }
            }
          }

          this.recommendedProducts.set(selected.slice(0, 4));
        }
        this.isLoadingRecommendations.set(false);
      },
      error: (err) => {
        console.error('Error cargando recomendaciones por defecto:', err);
        this.isLoadingRecommendations.set(false);
      }
    });
  }
}

