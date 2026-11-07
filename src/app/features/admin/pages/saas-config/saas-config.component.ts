import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SaasApiService } from '../../../../core/services/saas-api.service';
import { PlanFeatureService } from '../../../../core/services/plan-feature.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { UserApiService } from '../../../../core/services/user-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  AsistenteConfiguracion,
  ConfiguracionTenantResponse,
  DatosEmpresaUpdateDto,
  SucursalConfigCreateDto,
  UsuarioConfigCreateDto
} from '../../../../core/models/saas.model';
import { PreferenciasOfflineUpdateDto } from '../../../../core/models/offline.model';
import { Sucursal } from '../../../../core/models/branch.model';
import { SectionTitleComponent } from '../../../../shared/components/section-title/section-title.component';
import { StepperWizardComponent, PasoWizard } from '../../../../shared/components/stepper-wizard/stepper-wizard.component';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';
import { ConfigWizardStepEmpresaComponent } from './config-wizard-step-empresa.component';
import { ConfigWizardStepSucursalesComponent } from './config-wizard-step-sucursales.component';
import { ConfigWizardStepUsuariosComponent } from './config-wizard-step-usuarios.component';
import { ConfigWizardStepOfflineComponent } from './config-wizard-step-offline.component';

/**
 * [EXAMEN-2] CU04: asistente de configuración inicial del tenant.
 * Guarda paso a paso contra `/saas/configuracion/*` y al finalizar deja el
 * tenant en estado OPERATIVO.
 */
@Component({
  selector: 'app-saas-config',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    SectionTitleComponent,
    StepperWizardComponent,
    StatusBadgePipe,
    ConfigWizardStepEmpresaComponent,
    ConfigWizardStepSucursalesComponent,
    ConfigWizardStepUsuariosComponent,
    ConfigWizardStepOfflineComponent
  ],
  template: `
    <div class="page">
      <app-section-title
        titulo="Configuración de la empresa"
        subtitulo="Completa los cuatro pasos para dejar el tenant operativo."
        icono="ri-settings-4-line"
        [badge]="estadoEtiqueta()">
        <a acciones routerLink="/admin/dashboard" class="btn btn-outline btn-sm">
          <i class="ri-arrow-left-line"></i> Dashboard
        </a>
      </app-section-title>

      @if (cargando()) {
        <div class="loading-box card"><i class="ri-loader-4-line spin"></i> Cargando configuración…</div>
      } @else if (!configuracion()) {
        <div class="empty-box card">
          <i class="ri-settings-3-line"></i>
          <h3>No se pudo cargar la configuración</h3>
          <p>Vuelve a intentarlo desde el panel de administración.</p>
        </div>
      } @else {
        @if (finalizado()) {
          <div class="exito card">
            <i class="ri-checkbox-circle-fill"></i>
            <div>
              <h2>Configuración completada</h2>
              <p>
                La empresa quedó <strong>OPERATIVA</strong>. Ya puedes usar el catálogo, las sucursales
                y configurar el PIN offline desde tu perfil.
              </p>
            </div>
            <div class="exito-acciones">
              <a routerLink="/profile/offline" class="btn btn-outline btn-sm">
                <i class="ri-shield-keyhole-line"></i> Configurar PIN
              </a>
              <a routerLink="/admin/dashboard" class="btn btn-accent btn-sm">
                <i class="ri-dashboard-line"></i> Ir al dashboard
              </a>
            </div>
          </div>
        }

        <div class="asistente-grid">
          <div class="wizard-col">
            <app-stepper-wizard
              [pasos]="pasos"
              [pasoActual]="pasoActual()"
              [mostrarAcciones]="false"
              (pasoActualChange)="irAPaso($event)">
              @switch (pasoActual()) {
                @case (0) {
                  <app-config-wizard-step-empresa
                    [tenant]="configuracion()!.tenant"
                    [guardando]="guardando()"
                    (guardar)="guardarEmpresa($event)">
                  </app-config-wizard-step-empresa>
                }
                @case (1) {
                  <app-config-wizard-step-sucursales
                    [usadas]="sucursales().length"
                    [limite]="limiteSucursales()"
                    [guardando]="guardando()"
                    (guardar)="guardarSucursal($event)">
                  </app-config-wizard-step-sucursales>
                }
                @case (2) {
                  <app-config-wizard-step-usuarios
                    [usadas]="usuarios()"
                    [limite]="limiteUsuarios()"
                    [sucursales]="sucursales()"
                    [guardando]="guardando()"
                    (guardar)="guardarUsuario($event)">
                  </app-config-wizard-step-usuarios>
                }
                @default {
                  <app-config-wizard-step-offline
                    [config]="configuracion()!.configuracion_offline"
                    [permiteCarritoOffline]="puedeCarritoOffline()"
                    [guardando]="guardando()"
                    (guardar)="guardarOffline($event)">
                  </app-config-wizard-step-offline>
                }
              }
            </app-stepper-wizard>

            <div class="navegacion">
              <button type="button" class="btn btn-outline" [disabled]="pasoActual() === 0 || guardando()"
                      (click)="irAPaso(pasoActual() - 1)">
                <i class="ri-arrow-left-line"></i> Anterior
              </button>
              @if (pasoActual() < pasos.length - 1) {
                <button type="button" class="btn btn-outline" [disabled]="guardando()" (click)="omitir()">
                  Omitir por ahora <i class="ri-skip-right-line"></i>
                </button>
              } @else if (asistente()?.puede_finalizar) {
                <button type="button" class="btn btn-accent" [disabled]="guardando()" (click)="finalizar()">
                  <i class="ri-check-double-line"></i> {{ guardando() ? 'Finalizando…' : 'Finalizar configuración' }}
                </button>
              }
            </div>
          </div>

          <aside class="resumen card">
            <h2><i class="ri-list-check-2"></i> Progreso</h2>

            <div class="progreso">
              <div class="progreso-numero">{{ asistente()?.porcentaje ?? 0 }}%</div>
              <div class="progress-track">
                <div class="progress-fill" [style.width.%]="asistente()?.porcentaje ?? 0"></div>
              </div>
            </div>

            <ul class="pasos-estado">
              @for (paso of pasos; track paso.clave; let i = $index) {
                <li [class.completado]="pasoCompletado(paso.clave)" [class.actual]="i === pasoActual()">
                  <i [class]="pasoCompletado(paso.clave) ? 'ri-checkbox-circle-fill' : 'ri-circle-line'"></i>
                  <span>{{ paso.titulo }}</span>
                </li>
              }
            </ul>

            @if (pasosFaltantes().length) {
              <div class="faltantes">
                <strong>Pendiente:</strong>
                <span>{{ pasosFaltantes().join(', ') }}</span>
              </div>
            }

            <div class="datos-tenant">
              <span><i class="ri-building-4-line"></i> {{ configuracion()!.tenant.razon_social }}</span>
              <span><i class="ri-store-3-line"></i> {{ sucursales().length }} sucursales</span>
              <span><i class="ri-team-line"></i> {{ usuarios() }} usuarios</span>
            </div>

            @if (error()) {
              <div class="error-box" role="alert"><i class="ri-error-warning-line"></i> {{ error() }}</div>
            }
          </aside>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1rem; }

    .asistente-grid { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 1rem; align-items: start; }
    .wizard-col { display: flex; flex-direction: column; gap: 0.75rem; }

    .navegacion { display: flex; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }

    .resumen { padding: 1.15rem 1.2rem; display: flex; flex-direction: column; gap: 0.85rem; position: sticky; top: 1rem; }
    .resumen h2 { display: flex; align-items: center; gap: 0.4rem; margin: 0; font-size: 0.95rem; font-weight: 800; color: var(--primary); }
    .resumen h2 i { color: var(--accent); }

    .progreso { display: flex; flex-direction: column; gap: 0.4rem; }
    .progreso-numero { font-size: 1.6rem; font-weight: 800; color: var(--primary); }
    .progress-track { height: 7px; background: var(--border-light); border-radius: var(--radius-full); overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-light)); transition: width 0.3s ease; }

    .pasos-estado { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .pasos-estado li { display: flex; align-items: center; gap: 0.45rem; font-size: 0.78rem; color: var(--text-muted); }
    .pasos-estado li i { font-size: 1rem; }
    .pasos-estado li.completado { color: var(--success); }
    .pasos-estado li.completado i { color: var(--success); }
    .pasos-estado li.actual { color: var(--primary); font-weight: 700; }
    .pasos-estado li.actual i { color: var(--accent); }

    .faltantes { background: var(--warning-bg, #fef8e7); border-radius: var(--radius-md); padding: 0.6rem 0.75rem; font-size: 0.72rem; color: var(--primary); display: flex; flex-direction: column; gap: 0.15rem; }
    .faltantes strong { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--gold); }

    .datos-tenant { border-top: 1px solid var(--border-light); padding-top: 0.75rem; display: flex; flex-direction: column; gap: 0.35rem; }
    .datos-tenant span { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; color: var(--text-muted); }

    .error-box { display: flex; align-items: flex-start; gap: 0.4rem; background: var(--error-bg); color: var(--error); border-radius: var(--radius-md); padding: 0.65rem 0.75rem; font-size: 0.74rem; }

    .exito {
      display: flex; align-items: center; gap: 0.9rem; padding: 1.1rem 1.3rem;
      border-left: 4px solid var(--success);
      > i { font-size: 2rem; color: var(--success); }
      h2 { margin: 0 0 0.15rem; font-size: 1rem; color: var(--primary); }
      p { margin: 0; font-size: 0.78rem; color: var(--text-muted); }
      > div { flex: 1; }
    }
    .exito-acciones { display: flex; gap: 0.4rem; flex-wrap: wrap; }

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

    @media (max-width: 900px) { .asistente-grid { grid-template-columns: 1fr; } .resumen { position: static; order: -1; } }
  `]
})
export class SaasConfigComponent implements OnInit {
  private saasApi = inject(SaasApiService);
  private planFeature = inject(PlanFeatureService);
  private tenantContext = inject(TenantContextService);
  private branchApi = inject(BranchApiService);
  private userApi = inject(UserApiService);
  private toast = inject(ToastService);

  public readonly pasos: PasoWizard[] = [
    { clave: 'empresa', titulo: 'Empresa', descripcion: 'Datos fiscales', icono: 'ri-building-4-line' },
    { clave: 'sucursales', titulo: 'Sucursales', descripcion: 'Puntos de venta', icono: 'ri-store-3-line' },
    { clave: 'usuarios', titulo: 'Usuarios', descripcion: 'Equipo inicial', icono: 'ri-team-line' },
    { clave: 'offline', titulo: 'Offline', descripcion: 'PIN y datos', icono: 'ri-wifi-off-line' }
  ];

  public configuracion = signal<ConfiguracionTenantResponse | null>(null);
  public asistente = signal<AsistenteConfiguracion | null>(null);
  public sucursales = signal<Sucursal[]>([]);
  public usuarios = signal(0);
  public pasoActual = signal(0);
  public cargando = signal(true);
  public guardando = signal(false);
  public finalizado = signal(false);
  public error = signal<string | null>(null);

  public puedeCarritoOffline = computed(() => this.planFeature.puedeCarritoOffline());
  public limiteSucursales = computed(() => this.planFeature.limiteSucursales());
  public limiteUsuarios = computed(() => this.planFeature.limiteUsuarios());
  public pasosFaltantes = computed(() => this.asistente()?.pasos_faltantes ?? []);

  ngOnInit(): void {
    this.tenantContext.cargarContexto().subscribe({ error: () => undefined });
    this.cargar();
  }

  public estadoEtiqueta(): string {
    const estado = this.configuracion()?.tenant.estado ?? this.asistente()?.estado_tenant ?? '';
    return estado === 'OPERATIVO' ? 'Operativo' : estado === 'CONFIGURACION_INICIAL' ? 'Configuración inicial' : estado;
  }

  public pasoCompletado(clave: string): boolean {
    return (this.asistente()?.pasos_completados ?? []).includes(clave);
  }

  public irAPaso(indice: number): void {
    if (indice < 0 || indice >= this.pasos.length) return;
    this.pasoActual.set(indice);
  }

  public omitir(): void {
    if (this.pasoActual() < this.pasos.length - 1) {
      this.pasoActual.update((paso) => paso + 1);
    }
  }

  public guardarEmpresa(datos: DatosEmpresaUpdateDto): void {
    this.error.set(null);
    this.guardando.set(true);
    this.saasApi.guardarDatosEmpresa(datos).subscribe({
      next: (tenant) => {
        this.guardando.set(false);
        this.configuracion.update((actual) => actual ? { ...actual, tenant } : actual);
        this.toast.success('Datos de la empresa guardados.');
        this.refrescarAsistente(() => this.avanzar());
      },
      error: (err) => this.fallo(err, 'No se pudieron guardar los datos de la empresa.')
    });
  }

  public guardarSucursal(datos: SucursalConfigCreateDto): void {
    this.error.set(null);
    if (!this.planFeature.puedeCrearSucursal(this.sucursales().length).permitido) {
      this.error.set(this.planFeature.puedeCrearSucursal(this.sucursales().length).mensaje ?? 'Límite de sucursales alcanzado.');
      return;
    }
    this.guardando.set(true);
    this.saasApi.crearSucursalConfiguracion(datos).subscribe({
      next: () => {
        this.guardando.set(false);
        this.toast.success('Sucursal registrada.');
        this.refrescarAsistente(() => this.avanzar());
        this.cargarConteos();
      },
      error: (err) => this.fallo(err, 'No se pudo registrar la sucursal.')
    });
  }

  public guardarUsuario(datos: UsuarioConfigCreateDto): void {
    this.error.set(null);
    if (!this.planFeature.puedeCrearUsuario(this.usuarios()).permitido) {
      this.error.set(this.planFeature.puedeCrearUsuario(this.usuarios()).mensaje ?? 'Límite de usuarios alcanzado.');
      return;
    }
    this.guardando.set(true);
    this.saasApi.crearUsuarioConfiguracion(datos).subscribe({
      next: () => {
        this.guardando.set(false);
        this.toast.success('Usuario creado con contraseña temporal.');
        this.refrescarAsistente(() => this.avanzar());
        this.cargarConteos();
      },
      error: (err) => this.fallo(err, 'No se pudo crear el usuario.')
    });
  }

  public guardarOffline(datos: PreferenciasOfflineUpdateDto): void {
    this.error.set(null);
    this.guardando.set(true);
    this.saasApi.guardarConfiguracionOffline(datos).subscribe({
      next: () => {
        this.toast.success('Configuración offline guardada.');
        this.refrescarAsistente(() => {
          this.guardando.set(false);
          if (this.asistente()?.puede_finalizar) {
            this.finalizar();
          }
        });
      },
      error: (err) => this.fallo(err, 'No se pudo guardar la configuración offline.')
    });
  }

  public finalizar(): void {
    this.error.set(null);
    this.guardando.set(true);
    this.saasApi.finalizarConfiguracion().subscribe({
      next: (tenant) => {
        this.guardando.set(false);
        this.finalizado.set(true);
        this.configuracion.update((actual) => actual ? { ...actual, tenant } : actual);
        this.tenantContext.actualizarTenant(tenant);
        this.toast.success('Configuración completada. La empresa está operativa.');
      },
      error: (err) => this.fallo(err, 'Faltan pasos obligatorios para finalizar la configuración.')
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.saasApi.obtenerConfiguracionTenant().subscribe({
      next: (configuracion) => {
        this.configuracion.set(configuracion);
        this.asistente.set(configuracion.asistente);
        this.cargando.set(false);
        this.pasoActual.set(this.primerPasoPendiente(configuracion.asistente));
        this.cargarConteos();
      },
      error: () => {
        this.cargando.set(false);
        this.error.set('No se pudo cargar la configuración de la empresa.');
      }
    });
  }

  private cargarConteos(): void {
    this.branchApi.getBranches(0, 200).subscribe({
      next: (sucursales) => this.sucursales.set(sucursales),
      error: () => undefined
    });
    this.userApi.getUsers(0, 500).subscribe({
      next: (usuarios) => this.usuarios.set(usuarios.length),
      error: () => undefined
    });
  }

  private refrescarAsistente(despues: () => void): void {
    this.saasApi.obtenerAsistenteConfiguracion().subscribe({
      next: (asistente) => {
        this.asistente.set(asistente);
        despues();
      },
      error: () => despues()
    });
  }

  private avanzar(): void {
    if (this.pasoActual() < this.pasos.length - 1) {
      this.pasoActual.update((paso) => paso + 1);
    }
  }

  private primerPasoPendiente(asistente: AsistenteConfiguracion): number {
    const orden = ['empresa', 'sucursales', 'usuarios', 'offline'];
    const indice = orden.findIndex((clave) => asistente.pasos_faltantes.includes(clave));
    return indice >= 0 ? indice : 3;
  }

  private fallo(err: any, porDefecto: string): void {
    this.guardando.set(false);
    const detalle = err?.error?.detail ?? err?.error?.message;
    const mensaje = typeof detalle === 'string' ? detalle : porDefecto;
    this.error.set(mensaje);
    this.toast.error(mensaje);
  }
}
