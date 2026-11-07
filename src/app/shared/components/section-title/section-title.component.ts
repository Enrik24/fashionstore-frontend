import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * [EXAMEN-2] Encabezado consistente con acciones a la derecha.
 * Unifica las pantallas nuevas de plataforma, tenant y offline.
 */
@Component({
  selector: 'app-section-title',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="section-title">
      <div class="section-heading">
        @if (icono) {
          <span class="section-icon"><i [class]="icono"></i></span>
        }
        <div class="section-text">
          <div class="section-line">
            <h1>{{ titulo }}</h1>
            @if (badge) {
              <span class="badge badge-primary">{{ badge }}</span>
            }
          </div>
          @if (subtitulo) {
            <p>{{ subtitulo }}</p>
          }
        </div>
      </div>
      <div class="section-actions">
        <ng-content select="[acciones]"></ng-content>
      </div>
    </header>
  `,
  styles: [`
    .section-title {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1.25rem;
    }

    .section-heading {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      min-width: 0;
    }

    .section-icon {
      width: 42px;
      height: 42px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--accent-glow);
      color: var(--accent);
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .section-text { min-width: 0; }

    .section-line {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    h1 {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--primary);
      margin: 0;
      letter-spacing: -0.01em;
    }

    p {
      margin: 0.2rem 0 0;
      font-size: 0.82rem;
      color: var(--text-muted);
    }

    .section-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    @media (max-width: 576px) {
      .section-actions { width: 100%; }
      .section-actions ::ng-deep > * { flex: 1; }
    }
  `]
})
export class SectionTitleComponent {
  @Input({ required: true }) titulo = '';
  @Input() subtitulo?: string;
  @Input() icono?: string;
  @Input() badge?: string;
}
