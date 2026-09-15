import { Rol } from './role.model';

export type EstadoUsuario = 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';

export interface User {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  estado: EstadoUsuario;
  fecha_registro: string;
  ultimo_acceso?: string;
  roles?: Rol[];
}

export interface UserCreateDto {
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  contrasena: string;
  estado?: EstadoUsuario;
}

export interface UserUpdateDto {
  nombre?: string;
  apellido?: string;
  correo?: string;
  telefono?: string;
  estado?: EstadoUsuario;
}

export interface ClientProfile {
  id: number;
  nit_ci: string;
  direccion_envio?: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  fecha_registro: string;
}
