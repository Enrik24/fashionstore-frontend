import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SaasApiService } from '../../../../core/services/saas-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { DeviceService } from '../../../../core/offline/device.service';
import {
  DispositivoSincronizacion
} from '../../../../core/models/offline.model';
import {
  EstadoTenant,
  Plan,
  ReenviarCredencialesResponse,
  Suscripcion,
  TenantDetalle,
  TenantUpdateDto,
  UsoTenant
} from '../../../../core/models/saas.model';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { SectionTitleComponent } from '../../../../shared/components/section-title/section-title.component';
import { PlanLimitAlertComponent } from '../../../../shared/components/plan-limit-alert/plan-limit-alert.component';

type Pestana = 'datos' | 'suscripcion' | 'uso' | 'dispositivos' | 'pagos';

/**
 * [EXAMEN-2] CU01 / CU03: detalle de empresa con pestañas de datos fiscales,
 * suscripción, uso vs límites, dispositivos y pagos.
 *
 * Nota de contrato: la Fase 1 del backend no expone el listado de dispositivos
 * de otro tenant ni su historial de pagos al Super Administrador; esas dos
 * pestañas informan la limitación en lugar de inventar datos.
 */
@Component({
  selector: 'app-tenant-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    StatusBadgePipe,
    CurrencyFormatPipe,
    SectionTitleComponent,
    PlanLimitAlertComponent
  ],
  template: `
    @if (cargando()) {
      <div class="loading-box"><i class="ri-loader-4-line spin"></i> Cargando empresa…</div>
    } @else if (!tenant()) {
      <div class="empty-box card">
        <i class="ri-building-line"></i>
        <h3>No se pudo cargar la empresa</h3>
        <p>Verifica que exista y vuelve a intentarlo.</p>
        <a routerLink="/plataforma/empresas" class="btn btn-outline">Volver al listado</a>
      </div>
    } @else {
      <div class="page">
        <app-section-title
          [titulo]="tenant()!.razon_social"
          [subtitulo]="'NIT ' + tenant()!.nit + ' · ' + tenant()!.correo_contacto"
          icono="ri-building-4-line"
          [badge]="(tenant()!.estado | statusBadge).label">
          <div acciones class="cabecera-acciones">
            <a routerLink="/plataforma/empresas" class="btn btn-outline btn-sm">
              <i class="ri-arrow-left-line"></i> Volver
            </a>
            <button type="button" class="btn btn-outline btn-sm" (click)="reenviar()" [disabled]="reenviando()">
              <i class="ri-mail-send-line"></i> Credenciales
            </button>
            <a class="btn btn-accent btn-sm" [routerLink]="['/plataforma/empresas', tenant()!.id, 'uso']">
              <i class="ri-bar-chart-box-line"></i> Uso vs límites
            </a>
          </div>
        </app-section-title>

        @if (credenciales(); as cred) {
          <div class="credenciales card">
            <i class="ri-key-2-line"></i>
            <div>
              <strong>Credenciales temporales regeneradas</strong>
              <span>{{ cred.correo }} · <code>{{ cred.contrasena_temporal }}</code></span>
            </div>
            <button type="button" class="btn btn-sm btn-outline" (click)="credenciales.set(null)">Cerrar</button>
          </div>
        }

        <div class="tabs" role="tablist">
          @for (tab of pestanas; track tab.clave) {
            <button type="button" role="tab" class="tab"
                    [class.activo]="pestana() === tab.clave"
                    [attr.aria-selected]="pestana() === tab.clave"
                    (click)="pestana.set(tab.clave)">
              <i [class]="tab.icono"></i> {{ tab.titulo }}
            </button>
          }
        </div>

        @switch (pestana()) {
          @case ('datos') {
            <section class="card bloque">
              <div class="bloque-cabecera">
                <h2>Datos fiscales y de contacto</h2>
                @if (!editando()) {
                  <button type="button" class="btn btn-sm btn-outline" (click)="iniciarEdicion()">
                    <i class="ri-edit-line"></i> Editar
                  </button>
                }
              </div>

              @if (editando()) {
                <div class="grid">
                  <div class="campo campo-full">
                    <label for="ed-razon">Razón social</label>
                    <input id="ed-razon" [(ngModel)]="edicion.razon_social" maxlength="200" />
                  </div>
                  <div class="campo">
                    <label for="ed-nit">NIT</label>
                    <input id="ed-nit" [(ngModel)]="edicion.nit" maxlength="20" />
                  </div>
                  <div class="campo">
                    <label for="ed-correo">Correo de contacto</label>
                    <input id="ed-correo" type="email" [(ngModel)]="edicion.correo_contacto" />
                  </div>
                  <div class="campo">
                    <label for="ed-telefono">Teléfono</label>
                    <input id="ed-telefono" [(ngModel)]="edicion.telefono" maxlength="30" />
                  </div>
                  <div class="campo">
                    <label for="ed-moneda">Moneda</label>
                    <select id="ed-moneda" [(ngModel)]="edicion.moneda">
                      <option value="BOB">BOB</option>
                      <option value="USD">USD</option>
                      <option value="PEN">PEN</option>
                      <option value="ARS">ARS</option>
                    </select>
                  </div>
                  <div class="campo campo-full">
                    <label for="ed-direccion">Dirección fiscal</label>
                    <textarea id="ed-direccion" rows="2" [(ngModel)]="edicion.direccion_fiscal"></textarea>
                  </div>
                </div>
                <div class="acciones">
                  <button type="button" class="btn btn-outline" (click)="cancelarEdicion()">Cancelar</button>
                  <button type="button" class="btn btn-accent" (click)="guardarDatos()" [disabled]="guardando()">
                    {{ guardando() ? 'Guardando…' : 'Guardar cambios' }}
                  </button>
                </div>
              } @else {
                <dl class="ficha">
                  <div><dt>Razón social</dt><dd>{{ tenant()!.razon_social }}</dd></div>
                  <div><dt>NIT</dt><dd class="mono">{{ tenant()!.nit }}</dd></div>
                  <div><dt>Correo</dt><dd><a [href]="'mailto:' + tenant()!.correo_contacto">{{ tenant()!.correo_contacto }}</a></dd></div>
                  <div><dt>Teléfono</dt><dd>{{ tenant()!.telefono || '—' }}</dd></div>
                  <div><dt>Dirección fiscal</dt><dd>{{ tenant()!.direccion_fiscal }}</dd></div>
                  <div><dt>Moneda</dt><dd>{{ tenant()!.moneda }}</dd></div>
                  <div><dt>Zona horaria</dt><dd>{{ tenant()!.zona_horaria }}</dd></div>
                  <div><dt>Slug</dt><dd class="mono">{{ tenant()!.slug }}</dd></div>
                  <div><dt>Registro</dt><dd>{{ (tenant()!.fecha_registro | date: 'dd/MM/yyyy HH:mm') || '—' }}</dd></div>
                </dl>
              }
            </section>

            <section class="card bloque">
              <h2>Estado de la empresa</h2>
              <p class="bloque-desc">
                Suspender o cancelar bloquea las rutas de negocio del tenant (RN-004).
              </p>
              <div class="estado-acciones">
                <select [(ngModel)]="nuevoEstado" aria-label="Nuevo estado">
                  <option value="CONFIGURACION_INICIAL">Configuración inicial</option>
                  <option value="OPERATIVO">Operativo</option>
                  <option value="SUSPENDIDO">Suspendido</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
                <input [(ngModel)]="motivoEstado" placeholder="Motivo (visible en el historial)" maxlength="200" />
                <button type="button" class="btn btn-primary" (click)="cambiarEstado()" [disabled]="cambiandoEstado()">
                  <i class="ri-exchange-line"></i> Aplicar estado
                </button>
              </div>
            </section>
          }

          @case ('suscripcion') {
            <section class="card bloque">
              <div class="bloque-cabecera">
                <h2>Plan y suscripción</h2>
                @if (suscripcion()) {
                  <a class="btn btn-sm btn-accent"
                     [routerLink]="['/plataforma/suscripciones', suscripcion()!.id, 'checkout']">
                    <i class="ri-bank-card-line"></i> Pagar plan
                  </a>
                }
              </div>

              @if (suscripcion(); as s) {
                <dl class="ficha">
                  <div><dt>Plan</dt><dd><strong>{{ s.plan?.nombre || 'Sin plan' }}</strong></dd></div>
                  <div><dt>Precio</dt><dd>{{ s.plan?.precio_mensual | currencyFormat:'Bs.' }} / mes</dd></div>
                  <div><dt>Inicio</dt><dd>{{ s.fecha_inicio | date: 'dd/MM/yyyy' }}</dd></div>
                  <div>
                    <dt>Vencimiento</dt>
                    <dd>
                      {{ s.fecha_vencimiento | date: 'dd/MM/yyyy' }}
                      <span class="badge badge-sm" [ngClass]="(s.estado | statusBadge).class">{{ (s.estado | statusBadge).label }}</span>
                    </dd>
                  </div>
                  <div><dt>Estado del pago</dt><dd>{{ s.estado_pago || '—' }}</dd></div>
                  <div><dt>Renovación automática</dt><dd>{{ s.renovacion_automatica ? 'Sí' : 'No' }}</dd></div>
                </dl>

                <div class="sub-acciones">
                  <div class="cambio-plan">
                    <select [(ngModel)]="planSeleccionado" aria-label="Cambiar de plan">
                      <option [ngValue]="null">Cambiar de plan…</option>
                      @for (plan of planes(); track plan.id) {
                        <option [ngValue]="plan.id">{{ plan.nombre }} ({{ plan.max_sucursales }} sucursales)</option>
                      }
                    </select>
                    <button type="button" class="btn btn-sm btn-outline" (click)="cambiarPlan()" [disabled]="!planSeleccionado">
                      <i class="ri-arrow-up-down-line"></i> Cambiar plan
                    </button>
                  </div>

                  <div class="botones-estado">
                    <button type="button" class="btn btn-sm btn-outline" (click)="renovar()">
                      <i class="ri-refresh-line"></i> Renovar
                    </button>
                    @if (s.estado === 'ACTIVA') {
                      <button type="button" class="btn btn-sm btn-outline" (click)="suspender()">
                        <i class="ri-pause-circle-line"></i> Suspender
                      </button>
                    }
                    @if (s.estado === 'SUSPENDIDA' || s.estado === 'VENCIDA') {
                      <button type="button" class="btn btn-sm btn-outline" (click)="reactivar()">
                        <i class="ri-play-circle-line"></i> Reactivar
                      </button>
                    }
                    @if (s.estado !== 'CANCELADA') {
                      <button type="button" class="btn btn-sm btn-outline danger" (click)="cancelar()">
                        <i class="ri-close-circle-line"></i> Cancelar
                      </button>
                    }
                  </div>
                </div>
              } @else {
                <div class="estado-vacio">
                  <i class="ri-calendar-close-line"></i>
                  <p>La empresa todavía no tiene una suscripción asignada.</p>
                  <a routerLink="/plataforma/suscripciones/nueva" class="btn btn-accent btn-sm">
                    <i class="ri-add-line"></i> Asignar plan
                  </a>
                </div>
              }
            </section>
          }

          @case ('uso') {
            <section class="card bloque">
              <h2>Uso contra los límites del plan</h2>
              @if (uso(); as u) {
                @if (u.max_sucursales > 0 && u.sucursales_actuales >= u.max_sucursales) {
                  <app-plan-limit-alert recurso="sucursales" [usado]="u.sucursales_actuales" [limite]="u.max_sucursales"></app-plan-limit-alert>
                }
                <div class="uso-grid">
                  <div class="uso-item">
                    <span class="uso-label"><i class="ri-store-3-line"></i> Sucursales</span>
                    <span class="uso-valor" [class.limite]="enLimite(u.sucursales_actuales, u.max_sucursales)">
                      {{ u.sucursales_actuales }} / {{ u.max_sucursales }}
                    </span>
                    <div class="progress-track">
                      <div class="progress-fill" [class.is-limit]="enLimite(u.sucursales_actuales, u.max_sucursales)"
                           [style.width.%]="porcentaje(u.sucursales_actuales, u.max_sucursales)"></div>
                    </div>
                  </div>

                  <div class="uso-item">
                    <span class="uso-label"><i class="ri-user-settings-line"></i> Usuarios</span>
                    <span class="uso-valor" [class.limite]="enLimite(u.usuarios_actuales, u.max_usuarios)">
                      {{ u.usuarios_actuales }} / {{ u.max_usuarios ?? '∞' }}
                    </span>
                    <div class="progress-track">
                      <div class="progress-fill" [class.is-limit]="enLimite(u.usuarios_actuales, u.max_usuarios)"
                           [style.width.%]="porcentaje(u.usuarios_actuales, u.max_usuarios)"></div>
                    </div>
                  </div>

                  <div class="uso-item">
                    <span class="uso-label"><i class="ri-t-shirt-2-line"></i> Productos</span>
                    <span class="uso-valor" [class.limite]="enLimite(u.productos_actuales, u.max_productos)">
                      {{ u.productos_actuales }} / {{ u.max_productos ?? '∞' }}
                    </span>
                    <div class="progress-track">
                      <div class="progress-fill" [class.is-limit]="enLimite(u.productos_actuales, u.max_productos)"
                           [style.width.%]="porcentaje(u.productos_actuales, u.max_productos)"></div>
                    </div>
                  </div>

                  <div class="uso-item">
                    <span class="uso-label"><i class="ri-database-2-line"></i> Respaldos manuales</span>
                    <span class="uso-valor" [class.limite]="enLimite(u.backups_mes_actual, u.max_backups_manuales)">
                      {{ u.backups_mes_actual }} / {{ u.max_backups_manuales ?? '∞' }}
                    </span>
                    <div class="progress-track">
                      <div class="progress-fill" [class.is-limit]="enLimite(u.backups_mes_actual, u.max_backups_manuales)"
                           [style.width.%]="porcentaje(u.backups_mes_actual, u.max_backups_manuales)"></div>
                    </div>
                  </div>
                </div>
              } @else {
                <p class="bloque-desc">No se pudo obtener el uso de esta empresa.</p>
              }
            </section>
          }

          @case ('dispositivos') {
            <section class="card bloque">
              <h2>Dispositivos autorizados</h2>
              <div class="nota-contrato">
                <i class="ri-information-line"></i>
                <p>
                  La Fase 1 del backend no expone el listado de dispositivos de otro tenant.
                  El administrador de la empresa gestiona sus dispositivos desde
                  <strong>Perfil → Seguridad offline</strong>.
                </p>
              </div>
            </section>
          }

          @case ('pagos') {
            <section class="card bloque">
              <h2>Historial de pagos</h2>
              <div class="nota-contrato">
                <i class="ri-information-line"></i>
                <p>
                  El backend solo expone <code>GET /saas/mi-suscripcion/pagos</code> para el tenant
                  autenticado; el panel de plataforma no puede consultar los pagos de otra empresa.
                  El Super Administrador puede conciliar el pago desde la pasarela con la referencia
                  que aparece en la suscripción.
                </p>
              </div>
            </section>
          }
        }
      </div>
    }
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1rem; }
    .cabecera-acciones { display: flex; gap: 0.4rem; flex-wrap: wrap; }

    .tabs {
      display: flex; gap: 0.25rem; flex-wrap: wrap;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 0.25rem;
    }
    .tab {
      display: inline-flex; align-items: center; gap: 0.35rem;
      padding: 0.55rem 0.9rem;
      border: none; background: transparent;
      border-radius: var(--radius-md) var(--radius-md) 0 0;
      font-size: 0.82rem; font-weight: 600; color: var(--text-muted);
      cursor: pointer;
      &:hover { background: var(--bg-main); color: var(--primary); }
      &.activo { color: var(--accent); background: rgba(225, 29, 72, 0.07); font-weight: 800; }
      i { font-size: 1rem; }
    }

    .bloque { padding: 1.35rem 1.5rem; }
    .bloque h2 { margin: 0 0 0.25rem; font-size: 1rem; font-weight: 800; color: var(--primary); }
    .bloque-desc { font-size: 0.78rem; color: var(--text-muted); margin: 0 0 0.9rem; }
    .bloque-cabecera { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.5rem; }

    .ficha {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.9rem 1.5rem; margin: 0.75rem 0 0;
    }
    .ficha div { display: flex; flex-direction: column; gap: 0.2rem; }
    .ficha dt { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; }
    .ficha dd { margin: 0; font-size: 0.86rem; color: var(--primary); font-weight: 600; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.8rem !important; }

    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.85rem 1rem; }
    .campo-full { grid-column: 1 / -1; }
    .campo { display: flex; flex-direction: column; gap: 0.25rem; }
    .campo label { font-size: 0.72rem; font-weight: 700; color: var(--primary); }
    .campo input, .campo select, .campo textarea, .estado-acciones select, .estado-acciones input, .cambio-plan select {
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 0.5rem 0.65rem;
      font-size: 0.82rem;
      background: white; color: var(--primary); font-family: inherit;
      &:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    }

    .acciones { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
    .estado-acciones { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .estado-acciones select, .estado-acciones input { flex: 1; min-width: 160px; }

    .sub-acciones { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.1rem; border-top: 1px solid var(--border-light); padding-top: 1rem; }
    .cambio-plan { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .cambio-plan select { flex: 1; min-width: 220px; }
    .botones-estado { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .danger { color: var(--critical); border-color: rgba(220, 38, 38, 0.4); }

    .estado-vacio {
      display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
      padding: 2rem 1rem; text-align: center;
      i { font-size: 2rem; color: var(--text-muted); }
      p { margin: 0 0 0.5rem; font-size: 0.82rem; color: var(--text-muted); }
    }

    .uso-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-top: 0.75rem; }
    .uso-item {
      display: flex; flex-direction: column; gap: 0.35rem;
      border: 1px solid var(--border-light); border-radius: var(--radius-md);
      padding: 0.9rem 1rem; background: var(--bg-main);
    }
    .uso-label { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); }
    .uso-valor { font-size: 1.2rem; font-weight: 800; color: var(--primary); &.limite { color: var(--critical); } }

    .nota-contrato {
      display: flex; gap: 0.6rem; align-items: flex-start;
      background: var(--info-bg); color: var(--info);
      border-radius: var(--radius-md); padding: 0.9rem 1rem;
      p { margin: 0; font-size: 0.8rem; color: var(--primary); line-height: 1.5; }
      i { font-size: 1.2rem; flex-shrink: 0; }
    }

    .credenciales {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.8rem 1rem;
      border-left: 4px solid var(--accent);
      div { display: flex; flex-direction: column; gap: 0.15rem; flex: 1; }
      strong { font-size: 0.82rem; color: var(--primary); }
      span { font-size: 0.78rem; color: var(--text-muted); }
      code { background: var(--bg-main); padding: 0.1rem 0.35rem; border-radius: 4px; color: var(--critical); }
      > i { font-size: 1.4rem; color: var(--accent); }
    }

    .empty-box, .loading-box {
      display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
      padding: 3rem 1.5rem; text-align: center;
      i { font-size: 2.5rem; color: var(--text-muted); }
      h3 { margin: 0; font-size: 1rem; color: var(--primary); }
      p { margin: 0 0 0.75rem; font-size: 0.82rem; color: var(--text-muted); }
    }
    .loading-box { flex-direction: row; justify-content: center; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .grid { grid-template-columns: 1fr; }
    }
  `]
})
export class TenantDetailComponent implements OnInit {
  private saasApi = inject(SaasApiService);
  private device = inject(DeviceService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private tenantContext = inject(TenantContextService);

  public pestanas: Array<{ clave: Pestana; titulo: string; icono: string }> = [
    { clave: 'datos', titulo: 'Datos', icono: 'ri-file-list-3-line' },
    { clave: 'suscripcion', titulo: 'Suscripción', icono: 'ri-calendar-check-line' },
    { clave: 'uso', titulo: 'Uso', icono: 'ri-bar-chart-box-line' },
    { clave: 'dispositivos', titulo: 'Dispositivos', icono: 'ri-device-line' },
    { clave: 'pagos', titulo: 'Pagos', icono: 'ri-bank-card-line' }
  ];

  public pestana = signal<Pestana>('datos');
  public tenant = signal<TenantDetalle | null>(null);
  public suscripcion = signal<Suscripcion | null>(null);
  public uso = signal<UsoTenant | null>(null);
  public planes = signal<Plan[]>([]);
  public dispositivos = signal<DispositivoSincronizacion[]>([]);

  public cargando = signal(true);
  public guardando = signal(false);
  public reenviando = signal(false);
  public cambiandoEstado = signal(false);
  public editando = signal(false);
  public credenciales = signal<ReenviarCredencialesResponse | null>(null);

  public nuevoEstado: EstadoTenant = 'OPERATIVO';
  public motivoEstado = '';
  public planSeleccionado: number | null = null;
  public edicion: TenantUpdateDto = {};

  private id = 0;

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    // [EXAMEN-2] El Super Administrador "consulta" este tenant: fija el
    // tenant activo para que `tenantInterceptor` adjunte `X-Tenant-ID` en
    // las peticiones que lo exigen (p. ej. el checkout de la suscripción).
    this.tenantContext.fijarTenantConsultado(this.id);
    this.cargar();
    this.saasApi.listarPlanes().subscribe({ next: (planes) => this.planes.set(planes), error: () => undefined });
  }

  public cargar(): void {
    this.cargando.set(true);
    this.saasApi.obtenerTenant(this.id).subscribe({
      next: (detalle) => {
        this.tenant.set(detalle);
        this.suscripcion.set(detalle.suscripcion ?? null);
        this.uso.set(detalle.uso ?? null);
        this.nuevoEstado = detalle.estado;
        this.cargando.set(false);

        if (!detalle.uso) {
          this.saasApi.obtenerUsoTenant(this.id).subscribe({
            next: (uso) => this.uso.set(uso),
            error: () => undefined
          });
        }
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudo cargar la empresa.');
      }
    });
  }

  public iniciarEdicion(): void {
    const t = this.tenant();
    if (!t) return;
    this.edicion = {
      razon_social: t.razon_social,
      nit: t.nit,
      direccion_fiscal: t.direccion_fiscal,
      correo_contacto: t.correo_contacto,
      telefono: t.telefono ?? '',
      moneda: t.moneda,
      zona_horaria: t.zona_horaria
    };
    this.editando.set(true);
  }

  public cancelarEdicion(): void {
    this.editando.set(false);
    this.edicion = {};
  }

  public guardarDatos(): void {
    this.guardando.set(true);
    this.saasApi.actualizarTenant(this.id, this.edicion).subscribe({
      next: (tenant) => {
        this.guardando.set(false);
        this.editando.set(false);
        this.tenant.update((actual) => actual ? { ...actual, ...tenant } : actual);
        this.toast.success('Datos de la empresa actualizados.');
      },
      error: () => {
        this.guardando.set(false);
        this.toast.error('No se pudieron guardar los cambios.');
      }
    });
  }

  public cambiarEstado(): void {
    this.cambiandoEstado.set(true);
    this.saasApi.cambiarEstadoTenant(this.id, this.nuevoEstado, this.motivoEstado || undefined).subscribe({
      next: (tenant) => {
        this.cambiandoEstado.set(false);
        this.tenant.update((actual) => actual ? { ...actual, ...tenant } : actual);
        this.motivoEstado = '';
        this.toast.success(`Estado actualizado a ${tenant.estado}.`);
      },
      error: () => {
        this.cambiandoEstado.set(false);
        this.toast.error('No se pudo cambiar el estado.');
      }
    });
  }

  public reenviar(): void {
    this.reenviando.set(true);
    this.saasApi.reenviarCredenciales(this.id).subscribe({
      next: (credenciales) => {
        this.reenviando.set(false);
        this.credenciales.set(credenciales);
        this.toast.info('Credenciales temporales regeneradas.');
      },
      error: () => {
        this.reenviando.set(false);
        this.toast.error('No se pudieron regenerar las credenciales.');
      }
    });
  }

  public cambiarPlan(): void {
    const suscripcion = this.suscripcion();
    if (!suscripcion || !this.planSeleccionado) return;

    this.saasApi.cambiarPlan(suscripcion.id, this.planSeleccionado).subscribe({
      next: (actualizada) => {
        this.suscripcion.set(actualizada);
        this.planSeleccionado = null;
        this.toast.success('Plan actualizado.');
      },
      error: (err) => this.toast.error(this.mensajeError(err, 'No se pudo cambiar el plan.')),
    });
  }

  public renovar(): void {
    const suscripcion = this.suscripcion();
    if (!suscripcion) return;
    this.saasApi.renovarSuscripcion(suscripcion.id).subscribe({
      next: (actualizada) => {
        this.suscripcion.set(actualizada);
        this.toast.success('Suscripción renovada.');
      },
      error: () => this.toast.error('No se pudo renovar la suscripción.')
    });
  }

  public suspender(): void {
    const suscripcion = this.suscripcion();
    if (!suscripcion) return;
    this.saasApi.suspenderSuscripcion(suscripcion.id, 'Suspensión manual desde plataforma').subscribe({
      next: () => {
        this.toast.warning('Suscripción suspendida.');
        this.cargar();
      },
      error: () => this.toast.error('No se pudo suspender la suscripción.')
    });
  }

  public reactivar(): void {
    const suscripcion = this.suscripcion();
    if (!suscripcion) return;
    this.saasApi.reactivarSuscripcion(suscripcion.id).subscribe({
      next: () => {
        this.toast.success('Suscripción reactivada.');
        this.cargar();
      },
      error: () => this.toast.error('No se pudo reactivar la suscripción.')
    });
  }

  public cancelar(): void {
    const suscripcion = this.suscripcion();
    if (!suscripcion) return;
    this.saasApi.cancelarSuscripcion(suscripcion.id, 'Cancelación desde plataforma').subscribe({
      next: () => {
        this.toast.warning('Suscripción cancelada.');
        this.cargar();
      },
      error: () => this.toast.error('No se pudo cancelar la suscripción.')
    });
  }

  public enLimite(uso: number, limite: number | null | undefined): boolean {
    if (limite === null || limite === undefined || limite <= 0) return false;
    return uso >= limite;
  }

  public porcentaje(uso: number, limite: number | null | undefined): number {
    if (limite === null || limite === undefined || limite <= 0) return 0;
    return Math.min(100, Math.round((uso / limite) * 100));
  }

  private mensajeError(err: any, porDefecto: string): string {
    const detalle = err?.error?.detail ?? err?.error?.message;
    if (typeof detalle === 'string') return detalle;
    return porDefecto;
  }
}
