import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AnaliticaApiService } from '../../../../core/services/analitica-api.service';
import { ExportService } from '../../../../core/services/export.service';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';
import { SolicitudReporteIA } from '../../../../core/models/analitica.model';

/**
 * [EXAMEN-2] CU10/CU11: detalle y exportación del reporte.
 */
@Component({
  selector: 'app-reporte-ia-detalle',
  standalone: true,
  imports: [CommonModule, StatusBadgePipe],
  template: `
    <section>
      <header><span class="eyebrow">CU10/CU11</span><h1>Detalle del reporte</h1></header>
      @if (detalle(); as d) {
        <div class="card">
          <p>“{{ d.prompt_original }}”</p>
          <span class="badge" [ngClass]="(d.estado | statusBadge).class">{{ (d.estado | statusBadge).label }}</span>
          <span>Generado en {{ d.tiempo_ms ?? 0 }} ms</span>
          @if (d.filtros_aplicados) { <div class="filtros"><strong>Filtros:</strong> {{ d.filtros_aplicados | json }}</div> }
          @if (d.preguntas_aclaracion?.length) { <div class="aviso"><strong>Requiere aclaración</strong> @for (p of d.preguntas_aclaracion; track p) { <p>{{ p }}</p> } </div> }
          @if (d.resultado_json) { <pre>{{ d.resultado_json | json }}</pre> }
          @if (d.filas?.length) { <table><thead><tr>@for (c of d.columnas ?? []; track c) { <th>{{ c }}</th> }</tr></thead><tbody>@for (f of d.filas; track $index) { <tr>@for (c of d.columnas ?? []; track c) { <td>{{ f[c] }}</td> }</tr> }</tbody></table> }
          <div class="export">
            <button type="button" class="btn btn-accent btn-sm" (click)="exportar('PDF')">Exportar PDF</button>
            <button type="button" class="btn btn-outline btn-sm" (click)="exportar('EXCEL')">Exportar Excel</button>
          </div>
        </div>
      } @else { <p>Cargando…</p> }
    </section>
  `,
  styles: [`.card{background:#fff;border:1px solid var(--border-color);border-radius:12px;padding:1rem} pre{white-space:pre-wrap;background:#f8fafc;padding:.5rem} table{width:100%;border-collapse:collapse} th,td{border:1px solid #e2e8f0;padding:.3rem} .export{display:flex;gap:.5rem;margin-top:.6rem} .aviso{background:#fffbeb;border:1px solid #fcd34d;padding:.5rem}`]
})
export class ReporteIaDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(AnaliticaApiService);
  private exp = inject(ExportService);
  detalle = signal<SolicitudReporteIA | null>(null);
  ngOnInit(): void { const id = this.route.snapshot.paramMap.get('solicitudId') ?? ''; if (id) this.api.obtener(id).subscribe({ next: (x) => this.detalle.set(x) }); }
  exportar(formato: string): void { const id = this.detalle()?.id; if (id !== undefined && id !== null) this.exp.descargarFormato(`${this.apiObtenerUrl(id)}/${formato}`, `reporte.${formato === 'PDF' ? 'pdf' : 'xlsx'}`); }
  private apiObtenerUrl(_id: number): string { return `${(this.api as any).IA_URL ?? ''}/reportes-ia/${_id}/exportar`; }
}
