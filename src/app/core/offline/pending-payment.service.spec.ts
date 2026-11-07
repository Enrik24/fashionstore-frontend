import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ConnectivityService } from './connectivity.service';
import { DeviceService } from './device.service';
import { IndexedDbService } from './indexed-db.service';
import { OfflineAuditService } from './offline-audit.service';
import { OfflineQueueService } from './offline-queue.service';
import { OfflineSessionService } from './offline-session.service';
import { PendingPaymentService } from './pending-payment.service';
import { PagosDiferidosApiService } from '../services/pagos-diferidos-api.service';
import { StockWebSocketService } from '../services/stock-websocket.service';
import { StorageService } from '../services/storage.service';
import { ResultadoPagoDiferido } from '../models/pago-diferido.model';
import {
  ConectividadFalsa,
  crearAuditoriaFalsa,
  crearConectividadFalsa,
  crearDeviceFalso,
  crearMemoriaOffline,
  crearOrdenFalsa,
  crearPagoFalso,
  crearStorageFalso,
  MemoriaOffline
} from './testing/offline-test-doubles';

/**
 * [EXAMEN-2] CU16 / RN-015 / RN-016 / RNF-15: pago diferido.
 * Cubre el envío FIFO, el secreto solo en memoria, el reintento, la expiración
 * con liberación de stock y la conciliación por WebSocket.
 */
describe('PendingPaymentService - pagos diferidos', () => {
  let servicio: PendingPaymentService;
  let cola: OfflineQueueService;
  let memoria: MemoriaOffline;
  let conectividad: ConectividadFalsa;
  let api: jasmine.SpyObj<PagosDiferidosApiService>;
  let auditoria: ReturnType<typeof crearAuditoriaFalsa>;

  function remoto(parcial: Partial<ResultadoPagoDiferido> = {}): ResultadoPagoDiferido {
    return {
      id: 77,
      uuid_pago: 'pago-1',
      orden_id: 15,
      uuid_orden: 'orden-1',
      monto: 250,
      moneda: 'BOB',
      estado: 'PENDIENTE_ENVIO',
      requiere_accion: false,
      intentos: 0,
      client_secret: 'cs_test_123',
      checkout_url: 'https://checkout.stripe.test/sesion',
      simulado: false,
      ...parcial
    };
  }

  beforeEach(() => {
    memoria = crearMemoriaOffline();
    conectividad = crearConectividadFalsa(true);
    auditoria = crearAuditoriaFalsa();

    api = jasmine.createSpyObj<PagosDiferidosApiService>('PagosDiferidosApiService', [
      'crearPago',
      'obtenerPago',
      'confirmarPago',
      'reintentarPago',
      'cancelarPago',
      'listarPagos',
      'contarPendientes',
      'reembolsar',
      'listarEventos'
    ]);
    api.contarPendientes.and.returnValue(of({ pendientes: 0 }));
    api.listarPagos.and.returnValue(of([]));

    const websocket = {
      suscribirPagos: () => () => undefined,
      cerrarCanales: () => undefined
    } as unknown as StockWebSocketService;

    TestBed.configureTestingModule({
      providers: [
        { provide: IndexedDbService, useValue: memoria.servicio },
        { provide: DeviceService, useValue: crearDeviceFalso() },
        { provide: StorageService, useValue: crearStorageFalso() },
        { provide: ConnectivityService, useValue: conectividad.servicio },
        { provide: PagosDiferidosApiService, useValue: api },
        { provide: OfflineAuditService, useValue: auditoria.servicio },
        { provide: StockWebSocketService, useValue: websocket },
        { provide: OfflineSessionService, useValue: { tokenOffline: () => 'token-offline' } }
      ]
    });

    servicio = TestBed.inject(PendingPaymentService);
    cola = TestBed.inject(OfflineQueueService);
  });

  afterEach(() => {
    servicio.detenerEscuchaPagos();
    TestBed.resetTestingModule();
  });

  it('encola el pago una sola vez y sin persistir el client_secret', async () => {
    const orden = crearOrdenFalsa();

    const primero = await servicio.encolarPago(orden);
    const segundo = await servicio.encolarPago(orden);

    expect(segundo.uuid_pago).toBe(primero.uuid_pago);
    expect(primero.estado).toBe('PENDIENTE_ENVIO');
    expect(primero.uuid_orden).toBe('orden-1');
    expect(primero.monto).toBe(250);
    expect(memoria.todos('pagos').length).toBe(1);
  });

  it('envía en FIFO los pagos cuya orden local ya fue confirmada', async () => {
    memoria.sembrar('ordenes_locales', crearOrdenFalsa());
    memoria.sembrar('pagos', crearPagoFalso({ estado: 'PENDIENTE_ENVIO' }));
    api.crearPago.and.returnValue(of(remoto()));

    const preparaciones = await servicio.enviarPendientes();

    expect(preparaciones.length).toBe(1);
    expect(preparaciones[0].pendienteOrden).toBeFalse();
    expect(preparaciones[0].checkoutUrl).toBe('https://checkout.stripe.test/sesion');
    expect(preparaciones[0].clientSecret).toBe('cs_test_123');
    expect(api.crearPago).toHaveBeenCalledWith(jasmine.objectContaining({
      uuid_pago: 'pago-1',
      uuid_orden: 'orden-1',
      uuid_carrito: 'carrito-1',
      monto: 250
    }));

    const guardado = memoria.obtener('pagos', 'pago-1');
    expect((guardado as any)?.pago_id).toBe(77);
    expect((guardado as any)?.client_secret).toBeUndefined();
  });

  it('no envía el pago mientras la orden siga pendiente de sincronizar', async () => {
    memoria.sembrar('ordenes_locales', crearOrdenFalsa());
    await cola.encolar('ORDEN_PAGO_DIFERIDO', { uuid_pago: 'pago-1', uuid_orden: 'orden-1' });
    memoria.sembrar('pagos', crearPagoFalso({ estado: 'PENDIENTE_ENVIO' }));

    const preparaciones = await servicio.enviarPendientes();

    expect(preparaciones[0].pendienteOrden).toBeTrue();
    expect(preparaciones[0].pago).toBeNull();
    expect(preparaciones[0].mensaje).toContain('no fue confirmado');
    expect(api.crearPago).not.toHaveBeenCalled();
  });

  it('reintentar sin conexión incrementa intentos y no llama al backend', async () => {
    conectividad.cambiar(false);
    memoria.sembrar('pagos', crearPagoFalso({ estado: 'RECHAZADO', intentos: 2 }));

    const pago = await servicio.reintentar('pago-1');

    expect(pago.estado).toBe('PENDIENTE_ENVIO');
    expect(pago.intentos).toBe(3);
    expect(pago.ultimo_error).toContain('Sin conexión');
    expect(api.reintentarPago).not.toHaveBeenCalled();
  });

  it('reintentar con red agotada marca ERROR_CRITICO al llegar al máximo', async () => {
    memoria.sembrar('pagos', crearPagoFalso({ estado: 'RECHAZADO', intentos: 4 }));
    api.reintentarPago.and.returnValue(throwError(() => new Error('tarjeta rechazada')));

    const pago = await servicio.reintentar('pago-1');

    expect(pago.estado).toBe('ERROR_CRITICO');
    expect(pago.intentos).toBe(5);
    expect(pago.motivo_rechazo).toContain('Se agotaron');
  });

  it('detecta la expiración, marca EXPIRADO y libera la orden local', async () => {
    const vencido = new Date(Date.now() - 3_600_000).toISOString();
    memoria.sembrar('pagos', crearPagoFalso({ estado: 'EN_COLA', fecha_expiracion: vencido }));
    memoria.sembrar('ordenes_locales', crearOrdenFalsa());
    memoria.sembrar('pagos', crearPagoFalso({
      uuid_pago: 'pago-terminal',
      estado: 'CONFIRMADO',
      fecha_expiracion: vencido
    }));

    const expirados = await servicio.detectarExpiracion();

    expect(expirados).toBe(1);
    expect((memoria.obtener('pagos', 'pago-1') as any)?.estado).toBe('EXPIRADO');
    expect((memoria.obtener('ordenes_locales', 'orden-1') as any)?.estado).toBe('EXPIRADA');
    expect((memoria.obtener('pagos', 'pago-terminal') as any)?.estado).toBe('CONFIRMADO');
    expect(auditoria.eventos.some((evento) => (evento.mensaje ?? '').includes('expiraron'))).toBeTrue();
  });

  it('el WebSocket de pagos confirma la orden y guarda el pago remoto', async () => {
    memoria.sembrar('pagos', crearPagoFalso({ estado: 'EN_PROCESO' }));
    memoria.sembrar('ordenes_locales', crearOrdenFalsa());

    const pago = await servicio.procesarWebhookNotificado({
      evento: 'pago.confirmado',
      uuid_pago: 'pago-1',
      pago_id: 77,
      estado: 'CONFIRMADO'
    });

    expect(pago?.estado).toBe('CONFIRMADO');
    expect(pago?.pago_id).toBe(77);
    expect((memoria.obtener('ordenes_locales', 'orden-1') as any)?.estado).toBe('CONFIRMADA');
  });

  it('ignora eventos de pagos que no existen localmente', async () => {
    const pago = await servicio.procesarWebhookNotificado({
      evento: 'pago.confirmado',
      uuid_pago: 'desconocido',
      estado: 'CONFIRMADO'
    });

    expect(pago).toBeNull();
  });

  it('cancelar libera el stock local y deja el pago cancelado', async () => {
    conectividad.cambiar(false);
    memoria.sembrar('pagos', crearPagoFalso({ estado: 'EN_COLA' }));
    memoria.sembrar('ordenes_locales', crearOrdenFalsa());

    const pago = await servicio.cancelar('pago-1');

    expect(pago.estado).toBe('CANCELADO');
    expect((memoria.obtener('ordenes_locales', 'orden-1') as any)?.estado).toBe('CANCELADA');
  });

  it('reembolsar actualiza el pago local y cancela la orden', async () => {
    memoria.sembrar('pagos', crearPagoFalso({ estado: 'CONFIRMADO', pago_id: 77 }));
    memoria.sembrar('ordenes_locales', crearOrdenFalsa({ estado: 'CONFIRMADA' }));
    api.reembolsar.and.returnValue(of({ reembolsado: true, reembolso_id: 're_1', monto: 250 }));

    const resultado = await servicio.reembolsar(77, 250, 'orden rechazada');

    expect(resultado.reembolsado).toBeTrue();
    expect((memoria.obtener('pagos', 'pago-1') as any)?.estado).toBe('REEMBOLSADO');
    expect((memoria.obtener('ordenes_locales', 'orden-1') as any)?.estado).toBe('CANCELADA');
  });

  it('sin Stripe.js usa la redirección segura como alternativa documentada', () => {
    (window as any).Stripe = undefined;

    const resultado = servicio.enriquecerConStripeJs('cs_test_123', 'pk_test_123');

    expect(resultado.disponible).toBeFalse();
    expect(resultado.usarRedireccion).toBeTrue();
    expect(resultado.clientSecret).toBe('cs_test_123');
    expect(resultado.mensaje).toContain('redirección');
  });

  it('sin conexión consulta el pago local y cuenta los pendientes reales', async () => {
    conectividad.cambiar(false);
    memoria.sembrar('pagos', crearPagoFalso({ uuid_pago: 'p1', estado: 'PENDIENTE_ENVIO' }));
    memoria.sembrar('pagos', crearPagoFalso({ uuid_pago: 'p2', estado: 'EN_COLA', uuid_orden: 'orden-2' }));
    memoria.sembrar('pagos', crearPagoFalso({ uuid_pago: 'p3', estado: 'CONFIRMADO', uuid_orden: 'orden-3' }));
    memoria.sembrar('pagos', crearPagoFalso({ uuid_pago: 'p4', estado: 'REQUIERE_ACCION_CLIENTE', uuid_orden: 'orden-4' }));

    const local = await servicio.estado('p1');
    const pendientes = await servicio.contarPendientes();
    const accion = await servicio.avisarRequiereAccion();

    expect(local?.uuid_pago).toBe('p1');
    expect(pendientes).toBe(3);
    expect(accion.map((pago) => pago.uuid_pago)).toEqual(['p4']);
    expect(servicio.pagosPendientes()).toBe(3);
  });
});
