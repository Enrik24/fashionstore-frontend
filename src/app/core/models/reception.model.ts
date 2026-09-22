export interface RecepcionItemCreateDto {
  variante_producto_id: number;
  cantidad: number;
  costo_unitario?: number;
}

export interface RecepcionCreateDto {
  proveedor_id: number;
  sucursal_id: number;
  nro_factura?: string;
  observaciones?: string;
  items: RecepcionItemCreateDto[];
}

export interface RecepcionDetalleItem {
  id: number;
  variante_producto_id: number;
  cantidad: number;
  costo_unitario?: number | null;
  sku_variante?: string | null;
  producto_nombre?: string | null;
}

export interface Recepcion {
  id: number;
  numero: string;
  proveedor_id: number;
  sucursal_id: number;
  fecha_hora: string;
  nro_factura?: string | null;
  observaciones?: string | null;
  total_unidades: number;
  total_costo: number;
  proveedor_nombre?: string | null;
  sucursal_nombre?: string | null;
  detalles: RecepcionDetalleItem[];
}
