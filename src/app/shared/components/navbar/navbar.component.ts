import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartIconComponent } from '../../../features/cart/components/cart-icon/cart-icon.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, CartIconComponent],
  template: `
    <header class="navbar-wrapper glass">
      <div class="container navbar-container">
        <!-- Brand Logo -->
        <a routerLink="/home" class="brand-logo">
          <div class="brand-icon">
            <i class="ri-t-shirt-2-line"></i>
          </div>
          <div class="brand-text">
            <span class="brand-name">Fashion<span class="brand-highlight">Store</span></span>
            <span class="brand-tagline">SMART FASHION</span>
          </div>
        </a>

        <!-- Desktop Navigation Links -->
        <nav class="nav-links">
          <a routerLink="/home" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-link">
            <i class="ri-home-5-line"></i> Inicio
          </a>
          <a routerLink="/catalog" routerLinkActive="active" class="nav-link">
            <i class="ri-store-2-line"></i> Catálogo
          </a>
          <a routerLink="/home/hombre" routerLinkActive="active" class="nav-link">
            <i class="ri-men-line"></i> Hombre
          </a>
          <a routerLink="/home/mujer" routerLinkActive="active" class="nav-link">
            <i class="ri-women-line"></i> Mujer
          </a>
        </nav>

        <!-- Right Action Items -->
        <div class="nav-actions">
          <!-- Shopping Cart Icon -->
          <app-cart-icon></app-cart-icon>

          @if (!authService.isAuthenticated()) {
            <!-- Guest Links -->
            <div class="auth-buttons">
              <a routerLink="/auth/login" class="btn btn-outline btn-sm">
                <i class="ri-login-box-line"></i> Iniciar Sesión
              </a>
              <a routerLink="/auth/register" class="btn btn-accent btn-sm">
                <i class="ri-user-add-line"></i> Registrarse
              </a>
            </div>
          } @else {
            <!-- Authenticated User Avatar & Dropdown -->
            <div class="user-menu-container" (click)="$event.stopPropagation()">
              <button 
                class="avatar-trigger-btn" 
                (click)="toggleUserMenu()"
                [class.active]="isMenuOpen()"
                aria-label="Menú de usuario"
              >
                <div class="avatar-circle">
                  {{ authService.getUserInitials() }}
                </div>
                <div class="user-meta-desktop">
                  <span class="user-display-name">{{ authService.getUserFullName() }}</span>
                  <i class="ri-arrow-down-s-line menu-chevron" [class.rotated]="isMenuOpen()"></i>
                </div>
              </button>

              <!-- Dropdown Menu -->
              @if (isMenuOpen()) {
                <div class="user-dropdown-menu animate-slide-down">
                  <div class="dropdown-header">
                    <div class="header-avatar">
                      {{ authService.getUserInitials() }}
                    </div>
                    <div class="header-info">
                      <div class="header-name">{{ authService.getUserFullName() }}</div>
                      <div class="header-email">{{ authService.currentUserSignal()?.correo }}</div>
                      <div class="header-roles">
                        @for (role of authService.currentUserSignal()?.roles; track role.id) {
                          <span class="badge badge-primary">{{ role.nombre }}</span>
                        }
                      </div>
                    </div>
                  </div>

                  <div class="dropdown-divider"></div>

                  <div class="dropdown-items">
                    <!-- Admin Panel Link -->
                    @if (authService.isAdmin()) {
                      <a routerLink="/admin/dashboard" class="dropdown-item admin-item" (click)="closeUserMenu()">
                        <div class="item-icon-box admin-icon-box">
                          <i class="ri-dashboard-3-line"></i>
                        </div>
                        <div class="item-text">
                          <span class="item-title">Panel Administrador</span>
                          <span class="item-subtitle">Gestión integral del sistema</span>
                        </div>
                        <i class="ri-arrow-right-s-line item-arrow"></i>
                      </a>
                    }

                    <!-- Branch Manager Link -->
                    @if (authService.isEncargado() || authService.isAdmin()) {
                      <a routerLink="/branch/reservations" class="dropdown-item" (click)="closeUserMenu()">
                        <div class="item-icon-box">
                          <i class="ri-store-3-line"></i>
                        </div>
                        <div class="item-text">
                          <span class="item-title">Panel Sucursal</span>
                          <span class="item-subtitle">Reservas y operaciones en tienda</span>
                        </div>
                        <i class="ri-arrow-right-s-line item-arrow"></i>
                      </a>
                    }

                    <!-- POS Cashier Link -->
                    @if (authService.isCajero() || authService.isAdmin()) {
                      <a routerLink="/pos" class="dropdown-item" (click)="closeUserMenu()">
                        <div class="item-icon-box">
                          <i class="ri-computer-line"></i>
                        </div>
                        <div class="item-text">
                          <span class="item-title">Punto de Venta POS</span>
                          <span class="item-subtitle">Caja y ventas presenciales</span>
                        </div>
                        <i class="ri-arrow-right-s-line item-arrow"></i>
                      </a>
                      <a routerLink="/sales-history" class="dropdown-item" (click)="closeUserMenu()">
                        <div class="item-icon-box">
                          <i class="ri-history-line"></i>
                        </div>
                        <div class="item-text">
                          <span class="item-title">Historial de Ventas</span>
                          <span class="item-subtitle">Consultar y reimprimir comprobantes</span>
                        </div>
                        <i class="ri-arrow-right-s-line item-arrow"></i>
                      </a>
                    }

                    <!-- Client Profile Links -->
                    <a routerLink="/profile" class="dropdown-item" (click)="closeUserMenu()">
                      <div class="item-icon-box">
                        <i class="ri-user-settings-line"></i>
                      </div>
                      <div class="item-text">
                        <span class="item-title">Mi Perfil</span>
                        <span class="item-subtitle">Datos personales y preferencias</span>
                      </div>
                      <i class="ri-arrow-right-s-line item-arrow"></i>
                    </a>

                    <a routerLink="/profile/orders" class="dropdown-item" (click)="closeUserMenu()">
                      <div class="item-icon-box">
                        <i class="ri-file-list-3-line"></i>
                      </div>
                      <div class="item-text">
                        <span class="item-title">Mis Compras</span>
                        <span class="item-subtitle">Historial de pedidos</span>
                      </div>
                      <i class="ri-arrow-right-s-line item-arrow"></i>
                    </a>

                    <a routerLink="/profile/reservations" class="dropdown-item" (click)="closeUserMenu()">
                      <div class="item-icon-box">
                        <i class="ri-calendar-check-line"></i>
                      </div>
                      <div class="item-text">
                        <span class="item-title">Mis Reservas</span>
                        <span class="item-subtitle">Prendas en tienda</span>
                      </div>
                      <i class="ri-arrow-right-s-line item-arrow"></i>
                    </a>

                    <a routerLink="/catalog" class="dropdown-item" (click)="closeUserMenu()">
                      <div class="item-icon-box">
                        <i class="ri-store-2-line"></i>
                      </div>
                      <div class="item-text">
                        <span class="item-title">Explorar Catálogo</span>
                        <span class="item-subtitle">Colecciones y tendencias</span>
                      </div>
                    </a>
                  </div>

                  <div class="dropdown-divider"></div>

                  <button class="dropdown-item logout-item" (click)="onLogout()">
                    <div class="item-icon-box logout-icon-box">
                      <i class="ri-logout-box-r-line"></i>
                    </div>
                    <div class="item-text">
                      <span class="item-title">Cerrar Sesión</span>
                    </div>
                  </button>
                </div>
              }
            </div>
          }

          <!-- Mobile Menu Toggler -->
          <button class="mobile-toggle-btn" (click)="toggleMobileNav()" aria-label="Abrir menú">
            <i [class]="isMobileNavOpen() ? 'ri-close-line' : 'ri-menu-3-line'"></i>
          </button>
        </div>
      </div>

      <!-- Mobile Dropdown Navigation -->
      @if (isMobileNavOpen()) {
        <div class="mobile-nav animate-slide-down">
          <a routerLink="/home" (click)="closeMobileNav()" class="mobile-nav-link">
            <i class="ri-home-5-line"></i> Inicio
          </a>
          <a routerLink="/catalog" (click)="closeMobileNav()" class="mobile-nav-link">
            <i class="ri-store-2-line"></i> Catálogo
          </a>
          <a routerLink="/home/hombre" (click)="closeMobileNav()" class="mobile-nav-link">
            <i class="ri-men-line"></i> Sección Hombre
          </a>
          <a routerLink="/home/mujer" (click)="closeMobileNav()" class="mobile-nav-link">
            <i class="ri-women-line"></i> Sección Mujer
          </a>

          @if (authService.isAuthenticated()) {
            <a routerLink="/profile" (click)="closeMobileNav()" class="mobile-nav-link">
              <i class="ri-user-settings-line"></i> Mi Perfil
            </a>
            <a routerLink="/profile/orders" (click)="closeMobileNav()" class="mobile-nav-link">
              <i class="ri-file-list-3-line"></i> Mis Compras
            </a>
            <a routerLink="/profile/reservations" (click)="closeMobileNav()" class="mobile-nav-link">
              <i class="ri-calendar-check-line"></i> Mis Reservas
            </a>
          }

          @if (authService.isAuthenticated() && authService.isAdmin()) {
            <a routerLink="/admin/dashboard" (click)="closeMobileNav()" class="mobile-nav-link admin-mobile-link">
              <i class="ri-dashboard-3-line"></i> Panel Administrador
            </a>
          }

          @if (authService.isAuthenticated() && (authService.isEncargado() || authService.isAdmin())) {
            <a routerLink="/branch/reservations" (click)="closeMobileNav()" class="mobile-nav-link">
              <i class="ri-store-3-line"></i> Panel Sucursal
            </a>
          }

          @if (authService.isAuthenticated() && (authService.isCajero() || authService.isAdmin())) {
            <a routerLink="/pos" (click)="closeMobileNav()" class="mobile-nav-link">
              <i class="ri-computer-line"></i> Punto de Venta POS
            </a>
            <a routerLink="/sales-history" (click)="closeMobileNav()" class="mobile-nav-link">
              <i class="ri-history-line"></i> Historial de Ventas
            </a>
          }

          @if (!authService.isAuthenticated()) {
            <div class="mobile-auth-actions">
              <a routerLink="/auth/login" (click)="closeMobileNav()" class="btn btn-outline btn-sm">Iniciar Sesión</a>
              <a routerLink="/auth/register" (click)="closeMobileNav()" class="btn btn-accent btn-sm">Registrarse</a>
            </div>
          }
        </div>
      }
    </header>
  `,
  styles: [`
    .navbar-wrapper {
      position: sticky;
      top: 0;
      z-index: 1000;
      width: 100%;
      border-bottom: 1px solid var(--border-color);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
    }

    .navbar-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 72px;
    }

    /* Brand Logo */
    .brand-logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      user-select: none;
    }

    .brand-icon {
      width: 42px;
      height: 42px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, var(--primary) 0%, #1e1b4b 100%);
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      box-shadow: 0 4px 10px rgba(15, 23, 42, 0.2);
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-name {
      font-family: 'Outfit', sans-serif;
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--primary);
    }

    .brand-highlight {
      color: var(--accent);
    }

    .brand-tagline {
      font-size: 0.6rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: var(--text-muted);
      margin-top: -3px;
    }

    /* Navigation Links */
    .nav-links {
      display: flex;
      align-items: center;
      gap: 1.75rem;
    }

    .nav-link {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--secondary);
      padding: 0.5rem 0.25rem;
      position: relative;
      transition: color var(--transition-fast);

      i {
        font-size: 1.1rem;
      }

      &:hover {
        color: var(--accent);
      }

      &.active {
        color: var(--primary);

        &::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          right: 0;
          height: 2.5px;
          background: var(--accent);
          border-radius: 2px;
        }
      }
    }

    /* Actions & Avatar */
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .auth-buttons {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .user-menu-container {
      position: relative;
    }

    .avatar-trigger-btn {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.35rem 0.6rem;
      border-radius: var(--radius-full);
      background: white;
      border: 1.5px solid var(--border-color);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover, &.active {
        border-color: var(--accent);
        box-shadow: 0 4px 12px var(--accent-glow);
      }
    }

    .avatar-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%);
      color: white;
      font-weight: 700;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      justify-content: center;
      letter-spacing: 0.05em;
    }

    .user-meta-desktop {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .user-display-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--primary);
      max-width: 140px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .menu-chevron {
      color: var(--text-muted);
      font-size: 1.1rem;
      transition: transform var(--transition-fast);

      &.rotated {
        transform: rotate(180deg);
      }
    }

    /* User Dropdown */
    .user-dropdown-menu {
      position: absolute;
      top: calc(100% + 12px);
      right: 0;
      width: 290px;
      background: white;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
      box-shadow: 0 15px 35px -5px rgba(15, 23, 42, 0.15), 0 8px 15px -6px rgba(15, 23, 42, 0.1);
      padding: 0.75rem;
      z-index: 1001;
    }

    .dropdown-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 0.5rem;
    }

    .header-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
      color: var(--accent);
      font-weight: 800;
      font-size: 1.05rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .header-info {
      overflow: hidden;
    }

    .header-name {
      font-weight: 700;
      font-size: 0.9375rem;
      color: var(--primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .header-email {
      font-size: 0.75rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 0.35rem;
    }

    .header-roles {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }

    .dropdown-divider {
      height: 1px;
      background: var(--border-light);
      margin: 0.5rem 0;
    }

    .dropdown-items {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.75rem;
      border-radius: var(--radius-md);
      background: transparent;
      border: none;
      width: 100%;
      text-align: left;
      cursor: pointer;
      color: var(--secondary);
      transition: all var(--transition-fast);

      &:hover {
        background: #f8fafc;
        color: var(--primary);

        .item-icon-box {
          background: #e2e8f0;
          color: var(--primary);
        }
      }

      &.admin-item {
        background: rgba(225, 29, 72, 0.04);
        border: 1px dashed rgba(225, 29, 72, 0.3);

        &:hover {
          background: rgba(225, 29, 72, 0.08);
          border-color: var(--accent);
        }
      }

      &.logout-item {
        color: var(--error);

        &:hover {
          background: var(--error-bg);
          color: var(--error);

          .logout-icon-box {
            background: rgba(239, 68, 68, 0.2);
            color: var(--error);
          }
        }
      }
    }

    .item-icon-box {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      color: var(--secondary);
      flex-shrink: 0;
      transition: all var(--transition-fast);

      &.admin-icon-box {
        background: rgba(225, 29, 72, 0.15);
        color: var(--accent);
      }

      &.logout-icon-box {
        background: var(--error-bg);
        color: var(--error);
      }
    }

    .item-text {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .item-title {
      font-size: 0.875rem;
      font-weight: 600;
    }

    .item-subtitle {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    .item-arrow {
      color: var(--text-light);
      font-size: 1rem;
    }

    /* Mobile Navigation */
    .mobile-toggle-btn {
      display: none;
      background: none;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 0.4rem 0.6rem;
      font-size: 1.35rem;
      color: var(--primary);
      cursor: pointer;
    }

    .mobile-nav {
      display: none;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem 1.5rem 1.5rem;
      background: white;
      border-top: 1px solid var(--border-color);
    }

    .mobile-nav-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      font-weight: 600;
      color: var(--secondary);

      &:hover {
        background: #f8fafc;
        color: var(--accent);
      }

      &.admin-mobile-link {
        color: var(--accent);
        background: rgba(225, 29, 72, 0.06);
      }
    }

    .mobile-auth-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.75rem;

      .btn {
        flex: 1;
      }
    }

    @media (max-width: 768px) {
      .nav-links, .auth-buttons, .user-meta-desktop {
        display: none;
      }

      .mobile-toggle-btn {
        display: flex;
      }

      .mobile-nav {
        display: flex;
      }
    }
  `]
})
export class NavbarComponent {
  public authService = inject(AuthService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  public isMenuOpen = signal<boolean>(false);
  public isMobileNavOpen = signal<boolean>(false);

  toggleUserMenu(): void {
    this.isMenuOpen.update(v => !v);
  }

  closeUserMenu(): void {
    this.isMenuOpen.set(false);
  }

  toggleMobileNav(): void {
    this.isMobileNavOpen.update(v => !v);
  }

  closeMobileNav(): void {
    this.isMobileNavOpen.set(false);
  }

  onLogout(): void {
    this.closeUserMenu();
    this.closeMobileNav();
    this.authService.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeUserMenu();
    }
  }
}
