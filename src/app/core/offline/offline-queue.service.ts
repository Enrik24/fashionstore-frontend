import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  EstadoSincronizacion,
  OperacionOfflineLocal,
  OperacionLoteItem,
  TipoOperacionOffline
} from '../models/offline.model';
import { IndexedDbService } from './indexed-db.service';
import { DeviceService } from './device.service';
import { StorageService } from '../services/storage.service';
import { compararPorSecuencia, normalizarSecuencia, siguienteSecuencia } from '../utils/secuencia.util';
import { calcularProximoIntento } from '../utils/backoff.util';
import { hashPayload } from '../utils/payload-hash.util';

export interface OpcionesEncolado {
  sucursalId?: number | null;
  uuidOperacion?: string;
}

export interface ContadoresCola {
  pendientes: number;
  sincronizando: number;
  confirmadas: number;
  duplicadas: number;
  rechazadas: number;
  conflictos: number;
  erroresCriticos: number;
  total: number;
}

export interface ResumenCola extends ContadoresCola {
  texto: string;
  masAntigua?: string | null;
  antiguedadDias?: number | null;
}

const CLAVE_SECUENCIA = 'secuencia_local';

/**
 * [EXAMEN-2] CU08 / RN-010 / RNF-16: cola FIFO persistente.
 * La secuencia local es monotónica y nunca depende de la hora del cliente.
 */
@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  private indexedDb = inject(IndexedDbService);
  private device = inject(DeviceService);
  private storage = inject(StorageService);

  async encolar(
    tipo: TipoOperacionOffline,
    payload: Record<string, unknown>,
    opciones: OpcionesEncolado = {}
  ): Promise<OperacionOfflineLocal> {
    const secuencia = await this.siguienteSecuencia();
    const operacion: OperacionOfflineLocal = {
      uuid_operacion: opciones.uuidOperacion ?? this.generarUuid(),
      tipo_operacion: tipo,
      secuencia_local: secuencia,
      payload,
      estado_sincronizacion: 'PENDIENTE',
      intentos: 0,
      tenant_id: this.tenantId(),
      dispositivo_id: this.device.obtenerDispositivoId(),
      usuario_id: this.usuarioId(),
      sucursal_id: opciones.sucursalId ?? this.sucursalActual(),
      fecha_registro_local: new Date().toISOString(),
      fecha_ultimo_intento: null,
      error_detalle: null,
      motivo_rechazo: null,
      hash_payload: hashPayload(payload),
      programado_para: null,
      requiere_revision: false,
      resultado_json: null,
      updated_at: new Date().toISOString()
    };

    await this.indexedDb.guardar('operaciones', operacion);
    return operacion;
  }

  /** Contador persistido en `meta`; se incrementa en cada encolado. */
  async siguienteSecuencia(): Promise<number> {
    const registro = await this.indexedDb.obtener<{ clave: string; valor: number }>('meta', CLAVE_SECUENCIA);
    const siguiente = siguienteSecuencia(normalizarSecuencia(registro?.valor));
    await this.indexedDb.guardar('meta', { clave: CLAVE_SECUENCIA, valor: siguiente });
    return siguiente;
  }

  async pendientes(): Promise<OperacionOfflineLocal[]> {
    const operaciones = await this.indexedDb.obtenerTodos<OperacionOfflineLocal>('operaciones');
    return operaciones
      .filter((operacion) => operacion.estado_sincronizacion === 'PENDIENTE')
      .sort(compararPorSecuencia);
  }

  async porEstado(estado: EstadoSincronizacion): Promise<OperacionOfflineLocal[]> {
    const operaciones = await this.indexedDb.obtenerTodos<OperacionOfflineLocal>('operaciones');
    return operaciones
      .filter((operacion) => operacion.estado_sincronizacion === estado)
      .sort(compararPorSecuencia);
  }

  async listarTodas(): Promise<OperacionOfflineLocal[]> {
    const operaciones = await this.indexedDb.obtenerTodos<OperacionOfflineLocal>('operaciones');
    return operaciones.sort(compararPorSecuencia);
  }

  async obtener(uuid: string): Promise<OperacionOfflineLocal | null> {
    return this.indexedDb.obtener<OperacionOfflineLocal>('operaciones', uuid);
  }

  /**
   * Arma el lote FIFO. Por defecto respeta los reintentos programados con
   * retroceso exponencial; una sincronización manual puede incluirlos.
   */
  async tomarLote(
    maximo: number = environment.offlineLoteMaxOperaciones,
    incluirProgramadas = false
  ): Promise<OperacionOfflineLocal[]> {
    const pendientes = await this.pendientes();
    const ahora = Date.now();
    return pendientes
      .filter((operacion) => incluirProgramadas
        || !operacion.programado_para
        || Date.parse(operacion.programado_para) <= ahora)
      .slice(0, Math.max(1, Math.trunc(maximo)));
  }

  /** Payload exacto que viaja al backend (`OperacionLoteItem`). */
  aItemLote(operacion: OperacionOfflineLocal): OperacionLoteItem {
    return {
      uuid_operacion: operacion.uuid_operacion,
      dispositivo_id: operacion.dispositivo_id,
      secuencia_local: operacion.secuencia_local,
      tipo_operacion: operacion.tipo_operacion,
      sucursal_id: operacion.sucursal_id ?? undefined,
      fecha_registro_local: operacion.fecha_registro_local,
      payload: operacion.payload
    };
  }

  async marcarEnviada(uuid: string): Promise<void> {
    await this.actualizar(uuid, { estado_sincronizacion: 'SINCRONIZANDO' });
  }

  async marcarPendiente(uuid: string, error?: string | null): Promise<void> {
    await this.actualizar(uuid, {
      estado_sincronizacion: 'PENDIENTE',
      error_detalle: error ?? null
    });
  }

  async marcarConfirmada(uuid: string, resultado?: Record<string, unknown>): Promise<void> {
    await this.actualizar(uuid, {
      estado_sincronizacion: 'CONFIRMADA',
      resultado_json: resultado ?? null,
      error_detalle: null,
      motivo_rechazo: null,
      requiere_revision: false,
      programado_para: null
    });
  }

  async marcarRechazada(uuid: string, motivo: string, resultado?: Record<string, unknown>): Promise<void> {
    await this.actualizar(uuid, {
      estado_sincronizacion: 'RECHAZADA',
      motivo_rechazo: motivo,
      error_detalle: null,
      resultado_json: resultado ?? null,
      requiere_revision: true,
      programado_para: null
    });
  }

  async marcarDuplicada(uuid: string, resultado?: Record<string, unknown>): Promise<void> {
    await this.actualizar(uuid, {
      estado_sincronizacion: 'DUPLICADA',
      resultado_json: resultado ?? null,
      error_detalle: null,
      programado_para: null
    });
  }

  async marcarConflicto(uuid: string, detalle: Record<string, unknown>): Promise<void> {
    await this.actualizar(uuid, {
      estado_sincronizacion: 'CONFLICTO',
      error_detalle: String(detalle['motivo'] ?? 'Conflicto de sincronización'),
      resultado_json: detalle,
      requiere_revision: true,
      programado_para: null
    });
  }

  async marcarErrorCritico(uuid: string, detalle: Record<string, unknown>): Promise<void> {
    await this.actualizar(uuid, {
      estado_sincronizacion: 'ERROR_CRITICO',
      error_detalle: String(detalle['motivo'] ?? 'Error crítico de sincronización'),
      resultado_json: detalle,
      requiere_revision: true,
      programado_para: null
    });
  }

  async registrarIntento(uuid: string): Promise<void> {
    const operacion = await this.obtener(uuid);
    if (!operacion) return;
    await this.actualizar(uuid, {
      intentos: operacion.intentos + 1,
      fecha_ultimo_intento: new Date().toISOString()
    });
  }

  async reintentables(): Promise<OperacionOfflineLocal[]> {
    const operaciones = await this.indexedDb.obtenerTodos<OperacionOfflineLocal>('operaciones');
    return operaciones
      .filter((operacion) => ['RECHAZADA', 'ERROR_CRITICO', 'CONFLICTO'].includes(operacion.estado_sincronizacion))
      .sort(compararPorSecuencia);
  }

  async contadores(): Promise<ContadoresCola> {
    const operaciones = await this.indexedDb.obtenerTodos<OperacionOfflineLocal>('operaciones');
    const contadores: ContadoresCola = {
      pendientes: 0,
      sincronizando: 0,
      confirmadas: 0,
      duplicadas: 0,
      rechazadas: 0,
      conflictos: 0,
      erroresCriticos: 0,
      total: operaciones.length
    };

    for (const operacion of operaciones) {
      switch (operacion.estado_sincronizacion) {
        case 'PENDIENTE': contadores.pendientes += 1; break;
        case 'SINCRONIZANDO': contadores.sincronizando += 1; break;
        case 'CONFIRMADA': contadores.confirmadas += 1; break;
        case 'DUPLICADA': contadores.duplicadas += 1; break;
        case 'RECHAZADA': contadores.rechazadas += 1; break;
        case 'CONFLICTO': contadores.conflictos += 1; break;
        case 'ERROR_CRITICO': contadores.erroresCriticos += 1; break;
      }
    }
    return contadores;
  }

  /** Reintento manual: vuelve a `PENDIENTE` conservando la secuencia original. */
  async prepararReintento(uuid: string): Promise<OperacionOfflineLocal | null> {
    const operacion = await this.obtener(uuid);
    if (!operacion) return null;
    await this.actualizar(uuid, {
      estado_sincronizacion: 'PENDIENTE',
      motivo_rechazo: null,
      error_detalle: null,
      requiere_revision: false,
      programado_para: null
    });
    return this.obtener(uuid);
  }

  async programarReintento(uuid: string): Promise<string | null> {
    const operacion = await this.obtener(uuid);
    if (!operacion) return null;
    const proximo = calcularProximoIntento(
      operacion.intentos + 1,
      environment.offlineBackoffBaseSeg,
      environment.offlineBackoffMaxSeg
    );
    await this.actualizar(uuid, { programado_para: proximo });
    return proximo;
  }

  async reintentosProgramadosVencidos(): Promise<OperacionOfflineLocal[]> {
    const ahora = Date.now();
    const operaciones = await this.indexedDb.obtenerTodos<OperacionOfflineLocal>('operaciones');
    return operaciones
      .filter((operacion) => operacion.estado_sincronizacion === 'PENDIENTE'
        && !!operacion.programado_para
        && Date.parse(operacion.programado_para) <= ahora)
      .sort(compararPorSecuencia);
  }

  async purgarAntiguas(dias: number = environment.offlineRetencionDias): Promise<number> {
    const limite = Date.now() - Math.max(1, dias) * 86_400_000;
    const operaciones = await this.indexedDb.obtenerTodos<OperacionOfflineLocal>('operaciones');
    const antiguas = operaciones.filter((operacion) =>
      ['CONFIRMADA', 'DUPLICADA'].includes(operacion.estado_sincronizacion)
      && Date.parse(operacion.fecha_registro_local) < limite
    );

    for (const operacion of antiguas) {
      await this.indexedDb.eliminar('operaciones', operacion.uuid_operacion);
    }
    return antiguas.length;
  }

  async resumen(): Promise<ResumenCola> {
    const contadores = await this.contadores();
    const pendientes = await this.pendientes();
    const masAntigua = pendientes[0]?.fecha_registro_local ?? null;
    const antiguedadDias = masAntigua
      ? Math.floor((Date.now() - Date.parse(masAntigua)) / 86_400_000)
      : null;

    return {
      ...contadores,
      texto: `${contadores.confirmadas} confirmadas, ${contadores.rechazadas} rechazadas, ${contadores.pendientes} pendientes`,
      masAntigua,
      antiguedadDias
    };
  }

  async eliminar(uuid: string): Promise<void> {
    await this.indexedDb.eliminar('operaciones', uuid);
  }

  private async actualizar(uuid: string, cambios: Partial<OperacionOfflineLocal>): Promise<void> {
    const operacion = await this.obtener(uuid);
    if (!operacion) return;
    const actualizada: OperacionOfflineLocal = {
      ...operacion,
      ...cambios,
      updated_at: new Date().toISOString()
    };
    await this.indexedDb.guardar('operaciones', actualizada);
  }

  private generarUuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (caracter) => {
      const aleatorio = Math.floor(Math.random() * 16);
      const valor = caracter === 'x' ? aleatorio : (aleatorio & 0x3) | 0x8;
      return valor.toString(16);
    });
  }

  private tenantId(): number {
    return this.storage.getTenantActivo<{ id: number }>()?.id ?? 0;
  }

  private usuarioId(): number {
    return this.storage.getUser<{ id: number }>()?.id ?? 0;
  }

  private sucursalActual(): number | null {
    return this.storage.getUser<{ sucursal_id?: number | null }>()?.sucursal_id ?? null;
  }
}
