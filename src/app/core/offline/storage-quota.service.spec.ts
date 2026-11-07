import { TestBed } from '@angular/core/testing';
import { IndexedDbService } from './indexed-db.service';
import { StorageQuotaService } from './storage-quota.service';
import { environment } from '../../../environments/environment';
import {
  crearCarritoFalso,
  crearComprobanteFalso,
  crearConflictoFalso,
  crearMemoriaOffline,
  crearOperacionFalsa,
  crearPagoFalso,
  MemoriaOffline
} from './testing/offline-test-doubles';

/**
 * [EXAMEN-2] RNF-14: cuota local y limpieza segura.
 * La limpieza nunca debe borrar operaciones, pagos ni carritos pendientes.
 */
describe('StorageQuotaService - cuota y limpieza local', () => {
  let servicio: StorageQuotaService;
  let memoria: MemoriaOffline;

  const LIMITE = 50 * 1024 * 1024;

  beforeEach(() => {
    memoria = crearMemoriaOffline();
    memoria.uso.limiteBytes = LIMITE;
    TestBed.configureTestingModule({
      providers: [{ provide: IndexedDbService, useValue: memoria.servicio }]
    });
    servicio = TestBed.inject(StorageQuotaService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('permite descargar solo si el volumen cabe en el espacio disponible', async () => {
    memoria.uso.usadoBytes = LIMITE - 1_000;

    await expectAsync(servicio.puedeDescargar(800)).toBeResolvedTo(true);
    await expectAsync(servicio.puedeDescargar(1_200)).toBeResolvedTo(false);
  });

  it('propone una descarga selectiva priorizando stock y ventas', async () => {
    memoria.uso.usadoBytes = LIMITE - 1_000;

    const plan = await servicio.solicitarDescargaSelectiva(5_000, [
      { variante_producto_id: 1, stock_disponible: 0, vendidos: 100 },
      { variante_producto_id: 2, stock_disponible: 5, vendidos: 1 },
      { variante_producto_id: 3, stock_disponible: 9, vendidos: 3 }
    ]);

    expect(plan.requiereSeleccion).toBeTrue();
    expect(plan.excedenteBytes).toBe(4_000);
    expect(plan.disponibleBytes).toBe(1_000);
    expect(plan.prioridad).toEqual([3, 2, 1]);
    expect(plan.mensaje).toContain('Faltan');
  });

  it('no pide selección cuando la descarga cabe completa', async () => {
    memoria.uso.usadoBytes = 1_000;

    const plan = await servicio.solicitarDescargaSelectiva(500, [
      { variante_producto_id: 1, stock_disponible: 0 }
    ]);

    expect(plan.requiereSeleccion).toBeFalse();
    expect(plan.excedenteBytes).toBe(0);
  });

  it('limpia sincronizados antiguos y conserva pendientes', async () => {
    const viejo = '2020-01-01T00:00:00.000Z';
    memoria.sembrar('operaciones', crearOperacionFalsa({
      uuid_operacion: 'confirmada-vieja',
      estado_sincronizacion: 'CONFIRMADA',
      fecha_registro_local: viejo
    }));
    memoria.sembrar('operaciones', crearOperacionFalsa({
      uuid_operacion: 'pendiente-vieja',
      estado_sincronizacion: 'PENDIENTE',
      fecha_registro_local: viejo
    }));
    memoria.sembrar('comprobantes', crearComprobanteFalso({
      uuid_offline: 'comp-viejo',
      es_temporal: false,
      created_at: viejo
    }));
    memoria.sembrar('comprobantes', crearComprobanteFalso({
      uuid_offline: 'comp-nuevo',
      es_temporal: false,
      created_at: new Date().toISOString()
    }));
    memoria.sembrar('conflictos', crearConflictoFalso({
      id: 1,
      resuelto: true,
      fecha: viejo,
      fecha_resolucion: viejo
    }));
    memoria.sembrar('conflictos', crearConflictoFalso({ id: 2, resuelto: false, fecha: viejo }));
    memoria.sembrar('bitacora_local', {
      fecha: viejo,
      tipo: 'SINCRONIZACION',
      mensaje: 'evento viejo',
      tenant_id: 10,
      dispositivo_id: 'dev-1',
      usuario_id: 7
    });

    const resultado = await servicio.limpiarSincronizados();

    expect(resultado.operaciones).toBe(1);
    expect(resultado.comprobantes).toBe(1);
    expect(resultado.conflictos).toBe(1);
    expect(resultado.bitacora).toBe(1);
    expect(resultado.bytesLiberadosEstimados).toBe(4 * 1024);
    expect(memoria.obtener('operaciones', 'confirmada-vieja')).toBeNull();
    expect(memoria.obtener('operaciones', 'pendiente-vieja')).not.toBeNull();
    expect(memoria.obtener('comprobantes', 'comp-nuevo')).not.toBeNull();
    expect(memoria.obtener('conflictos', 2)).not.toBeNull();
  });

  it('la limpieza por antigüedad también respeta los pendientes', async () => {
    const viejo = '2020-01-01T00:00:00.000Z';
    memoria.sembrar('operaciones', crearOperacionFalsa({
      uuid_operacion: 'confirmada',
      estado_sincronizacion: 'CONFIRMADA',
      fecha_registro_local: viejo
    }));
    memoria.sembrar('operaciones', crearOperacionFalsa({
      uuid_operacion: 'pendiente',
      estado_sincronizacion: 'PENDIENTE',
      fecha_registro_local: viejo
    }));
    memoria.sembrar('comprobantes', crearComprobanteFalso({
      uuid_offline: 'temporal-reemplazado',
      es_temporal: true,
      reemplazado_por: 'DEFINITIVO',
      created_at: viejo
    }));
    memoria.sembrar('bitacora_local', {
      fecha: viejo,
      tipo: 'ERROR',
      mensaje: 'error viejo',
      tenant_id: 10,
      dispositivo_id: 'dev-1',
      usuario_id: 7
    });

    const resultado = await servicio.limpiarPorAntiguedad(1);

    expect(resultado.operaciones).toBe(1);
    expect(resultado.comprobantes).toBe(1);
    expect(resultado.bitacora).toBe(1);
    expect(memoria.obtener('operaciones', 'pendiente')).not.toBeNull();
  });

  it('informa qué datos pendientes están protegidos', async () => {
    memoria.sembrar('operaciones', crearOperacionFalsa({ uuid_operacion: 'p', estado_sincronizacion: 'PENDIENTE' }));
    memoria.sembrar('operaciones', crearOperacionFalsa({ uuid_operacion: 'c', estado_sincronizacion: 'CONFIRMADA' }));
    memoria.sembrar('pagos', crearPagoFalso({ uuid_pago: 'p1', estado: 'EN_COLA' }));
    memoria.sembrar('pagos', crearPagoFalso({ uuid_pago: 'p2', estado: 'CONFIRMADO' }));
    memoria.sembrar('carrito', crearCarritoFalso({ uuid_carrito: 'activo', estado: 'ACTIVO' }));
    memoria.sembrar('carrito', crearCarritoFalso({ uuid_carrito: 'convertido', estado: 'CONVERTIDO' }));

    const protegidos = await servicio.protegeDatosPendientes();

    expect(protegidos.operacionesPendientes).toBe(1);
    expect(protegidos.pagosSinConfirmar).toBe(1);
    expect(protegidos.carritosActivos).toBe(1);
  });

  it('avisa cuando el uso supera el 85 %', async () => {
    memoria.uso.usadoBytes = Math.round(LIMITE * 0.84);
    await expectAsync(servicio.avisarPocoEspacio()).toBeResolvedTo(false);

    memoria.uso.usadoBytes = Math.round(LIMITE * 0.86);
    await expectAsync(servicio.avisarPocoEspacio()).toBeResolvedTo(true);
  });

  it('expone el límite configurado y los bytes disponibles', () => {
    memoria.uso.usadoBytes = 5 * 1024 * 1024;

    expect(servicio.limiteConfiguradoBytes()).toBe(environment.offlineMaxMbLocal * 1024 * 1024);
    expect(servicio.disponibleBytes(memoria.uso)).toBe(LIMITE - 5 * 1024 * 1024);
  });
});
