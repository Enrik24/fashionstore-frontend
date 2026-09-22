import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  productos_sugeridos?: any[];
  sugerencias_rapidas?: string[];
  tipo_respuesta?: string;
  accion?: string;
  datos_reporte?: any;
  formato_reporte?: string;
}

export interface RecomendacionesRequest {
  cliente_id?: number;
  preferencias?: string;
  categoria_id?: number;
  estilo?: string;
  ocasion?: string;
  limite?: number;
}

export interface RecomendacionesResponse {
  recomendaciones: any[];
  mensaje_personalizado?: string;
  estilo_detectado?: string;
}

export interface ChatResponse {
  respuesta: string;
  sugerencias?: string[];
  productos?: any[];
  productos_mencionados?: any[];
  tipo_respuesta?: string;
  accion?: string;
  datos_reporte?: any;
  formato_reporte?: string;
}

export interface VoiceReportRequest {
  transcripcion: string;
}

export interface VoiceReportResponse {
  tipo_reporte: string;
  periodo?: string;
  resumen?: string;
  datos: any;
}

export interface AudioTranscripcionResponse {
  transcripcion: string;
}

export interface TrendAnalysisResponse {
  tendencias_destacadas?: Array<{
    nombre: string;
    categoria: string;
    popularidad_score: number;
    descripcion: string;
  }>;
  prediccion_demanda?: Array<{
    categoria: string;
    crecimiento_esperado_pct: number;
    nivel: 'Alto' | 'Medio' | 'Bajo';
  }>;
  colores_en_tendencia?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;

  chat(mensaje: string, historial: Array<{ role: string; content: string }> = []): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.API_URL}/inteligencia/asistente-chat`, {
      mensaje,
      historial
    });
  }

  getRecommendations(params: RecomendacionesRequest): Observable<RecomendacionesResponse> {
    return this.http.post<RecomendacionesResponse>(`${this.API_URL}/inteligencia/recomendaciones`, params);
  }

  getTrends(): Observable<TrendAnalysisResponse> {
    return this.http.get<TrendAnalysisResponse>(`${this.API_URL}/inteligencia/tendencias`);
  }

  generateVoiceReport(transcripcion: string): Observable<VoiceReportResponse> {
    const url = `${this.API_URL}/inteligencia/reporte-voz`;
    const body = { transcripcion };
    console.log('[VOZ] POST reporte-voz -> URL:', url);
    console.log('[VOZ] POST reporte-voz -> BODY que se envia al backend:', body);
    console.log('[VOZ] POST reporte-voz -> transcripcion:', transcripcion);
    return this.http.post<VoiceReportResponse>(url, body);
  }

  /**
   * Descarga el reporte de compras del cliente autenticado en PDF, EXCEL o CSV.
   */
  exportClientPurchasesReport(formato: 'PDF' | 'EXCEL' | 'CSV' | 'HTML' = 'PDF'): Observable<Blob> {
    return this.http.get(`${this.API_URL}/cliente/reportes/compras/export?formato=${formato}`, {
      responseType: 'blob'
    });
  }

  /**
   * Descarga el reporte de reservas del cliente autenticado en PDF, EXCEL o CSV.
   */
  exportClientReservationsReport(formato: 'PDF' | 'EXCEL' | 'CSV' | 'HTML' = 'PDF'): Observable<Blob> {
    return this.http.get(`${this.API_URL}/cliente/reportes/reservas/export?formato=${formato}`, {
      responseType: 'blob'
    });
  }

  /**
   * Obtiene el resumen de compras y reservas del cliente para visualización rápida.
   */
  getClientReportsSummary(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/cliente/reportes/resumen`);
  }
}
