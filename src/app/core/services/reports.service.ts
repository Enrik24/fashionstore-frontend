import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ReporteVentas,
  ReporteInventario,
  ReporteReservas,
  ReporteClientes,
  ReporteFinanciero,
  KPIDashboard,
  KPIItem
} from '../models/report.model';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;

  getSalesReport(fechaInicio?: string, fechaFin?: string, sucursalId?: number): Observable<ReporteVentas> {
    let params = new HttpParams();
    if (fechaInicio) params = params.set('fecha_inicio', fechaInicio);
    if (fechaFin) params = params.set('fecha_fin', fechaFin);
    if (sucursalId) params = params.set('sucursal_id', sucursalId.toString());
    return this.http.get<ReporteVentas>(`${this.API_URL}/reportes/ventas`, { params });
  }

  exportSalesReportCsv(fechaInicio?: string, fechaFin?: string): Observable<Blob> {
    let params = new HttpParams().set('formato', 'CSV');
    if (fechaInicio) params = params.set('fecha_inicio', fechaInicio);
    if (fechaFin) params = params.set('fecha_fin', fechaFin);
    return this.http.get(`${this.API_URL}/reportes/ventas`, { params, responseType: 'blob' });
  }

  getInventoryReport(sucursalId?: number): Observable<ReporteInventario> {
    let params = new HttpParams();
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

  getClientsReport(): Observable<ReporteClientes> {
    return this.http.get<ReporteClientes>(`${this.API_URL}/reportes/clientes`);
  }

  getFinancialReport(fechaInicio?: string, fechaFin?: string): Observable<ReporteFinanciero> {
    let params = new HttpParams();
    if (fechaInicio) params = params.set('fecha_inicio', fechaInicio);
    if (fechaFin) params = params.set('fecha_fin', fechaFin);
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
}
