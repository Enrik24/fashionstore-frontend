export interface Ciudad {
  id: number;
  nombre: string;
  pais?: string;
  codigo_postal?: string;
}

export interface CiudadCreateDto {
  nombre: string;
  pais?: string;
  codigo_postal?: string;
}

export interface CiudadUpdateDto {
  nombre?: string;
  pais?: string;
  codigo_postal?: string;
}

export type EstadoSucursal = 'ACTIVO' | 'INACTIVO';

export interface Sucursal {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string;
  horario_atencion: string;
  estado: EstadoSucursal;
  ciudad_id: number;
  latitud?: number;
  longitud?: number;
  ciudad?: Ciudad;
}

export interface SucursalCreateDto {
  nombre: string;
  direccion: string;
  telefono: string;
  horario_atencion: string;
  ciudad_id: number;
  estado?: EstadoSucursal;
  latitud?: number;
  longitud?: number;
}

export interface SucursalUpdateDto {
  nombre?: string;
  direccion?: string;
  telefono?: string;
  horario_atencion?: string;
  ciudad_id?: number;
  estado?: EstadoSucursal;
  latitud?: number;
  longitud?: number;
}
