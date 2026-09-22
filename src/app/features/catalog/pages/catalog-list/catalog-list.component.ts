import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PublicCatalogService } from '../../../../core/services/public-catalog.service';
import { CatalogApiService } from '../../../../core/services/catalog-api.service';
import { Producto, GeneroProducto } from '../../../../core/models/catalog.model';
import { ProductoFilterParams, ProductoBusquedaResponse } from '../../../../core/models/public-catalog.model';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { CatalogFiltersComponent } from '../../components/catalog-filters/catalog-filters.component';

@Component({
  selector: 'app-catalog-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductCardComponent, CatalogFiltersComponent],
  template: `
    <div class="catalog-page">
      <!-- Hero Banner -->
      <div class="catalog-hero">
        <div class="container hero-content">
          <span class="hero-badge">Colección 2026</span>
          <h1 class="hero-title">Catálogo de Moda & Tendencias</h1>
          <p class="hero-subtitle">
            Descubre nuestra selección exclusiva de prendas diseñadas con la más alta calidad y estilo contemporáneo.
          </p>

          <!-- Search Bar -->
          <div class="search-box">
            <i class="ri-search-line search-icon"></i>
            <input 
              type="text" 
              class="search-input" 
              placeholder="Buscar por nombre, tela, estilo..."
              [(ngModel)]="filters.q" 
              (keyup.enter)="onSearch()"
            />
            <button class="btn btn-accent btn-search" (click)="onSearch()">
              Buscar
            </button>
          </div>

          <!-- Gender Quick Filter Tabs -->
          <div class="hero-gender-tabs">
            <button 
              type="button" 
              class="hero-tab-btn" 
              [class.active]="!filters.genero"
              (click)="onGenderTabSelect(undefined)"
            >
              <i class="ri-apps-2-line"></i> Toda la Moda
            </button>
            <button 
              type="button" 
              class="hero-tab-btn" 
              [class.active]="filters.genero === 'HOMBRE'"
              (click)="onGenderTabSelect('HOMBRE')"
            >
              <i class="ri-men-line"></i> Hombre
            </button>
            <button 
              type="button" 
              class="hero-tab-btn" 
              [class.active]="filters.genero === 'MUJER'"
              (click)="onGenderTabSelect('MUJER')"
            >
              <i class="ri-women-line"></i> Mujer
            </button>
            <button 
              type="button" 
              class="hero-tab-btn" 
              [class.active]="filters.genero === 'UNISEX'"
              (click)="onGenderTabSelect('UNISEX')"
            >
              <i class="ri-genderless-line"></i> Unisex
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content Layout -->
      <div class="container catalog-container">
        <div class="catalog-layout">
          <!-- Sidebar Filters -->
          <aside class="filters-sidebar">
            <app-catalog-filters 
              [filters]="filters" 
              (filtersChange)="onFiltersChanged($event)"
            ></app-catalog-filters>
          </aside>

          <!-- Products View -->
          <main class="products-main">
            <!-- Active Collection Banner -->
            @if (filters.coleccion_id && nombreColeccion) {
              <div class="collection-banner">
                <span class="collection-banner-icon"><i class="ri-bookmark-3-fill"></i></span>
                <span>Viendo la colección <strong>{{ nombreColeccion }}</strong></span>
                <button type="button" class="collection-banner-clear" (click)="limpiarColeccion()" title="Quitar filtro de colección">
                  <i class="ri-close-line"></i> Ver todo
                </button>
              </div>
            }
            <!-- Results Bar -->
            <div class="results-header">
              <div class="results-count">
                <span>Mostrando <strong>{{ products.length }}</strong> de <strong>{{ totalProducts }}</strong> productos</span>
              </div>
              <div class="results-sort">
                <label class="sort-label">Ordenar:</label>
                <select class="form-control form-control-sm sort-select" [(ngModel)]="filters.orden_por" (change)="onSearch()">
                  <option value="recientes">Más recientes</option>
                  <option value="precio_asc">Precio: Menor a Mayor</option>
                  <option value="precio_desc">Precio: Mayor a Menor</option>
                  <option value="nombre">Nombre A-Z</option>
                </select>
              </div>
            </div>

            <!-- Loading State -->
            @if (loading()) {
              <div class="loading-grid">
                @for (item of [1,2,3,4,5,6]; track item) {
                  <div class="skeleton-card"></div>
                }
              </div>
            } @else if (products.length === 0) {
              <!-- Empty State -->
              <div class="empty-results card">
                <div class="empty-icon">
                  <i class="ri-shirt-line"></i>
                </div>
                <h3>No se encontraron productos</h3>
                <p>Intenta ajustar tus filtros o buscar con un término diferente.</p>
                <button class="btn btn-primary btn-sm" (click)="resetFilters()">
                  Ver todo el catálogo
                </button>
              </div>
            } @else {
              <!-- Product Grid -->
              <div class="products-grid">
                @for (product of products; track product.id) {
                  <app-product-card [product]="product"></app-product-card>
                }
              </div>

              <!-- Pagination -->
              @if (totalPages > 1) {
                <div class="pagination-bar">
                  <button 
                    class="btn btn-secondary btn-sm" 
                    [disabled]="currentPage === 1"
                    (click)="changePage(currentPage - 1)"
                  >
                    <i class="ri-arrow-left-s-line"></i> Anterior
                  </button>

                  <span class="page-indicator">
                    Página {{ currentPage }} de {{ totalPages }}
                  </span>

                  <button 
                    class="btn btn-secondary btn-sm" 
                    [disabled]="currentPage >= totalPages"
                    (click)="changePage(currentPage + 1)"
                  >
                    Siguiente <i class="ri-arrow-right-s-line"></i>
                  </button>
                </div>
              }
            }
          </main>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .catalog-page {
      min-height: 100vh;
      background-color: var(--bg-main);
      padding-bottom: 4rem;
    }

    .catalog-hero {
      background: linear-gradient(135deg, var(--primary) 0%, #1e1b4b 100%);
      color: white;
      padding: 3.5rem 0 4rem;
      text-align: center;
      position: relative;
    }

    .hero-content {
      max-width: 760px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .hero-badge {
      background: rgba(225, 29, 72, 0.2);
      border: 1px solid var(--accent);
      color: var(--accent-light);
      padding: 0.25rem 0.75rem;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 1rem;
    }

    .hero-title {
      font-size: 2.5rem;
      font-weight: 800;
      color: white;
      margin-bottom: 0.75rem;
      letter-spacing: -0.02em;
    }

    .hero-subtitle {
      font-size: 1rem;
      color: #94a3b8;
      margin-bottom: 2rem;
      line-height: 1.6;
    }

    .search-box {
      width: 100%;
      max-width: 600px;
      display: flex;
      align-items: center;
      background: white;
      border-radius: var(--radius-full);
      padding: 0.35rem 0.5rem 0.35rem 1.25rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }

    .search-icon {
      font-size: 1.25rem;
      color: var(--text-muted);
      margin-right: 0.5rem;
    }

    .search-input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 0.9375rem;
      color: var(--text-main);
      background: transparent;

      &::placeholder {
        color: #94a3b8;
      }
    }

    .btn-search {
      border-radius: var(--radius-full);
      padding: 0.6rem 1.5rem;
    }

    .hero-gender-tabs {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.75rem;
      margin-top: 1.75rem;
    }

    .hero-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 1.25rem;
      border-radius: var(--radius-full);
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #f1f5f9;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-normal);

      i {
        font-size: 1rem;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.22);
        color: white;
        transform: translateY(-1px);
      }

      &.active {
        background: white;
        color: var(--primary);
        border-color: white;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
        font-weight: 700;
      }
    }

    .catalog-container {
      margin-top: 2rem;
    }

    .catalog-layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 1.5rem;
      align-items: start;
    }

    .collection-banner {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      background: linear-gradient(135deg, rgba(139,92,246,0.12), rgba(139,92,246,0.04));
      border: 1px solid rgba(139,92,246,0.3);
      border-radius: var(--radius-md);
      padding: 0.65rem 1rem;
      margin-bottom: 1rem;
      font-size: 0.9rem;
      color: var(--primary);
    }

    .collection-banner-icon {
      color: #8b5cf6;
      font-size: 1.1rem;
    }

    .collection-banner-clear {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-full);
      padding: 0.25rem 0.75rem;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      color: var(--secondary);
    }

    .results-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border-color);
    }

    .results-count {
      font-size: 0.9375rem;
      color: var(--secondary);
    }

    .results-sort {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .sort-label {
      font-size: 0.875rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .sort-select {
      width: auto;
    }

    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1.5rem;
    }

    .loading-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1.5rem;
    }

    .skeleton-card {
      height: 380px;
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: var(--radius-lg);
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .empty-results {
      padding: 3rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      color: var(--text-muted);

      .empty-icon {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        color: var(--text-muted);
        margin-bottom: 0.5rem;
      }

      h3 {
        color: var(--primary);
        font-size: 1.25rem;
      }
    }

    .pagination-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-top: 2.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-light);
    }

    .page-indicator {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--secondary);
    }

    @media (max-width: 900px) {
      .catalog-layout {
        grid-template-columns: 1fr;
      }
      .filters-sidebar {
        margin-bottom: 1.5rem;
      }
    }
  `]
})
export class CatalogListComponent implements OnInit {
  private catalogService = inject(PublicCatalogService);
  private catalogApiService = inject(CatalogApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  public products: Producto[] = [];
  public totalProducts: number = 0;
  public totalPages: number = 1;
  public currentPage: number = 1;
  public loading = signal<boolean>(false);

  public filters: ProductoFilterParams = {
    q: '',
    orden_por: 'recientes',
    pagina: 1,
    limite: 12
  };

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['q']) this.filters.q = params['q'];
      if (params['genero']) this.filters.genero = params['genero'] as GeneroProducto;
      if (params['categoria_id']) this.filters.categoria_id = Number(params['categoria_id']);
      if (params['temporada_id']) this.filters.temporada_id = Number(params['temporada_id']);
      if (params['coleccion_id']) {
        this.filters.coleccion_id = Number(params['coleccion_id']);
        this.resolverNombreColeccion(this.filters.coleccion_id!);
      } else {
        this.nombreColeccion = null;
      }
      if (params['talla_id']) this.filters.talla_id = Number(params['talla_id']);
      if (params['color_id']) this.filters.color_id = Number(params['color_id']);
      this.loadCatalog();
    });
  }

  /** Nombre de la colección activa (para el banner "Viendo colección"). */
  public nombreColeccion: string | null = null;

  private resolverNombreColeccion(id: number): void {
    this.catalogApiService.getCollections().subscribe({
      next: (cols) => {
        this.nombreColeccion = (cols || []).find(c => c.id === id)?.nombre || `Colección #${id}`;
      },
      error: () => { this.nombreColeccion = `Colección #${id}`; }
    });
  }

  limpiarColeccion(): void {
    this.filters.coleccion_id = undefined;
    this.nombreColeccion = null;
    this.currentPage = 1;
    this.loadCatalog();
  }

  loadCatalog(): void {
    this.loading.set(true);
    this.filters.pagina = this.currentPage;

    this.catalogService.getCatalog(this.filters).subscribe({
      next: (res: ProductoBusquedaResponse) => {
        this.products = res.items || [];
        this.totalProducts = res.total || 0;
        this.totalPages = res.total_paginas || 1;
        this.currentPage = res.pagina || 1;
        this.loading.set(false);
      },
      error: () => {
        this.products = [];
        this.loading.set(false);
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadCatalog();
  }

  onGenderTabSelect(genero?: GeneroProducto): void {
    this.filters.genero = genero;
    this.currentPage = 1;
    this.loadCatalog();
  }

  onFiltersChanged(newFilters: ProductoFilterParams): void {
    this.filters = { ...newFilters };
    this.currentPage = 1;
    this.loadCatalog();
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadCatalog();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  resetFilters(): void {
    this.filters = {
      q: '',
      genero: undefined,
      categoria_id: undefined,
      temporada_id: undefined,
      coleccion_id: undefined,
      precio_min: undefined,
      precio_max: undefined,
      talla_id: undefined,
      color_id: undefined,
      orden_por: 'recientes',
      pagina: 1,
      limite: 12
    };
    this.nombreColeccion = null;
    this.currentPage = 1;
    this.loadCatalog();
  }
}
