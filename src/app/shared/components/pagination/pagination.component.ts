import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (totalItems > 0) {
      <div class="pagination-wrapper">
        <!-- Resumen de items -->
        @if (showSummary) {
          <div class="pagination-summary">
            Mostrando <strong>{{ startItem }}</strong> - <strong>{{ endItem }}</strong> de <strong>{{ totalItems }}</strong> registros
          </div>
        }

        <div class="pagination-controls-group">
          <!-- Selector de tamaño de página -->
          @if (showPageSize && pageSizeOptions.length > 0) {
            <div class="page-size-selector">
              <label for="pageSizeSelect" class="page-size-label">Mostrar:</label>
              <select 
                id="pageSizeSelect" 
                class="page-size-select"
                [value]="pageSize" 
                (change)="onPageSizeChange($event)"
              >
                @for (option of pageSizeOptions; track option) {
                  <option [value]="option">{{ option }} / pág.</option>
                }
              </select>
            </div>
          }

          <!-- Botones de Paginación -->
          @if (totalPages > 1 || forceShowControls) {
            <nav class="pagination-nav" aria-label="Navegación de páginas">
              <!-- Botón Primera Página -->
              <button
                type="button"
                class="pag-btn pag-btn-nav"
                [disabled]="currentPage <= 1"
                (click)="goToPage(1)"
                title="Primera página"
              >
                <i class="ri-skip-left-line"></i>
              </button>

              <!-- Botón Anterior -->
              <button
                type="button"
                class="pag-btn pag-btn-nav"
                [disabled]="currentPage <= 1"
                (click)="goToPage(currentPage - 1)"
                title="Página anterior"
              >
                <i class="ri-arrow-left-s-line"></i>
              </button>

              <!-- Números de Página -->
              <div class="page-numbers">
                @for (page of visiblePages; track $index) {
                  @if (page === -1) {
                    <span class="pag-ellipsis">&hellip;</span>
                  } @else {
                    <button
                      type="button"
                      class="pag-btn pag-btn-number"
                      [class.active]="page === currentPage"
                      (click)="goToPage(page)"
                    >
                      {{ page }}
                    </button>
                  }
                }
              </div>

              <!-- Botón Siguiente -->
              <button
                type="button"
                class="pag-btn pag-btn-nav"
                [disabled]="currentPage >= totalPages"
                (click)="goToPage(currentPage + 1)"
                title="Página siguiente"
              >
                <i class="ri-arrow-right-s-line"></i>
              </button>

              <!-- Botón Última Página -->
              <button
                type="button"
                class="pag-btn pag-btn-nav"
                [disabled]="currentPage >= totalPages"
                (click)="goToPage(totalPages)"
                title="Última página"
              >
                <i class="ri-skip-right-line"></i>
              </button>
            </nav>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .pagination-wrapper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 0.875rem 1.25rem;
      background: var(--bg-card, #ffffff);
      border-top: 1px solid var(--border-color, #e2e8f0);
      border-bottom-left-radius: inherit;
      border-bottom-right-radius: inherit;
      font-size: 0.875rem;
    }

    .pagination-summary {
      color: var(--text-muted, #64748b);
      font-size: 0.8125rem;

      strong {
        color: var(--text-main, #1e293b);
        font-weight: 600;
      }
    }

    .pagination-controls-group {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      flex-wrap: wrap;
    }

    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .page-size-label {
      font-size: 0.8125rem;
      color: var(--text-muted, #64748b);
      font-weight: 500;
    }

    .page-size-select {
      appearance: none;
      -webkit-appearance: none;
      background: var(--bg-card, #ffffff) url("data:image/svg+xml;utf8,<svg fill='%2364748b' height='20' viewBox='0 0 24 24' width='20' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>") no-repeat right 0.4rem center;
      padding: 0.25rem 1.6rem 0.25rem 0.6rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-main, #1e293b);
      border: 1px solid var(--border-color, #cbd5e1);
      border-radius: 6px;
      cursor: pointer;
      outline: none;
      transition: all 0.2s ease;

      &:hover {
        border-color: var(--accent, #c5a059);
      }

      &:focus {
        border-color: var(--accent, #c5a059);
        box-shadow: 0 0 0 2px rgba(197, 160, 89, 0.2);
      }
    }

    .pagination-nav {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .page-numbers {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .pag-btn {
      min-width: 32px;
      height: 32px;
      padding: 0 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      border: 1px solid var(--border-color, #e2e8f0);
      background: var(--bg-card, #ffffff);
      color: var(--text-main, #334155);
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        background: #f8fafc;
        border-color: var(--accent, #c5a059);
        color: var(--accent, #c5a059);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        background: #f1f5f9;
        border-color: #e2e8f0;
        color: #94a3b8;
      }

      &.active {
        background: var(--accent, #c5a059);
        border-color: var(--accent, #c5a059);
        color: #ffffff;
        box-shadow: 0 2px 4px rgba(197, 160, 89, 0.3);
      }
    }

    .pag-btn-nav {
      font-size: 1rem;
    }

    .pag-ellipsis {
      padding: 0 0.3rem;
      color: var(--text-muted, #94a3b8);
      font-weight: 700;
      user-select: none;
    }

    @media (max-width: 640px) {
      .pagination-wrapper {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
      }

      .pagination-controls-group {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class PaginationComponent implements OnChanges {
  @Input() currentPage: number = 1;
  @Input() totalItems: number = 0;
  @Input() pageSize: number = 10;
  @Input() pageSizeOptions: number[] = [5, 10, 25, 50, 100];
  @Input() showPageSize: boolean = true;
  @Input() showSummary: boolean = true;
  @Input() forceShowControls: boolean = false;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  totalPages: number = 1;
  startItem: number = 0;
  endItem: number = 0;
  visiblePages: number[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    this.calculatePagination();
  }

  private calculatePagination(): void {
    const size = Math.max(1, this.pageSize || 10);
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / size));

    // Validar rango de página
    if (this.currentPage > this.totalPages && this.totalItems > 0) {
      this.currentPage = this.totalPages;
      this.pageChange.emit(this.currentPage);
    } else if (this.currentPage < 1) {
      this.currentPage = 1;
      this.pageChange.emit(this.currentPage);
    }

    if (this.totalItems === 0) {
      this.startItem = 0;
      this.endItem = 0;
    } else {
      this.startItem = (this.currentPage - 1) * size + 1;
      this.endItem = Math.min(this.currentPage * size, this.totalItems);
    }

    this.buildVisiblePages();
  }

  private buildVisiblePages(): void {
    const total = this.totalPages;
    const current = this.currentPage;

    if (total <= 7) {
      this.visiblePages = Array.from({ length: total }, (_, i) => i + 1);
      return;
    }

    // Estrategia con elipsis (-1 representa ...)
    const pages: number[] = [];
    pages.push(1);

    if (current > 3) {
      pages.push(-1);
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current < total - 2) {
      pages.push(-1);
    }

    pages.push(total);
    this.visiblePages = pages;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
    this.calculatePagination();
    this.pageChange.emit(this.currentPage);
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newSize = Number(select.value);
    this.pageSize = newSize;
    this.currentPage = 1;
    this.calculatePagination();
    this.pageSizeChange.emit(newSize);
    this.pageChange.emit(this.currentPage);
  }
}
