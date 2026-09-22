import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PublicCatalogService } from '../../../../core/services/public-catalog.service';
import { Producto } from '../../../../core/models/catalog.model';
import { ProductCardComponent } from '../../../catalog/components/product-card/product-card.component';

@Component({
  selector: 'app-mujer',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent],
  template: `
    <div class="category-page container">
      <!-- Banner -->
      <div class="category-hero mujer-hero animate-fade-in">
        <img
          src="assets/images/coleccion-mujer.jpg"
          alt="Modelo con look de la Colección Mujer 2026"
          class="hero-photo"
        />
        <div class="hero-overlay"></div>
        <div class="category-hero-content">
          <span class="badge badge-primary">COLECCIÓN FEMENINA 2026</span>
          <h1 class="hero-title">Colección Mujer</h1>
          <p class="hero-subtitle">
            Descubre vestidos de temporada, blusas elegantes y conjuntos diseñados para realzar tu belleza.
            Explora el catálogo interactivo, reserva tu talla en la sucursal más cercana y déjate asesorar
            por nuestro asistente virtual con IA.
          </p>
          <div class="hero-actions">
            <a routerLink="/catalog" [queryParams]="{ genero: 'MUJER' }" class="btn btn-accent">
              <i class="ri-store-2-line"></i> Ver Catálogo Completo
            </a>
            <a routerLink="/home/hombre" class="btn btn-outline hero-btn-ghost">
              <i class="ri-men-line"></i> Colección Hombre
            </a>
          </div>
        </div>
      </div>

      <!-- Sample Product Showcase (Mujer) -->
      <div class="showcase-section">
        <div class="showcase-header">
          <div>
            <h3>Prendas Destacadas para Mujer</h3>
            <span class="text-muted">Selección obtenida en tiempo real desde nuestro catálogo interactivo</span>
          </div>
          <a routerLink="/catalog" [queryParams]="{ genero: 'MUJER' }" class="btn btn-outline-accent btn-sm">
            Ver Catálogo Completo <i class="ri-arrow-right-line"></i>
          </a>
        </div>

        @if (isLoading()) {
          <div class="grid grid-cols-3 product-grid">
            @for (placeholder of skeletonItems; track placeholder) {
              <div class="product-preview-card card skeleton-card">
                <div class="skeleton-media"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
              </div>
            }
          </div>
        } @else if (products().length > 0) {
          <div class="grid grid-cols-3 product-grid">
            @for (product of products(); track product.id) {
              <app-product-card [product]="product" class="animate-fade-in"></app-product-card>
            }
          </div>
        } @else {
          <div class="empty-catalog card text-center">
            <i class="ri-hanger-line empty-icon"></i>
            <h4>{{ hasError() ? 'No pudimos cargar las prendas de mujer' : 'Aún no hay prendas de mujer publicadas' }}</h4>
            <p class="text-muted">{{ emptyMessage() }}</p>
            <div class="info-cta-actions">
              <button type="button" class="btn btn-accent" (click)="loadFeaturedProducts()">
                <i class="ri-refresh-line"></i> Reintentar
              </button>
              <a routerLink="/catalog" class="btn btn-outline">Explorar Catálogo</a>
            </div>
          </div>
        }

        <div class="assistant-cta card">
          <div class="assistant-icon-box">
            <i class="ri-sparkling-fill"></i>
          </div>
          <div class="assistant-body">
            <h4>¿No sabes qué look elegir? Consulta al Asistente Virtual con IA</h4>
            <p>
              El chat <strong>Fashion IA</strong> está disponible en la esquina inferior derecha. Cuéntale la
              ocasión, tu talla y tus colores favoritos y te armará combinaciones con prendas de mujer tomadas
              directamente de nuestro catálogo interactivo. Inicia sesión para conversar con él.
            </p>
            <div class="assistant-actions">
              <a routerLink="/catalog" [queryParams]="{ genero: 'MUJER' }" class="btn btn-sm btn-outline-accent">
                <i class="ri-store-2-line"></i> Explorar Catálogo de Mujer
              </a>
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

    .hero-photo {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 22%;
      z-index: 0;
    }

    .hero-overlay {
      position: absolute;
      inset: 0;
      z-index: 1;
      background: linear-gradient(100deg, rgba(76, 5, 25, 0.94) 0%, rgba(131, 24, 67, 0.78) 42%, rgba(76, 5, 25, 0.35) 100%);
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .hero-btn-ghost {
      border-color: rgba(255, 255, 255, 0.55);
      color: white;

      &:hover {
        background: rgba(255, 255, 255, 0.14);
        border-color: white;
      }
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
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 2rem;

      h3 {
        margin-bottom: 0.25rem;
      }
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

    /* Skeleton de carga */
    .skeleton-card {
      padding: 1rem;
      gap: 1rem;
    }

    .skeleton-media {
      height: 240px;
      border-radius: var(--radius-md);
      background: linear-gradient(90deg, #eef2f7 25%, #e2e8f0 37%, #eef2f7 63%);
      background-size: 400% 100%;
      animation: skeleton-loading 1.4s ease infinite;
    }

    .skeleton-line {
      height: 12px;
      border-radius: var(--radius-full);
      background: #e2e8f0;
    }

    .skeleton-line.short {
      width: 55%;
    }

    @keyframes skeleton-loading {
      0% { background-position: 100% 50%; }
      100% { background-position: 0 50%; }
    }

    /* Estado vacío / error de catálogo */
    .empty-catalog {
      padding: 3rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      max-width: 640px;
      margin: 0 auto 3.5rem;
    }

    .empty-icon {
      font-size: 2.5rem;
      color: var(--accent);
    }

    /* CTA del asistente virtual con IA */
    .assistant-cta {
      margin-top: 2rem;
      padding: 1.5rem 1.75rem;
      display: flex;
      align-items: flex-start;
      gap: 1.25rem;
    }

    .assistant-icon-box {
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      background: rgba(225, 29, 72, 0.1);
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }

    .assistant-body {
      h4 {
        font-size: 1.05rem;
        margin-bottom: 0.35rem;
      }

      p {
        margin: 0;
        font-size: 0.875rem;
        line-height: 1.6;
        color: var(--text-muted);
      }

      strong {
        color: var(--primary);
      }
    }

    .assistant-actions {
      margin-top: 0.9rem;
    }
  `]
})
export class MujerComponent implements OnInit {
  private publicCatalogService = inject(PublicCatalogService);

  public products = signal<Producto[]>([]);
  public isLoading = signal<boolean>(true);
  public hasError = signal<boolean>(false);
  public skeletonItems = [1, 2, 3];
  public emptyMessage = signal<string>(
    'Nuestro catálogo se actualiza constantemente. Explora todas las categorías o pídele recomendaciones al asistente virtual con IA mientras llega la nueva mercadería.'
  );

  ngOnInit(): void {
    this.loadFeaturedProducts();
  }

  loadFeaturedProducts(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.publicCatalogService
      .getCatalog({ genero: 'MUJER', orden_por: 'recientes', limite: 12 })
      .subscribe({
        next: (res) => {
          this.products.set(this.pickFeatured(res?.items ?? []));
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error cargando las prendas destacadas de mujer:', err);
          this.products.set([]);
          this.hasError.set(true);
          this.emptyMessage.set(
            'No pudimos conectar con el catálogo en este momento. Revisa tu conexión e inténtalo nuevamente.'
          );
          this.isLoading.set(false);
        }
      });
  }

  /** Prioriza las prendas que ya tienen imagen cargada y muestra como máximo 3 tarjetas. */
  private pickFeatured(items: Producto[]): Producto[] {
    const withImage = items.filter((p) => (p.imagenes?.length ?? 0) > 0);
    const withoutImage = items.filter((p) => (p.imagenes?.length ?? 0) === 0);
    return [...withImage, ...withoutImage].slice(0, 3);
  }
}
