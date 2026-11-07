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
 * [EXAMEN-2] CU18: reposición de talla/color en POS.
 */
@Component({
  selector: 'app-pos-reposiciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section>
      <header><span class="eyebrow">CU18 · Reposición</span><h1>Reposición de prenda</h1></header>
      <div class="card">
        <label>N° comprobante <input [(ngModel)]="comprobante"></label>
        <button type="button" class="btn btn-sm btn-accent" (click)="buscar()">Buscar</button>
        @if (plazo(); as p) { <p>{{ p.valido ? 'Dentro de período' : 'Fuera de período permitido' }}</p> }
        @if (venta()) {
          <label>Variante devuelta <input type="number" [(ngModel)]="varianteDevuelta"></label>
          <label>Precio devuelto <input type="number" [(ngModel)]="precioDevuelto"></label>
          <label>Variante nueva (talla/color) <input type="number" [(ngModel)]="varianteNueva"></label>
          <label>Precio nueva <input type="number" [(ngModel)]="precioNuevo"></label>
          <button type="button" class="btn btn-outline btn-sm" (click)="alternativas()">Buscar talla mayor/menor</button>
          @if (sinAlternativa()) { <p class="aviso">No hay talla mayor/menor disponible. SIN_ALTERNATIVA: te avisaremos cuando llegue o puedes solicitar devolución.</p> }
          @for (a of alternativasList(); track a.variante_producto_id) { <p>Alternativa: {{ a.talla }} {{ a.color }} — stock {{ a.stock }}</p> }
          @if (diferencia(); as d) { <p>Diferencia {{ d.tipo_diferencia }}: a pagar {{ d.monto_pagado_diferencia }} · saldo a favor {{ d.saldo_favor }}</p> }
          <button type="button" class="btn btn-accent btn-sm" [disabled]="!puedeConfirmar()" (click)="confirmar()">Confirmar reposición</button>
          @if (nota(); as n) { <p>Nota reposición: {{ n.numero_temporal }}</p> }
        }
      </div>
    </section>
  `,
  styles: [`.card{background:#fff;border:1px solid var(--border-color);border-radius:12px;padding:1rem} label{display:flex;flex-direction:column;margin:.4rem 0} .aviso{background:#fffbeb;border:1px solid #fcd34d;padding:.5rem}`]
})
export class PosReposicionesComponent {
  private returns = inject(ReturnsApiService);
  private pos = inject(PosService);
  private queue = inject(OfflineQueueService);
  private docs = inject(OfflineDocumentService);
  private conn = inject(ConnectivityService);
  private toast = inject(ToastService);
  comprobante = ''; varianteDevuelta: number | null = null; precioDevuelto = 0; varianteNueva: number | null = null; precioNuevo = 0;
  venta = signal<any>(null); plazo = signal<any>(null); diferencia = signal<any>(null); nota = signal<any>(null); alternativasList = signal<any[]>([]); sinAlternativa = signal(false);
  puedeConfirmar(): boolean { return !!this.venta() && !!this.plazo()?.valido && this.varianteDevuelta != null && this.varianteNueva != null; }
  buscar(): void { this.returns.buscarVentaElegible(this.comprobante).subscribe({ next: (v) => { this.venta.set(v); const id = v.orden_id ?? v.id; if (id) this.returns.validarPlazo(id).subscribe({ next: (p) => this.plazo.set(p) }); }, error: () => this.toast.error('Venta no encontrada', '') }); }
  alternativas(): void { if (!this.varianteDevuelta) return; this.returns.alternativasTalla(this.varianteDevuelta, 'MAYOR').subscribe({ next: (x) => { this.alternativasList.set(x); if (!x?.length) { this.sinAlternativa.set(true); this.returns.notificarAlternativa(0).subscribe({ error: () => undefined }); } }, error: () => this.sinAlternativa.set(true) }); }
  async confirmar(): Promise<void> {
    this.diferencia.set(this.pos.calcularDiferencia(this.precioDevuelto, this.precioNuevo));
    const dto = { orden_id: this.venta()?.orden_id, items: [{ variante_producto_id: this.varianteDevuelta, cantidad: 1, variante_cambio_id: this.varianteNueva, precio_unitario: this.precioDevuelto, precio_variante_nueva: this.precioNuevo }] };
    if (!this.conn.enLinea()) { const op = await this.queue.encolar('REPOSICION', { ...dto, uuid_offline: crypto.randomUUID() }); const n = await this.docs.generarNotaReposicion({ total: Math.abs(this.diferencia()?.monto_pagado_diferencia ?? 0), detalle: [`Reposición offline ${op.uuid_operacion}`] }); this.nota.set(n); return; }
    this.pos.registrarReposicion(dto).subscribe({ next: () => this.toast.success('Reposición registrada', 'Nota lista'), error: () => this.toast.error('No se pudo registrar', '') });
  }
}
