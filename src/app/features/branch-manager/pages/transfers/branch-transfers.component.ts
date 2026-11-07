import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TraspasosApiService } from '../../../../core/services/traspasos-api.service';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';
import { Traspaso } from '../../../../core/models/traspaso.model';

/**
 * [EXAMEN-2] CU14: recepción total o parcial con merma.
 */
@Component({
  selector: 'app-branch-transfers',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgePipe],
  template: `
    <section>
      <header><span class="eyebrow">CU14 · Sucursal</span><h1>Traspasos por recibir</h1></header>
      @for (t of lista(); track t.id) {
        <div class="card">
          <strong>{{ t.numero }}</strong> <span class="badge" [ngClass]="(t.estado | statusBadge).class">{{ (t.estado | statusBadge).label }}</span>
          @for (d of t.detalles; track d.variante_producto_id; let i = $index) {
            <div class="linea">
              <span>{{ d.producto_nombre }} × {{ d.cantidad }}</span>
              <label>Recibida <input type="number" [(ngModel)]="d.cantidad_recibida"></label>
              <label>Merma <input type="number" [(ngModel)]="d.cantidad_merma"></label>
              <label>Motivo rechazo <input [(ngModel)]="motivos[i]"></label>
            </div>
          }
          <p class="hint">La suma recibida + merma debe ser igual a la cantidad.</p>
          <button type="button" class="btn btn-sm btn-accent" (click)="recibir(t)">Confirmar recepción</button>
          <button type="button" class="btn btn-sm btn-outline" (click)="rechazar(t)">Rechazar líneas</button>
        </div>
      } @empty { <p>Sin traspasos pendientes.</p> }
    </section>
  `,
  styles: [`.card{background:#fff;border:1px solid var(--border-color);border-radius:12px;padding:1rem;margin:.6rem 0} .linea{display:flex;gap:.5rem;flex-wrap:wrap;border-top:1px solid #eee;padding:.4rem 0} .hint{font-size:.75rem;color:var(--text-muted)}`]
})
export class BranchTransfersComponent implements OnInit {
  private api = inject(TraspasosApiService);
  lista = signal<Traspaso[]>([]);
  motivos: string[] = [];
  ngOnInit(): void { this.cargar(); }
  cargar(): void { this.api.listar({ estado: 'EN_TRANSITO' }).subscribe({ next: (x) => { this.lista.set(x); this.motivos = x.flatMap((t) => t.detalles.map(() => '')); }, error: () => undefined }); }
  recibir(t: Traspaso): void {
    const lineas = t.detalles.map((d) => ({ variante_producto_id: d.variante_producto_id, cantidad_recibida: Number(d.cantidad_recibida ?? d.cantidad), cantidad_merma: Number(d.cantidad_merma ?? 0) }));
    const sumaOk = lineas.every((l, i) => (l.cantidad_recibida + l.cantidad_merma) === t.detalles[i].cantidad);
    if (!sumaOk) return;
    this.api.recibir(t.id!, { accion: 'RECIBIR', lineas }).subscribe({ next: () => this.cargar() });
  }
  rechazar(t: Traspaso): void {
    const lineas = t.detalles.map((d, i) => ({ variante_producto_id: d.variante_producto_id, cantidad_recibida: Number(d.cantidad_recibida ?? 0), motivo: this.motivos[i] || 'Rechazado por sucursal' }));
    this.api.rechazar(t.id!, { lineas, motivo: 'Rechazo parcial' }).subscribe({ next: () => this.cargar() });
  }
}
