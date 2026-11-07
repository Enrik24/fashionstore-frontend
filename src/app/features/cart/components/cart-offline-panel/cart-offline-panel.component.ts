import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService } from '../../../../core/services/cart.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConversionLocal } from '../../../../core/offline/offline-cart.service';
import { ExpiryCountdownComponent } from '../../../../shared/components/expiry-countdown/expiry-countdown.component';

/**
 * [EXAMEN-2] CU15: modo offline del carrito y confirmación de compra.
 * No duplica la pantalla: se incrusta en `cart-page` cuando no hay red.
 */
@Component({
  selector: 'app-cart-offline-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ExpiryCountdownComponent],
  template: `
    @if (conversion(); as resultado) {
      <div class="offline-exito">
        <div class="exito-icon"><i class="ri-checkbox-circle-fill"></i></div>
        <h3>Pedido guardado localmente</h3>
        <p>
          Orden <strong>{{ resultado.orden.uuid_orden | slice:0:12 }}…</strong> en estado
          <span class="badge badge-pending">PENDIENTE_PAGO_DIFERIDO</span>.
          El pago se completará cuando recuperes la conexión.
        </p>
        <app-expiry-countdown
          [fechaExpiracion]="resultado.orden.expira_en ?? null"
          etiqueta="Vigencia del pedido"
          (vencido)="pedidoVencido()"
        ></app-expiry-countdown>
        <div class="exito-acciones">
          <a
            [routerLink]="['/checkout/pago-pendiente', resultado.pago.uuid_pago]"
            class="btn btn-accent btn-sm"
          >
            <i class="ri-bank-card-line"></i> Pagar al recuperar la red
          </a>
          <a routerLink="/profile/pagos-pendientes" class="btn btn-outline btn-sm">
            <i class="ri-list-check"></i> Mis pagos pendientes
          </a>
        </div>
      </div>
    } @else {
      <div class="offline-panel">
        <div class="offline-head">
          <i class="ri-wifi-off-line"></i>
          <div>
            <strong>Compra en modo offline</strong>
            <p>El carrito está guardado en este dispositivo y se conserva al cerrar la app.</p>
          </div>
        </div>

        <ul class="offline-lista">
          <li><i class="ri-price-tag-3-line"></i> Los precios son locales y referenciales.</li>
          <li><i class="ri-coupon-2-line"></i> Los cupones requieren conexión y están deshabilitados (RN-014).</li>
          <li><i class="ri-bank-card-line"></i> Se generará un pago diferido para cobrar al recuperar la red.</li>
        </ul>

        <label class="check-aceptacion">
          <input type="checkbox" [(ngModel)]="aceptaTotal" />
          Acepto el total local referencial de Bs. {{ cartService.totalSignal() | number:'1.2-2' }}.
        </label>

        @if (error()) {
          <div class="aviso-error"><i class="ri-error-warning-line"></i> {{ error() }}</div>
        }

        <button
          type="button"
          class="btn btn-accent btn-lg btn-block"
          [disabled]="!aceptaTotal || confirmando() || cartService.itemCountSignal() === 0"
          (click)="confirmar()"
        >
          @if (confirmando()) {
            <i class="ri-loader-4-line spin-icon"></i> Guardando pedido…
          } @else {
            <i class="ri-save-3-line"></i> Confirmar compra offline
          }
        </button>
      </div>
    }
  `,
  styles: [`
    .offline-panel { display: flex; flex-direction: column; gap: 0.65rem; margin-top: 0.9rem; padding-top: 0.9rem; border-top: 1px dashed var(--border-color, #e2e8f0); }
    .offline-head { display: flex; gap: 0.5rem; align-items: flex-start; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 0.6rem; padding: 0.65rem 0.75rem; color: #92400e; }
    .offline-head i { font-size: 1.1rem; }
    .offline-head strong { font-size: 0.82rem; }
    .offline-head p { margin: 0.1rem 0 0; font-size: 0.74rem; }
    .offline-lista { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.73rem; color: #475569; }
    .offline-lista li { display: flex; gap: 0.35rem; align-items: flex-start; }
    .check-aceptacion { display: flex; gap: 0.4rem; align-items: flex-start; font-size: 0.74rem; color: #334155; }
    .btn-block { width: 100%; justify-content: center; }
    .aviso-error { display: flex; gap: 0.4rem; align-items: center; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 0.5rem; padding: 0.5rem 0.65rem; font-size: 0.74rem; }
    .offline-exito { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; text-align: center; margin-top: 0.9rem; padding-top: 0.9rem; border-top: 1px dashed #e2e8f0; }
    .exito-icon { font-size: 2.2rem; color: #16a34a; }
    .offline-exito h3 { margin: 0; font-size: 1rem; color: var(--primary); }
    .offline-exito p { margin: 0; font-size: 0.78rem; color: #475569; }
    .exito-acciones { display: flex; gap: 0.4rem; flex-wrap: wrap; justify-content: center; margin-top: 0.3rem; }
  `]
})
export class CartOfflinePanelComponent {
  public cartService = inject(CartService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  aceptaTotal = false;
  confirmando = signal(false);
  error = signal<string | null>(null);
  conversion = signal<ConversionLocal | null>(null);

  async confirmar(): Promise<void> {
    if (!this.aceptaTotal) {
      this.error.set('Debes aceptar el total local referencial.');
      return;
    }
    this.confirmando.set(true);
    this.error.set(null);
    try {
      const user = this.auth.currentUserSignal();
      const conversion = await this.cartService.confirmarCompraOffline({
        aceptaNuevoTotal: true,
        clienteId: user?.id ?? null,
        sucursalId: user?.sucursal_id ?? null
      });
      this.conversion.set(conversion);
      this.toast.success('Pedido guardado localmente con pago diferido.', 'Compra offline');
    } catch (error) {
      this.error.set(this.mensajeError(error));
    } finally {
      this.confirmando.set(false);
    }
  }

  pedidoVencido(): void {
    this.toast.warning('El plazo del pedido venció. Revisa tus pagos pendientes para liberar el stock.', 'Pedido expirado');
  }

  private mensajeError(error: unknown): string {
    if (error instanceof Error) return error.message;
    const detalle = (error as { error?: { detail?: string } })?.error?.detail;
    return detalle ?? 'No se pudo convertir el carrito en orden local.';
  }
}
