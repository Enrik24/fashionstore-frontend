import { Pipe, PipeTransform } from '@angular/core';

export interface EtiquetaEstado {
  label: string;
  class: string;
}

/**
 * [EXAMEN-2] Etiquetas y colores de estado de todo el sistema.
 * Unifica catálogo y los estados SaaS, de suscripción, plan, pago,
 * dispositivo y sincronización offline.
 */
@Pipe({
  name: 'statusBadge',
  standalone: true
})
export class StatusBadgePipe implements PipeTransform {
  transform(status: string | null | undefined): EtiquetaEstado {
    if (!status) return { label: 'Desconocido', class: 'badge-primary' };

    switch (status.toUpperCase()) {
      // Catálogo y operación (Examen 1)
      case 'ACTIVO':
      case 'DISPONIBLE':
        return { label: 'Activo', class: 'badge-success' };
      case 'INACTIVO':
        return { label: 'Inactivo', class: 'badge-danger' };
      case 'BLOQUEADO':
        return { label: 'Bloqueado', class: 'badge-danger' };
      case 'AGOTADO':
        return { label: 'Agotado', class: 'badge-danger' };
      case 'BAJO_STOCK':
        return { label: 'Bajo Stock', class: 'badge-warning' };
      case 'PROXIMO_INGRESO':
        return { label: 'Próximo Ingreso', class: 'badge-info' };

      // [EXAMEN-2] Tenant (CU01, CU04)
      case 'CONFIGURACION_INICIAL':
        return { label: 'Configuración inicial', class: 'badge-warning' };
      case 'OPERATIVO':
        return { label: 'Operativo', class: 'badge-success' };
      case 'SUSPENDIDO':
        return { label: 'Suspendido', class: 'badge-warning' };
      case 'CANCELADO':
        return { label: 'Cancelado', class: 'badge-danger' };

      // [EXAMEN-2] Suscripción y plan (CU02, CU03)
      case 'ACTIVA':
        return { label: 'Activa', class: 'badge-success' };
      case 'SUSPENDIDA':
        return { label: 'Suspendida', class: 'badge-warning' };
      case 'CANCELADA':
        return { label: 'Cancelada', class: 'badge-danger' };
      case 'VENCIDA':
        return { label: 'Vencida', class: 'badge-critical' };
      case 'POR_VENCER':
        return { label: 'Por vencer', class: 'badge-warning' };
      case 'SIN_SUSCRIPCION':
        return { label: 'Sin suscripción', class: 'badge-locked' };

      // [EXAMEN-2] Pagos de suscripción y pagos diferidos
      case 'PENDIENTE':
        return { label: 'Pendiente', class: 'badge-pending' };
      case 'PENDIENTE_ENVIO':
        return { label: 'Pendiente de envío', class: 'badge-pending' };
      case 'EN_COLA':
        return { label: 'En cola', class: 'badge-pending' };
      case 'EN_PROCESO':
        return { label: 'En proceso', class: 'badge-info' };
      case 'CONFIRMADO':
      case 'PAGADO':
        return { label: 'Confirmado', class: 'badge-synced' };
      case 'RECHAZADO':
        return { label: 'Rechazado', class: 'badge-danger' };
      case 'REEMBOLSADO':
        return { label: 'Reembolsado', class: 'badge-info' };
      case 'EXPIRADO':
        return { label: 'Expirado', class: 'badge-critical' };
      case 'REQUIERE_ACCION_CLIENTE':
        return { label: 'Requiere acción', class: 'badge-warning' };

      // [EXAMEN-2] Dispositivos (CU17)
      case 'AUTORIZADO':
        return { label: 'Autorizado', class: 'badge-success' };
      case 'REVOCADO':
        return { label: 'Revocado', class: 'badge-critical' };

      // [EXAMEN-2] Sincronización offline (CU08, CU09)
      case 'SINCRONIZANDO':
        return { label: 'Sincronizando', class: 'badge-info' };
      case 'CONFIRMADA':
        return { label: 'Confirmada', class: 'badge-synced' };
      case 'DUPLICADA':
        return { label: 'Duplicada', class: 'badge-info' };
      case 'CONFLICTO':
        return { label: 'Conflicto', class: 'badge-conflict' };
      case 'ERROR_CRITICO':
        return { label: 'Error crítico', class: 'badge-critical' };

      // [EXAMEN-2] Conectividad
      case 'EN_LINEA':
        return { label: 'En línea', class: 'badge-success' };
      case 'SIN_CONEXION':
        return { label: 'Sin conexión', class: 'badge-offline' };
      case 'RECONECTANDO':
        return { label: 'Reconectando', class: 'badge-warning' };

      // [EXAMEN-2] Carrito y órdenes locales (CU15)
      case 'CONVIRTIENDO':
        return { label: 'Convirtiendo', class: 'badge-info' };
      case 'CONVERTIDO':
        return { label: 'Convertido', class: 'badge-synced' };
      case 'ABANDONADO':
        return { label: 'Abandonado', class: 'badge-offline' };
      case 'PENDIENTE_PAGO_DIFERIDO':
        return { label: 'Pendiente de pago', class: 'badge-pending' };
      case 'PENDIENTE_SINCRONIZACION':
        return { label: 'Pendiente de sync', class: 'badge-pending' };
      case 'EXPIRADA':
        return { label: 'Expirada', class: 'badge-critical' };

      // [EXAMEN-2] CU10/CU12/CU14/CU19/CU20/RN-024
      case 'PROCESANDO': return { label: 'Procesando', class: 'badge-info' };
      case 'COMPLETADA': return { label: 'Completada', class: 'badge-synced' };
      case 'AMBIGUA': return { label: 'Ambigua', class: 'badge-warning' };
      case 'NO_SOPORTADA': return { label: 'No soportada', class: 'badge-danger' };
      case 'BLOQUEADA_POR_PLAN': return { label: 'Bloqueada por plan', class: 'badge-locked' };
      case 'EN_TRANSITO': return { label: 'En tránsito', class: 'badge-info' };
      case 'RECIBIDO': return { label: 'Recibido', class: 'badge-synced' };
      case 'RECHAZADO_PARCIAL': return { label: 'Rechazo parcial', class: 'badge-warning' };
      case 'MANUAL': return { label: 'Manual', class: 'badge-info' };
      case 'AUTOMATICO': return { label: 'Automático', class: 'badge-info' };
      case 'SOLICITADA': return { label: 'Solicitada', class: 'badge-pending' };
      case 'ENVIADA': return { label: 'Enviada', class: 'badge-synced' };
      case 'FALLIDA': return { label: 'Fallida', class: 'badge-danger' };
      case 'LEIDA': return { label: 'Leída', class: 'badge-offline' };

      default:
        return { label: status, class: 'badge-primary' };
    }
  }
}
