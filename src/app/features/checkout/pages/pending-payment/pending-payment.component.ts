import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PendingPaymentService, PreparacionPago } from '../../../../core/offline/pending-payment.service';
import { ConnectivityService } from '../../../../core/offline/connectivity.service';
import { ToastService } from '../../../../core/services/toast.service';
import { environment } from '../../../../../environments/environment';
import { PagoLocal } from '../../../../core/models/offline.model';
import { PagoDiferido } from '../../../../core/models/pago-diferido.model';
import { PaymentStatusChipComponent } from '../../../../shared/components/payment-status-chip/payment-status-chip.component';
import { ExpiryCountdownComponent } from '../../../../shared/components/expiry-countdown/expiry-countdown.component';

/**
 * [EXAMEN-2] CU16: confirmación de pago diferido.
 * Con Stripe.js disponible se usa el `client_secret` y 3DS; sin el SDK se
 * ofrece la redirección/verificación del backend (desviación documentada).
 */
@Component({
  selector: 'app-pending-payment',
  standalone: true,
  imports: [CommonModule, RouterLink, PaymentStatusChipComponent, ExpiryCountdownComponent],
  template: `
    <div class="pago-page">
      <div class="container pago-container">
        <header class="page-head">
          <div>
            <span class="eyebrow"><i class="ri-bank-card-line"></i> CU16 · Pago diferido</span>
            <h1>Confirmar pago pendiente</h1>
            <p>Completa el cobro seguro para confirmar tu pedido guardado localmente.</p>
          </div>
          @if (uuidPago()) {
            <span class="uuid-chip"><i class="ri-fingerprint-line"></i> {{ uuidPago() | slice:0:12 }}…</span>
          }
        </header>

        @if (cargando()) {
          <div class="card estado"><i class="ri-loader-4-line spin-icon"></i> Preparando el pago…</div>
        } @else if (error()) {
          <div class="card estado error">
            <i class="ri-error-warning-line"></i>
            <div>
              <strong>No se pudo preparar el pago</strong>
              <p>{{ error() }}</p>
              <button type="button" class="btn btn-outline btn-sm" (click)="cargar()">Reintentar</button>
            </div>
          </div>
        } @else {
          <div class="pago-grid">
            <section class="card resumen-card">
              <h2><i class="ri-receipt-line"></i> Resumen del pago</h2>

              <div class="monto-box">
                <span>Monto a pagar</span>
                <strong>{{ moneda() }} {{ monto() | number:'1.2-2' }}</strong>
              </div>

              <div class="detalle-lista">
                <div><span>Orden</span><strong>{{ numeroOrden() }}</strong></div>
                <div><span>Estado</span><app-payment-status-chip [estado]="estado()" [simulado]="simulado()" /></div>
                <div><span>Intentos</span><strong>{{ intentos() }}</strong></div>
                @if (fechaExpiracion()) {
                  <div><span>Vigencia</span><app-expiry-countdown [fechaExpiracion]="fechaExpiracion()" (vencido)="marcarExpirado()" /></div>
                }
              </div>

              @if (ultimoError()) {
                <div class="aviso aviso-error">
                  <i class="ri-error-warning-line"></i>
                  <div><strong>Último error</strong><p>{{ ultimoError() }}</p></div>
                </div>
              }

              @if (estado() === 'CONFIRMADO') {
                <div class="aviso aviso-exito">
                  <i class="ri-checkbox-circle-line"></i>
                  <div>
                    <strong>Pago confirmado</strong>
                    <p>La orden fue confirmada y el comprobante quedó actualizado.</p>
                  </div>
                </div>
                <a routerLink="/profile/orders" class="btn btn-accent btn-block">Ver mis compras</a>
              } @else if (estado() === 'RECHAZADO' || estado() === 'ERROR_CRITICO') {
                <div class="aviso aviso-error">
                  <i class="ri-close-circle-line"></i>
                  <div>
                    <strong>Pago rechazado</strong>
                    <p>Puedes reintentar el cobro o cancelar la orden para liberar el stock.</p>
                  </div>
                </div>
                <button type="button" class="btn btn-accent btn-block" [disabled]="procesando()" (click)="reintentar()">
                  <i class="ri-refresh-line"></i> Reintentar pago
                </button>
                <button type="button" class="btn btn-outline btn-block" [disabled]="procesando()" (click)="cancelar()">
                  <i class="ri-close-line"></i> Cancelar y liberar stock
                </button>
              } @else if (expirado()) {
                <div class="aviso aviso-warning">
                  <i class="ri-time-line"></i>
                  <div>
                    <strong>El plazo venció</strong>
                    <p>El stock se libera al confirmar la expiración.</p>
                  </div>
                </div>
                <a [routerLink]="['/checkout/pago-expirado']" [queryParams]="{ uuidPago: uuidPago() }" class="btn btn-outline btn-block">
                  Ver resultado de expiración
                </a>
              } @else {
                @if (requiereAccion()) {
                  <div class="aviso aviso-warning">
                    <i class="ri-shield-keyhole-line"></i>
                    <div>
                      <strong>Requiere acción del cliente</strong>
                      <p>Tu banco solicita autenticación 3D Secure. Completa la verificación para continuar.</p>
                    </div>
                  </div>
                }

                @if (stripeMensaje()) {
                  <div class="aviso aviso-info">
                    <i class="ri-information-line"></i>
                    <p>{{ stripeMensaje() }}</p>
                  </div>
                }

                @if (clientSecret()) {
                  <div class="client-secret">
                    <span>Client secret (solo en memoria)</span>
                    <code>{{ clientSecret() | slice:0:22 }}…</code>
                  </div>
                }

                <button
                  type="button"
                  class="btn btn-accent btn-lg btn-block"
                  [disabled]="procesando() || !enLinea()"
                  (click)="confirmar()"
                >
                  @if (procesando()) {
                    <i class="ri-loader-4-line spin-icon"></i> Verificando…
                  } @else {
                    <i class="ri-shield-check-line"></i> Confirmar pago
                  }
                </button>

                @if (checkoutUrl()) {
                  <button type="button" class="btn btn-outline btn-block" [disabled]="procesando()" (click)="redirigir()">
                    <i class="ri-external-link-line"></i> Ir al checkout seguro
                  </button>
                }

                <button type="button" class="btn btn-outline btn-block" [disabled]="procesando()" (click)="reintentar()">
                  <i class="ri-refresh-line"></i> Reintentar cobro
                </button>
                <button type="button" class="btn btn-outline btn-block" [disabled]="procesando()" (click)="cancelar()">
                  <i class="ri-close-line"></i> Cancelar pago
                </button>
              }
            </section>

            <aside class="card ayuda-card">
              <h3><i class="ri-lightbulb-line"></i> ¿Cómo funciona?</h3>
              <ol>
                <li>El pedido se guardó localmente sin conexión.</li>
                <li>Al recuperar la red se crea el intento de pago en Stripe.</li>
                <li>Si tu banco pide 3DS, se muestra el aviso de acción requerida.</li>
                <li>Un webhook duplicado no vuelve a cobrar ni descuenta stock dos veces (RN-015).</li>
                <li>Si el pago se confirma y la orden se rechaza, se registra el reembolso (RN-018).</li>
              </ol>
              @if (!enLinea()) {
                <div class="aviso aviso-warning">
                  <i class="ri-wifi-off-line"></i>
                  <p>Sin conexión no se puede cobrar. El pago queda pendiente en tu perfil.</p>
                </div>
              }
              <a routerLink="/profile/pagos-pendientes" class="btn btn-outline btn-sm">
                <i class="ri-list-check"></i> Mis pagos pendientes
              </a>
            </aside>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .pago-page { min-height: 100vh; background: var(--bg-main); padding: 2rem 0 4rem; }
    .pago-container { max-width: 980px; margin: 0 auto; padding: 0 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
    .eyebrow { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.04em; }
    .page-head h1 { margin: 0.25rem 0 0; font-size: 1.9rem; font-weight: 800; color: var(--primary); }
    .page-head p { margin: 0.3rem 0 0; color: var(--text-muted); font-size: 0.9rem; }
    .uuid-chip { display: inline-flex; align-items: center; gap: 0.3rem; background: #f1f5f9; border-radius: 9999px; padding: 0.25rem 0.65rem; font-size: 0.72rem; font-weight: 700; color: #475569; }
    .pago-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr); gap: 1rem; align-items: start; }
    .resumen-card, .ayuda-card { padding: 1.3rem 1.4rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .resumen-card h2, .ayuda-card h3 { margin: 0; font-size: 1rem; color: var(--primary); display: inline-flex; align-items: center; gap: 0.35rem; }
    .monto-box { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-radius: 0.7rem; padding: 0.8rem 0.9rem; }
    .monto-box span { font-size: 0.78rem; color: #64748b; }
    .monto-box strong { font-size: 1.5rem; color: var(--primary); }
    .detalle-lista { display: flex; flex-direction: column; gap: 0.45rem; }
    .detalle-lista > div { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #475569; }
    .aviso { display: flex; gap: 0.5rem; align-items: flex-start; padding: 0.65rem 0.8rem; border-radius: 0.6rem; font-size: 0.8rem; }
    .aviso p { margin: 0.15rem 0 0; font-size: 0.75rem; }
    .aviso-error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
    .aviso-warning { background: #fffbeb; border: 1px solid #fcd34d; color: #92400e; }
    .aviso-exito { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
    .aviso-info { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
    .client-secret { display: flex; flex-direction: column; gap: 0.15rem; font-size: 0.7rem; color: #64748b; }
    .client-secret code { background: #0f172a; color: #e2e8f0; border-radius: 0.4rem; padding: 0.35rem 0.5rem; font-size: 0.7rem; overflow: hidden; text-overflow: ellipsis; }
    .btn-block { width: 100%; justify-content: center; }
    .ayuda-card ol { margin: 0; padding-left: 1.1rem; display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.78rem; color: #475569; }
    .estado { padding: 2rem; display: flex; justify-content: center; align-items: center; gap: 0.5rem; color: #64748b; }
    .estado.error { color: #991b1b; align-items: flex-start; }
    .estado div { display: flex; flex-direction: column; gap: 0.35rem; }
    @media (max-width: 760px) { .pago-grid { grid-template-columns: 1fr; } }
  `]
})
export class PendingPaymentComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pending = inject(PendingPaymentService);
  private connectivity = inject(ConnectivityService);
  private toast = inject(ToastService);

  readonly enLinea = this.connectivity.enLinea;

  uuidPago = signal<string | null>(null);
  cargando = signal(true);
  procesando = signal(false);
  error = signal<string | null>(null);
  preparacion = signal<PreparacionPago | null>(null);
  pago = signal<PagoLocal | PagoDiferido | null>(null);
  expirado = signal(false);

  async ngOnInit(): Promise<void> {
    this.uuidPago.set(this.route.snapshot.paramMap.get('uuidPago'));
    await this.cargar();
  }

  estado(): string {
    return this.pago()?.estado ?? 'PENDIENTE_ENVIO';
  }

  monto(): number {
    return Number(this.pago()?.monto ?? this.preparacion()?.pago?.monto ?? 0);
  }

  moneda(): string {
    return this.pago()?.moneda ?? this.preparacion()?.pago?.moneda ?? 'BOB';
  }

  intentos(): number {
    return this.pago()?.intentos ?? 0;
  }

  simulado(): boolean {
    return this.pago()?.simulado === true;
  }

  fechaExpiracion(): string | null {
    return this.pago()?.fecha_expiracion ?? null;
  }

  ultimoError(): string | null {
    return this.pago()?.ultimo_error ?? null;
  }

  requiereAccion(): boolean {
    return this.pago()?.requiere_accion === true || this.preparacion()?.requiereAccion === true;
  }

  clientSecret(): string | null {
    return this.preparacion()?.clientSecret ?? null;
  }

  checkoutUrl(): string | null {
    return this.preparacion()?.checkoutUrl ?? null;
  }

  stripeMensaje(): string {
    const info = this.pending.enriquecerConStripeJs(
      this.clientSecret(),
      environment.stripePublishableKey ?? null
    );
    return info.mensaje;
  }

  numeroOrden(): string {
    const pago = this.pago();
    if (!pago) return '—';
    const remoto = pago as PagoDiferido;
    if (remoto.numero_orden) return remoto.numero_orden;
    return `Orden #${pago.orden_id ?? 'local'}`;
  }

  async cargar(): Promise<void> {
    const uuid = this.uuidPago();
    if (!uuid) {
      this.error.set('No se indicó el identificador del pago.');
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.error.set(null);
    try {
      this.pago.set(await this.pending.estado(uuid));
      const preparacion = await this.pending.crearOConfirmarPago(uuid);
      this.preparacion.set(preparacion);
      if (preparacion.pago) this.pago.set(preparacion.pago);
      this.expirado.set(this.estado() === 'EXPIRADO');
    } catch (error) {
      this.error.set(this.mensajeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  async confirmar(): Promise<void> {
    const uuid = this.uuidPago();
    if (!uuid) return;
    this.procesando.set(true);
    try {
      const actualizado = await this.pending.confirmarConStripe({ uuid_pago: uuid });
      this.pago.set(actualizado);
      if (actualizado.estado === 'CONFIRMADO') {
        this.toast.success('Pago confirmado correctamente.', 'Pago exitoso');
        await this.router.navigate(['/checkout/success'], { queryParams: { uuidPago: uuid } });
      } else if (actualizado.estado === 'REQUIERE_ACCION_CLIENTE') {
        this.toast.warning('Tu banco requiere una autenticación adicional (3DS).', 'Acción requerida');
      } else {
        this.toast.warning('El pago aún no fue confirmado. Revisa el estado o reintenta.', 'Pago pendiente');
      }
    } catch (error) {
      this.toast.error(this.mensajeError(error), 'No se pudo confirmar el pago');
    } finally {
      this.procesando.set(false);
    }
  }

  async reintentar(): Promise<void> {
    const uuid = this.uuidPago();
    if (!uuid) return;
    this.procesando.set(true);
    try {
      const actualizado = await this.pending.reintentar(uuid);
      this.pago.set(actualizado);
      this.toast.info('Reintento registrado. Revisa el estado del pago.', 'Pago reintentado');
    } catch (error) {
      this.toast.error(this.mensajeError(error), 'No se pudo reintentar');
    } finally {
      this.procesando.set(false);
    }
  }

  async cancelar(): Promise<void> {
    const uuid = this.uuidPago();
    if (!uuid) return;
    this.procesando.set(true);
    try {
      const actualizado = await this.pending.cancelar(uuid);
      this.pago.set(actualizado);
      this.toast.info('Pago cancelado y stock liberado.', 'Pago cancelado');
      await this.router.navigate(['/checkout/pago-expirado'], { queryParams: { uuidPago: uuid } });
    } catch (error) {
      this.toast.error(this.mensajeError(error), 'No se pudo cancelar');
    } finally {
      this.procesando.set(false);
    }
  }

  redirigir(): void {
    const url = this.checkoutUrl();
    if (!url) {
      this.toast.warning('El backend no devolvió una URL de checkout; usa la verificación del pago.', 'Redirección no disponible');
      return;
    }
    if (!this.pending.redirigirACheckout(url)) {
      this.toast.error('No se pudo abrir la pasarela de pago.', 'Redirección bloqueada');
    }
  }

  marcarExpirado(): void {
    this.expirado.set(true);
  }

  private mensajeError(error: unknown): string {
    if (error instanceof Error) return error.message;
    const detalle = (error as { error?: { detail?: string } })?.error?.detail;
    return detalle ?? 'No se pudo preparar el pago diferido.';
  }
}
