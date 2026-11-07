import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { SaasApiService } from '../../../../core/services/saas-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EstadoTenant, Suscripcion, Tenant, UsoTenant } from '../../../../core/models/saas.model';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';
import { SectionTitleComponent } from '../../../../shared/components/section-title/section-title.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

interface FilaTenant extends Tenant {
  plan_nombre: string;
  fecha_vencimiento: string | null;
  estado_suscripcion: string;
  uso: UsoTenant | null;
}

/**
 * [EXAMEN-2] CU01 / CU03: listado de empresas del panel de plataforma.
 * El listado base no incluye plan ni uso; se completa con el detalle por fila.
 */
@Component({
  selector: 'app-tenant-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    StatusBadgePipe,
    SectionTitleComponent,
    PaginationComponent
  ],
  template: `
    <div class="page">
      <app-section-title
        titulo="Empresas"
        subtitulo="Registra, suspende y supervisa el uso de cada tenant de la plataforma."
        icono="ri-community-line">
        <a acciones routerLink="/plataforma/empresas/nueva" class="btn btn-accent">
          <i class="ri-add-line"></i> Nueva empresa
        </a>
      </app-section-title>

      <div class="filtros card">
        <div class="filtro">
          <label for="q">Buscar</label>
          <div class="input-icon">
            <i class="ri-search-line"></i>
            <input id="q" type="search" [(ngModel)]="busqueda" (keyup.enter)="cargar(1)"
                   placeholder="Razón social, NIT o correo" />
          </div>
        </div>

        <div class="filtro">
          <label for="estado">Estado</label>
          <select id="estado" [(ngModel)]="estado" (change)="cargar(1)">
            <option value="">Todos los estados</option>
            <option value="CONFIGURACION_INICIAL">Configuración inicial</option>
            <option value="OPERATIVO">Operativo</option>
            <option value="SUSPENDIDO">Suspendido</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>

        <div class="filtro-acciones">
          <button type="button" class="btn btn-outline" (click)="limpiar()">
            <i class="ri-refresh-line"></i> Limpiar
          </button>
          <button type="button" class="btn btn-primary" (click)="cargar(1)" [disabled]="cargando()">
            <i class="ri-filter-3-line"></i> Filtrar
          </button>
        </div>
      </div>

      @if (cargando()) {
        <div class="loading-box"><i class="ri-loader-4-line spin"></i> Cargando empresas…</div>
      } @else if (filas().length === 0) {
        <div class="empty-box card">
          <i class="ri-building-line"></i>
          <h3>No hay empresas con esos filtros</h3>
          <p>Registra la primera empresa o ajusta la búsqueda.</p>
          <a routerLink="/plataforma/empresas/nueva" class="btn btn-accent">Registrar empresa</a>
        </div>
      } @else {
        <div class="tabla-wrapper card">
          <table>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Estado</th>
                <th>Plan</th>
                <th>Vencimiento</th>
                <th>Sucursales</th>
                <th>Usuarios</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (fila of filas(); track fila.id) {
                <tr>
                  <td>
                    <div class="empresa-celda">
                      <span class="empresa-avatar">{{ fila.razon_social.charAt(0) }}</span>
                      <div>
                        <a class="empresa-nombre" [routerLink]="['/plataforma/empresas', fila.id]">{{ fila.razon_social }}</a>
                        <span class="empresa-meta">NIT {{ fila.nit }} · {{ fila.correo_contacto }}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="badge" [ngClass]="(fila.estado | statusBadge).class">{{ (fila.estado | statusBadge).label }}</span>
                  </td>
                  <td>
                    @if (fila.plan_nombre !== '—') {
                      <span class="plan-chip"><i class="ri-vip-crown-2-line"></i> {{ fila.plan_nombre }}</span>
                    } @else {
                      <span class="texto-muted">Sin plan</span>
                    }
                  </td>
                  <td>
                    @if (fila.fecha_vencimiento) {
                      <span class="fecha" [class.vencida]="vencida(fila.fecha_vencimiento)">
                        {{ fila.fecha_vencimiento | date: 'dd/MM/yyyy' }}
                      </span>
                      <span class="badge badge-sm" [ngClass]="(fila.estado_suscripcion | statusBadge).class">
                        {{ (fila.estado_suscripcion | statusBadge).label }}
                      </span>
                    } @else {
                      <span class="texto-muted">—</span>
                    }
                  </td>
                  <td>
                    <span class="uso-celda" [class.limite]="enLimite(fila.uso?.sucursales_actuales, fila.uso?.max_sucursales)">
                      {{ fila.uso?.sucursales_actuales ?? '—' }} / {{ fila.uso?.max_sucursales ?? '∞' }}
                    </span>
                  </td>
                  <td>
                    <span class="uso-celda" [class.limite]="enLimite(fila.uso?.usuarios_actuales, fila.uso?.max_usuarios)">
                      {{ fila.uso?.usuarios_actuales ?? '—' }} / {{ fila.uso?.max_usuarios ?? '∞' }}
                    </span>
                  </td>
                  <td class="text-right">
                    <a class="btn btn-sm btn-outline" [routerLink]="['/plataforma/empresas', fila.id]">
                      <i class="ri-eye-line"></i> Ver
                    </a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <app-pagination
          [currentPage]="pagina()"
          [totalItems]="total()"
          [pageSize]="limite"
          [pageSizeOptions]="[]"
          (pageChange)="cargar($event)">
        </app-pagination>
      }
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1rem; }

    .filtros {
      display: flex;
      align-items: flex-end;
      gap: 1rem;
      padding: 1rem 1.15rem;
      flex-wrap: wrap;
    }

    .filtro { display: flex; flex-direction: column; gap: 0.3rem; min-width: 190px; flex: 1; }
    .filtro label { font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }

    .filtro input, .filtro select {
      height: 40px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 0 0.75rem;
      font-size: 0.85rem;
      color: var(--primary);
      background: white;
      &:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    }

    .input-icon { position: relative; }
    .input-icon i { position: absolute; left: 0.7rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
    .input-icon input { width: 100%; padding-left: 2rem; }

    .filtro-acciones { display: flex; gap: 0.5rem; }

    .tabla-wrapper { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 900px; }

    th {
      text-align: left;
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      padding: 0.75rem 1rem;
      background: var(--bg-main);
      border-bottom: 1px solid var(--border-color);
      white-space: nowrap;
    }

    td { padding: 0.8rem 1rem; border-bottom: 1px solid var(--border-light); font-size: 0.82rem; vertical-align: middle; }
    tbody tr:hover { background: var(--bg-main); }
    .text-right { text-align: right; }

    .empresa-celda { display: flex; align-items: center; gap: 0.65rem; }
    .empresa-avatar {
      width: 36px; height: 36px; border-radius: var(--radius-md);
      background: var(--primary); color: var(--accent);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; flex-shrink: 0;
    }
    .empresa-nombre { font-weight: 700; color: var(--primary); text-decoration: none; &:hover { color: var(--accent); } }
    .empresa-meta { display: block; font-size: 0.68rem; color: var(--text-muted); }

    .plan-chip {
      display: inline-flex; align-items: center; gap: 0.3rem;
      background: rgba(217, 119, 6, 0.1); color: var(--gold);
      padding: 0.2rem 0.55rem; border-radius: var(--radius-full);
      font-size: 0.72rem; font-weight: 700;
    }

    .fecha { display: block; font-weight: 600; color: var(--primary); &.vencida { color: var(--critical); } }
    .badge-sm { font-size: 0.6rem; margin-top: 0.15rem; }
    .texto-muted { color: var(--text-muted); }
    .uso-celda { font-weight: 700; color: var(--primary); &.limite { color: var(--critical); } }

    .empty-box {
      display: flex; flex-direction: column; align-items: center;
      text-align: center; gap: 0.4rem; padding: 3rem 1.5rem;
      i { font-size: 2.5rem; color: var(--text-muted); }
      h3 { margin: 0; font-size: 1rem; color: var(--primary); }
      p { margin: 0 0 0.75rem; font-size: 0.82rem; color: var(--text-muted); }
    }

    .loading-box { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 3rem; color: var(--text-muted); }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .filtro-acciones { width: 100%; }
      .filtro-acciones .btn { flex: 1; }
    }
  `]
})
export class TenantListComponent implements OnInit {
  private saasApi = inject(SaasApiService);
  private toast = inject(ToastService);

  public filas = signal<FilaTenant[]>([]);
  public cargando = signal(false);
  public total = signal(0);
  public pagina = signal(1);

  public busqueda = '';
  public estado: EstadoTenant | '' = '';

  public readonly limite = 20;

  ngOnInit(): void {
    this.cargar(1);
  }

  public cargar(pagina: number): void {
    this.pagina.set(pagina);
    this.cargando.set(true);

    this.saasApi.listarTenants({
      skip: (pagina - 1) * this.limite,
      limit: this.limite,
      estado: this.estado || undefined,
      q: this.busqueda.trim() || undefined
    }).pipe(
      map((respuesta) => ({ total: respuesta.total, items: respuesta.items })),
      finalize(() => this.cargando.set(false))
    ).subscribe({
      next: ({ total, items }) => {
        this.total.set(total);
        if (items.length === 0) {
          this.filas.set([]);
          return;
        }
        forkJoin(items.map((tenant) => this.saasApi.obtenerTenant(tenant.id).pipe(
          catchError(() => of({ ...tenant, suscripcion: null, uso: null } as any))
        ))).subscribe((detalles) => {
          this.filas.set(detalles.map((detalle) => this.componerFila(detalle)));
        });
      },
      error: () => {
        this.filas.set([]);
        this.toast.error('No se pudo cargar el listado de empresas.');
      }
    });
  }

  public limpiar(): void {
    this.busqueda = '';
    this.estado = '';
    this.cargar(1);
  }

  public vencida(fecha: string): boolean {
    return Date.parse(`${fecha}T23:59:59`) < Date.now();
  }

  public enLimite(uso: number | undefined, limite: number | null | undefined): boolean {
    if (uso === undefined || limite === null || limite === undefined) return false;
    return uso >= limite;
  }

  private componerFila(detalle: Tenant & { suscripcion?: Suscripcion | null; uso?: UsoTenant | null }): FilaTenant {
    return {
      ...detalle,
      plan_nombre: detalle.suscripcion?.plan?.nombre ?? '—',
      fecha_vencimiento: detalle.suscripcion?.fecha_vencimiento ?? null,
      estado_suscripcion: detalle.suscripcion?.estado ?? 'SIN_SUSCRIPCION',
      uso: detalle.uso ?? null
    };
  }
}
