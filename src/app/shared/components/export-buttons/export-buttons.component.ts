import { Component, input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExportService } from '../../../core/services/export.service';
import { FormatoExport, TipoReporteExport, ExportFiltros } from '../../../core/models/export.model';

@Component({
  selector: 'app-export-buttons',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="export-group" role="group" [attr.aria-label]="'Exportar ' + tipo()">
      @for (f of formatos; track f) {
        <button class="btn btn-outline btn-sm" [disabled]="busy() === f" (click)="exportar(f)" [title]="'Exportar ' + f">
          @if (busy() === f) { <i class="ri-loader-4-line ri-spin"></i> } @else { <i class="ri-download-2-line"></i> }
          {{ f }}
        </button>
      }
    </div>
  `,
  styles: [`
    .export-group { display: flex; flex-wrap: wrap; gap: .4rem; }
  `]
})
export class ExportButtonsComponent {
  readonly tipo = input.required<TipoReporteExport>();
  readonly filtros = input<ExportFiltros>({});
  private exporter = inject(ExportService);
  protected readonly busy = signal<FormatoExport | null>(null);
  protected readonly formatos: FormatoExport[] = ['CSV', 'EXCEL', 'HTML', 'PDF'];

  protected exportar(f: FormatoExport): void {
    this.busy.set(f);
    this.exporter.download(this.tipo(), f, this.filtros());
    setTimeout(() => this.busy.set(null), 1500);
  }
}
