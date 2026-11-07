import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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
  crearConectividadFalsa,
  crearDeviceFalso,
  crearMemoriaOffline,
  crearOperacionFalsa,
  crearStorageFalso,
  MemoriaOffline
} from './testing/offline-test-doubles';

/**
 * [EXAMEN-2] CU08: centro de sincronización.
 * Integra la cola FIFO con el motor y el resumen local que ve el usuario.
 */
describe('CU08 - Sincronización y resumen de la cola', () => {
  let motor: SyncEngineService;
  let cola: OfflineQueueService;
  let auditoria: OfflineAuditService;
  let memoria: MemoriaOffline;
  let conectividad: ConectividadFalsa;
  let api: jasmine.SpyObj<OfflineApiService>;
  let conflictos: jasmine.SpyObj<ConflictService>;

  function lote(resultados: ResultadoOperacion[], loteId = 'lote'): LoteSincronizacion {
    return {
      lote_id: loteId,
      tenant_id: 10,
      recibidas: resultados.length,
      procesadas: resultados.length,
      resultados,
      resumen: {}
    };
  }

  function resultado(uuid: string, estado: ResultadoOperacion['estado']): ResultadoOperacion {
    return {
      uuid_operacion: uuid,
      estado,
      motivo: null,
      datos_resultado: null,
      reintentar: false,
      codigo_http_sugerido: 200
    };
  }

  beforeEach(() => {
    memoria = crearMemoriaOffline();
    conectividad = crearConectividadFalsa(true);

    api = jasmine.createSpyObj<OfflineApiService>('OfflineApiService', ['sincronizar', 'resumen']);
    conflictos = jasmine.createSpyObj<ConflictService>('ConflictService', ['contarPendientes', 'notificarNuevos']);
    conflictos.contarPendientes.and.resolveTo(0);

    const websocket = {
      suscribirSincronizacion: () => () => undefined,
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
        { provide: StockWebSocketService, useValue: websocket },
        { provide: OfflineSessionService, useValue: { tokenOffline: () => 'token-offline' } }
      ]
    });

    motor = TestBed.inject(SyncEngineService);
    cola = TestBed.inject(OfflineQueueService);
    auditoria = TestBed.inject(OfflineAuditService);
  });

  afterEach(() => {
    motor.detener();
    TestBed.resetTestingModule();
  });

  it('resume la cola local por estado para el centro de sincronización', async () => {
    memoria.sembrar('operaciones', crearOperacionFalsa({ uuid_operacion: 'p', estado_sincronizacion: 'PENDIENTE' }));
    memoria.sembrar('operaciones', crearOperacionFalsa({ uuid_operacion: 'c', estado_sincronizacion: 'CONFIRMADA' }));
    memoria.sembrar('operaciones', crearOperacionFalsa({ uuid_operacion: 'd', estado_sincronizacion: 'DUPLICADA' }));
    memoria.sembrar('operaciones', crearOperacionFalsa({ uuid_operacion: 'r', estado_sincronizacion: 'RECHAZADA' }));
    memoria.sembrar('operaciones', crearOperacionFalsa({ uuid_operacion: 'x', estado_sincronizacion: 'CONFLICTO' }));
    memoria.sembrar('operaciones', crearOperacionFalsa({ uuid_operacion: 'e', estado_sincronizacion: 'ERROR_CRITICO' }));

    const resumen = await auditoria.resumenLocal();

    expect(resumen).toEqual({
      confirmadas: 1,
      duplicadas: 1,
      rechazadas: 1,
      conflictos: 1,
      errores_criticos: 1,
      pendientes: 1,
      total: 6
    });
  });

  it('envía varios lotes consecutivos y agrega el resultado final', async () => {
    const primera = await cola.encolar('RESERVA', { uuid_reserva: 'r-1' });
    const segunda = await cola.encolar('VENTA_CONTADO', { uuid_venta: 'v-1' });
    const tercera = await cola.encolar('ORDEN_PAGO_DIFERIDO', { uuid_carrito: 'c-1' });

    api.sincronizar.and.returnValues(
      of(lote([resultado(primera.uuid_operacion, 'CONFIRMADA')], 'lote-1')),
      of(lote([
        resultado(segunda.uuid_operacion, 'DUPLICADA'),
        resultado(tercera.uuid_operacion, 'RECHAZADA')
      ], 'lote-2'))
    );

    const resultadoSync = await motor.sincronizarAhora();

    expect(resultadoSync?.confirmadas).toBe(1);
    expect(resultadoSync?.duplicadas).toBe(1);
    expect(resultadoSync?.rechazadas).toBe(1);
    expect(resultadoSync?.loteId).toBe('lote-2');
    expect(motor.estado()).toBe('IDLE');
    expect(api.sincronizar).toHaveBeenCalledTimes(2);
    expect(await cola.pendientes()).toEqual([]);
  });

  it('sincroniza antes de cerrar sesión y confirma que ya se puede salir', async () => {
    const operacion = await cola.encolar('RESERVA', { uuid_reserva: 'r-1' });
    api.sincronizar.and.returnValue(of(lote([resultado(operacion.uuid_operacion, 'CONFIRMADA')])));

    const cierre = await motor.sincronizarAntesDeCerrar();

    expect(cierre.puedeCerrar).toBeTrue();
    expect(cierre.pendientes).toBe(0);
    expect(cierre.mensaje).toContain('Sincronización completada');
  });

  it('refleja el estado del motor al perder y recuperar la conexión', async () => {
    await cola.encolar('RESERVA', { uuid_reserva: 'r-1' });

    conectividad.cambiar(false);
    await motor.sincronizarAhora();
    expect(motor.estado()).toBe('SIN_RED');

    conectividad.cambiar(true);
    api.sincronizar.and.returnValue(of(lote([
      resultado((await cola.pendientes())[0].uuid_operacion, 'CONFIRMADA')
    ])));
    await motor.sincronizarAhora();

    expect(motor.estado()).toBe('IDLE');
    expect(motor.pendientes()).toBe(0);
  });
});
