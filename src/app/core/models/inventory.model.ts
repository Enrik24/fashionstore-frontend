import { Producto, VarianteProducto } from './catalog.model';
import { Sucursal } from './branch.model';

export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'VENTA' | 'RESERVA' | 'DEVOLUCION' | 'TRANSFERENCIA';
export type EstadoInventario = 'DISPONIBLE' | 'BAJO_STOCK' | 'AGOTADO';

/** Variante con producto anidado, tal como lo devuelve VarianteProductoDetalleResponse */
export interface VarianteConProducto extends VarianteProducto {
  producto?: Producto;
}

export interface Inventario {
  id: number;
  /** Campo que devuelve el backend (variante_producto_id) */
  variante_producto_id: number;
  sucursal_id: number;
  cantidad: number;
  cantidad_reservada: number;
  cantidad_vendida: number;
  cantidad_disponible: number;
  stock_minimo: number;
  /** Objeto anidado: variante_producto con talla, color y producto dentro */
  variante_producto?: VarianteConProducto;
  sucursal?: Sucursal;
  estado?: EstadoInventario;
}

export interface InventarioUpdateDto {
  cantidad: number;
}

export interface MovimientoInventario {
  id: number;
  inventario_id: number;
  tipo: TipoMovimiento;
  cantidad: number;
  cantidad_anterior: number;
  cantidad_posterior: number;
  motivo: string;
  fecha: string;
  usuario_id?: number;
  inventario?: Inventario;
}

export interface MovimientoInventarioCreateDto {
  inventario_id: number;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo: string;
}
