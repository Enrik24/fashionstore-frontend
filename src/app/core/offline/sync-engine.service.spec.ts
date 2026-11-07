import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ConflictService } from './conflict.service';
import { ConnectivityService } from './connectivity.service';
import { DeviceService } from './device.service';
import { IndexedDbService } from './indexed-db.service';
import { OfflineAuditService } from './offline-audit.service';
import { OfflineQueueService } from './offline-queue.service';
import { OfflineSessionService } from './offline-session.service';
import { SyncEngineService } from './sync-engine.service';
import { OfflineApiService } from '../services/offline-api.service';
import { StockWebSocketService } from '../services/stock-websocket.service';
import { StorageService } from '../services/storage.service';
import { LoteSincronizacion, ResultadoOperacion } from '../models/offline.model';
import {
  ConectividadFalsa,
  crearAuditoriaFalsa,
  crearConectividadFalsa,
  crearDeviceFalso,
  crearMemoriaOffline,
  crearOperacionFalsa,
  crearStorageFalso,
  MemoriaOffline
} from './testing/offline-test-doubles';

/**
 * [EXAMEN-2] CU08 / RNF-06 / RNF-18: motor de sincronización.
 * Comprueba el envío por lotes, la interpretación de resultados, la pérdida
 * cero ante fallos de red y la escucha WebSocket.
 */
describe('SyncEngineService - sincronización por lotes', () => {
  let servicio: SyncEngineService;
  let cola: OfflineQueueService;
  let memoria: MemoriaOffline;
  let conectividad: ConectividadFalsa;
  let api: jasmine.SpyObj<OfflineApiService>;
  let conflictos: jasmine.SpyObj<ConflictService>;
  let auditoria: ReturnType<typeof crearAuditoriaFalsa>;
  let callbackSync: ((evento: Record<string, unknown>) => void) | null;

  function respuesta(
    resultados: ResultadoOperacion[],
    loteId = 'lote-1'
  ): LoteSincronizacion {
    return {
      lote_id: loteId,
      tenant_id: 10,
      recibidas: resultados.length,
      procesadas: resultados.length,
      resultados,
      resumen: {}
    };
  }

  function resultado(
    uuid: string,
    estado: ResultadoOperacion['estado'],
    extra: Partial<ResultadoOperacion> = {}
  ): ResultadoOperacion {
    return {
      uuid_operacion: uuid,
      estado,
      motivo: null,
      datos_resultado: null,
      reintentar: false,
      codigo_http_sugerido: 200,
      ...extra
    };
  }

  beforeEach(() => {
    memoria = crearMemoriaOffline();
    conectividad = crearConectividadFalsa(true);
    auditoria = crearAuditoriaFalsa();

    api = jasmine.createSpyObj<OfflineApiService>('OfflineApiService', ['sincronizar']);
    conflictos = jasmine.createSpyObj<ConflictService>('ConflictService', ['contarPendientes', 'notificarNuevos']);
    conflictos.contarPendientes.and.resolveTo(0);
    callbackSync = null;

    const websocket = {
      suscribirSincronizacion: (
        _tenantId: number,
        _token: string | null,
        callback: (evento: Record<string, unknown>) => void
      ) => {
        callbackSync = callback;
        return () => undefined;
      },
      cerrarCanales: () => undefined
    } as unknown as StockWebSocketService;

    TestBed.configureTestingModule({
      providers: [
        { provide: IndexedDbService, useValue: memoria.servicio },
        { provide: DeviceService, useValue: crearDeviceFalso() },
        { provide: StorageService, useValue: crearStorageFalso() },
        { provide: ConnectivityService, useValue: conectividad.servicio },
        { provide: OfflineApiService, useValue: api },
        { provide: ConflictService, useValue: conflictos },
        { provide: OfflineAuditService, useValue: auditoria.servicio },
        { provide: StockWebSocketService, useValue: websocket },
        { provide: OfflineSessionService, useValue: { tokenOffline: () => 'token-offline' } }
      ]
    });

    servicio = TestBed.inject(SyncEngineService);
    cola = TestBed.inject(OfflineQueueService);
  });

  afterEach(() => {
    servicio.detener();
    TestBed.resetTestingModule();
  });

  it('sin conexión no envía el lote y queda en estado SIN_RED', async () => {
    conectividad.cambiar(false);
    await cola.encolar('RESERVA', { uuid_reserva: 'r-1' });

    const resultadoSync = await servicio.sincronizarAhora();

    expect(resultadoSync).toBeNull();
    expect(servicio.estado()).toBe('SIN_RED');
    expect(api.sincronizar).not.toHaveBeenCalled();
    expect(servicio.pendientes()).toBe(1);
  });

  it('interpreta confirmadas, duplicadas y conflictos del servidor', async () => {
    const primera = await cola.encolar('RESERVA', { uuid_reserva: 'r-1' });
    const segunda = await cola.encolar('VENTA_CONTADO', { uuid_venta: 'v-1' });

    api.sincronizar.and.returnValue(of(respuesta([
      resultado(primera.uuid_operacion, 'CONFIRMADA', { datos_resultado: { reserva_id: 15 } }),
      resultado(segunda.uuid_operacion, 'CONFLICTO', { motivo: 'Stock insuficiente' })
    ])));

    const resultadoSync = await servicio.sincronizarAhora();

    expect(resultadoSync?.confirmadas).toBe(1);
    expect(resultadoSync?.conflictos).toBe(1);
    expect(resultadoSync?.vacio).toBeFalse();
    expect(servicio.estado()).toBe('IDLE');
    expect((await cola.obtener(primera.uuid_operacion))?.estado_sincronizacion).toBe('CONFIRMADA');
    expect((await cola.obtener(segunda.uuid_operacion))?.estado_sincronizacion).toBe('CONFLICTO');
    expect(conflictos.notificarNuevos).toHaveBeenCalledWith(1);
    expect(auditoria.eventos.some((evento) => evento.tipo === 'SINCRONIZACION')).toBeTrue();
  });

  it('deja pendiente la operación si el servidor no devuelve su resultado', async () => {
    const operacion = await cola.encolar('RESERVA', { uuid_reserva: 'r-1' });
    api.sincronizar.and.returnValue(of(respuesta([resultado('otra-operacion', 'CONFIRMADA')])));

    const resultadoSync = await servicio.sincronizarLote();
    const local = await cola.obtener(operacion.uuid_operacion);

    expect(resultadoSync.confirmadas).toBe(0);
    expect(local?.estado_sincronizacion).toBe('PENDIENTE');
    expect(local?.error_detalle).toContain('no devolvió resultado');
  });

  it('un fallo de red no pierde operaciones: vuelven a pendientes y se reprograman', async () => {
    const operacion = await cola.encolar('VENTA_CONTADO', { uuid_venta: 'v-1' });
    api.sincronizar.and.returnValue(throwError(() => new Error('red caída')));

    await expectAsync(servicio.sincronizarAhora()).toBeRejectedWithError('red caída');

    const local = await cola.obtener(operacion.uuid_operacion);
    expect(servicio.estado()).toBe('ERROR');
    expect(local?.estado_sincronizacion).toBe('PENDIENTE');
    expect(local?.error_detalle).toBe('red caída');
    expect(local?.programado_para).not.toBeNull();
    expect(auditoria.eventos.some((evento) => evento.tipo === 'ERROR')).toBeTrue();
  });

  it('reintenta las fallidas con retroceso exponencial', async () => {
    memoria.sembrar('operaciones', crearOperacionFalsa({
      uuid_operacion: 'rechazada',
      estado_sincronizacion: 'RECHAZADA',
      motivo_rechazo: 'Precio desactualizado'
    }));
    memoria.sembrar('operaciones', crearOperacionFalsa({
      uuid_operacion: 'critica',
      estado_sincronizacion: 'ERROR_CRITICO',
      secuencia_local: 2
    }));

    const programadas = await servicio.reintentarFallidas();

    expect(programadas).toBe(2);
    expect((await cola.obtener('rechazada'))?.estado_sincronizacion).toBe('PENDIENTE');
    expect((await cola.obtener('critica'))?.estado_sincronizacion).toBe('PENDIENTE');
    expect((await cola.obtener('critica'))?.programado_para).not.toBeNull();
  });

  it('no permite cerrar sesión sin conexión si hay pendientes', async () => {
    conectividad.cambiar(false);
    await cola.encolar('RESERVA', { uuid_reserva: 'r-1' });

    const cierre = await servicio.sincronizarAntesDeCerrar();

    expect(cierre.puedeCerrar).toBeFalse();
    expect(cierre.pendientes).toBe(1);
    expect(cierre.mensaje).toContain('se perderían');
  });

  it('permite cerrar sesión cuando la cola está vacía', async () => {
    const cierre = await servicio.sincronizarAntesDeCerrar();

    expect(cierre.puedeCerrar).toBeTrue();
    expect(cierre.pendientes).toBe(0);
  });

  it('notifica conflictos nuevos y refresca contadores desde el WebSocket', async () => {
    memoria.sembrar('operaciones', crearOperacionFalsa({ uuid_operacion: 'p', estado_sincronizacion: 'PENDIENTE' }));

    servicio.activarEscuchaServidor();
    expect(callbackSync).not.toBeNull();

    callbackSync?.({ evento: 'conflicto_detectado', conflictos: 2 });
    expect(conflictos.notificarNuevos).toHaveBeenCalledWith(2);

    callbackSync?.({ evento: 'lote_procesado' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(servicio.pendientes()).toBe(1);
  });
});
