import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SaasApiService } from '../../../../core/services/saas-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CheckoutSuscripcionResponse, Plan, Suscripcion } from '../../../../core/models/saas.model';
import { SectionTitleComponent } from '../../../../shared/components/section-title/section-title.component';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';

/**
 * [EXAMEN-2] CU03 / RN-011: checkout del plan.
 * El backend responde `simulado`, `stripe` o `redirect`. Si entrega una
 * `checkout_url` se redirige; si entrega un `client_secret` sin Stripe.js
 * (dependencia no instalada) se muestra el intento creado y la referencia.
 */
@Component({
  selector: 'app-suscripcion-checkout',
  standalone: true,
  imports: [CommonModule, RouterLink, SectionTitleComponent, CurrencyFormatPipe, StatusBadgePipe],
  template: `
    <div class="page">
      <app-section-title
        titulo="Pago del plan"
        subtitulo="Cobro de la suscripción con Stripe o modo simulado (RN-011)."
        icono="ri-bank-card-line">
        <a acciones routerLink="/plataforma/suscripciones" class="btn btn-outline btn-sm">
          <i class="ri-arrow-left-line"></i> Suscripciones
        </a>
      </app-section-title>

      @if (cargando()) {
        <div class="loading-box card"><i class="ri-loader-4-line spin"></i> Cargando suscripción…</div>
      } @else if (!suscripcion()) {
        <div class="empty-box card">
          <i class="ri-calendar-close-line"></i>
          <h3>No se encontró la suscripción</h3>
          <p>Regresa al panel de suscripciones y vuelve a intentarlo.</p>
          <a routerLink="/plataforma/suscripciones" class="btn btn-outline">Volver</a>
        </div>
      } @else {
        <div class="checkout-grid">
          <section class="card bloque resumen">
            <h2><i class="ri-file-list-3-line"></i> Resumen</h2>
            <dl class="ficha">
              <div><dt>Empresa</dt><dd>#{{ suscripcion()!.tenant_id }}</dd></div>
              <div><dt>Plan</dt><dd><strong>{{ plan()?.nombre || 'Sin plan' }}</strong></dd></div>
              <div><dt>Precio mensual</dt><dd>{{ plan()?.precio_mensual | currencyFormat:'Bs.' }}</dd></div>
              <div><dt>Inicio</dt><dd>{{ suscripcion()!.fecha_inicio | date: 'dd/MM/yyyy' }}</dd></div>
              <div><dt>Vencimiento</dt><dd>{{ suscripcion()!.fecha_vencimiento | date: 'dd/MM/yyyy' }}</dd></div>
              <div>
                <dt>Estado</dt>
                <dd>
                  <span class="badge" [ngClass]="(suscripcion()!.estado | statusBadge).class">
                    {{ (suscripcion()!.estado | statusBadge).label }}
                  </span>
                </dd>
              </div>
              <div><dt>Renovación automática</dt><dd>{{ suscripcion()!.renovacion_automatica ? 'Sí' : 'No' }}</dd></div>
            </dl>
          </section>

          <section class="card bloque pago">
            <h2><i class="ri-secure-payment-line"></i> Cobro</h2>
            <p class="bloque-desc">
              El backend registra un pago <code>PENDIENTE</code> y responde con el modo de cobro.
              En producción con Stripe configurado devuelve una URL de checkout.
            </p>

            <div class="monto">
              <span>Total a pagar</span>
              <strong>{{ plan()?.precio_mensual | currencyFormat:'Bs.' }}</strong>
            </div>

            <div class="modos">
              <div class="modo"><i class="ri-secure-payment-line"></i><span>Tarjeta con Stripe</span></div>
              <div class="modo"><i class="ri-bank-line"></i><span>Redirección segura</span></div>
              <div class="modo"><i class="ri-flask-line"></i><span>Modo simulado en desarrollo</span></div>
            </div>

            @if (resultado(); as r) {
              <div class="resultado" [class.exito]="r.estado === 'CONFIRMADO'">
                <i [class]="r.estado === 'CONFIRMADO' ? 'ri-checkbox-circle-fill' : 'ri-information-fill'"></i>
                <div>
                  <strong>{{ tituloResultado(r) }}</strong>
                  <span>{{ r.mensaje || ('Pago #' + (r.pago_id ?? '—') + ' · ' + (r.estado || 'PENDIENTE')) }}</span>
                  @if (r.checkout_url) {
                    <a class="link" [href]="r.checkout_url" target="_blank" rel="noopener">Abrir checkout de Stripe</a>
                  }
                  @if (r.client_secret) {
                    <code class="secreto">{{ r.client_secret }}</code>
                    <small>
                      Stripe.js no está instalado en este proyecto; el intento quedó creado y el webhook
                      confirmará el pago. La clave se muestra solo como referencia técnica.
                    </small>
                  }
                </div>
              </div>
            }

            <button type="button" class="btn btn-accent btn-block" (click)="pagar()" [disabled]="pagando() || !plan()">
              <i class="ri-bank-card-line"></i>
              {{ pagando() ? 'Procesando…' : 'Pagar con Stripe' }}
            </button>

            <p class="nota-seguridad">
              <i class="ri-lock-2-line"></i>
              No se almacenan datos de tarjeta en el navegador. El cobro se confirma por webhook.
            </p>
          </section>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1rem; max-width: 980px; }

    .checkout-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: start; }
    .bloque { padding: 1.35rem 1.5rem; }
    .bloque h2 { display: flex; align-items: center; gap: 0.45rem; margin: 0 0 0.35rem; font-size: 1rem; font-weight: 800; color: var(--primary); }
    .bloque h2 i { color: var(--accent); }
    .bloque-desc { margin: 0 0 1rem; font-size: 0.76rem; color: var(--text-muted); line-height: 1.5; }
    code { background: var(--bg-main); padding: 0.08rem 0.3rem; border-radius: 4px; font-size: 0.72rem; }

    .ficha { display: flex; flex-direction: column; gap: 0.55rem; margin: 0.75rem 0 0; }
    .ficha div { display: flex; justify-content: space-between; gap: 1rem; border-bottom: 1px dashed var(--border-light); padding-bottom: 0.4rem; }
    .ficha dt { font-size: 0.74rem; color: var(--text-muted); font-weight: 600; }
    .ficha dd { margin: 0; font-size: 0.82rem; color: var(--primary); font-weight: 700; text-align: right; }

    .monto {
      display: flex; align-items: center; justify-content: space-between;
      background: var(--bg-main); border-radius: var(--radius-md);
      padding: 0.8rem 1rem; margin-bottom: 0.9rem;
    }
    .monto span { font-size: 0.76rem; color: var(--text-muted); font-weight: 600; }
    .monto strong { font-size: 1.35rem; color: var(--primary); font-weight: 800; }

    .modos { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
    .modo { display: flex; align-items: center; gap: 0.45rem; font-size: 0.78rem; color: var(--text-muted); }
    .modo i { color: var(--success); }

    .resultado {
      display: flex; gap: 0.6rem; align-items: flex-start;
      background: var(--info-bg); border-radius: var(--radius-md);
      padding: 0.85rem 1rem; margin-bottom: 1rem;
      &.exito { background: var(--success-bg); }
      > i { font-size: 1.35rem; color: var(--info); }
      &.exito > i { color: var(--success); }
      div { display: flex; flex-direction: column; gap: 0.2rem; }
      strong { font-size: 0.82rem; color: var(--primary); }
      span { font-size: 0.76rem; color: var(--text-muted); }
      .link { font-size: 0.76rem; color: var(--accent); font-weight: 700; }
      small { font-size: 0.68rem; color: var(--text-muted); line-height: 1.45; }
    }
    .secreto { display: block; font-size: 0.64rem; word-break: break-all; color: var(--critical); background: white; padding: 0.3rem 0.4rem; border-radius: 4px; }

    .btn-block { width: 100%; justify-content: center; }
    .nota-seguridad { display: flex; align-items: center; gap: 0.35rem; margin: 0.75rem 0 0; font-size: 0.68rem; color: var(--text-muted); }

    .loading-box, .empty-box {
      display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
      padding: 3rem 1.5rem; text-align: center;
      i { font-size: 2.5rem; color: var(--text-muted); }
      h3 { margin: 0; font-size: 1rem; color: var(--primary); }
      p { margin: 0 0 0.75rem; font-size: 0.82rem; color: var(--text-muted); }
    }
    .loading-box { flex-direction: row; justify-content: center; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 820px) { .checkout-grid { grid-template-columns: 1fr; } }
  `]
})
export class SuscripcionCheckoutComponent implements OnInit {
  private saasApi = inject(SaasApiService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  public suscripcion = signal<Suscripcion | null>(null);
  public plan = signal<Plan | null>(null);
  public resultado = signal<CheckoutSuscripcionResponse | null>(null);
  public cargando = signal(true);
  public pagando = signal(false);

  private id = 0;

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar();
  }

  public pagar(): void {
    const suscripcion = this.suscripcion();
    const plan = this.plan();
    if (!suscripcion || !plan) return;

    this.pagando.set(true);
    this.resultado.set(null);
    this.saasApi.crearCheckoutSuscripcion(suscripcion.id, plan.id, plan.precio_mensual).subscribe({
      next: (respuesta) => {
        this.pagando.set(false);
        this.resultado.set(respuesta);
        if (respuesta.checkout_url) {
          this.toast.info('Redirigiendo a la pasarela de pago…');
          window.location.href = respuesta.checkout_url;
          return;
        }
        if (respuesta.modo === 'simulado') {
          this.toast.success('Pago simulado registrado. El plan se activará al confirmar el pago.');
        } else {
          this.toast.info('Intento de pago creado. La confirmación llegará por webhook.');
        }
      },
      error: (err) => {
        this.pagando.set(false);
        const detalle = err?.error?.detail ?? err?.error?.message;
        this.toast.error(typeof detalle === 'string' ? detalle : 'No se pudo iniciar el pago del plan.');
      }
    });
  }

  public tituloResultado(resultado: CheckoutSuscripcionResponse): string {
    if (resultado.checkout_url) return 'Checkout listo';
    if (resultado.modo === 'simulado') return 'Pago simulado registrado';
    if (resultado.estado === 'CONFIRMADO') return 'Pago confirmado';
    return 'Intento de pago creado';
  }

  private cargar(): void {
    this.cargando.set(true);
    this.saasApi.listarSuscripciones({ limit: 200 }).subscribe({
      next: (suscripciones) => {
        const encontrada = suscripciones.find((s) => s.id === this.id) ?? null;
        this.suscripcion.set(encontrada);
        this.plan.set(encontrada?.plan ?? null);
        this.cargando.set(false);
        if (encontrada && !encontrada.plan && encontrada.plan_id) {
          this.saasApi.obtenerPlan(encontrada.plan_id).subscribe({
            next: (plan) => this.plan.set(plan),
            error: () => undefined
          });
        }
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudo cargar la suscripción.');
      }
    });
  }
}
