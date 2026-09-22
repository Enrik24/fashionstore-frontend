import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BreadcrumbsComponent } from '../../../shared/components/breadcrumbs/breadcrumbs.component';

@Component({
  selector: 'app-branch-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, BreadcrumbsComponent],
  template: `
    <div class="branch-wrapper">
      <!-- Sidebar -->
      <aside class="branch-sidebar" [class.collapsed]="isSidebarCollapsed()">
        <div class="sidebar-header">
          <a routerLink="/branch/reservations" class="sidebar-brand">
            <div class="sidebar-logo">
              <i class="ri-store-3-fill"></i>
            </div>
            @if (!isSidebarCollapsed()) {
              <div class="sidebar-title-box">
                <span class="sidebar-title">Sucursal<span class="text-accent">Manager</span></span>
                <span class="sidebar-tag">OPERACIONES EN TIENDA</span>
              </div>
            }
          </a>
          <button class="sidebar-toggle-btn" (click)="toggleSidebar()" aria-label="Colapsar menú lateral">
            <i [class]="isSidebarCollapsed() ? 'ri-menu-unfold-line' : 'ri-menu-fold-line'"></i>
          </button>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-section-title" *ngIf="!isSidebarCollapsed()">GESTIÓN DE SUCURSAL</div>

          <a routerLink="/branch/reservations" routerLinkActive="active" class="sidebar-link" title="Reservas de Clientes (CU14)">
            <i class="ri-calendar-check-line"></i>
            @if (!isSidebarCollapsed()) {
              <span>Reservas en Tienda</span>
            }
          </a>

          <a routerLink="/branch/inventory" routerLinkActive="active" class="sidebar-link" title="Inventario de la Sucursal">
            <i class="ri-archive-line"></i>
            @if (!isSidebarCollapsed()) {
              <span>Inventario</span>
            }
          </a>

          <a routerLink="/branch/sales" routerLinkActive="active" class="sidebar-link" title="Ventas de la Sucursal (online y presenciales)">
            <i class="ri-shopping-bag-3-line"></i>
            @if (!isSidebarCollapsed()) {
              <span>Ventas</span>
            }
          </a>

          <a routerLink="/branch/returns" routerLinkActive="active" class="sidebar-link" title="Devoluciones y Cambios (CU28)">
            <i class="ri-arrow-go-back-line"></i>
            @if (!isSidebarCollapsed()) {
              <span>Devoluciones</span>
            }
          </a>
        </nav>

        <div class="sidebar-footer">
          <a routerLink="/home" class="sidebar-link return-shop-link" title="Volver a la Tienda">
            <i class="ri-store-2-line"></i>
            @if (!isSidebarCollapsed()) {
              <span>Ver Tienda Pública</span>
            }
          </a>
        </div>
      </aside>

      <!-- Main Content Area -->
      <div class="branch-main">
        <header class="branch-topbar glass">
          <div class="topbar-left">
            <h2 class="branch-topbar-title">Gestión de Sucursal & Reservas</h2>
          </div>

          <div class="topbar-right">
            <div class="branch-badge">
              <i class="ri-map-pin-2-fill text-accent"></i>
              <span>Encargado de Sucursal</span>
            </div>

            <div class="user-menu-wrapper" (click)="$event.stopPropagation()">
              <button 
                class="profile-pill" 
                (click)="toggleUserMenu()"
                [class.active]="isUserMenuOpen()"
              >
                <div class="pill-avatar">{{ authService.getUserInitials() }}</div>
                <div class="pill-info">
                  <span class="pill-name">{{ authService.getUserFullName() }}</span>
                </div>
                <i class="ri-arrow-down-s-line menu-chevron" [class.rotated]="isUserMenuOpen()"></i>
              </button>

              @if (isUserMenuOpen()) {
                <div class="dropdown-menu-box animate-slide-down">
                  <div class="dropdown-header">
                    <div class="header-avatar">{{ authService.getUserInitials() }}</div>
                    <div class="header-info">
                      <div class="header-name">{{ authService.getUserFullName() }}</div>
                      <div class="header-email">{{ authService.currentUserSignal()?.correo }}</div>
                    </div>
                  </div>
                  <div class="dropdown-divider"></div>
                  <a routerLink="/home" class="dropdown-item" (click)="closeUserMenu()">
                    <i class="ri-store-2-line"></i> Ver Tienda
                  </a>
                  <button class="dropdown-item text-danger" (click)="onLogout()">
                    <i class="ri-logout-box-r-line"></i> Cerrar Sesión
                  </button>
                </div>
              }
            </div>
          </div>
        </header>

        <div class="container-fluid branch-breadcrumbs-wrapper">
          <app-breadcrumbs></app-breadcrumbs>
        </div>

        <main class="container-fluid branch-content-area">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .branch-wrapper {
      display: flex;
      min-height: 100vh;
      background-color: #f1f5f9;
    }

    .branch-sidebar {
      width: 260px;
      background: var(--primary-dark);
      color: #cbd5e1;
      display: flex;
      flex-direction: column;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      transition: width var(--transition-normal);
      flex-shrink: 0;

      &.collapsed {
        width: 80px;
        .sidebar-header { justify-content: center; padding: 1.25rem 0.5rem; }
        .sidebar-brand { display: none; }
        .sidebar-link { justify-content: center; padding: 0.875rem; }
      }
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem 1.25rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .sidebar-logo {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-sm);
      background: var(--accent);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }

    .sidebar-title-box {
      display: flex;
      flex-direction: column;
    }

    .sidebar-title {
      font-family: 'Outfit', sans-serif;
      font-size: 1.15rem;
      font-weight: 800;
      color: white;
    }

    .sidebar-tag {
      font-size: 0.6rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: var(--text-muted);
    }

    .sidebar-toggle-btn {
      background: rgba(255, 255, 255, 0.08);
      border: none;
      color: #94a3b8;
      border-radius: var(--radius-sm);
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      &:hover { background: var(--accent); color: white; }
    }

    .sidebar-nav {
      padding: 1.25rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      flex: 1;
    }

    .nav-section-title {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #64748b;
      margin: 1rem 0.5rem 0.35rem;
    }

    .sidebar-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      color: #94a3b8;
      font-size: 0.875rem;
      font-weight: 600;
      transition: all var(--transition-fast);

      i { font-size: 1.25rem; }

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        color: white;
      }

      &.active {
        background: var(--accent);
        color: white;
        box-shadow: 0 4px 12px var(--accent-glow);
      }
    }

    .sidebar-footer {
      padding: 1rem 0.75rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .return-shop-link {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      &:hover { background: rgba(56, 189, 248, 0.2); color: white; }
    }

    .branch-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }

    .branch-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem 1.75rem;
      background: white;
      border-bottom: 1px solid var(--border-color);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .branch-topbar-title {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--primary);
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .branch-badge {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 0.4rem 0.85rem;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--primary);
    }

    .user-menu-wrapper { position: relative; }

    .profile-pill {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.35rem 0.75rem 0.35rem 0.4rem;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-full);
      background: white;
      cursor: pointer;
    }

    .pill-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--accent);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.8125rem;
    }

    .pill-info { display: flex; flex-direction: column; text-align: left; }
    .pill-name { font-size: 0.875rem; font-weight: 600; color: var(--primary); }

    .dropdown-menu-box {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 240px;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      padding: 0.75rem 0;
      z-index: 1000;
    }

    .dropdown-header { padding: 0.5rem 1rem 0.75rem; display: flex; gap: 0.75rem; }
    .header-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--accent);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
    }
    .header-name { font-size: 0.875rem; font-weight: 700; }
    .header-email { font-size: 0.75rem; color: var(--text-muted); }
    .dropdown-divider { height: 1px; background: var(--border-color); margin: 0.35rem 0; }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      width: 100%;
      border: none;
      background: transparent;
      text-align: left;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--secondary);
      &:hover { background: #f8fafc; }
    }

    .branch-breadcrumbs-wrapper { padding: 0.5rem 1.5rem; }
    .branch-content-area { padding: 0 1.5rem 3rem; flex: 1; }
  `]
})
export class BranchLayoutComponent {
  public authService = inject(AuthService);
  private elementRef = inject(ElementRef);

  public isSidebarCollapsed = signal<boolean>(false);
  public isUserMenuOpen = signal<boolean>(false);

  toggleSidebar(): void {
    this.isSidebarCollapsed.update(v => !v);
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update(v => !v);
  }

  closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }

  onLogout(): void {
    this.closeUserMenu();
    this.authService.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeUserMenu();
    }
  }
}
