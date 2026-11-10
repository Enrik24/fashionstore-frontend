import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OfflineSessionService } from '../../../../core/offline/offline-session.service';
import { DeviceService } from '../../../../core/offline/device.service';
import { ConnectivityService } from '../../../../core/offline/connectivity.service';
import { StorageService } from '../../../../core/services/storage.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EstadoSesionOffline, DispositivoSincronizacion } from '../../../../core/models/offline.model';
import { SectionTitleComponent } from '../../../../shared/components/section-title/section-title.component';

/**
 * [EXAMEN-2] CU17: seguridad offline del perfil.
 * Configura o cambia el PIN (6 dígitos, hash + sal), lista los dispositivos
 * autorizados con su última conexión y permite revocarlos.
 *
 * Nota de contrato: el backend exige la contraseña actual tanto para configurar
 * como para cambiar el PIN (`POST /offline/sesion/pin`).
 */
@Component({
  selector: 'app-offline-security',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SectionTitleComponent],
  template: `
    <div class="page">
      <app-section-title
        titulo="Seguridad offline"
        subtitulo="PIN de acceso sin conexión y dispositivos autorizados."
        icono="ri-shield-keyhole-line">
        <a acciones routerLink="/offline/descarga" class="btn btn-accent btn-sm">
          <i class="ri-download-cloud-2-line"></i> Datos offline (CU05)
        </a>
        <a acciones routerLink="/profile" class="btn btn-outline btn-sm">
          <i class="ri-arrow-left-line"></i> Mi perfil
        </a>
      </app-section-title>

      @if (estado(); as e) {
        <div class="estado-grid">
          <div class="estado-item card">
            <span class="estado-label"><i class="ri-key-2-line"></i> PIN</span>
            <strong [class.ok]="pinConfigurado()" [class.no]="!pinConfigurado()">
              {{ pinConfigurado() ? 'Configurado' : 'Sin configurar' }}
            </strong>
          </div>
          <div class="estado-item card">
            <span class="estado-label"><i class="ri-device-line"></i> Dispositivo</span>
            <strong [class.ok]="e.dispositivo_activo" [class.no]="!e.dispositivo_activo">
              {{ e.dispositivo_activo ? 'Autorizado' : 'Revocado' }}
            </strong>
          </div>
          <div class="estado-item card">
            <span class="estado-label"><i class="ri-shield-check-line"></i> Intentos restantes</span>
            <strong [class.no]="e.intentos_restantes <= 2">{{ e.intentos_restantes }}</strong>
          </div>
          <div class="estado-item card">
            <span class="estado-label"><i class="ri-time-line"></i> Vigencia de sesión</span>
            <strong>{{ e.max_horas_sesion_offline }} h</strong>
          </div>
        </div>
      }

      <div class="grid-principal">
        <section class="card bloque pin">
          <h2><i class="ri-key-2-line"></i> {{ pinConfigurado() ? 'Cambiar PIN' : 'Configurar PIN' }}</h2>
          <p class="bloque-desc">
            El PIN debe tener exactamente 6 dígitos. Se guarda como hash con sal y nunca en texto plano.
          </p>

          <form (ngSubmit)="guardarPin()" #formPin="ngForm" novalidate>
            @if (pinConfigurado()) {
              <div class="campo">
                <label for="pin-actual">PIN actual *</label>
                <input id="pin-actual" name="pinActual" type="password" inputmode="numeric" maxlength="6"
                       [(ngModel)]="pinActual" required placeholder="••••••" />
              </div>
            }

            <div class="campo">
              <label for="pin-nuevo">PIN nuevo *</label>
              <input id="pin-nuevo" name="pinNuevo" type="password" inputmode="numeric" maxlength="6"
                     [(ngModel)]="pinNuevo" required placeholder="6 dígitos" />
            </div>

            <div class="campo">
              <label for="pin-confirmar">Confirmar PIN *</label>
              <input id="pin-confirmar" name="pinConfirmar" type="password" inputmode="numeric" maxlength="6"
                     [(ngModel)]="pinConfirmar" required placeholder="6 dígitos" />
            </div>

            <div class="campo">
              <label for="contrasena">Contraseña actual *</label>
              <input id="contrasena" name="contrasena" type="password" [(ngModel)]="contrasena" required
                     placeholder="Tu contraseña de inicio de sesión" />
              <small>El backend exige la contraseña para autorizar el cambio del PIN.</small>
            </div>

            @if (error()) {
              <div class="error-box" role="alert"><i class="ri-error-warning-line"></i> {{ error() }}</div>
            }
            @if (mensaje()) {
              <div class="ok-box" role="status"><i class="ri-checkbox-circle-line"></i> {{ mensaje() }}</div>
            }

            <div class="acciones">
              @if (pinConfigurado()) {
                <button type="button" class="btn btn-outline danger" (click)="eliminarPin()" [disabled]="guardando()">
                  <i class="ri-delete-bin-line"></i> Eliminar PIN
                </button>
              }
              <button type="submit" class="btn btn-accent" [disabled]="guardando() || formPin.invalid">
                <i class="ri-save-3-line"></i>
                {{ guardando() ? 'Guardando…' : (pinConfigurado() ? 'Cambiar PIN' : 'Configurar PIN') }}
              </button>
            </div>
          </form>
        </section>

        <section class="card bloque dispositivos">
          <div class="bloque-cabecera">
            <div>
              <h2><i class="ri-device-line"></i> Dispositivos autorizados</h2>
              <p class="bloque-desc">Revocar un dispositivo borra sus datos locales del tenant (RN-019).</p>
            </div>
            <button type="button" class="btn btn-outline btn-sm" (click)="cargarDispositivos()" [disabled]="cargandoDispositivos()">
              <i class="ri-refresh-line"></i> Actualizar
            </button>
          </div>

          @if (!enLinea()) {
            <div class="nota">
              <i class="ri-wifi-off-line"></i>
              <span>Sin conexión: la lista de dispositivos puede estar desactualizada.</span>
            </div>
          }

          @if (cargandoDispositivos()) {
            <div class="loading-box"><i class="ri-loader-4-line spin"></i> Cargando dispositivos…</div>
          } @else if (dispositivos().length === 0) {
            <div class="empty-box">
              <i class="ri-device-line"></i>
              <p>No hay dispositivos registrados.</p>
            </div>
          } @else {
            <ul class="lista-dispositivos">
              @for (dispositivo of dispositivos(); track dispositivo.id) {
                <li [class.actual]="esActual(dispositivo.id)" [class.inactivo]="!dispositivo.activo">
                  <span class="dispositivo-icono">
                    <i [class]="iconoDispositivo(dispositivo.plataforma)"></i>
                  </span>
                  <div class="dispositivo-info">
                    <strong>
                      {{ dispositivo.nombre || dispositivo.plataforma }}
                      @if (esActual(dispositivo.id)) { <span class="badge badge-info badge-sm">Este equipo</span> }
                    </strong>
                    <span class="meta">
                      {{ dispositivo.plataforma }} ·
                      {{ dispositivo.ultima_conexion ? (dispositivo.ultima_conexion | date: 'dd/MM/yyyy HH:mm') : 'Sin conexión registrada' }}
                    </span>
                  </div>
                  <span class="badge" [ngClass]="dispositivo.activo ? 'badge-success' : 'badge-critical'">
                    {{ dispositivo.activo ? 'Autorizado' : 'Revocado' }}
                  </span>
                  @if (dispositivo.activo) {
                    <button type="button" class="btn btn-sm btn-outline danger" (click)="revocar(dispositivo)"
                            [disabled]="revocando() === dispositivo.id">
                      <i class="ri-forbid-2-line"></i>
                      {{ revocando() === dispositivo.id ? 'Revocando…' : 'Revocar' }}
                    </button>
                  }
                </li>
              }
            </ul>
          }
        </section>
      </div>

      <div class="nota-pie">
        <i class="ri-information-line"></i>
        <p>
          El PIN offline se valida en el dispositivo. Tras cinco intentos fallidos el backend
          bloquea el acceso durante 15 minutos. Al cerrar sesión o revocar el dispositivo se
          borran los datos locales del tenant.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1rem; max-width: 1150px; }

    .estado-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; }
    .estado-item { padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.15rem; }
    .estado-label { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); font-weight: 700; }
    .estado-item strong { font-size: 1rem; color: var(--primary); }
    .estado-item strong.ok { color: var(--success); }
    .estado-item strong.no { color: var(--critical); }

    .grid-principal { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); gap: 1rem; align-items: start; }

    .bloque { padding: 1.35rem 1.5rem; }
    .bloque h2 { display: flex; align-items: center; gap: 0.45rem; margin: 0 0 0.25rem; font-size: 1rem; font-weight: 800; color: var(--primary); }
    .bloque h2 i { color: var(--accent); }
    .bloque-desc { margin: 0 0 0.9rem; font-size: 0.74rem; color: var(--text-muted); line-height: 1.5; }
    .bloque-cabecera { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.6rem; flex-wrap: wrap; }

    form { display: flex; flex-direction: column; gap: 0.75rem; }
    .campo { display: flex; flex-direction: column; gap: 0.25rem; }
    .campo label { font-size: 0.74rem; font-weight: 700; color: var(--primary); }
    .campo input {
      border: 1px solid var(--border-color); border-radius: var(--radius-md);
      padding: 0.55rem 0.7rem; font-size: 0.84rem; font-family: inherit; color: var(--primary); background: white;
      letter-spacing: 0.1em;
      &:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    }
    .campo small { font-size: 0.66rem; color: var(--text-muted); }

    .acciones { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.25rem; flex-wrap: wrap; }
    .danger { color: var(--critical); border-color: rgba(220, 38, 38, 0.4); }

    .error-box, .ok-box { display: flex; align-items: center; gap: 0.45rem; border-radius: var(--radius-md); padding: 0.65rem 0.8rem; font-size: 0.76rem; }
    .error-box { background: var(--error-bg); color: var(--error); }
    .ok-box { background: var(--success-bg); color: var(--success); }

    .nota { display: flex; align-items: center; gap: 0.4rem; background: var(--critical-bg); color: var(--critical); border-radius: var(--radius-md); padding: 0.55rem 0.75rem; font-size: 0.72rem; margin-bottom: 0.6rem; }

    .loading-box, .empty-box { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; padding: 2rem 1rem; color: var(--text-muted); font-size: 0.8rem; }
    .loading-box { flex-direction: row; justify-content: center; }
    .empty-box i { font-size: 2rem; }
    .empty-box p { margin: 0; }

    .lista-dispositivos { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .lista-dispositivos li {
      display: flex; align-items: center; gap: 0.55rem;
      border: 1px solid var(--border-light); border-radius: var(--radius-md);
      padding: 0.7rem 0.8rem;
      &.actual { border-color: var(--accent); background: rgba(225, 29, 72, 0.04); }
      &.inactivo { opacity: 0.6; }
    }
    .dispositivo-icono { width: 34px; height: 34px; flex-shrink: 0; border-radius: var(--radius-sm); background: var(--bg-main); color: var(--primary); display: flex; align-items: center; justify-content: center; }
    .dispositivo-info { display: flex; flex-direction: column; gap: 0.1rem; flex: 1; min-width: 0; }
    .dispositivo-info strong { font-size: 0.8rem; color: var(--primary); display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap; }
    .dispositivo-info .meta { font-size: 0.66rem; color: var(--text-muted); }
    .badge-sm { font-size: 0.58rem; }

    .nota-pie { display: flex; gap: 0.45rem; align-items: flex-start; background: var(--info-bg); border-radius: var(--radius-md); padding: 0.75rem 0.9rem; }
    .nota-pie i { color: var(--info); font-size: 1rem; flex-shrink: 0; }
    .nota-pie p { margin: 0; font-size: 0.72rem; color: var(--primary); line-height: 1.5; }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 900px) { .grid-principal { grid-template-columns: 1fr; } }
  `]
})
export class OfflineSecurityComponent implements OnInit {
  private offlineSession = inject(OfflineSessionService);
  private device = inject(DeviceService);
  private connectivity = inject(ConnectivityService);
  private storage = inject(StorageService);
  private toast = inject(ToastService);

  public estado = signal<EstadoSesionOffline | null>(null);
  public dispositivos = signal<DispositivoSincronizacion[]>([]);
  public cargandoDispositivos = signal(false);
  public guardando = signal(false);
  public revocando = signal<string | null>(null);
  public error = signal<string | null>(null);
  public mensaje = signal<string | null>(null);

  public pinActual = '';
  public pinNuevo = '';
  public pinConfirmar = '';
  public contrasena = '';

  public enLinea = this.connectivity.enLinea;
  public pinConfigurado = this.offlineSession.pinConfigurado;

  public dispositivoActual(): string {
    return this.storage.getDispositivoId() ?? '';
  }

  ngOnInit(): void {
    this.cargarEstado();
    this.cargarDispositivos();
  }

  public guardarPin(): void {
    this.error.set(null);
    this.mensaje.set(null);

    if (!/^\d{6}$/.test(this.pinNuevo)) {
      this.error.set('El PIN debe tener exactamente 6 dígitos.');
      return;
    }
    if (this.pinNuevo !== this.pinConfirmar) {
      this.error.set('La confirmación no coincide con el PIN nuevo.');
      return;
    }
    if (!this.contrasena) {
      this.error.set('Ingresa tu contraseña actual para autorizar el cambio.');
      return;
    }
    if (this.pinConfigurado() && !this.pinActual) {
      this.error.set('Ingresa tu PIN actual.');
      return;
    }

    this.guardando.set(true);
    const peticion = this.pinConfigurado()
      ? this.offlineSession.cambiarPin(this.pinActual, this.pinNuevo, this.contrasena)
      : this.offlineSession.configurarPin(this.pinNuevo, this.contrasena);

    peticion.subscribe({
      next: (respuesta) => {
        this.guardando.set(false);
        this.pinConfigurado.set(respuesta.configurado);
        this.mensaje.set(respuesta.mensaje || 'PIN configurado correctamente.');
        this.toast.success('PIN offline actualizado.');
        this.limpiarFormulario();
        this.cargarEstado();
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(this.mensajeError(err));
      }
    });
  }

  public eliminarPin(): void {
    if (!confirm('¿Eliminar el PIN? No podrás acceder sin conexión hasta configurarlo de nuevo.')) return;
    this.guardando.set(true);
    this.offlineSession.eliminarPin().subscribe({
      next: () => {
        this.guardando.set(false);
        this.pinConfigurado.set(false);
        this.mensaje.set('PIN eliminado.');
        this.toast.warning('PIN offline eliminado.');
        this.cargarEstado();
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(this.mensajeError(err));
      }
    });
  }

  public cargarEstado(): void {
    this.offlineSession.estadoSesion().subscribe({
      next: (estado) => {
        this.estado.set(estado);
        // No sobreescribir el flag local (IndexedDB) con el del backend:
        // offline_pin_hash en BD no significa PIN guardado en este dispositivo.
        // pinConfigurado() sigue siendo local (OfflineSessionService).
      },
      error: () => undefined
    });
  }

  public cargarDispositivos(): void {
    this.cargandoDispositivos.set(true);
    this.device.listarDispositivos().subscribe({
      next: (dispositivos) => {
        this.dispositivos.set(dispositivos);
        this.cargandoDispositivos.set(false);
      },
      error: () => {
        this.cargandoDispositivos.set(false);
        this.toast.warning('No se pudieron cargar los dispositivos.');
      }
    });
  }

  public revocar(dispositivo: DispositivoSincronizacion): void {
    if (!confirm(`¿Revocar el dispositivo "${dispositivo.nombre || dispositivo.plataforma}"? Se borrarán sus datos locales.`)) return;

    this.revocando.set(dispositivo.id);
    this.device.revocarDispositivo(dispositivo.id, 'Revocado desde seguridad offline').subscribe({
      next: () => {
        this.revocando.set(null);
        this.toast.warning('Dispositivo revocado.');
        if (dispositivo.id === this.dispositivoActual()) {
          this.pinConfigurado.set(false);
          this.toast.info('Este equipo fue revocado: los datos locales se borraron.');
        }
        this.cargarDispositivos();
        this.cargarEstado();
      },
      error: (err) => {
        this.revocando.set(null);
        const detalle = err?.error?.detail ?? err?.error?.message;
        this.toast.error(typeof detalle === 'string' ? detalle : 'No se pudo revocar el dispositivo.');
      }
    });
  }

  public esActual(id: string): boolean {
    return id === this.dispositivoActual();
  }

  public iconoDispositivo(plataforma: string): string {
    switch (plataforma) {
      case 'POS': return 'ri-store-3-line';
      case 'ANDROID': return 'ri-android-line';
      case 'IOS': return 'ri-apple-line';
      default: return 'ri-computer-line';
    }
  }

  private limpiarFormulario(): void {
    this.pinActual = '';
    this.pinNuevo = '';
    this.pinConfirmar = '';
    this.contrasena = '';
  }

  private mensajeError(err: any): string {
    const detalle = err?.error?.detail ?? err?.error?.message;
    if (typeof detalle === 'string') return detalle;
    if (Array.isArray(detalle) && detalle.length) return String(detalle[0]?.msg ?? 'Revisa los datos.');
    if (err?.status === 400) return 'La contraseña actual o el PIN no son válidos.';
    return 'No se pudo guardar el PIN.';
  }
}
