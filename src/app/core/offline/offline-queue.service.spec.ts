import { TestBed } from '@angular/core/testing';
import { DeviceService } from './device.service';
import { IndexedDbService } from './indexed-db.service';
import { OfflineQueueService } from './offline-queue.service';
import { StorageService } from '../services/storage.service';
import {
  crearDeviceFalso,
  crearMemoriaOffline,
  crearOperacionFalsa,
  crearStorageFalso,
  MemoriaOffline
} from './testing/offline-test-doubles';

/**
 * [EXAMEN-2] CU08 / RNF-16: cola FIFO persistente.
 * Verifica secuencia monotónica, orden de envío, reintentos programados y
 * transiciones de estado que consume `sync-engine`.
 */
describe('OfflineQueueService - cola FIFO de operaciones', () => {
  let servicio: OfflineQueueService;
  let memoria: MemoriaOffline;

  beforeEach(() => {
    memoria = crearMemoriaOffline();
    TestBed.configureTestingModule({
      providers: [
        { provide: IndexedDbService, useValue: memoria.servicio },
        { provide: DeviceService, useValue: crearDeviceFalso() },
        { provide: StorageService, useValue: crearStorageFalso() }
      ]
    });
    servicio = TestBed.inject(OfflineQueueService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('asigna una secuencia local monotónica y una huella del payload', async () => {
    const primera = await servicio.encolar('RESERVA', { uuid_reserva: 'r-1' });
    const segunda = await servicio.encolar('VENTA_CONTADO', { uuid_venta: 'v-1' });

    expect(primera.secuencia_local).toBe(1);
    expect(segunda.secuencia_local).toBe(2);
    expect(primera.estado_sincronizacion).toBe('PENDIENTE');
    expect(primera.hash_payload).toMatch(/^[0-9a-f]{8}$/);
    expect(primera.tenant_id).toBe(10);
    expect(primera.dispositivo_id).toBe('dev-1');
  });

  it('ordena las pendientes por secuencia aunque se guarden desordenadas', async () => {
    memoria.sembrar('operaciones', crearOperacionFalsa({ uuid_operacion: 'c', secuencia_local: 3 }));
    memoria.sembrar('operaciones', crearOperacionFalsa({ uuid_operacion: 'a', secuencia_local: 1 }));
    memoria.sembrar('operaciones', crearOperacionFalsa({ uuid_operacion: 'b', secuencia_local: 2 }));

    const pendientes = await servicio.pendientes();

    expect(pendientes.map((operacion) => operacion.uuid_operacion)).toEqual(['a', 'b', 'c']);
  });

  it('respeta los reintentos programados salvo que se incluyan explícitamente', async () => {
    const futuro = new Date(Date.now() + 120_000).toISOString();
    memoria.sembrar('operaciones', crearOperacionFalsa({
      uuid_operacion: 'programada',
      secuencia_local: 1,
      programado_para: futuro
    }));
    memoria.sembrar('operaciones', crearOperacionFalsa({
      uuid_operacion: 'lista',
      secuencia_local: 2,
      programado_para: null
    }));

    const normal = await servicio.tomarLote(50, false);
    const forzado = await servicio.tomarLote(50, true);

    expect(normal.map((operacion) => operacion.uuid_operacion)).toEqual(['lista']);
    expect(forzado.map((operacion) => operacion.uuid_operacion)).toEqual(['programada', 'lista']);
  });

  it('limita el tamaño del lote al máximo configurado', async () => {
    for (let indice = 1; indice <= 5; indice += 1) {
      memoria.sembrar('operaciones', crearOperacionFalsa({
        uuid_operacion: `op-${indice}`,
        secuencia_local: indice
      }));
    }

    const lote = await servicio.tomarLote(2);

    expect(lote.length).toBe(2);
    expect(lote[0].secuencia_local).toBe(1);
  });

  it('cuenta los estados que muestra el centro de sincronización', async () => {
    memoria.sembrar('operaciones', crearOperacionFalsa({ uuid_operacion: 'p', estado_sincronizacion: 'PENDIENTE' }));
    memoria.sembrar('operaciones', crearOperacionFalsa({ uuid_operacion: 's', estado_sincronizacion: 'SINCRONIZANDO' }));
    memoria.sembrar('operaciones', crearOperacionFalsa({ uuid_operacion: 'c', estado_sincronizacion: 'CONFIRMADA' }));
    memoria.sembrar('operaciones', crearOperacionFalsa({ uuid_operacion: 'x', estado_sincronizacion: 'CONFLICTO' }));
    memoria.sembrar('operaciones', crearOperacionFalsa({ uuid_operacion: 'e', estado_sincronizacion: 'ERROR_CRITICO' }));

    const contadores = await servicio.contadores();

    expect(contadores.pendientes).toBe(1);
    expect(contadores.sincronizando).toBe(1);
    expect(contadores.confirmadas).toBe(1);
    expect(contadores.conflictos).toBe(1);
    expect(contadores.erroresCriticos).toBe(1);
    expect(contadores.total).toBe(5);
  });

  it('marca confirmada con el resultado del servidor y limpia el error', async () => {
    memoria.sembrar('operaciones', crearOperacionFalsa({
      uuid_operacion: 'op-1',
      estado_sincronizacion: 'SINCRONIZANDO',
      error_detalle: 'error previo'
    }));

    await servicio.marcarConfirmada('op-1', { orden_id: 99 });

    const operacion = await servicio.obtener('op-1');
    expect(operacion?.estado_sincronizacion).toBe('CONFIRMADA');
    expect(operacion?.resultado_json).toEqual({ orden_id: 99 });
    expect(operacion?.error_detalle).toBeNull();
    expect(operacion?.requiere_revision).toBeFalse();
  });

  it('un reintento manual conserva la secuencia original y limpia el motivo', async () => {
    memoria.sembrar('operaciones', crearOperacionFalsa({
      uuid_operacion: 'rechazada',
      secuencia_local: 8,
      estado_sincronizacion: 'RECHAZADA',
      motivo_rechazo: 'Stock insuficiente',
      requiere_revision: true,
      programado_para: new Date().toISOString()
    }));

    const preparada = await servicio.prepararReintento('rechazada');

    expect(preparada?.estado_sincronizacion).toBe('PENDIENTE');
    expect(preparada?.secuencia_local).toBe(8);
    expect(preparada?.motivo_rechazo).toBeNull();
    expect(preparada?.requiere_revision).toBeFalse();
    expect(preparada?.programado_para).toBeNull();
  });

  it('programa el próximo intento con retroceso exponencial', async () => {
    memoria.sembrar('operaciones', crearOperacionFalsa({
      uuid_operacion: 'fallida',
      estado_sincronizacion: 'ERROR_CRITICO',
      intentos: 2
    }));

    const fecha = await servicio.programarReintento('fallida');

    expect(fecha).not.toBeNull();
    expect(Date.parse(fecha as string)).toBeGreaterThan(Date.now());
    const operacion = await servicio.obtener('fallida');
    expect(Date.parse(operacion?.programado_para as string)).toBeGreaterThan(Date.now());
  });

  it('solo lista como reintentables las rechazadas, conflictos y errores críticos', async () => {
    memoria.sembrar('operaciones', crearOperacionFalsa({ uuid_operacion: 'r', estado_sincronizacion: 'RECHAZADA' }));
    memoria.sembrar('operaciones', crearOperacionFalsa({ uuid_operacion: 'c', estado_sincronizacion: 'CONFLICTO' }));
    memoria.sembrar('operaciones', crearOperacionFalsa({ uuid_operacion: 'e', estado_sincronizacion: 'ERROR_CRITICO' }));
    memoria.sembrar('operaciones', crearOperacionFalsa({ uuid_operacion: 'p', estado_sincronizacion: 'PENDIENTE' }));

    const reintentables = await servicio.reintentables();

    expect(reintentables.map((operacion) => operacion.uuid_operacion)).toEqual(['r', 'c', 'e']);
  });

  it('arma el payload exacto del lote sin campos locales', async () => {
    const operacion = crearOperacionFalsa({
      uuid_operacion: 'op-1',
      secuencia_local: 4,
      sucursal_id: 2,
      payload: { uuid_reserva: 'r-1' }
    });

    const item = servicio.aItemLote(operacion);

    expect(item.uuid_operacion).toBe('op-1');
    expect(item.secuencia_local).toBe(4);
    expect(item.sucursal_id).toBe(2);
    expect(item.payload).toEqual({ uuid_reserva: 'r-1' });
    expect((item as unknown as Record<string, unknown>)['estado_sincronizacion']).toBeUndefined();
  });
});
