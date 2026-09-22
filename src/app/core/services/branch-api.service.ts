import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Ciudad, CiudadCreateDto, CiudadUpdateDto, Sucursal, SucursalCreateDto, SucursalUpdateDto } from '../models/branch.model';
import { Inventario } from '../models/inventory.model';

@Injectable({
  providedIn: 'root'
})
export class BranchApiService {
  private http = inject(HttpClient);
  private readonly API_CIUDADES_URL = `${environment.apiUrl}/ciudades`;
  private readonly API_SUCURSALES_URL = `${environment.apiUrl}/sucursales`;

  // Ciudades
  getCities(): Observable<Ciudad[]> {
    return this.http.get<Ciudad[]>(`${this.API_CIUDADES_URL}/`);
  }

  getCity(id: number): Observable<Ciudad> {
    return this.http.get<Ciudad>(`${this.API_CIUDADES_URL}/${id}`);
  }

  createCity(city: CiudadCreateDto): Observable<Ciudad> {
    return this.http.post<Ciudad>(`${this.API_CIUDADES_URL}/`, city);
  }

  updateCity(id: number, city: CiudadUpdateDto): Observable<Ciudad> {
    return this.http.put<Ciudad>(`${this.API_CIUDADES_URL}/${id}`, city);
  }

  deleteCity(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_CIUDADES_URL}/${id}`);
  }

  // Sucursales
  getBranches(skip: number = 0, limit: number = 100, ciudadId?: number, estado?: string): Observable<Sucursal[]> {
    let params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());

    if (ciudadId) params = params.set('ciudad_id', ciudadId.toString());
    if (estado) params = params.set('estado', estado);

    return this.http.get<Sucursal[]>(`${this.API_SUCURSALES_URL}/`, { params });
  }

  getBranch(id: number): Observable<Sucursal> {
    return this.http.get<Sucursal>(`${this.API_SUCURSALES_URL}/${id}`);
  }

  /**
   * Productos/variantes con existencias (inventario) de una sucursal.
   * Endpoint público GET /sucursales/{id}/productos (no requiere rol Administrador/Encargado,
   * por lo que puede ser usado por el cajero desde el POS).
   */
  getBranchProducts(sucursalId: number, skip: number = 0, limit: number = 100): Observable<Inventario[]> {
    const params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());

    return this.http.get<Inventario[]>(`${this.API_SUCURSALES_URL}/${sucursalId}/productos`, { params });
  }

  createBranch(branch: SucursalCreateDto): Observable<Sucursal> {
    return this.http.post<Sucursal>(`${this.API_SUCURSALES_URL}/`, branch);
  }

  updateBranch(id: number, branch: SucursalUpdateDto): Observable<Sucursal> {
    return this.http.put<Sucursal>(`${this.API_SUCURSALES_URL}/${id}`, branch);
  }

  deleteBranch(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_SUCURSALES_URL}/${id}`);
  }
}
