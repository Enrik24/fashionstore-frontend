import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Componente reutilizable de estrellas (CU26).
 * - `readonly = true`: modo lectura con fracciones (lleno / medio / vacío).
 * - `readonly = false`: modo edición con preview al pasar el mouse y click 1–5.
 */
@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="star-rating" [class.editable]="!readonly" [class.size-sm]="size === 'sm'" [class.size-lg]="size === 'lg'">
      <div class="stars-row" (mouseleave)="onMouseLeave()">
        @for (star of stars; track star) {
          <button
            type="button"
            class="star-btn"
            [class.clickable]="!readonly"
            [disabled]="readonly"
            [attr.aria-label]="'Calificar con ' + star + ' estrellas'"
            (mouseenter)="onMouseEnter(star)"
            (click)="onSelectStar(star)"
          >
            <i [class]="getStarIcon(star)"></i>
          </button>
        }
      </div>

      @if (showValue) {
        <span class="rating-value">{{ value | number:'1.1-1' }}</span>
        @if (total !== null && total !== undefined) {
          <span class="rating-total">({{ total }})</span>
        }
      }
    </div>
  `,
  styles: [`
    .star-rating {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 1rem;
    }

    .stars-row {
      display: inline-flex;
      align-items: center;
      gap: 0.1rem;
    }

    .star-btn {
      border: none;
      background: none;
      padding: 0;
      line-height: 1;
      cursor: default;
      color: #f59e0b;
      font-size: 1em;
      display: inline-flex;
      align-items: center;

      &.clickable {
        cursor: pointer;
        transition: transform 0.12s ease;

        &:hover { transform: scale(1.15); }
      }

      &:disabled { cursor: default; }
    }

    .size-sm { font-size: 0.8rem; }
    .size-lg { font-size: 1.5rem; }

    .rating-value {
      font-weight: 700;
      color: var(--primary, #0f172a);
    }

    .rating-total {
      color: var(--text-muted, #94a3b8);
      font-size: 0.8125rem;
    }
  `]
})
export class StarRatingComponent {
  @Input() value: number = 0;
  @Input() total: number | null = null;
  @Input() readonly: boolean = true;
  @Input() showValue: boolean = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  @Output() valueChange = new EventEmitter<number>();
  @Output() rated = new EventEmitter<number>();

  public stars: number[] = [1, 2, 3, 4, 5];
  public hovered: number = 0;

  onMouseEnter(star: number): void {
    if (this.readonly) return;
    this.hovered = star;
  }

  onMouseLeave(): void {
    this.hovered = 0;
  }

  onSelectStar(star: number): void {
    if (this.readonly) return;
    this.value = star;
    this.valueChange.emit(star);
    this.rated.emit(star);
  }

  getStarIcon(star: number): string {
    const referencia = this.hovered > 0 ? this.hovered : this.value;

    if (referencia >= star) return 'ri-star-fill';
    if (referencia >= star - 0.5) return 'ri-star-half-fill';
    return 'ri-star-line';
  }
}
