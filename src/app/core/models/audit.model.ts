export interface BitacoraEntry {
  id: number;
  usuario_id?: number | null;
  usuario_nombre?: string | null;
  accion: string;
  modulo?: string | null;
  tabla_afectada?: string | null;
  registro_id?: number | null;
  ip_address?: string | null;
  ip_origen?: string | null;
  user_agent?: string | null;
  detalles?: string | null;
  valores_anteriores?: Record<string, any> | string | null;
  valores_nuevos?: Record<string, any> | string | null;
  fecha_hora?: string;
  created_at?: string;
}

export interface BitacoraFilter {
  skip?: number;
  limit?: number;
  usuario_id?: number;
  accion?: string;
  tabla?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
}
