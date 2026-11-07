import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CrearPagoDiferidoRequest,
  EventoStripe,
  PagoDiferido,
  ReembolsoRequest,
  ResultadoPagoDiferido,
  ResultadoReembolso
} from '../models/pago-diferido.model';

export interface FiltrosPagosDiferidos {
  estado?: string;
  desde?: string;
  hasta?: string;
  skip?: number;
  limit?: number;
}

export interface ConteoPagosPendientes {
  tenant_id?: number;
  pendientes: number;
}

/**
 * [EXAMEN-2] CU16: HTTP contra `/pagos/diferidos/*`, reembolsos y eventos de Stripe.
 * Los `POST` llevan `Idempotency-Key` por el interceptor global.
 */
@Injectable({ providedIn: 'root' })
export class PagosDiferidosApiService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/pagos`;

  crearPago(datos: CrearPagoDiferidoRequest): Observable<ResultadoPagoDiferido> {
    return this.http.post<ResultadoPagoDiferido>(`${this.API_URL}/diferidos`, datos);
  }

  obtenerPago(uuidPago: string): Observable<ResultadoPagoDiferido> {
    return this.http.get<ResultadoPagoDiferido>(`${this.API_URL}/diferidos/${uuidPago}`);
  }

  confirmarPago(uuidPago: string): Observable<ResultadoPagoDiferido> {
    return this.http.post<ResultadoPagoDiferido>(
      `${this.API_URL}/diferidos/${uuidPago}/confirmar`,
      {}
    );
  }

  reintentarPago(uuidPago: string): Observable<ResultadoPagoDiferido> {
    return this.http.post<ResultadoPagoDiferido>(
      `${this.API_URL}/diferidos/${uuidPago}/reintentar`,
      {}
    );
  }

  cancelarPago(uuidPago: string): Observable<ResultadoPagoDiferido> {
    return this.http.post<ResultadoPagoDiferido>(
      `${this.API_URL}/diferidos/${uuidPago}/cancelar`,
      {}
    );
  }

  listarPagos(filtros: FiltrosPagosDiferidos = {}): Observable<PagoDiferido[]> {
    let params = new HttpParams();
    if (filtros.estado) params = params.set('estado', filtros.estado);
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);
    if (filtros.skip != null) params = params.set('skip', String(filtros.skip));
    if (filtros.limit != null) params = params.set('limit', String(filtros.limit));
    return this.http.get<PagoDiferido[]>(`${this.API_URL}/diferidos`, { params });
  }

  contarPendientes(): Observable<ConteoPagosPendientes> {
    return this.http.get<ConteoPagosPendientes>(`${this.API_URL}/pendientes/count`);
  }

  reembolsar(pagoId: number, datos: ReembolsoRequest = {}): Observable<ResultadoReembolso> {
    return this.http.post<ResultadoReembolso>(`${this.API_URL}/${pagoId}/reembolsar`, {
      monto: datos.monto ?? null,
      motivo: datos.motivo ?? null
    });
  }

  listarEventos(pagoId: number): Observable<EventoStripe[]> {
    return this.http.get<EventoStripe[]>(`${this.API_URL}/${pagoId}/eventos`);
  }
}
