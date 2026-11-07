import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PlanFeatureService, FuncionalidadPlanNombre } from '../services/plan-feature.service';
import { ToastService } from '../services/toast.service';

/**
 * [EXAMEN-2] RN-003: bloquea rutas cuya funcionalidad no está incluida en el
 * plan. La pantalla de bloqueo vive en `mi-suscripcion` con el texto exacto.
 */
export const planFeatureGuard: CanActivateFn = (route) => {
  const planFeature = inject(PlanFeatureService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const funcionalidad = route.data?.['feature'] as FuncionalidadPlanNombre | undefined;
  if (!funcionalidad) return true;

  const incluida =
    funcionalidad === 'respaldos' ? planFeature.puedeRespaldos() :
    funcionalidad === 'restauracion' ? planFeature.puedeRestaurar() :
    planFeature.funcionalidades()?.[funcionalidad] === true;

  if (incluida) return true;

  toast.warning(planFeature.mensajeBloqueo(funcionalidad), 'Función no incluida en tu plan');
  return router.createUrlTree(['/admin/mi-suscripcion'], {
    queryParams: { bloqueo: funcionalidad }
  });
};
