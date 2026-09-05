export interface Permiso {
  id: number;
  nombre: string;
  descripcion?: string;
  modulo?: string;
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion?: string;
  permisos?: Permiso[];
}

export interface RolCreateDto {
  nombre: string;
  descripcion?: string;
}

export interface RolUpdateDto {
  nombre?: string;
  descripcion?: string;
}

export interface AsignarPermisosDto {
  permisos_ids: number[];
}
