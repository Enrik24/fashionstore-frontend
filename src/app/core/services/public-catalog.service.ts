import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Producto } from '../models/catalog.model';
import { 
  ProductoFilterParams, 
  ProductoBusquedaResponse, 
  DisponibilidadProductoResponse,
  DisponibilidadSucursal
} from '../models/public-catalog.model';

@Injectable({
  providedIn: 'root'
})
export class PublicCatalogService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/public`;

  getCatalog(params?: ProductoFilterParams): Observable<ProductoBusquedaResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.q) httpParams = httpParams.set('q', params.q);
      if (params.genero) httpParams = httpParams.set('genero', params.genero);
      if (params.categoria_id) httpParams = httpParams.set('categoria_id', params.categoria_id.toString());
      if (params.temporada_id) httpParams = httpParams.set('temporada_id', params.temporada_id.toString());
      if (params.coleccion_id) httpParams = httpParams.set('coleccion_id', params.coleccion_id.toString());
      if (params.precio_min !== undefined && params.precio_min !== null) httpParams = httpParams.set('precio_min', params.precio_min.toString());
      if (params.precio_max !== undefined && params.precio_max !== null) httpParams = httpParams.set('precio_max', params.precio_max.toString());
      if (params.talla_id) httpParams = httpParams.set('talla_id', params.talla_id.toString());
      if (params.color_id) httpParams = httpParams.set('color_id', params.color_id.toString());
      if (params.orden_por) {
        const backendSort = params.orden_por === 'recientes' ? 'fecha' : params.orden_por;
        httpParams = httpParams.set('orden_por', backendSort).set('ordenar_por', backendSort);
      }
      if (params.pagina) httpParams = httpParams.set('pagina', params.pagina.toString());
      if (params.limite) httpParams = httpParams.set('limite', params.limite.toString());
    }
    return this.http.get<ProductoBusquedaResponse>(`${this.API_URL}/catalogo`, { params: httpParams });
  }

  searchProducts(params?: ProductoFilterParams): Observable<ProductoBusquedaResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.q) httpParams = httpParams.set('q', params.q);
      if (params.genero) httpParams = httpParams.set('genero', params.genero);
      if (params.categoria_id) httpParams = httpParams.set('categoria_id', params.categoria_id.toString());
      if (params.temporada_id) httpParams = httpParams.set('temporada_id', params.temporada_id.toString());
      if (params.coleccion_id) httpParams = httpParams.set('coleccion_id', params.coleccion_id.toString());
      if (params.precio_min !== undefined && params.precio_min !== null) httpParams = httpParams.set('precio_min', params.precio_min.toString());
      if (params.precio_max !== undefined && params.precio_max !== null) httpParams = httpParams.set('precio_max', params.precio_max.toString());
      if (params.talla_id) httpParams = httpParams.set('talla_id', params.talla_id.toString());
      if (params.color_id) httpParams = httpParams.set('color_id', params.color_id.toString());
      if (params.orden_por) {
        const backendSort = params.orden_por === 'recientes' ? 'fecha' : params.orden_por;
        httpParams = httpParams.set('orden_por', backendSort).set('ordenar_por', backendSort);
      }
      if (params.pagina) httpParams = httpParams.set('pagina', params.pagina.toString());
      if (params.limite) httpParams = httpParams.set('limite', params.limite.toString());
    }
    return this.http.get<ProductoBusquedaResponse>(`${this.API_URL}/productos/buscar`, { params: httpParams });
  }

  getPopularProducts(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.API_URL}/productos/populares`);
  }

  getProductDetail(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.API_URL}/productos/${id}`);
  }

  getRelatedProducts(id: number): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.API_URL}/productos/${id}/relacionados`);
  }

  getProductAvailability(
    productId: number,
    tallaId?: number,
    colorId?: number
  ): Observable<DisponibilidadProductoResponse> {
    let params = new HttpParams();
    if (tallaId) params = params.set('talla_id', tallaId.toString());
    if (colorId) params = params.set('color_id', colorId.toString());
    return this.http.get<DisponibilidadProductoResponse>(`${this.API_URL}/disponibilidad/${productId}`, { params });
  }

  getProductAvailabilityByBranch(productId: number, branchId: number): Observable<DisponibilidadSucursal> {
    return this.http.get<DisponibilidadSucursal>(`${this.API_URL}/disponibilidad/${productId}/sucursal/${branchId}`);
  }

  getVariantStock(variantId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/stock/${variantId}`);
  }
}
