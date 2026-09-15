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
}

export interface RecomendacionesRequest {
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
    return this.http.post<VoiceReportResponse>(`${this.API_URL}/inteligencia/reporte-voz`, { transcripcion });
  }
}
