/**
 * [EXAMEN-2] Modelos de Tipo de Tela (CU04 / Punto 3).
 * Espejo de `TipoTelaBase`, `TipoTelaCreate`, `TipoTelaUpdate` y
 * `TipoTelaResponse` de `app/apps/gestion_catalogo/schemas.py`.
 *
 * `descripcion` se presenta en la interfaz como "composición sugerida".
 */
export type EstadoTipoTela = 'ACTIVO' | 'INACTIVO' | 'AGOTADO' | 'PROXIMO_INGRESO';

export interface TipoTela {
  id: number;
  tenant_id: number;
  nombre: string;
  descripcion?: string | null;
  cuidados_lavado?: string | null;
  estado?: EstadoTipoTela | null;
}

export interface TipoTelaCreate {
  nombre: string;
  descripcion?: string | null;
  cuidados_lavado?: string | null;
  estado?: EstadoTipoTela;
}

export type TipoTelaUpdate = Partial<TipoTelaCreate>;
