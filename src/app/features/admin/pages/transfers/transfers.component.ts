import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TraspasosApiService } from '../../../../core/services/traspasos-api.service';
import { InventoryApiService } from '../../../../core/services/inventory-api.service';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';
import { Traspaso, SugerenciaTraspaso } from '../../../../core/models/traspaso.model';

/**
 * [EXAMEN-2] CU14: traspasos admin.
 */
@Component({
  selector: 'app-transfers',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgePipe],
  template: `
    <section>
      <header><span class="eyebrow">CU14 · Traspasos</span><h1>Traspasos entre sucursales</h1></header>
      <div class="card">
        <label>Origen <input type="number" [(ngModel)]="origen"></label>
        <label>Destino <input type="number" [(ngModel)]="destino"></label>
        <label>Variante <input type="number" [(ngModel)]="variante"></label>
        <label>Cantidad <input type="number" [(ngModel)]="cantidad"></label>
        <button type="button" class="btn btn-sm btn-accent" (click)="crear()">Crear traspaso</button>
        @if (errorStock()) { <p class="error">{{ errorStock() }}</p> }
        @if (sugerencias().length) { <h3>Sugerencias por demanda</h3> @for (s of sugerencias(); track s.variante_producto_id) { <p>{{ s.producto_nombre }} — origen {{ s.sucursal_origen_id }} → destino {{ s.sucursal_destino_id }} (stock {{ s.stock_origen }} vs demanda {{ s.demanda }})</p> } }
      </div>
      @for (t of lista(); track t.id) {
        <div class="card">
          <strong>{{ t.numero }}</strong> {{ t.sucursal_origen }} → {{ t.sucursal_destino }} <span class="badge" [ngClass]="(t.estado | statusBadge).class">{{ (t.estado | statusBadge).label }}</span>
          @for (d of t.detalles; track $index) { <p>{{ d.producto_nombre }} {{ d.talla }} {{ d.color }} × {{ d.cantidad }} — recibido {{ d.cantidad_recibida }} merma {{ d.cantidad_merma }}</p> }
          <button type="button" class="btn btn-sm btn-outline" (click)="historial(t)">Historial producto</button>
          @if (historialSel() === t.id) { <p>Historial: {{ historialTexto() }}</p> }
        </div>
      } @empty { <p>Aún no hay traspasos.</p> }
    </section>
  `,
  styles: [`.card{background:#fff;border:1px solid var(--border-color);border-radius:12px;padding:1rem;margin:.6rem 0} label{display:flex;flex-direction:column;margin:.4rem 0} .error{color:#991b1b}`]
})
export class TransfersComponent implements OnInit {
  private api = inject(TraspasosApiService);
  private inv = inject(InventoryApiService);
  lista = signal<Traspaso[]>([]);
  sugerencias = signal<SugerenciaTraspaso[]>([]);
  origen: number | null = null; destino: number | null = null; variante: number | null = null; cantidad = 1;
  errorStock = signal('');
  historialSel = signal<number | null>(null);
  historialTexto = signal('');
  ngOnInit(): void { this.cargar(); this.api.sugerencias().subscribe({ next: (x) => this.sugerencias.set(x), error: () => undefined }); }
  cargar(): void { this.api.listar().subscribe({ next: (x) => this.lista.set(x), error: () => undefined }); }
  crear(): void {
    if (!this.origen || !this.destino || !this.variante) return;
    this.inv.getBranchInventory(this.origen).subscribe({ next: (items) => {
      const stock = items.find((i) => i.variante_producto_id === this.variante)?.cantidad ?? 0;
      if (stock < this.cantidad) { this.errorStock.set('Stock insuficiente en origen: disponible ' + stock + ', solicitado ' + this.cantidad + '.'); return; }
      this.errorStock.set('');
      this.api.crear({ sucursal_origen_id: this.origen!, sucursal_destino_id: this.destino!, detalles: [{ variante_producto_id: this.variante!, cantidad: this.cantidad }] }).subscribe({ next: () => this.cargar() });
    } });
  }
  historial(t: Traspaso): void { const pid = t.detalles[0]?.variante_producto_id; if (!pid) return; this.api.historialProducto(pid).subscribe({ next: (x) => { this.historialSel.set(t.id ?? null); this.historialTexto.set(x.length + ' traspasos previos'); } }); }
}
