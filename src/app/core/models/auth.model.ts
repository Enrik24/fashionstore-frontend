export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  // [EXAMEN-2] Contexto multitenant devuelto por el backend.
  tenant_id?: number | null;
  es_super_admin?: boolean;
  roles?: string[];
  debe_cambiar_contrasena?: boolean;
  tenant?: {
    id: number;
    razon_social: string;
    nit?: string;
    logo_url?: string | null;
    moneda?: string;
    zona_horaria?: string;
    estado?: string;
    slug?: string;
  } | null;
  suscripcion?: {
    id?: number;
    plan_id?: number;
    plan?: string | null;
    estado?: string;
    estado_pago?: string;
    fecha_inicio?: string;
    fecha_vencimiento?: string;
  } | null;
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
  // [EXAMEN-2] Contexto SaaS y seguridad offline.
  tenant_id?: number | null;
  tenant_nombre?: string | null;
  es_super_admin?: boolean;
  offline_pin_configurado?: boolean;
  debe_cambiar_contrasena?: boolean;
}
