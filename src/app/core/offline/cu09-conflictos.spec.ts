import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConflictService } from './conflict.service';
import { ConnectivityService } from './connectivity.service';
import { DeviceService } from './device.service';
import { IndexedDbService } from './indexed-db.service';
import { OfflineAuditService } from './offline-audit.service';
import { OfflineQueueService } from './offline-queue.service';
import { OfflineApiService } from '../services/offline-api.service';
import { StorageService } from '../services/storage.service';
import {
  ConectividadFalsa,
  crearAuditoriaFalsa,
  crearConectividadFalsa,
  crearConflictoFalso,
  crearDeviceFalso,
  crearMemoriaOffline,
  crearOperacionFalsa,
  crearStorageFalso,
  MemoriaOffline
} from './testing/offline-test-doubles';

/**
 * [EXAMEN-2] CU09: conflictos de sincronización.
 * La lista funciona con caché local sin red, la clasificación explica la
 * severidad y la resolución actualiza la operación asociada.
 */
describe('ConflictService - conflictos y resolución', () => {
  let servicio: ConflictService;
  let cola: OfflineQueueService;
  let memoria: MemoriaOffline;
  let conectividad: ConectividadFalsa;
  let api: jasmine.SpyObj<OfflineApiService>;
  let auditoria: ReturnType<typeof crearAuditoriaFalsa>;

  beforeEach(() => {
    memoria = crearMemoriaOffline();
    conectividad = crearConectividadFalsa(true);
    auditoria = crearAuditoriaFalsa();

    api = jasmine.createSpyObj<OfflineApiService>('OfflineApiService', [
      'listarConflictos',
      'obtenerConflicto',
      'resolverConflicto',
      'descartarConflicto',
      'contarConflictosPendientes'
    ]);
    api.listarConflictos.and.returnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        { provide: IndexedDbService, useValue: memoria.servicio },
        { provide: DeviceService, useValue: crearDeviceFalso() },
        { provide: StorageService, useValue: crearStorageFalso() },
        { provide: ConnectivityService, useValue: conectividad.servicio },
        { provide: OfflineApiService, useValue: api },
        { provide: OfflineAuditService, useValue: auditoria.servicio }
      ]
    });

    servicio = TestBed.inject(ConflictService);
    cola = TestBed.inject(OfflineQueueService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('sin red lista la caché local por tenant, estado y fecha descendente', async () => {
    conectividad.cambiar(false);
    memoria.sembrar('conflictos', crearConflictoFalso({
      id: 1,
      tenant_id: 10,
      fecha: '2026-11-01T10:00:00.000Z'
    }));
    memoria.sembrar('conflictos', crearConflictoFalso({
      id: 2,
      tenant_id: 10,
      fecha: '2026-11-03T10:00:00.000Z',
      tipo_conflicto: 'PRECIO_DESACTUALIZADO'
    }));
    memoria.sembrar('conflictos', crearConflictoFalso({
      id: 3,
      tenant_id: 20,
      fecha: '2026-11-04T10:00:00.000Z'
    }));
    memoria.sembrar('conflictos', crearConflictoFalso({
      id: 4,
      tenant_id: 10,
      resuelto: true,
      fecha: '2026-11-04T10:00:00.000Z'
    }));

    const pendientes = await servicio.listarPendientes();
    const porTipo = await servicio.listarPendientes({ tipo: 'PRECIO_DESACTUALIZADO' });
    const paginado = await servicio.listarPendientes({ limit: 1 });

    expect(pendientes.map((conflicto) => conflicto.id)).toEqual([2, 1]);
    expect(porTipo.map((conflicto) => conflicto.id)).toEqual([2]);
    expect(paginado.map((conflicto) => conflicto.id)).toEqual([2]);
  });

  it('con red consulta el backend y deja la caché local actualizada', async () => {
    const remoto = crearConflictoFalso({ id: 9, tipo_conflicto: 'STOCK_INSUFICIENTE' });
    api.listarConflictos.and.returnValue(of([remoto]));

    const lista = await servicio.listarPendientes({ limit: 20 });

    expect(lista).toEqual([remoto]);
    expect(api.listarConflictos).toHaveBeenCalledWith(jasmine.objectContaining({ resuelto: false, limit: 20 }));
    expect((memoria.obtener('conflictos', 9) as any)?.tenant_id).toBe(10);
  });

  it('usa el conteo del servidor y actualiza la señal de nuevos', async () => {
    api.contarConflictosPendientes.and.returnValue(of({ pendientes: 4 }));

    const total = await servicio.contarPendientes();

    expect(total).toBe(4);
    expect(servicio.nuevos()).toBe(4);
  });

  it('clasifica los tipos conocidos y aplica una clasificación por defecto', () => {
    const stock = servicio.clasificarLocal({ tipo_conflicto: 'STOCK_INSUFICIENTE' });
    const desconocido = servicio.clasificarLocal({ tipo_conflicto: 'TIPO_NUEVO' });

    expect(stock.etiqueta).toBe('Stock insuficiente');
    expect(stock.severidad).toBe('MEDIA');
    expect(desconocido.etiqueta).toBe('Conflicto de sincronización');
    expect(desconocido.color).toBe('warning');
  });

  it('resolver con CONFIRMAR confirma la operación asociada y descuenta el aviso', async () => {
    memoria.sembrar('operaciones', crearOperacionFalsa({
      uuid_operacion: 'op-1',
      estado_sincronizacion: 'CONFLICTO'
    }));
    servicio.nuevos.set(2);
    const resuelto = crearConflictoFalso({
      id: 1,
      uuid_operacion: 'op-1',
      resuelto: true,
      resolucion: 'CONFIRMAR',
      observaciones: 'Validado por el administrador'
    });
    api.resolverConflicto.and.returnValue(of(resuelto));

    const conflicto = await servicio.resolver(1, 'CONFIRMAR', 'Validado por el administrador');

    expect(conflicto.resuelto).toBeTrue();
    expect(api.resolverConflicto).toHaveBeenCalledWith(1, 'CONFIRMAR', 'Validado por el administrador');
    expect((await cola.obtener('op-1'))?.estado_sincronizacion).toBe('CONFIRMADA');
    expect(servicio.nuevos()).toBe(1);
    expect(auditoria.eventos.some((evento) => evento.tipo === 'CONFLICTO')).toBeTrue();
  });

  it('descartar un conflicto también actualiza la caché y el aviso', async () => {
    servicio.nuevos.set(1);
    api.descartarConflicto.and.returnValue(of(crearConflictoFalso({
      id: 2,
      resuelto: true,
      resolucion: 'DESCARTADO'
    })));

    const conflicto = await servicio.descartar(2, 'Duplicado');

    expect(conflicto.resuelto).toBeTrue();
    expect(api.descartarConflicto).toHaveBeenCalledWith(2, 'Duplicado');
    expect(servicio.nuevos()).toBe(0);
    expect((memoria.obtener('conflictos', 2) as any)?.resolucion).toBe('DESCARTADO');
  });

  it('agrupa los conflictos pendientes por tipo', async () => {
    memoria.sembrar('conflictos', crearConflictoFalso({ id: 1, tipo_conflicto: 'STOCK_INSUFICIENTE' }));
    memoria.sembrar('conflictos', crearConflictoFalso({ id: 2, tipo_conflicto: 'STOCK_INSUFICIENTE' }));
    memoria.sembrar('conflictos', crearConflictoFalso({ id: 3, tipo_conflicto: 'PRECIO_DESACTUALIZADO' }));
    memoria.sembrar('conflictos', crearConflictoFalso({ id: 4, tipo_conflicto: 'STOCK_INSUFICIENTE', resuelto: true }));

    const resumen = await servicio.resumenPorTipo();

    expect(resumen).toEqual({
      STOCK_INSUFICIENTE: 2,
      PRECIO_DESACTUALIZADO: 1
    });
  });

  it('acumula los avisos nuevos notificados por WebSocket', () => {
    servicio.notificarNuevos(2);
    servicio.notificarNuevos(1);

    expect(servicio.nuevos()).toBe(3);
  });
});
