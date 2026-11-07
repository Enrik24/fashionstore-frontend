/**
 * [EXAMEN-2] Modelos de analítica e IA (CU10, CU11, CU12).
 */
export type EstadoReporteIA = 'PROCESANDO' | 'COMPLETADA' | 'AMBIGUA' | 'NO_SOPORTADA' | 'ERROR' | 'BLOQUEADA_POR_PLAN';
export type TipoVisualizacionReporte = 'TABLA' | 'BARRAS' | 'LINEAS' | 'CIRCULAR' | 'TEXTO';
export type FormatoExportacionIA = 'PDF' | 'EXCEL' | 'CSV' | 'JSON';
export type TipoModeloML = 'SUPERVISADO' | 'NO_SUPERVISADO';
export type EstadoModeloML = 'ENTRENADO' | 'ENTRENANDO' | 'OBSOLETO' | 'ERROR';

export interface SolicitudReporteIA {
  id?: number;
  prompt_original: string;
  origen?: 'TEXTO' | 'VOZ';
  estado: EstadoReporteIA;
  tipo_visualizacion?: TipoVisualizacionReporte | null;
  resultado_json?: Record<string, unknown> | null;
  columnas?: string[];
  filas?: Array<Record<string, unknown>>;
  filtros_aplicados?: Record<string, unknown>;
  tiempo_ms?: number | null;
  error_detalle?: string | null;
  query_sql_generada?: string | null;
  preguntas_aclaracion?: string[];
  fecha_ejecucion?: string;
  tenant_id?: number | null;
  usuario_id?: number | null;
}

export interface SolicitudReporteIARequest { prompt: string; origen?: 'TEXTO' | 'VOZ'; sucursal_id?: number | null; fecha_inicio?: string; fecha_fin?: string; }
export interface InterpretacionReporteRequest { prompt: string; }
export interface InterpretacionReporte { solicitud_id?: number; estado: EstadoReporteIA; filtros_sugeridos?: Record<string, unknown>; preguntas_aclaracion?: string[]; mensaje?: string; }
export type ResultadoReporteIA = SolicitudReporteIA;

export interface PlantillaReporte { id?: number | string; nombre: string; descripcion?: string; ejemplo_prompt?: string; }

export interface MetricasModelo { accuracy?: number | null; rmse?: number | null; silhouette?: number | null; precision?: number | null; recall?: number | null; f1?: number | null; [k: string]: number | string | null | undefined; }

export interface ModeloMachineLearning {
  id?: number;
  nombre: string;
  tipo: TipoModeloML;
  algoritmo?: string;
  version?: string;
  estado: EstadoModeloML;
  metricas_json?: MetricasModelo | null;
  fecha_entrenamiento?: string;
  tenant_id?: number | null;
}

export interface PrediccionVentas { periodo?: string; valores?: number[]; rmse?: number | null; accuracy?: number | null; mensaje?: string; }
export interface SegmentoClientes { segmento_id?: string; nombre?: string; cantidad_clientes?: number; silhouette?: number | null; }
export interface Anomalia { id?: number | string; fecha?: string; descripcion?: string; score?: number | null; severidad?: string; }
export interface DatasetSintetico { id?: number; nombre: string; filas?: number; fecha_creacion?: string; }

export interface KpiAnalitico { nombre: string; valor: number | string; unidad?: string; tendencia?: number | null; periodo?: string; }
export interface DashboardAnalitico { kpis: KpiAnalitico[]; prendas_repuestas?: number; monto_compensaciones?: number; generado_en?: string; desde_cache?: boolean; cacheado_en?: string; datos_insuficientes?: boolean; mensaje_datos_insuficientes?: string; tenant_id?: number | null; sucursal_id?: number | null; }
