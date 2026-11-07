import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ReportsService } from './reports.service';
import { ToastService } from './toast.service';
import { FormatoExport, TipoReporteExport, ExportFiltros, exportFilename } from '../models/export.model';

@Injectable({ providedIn: 'root' })
export class ExportService {
  private http = inject(HttpClient);
  private reports = inject(ReportsService);
  private toast = inject(ToastService);

  // ===== [EXAMEN-2] CU11: descarga con progreso y archivos grandes =====
  descargarFormato(url: string, nombre?: string): void {
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = nombre ?? 'reporte'; a.click(); URL.revokeObjectURL(u); this.toast.success('Descarga completada', 'Archivo generado'); },
      error: () => this.toast.error('No se pudo descargar el reporte', 'Intenta de nuevo')
    });
  }
  progresoDescarga(url: string, onProgress?: (pct: number) => void): void {
    this.http.get(url, { responseType: 'blob' }).subscribe({ next: (blob) => { onProgress?.(100); const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = 'reporte'; a.click(); URL.revokeObjectURL(u); }, error: () => this.toast.error('No se pudo exportar', 'Intenta de nuevo') });
  }

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
