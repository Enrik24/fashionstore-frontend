import { Component, HostListener, ElementRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BreadcrumbsComponent } from '../../../shared/components/breadcrumbs/breadcrumbs.component';

/**
 * [EXAMEN-2] CU01–CU03: marco del panel del Super Administrador.
 * No usa navbar ni carrito de la tienda; el acceso lo controla `superAdminGuard`.
 */
@Component({
  selector: 'app-plataforma-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, BreadcrumbsComponent],
  template: `
    <div class="plataforma-wrapper">
      <aside class="plataforma-sidebar" [class.collapsed]="colapsado()">
        <div class="sidebar-header">
          <a routerLink="/plataforma/empresas" class="sidebar-brand">
            <div class="sidebar-logo"><i class="ri-building-4-line"></i></div>
            @if (!colapsado()) {
              <div class="sidebar-title-box">
                <span class="sidebar-title">Fashion<span class="text-accent">SaaS</span></span>
                <span class="sidebar-tag">PLATAFORMA</span>
              </div>
            }
          </a>
          <button class="sidebar-toggle-btn" (click)="toggleSidebar()" aria-label="Colapsar menú lateral">
            <i [class]="colapsado() ? 'ri-menu-unfold-line' : 'ri-menu-fold-line'"></i>
          </button>
        </div>

        <nav class="sidebar-nav">
          @if (!colapsado()) {
            <div class="nav-section-title">GESTIÓN</div>
          }

          <a routerLink="/plataforma/empresas" routerLinkActive="active" class="sidebar-link" title="Empresas">
            <i class="ri-community-line"></i>
            @if (!colapsado()) { <span>Empresas</span> }
          </a>

          <a routerLink="/plataforma/planes" routerLinkActive="active" class="sidebar-link" title="Planes">
            <i class="ri-vip-crown-2-line"></i>
            @if (!colapsado()) { <span>Planes</span> }
          </a>

          <a routerLink="/plataforma/suscripciones" routerLinkActive="active" class="sidebar-link" title="Suscripciones">
            <i class="ri-calendar-check-line"></i>
            @if (!colapsado()) { <span>Suscripciones</span> }
          </a>

          @if (!colapsado()) {
            <div class="nav-section-title">CONSULTA</div>
          }

          <a routerLink="/plataforma/empresas" [queryParams]="{ estado: 'CONFIGURACION_INICIAL' }" class="sidebar-link" title="Empresas en configuración">
            <i class="ri-settings-5-line"></i>
            @if (!colapsado()) { <span>En configuración</span> }
          </a>
        </nav>

        <div class="sidebar-footer">
          <a routerLink="/home" class="sidebar-link return-shop-link" title="Volver a la tienda">
            <i class="ri-store-2-line"></i>
            @if (!colapsado()) { <span>Ver tienda pública</span> }
          </a>
        </div>
      </aside>

      <div class="plataforma-main">
        <header class="plataforma-topbar">
          <div class="topbar-left">
            <h2 class="topbar-title">Panel de plataforma</h2>
            <span class="topbar-subtitle">Super Administrador</span>
          </div>

          <div class="topbar-right">
            <span class="role-badge">
              <i class="ri-shield-star-line"></i> Acceso global
            </span>

            <div class="user-menu-wrapper" (click)="$event.stopPropagation()">
              <button class="profile-pill" (click)="toggleUserMenu()" [class.active]="menuAbierto()"
                      aria-label="Menú de cuenta">
                <span class="pill-avatar">{{ authService.getUserInitials() }}</span>
                <span class="pill-name">{{ authService.getUserFullName() }}</span>
                <i class="ri-arrow-down-s-line" [class.rotated]="menuAbierto()"></i>
              </button>

              @if (menuAbierto()) {
                <div class="dropdown-menu animate-slide-down">
                  <div class="dropdown-header">
                    <span class="header-avatar">{{ authService.getUserInitials() }}</span>
                    <div class="header-info">
                      <span class="header-name">{{ authService.getUserFullName() }}</span>
                      <span class="header-email">{{ authService.currentUserSignal()?.correo }}</span>
                      <span class="header-role"><i class="ri-shield-star-line"></i> Super Administrador</span>
                    </div>
                  </div>
                  <div class="dropdown-divider"></div>
                  <a routerLink="/home" class="dropdown-item" (click)="menuAbierto.set(false)">
                    <i class="ri-store-2-line"></i>
                    <span>Ver tienda pública</span>
                  </a>
                  <button type="button" class="dropdown-item logout" (click)="cerrarSesion()">
                    <i class="ri-logout-box-r-line"></i>
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              }
            </div>
          </div>
        </header>

        <div class="container-fluid plataforma-breadcrumbs">
          <app-breadcrumbs></app-breadcrumbs>
        </div>

        <main class="container-fluid plataforma-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .plataforma-wrapper { display: flex; min-height: 100vh; background: #f1f5f9; }

    .plataforma-sidebar {
      width: 260px;
      background: #020617;
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
        .sidebar-toggle-btn { margin: 0; }
      }
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem 1.25rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .sidebar-brand { display: flex; align-items: center; gap: 0.75rem; }

    .sidebar-logo {
      width: 36px; height: 36px;
      border-radius: var(--radius-sm);
      background: var(--accent);
      color: white;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .sidebar-title-box { display: flex; flex-direction: column; }
    .sidebar-title { font-family: 'Outfit', sans-serif; font-size: 1.15rem; font-weight: 800; color: white; }
    .sidebar-tag { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.1em; color: #64748b; }

    .sidebar-toggle-btn {
      background: rgba(255, 255, 255, 0.08);
      border: none; color: #94a3b8;
      border-radius: var(--radius-sm);
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      &:hover { background: var(--accent); color: white; }
    }

    .sidebar-nav { padding: 1.25rem 0.75rem; display: flex; flex-direction: column; gap: 0.35rem; flex: 1; overflow-y: auto; }
    .nav-section-title { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; color: #64748b; margin: 1rem 0.5rem 0.35rem; }

    .sidebar-link {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      color: #94a3b8;
      font-size: 0.875rem; font-weight: 600;
      transition: all var(--transition-fast);
      i { font-size: 1.25rem; flex-shrink: 0; }
      &:hover { background: rgba(255, 255, 255, 0.05); color: white; }
      &.active { background: var(--accent); color: white; box-shadow: 0 4px 12px var(--accent-glow); }
    }

    .sidebar-footer { padding: 1rem 0.75rem; border-top: 1px solid rgba(255, 255, 255, 0.06); }
    .return-shop-link { color: #38bdf8; background: rgba(56, 189, 248, 0.1); &:hover { background: rgba(56, 189, 248, 0.2); color: white; } }

    .plataforma-main { flex: 1; display: flex; flex-direction: column; overflow-x: hidden; }

    .plataforma-topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.875rem 1.75rem;
      background: white;
      border-bottom: 1px solid var(--border-color);
      position: sticky; top: 0; z-index: 100;
    }

    .topbar-title { font-size: 1.2rem; font-weight: 700; color: var(--primary); margin: 0; }
    .topbar-subtitle { font-size: 0.7rem; color: var(--text-muted); }
    .topbar-right { display: flex; align-items: center; gap: 1rem; }

    .role-badge {
      display: inline-flex; align-items: center; gap: 0.4rem;
      background: rgba(225, 29, 72, 0.08);
      color: var(--accent);
      padding: 0.4rem 0.85rem;
      border-radius: var(--radius-full);
      font-size: 0.75rem; font-weight: 700;
    }

    .user-menu-wrapper { position: relative; }

    .profile-pill {
      display: flex; align-items: center; gap: 0.65rem;
      padding: 0.35rem 0.75rem 0.35rem 0.4rem;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-full);
      background: white;
      cursor: pointer;
      &:hover, &.active { border-color: var(--accent); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
    }

    .pill-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: var(--accent); color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 0.8125rem;
    }

    .pill-name { font-size: 0.875rem; font-weight: 600; color: var(--primary); }
    .rotated { transform: rotate(180deg); }

    .dropdown-menu {
      position: absolute; top: calc(100% + 8px); right: 0;
      width: 270px;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
      padding: 0.75rem 0;
      z-index: 1000;
    }

    .dropdown-header { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 1rem 0.75rem; }
    .header-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: var(--accent); color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700;
    }
    .header-info { display: flex; flex-direction: column; overflow: hidden; }
    .header-name { font-size: 0.875rem; font-weight: 700; color: var(--primary); }
    .header-email { font-size: 0.72rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; }
    .header-role {
      display: inline-flex; align-items: center; gap: 0.25rem;
      margin-top: 0.25rem;
      font-size: 0.63rem; font-weight: 700;
      color: var(--accent);
    }

    .dropdown-divider { height: 1px; background: var(--border-color); margin: 0.35rem 0; }

    .dropdown-item {
      display: flex; align-items: center; gap: 0.65rem;
      width: 100%; padding: 0.6rem 1rem;
      border: none; background: transparent;
      text-align: left; cursor: pointer;
      font-size: 0.8125rem; font-weight: 600; color: var(--primary);
      &:hover { background: #f8fafc; }
      i { font-size: 1.1rem; color: var(--text-muted); }
      &.logout, &.logout i { color: var(--error); }
    }

    .plataforma-breadcrumbs { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .plataforma-content { padding-bottom: 3rem; flex: 1; }

    @media (max-width: 768px) {
      .plataforma-sidebar {
        position: fixed; top: 0; bottom: 0; left: 0;
        z-index: 1000;
        transform: translateX(-100%);
        transition: transform var(--transition-normal);
        &.collapsed { transform: translateX(0); width: 260px; }
      }
      .pill-name { display: none; }
    }
  `]
})
export class PlataformaLayoutComponent {
  public authService = inject(AuthService);
  private elementRef = inject(ElementRef);

  public colapsado = signal(false);
  public menuAbierto = signal(false);

  toggleSidebar(): void {
    this.colapsado.update((valor) => !valor);
  }

  toggleUserMenu(): void {
    this.menuAbierto.update((valor) => !valor);
  }

  cerrarSesion(): void {
    this.menuAbierto.set(false);
    this.authService.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.menuAbierto.set(false);
    }
  }
}
