import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '../../../../core/services/cart.service';

@Component({
  selector: 'app-cart-icon',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <a routerLink="/cart" class="cart-btn" aria-label="Ver Carrito de Compras">
      <i class="ri-shopping-bag-3-line cart-icon"></i>
      @if (cartService.itemCountSignal() > 0) {
        <span class="cart-badge animate-fade-in">
          {{ cartService.itemCountSignal() }}
        </span>
      }
    </a>
  `,
  styles: [`
    .cart-btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #f1f5f9;
      color: var(--primary);
      transition: all var(--transition-fast);
      border: 1px solid var(--border-color);

      &:hover {
        background: #e2e8f0;
        color: var(--accent);
        transform: translateY(-1px);
      }
    }

    .cart-icon {
      font-size: 1.25rem;
    }

    .cart-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 20px;
      height: 20px;
      padding: 0 4px;
      border-radius: var(--radius-full);
      background: var(--accent);
      color: white;
      font-size: 0.7rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px var(--accent-glow);
    }
  `]
})
export class CartIconComponent {
  public cartService = inject(CartService);
}
