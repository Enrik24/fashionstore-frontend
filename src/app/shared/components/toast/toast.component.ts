import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast-item toast-{{ toast.type }} animate-slide-down">
          <div class="toast-icon">
            @switch (toast.type) {
              @case ('success') { <i class="ri-checkbox-circle-fill"></i> }
              @case ('error') { <i class="ri-error-warning-fill"></i> }
              @case ('warning') { <i class="ri-alert-fill"></i> }
              @default { <i class="ri-information-fill"></i> }
            }
          </div>
          <div class="toast-content">
            @if (toast.title) {
              <div class="toast-title">{{ toast.title }}</div>
            }
            <div class="toast-message">{{ toast.message }}</div>
          </div>
          <button class="toast-close" (click)="toastService.remove(toast.id)" aria-label="Cerrar">
            <i class="ri-close-line"></i>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 420px;
      width: calc(100% - 3rem);
      pointer-events: none;
    }

    .toast-item {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
      padding: 1rem 1.25rem;
      border-radius: var(--radius-md);
      background: white;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      border-left: 5px solid;
    }

    .toast-success {
      border-color: var(--success);
      .toast-icon { color: var(--success); }
    }

    .toast-error {
      border-color: var(--error);
      .toast-icon { color: var(--error); }
    }

    .toast-warning {
      border-color: var(--warning);
      .toast-icon { color: var(--warning); }
    }

    .toast-info {
      border-color: var(--info);
      .toast-icon { color: var(--info); }
    }

    .toast-icon {
      font-size: 1.35rem;
      flex-shrink: 0;
      line-height: 1;
    }

    .toast-content {
      flex: 1;
    }

    .toast-title {
      font-weight: 700;
      font-size: 0.9375rem;
      color: var(--primary);
      margin-bottom: 0.2rem;
    }

    .toast-message {
      font-size: 0.875rem;
      color: var(--secondary);
      line-height: 1.4;
    }

    .toast-close {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0;
      font-size: 1.1rem;
      line-height: 1;
      transition: color var(--transition-fast);

      &:hover {
        color: var(--primary);
      }
    }
  `]
})
export class ToastComponent {
  public toastService = inject(ToastService);
}
