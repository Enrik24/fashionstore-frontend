/**
 * [EXAMEN-2] Modelos SaaS (CU01–CU04).
 * Espejo de `app/apps/gestion_saas/schemas.py` del backend.
 */
import { ConfiguracionOffline, PreferenciasOfflineUpdateDto } from './offline.model';

export type EstadoTenant = 'CONFIGURACION_INICIAL' | 'OPERATIVO' | 'SUSPENDIDO' | 'CANCELADO';
export type EstadoPlan = 'ACTIVO' | 'INACTIVO';
export type EstadoSuscripcion = 'ACTIVA' | 'SUSPENDIDA' | 'CANCELADA' | 'VENCIDA';
export type EstadoPagoSuscripcion =
  | 'PENDIENTE'
  | 'CONFIRMADO'
  | 'RECHAZADO'
  | 'REEMBOLSADO'
  | 'EN_PROCESO'
  | 'EXPIRADO'
  | 'CANCELADO';

export interface Tenant {
  id: number;
  razon_social: string;
  nit: string;
  direccion_fiscal: string;
  correo_contacto: string;
  telefono?: string | null;
  logo_url?: string | null;
  moneda: string;
  zona_horaria: string;
  estado: EstadoTenant;
  slug: string;
  fecha_registro?: string | null;
  fecha_baja?: string | null;
}

export interface TenantCreateDto {
  razon_social: string;
  nit: string;
  direccion_fiscal: string;
  correo_contacto: string;
  telefono?: string;
  slug?: string;
  moneda?: string;
  zona_horaria?: string;
  plan_id?: number | null;
  admin_nombre: string;
  admin_apellido: string;
  admin_correo: string;
  admin_contrasena: string;
}

export interface TenantUpdateDto {
  razon_social?: string;
  nit?: string;
  direccion_fiscal?: string;
  correo_contacto?: string;
  telefono?: string;
  logo_url?: string;
  moneda?: string;
  zona_horaria?: string;
}

export interface TenantEstadoUpdateDto {
  estado: EstadoTenant;
  motivo?: string;
}

export interface UsoTenant {
  tenant_id: number;
  sucursales_actuales: number;
  max_sucursales: number;
  usuarios_actuales: number;
  productos_actuales: number;
  max_usuarios?: number | null;
  max_productos?: number | null;
  backups_mes_actual: number;
  max_backups_manuales?: number | null;
}

export interface TenantDetalle extends Tenant {
  suscripcion?: Suscripcion | null;
  uso?: UsoTenant | null;
}

export interface ListadoTenants {
  total: number;
  items: Tenant[];
}

export interface Plan {
  id: number;
  nombre: string;
  descripcion?: string | null;
  precio_mensual: number;
  max_sucursales: number;
  permite_reportes_ia: boolean;
  permite_pago_diferido: boolean;
  estado: EstadoPlan;
  orden: number;
  soporte_prioritario: boolean;
  max_usuarios?: number | null;
  max_productos?: number | null;
  backup_automatico: boolean;
  backup_frecuencia_horas?: number | null;
  backup_retencion_dias: number;
  backup_manual_mensual?: number | null;
  permite_restauracion: boolean;
}

export interface PlanConUso extends Plan {
  tenants_activos: number;
  suscripciones_activas: number;
}

export interface PlanCreateDto {
  nombre: string;
  descripcion?: string;
  precio_mensual: number;
  max_sucursales: number;
  permite_reportes_ia?: boolean;
  permite_pago_diferido?: boolean;
  estado?: EstadoPlan;
  orden?: number;
  soporte_prioritario?: boolean;
  max_usuarios?: number | null;
  max_productos?: number | null;
  backup_automatico?: boolean;
  backup_frecuencia_horas?: number | null;
  backup_retencion_dias?: number;
  backup_manual_mensual?: number | null;
  permite_restauracion?: boolean;
}

export type PlanUpdateDto = Partial<PlanCreateDto>;

export interface TenantAfectadoPlan {
  tenant_id: number;
  razon_social: string;
  sucursales_actuales?: number;
  usuarios_actuales?: number;
  productos_actuales?: number;
}

export interface ImpactoPlan {
  plan_id: number;
  max_sucursales: number;
  tenants_afectados: TenantAfectadoPlan[];
  total_afectados: number;
}

export interface Suscripcion {
  id: number;
  tenant_id: number;
  plan_id: number;
  fecha_inicio: string;
  fecha_vencimiento: string;
  estado: EstadoSuscripcion;
  estado_pago: string;
  renovacion_automatica: boolean;
  plan?: Plan | null;
}

export interface SuscripcionCreateDto {
  tenant_id: number;
  plan_id: number;
  fecha_inicio?: string;
  fecha_vencimiento?: string;
  renovacion_automatica?: boolean;
}

export interface SuscripcionUpdateDto {
  fecha_inicio?: string;
  fecha_vencimiento?: string;
  estado_pago?: string;
  renovacion_automatica?: boolean;
  motivo_estado?: string;
}

export interface CambioPlanRequest {
  plan_id: number;
}

export interface EstadoSuscripcionResponse {
  suscripcion_id: number;
  estado: EstadoSuscripcion;
  motivo_estado?: string | null;
}

export interface PagoSuscripcion {
  id: number;
  tenant_id: number;
  suscripcion_id: number;
  monto: number;
  moneda: string;
  estado: EstadoPagoSuscripcion;
  stripe_payment_intent_id?: string | null;
  referencia?: string | null;
  fecha?: string | null;
}

export interface PagoSuscripcionCreateDto {
  suscripcion_id: number;
  monto: number;
  moneda?: string;
  estado?: EstadoPagoSuscripcion;
  stripe_payment_intent_id?: string;
  referencia?: string;
}

export interface HistorialPagos {
  total: number;
  pagos: PagoSuscripcion[];
}

export interface CheckoutSuscripcionResponse {
  modo: 'simulado' | 'stripe' | 'redirect';
  pago_id?: number;
  estado?: EstadoPagoSuscripcion;
  mensaje?: string;
  checkout_url?: string;
  client_secret?: string;
}

/** Respuesta de `GET /saas/mi-plan/funcionalidades`. */
export interface FuncionalidadPlan {
  plan: string | null;
  reportes_ia: boolean;
  pago_diferido: boolean;
  carrito_offline: boolean;
  max_sucursales: number;
  max_usuarios: number | null;
  max_productos: number | null;
  backup_automatico: boolean;
  backup_frecuencia_horas: number | null;
  backup_retencion_dias: number | null;
  backup_manual_mensual: number | null;
  permite_restauracion: boolean;
}

export interface AsistenteConfiguracion {
  tenant_id: number;
  pasos_completados: string[];
  pasos_faltantes: string[];
  porcentaje: number;
  estado_tenant: EstadoTenant;
  puede_finalizar: boolean;
}

export interface ConfiguracionTenantResponse {
  tenant: Tenant;
  configuracion_offline: ConfiguracionOffline;
  asistente: AsistenteConfiguracion;
}

export interface DatosEmpresaUpdateDto {
  razon_social?: string;
  direccion_fiscal?: string;
  telefono?: string;
  correo_contacto?: string;
  logo_url?: string;
  moneda?: string;
  zona_horaria?: string;
}

export interface SucursalConfigCreateDto {
  nombre: string;
  direccion: string;
  telefono: string;
  horario_atencion?: string;
  ciudad_id?: number | null;
  latitud?: number | null;
  longitud?: number | null;
}

export interface UsuarioConfigCreateDto {
  nombre: string;
  apellido: string;
  correo: string;
  contrasena: string;
  rol: 'Encargado' | 'Cajero';
  sucursal_id: number;
  telefono?: string;
}

export interface UsuarioConfigResponse {
  id: number;
  tenant_id: number;
  correo: string;
  rol: string;
  debe_cambiar_contrasena: boolean;
}

export interface SucursalConfigResponse {
  id: number;
  tenant_id: number;
  nombre: string;
  direccion: string;
  telefono: string;
}

export interface ReenviarCredencialesResponse {
  correo: string;
  contrasena_temporal: string;
  tenant: string;
}

/** Payload conjunto usado por el asistente CU04. */
export type ConfiguracionOfflineUpdateDto = PreferenciasOfflineUpdateDto;
