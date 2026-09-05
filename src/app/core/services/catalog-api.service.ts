import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  Categoria, CategoriaCreateDto, 
  Talla, Color, Temporada, 
  Producto, ProductoCreateDto, ProductoUpdateDto, 
  VarianteProducto 
} from '../models/catalog.model';

@Injectable({
  providedIn: 'root'
})
export class CatalogApiService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;

  // Categorías
  getCategories(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.API_URL}/categorias/`);
  }

  createCategory(category: CategoriaCreateDto): Observable<Categoria> {
    return this.http.post<Categoria>(`${this.API_URL}/categorias/`, category);
  }

  // Tallas y Colores
  getSizes(tipo?: string): Observable<Talla[]> {
    let params = new HttpParams();
    if (tipo) params = params.set('tipo', tipo);
    return this.http.get<Talla[]>(`${this.API_URL}/tallas/`, { params });
  }

  getColors(): Observable<Color[]> {
    return this.http.get<Color[]>(`${this.API_URL}/colores/`);
  }

  // Temporadas
  getSeasons(): Observable<Temporada[]> {
    return this.http.get<Temporada[]>(`${this.API_URL}/temporadas/`);
  }

  // Productos
  getProducts(
    skip: number = 0, 
    limit: number = 50, 
    categoriaId?: number, 
    estado?: string, 
    temporadaId?: number, 
    proveedorId?: number, 
    buscar?: string
  ): Observable<Producto[]> {
    let params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());

    if (categoriaId) params = params.set('categoria_id', categoriaId.toString());
    if (estado) params = params.set('estado', estado);
    if (temporadaId) params = params.set('temporada_id', temporadaId.toString());
    if (proveedorId) params = params.set('proveedor_id', proveedorId.toString());
    if (buscar) params = params.set('buscar', buscar);

    return this.http.get<Producto[]>(`${this.API_URL}/productos/`, { params });
  }

  getProduct(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.API_URL}/productos/${id}`);
  }

  createProduct(product: ProductoCreateDto): Observable<Producto> {
    return this.http.post<Producto>(`${this.API_URL}/productos/`, product);
  }

  updateProduct(id: number, product: ProductoUpdateDto): Observable<Producto> {
    return this.http.put<Producto>(`${this.API_URL}/productos/${id}`, product);
  }

  deleteProduct(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/productos/${id}`);
  }

  getProductVariants(productId: number): Observable<VarianteProducto[]> {
    return this.http.get<VarianteProducto[]>(`${this.API_URL}/productos/${productId}/variantes`);
  }

  addVariant(productId: number, data: { talla_id: number; color_id: number; sku_variante?: string; precio_adicional?: number }, cantidadInicial: number = 0): Observable<VarianteProducto> {
    const params = new HttpParams().set('cantidad_inicial', cantidadInicial.toString());
    return this.http.post<VarianteProducto>(`${this.API_URL}/productos/${productId}/variantes`, data, { params });
  }
}
