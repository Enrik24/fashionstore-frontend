import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OfflineSessionService } from '../../../../core/offline/offline-session.service';
import { ConnectivityService } from '../../../../core/offline/connectivity.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EstadoSesionOffline, SesionOffline } from '../../../../core/models/offline.model';
import { PinPadComponent } from '../../../../shared/components/pin-pad/pin-pad.component';

/**
 * [EXAMEN-2] CU17: acceso offline con PIN.
 * Valida el PIN en el dispositivo (hash local + token cifrado) sin requerir red,
 * muestra los intentos restantes y bloquea al quinto fallo.
 */
@Component({
  selector: 'app-offline-access',
  standalone: true,
  imports: [CommonModule, RouterLink, PinPadComponent],
  template: `
    <div class="acceso-page">
      <div class="acceso-card card">
        <header class="marca">
          <span class="logo"><i class="ri-wifi-off-line"></i></span>
          <div>
            <h1>Acceso sin conexión</h1>
            <p>FashionStore · modo offline</p>
          </div>
        </header>

        @if (exito(); as sesion) {
          <div class="exito" role="status">
            <i class="ri-checkbox-circle-fill"></i>
            <h2>Sesión offline activa</h2>
            <p>
              Acceso autorizado hasta
              <strong>{{ sesion.expira_en | date: 'dd/MM/yyyy HH:mm' }}</strong>.
              La operación offline estará disponible en las pantallas habilitadas.
            </p>
            <div class="roles">
              @for (rol of sesion.roles; track rol) {
                <span class="badge badge-info">{{ rol }}</span>
              }
            </div>
            <div class="exito-acciones">
              <a routerLink="/home" class="btn btn-outline btn-sm">
                <i class="ri-store-2-line"></i> Ir a la tienda
              </a>
              <button type="button" class="btn btn-accent btn-sm" (click)="cerrarSesion()">
                <i class="ri-logout-box-r-line"></i> Cerrar sesión offline
              </button>
            </div>
          </div>
        } @else if (!pinConfigurado()) {
          <div class="sin-pin">
            <i class="ri-shield-keyhole-line"></i>
            <h2>PIN no configurado</h2>
            <p>
              Para operar sin internet primero debes configurar tu PIN desde una sesión con conexión.
            </p>
            <div class="sin-pin-acciones">
              <a routerLink="/auth/login" class="btn btn-accent btn-sm">
                <i class="ri-login-box-line"></i> Iniciar sesión online
              </a>
              <a routerLink="/profile/offline" class="btn btn-outline btn-sm">
                <i class="ri-shield-keyhole-line"></i> Configurar PIN
              </a>
            </div>
          </div>
        } @else {
          <div class="estado-conexion" [class.offline]="!enLinea()">
            <i [class]="enLinea() ? 'ri-wifi-line' : 'ri-wifi-off-line'"></i>
            <span>
              {{ enLinea() ? 'Hay conexión: también puedes iniciar sesión online.' : 'Sin conexión: validando PIN local.' }}
            </span>
          </div>

          <app-pin-pad
            titulo="Ingresa tu PIN"
            subtitulo="PIN de 6 dígitos configurado en tu perfil."
            [longitud]="6"
            [intentosRestantes]="intentosRestantes()"
            [bloqueado]="bloqueado()"
            [cargando]="validando()"
            [error]="error() ?? undefined"
            (pinCompleto)="validarPin($event)">
          </app-pin-pad>

          @if (ultimaConexion()) {
            <p class="ultima">
              <i class="ri-history-line"></i>
              Última conexión: {{ ultimaConexion() | date: 'dd/MM/yyyy HH:mm' }}
            </p>
          }

          @if (bloqueado()) {
            <div class="bloqueo-ayuda">
              <i class="ri-time-line"></i>
              <p>
                El PIN se bloqueó tras 5 intentos fallidos durante 15 minutos.
                Inicia sesión con conexión para restablecerlo.
              </p>
            </div>
          }

          <div class="alternativa">
            <span>¿Tienes conexión?</span>
            <a routerLink="/auth/login" class="link">
              <i class="ri-login-box-line"></i> Iniciar sesión online
            </a>
          </div>
        }
      </div>

      <p class="pie">
        <i class="ri-lock-2-line"></i>
        El PIN nunca se guarda en texto plano: se almacena su hash con sal y el token offline va cifrado.
      </p>
    </div>
  `,
  styles: [`
    .acceso-page {
      min-height: 100vh;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 1rem; padding: 2rem 1rem;
      background: radial-gradient(circle at 20% 20%, rgba(225, 29, 72, 0.08), transparent 45%),
                  radial-gradient(circle at 80% 80%, rgba(15, 23, 42, 0.08), transparent 45%),
                  var(--bg-main);
    }

    .acceso-card { width: 100%; max-width: 420px; padding: 1.75rem 1.6rem; display: flex; flex-direction: column; gap: 1.1rem; }

    .marca { display: flex; align-items: center; gap: 0.75rem; }
    .logo {
      width: 46px; height: 46px; border-radius: var(--radius-md);
      background: var(--primary); color: var(--accent);
      display: flex; align-items: center; justify-content: center; font-size: 1.25rem;
    }
    .marca h1 { margin: 0; font-size: 1.1rem; font-weight: 800; color: var(--primary); }
    .marca p { margin: 0; font-size: 0.72rem; color: var(--text-muted); }

    .estado-conexion {
      display: flex; align-items: center; gap: 0.45rem;
      background: var(--success-bg); color: var(--success);
      border-radius: var(--radius-md); padding: 0.55rem 0.8rem; font-size: 0.74rem; font-weight: 600;
      &.offline { background: var(--critical-bg); color: var(--critical); }
    }

    .ultima { display: flex; align-items: center; justify-content: center; gap: 0.3rem; margin: 0; font-size: 0.7rem; color: var(--text-muted); }

    .bloqueo-ayuda {
      display: flex; gap: 0.5rem; align-items: flex-start;
      background: var(--critical-bg); color: var(--critical);
      border-radius: var(--radius-md); padding: 0.7rem 0.85rem;
      i { font-size: 1.15rem; flex-shrink: 0; }
      p { margin: 0; font-size: 0.74rem; line-height: 1.45; }
    }

    .alternativa { display: flex; align-items: center; justify-content: center; gap: 0.35rem; border-top: 1px solid var(--border-light); padding-top: 0.85rem; font-size: 0.74rem; color: var(--text-muted); }
    .link { display: inline-flex; align-items: center; gap: 0.25rem; color: var(--accent); font-weight: 700; text-decoration: none; }

    .sin-pin {
      display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.4rem;
      padding: 1rem 0.5rem;
      i { font-size: 2.4rem; color: var(--text-muted); }
      h2 { margin: 0; font-size: 1rem; color: var(--primary); }
      p { margin: 0; font-size: 0.78rem; color: var(--text-muted); line-height: 1.5; }
    }
    .sin-pin-acciones { display: flex; flex-direction: column; gap: 0.45rem; width: 100%; margin-top: 0.6rem; }
    .sin-pin-acciones .btn { justify-content: center; }

    .exito {
      display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.4rem;
      > i { font-size: 2.8rem; color: var(--success); }
      h2 { margin: 0; font-size: 1.05rem; color: var(--primary); }
      p { margin: 0; font-size: 0.78rem; color: var(--text-muted); line-height: 1.5; }
    }
    .roles { display: flex; gap: 0.3rem; flex-wrap: wrap; justify-content: center; margin-top: 0.2rem; }
    .exito-acciones { display: flex; flex-direction: column; gap: 0.45rem; width: 100%; margin-top: 0.7rem; }
    .exito-acciones .btn { justify-content: center; }

    .pie { display: flex; align-items: center; gap: 0.35rem; max-width: 420px; margin: 0; font-size: 0.66rem; color: var(--text-muted); text-align: center; }
  `]
})
export class OfflineAccessComponent implements OnInit {
  private offlineSession = inject(OfflineSessionService);
  private connectivity = inject(ConnectivityService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  @ViewChild(PinPadComponent) public pinPad?: PinPadComponent;

  /** Destino tras desbloquear (ej. /offline/sincronizacion), viene del guard. */
  private returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '';

  public estado = signal<EstadoSesionOffline | null>(null);
  public exito = signal<SesionOffline | null>(null);
  public validando = signal(false);
  public error = signal<string | null>(null);
  public bloqueado = signal(false);

  public enLinea = this.connectivity.enLinea;
  public pinConfigurado = this.offlineSession.pinConfigurado;
  public intentosRestantes = this.offlineSession.intentosRestantes;

  public ultimaConexion(): string | null {
    return this.estado()?.ultima_conexion ?? null;
  }

  ngOnInit(): void {
    this.cargarEstado();
  }

  public validarPin(pin: string): void {
    if (this.validando() || this.bloqueado()) return;

    this.error.set(null);
    this.validando.set(true);
    this.offlineSession.iniciarSesionOffline(pin).subscribe({
      next: (sesion) => {
        this.validando.set(false);
        if (sesion) {
          // Con red: el backend devolvió un SesionOffline completo.
          this.exito.set(sesion);
          this.toast.success('Sesión offline iniciada.');
          this.irAResultado();
          return;
        }
        // Sin red: el servicio devuelve null pero deja sesionActiva=true
        // cuando el PIN local es correcto (token cifrado guardado).
        // El contrato documentado es: null + haySesionOffline() = éxito local.
        if (this.offlineSession.haySesionOffline()) {
          this.toast.success('Sesión offline iniciada.');
          this.irAResultado();
          return;
        }
        if (this.offlineSession.sesionActiva()) {
          // PIN correcto pero token vencido -> solo consulta (CU17 RN-008).
          this.fallar('Tu sesión offline venció: solo puedes consultar. Vuelve a conectarte para renovarla.');
          return;
        }
        this.fallar('No se pudo iniciar la sesión offline. Vuelve a intentarlo.');
      },
      error: (err) => {
        this.validando.set(false);
        this.fallar(this.mensajeError(err));
      }
    });
  }

  private irAResultado(): void {
    if (this.returnUrl) {
      void this.router.navigateByUrl(this.returnUrl);
    }
  }

  public cerrarSesion(): void {
    this.offlineSession.cerrarSesionOffline().subscribe({
      next: () => {
        this.exito.set(null);
        this.error.set(null);
        this.toast.info('Sesión offline cerrada y datos locales liberados.');
        this.cargarEstado();
      },
      error: () => {
        this.exito.set(null);
        this.toast.warning('Sesión local cerrada. Los datos se borrarán en el próximo acceso online.');
        this.cargarEstado();
      }
    });
  }

  private cargarEstado(): void {
    this.offlineSession.estadoSesion().subscribe({
      next: (estado) => {
        this.estado.set(estado);
        this.pinConfigurado.set(estado.pin_configurado);
        this.intentosRestantes.set(estado.intentos_restantes);
        this.bloqueado.set(!estado.dispositivo_activo || estado.intentos_restantes <= 0);
      },
      error: () => undefined
    });
  }

  private fallar(mensaje: string): void {
    this.error.set(mensaje);
    this.pinPad?.reiniciar();
    if (this.intentosRestantes() <= 0) {
      this.bloqueado.set(true);
    }
  }

  private mensajeError(err: any): string {
    const detalle = err?.error?.detail ?? err?.error?.message;
    if (typeof detalle === 'string') return detalle;
    if (err?.status === 423) return 'PIN bloqueado temporalmente por demasiados intentos.';
    if (err?.status === 401) return 'PIN incorrecto.';
    return 'No se pudo validar el PIN.';
  }
}
