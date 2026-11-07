import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { BitacoraLocal, TipoEventoLocal } from '../models/offline.model';
import { IndexedDbService } from './indexed-db.service';
import { DeviceService } from './device.service';
import { ConnectivityService } from './connectivity.service';
import { StorageService } from '../services/storage.service';
import { OfflineApiService } from '../services/offline-api.service';

export interface EventoAuditoria {
  tipo: TipoEventoLocal;
  mensaje: string;
  detalle?: Record<string, unknown>;
}

export interface FiltrosBitacora {
  tipo?: TipoEventoLocal;
  desde?: string;
  hasta?: string;
  limite?: number;
}

export interface ResumenLocalSincronizacion {
  confirmadas: number;
  duplicadas: number;
  rechazadas: number;
  conflictos: number;
  errores_criticos: number;
  pendientes: number;
  total: number;
}

const CLAVES_SENSIBLES = /token|pin|client_secret|password|contrasena|tarjeta|card|cvv/i;

/**
 * [EXAMEN-2] CU08 / RNF-10: bitácora local de eventos offline.
 * Nunca registra tokens, PIN, datos de tarjeta ni `client_secret`.
 */
@Injectable({ providedIn: 'root' })
export class OfflineAuditService {
  private indexedDb = inject(IndexedDbService);
  private device = inject(DeviceService);
  private storage = inject(StorageService);
  private connectivity = inject(ConnectivityService);
  private offlineApi = inject(OfflineApiService);

  /** Guarda un evento local; un fallo de auditoría nunca rompe el flujo principal. */
  async registrar(evento: EventoAuditoria): Promise<void> {
    try {
      const tenantId = this.storage.getTenantActivo<{ id: number }>()?.id ?? 0;
      const usuarioId = this.storage.getUser<{ id: number }>()?.id ?? 0;
      const registro: BitacoraLocal = {
        fecha: new Date().toISOString(),
        tipo: evento.tipo,
        mensaje: this.sanearTexto(evento.mensaje),
        tenant_id: tenantId,
        dispositivo_id: this.device.obtenerDispositivoId(),
        usuario_id: usuarioId,
        detalle: evento.detalle ? this.sanearDetalle(evento.detalle) : undefined
      };
      await this.indexedDb.guardar('bitacora_local', registro);
    } catch {
      // Un fallo al auditar no debe interrumpir una venta o una sincronización.
    }
  }

  async listarLocal(filtros: FiltrosBitacora = {}): Promise<BitacoraLocal[]> {
    let eventos = await this.indexedDb.obtenerTodos<BitacoraLocal>('bitacora_local');
    const tenantId = this.storage.getTenantActivo<{ id: number }>()?.id;
    if (tenantId != null) {
      eventos = eventos.filter((evento) => evento.tenant_id === tenantId);
    }
    if (filtros.tipo) eventos = eventos.filter((evento) => evento.tipo === filtros.tipo);
    if (filtros.desde) {
      const desde = Date.parse(filtros.desde);
      eventos = eventos.filter((evento) => Date.parse(evento.fecha) >= desde);
    }
    if (filtros.hasta) {
      const hasta = Date.parse(filtros.hasta);
      eventos = eventos.filter((evento) => Date.parse(evento.fecha) <= hasta);
    }

    eventos.sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
    return filtros.limite != null ? eventos.slice(0, filtros.limite) : eventos;
  }

  /**
   * Resumen para el `sync-center`. Con red se consulta el servidor y, si falla,
   * se calcula con el estado local para no dejar la pantalla vacía.
   */
  async resumenSincronizacion(): Promise<ResumenLocalSincronizacion> {
    if (this.connectivity.enLinea()) {
      try {
        const remoto = await new Promise<ResumenLocalSincronizacion>((resolve, reject) => {
          this.offlineApi.resumen().subscribe({ next: resolve, error: reject });
        });
        return {
          confirmadas: remoto.confirmadas ?? 0,
          duplicadas: remoto.duplicadas ?? 0,
          rechazadas: remoto.rechazadas ?? 0,
          conflictos: remoto.conflictos ?? 0,
          errores_criticos: remoto.errores_criticos ?? 0,
          pendientes: remoto.pendientes ?? 0,
          total: remoto.total ?? 0
        };
      } catch {
        // Sin red real pese al indicador: se usa el resumen local.
      }
    }
    return this.resumenLocal();
  }

  async resumenLocal(): Promise<ResumenLocalSincronizacion> {
    const operaciones = await this.indexedDb.obtenerTodos<{ estado_sincronizacion: string }>('operaciones');
    const resumen: ResumenLocalSincronizacion = {
      confirmadas: 0,
      duplicadas: 0,
      rechazadas: 0,
      conflictos: 0,
      errores_criticos: 0,
      pendientes: 0,
      total: operaciones.length
    };

    for (const operacion of operaciones) {
      switch (operacion.estado_sincronizacion) {
        case 'CONFIRMADA': resumen.confirmadas += 1; break;
        case 'DUPLICADA': resumen.duplicadas += 1; break;
        case 'RECHAZADA': resumen.rechazadas += 1; break;
        case 'CONFLICTO': resumen.conflictos += 1; break;
        case 'ERROR_CRITICO': resumen.errores_criticos += 1; break;
        default: resumen.pendientes += 1; break;
      }
    }
    return resumen;
  }

  /**
   * Archivo de diagnóstico para soporte: sin tokens, PIN ni secretos de pago.
   */
  async exportarDiagnostico(): Promise<Blob> {
    const [eventos, resumen] = await Promise.all([
      this.listarLocal({ limite: 500 }),
      this.resumenLocal()
    ]);

    const diagnostico = {
      generado_en: new Date().toISOString(),
      aplicacion: environment.appName,
      version_app: environment.version,
      dispositivo_id: this.device.obtenerDispositivoId(),
      rol_display: this.device.obtenerNombreDispositivo(),
      en_linea: this.connectivity.enLinea(),
      calidad_conexion: this.connectivity.calidad(),
      resumen_sincronizacion: resumen,
      eventos: eventos.map((evento) => ({
        fecha: evento.fecha,
        tipo: evento.tipo,
        mensaje: evento.mensaje,
        detalle: evento.detalle ? this.sanearDetalle(evento.detalle) : undefined
      }))
    };

    return new Blob([JSON.stringify(diagnostico, null, 2)], { type: 'application/json' });
  }

  async limpiarAntiguos(dias: number = environment.offlineRetencionDias): Promise<number> {
    const limite = Date.now() - Math.max(1, dias) * 86_400_000;
    const eventos = await this.indexedDb.obtenerTodos<BitacoraLocal>('bitacora_local');
    const viejos = eventos.filter((evento) => evento.id != null && Date.parse(evento.fecha) < limite);

    for (const evento of viejos) {
      await this.indexedDb.eliminar('bitacora_local', evento.id as number);
    }
    return viejos.length;
  }

  private sanearDetalle(detalle: Record<string, unknown>): Record<string, unknown> {
    const saneado: Record<string, unknown> = {};
    for (const [clave, valor] of Object.entries(detalle)) {
      if (CLAVES_SENSIBLES.test(clave)) {
        saneado[clave] = '[REDACTADO]';
      } else if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
        saneado[clave] = this.sanearDetalle(valor as Record<string, unknown>);
      } else if (typeof valor === 'string') {
        saneado[clave] = this.sanearTexto(valor);
      } else {
        saneado[clave] = valor;
      }
    }
    return saneado;
  }

  private sanearTexto(texto: string): string {
    // Oculta valores con forma de token o de secreto embebido en mensajes.
    return texto
      .replace(/(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/g, '[TOKEN]')
      .replace(/(sk_(?:test|live)_[A-Za-z0-9]+)/g, '[CLAVE]')
      .replace(/(pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+)/g, '[SECRETO]');
  }
}
