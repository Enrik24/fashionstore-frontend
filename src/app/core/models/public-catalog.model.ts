import { Producto } from './catalog.model';

export interface ProductoFilterParams {
  q?: string;
  categoria_id?: number;
  temporada_id?: number;
  precio_min?: number;
  precio_max?: number;
  talla_id?: number;
  color_id?: number;
  orden_por?: 'precio_asc' | 'precio_desc' | 'nombre' | 'recientes';
  pagina?: number;
  limite?: number;
}

export interface ProductoBusquedaResponse {
  items: Producto[];
  total: number;
  pagina: number;
  total_paginas: number;
}

export interface DisponibilidadSucursal {
  sucursal_id: number;
  sucursal_nombre: string;
  cantidad_disponible: number;
  cantidad_reservada: number;
  estado: string;
  latitud?: number | null;
  longitud?: number | null;
  direccion?: string | null;
  horario_atencion?: string | null;
}

export interface DisponibilidadProductoResponse {
  producto_id: number;
  producto_nombre: string;
  sku: string;
  talla?: string;
  color?: string;
  disponibilidad: DisponibilidadSucursal[];
}
