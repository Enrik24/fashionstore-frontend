import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { StorageService } from '../services/storage.service';

/**
 * [EXAMEN-2] Mapa único código del backend → mensaje de interfaz
 * (capítulo 18 del plan). Vive junto al `errorInterceptor`.
 */
export const MENSAJES_ERROR_CLIENTE: Record<string, string> = {
  TENANT_NO_ENCONTRADO: 'La empresa no existe o fue eliminada.',
  TENANT_SUSPENDIDO: 'La suscripción de tu empresa está suspendida. Contacta al administrador.',
  SUSCRIPCION_VENCIDA: 'Tu plan venció. Renueva para seguir operando.',
  LIMITE_PLAN_EXCEDIDO: 'Alcanzaste el límite de tu plan. Mejora tu plan para continuar.',
  FUNCIONALIDAD_NO_DISPONIBLE: 'Funcionalidad disponible solo en los planes Profesional y Empresarial.',
  DISPOSITIVO_REVOCADO: 'Este dispositivo fue revocado. Se borraron los datos locales; vuelve a iniciar sesión.',
  SESION_OFFLINE_VENCIDA: 'Tu sesión offline venció. Conéctate para seguir operando.',
  PIN_INCORRECTO: 'PIN incorrecto. Revisa los intentos restantes.',
  PIN_BLOQUEADO: 'Demasiados intentos. Inicia sesión con conexión.',
  CARRITO_OFFLINE_DESHABILITADO: 'Tu empresa no tiene habilitado el carrito sin conexión.',
  CUPON_REQUIERE_CONEXION: 'Los cupones se validan solo con conexión.',
  STOCK_INSUFICIENTE: 'Stock insuficiente para completar la operación.',
  PRECIO_ACTUALIZADO: 'Los precios cambiaron. Revisa el nuevo total antes de pagar.',
  PAGO_DUPLICADO: 'Este pago ya fue procesado.',
  PAGO_EXPIRADO: 'La orden expiró y el stock fue liberado.',
  PAGO_REEMBOLSADO: 'El pago fue reembolsado porque la orden no se pudo completar.',
  REQUIERE_ACCION_CLIENTE: 'Tu banco pide una verificación adicional para completar el pago.',
  TARJETA_RECHAZADA: 'El pago fue rechazado. Puedes intentar con otro medio.',
  PENDIENTE_REGULARIZACION: 'Tu empresa debe regularizar la suscripción para completar esta compra.',
  ORDEN_PENDIENTE_SINCRONIZACION: 'Pedido guardado localmente. El pago se completará cuando haya conexión.',
  OFFLINE_SIN_DATOS: 'No hay datos descargados para operar sin conexión.',
  SIN_ESPACIO_LOCAL: 'No hay espacio suficiente. Se priorizarán los productos más vendidos.',
  PLAZO_CAMBIO_VENCIDO: 'Fuera de período permitido para devoluciones y reposiciones.',
  VENTA_NO_DISPONIBLE_OFFLINE: 'Esta venta no está disponible sin conexión. Necesitas internet para validarla.',
  REPOSICION_SIN_STOCK: 'La talla o el color elegido no tiene stock en esta sucursal.',
  REPOSICION_VARIANTE_INVALIDA: 'La prenda nueva debe ser del mismo producto que la devuelta.',
  SIN_ALTERNATIVA: 'No hay una talla mayor o menor disponible. Te avisaremos cuando llegue.',
  NOTA_REPOSICION_NO_DISPONIBLE: 'La nota de reposición todavía no está disponible.',
  COMPENSACION_PENDIENTE: 'La venta fue rechazada y tu devolución está en proceso. Te avisaremos al completarse.',
  COMPENSACION_YA_COMPLETADA: 'Esta compensación ya fue completada; no se generará un segundo pago.',
  COMPENSACION_FALLIDA: 'No se pudo completar la devolución del dinero. El administrador fue notificado.',
  BACKUP_LIMITE_MENSUAL: 'Alcanzaste el límite de respaldos manuales de tu plan este mes.',
  BACKUP_EN_PROCESO: 'Ya hay un respaldo en proceso para esta empresa.',
  BACKUP_NO_HABILITADO: 'Tu plan no incluye respaldos automáticos.',
  RESTAURACION_NO_PERMITIDA: 'Tu plan no permite restaurar respaldos. Contacta al Super Administrador.',
  RESTAURACION_DESHABILITADA: 'La restauración está deshabilitada en este entorno.',
  ERROR_DATOS_MAESTROS: 'El producto fue desactivado. La operación fue rechazada.',
  ERROR_CRITICO_SINCRONIZACION: 'No se pudo sincronizar y se notificó al administrador.',
  RED_DEBIL: 'La conexión es inestable. Reintentaremos automáticamente.',
  IA_NO_INTERPRETADA: 'No pude interpretar tu solicitud. ¿Puedes reformularla?',
  IA_REPORTE_NO_SOPORTADO: 'Ese reporte no está disponible actualmente.',
  IA_PLAN_REQUERIDO: 'Los reportes con IA requieren el plan Profesional.',
  ML_DATOS_INSUFICIENTES: 'Se requiere mínimo 3 meses de historial para entrenar el modelo.',
  ML_PRECISION_BAJA: 'La precisión del modelo es baja. Conviene recolectar más datos.',
  ML_SIN_PATRONES: 'No se detectaron patrones claros en los datos actuales.'
};

function codigoDeError(error: HttpErrorResponse): string | null {
  const payload = error.error;
  if (!payload) return null;
  if (typeof payload === 'string') return payload;
  if (typeof payload.codigo === 'string') return payload.codigo;
  if (typeof payload.detail === 'string' && MENSAJES_ERROR_CLIENTE[payload.detail]) return payload.detail;
  if (payload.detail && typeof payload.detail === 'object') {
    if (typeof payload.detail.codigo === 'string') return payload.detail.codigo;
    if (typeof payload.detail.detail === 'string' && MENSAJES_ERROR_CLIENTE[payload.detail.detail]) {
      return payload.detail.detail;
    }
  }
  if (typeof payload.error?.codigo === 'string') return payload.error.codigo;
  return null;
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const router = inject(Router);
  const storage = inject(StorageService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/register');
      const codigo = codigoDeError(error);
      const mensajeConocido = codigo ? MENSAJES_ERROR_CLIENTE[codigo] : null;

      if (error.status === 0) {
        // [EXAMEN-2] Error real de red: no confundirlo con un 401/403.
        toast.warning('Sin conexión con el servidor. Si el modo offline está habilitado, puedes seguir operando.', 'Sin conexión');
      } else if (error.status === 401 && !isAuthEndpoint) {
        toast.warning('Tu sesión ha expirado. Por favor inicia sesión nuevamente.', 'Sesión Expirada');
        storage.clearAuth();
        router.navigate(['/auth/login']);
      } else if (mensajeConocido) {
        const esCritico = ['PIN_BLOQUEADO', 'DISPOSITIVO_REVOCADO', 'SESION_OFFLINE_VENCIDA', 'TENANT_SUSPENDIDO']
          .includes(codigo as string);
        esCritico ? toast.error(mensajeConocido, 'Acción requerida') : toast.warning(mensajeConocido, 'Aviso');
      } else if (error.status === 403) {
        toast.error('No tienes permisos suficientes para realizar esta acción.', 'Acceso Denegado');
      } else if (error.status === 404 && !isAuthEndpoint) {
        toast.error('El recurso solicitado no fue encontrado.', 'No encontrado');
      } else if (error.status === 409) {
        const detalle = typeof error.error?.detail === 'string'
          ? error.error.detail
          : 'El registro ya existe o entra en conflicto con otro.';
        toast.error(detalle, 'Conflicto');
      } else if (error.status >= 500) {
        toast.error('Ocurrió un error inesperado en el servidor. Intenta de nuevo más tarde.', 'Error del Servidor');
      }

      return throwError(() => error);
    })
  );
};
