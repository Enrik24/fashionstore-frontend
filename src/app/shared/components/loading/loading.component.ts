import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loadingService.isLoading()) {
      <div class="loading-overlay animate-fade-in">
        <div class="loading-card glass">
          <div class="fashion-spinner">
            <div class="spinner-ring"></div>
            <div class="spinner-ring-inner"></div>
            <i class="ri-t-shirt-2-line spinner-icon"></i>
          </div>
          <span class="loading-text">Cargando FashionStore...</span>
        </div>
      </div>
    }
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(4px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .loading-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      padding: 2rem 2.5rem;
      border-radius: var(--radius-xl);
      background: rgba(255, 255, 255, 0.95);
      box-shadow: var(--shadow-xl);
    }

    .fashion-spinner {
      position: relative;
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .spinner-ring {
      position: absolute;
      inset: 0;
      border: 3px solid transparent;
      border-top-color: var(--accent);
      border-bottom-color: var(--primary);
      border-radius: 50%;
      animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
    }

    .spinner-ring-inner {
      position: absolute;
      inset: 8px;
      border: 2px solid transparent;
      border-left-color: var(--gold);
      border-right-color: var(--accent-light);
      border-radius: 50%;
      animation: spinReverse 0.9s linear infinite;
    }

    .spinner-icon {
      font-size: 1.5rem;
      color: var(--primary);
      animation: pulse 1.5s ease-in-out infinite;
    }

    .loading-text {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--primary);
      letter-spacing: 0.02em;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes spinReverse {
      0% { transform: rotate(360deg); }
      100% { transform: rotate(0deg); }
    }

    @keyframes pulse {
      0%, 100% { transform: scale(0.9); opacity: 0.7; }
      50% { transform: scale(1.1); opacity: 1; }
    }
  `]
})
export class LoadingComponent {
  public loadingService = inject(LoadingService);
}
