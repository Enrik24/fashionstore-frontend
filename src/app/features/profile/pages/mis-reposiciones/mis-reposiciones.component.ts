import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReturnsApiService } from '../../../../core/services/returns-api.service';
import { SolicitudDevolucion } from '../../../../core/models/return.model';

/**
 * [EXAMEN-2] CU18: reposiciones del cliente con nota descargable.
 */
@Component({
  selector: 'app-mis-reposiciones',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section>
      <header><span class="eyebrow">CU18 · Mis reposiciones</span><h1>Mis reposiciones</h1></header>
      @for (r of lista(); track r.id) {
        <div class="card">
          <strong>{{ r.numero_reposicion || r.numero_solicitud }}</strong> · {{ r.estado }} · {{ r.fecha_solicitud }}
          <p>Diferencia {{ r.diferencia_precio }} ({{ r.tipo_diferencia }}) · Saldo a favor {{ r.saldo_favor }}</p>
          @if (r.nota_reposicion_url) { <button type="button" class="btn btn-sm btn-outline" (click)="descargar(r)">Descargar nota de reposición</button> } @else { <span>Nota no disponible</span> }
        </div>
      } @empty { <p>Sin reposiciones.</p> }
    </section>
  `,
  styles: [`.card{background:#fff;border:1px solid var(--border-color);border-radius:12px;padding:1rem;margin:.6rem 0}`]
})
export class MisReposicionesComponent implements OnInit {
  private api = inject(ReturnsApiService);
  lista = signal<SolicitudDevolucion[]>([]);
  ngOnInit(): void { this.api.listarReposiciones().subscribe({ next: (x) => this.lista.set(x), error: () => undefined }); }
  descargar(r: SolicitudDevolucion): void { this.api.descargarNotaReposicion(r.id).subscribe({ next: (blob) => { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = `nota-reposicion-${r.id}.pdf`; a.click(); URL.revokeObjectURL(u); } }); }
}
