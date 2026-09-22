/**
 * Modelos de Valoraciones de producto (CU26) — espejo de
 * `app/apps/gestion_catalogo/schemas.py` (ValoracionResponse / PuedeValorarResponse).
 */
export type EstadoValoracion = 'PUBLICADA' | 'PENDIENTE_MODERACION' | 'RECHAZADA';

export interface Valoracion {
  id: number;
  producto_id: number;
  cliente_id: number;
  cliente_nombre: string;
  puntuacion: number;
  comentario?: string | null;
  estado: EstadoValoracion;
  fecha_creacion: string;
  fecha_actualizacion?: string | null;
}

export interface ValoracionCreateDto {
  puntuacion: number;
  comentario?: string | null;
}

export interface ValoracionUpdateDto {
  puntuacion?: number;
  comentario?: string | null;
}

export interface PuedeValorarResponse {
  puede_valorar: boolean;
  motivo?: string | null;
  valoracion_existente?: Valoracion | null;
}
