import { Proveedor } from './supplier.model';

export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  imagen_url?: string;
}

export interface CategoriaCreateDto {
  nombre: string;
  descripcion?: string;
  imagen_url?: string;
}

export interface Talla {
  id: number;
  valor: string;
  nombre?: string;
  tipo?: string;
  descripcion?: string;
}

export interface Color {
  id: number;
  nombre: string;
  codigo_hex?: string;
  imagen_muestra?: string;
}

export interface Temporada {
  id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  descripcion?: string;
}

export interface Coleccion {
  id: number;
  nombre: string;
  descripcion?: string;
  temporada_id?: number;
  imagen_url?: string;
  activa?: boolean;
  temporada?: Temporada;
}

export interface ColeccionCreateDto {
  nombre: string;
  descripcion?: string;
  temporada_id?: number;
  imagen_url?: string;
}


export type EstadoProducto = 'ACTIVO' | 'INACTIVO' | 'AGOTADO' | 'PROXIMO_INGRESO';

export interface VarianteProducto {
  id: number;
  producto_id: number;
  talla_id?: number | null;
  color_id: number;
  sku_variante?: string;
  precio_adicional?: number;
  talla?: Talla | null;
  color?: Color;
}

export interface Producto {
  id: number;
  sku: string;
  nombre: string;
  descripcion: string;
  precio: number;
  imagenes: string[];
  estado: EstadoProducto;
  categoria_id: number;
  temporada_id?: number;
  proveedor_id?: number;
  categoria?: Categoria;
  temporada?: Temporada;
  proveedor?: Proveedor;
  variantes?: VarianteProducto[];
  stock_total?: number;
}

export interface StockPorSucursalItem {
  sucursal_id: number;
  talla_id?: number | null;
  color_id?: number;
  cantidad: number;
}

export interface ProductoCreateDto {
  sku: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria_id: number;
  temporada_id?: number;
  proveedor_id?: number;
  imagenes?: string[];
  estado?: EstadoProducto;
  stock_por_sucursal?: StockPorSucursalItem[];
}

export interface ProductoUpdateDto {
  nombre?: string;
  descripcion?: string;
  precio?: number;
  categoria_id?: number;
  temporada_id?: number;
  proveedor_id?: number;
  imagenes?: string[];
  estado?: EstadoProducto;
}
