import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  BitacoraLocal,
  ComprobanteLocal,
  LogConflicto,
  OperacionOfflineLocal,
  UsoAlmacenamientoLocal
} from '../models/offline.model';
import { IndexedDbService } from './indexed-db.service';

export interface CandidatoDescarga {
  variante_producto_id: number;
  stock_disponible?: number;
  vendidos?: number;
}

export interface PlanDescargaSelectiva {
  requiereSeleccion: boolean;
  excedenteBytes: number;
  disponibleBytes: number;
  prioridad: number[];
  mensaje: string;
}

export interface ResultadoLimpieza {
  operaciones: number;
  comprobantes: number;
  conflictos: number;
  bitacora: number;
  bytesLiberadosEstimados: number;
}

const UMBRAL_AVISO = 85;

/**
 * [EXAMEN-2] RNF-14: cuota de almacenamiento local y limpieza segura.
 * Nunca elimina operaciones pendientes, pagos sin confirmar ni carritos activos.
 */
@Injectable({ providedIn: 'root' })
export class StorageQuotaService {
  private indexedDb = inject(IndexedDbService);

  private readonly limiteBytes = environment.offlineMaxMbLocal * 1024 * 1024;

  async medirUso(): Promise<UsoAlmacenamientoLocal> {
    return this.indexedDb.usoEstimado();
  }

  async puedeDescargar(volumenEstimado: number): Promise<boolean> {
    const uso = await this.medirUso();
    const disponible = Math.max(0, uso.limiteBytes - uso.usadoBytes);
    return Math.max(0, volumenEstimado) <= disponible;
  }

  async solicitarDescargaSelectiva(volumenEstimado = 0, candidatos: CandidatoDescarga[] = []): Promise<PlanDescargaSelectiva> {
    const uso = await this.medirUso();
    const disponible = Math.max(0, uso.limiteBytes - uso.usadoBytes);
    const excedente = Math.max(0, volumenEstimado - disponible);

    return {
      requiereSeleccion: excedente > 0,
      excedenteBytes: excedente,
      disponibleBytes: disponible,
      prioridad: this.priorizarCatalogo(candidatos).map((c) => c.variante_producto_id),
      mensaje: excedente > 0
        ? `Faltan ${this.formatearBytes(excedente)} para la descarga completa. Se priorizarán los productos más vendidos y con stock; el resto se puede descargar después.`
        : `Hay ${this.formatearBytes(disponible)} disponibles para la descarga.`
    };
  }

  /**
   * Operaciones confirmadas y antiguas, comprobantes temporales reemplazados,
   * conflictos resueltos y bitácora vieja. Los pendientes quedan intactos.
   */
  async limpiarSincronizados(): Promise<ResultadoLimpieza> {
    const resultado: ResultadoLimpieza = {
      operaciones: 0,
      comprobantes: 0,
      conflictos: 0,
      bitacora: 0,
      bytesLiberadosEstimados: 0
    };
    const limite = Date.now() - environment.offlineRetencionDias * 86_400_000;

    const operaciones = await this.indexedDb.obtenerTodos<OperacionOfflineLocal>('operaciones');
    for (const operacion of operaciones) {
      const fecha = Date.parse(operacion.fecha_registro_local);
      const terminada = operacion.estado_sincronizacion === 'CONFIRMADA'
        || operacion.estado_sincronizacion === 'DUPLICADA';
      if (!terminada || fecha >= limite) continue;
      await this.indexedDb.eliminar('operaciones', operacion.uuid_operacion);
      resultado.operaciones += 1;
    }

    const comprobantes = await this.indexedDb.obtenerTodos<ComprobanteLocal>('comprobantes');
    for (const comprobante of comprobantes) {
      const reemplazado = !comprobante.es_temporal || !!comprobante.reemplazado_por;
      if (!reemplazado) continue;
      if (Date.parse(comprobante.created_at) >= limite) continue;
      await this.indexedDb.eliminar('comprobantes', comprobante.uuid_offline);
      resultado.comprobantes += 1;
    }

    const conflictos = await this.indexedDb.obtenerTodos<LogConflicto>('conflictos');
    for (const conflicto of conflictos) {
      if (!conflicto.resuelto) continue;
      const fecha = Date.parse(conflicto.fecha_resolucion ?? conflicto.fecha ?? '');
      if (Number.isFinite(fecha) && fecha >= limite) continue;
      await this.indexedDb.eliminar('conflictos', conflicto.id);
      resultado.conflictos += 1;
    }

    const bitacora = await this.indexedDb.obtenerTodos<BitacoraLocal>('bitacora_local');
    for (const evento of bitacora) {
      if (evento.id == null || Date.parse(evento.fecha) >= limite) continue;
      await this.indexedDb.eliminar('bitacora_local', evento.id);
      resultado.bitacora += 1;
    }

    resultado.bytesLiberadosEstimados =
      (resultado.operaciones + resultado.comprobantes + resultado.conflictos + resultado.bitacora) * 1024;

    return resultado;
  }

  async limpiarPorAntiguedad(dias: number): Promise<ResultadoLimpieza> {
    const limite = Date.now() - Math.max(1, dias) * 86_400_000;
    const resultado: ResultadoLimpieza = {
      operaciones: 0,
      comprobantes: 0,
      conflictos: 0,
      bitacora: 0,
      bytesLiberadosEstimados: 0
    };

    const operaciones = await this.indexedDb.obtenerTodos<OperacionOfflineLocal>('operaciones');
    for (const operacion of operaciones) {
      const terminada = operacion.estado_sincronizacion === 'CONFIRMADA'
        || operacion.estado_sincronizacion === 'DUPLICADA';
      if (!terminada || Date.parse(operacion.fecha_registro_local) >= limite) continue;
      await this.indexedDb.eliminar('operaciones', operacion.uuid_operacion);
      resultado.operaciones += 1;
    }

    const comprobantes = await this.indexedDb.obtenerTodos<ComprobanteLocal>('comprobantes');
    for (const comprobante of comprobantes) {
      if (comprobante.es_temporal && !comprobante.reemplazado_por) continue;
      if (Date.parse(comprobante.created_at) >= limite) continue;
      await this.indexedDb.eliminar('comprobantes', comprobante.uuid_offline);
      resultado.comprobantes += 1;
    }

    const bitacora = await this.indexedDb.obtenerTodos<BitacoraLocal>('bitacora_local');
    for (const evento of bitacora) {
      if (evento.id == null || Date.parse(evento.fecha) >= limite) continue;
      await this.indexedDb.eliminar('bitacora_local', evento.id);
      resultado.bitacora += 1;
    }

    resultado.bytesLiberadosEstimados =
      (resultado.operaciones + resultado.comprobantes + resultado.bitacora) * 1024;
    return resultado;
  }

  /** Productos más vendidos y con stock primero; el resto después. */
  priorizarCatalogo<T extends CandidatoDescarga>(candidatos: T[]): T[] {
    return [...candidatos].sort((a, b) => {
      const stockA = a.stock_disponible ?? 0;
      const stockB = b.stock_disponible ?? 0;
      if ((stockA > 0) !== (stockB > 0)) return stockA > 0 ? -1 : 1;
      const vendidos = (b.vendidos ?? 0) - (a.vendidos ?? 0);
      if (vendidos !== 0) return vendidos;
      return stockB - stockA;
    });
  }

  async avisarPocoEspacio(): Promise<boolean> {
    const uso = await this.medirUso();
    return uso.porcentaje >= UMBRAL_AVISO;
  }

  /** Datos que la limpieza automática jamás debe tocar. */
  async protegeDatosPendientes(): Promise<{
    operacionesPendientes: number;
    pagosSinConfirmar: number;
    carritosActivos: number;
  }> {
    const [operaciones, pagos, carritos] = await Promise.all([
      this.indexedDb.obtenerTodos<OperacionOfflineLocal>('operaciones'),
      this.indexedDb.obtenerTodos<{ estado: string }>('pagos'),
      this.indexedDb.obtenerTodos<{ estado: string }>('carrito')
    ]);

    const estadosPagados = new Set(['CONFIRMADO', 'REEMBOLSADO', 'CANCELADO', 'RECHAZADO', 'EXPIRADO']);
    return {
      operacionesPendientes: operaciones.filter((o) =>
        !['CONFIRMADA', 'DUPLICADA'].includes(o.estado_sincronizacion)
      ).length,
      pagosSinConfirmar: pagos.filter((p) => !estadosPagados.has(p.estado)).length,
      carritosActivos: carritos.filter((c) => c.estado === 'ACTIVO' || c.estado === 'CONVIRTIENDO').length
    };
  }

  disponibleBytes(uso: UsoAlmacenamientoLocal): number {
    return Math.max(0, uso.limiteBytes - uso.usadoBytes);
  }

  limiteConfiguradoBytes(): number {
    return this.limiteBytes;
  }

  private formatearBytes(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${bytes} B`;
  }
}
