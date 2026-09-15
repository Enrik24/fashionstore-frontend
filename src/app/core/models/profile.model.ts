export interface DireccionCliente {
  id?: number;
  direccion?: string;
  calle?: string;
  numero?: string;
  ciudad?: string;
  departamento?: string;
  codigo_postal?: string;
  pais?: string;
  referencia?: string;
  es_principal?: boolean;
}

export interface PreferenciasCliente {
  categorias_favoritas?: number[];
  estilos_preferidos?: string[];
  tallas_habituales?: string[];
  recibir_ofertas?: boolean;
  notificaciones_whatsapp?: boolean;
}

export interface ClientProfile {
  id: number;
  email: string;
  nombre: string;
  apellido?: string;
  telefono?: string;
  ci_nit?: string;
  fecha_nacimiento?: string;
  genero?: string;
  es_activo?: boolean;
  direccion?: DireccionCliente | string;
  preferencias?: PreferenciasCliente;
  created_at?: string;
}

export interface UpdateProfileDto {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  ci_nit?: string;
  fecha_nacimiento?: string;
  genero?: string;
  direccion?: string;
  ciudad?: string;
}

export interface ChangePasswordDto {
  password_actual: string;
  password_nuevo: string;
  confirmacion_password?: string;
}

export interface OrderHistoryItem {
  id: number;
  codigo?: string;
  numero_orden?: string;
  fecha?: string;
  created_at?: string;
  total: number;
  estado: string;
  metodo_pago?: string;
  tipo_entrega?: string;
  direccion_envio?: string;
  items?: Array<{
    id: number;
    producto_id?: number;
    nombre_producto: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    imagen_url?: string;
    talla?: string;
    color?: string;
  }>;
}

export interface ReservationHistoryItem {
  id: number;
  codigo_reserva: string;
  fecha_reserva: string;
  fecha_expiracion?: string;
  estado: string;
  sucursal_id?: number;
  sucursal_nombre?: string;
  total_estimado?: number;
  detalles?: Array<{
    id: number;
    producto_id: number;
    nombre_producto: string;
    cantidad: number;
    precio_unitario: number;
    talla?: string;
    color?: string;
    imagen_url?: string;
  }>;
}
