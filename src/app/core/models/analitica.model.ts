/**
 * [EXAMEN-2] Modelos de analítica e IA (CU10, CU11, CU12).
 */
export type EstadoReporteIA = 'PROCESANDO' | 'COMPLETADA' | 'EJECUTADA' | 'INTERPRETADA' | 'AMBIGUA' | 'NO_SOPORTADA' | 'ERROR' | 'BLOQUEADA_POR_PLAN';
export type TipoVisualizacionReporte = 'TABLA' | 'BARRAS' | 'LINEAS' | 'CIRCULAR' | 'TEXTO';
export type FormatoExportacionIA = 'PDF' | 'EXCEL' | 'CSV' | 'JSON';
export type TipoModeloML = 'SUPERVISADO' | 'NO_SUPERVISADO';
export type EstadoModeloML = 'ACTIVO' | 'ENTRENADO' | 'ENTRENANDO' | 'OBSOLETO' | 'ERROR' | 'INACTIVO';

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

export interface MetricasModelo { accuracy?: number | null; rmse?: number | null; silhouette?: number | null; precision?: number | null; recall?: number | null; f1?: number | null; r2?: number | null; mae?: number | null; mape?: number | null; calidad_baja?: boolean | null; mensaje?: string | null; [k: string]: number | string | boolean | null | undefined; }

export interface ModeloMachineLearning {
  id?: number;
  nombre: string;
  tipo: TipoModeloML;
  algoritmo?: string;
  objetivo?: string;
  version?: string;
  estado: EstadoModeloML;
  metricas_json?: MetricasModelo | null;
  fecha_entrenamiento?: string;
  tenant_id?: number | null;
}

export interface PrediccionVentas {
  periodo?: string;
  valores?: number[];
  modelo_id?: number | null;
  algoritmo?: string;
  horizonte?: number;
  predicciones?: Array<{ fecha: string; prediccion: number; limite_inferior?: number; limite_superior?: number }>;
  total_estimado?: number;
  intervalo_confianza?: number;
  rmse?: number | null;
  accuracy?: number | null;
  mensaje?: string;
}
export interface SegmentoClientes {
  segmento_id?: string;
  nombre?: string;
  cantidad_clientes?: number;
  silhouette?: number | null;
  frecuencia_promedio?: number;
  recencia_promedio_dias?: number;
  monto_promedio?: number;
  ticket_promedio?: number;
}
export interface Anomalia {
  id?: number | string;
  fecha?: string;
  descripcion?: string;
  score?: number | null;
  severidad?: string;
  monto?: number;
  sucursal_id?: number | null;
  motivos?: string[];
}
export interface DatasetSintetico { id?: number | string; dataset_id?: string; nombre: string; filas?: number; fecha_creacion?: string; clientes?: number; ventas?: number; movimientos?: number; sembrado?: boolean; creado_en?: string; configuracion?: Record<string, unknown>; validacion?: Record<string, unknown>; }

export interface KpiAnalitico { clave?: string; nombre: string; valor: number | string; unidad?: string; tendencia?: number | null; periodo?: string; }
export interface WidgetVentas { total?: number; ordenes?: number; }
export interface WidgetVentasMes { actual?: WidgetVentas; anterior?: WidgetVentas; variacion_pct?: number; }
export interface WidgetStockCritico { variantes?: number; }
export interface WidgetReservas { reservas?: number; }
export interface WidgetTasa { devoluciones?: number; reposiciones?: number; ventas?: number; tasa_pct?: number; }
export interface WidgetCompensaciones { monto_total?: number; monto_pendiente?: number; cantidad?: number; por_estado?: Record<string, { cantidad: number; monto: number }>; }
export interface WidgetPrenda { producto: string; talla?: string | null; color?: string | null; unidades: number; }
export interface DashboardAnalitico {
  /** Formato vigente del backend. */
  rol?: string;
  sucursal_id?: number | null;
  periodo?: string;
  widgets?: Record<string, unknown>;
  fecha_corte?: string;
  cache?: boolean;
  actualizacion_automatica_segundos?: number;
  desactualizado?: boolean;
  ultima_actualizacion?: string;
  datos_suficientes?: { suficientes?: boolean; meses?: number; ordenes?: number; minimo_meses?: number };
  /** Formato legado conservado por compatibilidad. */
  kpis?: KpiAnalitico[];
  prendas_repuestas?: number | WidgetPrenda[];
  monto_compensaciones?: number | WidgetCompensaciones;
  generado_en?: string;
  desde_cache?: boolean;
  cacheado_en?: string;
  datos_insuficientes?: boolean;
  mensaje_datos_insuficientes?: string;
  tenant_id?: number | null;
}
