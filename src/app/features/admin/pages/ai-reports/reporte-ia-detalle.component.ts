import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnaliticaApiService } from '../../../../core/services/analitica-api.service';
import { ExportService } from '../../../../core/services/export.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';
import { SolicitudReporteIA } from '../../../../core/models/analitica.model';
import { environment } from '../../../../../environments/environment';

interface FiltroReporte {
  clave: string;
  valor: string;
}

/**
 * [EXAMEN-2] CU10/CU11: detalle y exportación del reporte.
 */
@Component({
  selector: 'app-reporte-ia-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgePipe],
  templateUrl: './reporte-ia-detalle.component.html',
  styleUrls: ['./reporte-ia-detalle.component.scss'],
})
export class ReporteIaDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(AnaliticaApiService);
  private exp = inject(ExportService);
  private toast = inject(ToastService);

  detalle = signal<SolicitudReporteIA | null>(null);
  cargando = signal(true);
  error = signal('');
  exportandoFormato = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('solicitudId');
    if (!id) {
      this.error.set('El identificador del reporte no es válido.');
      this.cargando.set(false);
      return;
    }

    this.api.obtener(id).subscribe({
      next: (reporte) => {
        this.detalle.set(reporte);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el reporte solicitado.');
        this.cargando.set(false);
      },
    });
  }

  filtros(reporte: SolicitudReporteIA): FiltroReporte[] {
    return Object.entries(reporte.filtros_aplicados ?? {}).map(([clave, valor]) => ({
      clave: this.nombreLegible(clave),
      valor: this.formatoValor(valor),
    }));
  }

  nombreLegible(columna: string): string {
    const nombres: Record<string, string> = {
      producto: 'Producto',
      sucursal: 'Sucursal',
      disponible: 'Disponible',
      minimo: 'Mínimo',
      total: 'Total',
      fecha: 'Fecha',
      cantidad: 'Cantidad',
      ventas: 'Ventas',
      clientes: 'Clientes',
    };
    const legible = nombres[columna.toLowerCase()] ?? columna.replace(/_/g, ' ');
    return legible.charAt(0).toUpperCase() + legible.slice(1);
  }

  valorCelda(fila: Record<string, unknown>, columna: string): string {
    return this.formatoValor(fila[columna]);
  }

  puedeExportar(): boolean {
    const estado = this.detalle()?.estado;
    return estado === 'EJECUTADA' || estado === 'COMPLETADA';
  }

  exportar(formato: string): void {
    const id = this.detalle()?.id;
    if (id == null || !this.puedeExportar() || this.exportandoFormato()) return;

    this.exportandoFormato.set(formato);
    this.api.exportar(id, formato).subscribe({
      next: (meta) => {
        const url = meta.url_descarga;
        const nombre = meta.nombre ?? `reporte.${formato === 'PDF' ? 'pdf' : formato === 'HTML' ? 'html' : 'xlsx'}`;
        if (!url) {
          this.exportandoFormato.set(null);
          this.toast.error('El backend no devolvió un archivo para descargar.');
          return;
        }

        const origen = new URL(environment.apiUrl).origin;
        const absoluta = url.startsWith('http')
          ? url
          : `${origen}${url.startsWith('/') ? '' : '/'}${url}`;
        this.exp.descargarFormato(absoluta, nombre);
        this.exportandoFormato.set(null);
      },
      error: () => {
        this.exportandoFormato.set(null);
        this.toast.error('No se pudo generar el archivo de exportación.');
      },
    });
  }

  private formatoValor(valor: unknown): string {
    if (valor === null || valor === undefined || valor === '') return 'Todos';
    if (Array.isArray(valor)) return valor.length ? valor.join(', ') : 'Todos';
    if (typeof valor === 'object') return JSON.stringify(valor);
    return String(valor);
  }
}
