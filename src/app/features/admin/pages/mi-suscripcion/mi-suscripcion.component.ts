import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SaasApiService } from '../../../../core/services/saas-api.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { UserApiService } from '../../../../core/services/user-api.service';
import { CatalogApiService } from '../../../../core/services/catalog-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  FuncionalidadPlan,
  HistorialPagos,
  PagoSuscripcion,
  Suscripcion
} from '../../../../core/models/saas.model';
import { SectionTitleComponent } from '../../../../shared/components/section-title/section-title.component';
import { PlanLimitAlertComponent } from '../../../../shared/components/plan-limit-alert/plan-limit-alert.component';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { catchError, forkJoin, of } from 'rxjs';

interface UsoLocal {
  sucursales: number;
  usuarios: number;
  productos: number;
}

/**
 * [EXAMEN-2] CU04: "Mi suscripción" del Administrador de tenant.
 * Muestra plan, vigencia, límites, uso local, funcionalidades, política de
 * respaldos e historial de pagos del tenant autenticado.
 */
@Component({
  selector: 'app-mi-suscripcion',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    SectionTitleComponent,
    PlanLimitAlertComponent,
    StatusBadgePipe,
    CurrencyFormatPipe
  ],
  template: `
    <div class="page">
      <app-section-title
        titulo="Mi suscripción"
        subtitulo="Plan contratado, vigencia, límites y pagos de la empresa."
        icono="ri-calendar-check-line"
        [badge]="estadoEtiqueta()">
        <a acciones routerLink="/admin/configuracion" class="btn btn-outline btn-sm">
          <i class="ri-settings-4-line"></i> Configuración
        </a>
      </app-section-title>

      @if (cargando()) {
        <div class="loading-box card"><i class="ri-loader-4-line spin"></i> Cargando suscripción…</div>
      } @else if (!suscripcion()) {
        <div class="empty-box card">
          <i class="ri-calendar-close-line"></i>
          <h3>Sin suscripción activa</h3>
          <p>Contacta al administrador de la plataforma para asignar un plan.</p>
        </div>
      } @else {
        @if (porVencer()) {
          <div class="aviso-vencimiento" role="alert">
            <i class="ri-alarm-warning-line"></i>
            <div>
              <strong>Tu suscripción vence en {{ diasRestantes() }} días</strong>
              <span>Renueva el plan para evitar el bloqueo de las rutas de negocio.</span>
            </div>
          </div>
        }

        <div class="top-grid">
          <section class="card plan-actual">
            <div class="plan-cabecera">
              <div>
                <span class="etiqueta">Plan actual</span>
                <h2>{{ suscripcion()!.plan?.nombre || funcionalidades()?.plan || 'Sin plan' }}</h2>
              </div>
              <span class="badge" [ngClass]="(suscripcion()!.estado | statusBadge).class">
                {{ (suscripcion()!.estado | statusBadge).label }}
              </span>
            </div>

            <div class="precio">
              <strong>{{ suscripcion()!.plan?.precio_mensual | currencyFormat:'Bs.' }}</strong>
              <span>/ mes</span>
            </div>

            <dl class="ficha">
              <div><dt>Inicio</dt><dd>{{ suscripcion()!.fecha_inicio | date: 'dd/MM/yyyy' }}</dd></div>
              <div><dt>Vencimiento</dt><dd>{{ suscripcion()!.fecha_vencimiento | date: 'dd/MM/yyyy' }}</dd></div>
              <div><dt>Días restantes</dt><dd [class.critico]="porVencer()">{{ diasRestantes() ?? '—' }}</dd></div>
              <div><dt>Renovación automática</dt><dd>{{ suscripcion()!.renovacion_automatica ? 'Sí' : 'No' }}</dd></div>
              <div><dt>Estado del pago</dt><dd>{{ suscripcion()!.estado_pago || '—' }}</dd></div>
            </dl>
          </section>

          <section class="card funcionalidades">
            <h2><i class="ri-function-line"></i> Funcionalidades incluidas</h2>
            <ul>
              <li [class.no]="!funcionalidades()?.reportes_ia">
                <i [class]="funcionalidades()?.reportes_ia ? 'ri-checkbox-circle-fill' : 'ri-close-circle-line'"></i>
                Reportes con IA
              </li>
              <li [class.no]="!funcionalidades()?.pago_diferido">
                <i [class]="funcionalidades()?.pago_diferido ? 'ri-checkbox-circle-fill' : 'ri-close-circle-line'"></i>
                Pago diferido
              </li>
              <li [class.no]="!funcionalidades()?.carrito_offline">
                <i [class]="funcionalidades()?.carrito_offline ? 'ri-checkbox-circle-fill' : 'ri-close-circle-line'"></i>
                Carrito offline
              </li>
              <li [class.no]="!funcionalidades()?.backup_automatico">
                <i [class]="funcionalidades()?.backup_automatico ? 'ri-checkbox-circle-fill' : 'ri-close-circle-line'"></i>
                Respaldos automáticos
              </li>
              <li [class.no]="!funcionalidades()?.permite_restauracion">
                <i [class]="funcionalidades()?.permite_restauracion ? 'ri-checkbox-circle-fill' : 'ri-close-circle-line'"></i>
                Restauración de respaldos
              </li>
            </ul>

            <div class="soporte">
              <i class="ri-customer-service-2-line"></i>
              <span>¿Necesitas más sucursales o usuarios? Solicita una mejora de plan al administrador de la plataforma.</span>
            </div>
          </section>
        </div>

        <section class="card bloque">
          <h2><i class="ri-bar-chart-box-line"></i> Uso contra los límites</h2>
          <p class="bloque-desc">El conteo se obtiene del catálogo, las sucursales y los usuarios de tu empresa.</p>

          <div class="uso-grid">
            <div class="uso-item">
              <div class="uso-cabecera">
                <span><i class="ri-store-3-line"></i> Sucursales</span>
                <strong [class.limite]="enLimite(uso().sucursales, limiteSucursales())">
                  {{ uso().sucursales }} / {{ limiteSucursales() ?? '∞' }}
                </strong>
              </div>
              <div class="progress-track">
                <div class="progress-fill" [class.is-limit]="enLimite(uso().sucursales, limiteSucursales())"
                     [style.width.%]="porcentaje(uso().sucursales, limiteSucursales())"></div>
              </div>
            </div>

            <div class="uso-item">
              <div class="uso-cabecera">
                <span><i class="ri-user-settings-line"></i> Usuarios</span>
                <strong [class.limite]="enLimite(uso().usuarios, limiteUsuarios())">
                  {{ uso().usuarios }} / {{ limiteUsuarios() ?? '∞' }}
                </strong>
              </div>
              <div class="progress-track">
                <div class="progress-fill" [class.is-limit]="enLimite(uso().usuarios, limiteUsuarios())"
                     [style.width.%]="porcentaje(uso().usuarios, limiteUsuarios())"></div>
              </div>
            </div>

            <div class="uso-item">
              <div class="uso-cabecera">
                <span><i class="ri-t-shirt-2-line"></i> Productos</span>
                <strong [class.limite]="enLimite(uso().productos, limiteProductos())">
                  {{ uso().productos }} / {{ limiteProductos() ?? '∞' }}
                </strong>
              </div>
              <div class="progress-track">
                <div class="progress-fill" [class.is-limit]="enLimite(uso().productos, limiteProductos())"
                     [style.width.%]="porcentaje(uso().productos, limiteProductos())"></div>
              </div>
            </div>
          </div>

          @if (enLimite(uso().sucursales, limiteSucursales())) {
            <app-plan-limit-alert recurso="sucursales" [usado]="uso().sucursales" [limite]="limiteSucursales()"></app-plan-limit-alert>
          }
        </section>

        <div class="bottom-grid">
          <section class="card bloque">
            <h2><i class="ri-database-2-line"></i> Política de respaldos</h2>
            <dl class="ficha">
              <div><dt>Respaldo automático</dt><dd>{{ funcionalidades()?.backup_automatico ? 'Sí' : 'No' }}</dd></div>
              <div><dt>Frecuencia</dt>
                <dd>{{ textoFrecuencia() }}</dd>
              </div>
              <div><dt>Retención</dt>
                <dd>{{ textoRetencion() }}</dd>
              </div>
              <div><dt>Respaldos manuales / mes</dt>
                <dd>{{ funcionalidades()?.backup_manual_mensual ?? '∞' }}</dd>
              </div>
              <div><dt>Restauración</dt><dd>{{ funcionalidades()?.permite_restauracion ? 'Permitida' : 'No incluida' }}</dd></div>
            </dl>
          </section>

          <section class="card bloque">
            <h2><i class="ri-shield-keyhole-line"></i> Acceso sin conexión</h2>
            <p class="bloque-desc">
              Configura tu PIN y revisa los dispositivos autorizados para operar cuando no haya internet.
            </p>
            <a routerLink="/profile/offline" class="btn btn-outline btn-sm">
              <i class="ri-device-line"></i> Seguridad offline
            </a>
          </section>
        </div>

        <section class="card bloque">
          <h2><i class="ri-bank-card-line"></i> Historial de pagos</h2>
          @if (pagos().length === 0) {
            <p class="bloque-desc">Todavía no hay pagos registrados para esta suscripción.</p>
          } @else {
            <div class="tabla-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  @for (pago of pagos(); track pago.id) {
                    <tr>
                      <td>{{ (pago.fecha | date: 'dd/MM/yyyy HH:mm') || '—' }}</td>
                      <td class="monto">{{ pago.monto | currencyFormat:pago.moneda }}</td>
                      <td>
                        <span class="badge" [ngClass]="(pago.estado | statusBadge).class">{{ (pago.estado | statusBadge).label }}</span>
                      </td>
                      <td class="ref">{{ pago.referencia || pago.stripe_payment_intent_id || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1rem; }

    .aviso-vencimiento {
      display: flex; align-items: center; gap: 0.7rem;
      background: var(--warning-bg, #fef8e7); border-left: 4px solid var(--gold);
      border-radius: var(--radius-md); padding: 0.85rem 1rem;
      i { font-size: 1.5rem; color: var(--gold); }
      div { display: flex; flex-direction: column; gap: 0.1rem; }
      strong { font-size: 0.84rem; color: var(--primary); }
      span { font-size: 0.74rem; color: var(--text-muted); }
    }

    .top-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 1rem; align-items: start; }
    .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: start; }

    .plan-actual { padding: 1.35rem 1.5rem; }
    .plan-cabecera { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; }
    .etiqueta { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; }
    .plan-cabecera h2 { margin: 0.1rem 0 0; font-size: 1.35rem; font-weight: 800; color: var(--primary); }
    .precio { display: flex; align-items: baseline; gap: 0.3rem; margin: 0.75rem 0 0.5rem; }
    .precio strong { font-size: 1.5rem; color: var(--accent); font-weight: 800; }
    .precio span { font-size: 0.76rem; color: var(--text-muted); }

    .ficha { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.65rem 1rem; margin: 0; }
    .ficha div { display: flex; flex-direction: column; gap: 0.12rem; }
    .ficha dt { font-size: 0.64rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); font-weight: 700; }
    .ficha dd { margin: 0; font-size: 0.82rem; color: var(--primary); font-weight: 600; }
    .ficha dd.critico { color: var(--critical); font-weight: 800; }

    .funcionalidades { padding: 1.35rem 1.5rem; }
    .funcionalidades h2, .bloque h2 { display: flex; align-items: center; gap: 0.45rem; margin: 0 0 0.7rem; font-size: 1rem; font-weight: 800; color: var(--primary); }
    .funcionalidades h2 i, .bloque h2 i { color: var(--accent); }
    .funcionalidades ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.45rem; }
    .funcionalidades li { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--primary); }
    .funcionalidades li i { color: var(--success); }
    .funcionalidades li.no { color: var(--text-muted); }
    .funcionalidades li.no i { color: var(--text-muted); }

    .soporte { display: flex; gap: 0.45rem; align-items: flex-start; margin-top: 0.9rem; border-top: 1px solid var(--border-light); padding-top: 0.7rem; }
    .soporte i { color: var(--accent); font-size: 1rem; }
    .soporte span { font-size: 0.72rem; color: var(--text-muted); line-height: 1.45; }

    .bloque { padding: 1.35rem 1.5rem; }
    .bloque-desc { margin: 0 0 0.9rem; font-size: 0.74rem; color: var(--text-muted); }

    .uso-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
    .uso-item { display: flex; flex-direction: column; gap: 0.45rem; }
    .uso-cabecera { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
    .uso-cabecera span { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); }
    .uso-cabecera strong { font-size: 0.95rem; color: var(--primary); }
    .uso-cabecera strong.limite { color: var(--critical); }

    .progress-track { height: 7px; background: var(--border-light); border-radius: var(--radius-full); overflow: hidden; }
    .progress-fill { height: 100%; background: var(--success); border-radius: inherit; transition: width 0.3s ease; }
    .progress-fill.is-limit { background: var(--critical); }

    .tabla-wrapper { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 560px; }
    th { text-align: left; font-size: 0.64rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); padding: 0.6rem 0.8rem; background: var(--bg-main); border-bottom: 1px solid var(--border-color); }
    td { padding: 0.65rem 0.8rem; border-bottom: 1px solid var(--border-light); font-size: 0.78rem; }
    .monto { font-weight: 700; color: var(--primary); }
    .ref { font-family: ui-monospace, monospace; font-size: 0.68rem; color: var(--text-muted); }

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

    @media (max-width: 900px) {
      .top-grid, .bottom-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class MiSuscripcionComponent implements OnInit {
  private saasApi = inject(SaasApiService);
  private branchApi = inject(BranchApiService);
  private userApi = inject(UserApiService);
  private catalogApi = inject(CatalogApiService);
  private toast = inject(ToastService);

  public suscripcion = signal<Suscripcion | null>(null);
  public funcionalidades = signal<FuncionalidadPlan | null>(null);
  public pagos = signal<PagoSuscripcion[]>([]);
  public uso = signal<UsoLocal>({ sucursales: 0, usuarios: 0, productos: 0 });
  public cargando = signal(true);

  public diasRestantes = computed<number | null>(() => {
    const vencimiento = this.suscripcion()?.fecha_vencimiento;
    if (!vencimiento) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fecha = new Date(`${vencimiento}T00:00:00`);
    if (Number.isNaN(fecha.getTime())) return null;
    return Math.ceil((fecha.getTime() - hoy.getTime()) / 86_400_000);
  });

  public porVencer = computed(() => {
    const dias = this.diasRestantes();
    return dias !== null && dias >= 0 && dias <= 7;
  });

  ngOnInit(): void {
    this.cargar();
  }

  public estadoEtiqueta(): string {
    return this.suscripcion()?.estado === 'ACTIVA' ? 'Activa' : (this.suscripcion()?.estado ?? 'Sin suscripción');
  }

  public limiteSucursales(): number | null {
    return this.funcionalidades()?.max_sucursales ?? this.suscripcion()?.plan?.max_sucursales ?? null;
  }

  public limiteUsuarios(): number | null {
    return this.funcionalidades()?.max_usuarios ?? this.suscripcion()?.plan?.max_usuarios ?? null;
  }

  public limiteProductos(): number | null {
    return this.funcionalidades()?.max_productos ?? this.suscripcion()?.plan?.max_productos ?? null;
  }

  public enLimite(usado: number, limite: number | null): boolean {
    if (limite === null || limite === undefined || limite <= 0) return false;
    return usado >= limite;
  }

  public porcentaje(usado: number, limite: number | null): number {
    if (limite === null || limite === undefined || limite <= 0) return 0;
    return Math.min(100, Math.round((usado / limite) * 100));
  }

  public textoFrecuencia(): string {
    const horas = this.funcionalidades()?.backup_frecuencia_horas;
    return horas ? `Cada ${horas} h` : '—';
  }

  public textoRetencion(): string {
    const dias = this.funcionalidades()?.backup_retencion_dias;
    return dias ? `${dias} días` : '—';
  }

  private cargar(): void {
    this.cargando.set(true);
    forkJoin({
      suscripcion: this.saasApi.obtenerMiSuscripcion().pipe(catchError(() => of(null))),
      funcionalidades: this.saasApi.obtenerFuncionalidadesPlan().pipe(catchError(() => of(null))),
      pagos: this.saasApi.listarPagosSuscripcion().pipe(catchError(() => of({ total: 0, pagos: [] } as HistorialPagos))),
      sucursales: this.branchApi.getBranches(0, 500).pipe(catchError(() => of([]))),
      usuarios: this.userApi.getUsers(0, 500).pipe(catchError(() => of([]))),
      productos: this.catalogApi.getProducts(0, 500).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ suscripcion, funcionalidades, pagos, sucursales, usuarios, productos }) => {
        this.suscripcion.set(suscripcion);
        this.funcionalidades.set(funcionalidades);
        this.pagos.set(pagos?.pagos ?? []);
        this.uso.set({
          sucursales: sucursales.length,
          usuarios: usuarios.length,
          productos: productos.length
        });
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudo cargar la información de la suscripción.');
      }
    });
  }
}
