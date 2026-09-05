import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  Inventario, 
  InventarioUpdateDto, 
  MovimientoInventario, 
  MovimientoInventarioCreateDto 
} from '../models/inventory.model';

@Injectable({
  providedIn: 'root'
})
export class InventoryApiService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/inventario`;

  getGlobalInventory(
    skip: number = 0, 
    limit: number = 100, 
    sucursalId?: number, 
    productoId?: number, 
    estado?: string
  ): Observable<Inventario[]> {
    let params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());

    if (sucursalId) params = params.set('sucursal_id', sucursalId.toString());
    if (productoId) params = params.set('producto_id', productoId.toString());
    if (estado) params = params.set('estado', estado);

    return this.http.get<Inventario[]>(`${this.API_URL}/`, { params });
  }

  getBranchInventory(sucursalId: number, skip: number = 0, limit: number = 100): Observable<Inventario[]> {
    const params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());

    return this.http.get<Inventario[]>(`${this.API_URL}/sucursal/${sucursalId}`, { params });
  }

  updateInventoryQuantity(inventarioId: number, cantidad: number, motivo: string): Observable<Inventario> {
    const params = new HttpParams().set('motivo', motivo);
    return this.http.put<Inventario>(`${this.API_URL}/${inventarioId}`, { cantidad }, { params });
  }

  registerMovement(movement: MovimientoInventarioCreateDto): Observable<MovimientoInventario> {
    return this.http.post<MovimientoInventario>(`${this.API_URL}/movimientos`, movement);
  }

  getMovements(
    skip: number = 0, 
    limit: number = 100, 
    inventarioId?: number, 
    tipo?: string
  ): Observable<MovimientoInventario[]> {
    let params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());

    if (inventarioId) params = params.set('inventario_id', inventarioId.toString());
    if (tipo) params = params.set('tipo', tipo);

    return this.http.get<MovimientoInventario[]>(`${this.API_URL}/movimientos`, { params });
  }

  getStockAlerts(): Observable<Inventario[]> {
    return this.http.get<Inventario[]>(`${this.API_URL}/alertas`);
  }
}
