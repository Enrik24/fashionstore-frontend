import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
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
import { ToastService } from '../services/toast.service';
import { PendingPaymentComponent } from '../../features/checkout/pages/pending-payment/pending-payment.component';
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
 * [EXAMEN-2] CU16: flujo de confirmación del pago diferido.
 * Cubre la creación/confirmación, la validación de la orden pendiente, el
 * fallback sin Stripe.js y la capa visual del componente.
 */
describe('CU16 - Confirmación de pago diferido', () => {
  let servicio: PendingPaymentService;
  let cola: OfflineQueueService;
  let memoria: MemoriaOffline;
  let conectividad: ConectividadFalsa;
  let api: jasmine.SpyObj<PagosDiferidosApiService>;

  function remoto(parcial: Partial<ResultadoPagoDiferido> = {}): ResultadoPagoDiferido {
    return {
      id: 77,
      uuid_pago: 'pago-1',
      orden_id: 15,
      uuid_orden: 'orden-1',
      monto: 250,
      moneda: 'BOB',
      estado: 'EN_COLA',
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
        { provide: OfflineAuditService, useValue: crearAuditoriaFalsa().servicio },
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

  it('crea el pago cuando la orden ya fue confirmada por el servidor', async () => {
    memoria.sembrar('ordenes_locales', crearOrdenFalsa());
    memoria.sembrar('pagos', crearPagoFalso({ estado: 'PENDIENTE_ENVIO' }));
    api.crearPago.and.returnValue(of(remoto()));

    const preparacion = await servicio.crearOConfirmarPago('pago-1');

    expect(preparacion.pendienteOrden).toBeFalse();
    expect(preparacion.pago?.id).toBe(77);
    expect(preparacion.clientSecret).toBe('cs_test_123');
    expect(preparacion.checkoutUrl).toBe('https://checkout.stripe.test/sesion');
    expect(preparacion.mensaje).toContain('completa la confirmación');
  });

  it('no intenta cobrar si la orden todavía está en la cola', async () => {
    memoria.sembrar('ordenes_locales', crearOrdenFalsa());
    await cola.encolar('ORDEN_PAGO_DIFERIDO', { uuid_pago: 'pago-1', uuid_orden: 'orden-1' });
    memoria.sembrar('pagos', crearPagoFalso({ estado: 'PENDIENTE_ENVIO' }));

    const preparacion = await servicio.crearOConfirmarPago('pago-1');

    expect(preparacion.pendienteOrden).toBeTrue();
    expect(preparacion.pago).toBeNull();
    expect(api.crearPago).not.toHaveBeenCalled();
  });

  it('sin conexión no puede preparar un pago que no está en IndexedDB', async () => {
    conectividad.cambiar(false);

    await expectAsync(servicio.crearOConfirmarPago('inexistente'))
      .toBeRejectedWithError(/no está disponible sin conexión/);
  });

  it('confirma con la verificación del backend y actualiza el pago local', async () => {
    memoria.sembrar('pagos', crearPagoFalso({ estado: 'REQUIERE_ACCION_CLIENTE' }));
    api.confirmarPago.and.returnValue(of(remoto({
      estado: 'CONFIRMADO',
      requiere_accion: false,
      client_secret: null
    })));

    const pago = await servicio.confirmarConStripe({ uuid_pago: 'pago-1' });

    expect(pago.estado).toBe('CONFIRMADO');
    expect(api.confirmarPago).toHaveBeenCalledWith('pago-1');
    expect((memoria.obtener('pagos', 'pago-1') as any)?.estado).toBe('CONFIRMADO');
  });

  it('si el pago en línea falla, devuelve el estado local sin romper la pantalla', async () => {
    memoria.sembrar('pagos', crearPagoFalso({ estado: 'EN_COLA' }));
    api.obtenerPago.and.returnValue(throwError(() => new Error('sin red')));

    const pago = await servicio.estado('pago-1');

    expect(pago?.uuid_pago).toBe('pago-1');
    expect(pago?.estado).toBe('EN_COLA');
  });

  it('un webhook de expiración libera la orden local', async () => {
    memoria.sembrar('pagos', crearPagoFalso({ estado: 'EN_COLA' }));
    memoria.sembrar('ordenes_locales', crearOrdenFalsa());

    const pago = await servicio.procesarWebhookNotificado({
      evento: 'pago.expirado',
      uuid_pago: 'pago-1',
      estado: 'EXPIRADO'
    });

    expect(pago?.estado).toBe('EXPIRADO');
    expect((memoria.obtener('ordenes_locales', 'orden-1') as any)?.estado).toBe('EXPIRADA');
  });

  it('refresca el monto total que sigue en cola', async () => {
    memoria.sembrar('pagos', crearPagoFalso({ uuid_pago: 'p1', monto: 100, estado: 'EN_COLA' }));
    memoria.sembrar('pagos', crearPagoFalso({ uuid_pago: 'p2', monto: 250, estado: 'PENDIENTE_ENVIO', uuid_orden: 'orden-2' }));
    memoria.sembrar('pagos', crearPagoFalso({ uuid_pago: 'p3', monto: 999, estado: 'CONFIRMADO', uuid_orden: 'orden-3' }));

    await servicio.refrescarContadores();

    expect(servicio.montoEnCola()).toBe(350);
    expect(servicio.pagosPendientes()).toBe(2);
  });
});

describe('CU16 - PendingPaymentComponent (capa visual)', () => {
  let componente: PendingPaymentComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'pago-1' } } }
        },
        { provide: Router, useValue: { navigate: async () => true } },
        {
          provide: PendingPaymentService,
          useValue: {
            enriquecerConStripeJs: () => ({
              disponible: false,
              usarRedireccion: true,
              clientSecret: null,
              clavePublica: null,
              mensaje: 'Stripe.js no está instalado en esta compilación; se usará la redirección segura al checkout.'
            })
          }
        },
        { provide: ConnectivityService, useValue: { enLinea: () => true } },
        {
          provide: ToastService,
          useValue: {
            success: () => undefined,
            warning: () => undefined,
            error: () => undefined,
            info: () => undefined
          }
        }
      ]
    });

    componente = TestBed.runInInjectionContext(() => new PendingPaymentComponent());
  });

  afterEach(() => TestBed.resetTestingModule());

  it('expone los datos del pago para la plantilla', () => {
    componente.pago.set({
      uuid_pago: 'pago-1',
      tenant_id: 10,
      dispositivo_id: 'dev-1',
      usuario_id: 7,
      monto: 250.5,
      moneda: 'BOB',
      estado: 'RECHAZADO',
      intentos: 2,
      simulado: true,
      requiere_accion: false,
      updated_at: new Date().toISOString(),
      pago_id: 77,
      orden_id: 15
    });

    expect(componente.estado()).toBe('RECHAZADO');
    expect(componente.monto()).toBe(250.5);
    expect(componente.moneda()).toBe('BOB');
    expect(componente.intentos()).toBe(2);
    expect(componente.simulado()).toBeTrue();
    expect(componente.numeroOrden()).toBe('Orden #15');
  });

  it('muestra el aviso de redirección cuando Stripe.js no está disponible', () => {
    expect(componente.stripeMensaje()).toContain('redirección');
  });

  it('marca la expiración para cambiar la vista', () => {
    componente.marcarExpirado();

    expect(componente.expirado()).toBeTrue();
  });
});
