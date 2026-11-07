import { Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TenantContextService } from '../../../core/services/tenant-context.service';
import { AuthService } from '../../../core/services/auth.service';
import { StatusBadgePipe } from '../../pipes/status-badge.pipe';

/**
 * [EXAMEN-2] CU04: nombre, logo y plan del tenant activo para cabeceras.
 * [FIX] Solo Administrador ve el badge como link a /admin/mi-suscripcion.
 * Si otro rol lo reutiliza, se renderiza como informaci\u00f3n sin destino Admin
 * para no exponer una ruta que adminGuard va a denegar.
 */
@Component({
  selector: 'app-tenant-badge',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgePipe],
  template: `
    @if (tenant(); as t) {
      @if (esAdmin()) {
        <a class="tenant-badge" [class.compacto]="compacto" routerLink="/admin/mi-suscripcion" title="Ver mi suscripción">
          @if (t.logo_url) {
            <img class="tenant-logo" [src]="t.logo_url" [alt]="t.razon_social" />
          } @else {
            <span class="tenant-inicial">{{ inicial() }}</span>
          }

          @if (!compacto) {
            <span class="tenant-info">
              <span class="tenant-nombre">{{ t.razon_social }}</span>
              <span class="tenant-plan">
                <i class="ri-vip-crown-2-line"></i>
                {{ nombrePlan() }}
              </span>
            </span>
            <span class="badge" [ngClass]="estadoBadge().class">{{ estadoBadge().label }}</span>
          }
        </a>
      } @else {
        <span class="tenant-badge" [class.compacto]="compacto" [title]="t.razon_social">
          @if (t.logo_url) {
            <img class="tenant-logo" [src]="t.logo_url" [alt]="t.razon_social" />
          } @else {
            <span class="tenant-inicial">{{ inicial() }}</span>
          }

          @if (!compacto) {
            <span class="tenant-info">
              <span class="tenant-nombre">{{ t.razon_social }}</span>
              <span class="tenant-plan">
                <i class="ri-vip-crown-2-line"></i>
                {{ nombrePlan() }}
              </span>
            </span>
            <span class="badge" [ngClass]="estadoBadge().class">{{ estadoBadge().label }}</span>
          }
        </span>
      }
    }
  `,
  styles: [`
    .tenant-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-full);
      padding: 0.3rem 0.7rem 0.3rem 0.35rem;
      max-width: 320px;
      transition: border-color var(--transition-fast);

      &:hover { border-color: var(--accent); }
      &.compacto { padding: 0.15rem; }
    }

    .tenant-logo,
    .tenant-inicial {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }

    .tenant-inicial {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--primary);
      color: var(--accent);
      font-weight: 800;
      font-size: 0.85rem;
    }

    .tenant-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
      line-height: 1.15;
    }

    .tenant-nombre {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 150px;
    }

    .tenant-plan {
      font-size: 0.65rem;
      color: var(--text-muted);
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
    }

    @media (max-width: 768px) {
      .tenant-info { display: none; }
    }
  `]
})
export class TenantBadgeComponent {
  private tenantContext = inject(TenantContextService);
  private auth = inject(AuthService);

  @Input() compacto = false;

  public tenant = computed(() => this.tenantContext.tenant());
  public esAdmin = computed(() => this.auth.isAdmin());
  public nombrePlan = computed(() => this.tenantContext.nombrePlan());
  public inicial = computed(() => (this.tenant()?.razon_social ?? 'F').charAt(0).toUpperCase());
  public estadoBadge = computed(() => new StatusBadgePipe().transform(this.tenantContext.estadoTenant()));
}
