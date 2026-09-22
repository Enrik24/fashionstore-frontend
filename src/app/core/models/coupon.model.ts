export type TipoCupon = 'PORCENTAJE' | 'MONTO_FIJO';
export type EstadoCupon = 'ACTIVO' | 'INACTIVO' | 'AGOTADO' | 'EXPIRADO';

export interface Cupon {
  id: number;
  codigo: string;
  tipo: TipoCupon;
  valor: number;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin: string;
  usos_maximos?: number;
  usos_actuales: number;
  monto_minimo?: number;
  estado: EstadoCupon;
  creado_por_id?: number;
  fecha_creacion?: string;
  producto_ids?: number[];
  categoria_ids?: number[];
}

export interface CuponCreateDto {
  codigo: string;
  tipo: TipoCupon;
  valor: number;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin: string;
  usos_maximos?: number | null;
  monto_minimo?: number | null;
  estado: EstadoCupon;
  producto_ids?: number[];
  categoria_ids?: number[];
}

export interface CuponUpdateDto {
  codigo?: string;
  tipo?: TipoCupon;
  valor?: number;
  descripcion?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  usos_maximos?: number | null;
  monto_minimo?: number | null;
  estado?: EstadoCupon;
  producto_ids?: number[];
  categoria_ids?: number[];
}

export interface AplicarCuponRequest {
  codigo: string;
}

export interface ItemValidacionCupon {
  producto_id: number;
  categoria_id?: number | null;
  cantidad: number;
  precio_unitario: number;
}

export interface ValidarCuponRequest {
  codigo: string;
  items?: ItemValidacionCupon[];
}

export interface CuponValidacionResponse {
  valido: boolean;
  mensaje: string;
  cupon?: Cupon;
  descuento_calculado?: number;
}
