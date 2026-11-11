import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SaasApiService } from '../../../../core/services/saas-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TenantContextService } from '../../../../core/services/tenant-context.service';

/**
 * [EXAMEN-2] CU03 / RN-011: páginas de retorno de Stripe Checkout para la
 * suscripción. Las URLs `STRIPE_SUSCRIPCION_SUCCESS_URL` y
 * `STRIPE_SUSCRIPCION_CANCEL_URL` del backend apuntan aquí:
 *   - `/suscripcion-exitosa?session_id=..&suscripcion_id=..&tenant_id=..`
 *   - `/suscripcion-cancelada?suscripcion_id=..`
 *
 * En la ruta exitosa se intenta confirmar el pago contra el backend
 * (`POST /saas/suscripciones/stripe/confirmar-retorno`); si aún no está
 * disponible (p. ej. sin sesión o el webhook aún no llegó) se avisa que la
 * confirmación llega por webhook y se ofrece volver al panel.
 */
@Component({
  selector: 'app-suscripcion-retorno',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="retorno">
      <div class="tarjeta card" [class.error]="cancelado()">
        <i class="icono" [ngClass]="icono()"></i>

        @if (cancelado()) {
          <h1>Pago cancelado</h1>
          <p class="detalle">
            Cancelaste el pago en Stripe. La suscripción
            @if (suscripcionId) { <strong>#{{ suscripcionId }}</strong> } sigue
            en su estado anterior y puedes intentar pagarla de nuevo.
          </p>
          <a routerLink="/plataforma/suscripciones" class="btn btn-accent">Volver a suscripciones</a>
        } @else if (confirmando()) {
          <h1>Verificando tu pago…</h1>
          <p class="detalle"><i class="ri-loader-4-line spin"></i> Confirmando el pago de la suscripción con Stripe.</p>
        } @else if (confirmado()) {
          <h1>¡Pago confirmado!</h1>
          <p class="detalle">
            Tu pago se registró correctamente y la suscripción
            @if (suscripcionId) { <strong>#{{ suscripcionId }}</strong> } quedó <strong>ACTIVA</strong>.
          </p>
          <a routerLink="/plataforma/suscripciones" class="btn btn-accent">Ir al panel de suscripciones</a>
        } @else {
          <h1>Pago en proceso de confirmación</h1>
          <p class="detalle">
            {{ mensajeError() || ('No pudimos verificar el pago al volver de Stripe' + (suscripcionId ? ' (suscripción #' + suscripcionId + ')' : '') + '. El webhook de Stripe lo confirmará automáticamente en unos segundos; puedes volver al panel y actualizar.') }}
          </p>
          <div class="acciones">
            <a routerLink="/plataforma/suscripciones" class="btn btn-accent">Ir al panel de suscripciones</a>
            @if (puedeReintentar()) {
              <button type="button" class="btn btn-outline" (click)="confirmar()">Reintentar verificación</button>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .retorno {
      min-height: 70vh; display: flex; align-items: center; justify-content: center;
      padding: 2rem 1rem;
    }
    .tarjeta {
      max-width: 560px; width: 100%; text-align: center;
      padding: 3rem 2rem; display: flex; flex-direction: column; align-items: center; gap: 0.9rem;
    }
    .icono { font-size: 3.5rem; color: var(--success); }
    .tarjeta.error .icono { color: var(--critical); }
    h1 { margin: 0; font-size: 1.35rem; font-weight: 800; color: var(--primary); }
    .detalle { margin: 0; font-size: 0.88rem; color: var(--text-muted); line-height: 1.6; }
    .acciones { display: flex; gap: 0.6rem; flex-wrap: wrap; justify-content: center; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class SuscripcionRetornoComponent implements OnInit {
  private saasApi = inject(SaasApiService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private tenantContext = inject(TenantContextService);

  public cancelado = signal(false);
  public confirmado = signal(false);
  public confirmando = signal(false);
  public mensajeError = signal<string | null>(null);

  public suscripcionId: number | null = null;
  private sessionId: string | null = null;

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const data = this.route.snapshot.data;
    this.cancelado.set(data['cancelado'] === true);

    this.suscripcionId = Number(params.get('suscripcion_id')) || null;
    this.sessionId = params.get('session_id');

    // El Super Administrador necesita X-Tenant-ID para llamar al backend; la
    // success URL lo incluye (ver stripe_service.create_checkout_session_suscripcion).
    const tenantId = Number(params.get('tenant_id')) || null;
    if (tenantId) this.tenantContext.fijarTenantConsultado(tenantId);

    if (!this.cancelado() && this.sessionId) {
      this.confirmar();
    }
  }

  public icono(): string {
    if (this.cancelado()) return 'ri-close-circle-line';
    if (this.confirmado()) return 'ri-checkbox-circle-fill';
    return 'ri-information-line';
  }

  public puedeReintentar(): boolean {
    return !!this.sessionId && !this.confirmado();
  }

  public confirmar(): void {
    if (!this.sessionId) return;
    this.confirmando.set(true);
    this.mensajeError.set(null);
    this.saasApi.confirmarRetornoSuscripcion(this.sessionId, this.suscripcionId).subscribe({
      next: () => {
        this.confirmando.set(false);
        this.confirmado.set(true);
        this.toast.success('Pago de la suscripción confirmado.');
      },
      error: (err) => {
        this.confirmando.set(false);
        const detalle = err?.error?.detail ?? err?.error?.message;
        this.mensajeError.set(typeof detalle === 'string' ? detalle : null);
        this.toast.info('La confirmación llegará por webhook de Stripe. Vuelve al panel en unos momentos.');
      }
    });
  }
}
