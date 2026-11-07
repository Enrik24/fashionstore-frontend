import { VarianteResumen } from './cart.model';
import { Sucursal } from './branch.model';
import { UserProfile } from './auth.model';
import { MetodoPagoPresencial } from './cart.model';

export type EstadoReserva = 'PENDIENTE' | 'PREPARADA' | 'EN_PRUEBA' | 'COMPLETADA' | 'CANCELADA' | 'CADUCADA';
export type EstadoDetalleReserva = 'PENDIENTE' | 'PREPARADO' | 'EN_PRUEBA' | 'COMPRADO' | 'DEVUELTO';


export interface DetalleReservaCreate {
  variante_producto_id: number;
  cantidad: number;
}

export interface DetalleReserva {
  id: number;
  reserva_id: number;
  variante_producto_id: number;
  cantidad: number;
  estado: EstadoDetalleReserva;
  variante_producto?: VarianteResumen;
}

export interface ReservaCreate {
  sucursal_id: number;
  fecha_reserva: string;
  horario_aproximado?: string;
  notas?: string;
  detalles: DetalleReservaCreate[];
  // [EXAMEN-2] El backend acepta el cliente que reserva (CU06).
  cliente_id?: number | null;
}

export interface Reserva {
  id: number;
  numero_reserva: string;
  cliente_id: number;
  sucursal_id: number;
  fecha_creacion: string;
  fecha_reserva: string;
  horario_aproximado?: string;
  estado: EstadoReserva;
  notas?: string;
  detalles: DetalleReserva[];
  sucursal?: Sucursal;
  cliente?: UserProfile;
  // [EXAMEN-2] Reserva offline (CU06).
  uuid_reserva?: string;
  es_offline?: boolean;
  estado_sincronizacion?: string;
  tenant_id?: number | null;
}

export interface ItemCompletarReserva {
  detalle_reserva_id: number;
  comprado: boolean;
}

export interface CompletarReservaRequest {
  items: ItemCompletarReserva[];
  metodo_pago?: MetodoPagoPresencial;
}
