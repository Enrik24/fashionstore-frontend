/**
 * Modelos de Promociones (CU24) — espejo de los esquemas del backend
 * (`app/apps/gestion_marketing/schemas.py`).
 */
export type TipoPromocion = 'PORCENTAJE' | 'MONTO_FIJO' | 'DOS_POR_UNO' | 'ENVIO_GRATIS';
export type EstadoPromocion = 'ACTIVA' | 'INACTIVA' | 'PROGRAMADA' | 'FINALIZADA';

export interface Promocion {
  id: number;
  nombre: string;
  descripcion?: string;
  tipo: TipoPromocion;
  valor?: number | null;
  fecha_inicio: string;
  fecha_fin: string;
  condiciones?: string;
  estado: EstadoPromocion;
  creado_por_id?: number | null;
  fecha_creacion?: string;
  producto_ids: number[];
  categoria_ids: number[];
  sucursal_ids: number[];
  advertencia?: string | null;
}

export interface PromocionCreateDto {
  nombre: string;
  descripcion?: string;
  tipo: TipoPromocion;
  valor?: number | null;
  fecha_inicio: string;
  fecha_fin: string;
  condiciones?: string;
  estado?: EstadoPromocion;
  producto_ids?: number[];
  categoria_ids?: number[];
  sucursal_ids?: number[];
}

export interface PromocionUpdateDto {
  nombre?: string;
  descripcion?: string;
  tipo?: TipoPromocion;
  valor?: number | null;
  fecha_inicio?: string;
  fecha_fin?: string;
  condiciones?: string;
  estado?: EstadoPromocion;
  producto_ids?: number[];
  categoria_ids?: number[];
  sucursal_ids?: number[];
}

export interface PromocionEstadoUpdateDto {
  estado: EstadoPromocion;
}

export interface PromocionFiltros {
  estado?: EstadoPromocion | '';
  tipo?: TipoPromocion | '';
  solo_vigentes?: boolean;
  skip?: number;
  limit?: number;
}

export interface PromocionPublica {
  id: number;
  nombre: string;
  descripcion?: string;
  tipo: TipoPromocion;
  valor?: number | null;
  fecha_inicio: string;
  fecha_fin: string;
  condiciones?: string;
  producto_ids: number[];
  categoria_ids: number[];
  sucursal_ids: number[];
}
