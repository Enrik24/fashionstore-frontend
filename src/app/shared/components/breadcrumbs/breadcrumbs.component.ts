import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { filter, Subscription } from 'rxjs';

export interface BreadcrumbItem {
  label: string;
  url: string;
}

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (breadcrumbs().length > 0) {
      <nav class="breadcrumbs-nav" aria-label="Navegación jerárquica">
        <ol class="breadcrumbs-list">
          <li class="breadcrumb-item">
            <a routerLink="/home" class="breadcrumb-link home-link">
              <i class="ri-home-5-line"></i>
              <span>Inicio</span>
            </a>
          </li>
          @for (crumb of breadcrumbs(); track crumb.url; let isLast = $last) {
            <li class="breadcrumb-separator"><i class="ri-arrow-right-s-line"></i></li>
            <li class="breadcrumb-item" [class.active]="isLast">
              @if (!isLast) {
                <a [routerLink]="crumb.url" class="breadcrumb-link">{{ crumb.label }}</a>
              } @else {
                <span class="breadcrumb-current">{{ crumb.label }}</span>
              }
            </li>
          }
        </ol>
      </nav>
    }
  `,
  styles: [`
    .breadcrumbs-nav {
      padding: 0.875rem 0;
      margin-bottom: 1.25rem;
      border-bottom: 1px solid var(--border-light);
    }

    .breadcrumbs-list {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      list-style: none;
      gap: 0.5rem;
      font-size: 0.875rem;
      margin: 0;
      padding: 0;
    }

    .breadcrumb-item {
      display: flex;
      align-items: center;

      &.active {
        font-weight: 600;
        color: var(--primary);
      }
    }

    .breadcrumb-link {
      color: var(--text-muted);
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      transition: color var(--transition-fast);

      &:hover {
        color: var(--accent);
      }
    }

    .breadcrumb-current {
      color: var(--primary);
      font-weight: 600;
    }

    .breadcrumb-separator {
      color: var(--text-light);
      display: flex;
      align-items: center;
      font-size: 1rem;
    }
  `]
})
export class BreadcrumbsComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private sub?: Subscription;

  public breadcrumbs = signal<BreadcrumbItem[]>([]);

  private routeLabels: Record<string, string> = {
    'admin': 'Administración',
    'dashboard': 'Dashboard',
    'users': 'Gestión de Usuarios',
    'roles': 'Roles y Permisos',
    'branches': 'Sucursales y Ciudades',
    'products': 'Gestión de Productos',
    'suppliers': 'Gestión de Proveedores',
    'inventory': 'Gestión de Inventario',
    'hombre': 'Colección Hombre',
    'mujer': 'Colección Mujer',
    'login': 'Iniciar Sesión',
    'register': 'Registro de Cliente',
    'catalog': 'Catálogo de Prendas'
  };

  ngOnInit(): void {
    this.buildBreadcrumbs(this.router.url);
    this.sub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.buildBreadcrumbs(event.urlAfterRedirects || event.url);
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private buildBreadcrumbs(url: string): void {
    const urlWithoutParams = url.split('?')[0];
    const segments = urlWithoutParams.split('/').filter(s => s && s !== 'home');

    if (segments.length === 0) {
      this.breadcrumbs.set([]);
      return;
    }

    const items: BreadcrumbItem[] = [];
    let currentPath = '';

    for (const segment of segments) {
      currentPath += `/${segment}`;
      const label = this.routeLabels[segment] || this.formatSegmentName(segment);
      items.push({ label, url: currentPath });
    }

    this.breadcrumbs.set(items);
  }

  private formatSegmentName(segment: string): string {
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
  }
}
