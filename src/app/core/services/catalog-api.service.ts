import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  Categoria, CategoriaCreateDto, 
  Talla, Color, Temporada, Coleccion, ColeccionCreateDto,
  Producto, ProductoCreateDto, ProductoUpdateDto, 
  VarianteProducto 
} from '../models/catalog.model';

// DTOs para datos maestros
export interface TallaCreateDto { valor: string; tipo?: string; descripcion?: string; }
export interface ColorCreateDto { nombre: string; codigo_hex?: string; imagen_muestra?: string; }
export interface TemporadaCreateDto { nombre: string; fecha_inicio: string; fecha_fin: string; descripcion?: string; }
export interface UploadImageResponse {
  public_id: string;
  url: string;
  secure_url: string;
  format?: string;
  width?: number;
  height?: number;
}

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

  updateCategory(id: number, category: Partial<CategoriaCreateDto>): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.API_URL}/categorias/${id}`, category);
  }

  deleteCategory(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/categorias/${id}`);
  }

  getCategoryProducts(categoryId: number): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.API_URL}/categorias/${categoryId}/productos`);
  }

  // Tallas y Colores
  getSizes(tipo?: string): Observable<Talla[]> {
    let params = new HttpParams();
    if (tipo) params = params.set('tipo', tipo);
    return this.http.get<Talla[]>(`${this.API_URL}/tallas/`, { params });
  }

  createSize(data: TallaCreateDto): Observable<Talla> {
    return this.http.post<Talla>(`${this.API_URL}/tallas/`, data);
  }

  updateSize(id: number, data: Partial<TallaCreateDto>): Observable<Talla> {
    return this.http.put<Talla>(`${this.API_URL}/tallas/${id}`, data);
  }

  deleteSize(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/tallas/${id}`);
  }

  getColors(): Observable<Color[]> {
    return this.http.get<Color[]>(`${this.API_URL}/colores/`);
  }

  createColor(data: ColorCreateDto): Observable<Color> {
    return this.http.post<Color>(`${this.API_URL}/colores/`, data);
  }

  updateColor(id: number, data: Partial<ColorCreateDto>): Observable<Color> {
    return this.http.put<Color>(`${this.API_URL}/colores/${id}`, data);
  }

  deleteColor(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/colores/${id}`);
  }

  // Temporadas
  getSeasons(): Observable<Temporada[]> {
    return this.http.get<Temporada[]>(`${this.API_URL}/temporadas/`);
  }

  createSeason(data: TemporadaCreateDto): Observable<Temporada> {
    return this.http.post<Temporada>(`${this.API_URL}/temporadas/`, data);
  }

  updateSeason(id: number, data: Partial<TemporadaCreateDto>): Observable<Temporada> {
    return this.http.put<Temporada>(`${this.API_URL}/temporadas/${id}`, data);
  }

  deleteSeason(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/temporadas/${id}`);
  }

  getSeasonProducts(seasonId: number): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.API_URL}/temporadas/${seasonId}/productos`);
  }

  // Colecciones
  getCollections(): Observable<Coleccion[]> {
    return this.http.get<Coleccion[]>(`${this.API_URL}/colecciones/`);
  }

  getCollection(id: number): Observable<Coleccion> {
    return this.http.get<Coleccion>(`${this.API_URL}/colecciones/${id}`);
  }

  createCollection(data: ColeccionCreateDto): Observable<Coleccion> {
    return this.http.post<Coleccion>(`${this.API_URL}/colecciones/`, data);
  }

  updateCollection(id: number, data: Partial<ColeccionCreateDto>): Observable<Coleccion> {
    return this.http.put<Coleccion>(`${this.API_URL}/colecciones/${id}`, data);
  }

  deleteCollection(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/colecciones/${id}`);
  }

  getCollectionProducts(collectionId: number): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.API_URL}/colecciones/${collectionId}/productos`);
  }

  getProductCollections(productId: number): Observable<Coleccion[]> {
    return this.http.get<Coleccion[]>(`${this.API_URL}/productos/${productId}/colecciones`);
  }

  associateProductCollection(productId: number, coleccionId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_URL}/productos/${productId}/colecciones`, { coleccion_id: coleccionId });
  }

  removeProductCollection(productId: number, coleccionId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/productos/${productId}/colecciones/${coleccionId}`);
  }

  // Productos
  getProducts(
    skip: number = 0, 
    limit: number = 500, 
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

  // Carga de imágenes a Cloudinary
  uploadImage(file: File, folder: string = 'fashionstore/productos'): Observable<UploadImageResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const params = new HttpParams().set('folder', folder);
    return this.http.post<UploadImageResponse>(`${this.API_URL}/upload/imagen`, formData, { params });
  }

  deleteImage(publicId: string): Observable<{ success: boolean; message: string; public_id: string }> {
    const params = new HttpParams().set('public_id', publicId);
    return this.http.delete<{ success: boolean; message: string; public_id: string }>(`${this.API_URL}/upload/imagen`, { params });
  }
}

