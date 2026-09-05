import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BreadcrumbsComponent } from '../../../shared/components/breadcrumbs/breadcrumbs.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, BreadcrumbsComponent],
  template: `
    <div class="admin-wrapper">
      <!-- Admin Sidebar -->
      <aside class="admin-sidebar" [class.collapsed]="isSidebarCollapsed()">
        <div class="sidebar-header">
          <a routerLink="/admin/dashboard" class="sidebar-brand">
            <div class="sidebar-logo">
              <i class="ri-shield-user-fill"></i>
            </div>
            @if (!isSidebarCollapsed()) {
              <div class="sidebar-title-box">
                <span class="sidebar-title">Admin<span class="text-accent">Panel</span></span>
                <span class="sidebar-tag">FASHIONSTORE ERP</span>
              </div>
            }
          </a>
          <button class="sidebar-toggle-btn" (click)="toggleSidebar()" aria-label="Colapsar menú lateral">
            <i [class]="isSidebarCollapsed() ? 'ri-menu-unfold-line' : 'ri-menu-fold-line'"></i>
          </button>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-section-title" *ngIf="!isSidebarCollapsed()">PRINCIPAL</div>
          
          <a routerLink="/admin/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="sidebar-link" title="Dashboard">
            <i class="ri-dashboard-3-line"></i>
            @if (!isSidebarCollapsed()) {
              <span>Dashboard</span>
            }
          </a>

          <div class="nav-section-title" *ngIf="!isSidebarCollapsed()">SEGURIDAD & USUARIOS</div>

          <a routerLink="/admin/users" routerLinkActive="active" class="sidebar-link" title="Gestión de Usuarios (CU03)">
            <i class="ri-user-settings-line"></i>
            @if (!isSidebarCollapsed()) {
              <span>Usuarios</span>
            }
          </a>

          <a routerLink="/admin/roles" routerLinkActive="active" class="sidebar-link" title="Roles y Permisos (CU04)">
            <i class="ri-key-2-line"></i>
            @if (!isSidebarCollapsed()) {
              <span>Roles y Permisos</span>
            }
          </a>

          <div class="nav-section-title" *ngIf="!isSidebarCollapsed()">CATÁLOGO & OPERACIONES</div>

          <a routerLink="/admin/branches" routerLinkActive="active" class="sidebar-link" title="Sucursales y Ciudades (CU05)">
            <i class="ri-store-3-line"></i>
            @if (!isSidebarCollapsed()) {
              <span>Sucursales & Ciudades</span>
            }
          </a>

          <a routerLink="/admin/products" routerLinkActive="active" class="sidebar-link" title="Gestión de Productos (CU06)">
            <i class="ri-t-shirt-2-line"></i>
            @if (!isSidebarCollapsed()) {
              <span>Productos & Prendas</span>
            }
          </a>

          <a routerLink="/admin/suppliers" routerLinkActive="active" class="sidebar-link" title="Gestión de Proveedores (CU08)">
            <i class="ri-truck-line"></i>
            @if (!isSidebarCollapsed()) {
              <span>Proveedores</span>
            }
          </a>

          <a routerLink="/admin/inventory" routerLinkActive="active" class="sidebar-link" title="Gestión de Inventario (CU19)">
            <i class="ri-archive-stack-line"></i>
            @if (!isSidebarCollapsed()) {
              <span>Inventario & Stock</span>
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

      <!-- Main Admin Content Area -->
      <div class="admin-main">
        <!-- Topbar inside Admin -->
        <header class="admin-topbar glass">
          <div class="topbar-left">
            <h2 class="admin-topbar-title">Administración FashionStore</h2>
          </div>

          <div class="topbar-right">
            <div class="admin-badge">
              <i class="ri-shield-check-line text-success"></i>
              <span>Sesión Administrador</span>
            </div>

            <!-- Profile Dropdown in Admin Topbar -->
            <div class="user-menu-wrapper" (click)="$event.stopPropagation()">
              <button 
                class="admin-profile-pill" 
                (click)="toggleUserMenu()"
                [class.active]="isUserMenuOpen()"
                aria-label="Menú de cuenta de administrador"
              >
                <div class="pill-avatar">{{ authService.getUserInitials() }}</div>
                <div class="pill-info">
                  <span class="pill-name">{{ authService.getUserFullName() }}</span>
                </div>
                <i class="ri-arrow-down-s-line menu-chevron" [class.rotated]="isUserMenuOpen()"></i>
              </button>

              @if (isUserMenuOpen()) {
                <div class="admin-dropdown-menu animate-slide-down">
                  <div class="dropdown-header">
                    <div class="header-avatar">{{ authService.getUserInitials() }}</div>
                    <div class="header-info">
                      <div class="header-name">{{ authService.getUserFullName() }}</div>
                      <div class="header-email">{{ authService.currentUserSignal()?.correo }}</div>
                      <div class="header-role-badge">
                        <i class="ri-shield-user-fill"></i> Administrador
                      </div>
                    </div>
                  </div>

                  <div class="dropdown-divider"></div>

                  <a routerLink="/home" class="dropdown-item" (click)="closeUserMenu()">
                    <i class="ri-store-2-line item-icon"></i>
                    <div class="item-text">
                      <span class="item-title">Ver Tienda Pública</span>
                      <span class="item-subtitle">Ir al catálogo de clientes</span>
                    </div>
                  </a>

                  <div class="dropdown-divider"></div>

                  <button class="dropdown-item logout-item" (click)="onLogout()">
                    <i class="ri-logout-box-r-line item-icon logout-icon"></i>
                    <div class="item-text">
                      <span class="item-title text-danger">Cerrar Sesión</span>
                      <span class="item-subtitle">Finalizar sesión activa</span>
                    </div>
                  </button>
                </div>
              }
            </div>
          </div>
        </header>

        <!-- Breadcrumbs bar -->
        <div class="container-fluid admin-breadcrumbs-wrapper">
          <app-breadcrumbs></app-breadcrumbs>
        </div>

        <!-- Page View Container -->
        <main class="container-fluid admin-content-area">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .admin-wrapper {
      display: flex;
      min-height: 100vh;
      background-color: #f1f5f9;
    }

    /* Sidebar */
    .admin-sidebar {
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

        .sidebar-header {
          justify-content: center;
          padding: 1.25rem 0.5rem;
        }

        .sidebar-brand {
          display: none;
        }

        .sidebar-link {
          justify-content: center;
          padding: 0.875rem;
        }

        .sidebar-toggle-btn {
          margin: 0;
        }
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
      flex-shrink: 0;
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
      font-size: 1rem;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--accent);
        color: white;
      }
    }

    .sidebar-nav {
      padding: 1.25rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      flex: 1;
      overflow-y: auto;
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

      i {
        font-size: 1.25rem;
        flex-shrink: 0;
      }

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

      &:hover {
        background: rgba(56, 189, 248, 0.2);
        color: white;
      }
    }

    /* Main Area */
    .admin-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }

    .admin-topbar {
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

    .admin-topbar-title {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--primary);
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .admin-badge {
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

    /* User Menu Dropdown */
    .user-menu-wrapper {
      position: relative;
    }

    .admin-profile-pill {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.35rem 0.75rem 0.35rem 0.4rem;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-full);
      background: white;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover, &.active {
        border-color: var(--accent);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }
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
      flex-shrink: 0;
    }

    .pill-info {
      display: flex;
      flex-direction: column;
      text-align: left;
    }

    .pill-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--primary);
      line-height: 1.2;
    }

    .menu-chevron {
      font-size: 1.1rem;
      color: var(--text-muted);
      transition: transform var(--transition-fast);

      &.rotated {
        transform: rotate(180deg);
      }
    }

    .admin-dropdown-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 260px;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      padding: 0.75rem 0;
      z-index: 1000;
    }

    .dropdown-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 1rem 0.75rem;
    }

    .header-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--accent);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .header-info {
      overflow: hidden;
    }

    .header-name {
      font-size: 0.875rem;
      font-weight: 700;
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
    }

    .header-role-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      margin-top: 0.25rem;
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--accent);
      background: rgba(225, 29, 72, 0.08);
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-sm);
    }

    .dropdown-divider {
      height: 1px;
      background: var(--border-color);
      margin: 0.35rem 0;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 1rem;
      width: 100%;
      border: none;
      background: transparent;
      text-align: left;
      cursor: pointer;
      transition: background var(--transition-fast);
      text-decoration: none;

      &:hover {
        background: #f8fafc;
      }
    }

    .item-icon {
      font-size: 1.25rem;
      color: var(--secondary);
      flex-shrink: 0;
    }

    .logout-icon {
      color: #ef4444;
    }

    .item-text {
      display: flex;
      flex-direction: column;
    }

    .item-title {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--primary);
    }

    .item-subtitle {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    .admin-breadcrumbs-wrapper {
      padding-top: 0.5rem;
      padding-bottom: 0.5rem;
    }

    .admin-content-area {
      padding-bottom: 3rem;
      flex: 1;
    }

    @media (max-width: 768px) {
      .admin-sidebar {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        z-index: 1000;
        transform: translateX(-100%);
        transition: transform var(--transition-normal);

        &.collapsed {
          transform: translateX(0);
          width: 260px;
        }
      }
    }
  `]
})
export class AdminLayoutComponent {
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
