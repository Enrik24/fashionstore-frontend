import { HttpInterceptorFn } from '@angular/common/http';

/**
 * [EXAMEN-2] Interceptor 4.º del capítulo 6.3.
 * Agrega `Idempotency-Key` en los POST de sincronización y pago diferido a
 * partir del UUID de la operación (RN-005, RN-015). Si el llamador ya envía
 * la clave, se respeta.
 */
const RUTAS_IDEMPOTENTES = ['/offline/sync', '/pagos/diferidos', '/saas/suscripciones/checkout'];

export const idempotencyInterceptor: HttpInterceptorFn = (req, next) => {
  const esPost = req.method === 'POST';
  const esRutaIdempotente = RUTAS_IDEMPOTENTES.some((ruta) => req.url.includes(ruta));

  if (!esPost || !esRutaIdempotente || req.headers.has('Idempotency-Key')) {
    return next(req);
  }

  const clave = extraerClave(req.body);
  if (!clave) return next(req);

  return next(req.clone({
    headers: req.headers.set('Idempotency-Key', clave)
  }));
};

function extraerClave(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const data = body as Record<string, unknown>;

  const directa = data['uuid_operacion'] || data['uuid_pago'] || data['uuid_orden'] || data['uuid_carrito'];
  if (typeof directa === 'string' && directa.length > 0) return directa;

  const operaciones = data['operaciones'];
  if (Array.isArray(operaciones) && operaciones.length > 0) {
    const primera = operaciones[0] as Record<string, unknown>;
    if (typeof primera?.['uuid_operacion'] === 'string') {
      return primera['uuid_operacion'] as string;
    }
  }

  return null;
}
