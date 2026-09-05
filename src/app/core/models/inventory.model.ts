import { Producto, VarianteProducto } from './catalog.model';
import { Sucursal } from './branch.model';

export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'VENTA' | 'RESERVA' | 'DEVOLUCION' | 'TRANSFERENCIA';
export type EstadoInventario = 'DISPONIBLE' | 'BAJO_STOCK' | 'AGOTADO';

export interface Inventario {
  id: number;
  variante_id: number;
  sucursal_id: number;
  cantidad: number;
  cantidad_reservada: number;
  cantidad_vendida: number;
  stock_minimo: number;
  stock_maximo?: number;
  variante?: VarianteProducto & { producto?: Producto };
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
