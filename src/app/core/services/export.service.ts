import { Injectable, inject } from '@angular/core';
import { ReportsService } from './reports.service';
import { ToastService } from './toast.service';
import { FormatoExport, TipoReporteExport, ExportFiltros, exportFilename } from '../models/export.model';

@Injectable({ providedIn: 'root' })
export class ExportService {
  private reports = inject(ReportsService);
  private toast = inject(ToastService);

  download(tipo: TipoReporteExport, formato: FormatoExport, filtros: ExportFiltros = {}): void {
    this.reports.exportReport(tipo, formato, filtros).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = exportFilename(tipo, formato);
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        this.toast.success(a.download, 'Exportación generada');
      },
      error: () => this.toast.error(`Reporte ${tipo} en ${formato}`, 'No se pudo exportar')
    });
  }
}
