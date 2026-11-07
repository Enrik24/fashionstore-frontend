import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReturnsApiService } from '../../../../core/services/returns-api.service';
import { PosService } from '../../../../core/services/pos.service';
import { OfflineQueueService } from '../../../../core/offline/offline-queue.service';
import { OfflineDocumentService } from '../../../../core/offline/offline-document.service';
import { ConnectivityService } from '../../../../core/offline/connectivity.service';
import { ToastService } from '../../../../core/services/toast.service';

/**
 * [EXAMEN-2] CU13: devolución en POS (online y offline).
 */
@Component({
  selector: 'app-pos-returns',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section>
      <header><span class="eyebrow">CU13 · Devoluciones</span><h1>Devolución en POS</h1></header>
      <div class="card">
        <label>N° comprobante <input [(ngModel)]="comprobante" placeholder="DOC-000123"></label>
        <button type="button" class="btn btn-sm btn-accent" (click)="buscar()">Buscar venta</button>
        @if (plazo(); as p) { <p>Plazo: {{ p.valido ? 'Dentro de período' : 'Fuera de período permitido' }} · límite {{ p.fecha_limite_cambio }}</p> }
        @if (venta(); as v) {
          <p>Venta: {{ v.numero_orden }} · orden {{ v.orden_id }}</p>
          <label>Cantidad <input type="number" [(ngModel)]="cantidad" min="1"></label>
          <label>Prenda devuelta (variante) <input type="number" [(ngModel)]="varianteDevuelta"></label>
          <label>Precio devuelto <input type="number" [(ngModel)]="precioDevuelto"></label>
          @if (diferencia(); as d) { <p>Diferencia: {{ d.tipo_diferencia }} — pagado {{ d.monto_pagado_diferencia }} · saldo a favor {{ d.saldo_favor }}</p> }
          <button type="button" class="btn btn-accent btn-sm" [disabled]="!puedeConfirmar()" (click)="confirmar()">Confirmar devolución</button>
          @if (nota(); as n) { <p>Nota: {{ n.numero_temporal }}</p> }
        }
      </div>
    </section>
  `,
  styles: [`.card{background:#fff;border:1px solid var(--border-color);border-radius:12px;padding:1rem} label{display:flex;flex-direction:column;margin:.4rem 0} input{padding:.4rem;border:1px solid var(--border-color);border-radius:8px}`]
})
export class PosReturnsComponent {
  private returns = inject(ReturnsApiService);
  private pos = inject(PosService);
  private queue = inject(OfflineQueueService);
  private docs = inject(OfflineDocumentService);
  private conn = inject(ConnectivityService);
  private toast = inject(ToastService);
  comprobante = '';
  cantidad = 1;
  varianteDevuelta: number | null = null;
  precioDevuelto = 0;
  venta = signal<any>(null);
  plazo = signal<any>(null);
  nota = signal<any>(null);
  diferencia = signal<any>(null);
  puedeConfirmar(): boolean { return !!this.venta() && !!this.plazo()?.valido && this.varianteDevuelta != null; }
  buscar(): void {
    this.returns.buscarVentaElegible(this.comprobante).subscribe({ next: (v) => { this.venta.set(v); const ordenId = v.orden_id ?? v.id; if (ordenId) this.returns.validarPlazo(ordenId).subscribe({ next: (p) => this.plazo.set(p), error: () => undefined }); }, error: () => this.toast.error('Venta no encontrada', 'Verifica el comprobante') });
  }
  async confirmar(): Promise<void> {
    const d = this.pos.calcularDiferencia(this.precioDevuelto, this.precioDevuelto);
    this.diferencia.set(d);
    if (!this.conn.enLinea()) {
      const op = await this.queue.encolar('DEVOLUCION', { orden_id: this.venta()?.orden_id, variante_producto_id: this.varianteDevuelta, cantidad: this.cantidad, uuid_offline: crypto.randomUUID() });
      const nota = await this.docs.generarNotaDevolucion({ total: Math.abs(d.saldo_favor), detalle: [`Devolución offline ${op.uuid_operacion}`] });
      this.nota.set(nota);
      return;
    }
    this.pos.registrarDevolucion({ orden_id: this.venta()?.orden_id, sucursal_id: null, tipo: 'DEVOLUCION', motivo: 'OTRO', items: [{ variante_producto_id: this.varianteDevuelta, cantidad: this.cantidad, precio_unitario: this.precioDevuelto }] }).subscribe({ next: () => this.toast.success('Devolución registrada', 'Nota lista para descargar'), error: () => this.toast.error('No se pudo registrar', 'Intenta de nuevo') });
  }
}
