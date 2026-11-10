import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ConnectivityService } from '../../../core/offline/connectivity.service';
import { OfflineSessionService } from '../../../core/offline/offline-session.service';

/**
 * [EXAMEN-2] CU17 / RF-030: barra global de conectividad y sesión offline.
 * No se muestra en el panel de plataforma (lo controla `app.component`).
 */
@Component({
  selector: 'app-connectivity-banner',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (visible()) {
      <div
        class="connectivity-banner"
        [class.is-offline]="!connectivity.enLinea()"
        [class.is-pending]="connectivity.enLinea() && (porVencer() || offlineSession.soloConsulta())"
        role="status"
        aria-live="polite"
      >
        <i [class]="icono()"></i>
        <span class="banner-text">{{ mensaje() }}</span>

        @if (offlineSession.sesionActiva() && horasRestantes() !== null && connectivity.enLinea()) {
          <span class="banner-chip">
            <i class="ri-time-line"></i> {{ horasRestantes() }} h de sesión offline
          </span>
        }

        @if (ultimaSincronizacion()) {
          <span class="banner-chip banner-chip-muted">
            <i class="ri-refresh-line"></i> Última conexión: {{ ultimaSincronizacion() }}
          </span>
        }

        @if (!offlineSession.sesionActiva() && connectivity.enLinea()) {
          <a routerLink="/profile/offline" class="banner-action">Configurar modo offline</a>
        }
        @if (!offlineSession.sesionActiva() && !connectivity.enLinea()) {
          <a routerLink="/offline/acceso" class="banner-action">Entrar con PIN →</a>
        }
      </div>
    }
  `,
  styles: [`
    .banner-text { font-weight: 700; }
    .banner-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      background: rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-full);
      padding: 0.15rem 0.65rem;
      font-size: 0.72rem;
      font-weight: 600;
    }
    .banner-chip-muted { opacity: 0.8; }
    .banner-action { font-weight: 800; font-size: 0.75rem; color: #fff; text-decoration: underline; white-space: nowrap; }
  `]
})
export class ConnectivityBannerComponent implements OnInit, OnDestroy {
  public connectivity = inject(ConnectivityService);
  public offlineSession = inject(OfflineSessionService);

  private ahora = signal<number>(Date.now());
  private temporizador: ReturnType<typeof setInterval> | null = null;

  public horasRestantes = computed<number | null>(() => {
    const local = this.offlineSession.sesionLocal();
    if (!local?.expira_en) return null;
    const restante = Date.parse(local.expira_en) - this.ahora();
    return restante > 0 ? Math.ceil(restante / 3_600_000) : 0;
  });

  public porVencer = computed<boolean>(() => {
    const horas = this.horasRestantes();
    return horas !== null && horas <= 2;
  });

  public visible = computed<boolean>(() =>
    !this.connectivity.enLinea() ||
    this.offlineSession.sesionActiva() ||
    this.porVencer() ||
    this.offlineSession.soloConsulta()
  );

  public mensaje = computed<string>(() => {
    if (!this.connectivity.enLinea()) {
      return this.offlineSession.sesionActiva()
        ? 'Sin conexión — operando en modo offline con datos locales.'
        : 'Sin conexión — inicia sesión con tu PIN para operar offline.';
    }
    if (this.offlineSession.soloConsulta()) {
      return 'El plazo de la sesión offline terminó: solo consulta hasta que vuelvas a autenticarte.';
    }
    if (this.porVencer()) {
      return `Tu sesión offline vence en ${this.horasRestantes()} h. Renueva con conexión.`;
    }
    return 'En línea — datos sincronizados con el servidor.';
  });

  public icono = computed<string>(() => {
    if (!this.connectivity.enLinea()) return 'ri-wifi-off-line';
    if (this.offlineSession.soloConsulta()) return 'ri-lock-line';
    if (this.porVencer()) return 'ri-time-line';
    return 'ri-wifi-line';
  });

  public ultimaSincronizacion = computed<string | null>(() => {
    const valor = this.offlineSession.sesionLocal()?.ultima_conexion;
    if (!valor) return null;
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return null;
    return fecha.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
  });

  ngOnInit(): void {
    this.connectivity.iniciarMonitoreo();
    this.connectivity.verificar().subscribe();
    this.temporizador = setInterval(() => this.ahora.set(Date.now()), 60_000);
  }

  ngOnDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }
}
