import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PendingPaymentService } from '../../../core/offline/pending-payment.service'; // [EXAMEN-2]

@Component({
  selector: 'app-profile-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="profile-layout-wrapper animate-fade-in">
      <!-- Profile Header Hero -->
      <div class="profile-hero">
        <div class="container hero-container">
          <div class="user-hero-info">
            <div class="user-hero-avatar">
              {{ authService.getUserInitials() }}
            </div>
            <div>
              <h1 class="user-hero-name">{{ authService.getUserFullName() }}</h1>
              <p class="user-hero-email"><i class="ri-mail-line"></i> {{ authService.currentUserSignal()?.correo }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Bar -->
      <div class="profile-subnav">
        <div class="container nav-container">
          <a routerLink="/profile" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="profile-nav-link">
            <i class="ri-user-settings-line"></i> Mi Perfil & Datos
          </a>
          <a routerLink="/profile/orders" routerLinkActive="active" class="profile-nav-link">
            <i class="ri-shopping-bag-3-line"></i> Mis Compras
          </a>
          <a routerLink="/profile/reservations" routerLinkActive="active" class="profile-nav-link">
            <i class="ri-calendar-check-line"></i> Mis Reservas
          </a>
          <a routerLink="/profile/favorites" routerLinkActive="active" class="profile-nav-link">
            <i class="ri-heart-3-line"></i> Mis Favoritos
          </a>
          <a routerLink="/profile/returns" routerLinkActive="active" class="profile-nav-link">
            <i class="ri-arrow-go-back-line"></i> Mis Devoluciones
          </a>
          <!-- [EXAMEN-2] CU16: pagos diferidos con badge de pendientes (RF-030) -->
          <a routerLink="/profile/pagos-pendientes" routerLinkActive="active" class="profile-nav-link">
            <i class="ri-bank-card-line"></i> Pagos Pendientes
            @if (pendingPayments.pagosPendientes() > 0) {
              <span class="nav-badge">{{ pendingPayments.pagosPendientes() }}</span>
            }
          </a>
          <!-- [EXAMEN-2] CU17: PIN y dispositivos autorizados -->
          <a routerLink="/profile/offline" routerLinkActive="active" class="profile-nav-link">
            <i class="ri-shield-keyhole-line"></i> Seguridad Offline
          </a>
          <!-- [EXAMEN-2 FIX] CU05: el Cliente es actor de la descarga offline, pero
               la ruta /offline/descarga solo estaba en el sidebar Admin. -->
          <a routerLink="/offline/descarga" routerLinkActive="active" class="profile-nav-link">
            <i class="ri-download-cloud-2-line"></i> Datos Offline
          </a>
          <a routerLink="/profile/notificaciones" routerLinkActive="active" class="profile-nav-link"><i class="ri-notification-3-line"></i> Notificaciones</a>
          <a routerLink="/profile/mis-reposiciones" routerLinkActive="active" class="profile-nav-link"><i class="ri-exchange-line"></i> Mis reposiciones</a>
        </div>
      </div>

      <!-- Main Content Outlet -->
      <main class="container profile-main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .profile-layout-wrapper {
      min-height: calc(100vh - 200px);
      display: flex;
      flex-direction: column;
      background: var(--bg-light, #f8fafc);
    }
    .profile-hero {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      color: #ffffff;
      padding: 2.5rem 0;
    }
    .hero-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1.5rem;
    }
    .user-hero-info {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    .user-hero-avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent, #ec4899) 0%, #db2777 100%);
      color: #ffffff;
      font-size: 1.75rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 16px rgba(0,0,0,0.2);
    }
    .user-hero-name {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .user-hero-email {
      margin: 0.35rem 0 0 0;
      font-size: 0.875rem;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .profile-subnav {
      background: #ffffff;
      border-bottom: 1px solid var(--border-color, #e2e8f0);
      position: sticky;
      top: 72px;
      z-index: 99;
    }
    .nav-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1.5rem;
      display: flex;
      gap: 1.5rem;
      overflow-x: auto;
    }
    .profile-nav-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 0.25rem;
      font-size: 0.9375rem;
      font-weight: 600;
      color: #64748b;
      text-decoration: none;
      border-bottom: 2.5px solid transparent;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .profile-nav-link:hover {
      color: #0f172a;
    }
    .profile-nav-link.active {
      color: var(--accent, #ec4899);
      border-bottom-color: var(--accent, #ec4899);
    }
    /* [EXAMEN-2] RF-030: badge de pagos pendientes */
    .nav-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 0.35rem;
      border-radius: 9999px;
      background: #dc2626;
      color: #ffffff;
      font-size: 0.68rem;
      font-weight: 800;
    }
    .profile-main-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1.5rem 4rem;
      flex: 1;
      width: 100%;
    }
  `]
})
export class ProfileLayoutComponent {
  public authService = inject(AuthService);
  public pendingPayments = inject(PendingPaymentService); // [EXAMEN-2]
}
