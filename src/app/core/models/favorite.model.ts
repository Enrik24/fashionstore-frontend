import { Producto } from './catalog.model';

/**
 * Modelos de Productos Favoritos (CU25) — espejo de
 * `app/apps/gestion_catalogo/schemas.py` (FavoritoResponse).
 */
export interface ProductoFavorito {
  id: number;
  cliente_id: number;
  producto_id: number;
  producto: Producto;
  disponible: boolean;
  fecha_agregado: string;
}

export interface FavoritoIdsResponse {
  producto_ids: number[];
}

export interface MoverFavoritoCarritoDto {
  variante_producto_id: number;
  cantidad?: number;
  quitar_de_favoritos?: boolean;
}

export interface MoverFavoritoCarritoResponse {
  mensaje: string;
  producto_id: number;
  variante_producto_id: number;
  cantidad: number;
}
