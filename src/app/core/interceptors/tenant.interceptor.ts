import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { StorageService } from '../services/storage.service';
import { TenantContextService } from '../services/tenant-context.service';

/**
 * [EXAMEN-2] Interceptor 3.º del capítulo 6.3.
 * Solo el Super Administrador puede operar "como" un tenant desde el panel de
 * plataforma; en ese caso se envía `X-Tenant-ID` para consulta.
 */
export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(StorageService);
  const tenantContext = inject(TenantContextService);

  const esSuperAdmin = storage.getEsSuperAdmin();
  const tenantConsultado = tenantContext.tenantConsultadoId();

  if (esSuperAdmin && tenantConsultado && !req.headers.has('X-Tenant-ID')) {
    return next(req.clone({
      headers: req.headers.set('X-Tenant-ID', String(tenantConsultado))
    }));
  }

  return next(req);
};
