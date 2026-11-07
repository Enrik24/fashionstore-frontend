import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SaasApiService } from '../../../../core/services/saas-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TenantDetalle, UsoTenant } from '../../../../core/models/saas.model';
import { SectionTitleComponent } from '../../../../shared/components/section-title/section-title.component';
import { PlanLimitAlertComponent } from '../../../../shared/components/plan-limit-alert/plan-limit-alert.component';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';

/**
 * [EXAMEN-2] CU03: uso vs límites del plan de una empresa.
 * Muestra sucursales, usuarios, productos y respaldos con barras de progreso.
 */
@Component({
  selector: 'app-tenant-usage',
  standalone: true,
  imports: [CommonModule, RouterLink, SectionTitleComponent, PlanLimitAlertComponent, CurrencyFormatPipe],
  template: `
    <div class="page">
      <app-section-title
        [titulo]="tenant()?.razon_social ? ('Uso de ' + tenant()!.razon_social) : 'Uso vs límites'"
        subtitulo="Consumo actual contra los límites del plan contratado."
        icono="ri-bar-chart-box-line">
        <div acciones class="acciones-cabecera">
          <a routerLink="/plataforma/empresas" class="btn btn-outline btn-sm">
            <i class="ri-arrow-left-line"></i> Empresas
          </a>
          <a class="btn btn-outline btn-sm" [routerLink]="['/plataforma/empresas', id]">
            <i class="ri-building-4-line"></i> Detalle
          </a>
          @if (tenant()?.suscripcion?.plan; as plan) {
            <a class="btn btn-accent btn-sm" [routerLink]="['/plataforma/planes', plan.id]">
              <i class="ri-vip-crown-2-line"></i> Ver plan
            </a>
          }
        </div>
      </app-section-title>

      @if (cargando()) {
        <div class="loading-box card"><i class="ri-loader-4-line spin"></i> Calculando uso…</div>
      } @else if (!uso()) {
        <div class="empty-box card">
          <i class="ri-bar-chart-line"></i>
          <h3>No se pudo obtener el uso</h3>
          <p>La empresa no tiene plan asignado o el servicio no está disponible.</p>
        </div>
      } @else {
        @if (sucursalesEnLimite()) {
          <app-plan-limit-alert
            recurso="sucursales"
            [usado]="uso()!.sucursales_actuales"
            [limite]="uso()!.max_sucursales">
          </app-plan-limit-alert>
        }
        @if (usuariosEnLimite()) {
          <app-plan-limit-alert
            recurso="usuarios"
            [usado]="uso()!.usuarios_actuales"
            [limite]="uso()!.max_usuarios ?? null">
          </app-plan-limit-alert>
        }
        @if (productosEnLimite()) {
          <app-plan-limit-alert
            recurso="productos"
            [usado]="uso()!.productos_actuales"
            [limite]="uso()!.max_productos ?? null">
          </app-plan-limit-alert>
        }

        <div class="resumen card">
          <div class="resumen-dato">
            <span class="resumen-label">Plan</span>
            <strong>{{ tenant()?.suscripcion?.plan?.nombre || 'Sin plan' }}</strong>
          </div>
          <div class="resumen-dato">
            <span class="resumen-label">Precio</span>
            <strong>{{ tenant()?.suscripcion?.plan?.precio_mensual | currencyFormat:'Bs.' }} / mes</strong>
          </div>
          <div class="resumen-dato">
            <span class="resumen-label">Vencimiento</span>
            <strong>{{ (tenant()?.suscripcion?.fecha_vencimiento | date: 'dd/MM/yyyy') || '—' }}</strong>
          </div>
        </div>

        <div class="uso-grid">
          @for (fila of filas(); track fila.clave) {
            <article class="uso-card card">
              <header>
                <span class="uso-icono"><i [class]="fila.icono"></i></span>
                <div>
                  <h3>{{ fila.titulo }}</h3>
                  <p>{{ fila.descripcion }}</p>
                </div>
              </header>

              <div class="uso-valores">
                <strong [class.limite]="fila.enLimite">{{ fila.usado }}</strong>
                <span>/ {{ fila.limite === null ? '∞' : fila.limite }}</span>
              </div>

              <div class="progress-track" role="progressbar"
                   [attr.aria-valuenow]="fila.porcentaje"
                   aria-valuemin="0" aria-valuemax="100"
                   [attr.aria-label]="fila.titulo + ': ' + fila.usado + ' de ' + (fila.limite ?? 'ilimitado')">
                <div class="progress-fill"
                     [class.is-limit]="fila.enLimite"
                     [style.width.%]="fila.porcentaje"></div>
              </div>

              <footer>
                @if (fila.limite === null) {
                  <span class="nota">Sin límite en este plan.</span>
                } @else if (fila.enLimite) {
                  <span class="nota critica"><i class="ri-error-warning-line"></i> Límite alcanzado</span>
                } @else {
                  <span class="nota">Disponibles: {{ fila.limite - fila.usado }}</span>
                }
              </footer>
            </article>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1rem; }
    .acciones-cabecera { display: flex; gap: 0.4rem; flex-wrap: wrap; }

    .resumen {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      padding: 1rem 1.25rem;
    }
    .resumen-dato { display: flex; flex-direction: column; gap: 0.15rem; }
    .resumen-label { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; }
    .resumen-dato strong { font-size: 0.9rem; color: var(--primary); }

    .uso-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; }
    .uso-card { padding: 1.15rem 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .uso-card header { display: flex; gap: 0.65rem; align-items: flex-start; }
    .uso-icono {
      width: 38px; height: 38px; flex-shrink: 0;
      border-radius: var(--radius-md);
      background: var(--bg-main);
      color: var(--accent);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem;
    }
    .uso-card h3 { margin: 0; font-size: 0.9rem; font-weight: 800; color: var(--primary); }
    .uso-card p { margin: 0; font-size: 0.72rem; color: var(--text-muted); }

    .uso-valores { display: flex; align-items: baseline; gap: 0.3rem; }
    .uso-valores strong { font-size: 1.8rem; font-weight: 800; color: var(--primary); }
    .uso-valores strong.limite { color: var(--critical); }
    .uso-valores span { font-size: 0.82rem; color: var(--text-muted); font-weight: 600; }

    .progress-track { height: 8px; background: var(--border-light); border-radius: var(--radius-full); overflow: hidden; }
    .progress-fill { height: 100%; background: var(--success); border-radius: inherit; transition: width 0.3s ease; }
    .progress-fill.is-limit { background: var(--critical); }

    .nota { font-size: 0.7rem; color: var(--text-muted); }
    .nota.critica { color: var(--critical); font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem; }

    .loading-box, .empty-box {
      display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
      padding: 3rem 1.5rem; text-align: center;
      i { font-size: 2.5rem; color: var(--text-muted); }
      h3 { margin: 0; font-size: 1rem; color: var(--primary); }
      p { margin: 0; font-size: 0.82rem; color: var(--text-muted); }
    }
    .loading-box { flex-direction: row; justify-content: center; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class TenantUsageComponent implements OnInit {
  private saasApi = inject(SaasApiService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  public tenant = signal<TenantDetalle | null>(null);
  public uso = signal<UsoTenant | null>(null);
  public cargando = signal(true);

  public id = 0;

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar();
  }

  public filas = () => {
    const uso = this.uso();
    if (!uso) return [];
    return [
      {
        clave: 'sucursales',
        titulo: 'Sucursales',
        descripcion: 'Tiendas activas del tenant.',
        icono: 'ri-store-3-line',
        usado: uso.sucursales_actuales,
        limite: uso.max_sucursales ?? null,
        enLimite: this.enLimite(uso.sucursales_actuales, uso.max_sucursales),
        porcentaje: this.porcentaje(uso.sucursales_actuales, uso.max_sucursales)
      },
      {
        clave: 'usuarios',
        titulo: 'Usuarios',
        descripcion: 'Cuentas con acceso al sistema.',
        icono: 'ri-user-settings-line',
        usado: uso.usuarios_actuales,
        limite: uso.max_usuarios ?? null,
        enLimite: this.enLimite(uso.usuarios_actuales, uso.max_usuarios),
        porcentaje: this.porcentaje(uso.usuarios_actuales, uso.max_usuarios)
      },
      {
        clave: 'productos',
        titulo: 'Productos',
        descripcion: 'Productos activos en el catálogo.',
        icono: 'ri-t-shirt-2-line',
        usado: uso.productos_actuales,
        limite: uso.max_productos ?? null,
        enLimite: this.enLimite(uso.productos_actuales, uso.max_productos),
        porcentaje: this.porcentaje(uso.productos_actuales, uso.max_productos)
      },
      {
        clave: 'respaldos',
        titulo: 'Respaldos manuales',
        descripcion: 'Respaldos consumidos este mes.',
        icono: 'ri-database-2-line',
        usado: uso.backups_mes_actual,
        limite: uso.max_backups_manuales ?? null,
        enLimite: this.enLimite(uso.backups_mes_actual, uso.max_backups_manuales),
        porcentaje: this.porcentaje(uso.backups_mes_actual, uso.max_backups_manuales)
      }
    ];
  };

  public sucursalesEnLimite(): boolean {
    const uso = this.uso();
    return !!uso && this.enLimite(uso.sucursales_actuales, uso.max_sucursales);
  }

  public usuariosEnLimite(): boolean {
    const uso = this.uso();
    return !!uso && this.enLimite(uso.usuarios_actuales, uso.max_usuarios);
  }

  public productosEnLimite(): boolean {
    const uso = this.uso();
    return !!uso && this.enLimite(uso.productos_actuales, uso.max_productos);
  }

  private cargar(): void {
    this.cargando.set(true);
    this.saasApi.obtenerTenant(this.id).subscribe({
      next: (detalle) => {
        this.tenant.set(detalle);
        if (detalle.uso) {
          this.uso.set(detalle.uso);
          this.cargando.set(false);
          return;
        }
        this.saasApi.obtenerUsoTenant(this.id).subscribe({
          next: (uso) => {
            this.uso.set(uso);
            this.cargando.set(false);
          },
          error: () => {
            this.cargando.set(false);
            this.toast.error('No se pudo obtener el uso de la empresa.');
          }
        });
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudo cargar la empresa.');
      }
    });
  }

  private enLimite(usado: number, limite: number | null | undefined): boolean {
    if (limite === null || limite === undefined || limite <= 0) return false;
    return usado >= limite;
  }

  private porcentaje(usado: number, limite: number | null | undefined): number {
    if (limite === null || limite === undefined || limite <= 0) return 0;
    return Math.min(100, Math.round((usado / limite) * 100));
  }
}
