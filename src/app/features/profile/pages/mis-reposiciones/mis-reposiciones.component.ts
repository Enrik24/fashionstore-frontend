import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReturnsApiService } from '../../../../core/services/returns-api.service';
import { ToastService } from '../../../../core/services/toast.service';
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
          @if (r.estado === 'PENDIENTE' || r.estado === 'EN_REVISION') { <span>Nota disponible al completarse la reposición.</span> } @else { <button type="button" class="btn btn-sm btn-outline" (click)="descargar(r)"><i class="ri-file-pdf-line"></i> Descargar nota de reposición (PDF)</button> }
        </div>
      } @empty { <p>Sin reposiciones.</p> }
    </section>
  `,
  styles: [`.card{background:#fff;border:1px solid var(--border-color);border-radius:12px;padding:1rem;margin:.6rem 0}`]
})
export class MisReposicionesComponent implements OnInit {
  private api = inject(ReturnsApiService);
  private toast = inject(ToastService);
  lista = signal<SolicitudDevolucion[]>([]);
  ngOnInit(): void { this.api.listarReposiciones().subscribe({ next: (x) => this.lista.set(Array.isArray(x) ? x : ((x as unknown as { reposiciones?: SolicitudDevolucion[] })?.reposiciones ?? [])), error: () => this.lista.set([]) }); }
  descargar(r: SolicitudDevolucion): void { this.api.descargarNotaReposicion(r.id).subscribe({ next: (blob) => { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = `nota-reposicion-${r.id}.pdf`; a.click(); URL.revokeObjectURL(u); }, error: () => this.toast.error('No se pudo generar la nota de reposición.') }); }
}
