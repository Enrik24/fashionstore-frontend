import { Injectable, inject, signal } from '@angular/core';
import { LogConflicto } from '../models/offline.model';
import { IndexedDbService } from './indexed-db.service';
import { ConnectivityService } from './connectivity.service';
import { StorageService } from '../services/storage.service';
import { FiltrosConflictos, OfflineApiService } from '../services/offline-api.service';
import { OfflineQueueService } from './offline-queue.service';
import { OfflineAuditService } from './offline-audit.service';

export interface ClasificacionConflicto {
  etiqueta: string;
  color: 'danger' | 'warning' | 'info' | 'success';
  accionSugerida: string;
  severidad: 'ALTA' | 'MEDIA' | 'BAJA';
}

const CLASIFICACIONES: Record<string, ClasificacionConflicto> = {
  STOCK_INSUFICIENTE: {
    etiqueta: 'Stock insuficiente',
    color: 'warning',
    accionSugerida: 'Ajustar cantidades o rechazar la operación.',
    severidad: 'MEDIA'
  },
  PRECIO_DESACTUALIZADO: {
    etiqueta: 'Precio desactualizado',
    color: 'info',
    accionSugerida: 'Aplicar el precio central y confirmar el nuevo total.',
    severidad: 'MEDIA'
  },
  PRODUCTO_INACTIVO: {
    etiqueta: 'Producto inactivo',
    color: 'warning',
    accionSugerida: 'Rechazar la operación y ofrecer un producto alternativo.',
    severidad: 'MEDIA'
  },
  VARIANTE_INEXISTENTE: {
    etiqueta: 'Variante inexistente',
    color: 'danger',
    accionSugerida: 'Rechazar la línea y corregir el catálogo local.',
    severidad: 'MEDIA'
  },
  VENTA_ORIGEN_INVALIDA: {
    etiqueta: 'Venta de origen inválida',
    color: 'danger',
    accionSugerida: 'Revisar el comprobante de origen antes de continuar.',
    severidad: 'MEDIA'
  },
  SUCURSAL_INVALIDA: {
    etiqueta: 'Sucursal inválida',
    color: 'danger',
    accionSugerida: 'Reasignar la operación a una sucursal activa.',
    severidad: 'MEDIA'
  },
  TENANT_SUSPENDIDO: {
    etiqueta: 'Tenant suspendido',
    color: 'danger',
    accionSugerida: 'Contactar al administrador de la plataforma.',
    severidad: 'ALTA'
  },
  ORDEN_EXPIRADA: {
    etiqueta: 'Orden expirada',
    color: 'warning',
    accionSugerida: 'Liberar el stock y generar una nueva orden.',
    severidad: 'MEDIA'
  },
  PAGO_YA_CAPTURADO: {
    etiqueta: 'Pago ya capturado',
    color: 'danger',
    accionSugerida: 'Conciliar manualmente antes de reintentar el cobro.',
    severidad: 'ALTA'
  },
  PAGO_DUPLICADO: {
    etiqueta: 'Pago duplicado',
    color: 'info',
    accionSugerida: 'Conservar un solo pago y reembolsar el duplicado.',
    severidad: 'MEDIA'
  }
};

const CLASIFICACION_DEFECTO: ClasificacionConflicto = {
  etiqueta: 'Conflicto de sincronización',
  color: 'warning',
  accionSugerida: 'Revisar el detalle y resolver manualmente.',
  severidad: 'MEDIA'
};

/**
 * [EXAMEN-2] CU09: conflictos de sincronización con caché local para operar sin red.
 */
@Injectable({ providedIn: 'root' })
export class ConflictService {
  private indexedDb = inject(IndexedDbService);
  private connectivity = inject(ConnectivityService);
  private storage = inject(StorageService);
  private offlineApi = inject(OfflineApiService);
  private queue = inject(OfflineQueueService);
  private audit = inject(OfflineAuditService);

  /** Conteo de conflictos nuevos notificados por WebSocket o por sincronización. */
  public nuevos = signal<number>(0);

  async listarPendientes(filtros: FiltrosConflictos = {}): Promise<LogConflicto[]> {
    if (this.puedeConsultarBackend()) {
      try {
        const conflictos = await this.primero(
          this.offlineApi.listarConflictos({ resuelto: false, ...filtros })
        );
        await this.cachear(conflictos);
        return conflictos;
      } catch {
        // Sin red real: se usa la caché local.
      }
    }
    return this.listarLocal({ resuelto: false, ...filtros });
  }

  /**
   * [EXAMEN-2] El backend exige `X-Tenant-ID` al Super Administrador. Si no
   * hay un tenant consultado, la petición respondería 404 RECURSO_NO_ENCONTRADO;
   * en ese caso se trabaja con la caché local (plan, 4.2).
   */
  private puedeConsultarBackend(): boolean {
    if (!this.connectivity.enLinea()) return false;
    if (this.storage.getEsSuperAdmin() && !this.storage.getTenantConsultadoId()) {
      return false;
    }
    return true;
  }

  async listarLocal(filtros: FiltrosConflictos = {}): Promise<LogConflicto[]> {
    let conflictos = await this.indexedDb.obtenerTodos<LogConflicto>('conflictos');
    const tenantId = this.storage.getTenantActivo<{ id: number }>()?.id;
    if (tenantId != null) conflictos = conflictos.filter((c) => c.tenant_id === tenantId);
    if (filtros.resuelto != null) conflictos = conflictos.filter((c) => c.resuelto === filtros.resuelto);
    if (filtros.tipo) conflictos = conflictos.filter((c) => c.tipo_conflicto === filtros.tipo);
    conflictos.sort((a, b) => Date.parse(b.fecha ?? '') - Date.parse(a.fecha ?? ''));
    if (filtros.skip != null) conflictos = conflictos.slice(filtros.skip);
    if (filtros.limit != null) conflictos = conflictos.slice(0, filtros.limit);
    return conflictos;
  }

  async obtenerDetalle(id: number): Promise<LogConflicto | null> {
    if (this.puedeConsultarBackend()) {
      try {
        const conflicto = await this.primero(this.offlineApi.obtenerConflicto(id));
        await this.cachear([conflicto]);
        return conflicto;
      } catch {
        // Caché local.
      }
    }
    return this.indexedDb.obtener<LogConflicto>('conflictos', id);
  }

  async resolver(
    id: number,
    decision: 'CONFIRMAR' | 'RECHAZAR' | 'AJUSTAR',
    observacion?: string
  ): Promise<LogConflicto> {
    const conflicto = await this.primero(this.offlineApi.resolverConflicto(id, decision, observacion));
    await this.cachear([conflicto]);
    await this.actualizarOperacionAsociada(conflicto, decision);
    if (this.nuevos() > 0) this.nuevos.update((valor) => Math.max(0, valor - 1));
    await this.audit.registrar({
      tipo: 'CONFLICTO',
      mensaje: `Conflicto ${conflicto.tipo_conflicto} resuelto con decisión ${decision}.`,
      detalle: { conflicto_id: id, decision }
    });
    return conflicto;
  }

  async descartar(id: number, motivo?: string): Promise<LogConflicto> {
    const conflicto = await this.primero(this.offlineApi.descartarConflicto(id, motivo));
    await this.cachear([conflicto]);
    if (this.nuevos() > 0) this.nuevos.update((valor) => Math.max(0, valor - 1));
    await this.audit.registrar({
      tipo: 'CONFLICTO',
      mensaje: `Conflicto ${conflicto.tipo_conflicto} descartado.`,
      detalle: { conflicto_id: id, motivo: motivo ?? null }
    });
    return conflicto;
  }

  async contarPendientes(): Promise<number> {
    // Sin sesión (visitante anónimo o tras cerrar sesión) no se llama al
    // backend: ese endpoint exige token y devolvería 403 Token ausente.
    // Se usa directo el conteo local.
    const haySesion = !!this.storage.getAccessToken?.();
    if (haySesion && this.puedeConsultarBackend()) {
      try {
        const respuesta = await this.primero(this.offlineApi.contarConflictosPendientes());
        this.nuevos.set(respuesta.pendientes);
        return respuesta.pendientes;
      } catch {
        // Conteo local.
      }
    }
    const locales = await this.listarLocal({ resuelto: false });
    this.nuevos.set(locales.length);
    return locales.length;
  }

  clasificarLocal(conflicto: LogConflicto | { tipo_conflicto: string }): ClasificacionConflicto {
    return CLASIFICACIONES[conflicto.tipo_conflicto] ?? CLASIFICACION_DEFECTO;
  }

  /** Llamado por `sync-engine` cuando el WebSocket informa conflictos nuevos. */
  notificarNuevos(cantidad = 1): void {
    this.nuevos.update((valor) => valor + Math.max(1, cantidad));
  }

  async resumenPorTipo(): Promise<Record<string, number>> {
    const conflictos = await this.listarLocal({ resuelto: false });
    return conflictos.reduce<Record<string, number>>((acumulado, conflicto) => {
      acumulado[conflicto.tipo_conflicto] = (acumulado[conflicto.tipo_conflicto] ?? 0) + 1;
      return acumulado;
    }, {});
  }

  private async cachear(conflictos: LogConflicto[]): Promise<void> {
    const tenantId = this.storage.getTenantActivo<{ id: number }>()?.id ?? 0;
    await this.indexedDb.guardarLote(
      'conflictos',
      conflictos.map((conflicto) => ({ ...conflicto, tenant_id: conflicto.tenant_id ?? tenantId }))
    );
  }

  private async actualizarOperacionAsociada(
    conflicto: LogConflicto,
    decision: 'CONFIRMAR' | 'RECHAZAR' | 'AJUSTAR'
  ): Promise<void> {
    if (!conflicto.uuid_operacion) return;
    if (decision === 'CONFIRMAR') {
      await this.queue.marcarConfirmada(conflicto.uuid_operacion, conflicto.detalle_json ?? undefined);
    } else if (decision === 'RECHAZAR') {
      await this.queue.marcarRechazada(conflicto.uuid_operacion, conflicto.observaciones ?? 'Rechazado por el administrador');
    } else {
      await this.queue.prepararReintento(conflicto.uuid_operacion);
    }
  }

  private primero<T>(observable: import('rxjs').Observable<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      observable.subscribe({ next: resolve, error: reject });
    });
  }
}
