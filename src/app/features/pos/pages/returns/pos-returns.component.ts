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
    <div class="offline-page">
      <div class="container offline-container">
        <header class="page-head">
          <div>
            <span class="eyebrow"><i class="ri-anticorn-line"></i> CU13 · Devoluciones</span>
            <h1>Devolución en POS</h1>
            <p>Busca la venta por comprobante y registra la devolución.</p>
          </div>
        </header>
        <div class="card">
          <div class="buscador-row">
            <div class="form-group grow">
              <label class="form-label" for="comprobante">N° comprobante</label>
              <input id="comprobante" class="form-control" [(ngModel)]="comprobante" placeholder="DOC-000123" />
            </div>
            <button type="button" class="btn btn-accent btn-sm" (click)="buscar()"><i class="ri-search-line"></i> Buscar venta</button>
          </div>
          @if (plazo(); as p) { <p class="estado" [class.error]="!p.valido">Plazo: {{ p.valido ? 'Dentro de período' : 'Fuera de período permitido' }} · límite {{ p.fecha_limite_cambio }}</p> }
          @if (venta(); as v) {
            <div class="venta-box">
              <p class="venta-info"><i class="ri-file-list-3-line"></i> Venta: <strong>{{ v.numero_orden }}</strong> · orden {{ v.orden_id }}</p>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label" for="cantidad">Cantidad</label>
                  <input id="cantidad" class="form-control" type="number" [(ngModel)]="cantidad" min="1" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="varianteDevuelta">Prenda devuelta (variante)</label>
                  <input id="varianteDevuelta" class="form-control" type="number" [(ngModel)]="varianteDevuelta" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="precioDevuelto">Precio devuelto (Bs.)</label>
                  <input id="precioDevuelto" class="form-control" type="number" [(ngModel)]="precioDevuelto" />
                </div>
              </div>
              @if (diferencia(); as d) { <p class="estado">Diferencia: {{ d.tipo_diferencia }} — pagado {{ d.monto_pagado_diferencia }} · saldo a favor {{ d.saldo_favor }}</p> }
              <button type="button" class="btn btn-accent btn-sm" [disabled]="!puedeConfirmar()" (click)="confirmar()"><i class="ri-checkbox-circle-line"></i> Confirmar devolución</button>
              @if (nota(); as n) { <p class="estado ok">Nota: {{ n.numero_temporal }}</p> }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .offline-page { min-height: 100vh; background: var(--bg-main); padding: 2rem 0 4rem; }
    .offline-container { max-width: 1120px; margin: 0 auto; padding: 0 1.5rem; display: flex; flex-direction: column; gap: 1.1rem; }
    .page-head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; flex-wrap: wrap; }
    .eyebrow { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.04em; }
    .page-head h1 { margin: 0.25rem 0 0; font-size: 1.9rem; font-weight: 800; color: var(--primary); }
    .page-head p { margin: 0.3rem 0 0; color: var(--text-muted); font-size: 0.9rem; }
    .card { background: #fff; border: 1px solid var(--border-color); border-radius: 12px; padding: 1.2rem 1.3rem; display: flex; flex-direction: column; gap: 0.8rem; }
    .buscador-row { display: flex; gap: 0.6rem; align-items: flex-end; }
    .grow { flex: 1; }
    .form-group { display: flex; flex-direction: column; gap: 0.25rem; }
    .form-label { font-size: 0.78rem; font-weight: 700; color: var(--primary); }
    .form-control { padding: 0.5rem 0.65rem; border: 1px solid var(--border-color); border-radius: 8px; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.7rem; }
    .venta-box { border-top: 1px dashed var(--border-color); padding-top: 0.8rem; display: flex; flex-direction: column; gap: 0.6rem; }
    .venta-info { margin: 0; font-size: 0.88rem; color: var(--primary); }
    .estado { margin: 0; font-size: 0.82rem; color: #475569; }
    .estado.error { color: #991b1b; font-weight: 700; }
    .estado.ok { color: #16a34a; font-weight: 700; }
  `]
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
