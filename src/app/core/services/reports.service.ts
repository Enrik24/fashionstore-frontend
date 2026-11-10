import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ReporteVentas,
  ReporteVentasComparativo,
  ReporteInventario,
  ReporteReservas,
  ReporteClientes,
  ReporteFinanciero,
  KPIDashboard,
  KPIItem
} from '../models/report.model';
import { Sucursal } from '../models/branch.model';
import { FormatoExport, TipoReporteExport, ExportFiltros } from '../models/export.model';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;

  getSalesReport(fechaInicio?: string, fechaFin?: string, sucursalId?: number, incluirSerie: boolean = false): Observable<ReporteVentas> {
    let params = new HttpParams();
    if (fechaInicio) params = params.set('fecha_inicio', fechaInicio);
    if (fechaFin) params = params.set('fecha_fin', fechaFin);
    if (sucursalId) params = params.set('sucursal_id', sucursalId.toString());
    if (incluirSerie) params = params.set('incluir_serie', 'true');
    return this.http.get<ReporteVentas>(`${this.API_URL}/reportes/ventas`, { params });
  }

  exportSalesReportCsv(fechaInicio?: string, fechaFin?: string): Observable<Blob> {
    let params = new HttpParams().set('formato', 'CSV');
    if (fechaInicio) params = params.set('fecha_inicio', fechaInicio);
    if (fechaFin) params = params.set('fecha_fin', fechaFin);
    return this.http.get(`${this.API_URL}/reportes/ventas`, { params, responseType: 'blob' });
  }

  getInventoryReport(sucursalId?: number, limite: number = 500): Observable<ReporteInventario> {
    let params = new HttpParams().set('limite', limite.toString());
    if (sucursalId) params = params.set('sucursal_id', sucursalId.toString());
    return this.http.get<ReporteInventario>(`${this.API_URL}/reportes/inventario`, { params });
  }

  getReservationsReport(fechaInicio?: string, fechaFin?: string, sucursalId?: number): Observable<ReporteReservas> {
    let params = new HttpParams();
    if (fechaInicio) params = params.set('fecha_inicio', fechaInicio);
    if (fechaFin) params = params.set('fecha_fin', fechaFin);
    if (sucursalId) params = params.set('sucursal_id', sucursalId.toString());
    return this.http.get<ReporteReservas>(`${this.API_URL}/reportes/reservas`, { params });
  }

  getClientsReport(sucursalId?: number): Observable<ReporteClientes> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursal_id', sucursalId.toString());
    return this.http.get<ReporteClientes>(`${this.API_URL}/reportes/clientes`, { params });
  }

  getFinancialReport(fechaInicio?: string, fechaFin?: string, sucursalId?: number): Observable<ReporteFinanciero> {
    let params = new HttpParams();
    if (fechaInicio) params = params.set('fecha_inicio', fechaInicio);
    if (fechaFin) params = params.set('fecha_fin', fechaFin);
    if (sucursalId) params = params.set('sucursal_id', sucursalId.toString());
    return this.http.get<ReporteFinanciero>(`${this.API_URL}/reportes/financiero`, { params });
  }

  getKpiDashboard(): Observable<KPIDashboard> {
    return this.http.get<KPIDashboard>(`${this.API_URL}/kpis/dashboard`);
  }

  getKpis(): Observable<KPIItem[]> {
    return this.http.get<KPIItem[]>(`${this.API_URL}/kpis`);
  }

  createKpi(kpi: Partial<KPIItem>): Observable<KPIItem> {
    return this.http.post<KPIItem>(`${this.API_URL}/kpis`, kpi);
  }

  updateKpi(id: number, kpi: Partial<KPIItem>): Observable<KPIItem> {
    return this.http.put<KPIItem>(`${this.API_URL}/kpis/${id}`, kpi);
  }

  calcDelta(actual: number, anterior: number): number {
    if (!anterior) return actual > 0 ? 100 : 0;
    return ((actual - anterior) / anterior) * 100;
  }

  getSalesReportComparativo(fechaInicio: string, fechaFin: string, sucursalId?: number): Observable<ReporteVentasComparativo> {
    const { inicioPrev, finPrev } = this.calcularPeriodoAnterior(fechaInicio, fechaFin);
    return forkJoin({
      actual: this.getSalesReport(fechaInicio, fechaFin, sucursalId),
      anterior: this.getSalesReport(inicioPrev, finPrev, sucursalId)
    }).pipe(
      map(({ actual, anterior }) => ({
        actual,
        anterior,
        deltaPct: {
          total_recaudado: this.calcDelta(actual.resumen.total_recaudado, anterior.resumen.total_recaudado),
          cantidad_pedidos_online: this.calcDelta(actual.resumen.cantidad_pedidos_online, anterior.resumen.cantidad_pedidos_online),
          cantidad_ventas_presenciales: this.calcDelta(actual.resumen.cantidad_ventas_presenciales, anterior.resumen.cantidad_ventas_presenciales),
          ticket_promedio: this.calcDelta(actual.resumen.ticket_promedio, anterior.resumen.ticket_promedio)
        }
      }))
    );
  }

  calcularPeriodoAnterior(inicio: string, fin: string): { inicioPrev: string; finPrev: string } {
    const d1 = new Date(inicio);
    const d2 = new Date(fin);
    const len = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
    const finPrev = new Date(d1.getTime() - 86400000);
    const inicioPrev = new Date(finPrev.getTime() - (len - 1) * 86400000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return { inicioPrev: iso(inicioPrev), finPrev: iso(finPrev) };
  }

  getSalesByBranch(fechaInicio: string, fechaFin: string, sucursales: Sucursal[]): Observable<{ nombre: string; total: number }[]> {
    if (!sucursales.length) return of([]);
    return forkJoin(
      sucursales.map(s =>
        this.getSalesReport(fechaInicio, fechaFin, s.id).pipe(
          map(r => ({ nombre: s.nombre, total: r.resumen.total_recaudado })),
          catchError(() => of({ nombre: s.nombre, total: 0 }))
        )
      )
    );
  }

  exportReport(tipo: TipoReporteExport, formato: FormatoExport, filtros: ExportFiltros = {}): Observable<Blob> {
    let params = new HttpParams().set('formato', formato);
    if (filtros.fechaInicio) params = params.set('fecha_inicio', filtros.fechaInicio);
    if (filtros.fechaFin) params = params.set('fecha_fin', filtros.fechaFin);
    if (filtros.sucursalId) params = params.set('sucursal_id', String(filtros.sucursalId));
    const path = tipo === 'kpis' ? `${this.API_URL}/kpis/export`
      : tipo === 'bitacora' ? `${this.API_URL}/bitacora/export`
      : `${this.API_URL}/reportes/${tipo}`;
    return this.http.get(path, { params, responseType: 'blob' });
  }

  getReportesGuardados(skip = 0, limit = 20): Observable<any[]> {
    const params = new HttpParams().set('skip', String(skip)).set('limit', String(limit));
    return this.http.get<any[]>(`${this.API_URL}/reportes/guardados`, { params });
  }

  saveSnapshot(titulo: string, tipo: string, filtros: ExportFiltros, formato = 'JSON'): Observable<any> {
    return this.http.post(`${this.API_URL}/reportes`, {
      titulo, tipo, formato,
      parametros: { fecha_inicio: filtros.fechaInicio, fecha_fin: filtros.fechaFin, sucursal_id: filtros.sucursalId }
    });
  }

  // ===== [EXAMEN-2] CU10/CU11: reportes generativos =====
  // El backend (ReporteSolicitudRequest) espera { texto, audio_base64, formato },
  // no { prompt, origen }. Enviar texto es lo que evita:
  //   422 {"detail":"La solicitud debe incluir texto o audio"}
  solicitarPorTexto(prompt: string, filtros?: { sucursal_id?: number | null; fecha_inicio?: string; fecha_fin?: string }): Observable<any> { return this.http.post<any>(`${this.API_URL}/reportes-ia/solicitar`, { texto: prompt, formato: 'PDF' }).pipe(map((r: any) => ({ ...r, id: r.solicitud_id ?? r.id, prompt_original: r.prompt ?? r.prompt_original ?? prompt }))); }
  solicitarPorVoz(audio: Blob): Observable<any> { const f = new FormData(); f.append('audio', audio); return this.http.post(`${this.API_URL}/reportes-ia/solicitar`, f); }
  interpretar(prompt: string): Observable<any> { return this.http.post(`${this.API_URL}/reportes-ia/interpretar`, { texto: prompt }); }
  ejecutar(solicitudId: number | string): Observable<any> { return this.http.post(`${this.API_URL}/reportes-ia/${solicitudId}/ejecutar`, {}); }
  historial(filtros: { skip?: number; limit?: number } = {}): Observable<any[]> { const p = new HttpParams().set('skip', String(filtros.skip ?? 0)).set('limit', String(filtros.limit ?? 50)); return this.http.get<any[]>(`${this.API_URL}/reportes-ia/historial`, { params: p }); }
  plantillasDisponibles(): Observable<any[]> { return this.http.get<Record<string, unknown>>(`${this.API_URL}/reportes-ia/plantillas`).pipe(map((r) => Array.isArray(r) ? r : (Array.isArray((r as { plantillas?: unknown })?.plantillas) ? (r as { plantillas: unknown[] }).plantillas as any[] : []))); }
  exportarReporte(solicitudId: number | string, formato: string): Observable<Blob> { return this.http.post(`${this.API_URL}/reportes-ia/${solicitudId}/exportar`, { formato }, { responseType: 'blob' }); }
}
