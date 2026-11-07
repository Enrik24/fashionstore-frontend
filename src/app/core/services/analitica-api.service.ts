import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SolicitudReporteIA, SolicitudReporteIARequest, InterpretacionReporte, InterpretacionReporteRequest, PlantillaReporte, DashboardAnalitico, KpiAnalitico, ModeloMachineLearning, PrediccionVentas, SegmentoClientes, Anomalia, DatasetSintetico } from '../models/analitica.model';

/**
 * [EXAMEN-2] CU10/CU12: reportes IA, dashboard y ML.
 */
/** El backend serializa `metricas`; el modelo del frontend usa `metricas_json`. */
function normalizarModelo(m: ModeloMachineLearning & { metricas?: unknown }): ModeloMachineLearning {
  return {
    ...m,
    metricas_json: (m.metricas as ModeloMachineLearning['metricas_json']) ?? m.metricas_json ?? null,
  };
}

@Injectable({ providedIn: 'root' })
export class AnaliticaApiService {
  private http = inject(HttpClient);
  private readonly IA_URL = `${environment.apiUrl}/reportes-ia`;
  private readonly ANA_URL = `${environment.apiUrl}/analitica`;
  solicitar(dto: SolicitudReporteIARequest): Observable<SolicitudReporteIA> { return this.http.post<SolicitudReporteIA>(`${this.IA_URL}/solicitar`, dto); }
  interpretar(dto: InterpretacionReporteRequest): Observable<InterpretacionReporte> { return this.http.post<InterpretacionReporte>(`${this.IA_URL}/interpretar`, dto); }
  ejecutar(solicitudId: number | string): Observable<SolicitudReporteIA> { return this.http.post<SolicitudReporteIA>(`${this.IA_URL}/${solicitudId}/ejecutar`, {}); }
  obtener(solicitudId: number | string): Observable<SolicitudReporteIA> { return this.http.get<SolicitudReporteIA>(`${this.IA_URL}/${solicitudId}`); }
  historial(skip = 0, limit = 50): Observable<SolicitudReporteIA[]> { const p = new HttpParams().set('skip', String(skip)).set('limit', String(limit)); return this.http.get<SolicitudReporteIA[]>(`${this.IA_URL}/historial`, { params: p }); }
  plantillas(): Observable<PlantillaReporte[]> { return this.http.get<PlantillaReporte[]>(`${this.IA_URL}/plantillas`); }
  exportar(solicitudId: number | string, formato: string, includeLogo = true): Observable<Blob> { return this.http.post(`${this.IA_URL}/${solicitudId}/exportar`, { formato }, { responseType: 'blob' }); }
  obtenerDashboard(filtros: { sucursal_id?: number | null; fecha_inicio?: string; fecha_fin?: string } = {}): Observable<DashboardAnalitico> { let p = new HttpParams(); if (filtros.sucursal_id) p = p.set('sucursal_id', String(filtros.sucursal_id)); if (filtros.fecha_inicio) p = p.set('fecha_inicio', filtros.fecha_inicio); if (filtros.fecha_fin) p = p.set('fecha_fin', filtros.fecha_fin); return this.http.get<DashboardAnalitico>(`${this.ANA_URL}/dashboard`, { params: p }); }
  obtenerKpis(filtros: { sucursal_id?: number | null } = {}): Observable<KpiAnalitico[]> { let p = new HttpParams(); if (filtros.sucursal_id) p = p.set('sucursal_id', String(filtros.sucursal_id)); return this.http.get<KpiAnalitico[]>(`${this.ANA_URL}/kpis`, { params: p }); }
  detalleKpi(kpi: string, filtros: { sucursal_id?: number | null } = {}): Observable<Record<string, unknown>> { let p = new HttpParams(); if (filtros.sucursal_id) p = p.set('sucursal_id', String(filtros.sucursal_id)); return this.http.get<Record<string, unknown>>(`${this.ANA_URL}/kpis/${kpi}/detalle`, { params: p }); }
  entrenar(dto: { tipo?: string; parametros?: Record<string, unknown> }): Observable<ModeloMachineLearning> { return this.http.post<ModeloMachineLearning>(`${this.ANA_URL}/ml/entrenar`, dto); }
  predecir(dto: { periodo?: string }): Observable<PrediccionVentas> { return this.http.post<PrediccionVentas>(`${this.ANA_URL}/ml/predecir`, dto); }
  segmentar(dto: Record<string, unknown> = {}): Observable<SegmentoClientes[]> { return this.http.post<SegmentoClientes[]>(`${this.ANA_URL}/ml/segmentar`, dto); }
  anomalias(dto: Record<string, unknown> = {}): Observable<Anomalia[]> { return this.http.post<Anomalia[]>(`${this.ANA_URL}/ml/anomalias`, dto); }
  listarModelos(): Observable<ModeloMachineLearning[]> { return this.http.get<{ modelos: ModeloMachineLearning[] }>(`${this.ANA_URL}/ml/modelos`).pipe(map((r) => (r.modelos ?? []).map(normalizarModelo))); }
  detalleModelo(id: number | string): Observable<ModeloMachineLearning> { return this.http.get<ModeloMachineLearning>(`${this.ANA_URL}/ml/modelos/${id}`).pipe(map(normalizarModelo)); }
  generarDataset(dto: Record<string, unknown>): Observable<DatasetSintetico> { return this.http.post<DatasetSintetico>(`${this.ANA_URL}/datos-sinteticos/generar`, dto); }
  sembrarDataset(datasetId: number | string): Observable<unknown> { return this.http.post(`${this.ANA_URL}/datos-sinteticos/sembrar`, { dataset_id: String(datasetId) }); }
  eliminarDataset(datasetId: number): Observable<unknown> { return this.http.delete(`${this.ANA_URL}/datos-sinteticos/${datasetId}`); }
}
