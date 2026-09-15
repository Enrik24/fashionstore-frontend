import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-payment-cancel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="cancel-page">
      <div class="container py-8">
        <div class="cancel-card card animate-fade-in">
          <div class="cancel-icon-box">
            <i class="ri-close-circle-fill cancel-icon"></i>
          </div>

          <h1 class="cancel-title">Pago Cancelado</h1>
          <p class="cancel-subtitle">
            El proceso de pago no se completó. Tus prendas siguen guardadas en tu carrito de compras.
          </p>

          <div class="actions-group">
            <a routerLink="/cart" class="btn btn-accent btn-lg">
              <i class="ri-shopping-cart-2-line"></i> Volver al Carrito
            </a>
            <a routerLink="/catalog" class="btn btn-outline btn-lg">
              <i class="ri-store-2-line"></i> Seguir Explorando
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cancel-page {
      min-height: 100vh;
      background-color: var(--bg-main);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem 0;
    }

    .cancel-card {
      max-width: 540px;
      margin: 0 auto;
      text-align: center;
      padding: 3rem 2rem;
      border-radius: var(--radius-xl);
    }

    .cancel-icon-box {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: var(--error-bg);
      color: var(--error);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }

    .cancel-icon { font-size: 3rem; }

    .cancel-title {
      font-size: 1.85rem;
      font-weight: 800;
      color: var(--primary);
      margin-bottom: 0.5rem;
    }

    .cancel-subtitle {
      color: var(--text-muted);
      font-size: 0.9375rem;
      margin-bottom: 2rem;
      line-height: 1.5;
    }

    .actions-group {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    @media (max-width: 600px) {
      .actions-group { flex-direction: column; }
    }
  `]
})
export class PaymentCancelComponent {}
