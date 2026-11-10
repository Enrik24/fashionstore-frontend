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
    estado: (m.estado ?? 'ENTRENADO') as ModeloMachineLearning['estado'],
    metricas_json: (m.metricas as ModeloMachineLearning['metricas_json']) ?? m.metricas_json ?? null,
  };
}

/**
 * El endpoint vigente devuelve widgets por clave, no una lista `kpis`.
 * Esta adaptación conserva el contrato del frontend y evita que toda la
 * pantalla aparezca vacía aunque el backend sí tenga indicadores.
 */
function normalizarDashboard(d: any): DashboardAnalitico {
  const widgets = d?.widgets && typeof d.widgets === 'object' ? d.widgets : {};
  const kpis: KpiAnalitico[] = [];
  const agregar = (clave: string, nombre: string, valor: number | string, unidad?: string, tendencia?: number | null) => {
    kpis.push({ clave, nombre, valor, unidad, tendencia });
  };

  if (d?.widgets) {
    if (widgets.ventas_dia) agregar('ventas_dia', 'Ventas de hoy', widgets.ventas_dia.total ?? 0, 'Bs.', widgets.ventas_dia.variacion_pct);
    if (widgets.ventas_mes) agregar('ventas_mes', 'Ventas del mes', widgets.ventas_mes.actual?.total ?? 0, 'Bs.', widgets.ventas_mes.variacion_pct);
    if (widgets.stock_critico) agregar('stock_critico', 'Stock crítico', widgets.stock_critico.variantes ?? 0, 'variantes');
    if (widgets.reservas_pendientes) agregar('reservas_pendientes', 'Reservas pendientes', widgets.reservas_pendientes.reservas ?? 0, 'reservas');
    if (widgets.tasa_devoluciones) agregar('tasa_devoluciones', 'Tasa de devoluciones', widgets.tasa_devoluciones.tasa_pct ?? 0, '%');
    if (widgets.tasa_reposiciones) agregar('tasa_reposiciones', 'Tasa de reposiciones', widgets.tasa_reposiciones.tasa_pct ?? 0, '%');
    if (widgets.ticket_promedio) agregar('ticket_promedio', 'Ticket promedio', widgets.ticket_promedio.ticket_promedio ?? 0, 'Bs.');
  } else if (Array.isArray(d?.kpis)) {
    kpis.push(...d.kpis);
  }

  const suficientes = d?.datos_suficientes;
  return {
    ...d,
    kpis,
    desde_cache: d?.desde_cache ?? d?.cache ?? false,
    cacheado_en: d?.cacheado_en ?? d?.fecha_corte,
    ultima_actualizacion: d?.ultima_actualizacion ?? d?.fecha_corte,
    desactualizado: d?.desactualizado ?? false,
    actualizacion_automatica_segundos: d?.actualizacion_automatica_segundos ?? 300,
    datos_insuficientes: d?.datos_insuficientes ?? (suficientes ? !suficientes.suficientes : false),
    mensaje_datos_insuficientes: d?.mensaje_datos_insuficientes ?? (suficientes && !suficientes.suficientes
      ? `Se requiere al menos ${suficientes.minimo_meses ?? 3} meses de historial.`
      : undefined),
  };
}

/**
 * El backend responde { dataset_id, clientes, ventas, movimientos, creado_en, ... }
 * pero el modelo del frontend usa { id, nombre, filas, fecha_creacion }.
 * Sin esta normalización, `d.id` queda `undefined` y Sembrar/Eliminar envían
 * "undefined" → 404 `Dataset sintético no encontrado` (bug sembrar).
 */
function normalizarDataset(d: any): DatasetSintetico {
  const datasetId = d?.dataset_id ?? d?.id;
  return {
    ...d,
    id: datasetId,
    dataset_id: datasetId ? String(datasetId) : undefined,
    nombre: d?.nombre ?? (datasetId ? `dataset ${String(datasetId).slice(0, 8)}` : 'dataset'),
    filas: d?.filas ?? d?.ventas ?? d?.movimientos ?? 0,
    fecha_creacion: d?.fecha_creacion ?? d?.creado_en,
  };
}

/**
 * El backend responde con { solicitud_id, prompt, plantilla, parametros, sql, resultado, ... }
 * pero el modelo del frontend usa { id, prompt_original, ... }. Aquí se traduce para que
 * [routerLink]="['/admin/reportes-ia', r.id]" no navegue a "undefined" (422 int_parsing).
 */
function normalizarSolicitud(r: any): SolicitudReporteIA {
  const resultado = (r.resultado ?? r.resultado_json) as Array<Record<string, unknown>> | undefined;
  const filas = Array.isArray(resultado) ? (resultado as Array<Record<string, unknown>>) : [];
  const columnas = filas.length > 0 ? Object.keys(filas[0]) : (r.columnas as string[] | undefined);
  return {
    ...(r as unknown as SolicitudReporteIA),
    id: (r.solicitud_id ?? r.id) as number | undefined,
    prompt_original: (r.prompt_original ?? r.prompt ?? '') as string,
    estado: (r.estado ?? 'EJECUTADA') as SolicitudReporteIA['estado'],
    tiempo_ms: (r.tiempo_ms ?? null) as number | null,
    error_detalle: (r.error_detalle ?? null) as string | null,
    query_sql_generada: (r.query_sql_generada ?? r.sql ?? null) as string | null,
    filtros_aplicados: (r.filtros_aplicados ?? r.parametros ?? undefined) as Record<string, unknown> | undefined,
    resultado_json: (r.resultado_json ?? (r.resultado as Record<string, unknown> | null) ?? null) as Record<string, unknown> | null,
    tipo_visualizacion: (r.tipo_visualizacion ?? r.visualizacion ?? null) as SolicitudReporteIA['tipo_visualizacion'],
    preguntas_aclaracion: (r.preguntas_aclaracion ?? (r.pregunta ? [r.pregunta] : [])) as string[],
    filas,
    columnas,
    fecha_ejecucion: (r.fecha_ejecucion ?? r.fecha ?? undefined) as string | undefined,
  };
}

@Injectable({ providedIn: 'root' })
export class AnaliticaApiService {
  private http = inject(HttpClient);
  private readonly IA_URL = `${environment.apiUrl}/reportes-ia`;
  private readonly ANA_URL = `${environment.apiUrl}/analitica`;
  // El backend (ReporteSolicitudRequest / ReporteInterpretarRequest) espera { texto, audio_base64 }.
  solicitar(dto: SolicitudReporteIARequest): Observable<SolicitudReporteIA> { return this.http.post<Record<string, any>>(`${this.IA_URL}/solicitar`, { texto: dto.prompt, formato: 'PDF' }).pipe(map(normalizarSolicitud)); }
  interpretar(dto: InterpretacionReporteRequest): Observable<InterpretacionReporte> { return this.http.post<InterpretacionReporte>(`${this.IA_URL}/interpretar`, { texto: dto.prompt }); }
  ejecutar(solicitudId: number | string): Observable<SolicitudReporteIA> { return this.http.post<Record<string, any>>(`${this.IA_URL}/${solicitudId}/ejecutar`, {}).pipe(map(normalizarSolicitud)); }
  obtener(solicitudId: number | string): Observable<SolicitudReporteIA> { return this.http.get<Record<string, any>>(`${this.IA_URL}/${solicitudId}`).pipe(map(normalizarSolicitud)); }
  historial(skip = 0, limit = 50): Observable<SolicitudReporteIA[]> { const p = new HttpParams().set('skip', String(skip)).set('limit', String(limit)); return this.http.get<unknown>(`${this.IA_URL}/historial`, { params: p }).pipe(map((r) => (Array.isArray(r) ? (r as Record<string, any>[]).map(normalizarSolicitud) : []) )); }
  plantillas(): Observable<PlantillaReporte[]> {
    // El backend devuelve { plantillas: [...], descripcion } — hay que desenvolver.
    return this.http.get<unknown>(`${this.IA_URL}/plantillas`).pipe(
      map((r) => {
        if (Array.isArray(r)) return r as PlantillaReporte[];
        const obj = r as { plantillas?: unknown };
        return Array.isArray(obj?.plantillas) ? (obj.plantillas as PlantillaReporte[]) : [];
      })
    );
  }
  exportar(solicitudId: number | string, formato: string, includeLogo = true): Observable<{ archivo_id: string; nombre: string; formato: string; media_type: string; url_descarga: string }> { return this.http.post<{ archivo_id: string; nombre: string; formato: string; media_type: string; url_descarga: string }>(`${this.IA_URL}/${solicitudId}/exportar`, { formato }); }
  obtenerDashboard(filtros: { sucursal_id?: number | null; periodo?: string; fecha_inicio?: string; fecha_fin?: string } = {}): Observable<DashboardAnalitico> { let p = new HttpParams(); if (filtros.sucursal_id) p = p.set('sucursal_id', String(filtros.sucursal_id)); if (filtros.periodo) p = p.set('periodo', filtros.periodo); if (filtros.fecha_inicio) p = p.set('fecha_inicio', filtros.fecha_inicio); if (filtros.fecha_fin) p = p.set('fecha_fin', filtros.fecha_fin); return this.http.get<DashboardAnalitico>(`${this.ANA_URL}/dashboard`, { params: p }).pipe(map(normalizarDashboard)); }
  obtenerKpis(filtros: { sucursal_id?: number | null; periodo?: string } = {}): Observable<{ kpis: Record<string, unknown>; datos_suficientes: { suficientes?: boolean; meses?: number; ordenes?: number; minimo_meses?: number } }> { let p = new HttpParams(); if (filtros.sucursal_id) p = p.set('sucursal_id', String(filtros.sucursal_id)); if (filtros.periodo) p = p.set('periodo', filtros.periodo); return this.http.get<{ kpis: Record<string, unknown>; datos_suficientes: { suficientes?: boolean; meses?: number; ordenes?: number; minimo_meses?: number } }>(`${this.ANA_URL}/kpis`, { params: p }); }
  detalleKpi(kpi: string, filtros: { sucursal_id?: number | null; periodo?: string } = {}): Observable<Record<string, unknown>> { let p = new HttpParams(); if (filtros.sucursal_id) p = p.set('sucursal_id', String(filtros.sucursal_id)); if (filtros.periodo) p = p.set('periodo', filtros.periodo); return this.http.get<Record<string, unknown>>(`${this.ANA_URL}/kpis/${kpi}/detalle`, { params: p }); }
  ultimoConocido(filtros: { sucursal_id?: number | null; periodo?: string } = {}): Observable<DashboardAnalitico> { let p = new HttpParams(); if (filtros.sucursal_id) p = p.set('sucursal_id', String(filtros.sucursal_id)); if (filtros.periodo) p = p.set('periodo', filtros.periodo); return this.http.get<DashboardAnalitico>(`${this.ANA_URL}/dashboard/ultimo-conocido`, { params: p }).pipe(map(normalizarDashboard)); }
  entrenar(dto: { tipo?: string; objetivo?: string; parametros?: Record<string, unknown>; hiperparametros?: Record<string, unknown> }): Observable<ModeloMachineLearning> { return this.http.post<ModeloMachineLearning>(`${this.ANA_URL}/ml/entrenar`, { objetivo: dto.objetivo ?? 'VENTAS', hiperparametros: dto.hiperparametros ?? dto.parametros }).pipe(map(normalizarModelo)); }
  predecir(dto: { modelo_id: number; horizonte?: number }): Observable<PrediccionVentas> { return this.http.post<PrediccionVentas>(`${this.ANA_URL}/ml/predecir`, { modelo_id: dto.modelo_id, horizonte: dto.horizonte ?? 7 }); }
  // El backend devuelve { segmentos: [...], silhouette, ... } y { anomalias: [...] }.
  segmentar(dto: Record<string, unknown> = {}): Observable<SegmentoClientes[]> { return this.http.post<unknown>(`${this.ANA_URL}/ml/segmentar`, dto).pipe(map((r) => { const obj = r as any; const lista = Array.isArray(r) ? (r as any[]) : (Array.isArray(obj?.segmentos) ? (obj.segmentos as any[]) : []); return lista.map((s: any) => ({ segmento_id: String(s.segmento ?? s.segmento_id ?? ''), nombre: String(s.nombre ?? `Segmento ${Number(s.segmento ?? 0) + 1}`), cantidad_clientes: Number(s.clientes ?? s.cantidad_clientes ?? 0), silhouette: Number(s.silhouette ?? obj?.silhouette ?? 0), frecuencia_promedio: Number(s.frecuencia_promedio ?? 0), recencia_promedio_dias: Number(s.recencia_promedio_dias ?? 0), monto_promedio: Number(s.monto_promedio ?? 0), ticket_promedio: Number(s.ticket_promedio ?? 0) })); })); }
  anomalias(dto: Record<string, unknown> = {}): Observable<Anomalia[]> { return this.http.post<unknown>(`${this.ANA_URL}/ml/anomalias`, dto).pipe(map((r) => { const obj = r as any; const lista = Array.isArray(r) ? (r as any[]) : (Array.isArray(obj?.anomalias) ? (obj.anomalias as any[]) : []); return lista.map((a: any) => ({ id: a.orden_id ?? a.id, descripcion: (a.motivos?.[0] ?? a.descripcion ?? `Orden ${a.orden_id ?? ''}`) as string, fecha: a.fecha as string | undefined, monto: Number(a.monto ?? 0), sucursal_id: a.sucursal_id ?? null, motivos: Array.isArray(a.motivos) ? a.motivos : [] })); })); }
  listarModelos(): Observable<ModeloMachineLearning[]> { return this.http.get<{ modelos: ModeloMachineLearning[] }>(`${this.ANA_URL}/ml/modelos`).pipe(map((r) => (r.modelos ?? []).map(normalizarModelo))); }
  detalleModelo(id: number | string): Observable<ModeloMachineLearning> { return this.http.get<ModeloMachineLearning>(`${this.ANA_URL}/ml/modelos/${id}`).pipe(map(normalizarModelo)); }
  generarDataset(dto: Record<string, unknown>): Observable<DatasetSintetico> { return this.http.post<Record<string, unknown>>(`${this.ANA_URL}/datos-sinteticos/generar`, dto).pipe(map(normalizarDataset)); }
  listarDatasets(): Observable<DatasetSintetico[]> { return this.http.get<unknown>(`${this.ANA_URL}/datos-sinteticos`).pipe(map((r) => (Array.isArray(r) ? (r as Record<string, unknown>[]).map(normalizarDataset) : Array.isArray((r as { datasets?: unknown })?.datasets) ? ((r as { datasets: unknown[] }).datasets as Record<string, unknown>[]).map(normalizarDataset) : []))); }
  sembrarDataset(datasetId?: number | string | null): Observable<unknown> { const id = datasetId ?? null; return this.http.post(`${this.ANA_URL}/datos-sinteticos/sembrar`, id ? { dataset_id: String(id) } : {}); }
  eliminarDataset(datasetId: number | string): Observable<unknown> { return this.http.delete(`${this.ANA_URL}/datos-sinteticos/${datasetId}`); }
}
