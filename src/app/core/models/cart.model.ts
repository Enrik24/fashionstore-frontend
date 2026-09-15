import { Producto, VarianteProducto } from './catalog.model';
import { Sucursal } from './branch.model';

export type TipoCupon = 'PORCENTAJE' | 'MONTO_FIJO';
export type EstadoCupon = 'ACTIVO' | 'INACTIVO' | 'AGOTADO' | 'EXPIRADO';
export type EstadoCarrito = 'ACTIVO' | 'ABANDONADO' | 'CONVERTIDO';
export type TipoOrden = 'DIGITAL' | 'PRESENCIAL';
export type EstadoOrden = 'PENDIENTE' | 'CONFIRMADA' | 'EN_PREPARACION' | 'ENVIADA' | 'ENTREGADA' | 'CANCELADA';
export type TipoComprobante = 'FACTURA' | 'RECIBO';
export type MetodoPagoPresencial = 'EFECTIVO' | 'TARJETA_POS' | 'QR';

export interface Cupon {
  id: number;
  codigo: string;
  tipo: TipoCupon;
  valor: number;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin: string;
  usos_maximos?: number;
  usos_actuales?: number;
  monto_minimo?: number;
  estado: EstadoCupon;
}

export interface AplicarCuponRequest {
  codigo: string;
}

export interface CuponValidacionResponse {
  valido: boolean;
  mensaje: string;
  cupon?: Cupon;
  descuento_calculado?: number;
}

export interface VarianteResumen {
  id: number;
  sku_variante: string;
  producto_id: number;
  precio_variante?: number;
  producto?: Producto;
  talla?: { id: number; nombre?: string; valor?: string };
  color?: { id: number; nombre: string; codigo_hex?: string };
}

export interface ItemCarrito {
  id: number;
  carrito_id: number;
  variante_producto_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  variante_producto?: VarianteResumen;
}

export interface ItemCarritoCreate {
  variante_producto_id: number;
  cantidad: number;
}

export interface ItemCarritoUpdate {
  cantidad: number;
}

export interface Carrito {
  id: number;
  cliente_id: number;
  fecha_creacion: string;
  estado: EstadoCarrito;
  cupon_id?: number;
  descuento_aplicado: number;
  items: ItemCarrito[];
  subtotal: number;
  total: number;
  cupon?: Cupon;
}

export interface DetalleOrden {
  id: number;
  orden_id: number;
  variante_producto_id?: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  variante_producto?: VarianteResumen;
}

export interface Comprobante {
  id: number;
  numero: string;
  tipo: TipoComprobante;
  fecha_emision: string;
  monto_total: number;
  archivo_pdf?: string;
  orden_id: number;
}

export interface Orden {
  id: number;
  numero_orden: string;
  cliente_id?: number;
  sucursal_id?: number;
  fecha: string;
  tipo: TipoOrden;
  estado: EstadoOrden;
  total: number;
  impuestos: number;
  descuentos: number;
  cupon_id?: number;
  direccion_envio?: string;
  detalles: DetalleOrden[];
  comprobante?: Comprobante;
}

export interface OrdenCreateFromCarrito {
  sucursal_id?: number;
  direccion_envio?: string;
  tipo?: TipoOrden;
}

export interface DetalleVentaPresencialCreate {
  variante_producto_id: number;
  cantidad: number;
  precio_unitario?: number;
}

export interface VentaPresencialCreate {
  sucursal_id: number;
  cliente_id?: number;
  nit_ci_cliente?: string;
  metodo_pago: MetodoPagoPresencial;
  detalles: DetalleVentaPresencialCreate[];
  cupon_codigo?: string;
}

export interface VentaPresencial {
  id: number;
  orden_id?: number;
  cajero_id?: number;
  sucursal_id: number;
  cliente_id?: number;
  fecha: string;
  metodo_pago: MetodoPagoPresencial;
  orden?: Orden;
}
