import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Categoria, Temporada, Talla, Color, GeneroProducto, Coleccion } from '../../../../core/models/catalog.model';
import { CatalogApiService } from '../../../../core/services/catalog-api.service';
import { ProductoFilterParams } from '../../../../core/models/public-catalog.model';

@Component({
  selector: 'app-catalog-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="filters-card card">
      <div class="filters-header">
        <h3 class="filters-title">
          <i class="ri-filter-3-line"></i> Filtros de Búsqueda
        </h3>
        <button class="btn-clear" (click)="resetFilters()" title="Limpiar filtros">
          <i class="ri-refresh-line"></i> Limpiar
        </button>
      </div>

      <!-- Gender Filter -->
      <div class="filter-group">
        <label class="filter-label">Género</label>
        <div class="gender-btn-group">
          <button 
            type="button" 
            class="gender-btn" 
            [class.active]="!filters.genero"
            (click)="selectGender(undefined)"
          >
            <i class="ri-apps-line"></i> Todos
          </button>
          <button 
            type="button" 
            class="gender-btn" 
            [class.active]="filters.genero === 'HOMBRE'"
            (click)="selectGender('HOMBRE')"
          >
            <i class="ri-men-line"></i> Hombre
          </button>
          <button 
            type="button" 
            class="gender-btn" 
            [class.active]="filters.genero === 'MUJER'"
            (click)="selectGender('MUJER')"
          >
            <i class="ri-women-line"></i> Mujer
          </button>
          <button 
            type="button" 
            class="gender-btn" 
            [class.active]="filters.genero === 'UNISEX'"
            (click)="selectGender('UNISEX')"
          >
            <i class="ri-genderless-line"></i> Unisex
          </button>
        </div>
      </div>

      <!-- Categories Filter -->
      <div class="filter-group">
        <label class="filter-label">Categoría</label>
        <div class="filter-options-list">
          <label class="filter-radio-item" [class.selected]="!filters.categoria_id">
            <input 
              type="radio" 
              name="categoria" 
              [value]="undefined" 
              [(ngModel)]="filters.categoria_id" 
              (change)="onFilterChange()"
            />
            <span>Todas</span>
          </label>
          @for (cat of categories; track cat.id) {
            <label class="filter-radio-item" [class.selected]="filters.categoria_id === cat.id">
              <input 
                type="radio" 
                name="categoria" 
                [value]="cat.id" 
                [(ngModel)]="filters.categoria_id" 
                (change)="onFilterChange()"
              />
              <span>{{ cat.nombre }}</span>
            </label>
          }
        </div>
      </div>

      <!-- Price Range -->
      <div class="filter-group">
        <label class="filter-label">Rango de Precio (Bs.)</label>
        <div class="price-inputs">
          <input 
            type="number" 
            class="form-control form-control-sm" 
            placeholder="Mín" 
            [(ngModel)]="filters.precio_min" 
            (change)="onFilterChange()"
            min="0"
          />
          <span class="price-separator">-</span>
          <input 
            type="number" 
            class="form-control form-control-sm" 
            placeholder="Máx" 
            [(ngModel)]="filters.precio_max" 
            (change)="onFilterChange()"
            min="0"
          />
        </div>
      </div>

      <!-- Sizes -->
      @if (sizes.length > 0) {
        <div class="filter-group">
          <label class="filter-label">Talla</label>
          <div class="tags-grid">
            <button 
              type="button"
              class="tag-btn" 
              [class.active]="!filters.talla_id"
              (click)="selectSize(undefined)"
            >
              Todas
            </button>
            @for (size of sizes; track size.id) {
              <button 
                type="button"
                class="tag-btn" 
                [class.active]="filters.talla_id === size.id"
                (click)="selectSize(size.id)"
              >
                {{ size.valor || size.nombre }}
              </button>
            }
          </div>
        </div>
      }

      <!-- Colors -->
      @if (colors.length > 0) {
        <div class="filter-group">
          <label class="filter-label">Color</label>
          <div class="colors-grid">
            @for (color of colors; track color.id) {
              <button 
                type="button"
                class="color-circle" 
                [class.active]="filters.color_id === color.id"
                [style.background-color]="color.codigo_hex || '#cbd5e1'"
                [title]="color.nombre"
                (click)="selectColor(filters.color_id === color.id ? undefined : color.id)"
              >
                @if (filters.color_id === color.id) {
                  <i class="ri-check-line" [style.color]="isColorDark(color.codigo_hex) ? 'white' : 'black'"></i>
                }
              </button>
            }
          </div>
        </div>
      }

      <!-- Collections -->
      @if (collections.length > 0) {
        <div class="filter-group">
          <label class="filter-label">Colección</label>
          <select class="form-control form-control-sm" [(ngModel)]="filters.coleccion_id" (change)="onFilterChange()">
            <option [ngValue]="undefined">Todas las colecciones</option>
            @for (col of collections; track col.id) {
              <option [ngValue]="col.id">{{ col.nombre }}</option>
            }
          </select>
        </div>
      }

      <!-- Seasons -->
      @if (seasons.length > 0) {
        <div class="filter-group">
          <label class="filter-label">Temporada</label>
          <select class="form-control form-control-sm" [(ngModel)]="filters.temporada_id" (change)="onFilterChange()">
            <option [ngValue]="undefined">Todas las temporadas</option>
            @for (season of seasons; track season.id) {
              <option [ngValue]="season.id">{{ season.nombre }}</option>
            }
          </select>
        </div>
      }

      <!-- Sort -->
      <div class="filter-group">
        <label class="filter-label">Ordenar Por</label>
        <select class="form-control form-control-sm" [(ngModel)]="filters.orden_por" (change)="onFilterChange()">
          <option value="recientes">Más recientes</option>
          <option value="precio_asc">Precio: Menor a Mayor</option>
          <option value="precio_desc">Precio: Mayor a Menor</option>
          <option value="nombre">Nombre A-Z</option>
        </select>
      </div>
    </div>
  `,
  styles: [`
    .filters-card {
      padding: 1.25rem;
      border-radius: var(--radius-lg);
      background: white;
      border: 1px solid var(--border-color);
    }

    .filters-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border-light);
      margin-bottom: 1rem;
    }

    .filters-title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--primary);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-clear {
      background: none;
      border: none;
      color: var(--accent);
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.25rem;

      &:hover {
        text-decoration: underline;
      }
    }

    .filter-group {
      margin-bottom: 1.25rem;
    }

    .filter-label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
    }

    .gender-btn-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .gender-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      padding: 0.5rem 0.6rem;
      font-size: 0.8125rem;
      font-weight: 600;
      border-radius: var(--radius-md);
      background: #f8fafc;
      border: 1px solid var(--border-color);
      color: var(--secondary);
      cursor: pointer;
      transition: all var(--transition-fast);

      i {
        font-size: 0.95rem;
      }

      &:hover {
        border-color: var(--accent);
        color: var(--accent);
        background: rgba(225, 29, 72, 0.04);
      }

      &.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15);
      }
    }

    .filter-options-list {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      max-height: 180px;
      overflow-y: auto;
    }

    .filter-radio-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--secondary);
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
      transition: background var(--transition-fast);

      input {
        cursor: pointer;
      }

      &:hover {
        background: #f1f5f9;
      }

      &.selected {
        font-weight: 600;
        color: var(--accent);
        background: rgba(225, 29, 72, 0.05);
      }
    }

    .price-inputs {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .price-separator {
      color: var(--text-muted);
      font-weight: 600;
    }

    .tags-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .tag-btn {
      padding: 0.35rem 0.65rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: var(--radius-sm);
      background: #f8fafc;
      border: 1px solid var(--border-color);
      color: var(--secondary);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--primary);
      }

      &.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
      }
    }

    .colors-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .color-circle {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 0 1px var(--border-color);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform var(--transition-fast);

      &:hover {
        transform: scale(1.15);
      }

      &.active {
        box-shadow: 0 0 0 2px var(--accent);
        transform: scale(1.1);
      }

      i {
        font-size: 0.875rem;
      }
    }
  `]
})
export class CatalogFiltersComponent implements OnInit {
  private catalogApi = inject(CatalogApiService);

  @Input() filters: ProductoFilterParams = {
    orden_por: 'recientes'
  };

  @Output() filtersChange = new EventEmitter<ProductoFilterParams>();

  public categories: Categoria[] = [];
  public seasons: Temporada[] = [];
  public sizes: Talla[] = [];
  public colors: Color[] = [];
  public collections: Coleccion[] = [];

  ngOnInit(): void {
    this.catalogApi.getCategories().subscribe(cats => this.categories = cats);
    this.catalogApi.getSeasons().subscribe(seasons => this.seasons = seasons);
    this.catalogApi.getSizes().subscribe(sizes => this.sizes = sizes);
    this.catalogApi.getColors().subscribe(colors => this.colors = colors);
    this.catalogApi.getCollections().subscribe(cols => this.collections = cols || []);
  }

  onFilterChange(): void {
    this.filtersChange.emit(this.filters);
  }

  selectGender(gender?: GeneroProducto): void {
    this.filters.genero = gender;
    this.onFilterChange();
  }

  selectSize(sizeId?: number): void {
    this.filters.talla_id = sizeId;
    this.onFilterChange();
  }

  selectColor(colorId?: number): void {
    this.filters.color_id = colorId;
    this.onFilterChange();
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
      pagina: 1
    };
    this.onFilterChange();
  }

  isColorDark(hex?: string): boolean {
    if (!hex) return false;
    const c = hex.substring(1);
    const rgb = parseInt(c, 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >>  8) & 0xff;
    const b = (rgb >>  0) & 0xff;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luma < 128;
  }
}
