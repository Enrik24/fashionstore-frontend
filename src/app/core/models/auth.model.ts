export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginCredentials {
  correo: string;
  contrasena: string;
}

export interface RegisterClientData {
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  nit_ci: string;
  direccion_envio?: string;
  contrasena: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  token: string | null;
}

export interface UserProfile {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  estado: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
  fecha_registro: string;
  ultimo_acceso?: string;
  roles: { id: number; nombre: string; descripcion?: string }[];
  sucursal_id?: number;
  sucursal_nombre?: string;
}
