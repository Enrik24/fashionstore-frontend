import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { PendingPaymentComponent } from '../../features/checkout/pages/pending-payment/pending-payment.component';
import { ConnectivityBannerComponent } from '../../shared/components/connectivity-banner/connectivity-banner.component';
import { PendingPaymentService } from './pending-payment.service';
import { OfflineSessionService } from './offline-session.service';
import { ConnectivityService } from './connectivity.service';
import { ToastService } from '../services/toast.service';
import { LoadingService } from '../services/loading.service';
import { PagosDiferidosApiService } from '../services/pagos-diferidos-api.service';
import { loadingInterceptor } from '../interceptors/loading.interceptor';
import { ResultadoPagoDiferido } from '../models/pago-diferido.model';
import { crearOrdenFalsa, crearPagoFalso } from './testing/offline-test-doubles';

const pagoRemoto = (): ResultadoPagoDiferido => ({
  id: 77, uuid_pago: 'pago-1', orden_id: 15, monto: 148.75, moneda: 'BOB',
  estado: 'REQUIERE_ACCION_CLIENTE', requiere_accion: true, intentos: 0,
  checkout_url: 'https://checkout.stripe.test/sesion'
});

describe('Pago pendiente - actualización de pantalla', () => {
  let componente: PendingPaymentComponent;
  let servicio: jasmine.SpyObj<PendingPaymentService>;
  let online: ReturnType<typeof signal<boolean>>;
  let retorno: string | null;
  let alRecuperar: () => void;

  beforeEach(() => {
    online = signal(true);
    retorno = null;
    servicio = jasmine.createSpyObj('PendingPaymentService', [
      'estado', 'ordenDePago', 'crearOConfirmarPago', 'prepararDesdeRemoto',
      'confirmarConStripe', 'enriquecerConStripeJs', 'aceptarNuevoTotal', 'reintentar'
    ]);
    servicio.estado.and.callFake(async () => pagoRemoto());
    servicio.ordenDePago.and.resolveTo(null);
    servicio.prepararDesdeRemoto.and.callFake((pago) => ({
      uuidPago: pago.uuid_pago, pago, clientSecret: null, requiereAccion: pago.requiere_accion,
      checkoutUrl: pago.checkout_url ?? null, pendienteOrden: false, mensaje: 'Completa el Checkout.'
    }));
    servicio.enriquecerConStripeJs.and.returnValue({
      disponible: false, usarRedireccion: true, clientSecret: null, clavePublica: null, mensaje: 'Usa el Checkout.'
    });
    TestBed.configureTestingModule({
      imports: [PendingPaymentComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: {
          paramMap: { get: () => 'pago-1' }, queryParamMap: { get: () => retorno }
        } } },
        { provide: Router, useValue: { navigate: async () => true } },
        { provide: PendingPaymentService, useValue: servicio },
        { provide: ConnectivityService, useValue: {
          enLinea: online, alRecuperarConexion: (callback: () => void) => {
            alRecuperar = callback;
            return () => undefined;
          }
        } },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'warning', 'error', 'info']) }
      ]
    });
    componente = TestBed.runInInjectionContext(() => new PendingPaymentComponent());
  });

  afterEach(() => componente.ngOnDestroy());

  it('reutiliza la respuesta y consulta una sola vez por actualización silenciosa', fakeAsync(() => {
    void componente.ngOnInit();
    flushMicrotasks();
    expect(componente.checkoutUrl()).toBe(pagoRemoto().checkout_url!);
    expect(servicio.estado).toHaveBeenCalledOnceWith('pago-1', false);
    expect(servicio.crearOConfirmarPago).not.toHaveBeenCalled();
    tick(5000);
    flushMicrotasks();
    expect(servicio.estado.calls.count()).toBe(2);
    expect(servicio.estado.calls.mostRecent().args).toEqual(['pago-1', true]);
    expect(servicio.crearOConfirmarPago).not.toHaveBeenCalled();
    expect(servicio.confirmarConStripe).not.toHaveBeenCalled();
    componente.ngOnDestroy();
  }));

  it('no solapa la carga inicial con una reconexión ni un clic manual', fakeAsync(() => {
    let resolver!: (pago: ResultadoPagoDiferido) => void;
    servicio.estado.and.returnValue(new Promise((resolve) => { resolver = resolve; }));
    void componente.ngOnInit();
    alRecuperar();
    void componente.cargar(false);
    tick(15000);
    expect(servicio.estado.calls.count()).toBe(1);
    resolver(pagoRemoto());
    flushMicrotasks();
    componente.ngOnDestroy();
  }));

  it('ignora respuestas que terminan después de destruir la pantalla', fakeAsync(() => {
    let resolver!: (pago: ResultadoPagoDiferido) => void;
    servicio.estado.and.returnValue(new Promise((resolve) => { resolver = resolve; }));
    void componente.ngOnInit();
    componente.ngOnDestroy();
    resolver(pagoRemoto());
    flushMicrotasks();
    tick(15000);
    expect(componente.pago()).toBeNull();
    expect(servicio.estado.calls.count()).toBe(1);
  }));

  for (const estado of ['CONFIRMADO', 'CANCELADO', 'EXPIRADO', 'REEMBOLSADO', 'RECHAZADO', 'ERROR_CRITICO'] as const) {
    it(`detiene las consultas en estado ${estado}`, fakeAsync(() => {
      servicio.estado.and.resolveTo({ ...pagoRemoto(), estado });
      void componente.ngOnInit();
      flushMicrotasks();
      tick(15000);
      expect(servicio.estado.calls.count()).toBe(1);
      expect(servicio.crearOConfirmarPago).not.toHaveBeenCalled();
      componente.ngOnDestroy();
    }));
  }

  it('verifica el retorno exitoso una vez y luego solo consulta', fakeAsync(() => {
    retorno = 'exito';
    servicio.confirmarConStripe.and.resolveTo(crearPagoFalso({ estado: 'EN_PROCESO' }));
    void componente.ngOnInit();
    flushMicrotasks();
    tick(10000);
    flushMicrotasks();
    expect(servicio.confirmarConStripe.calls.count()).toBe(1);
    expect(servicio.crearOConfirmarPago).not.toHaveBeenCalled();
    componente.ngOnDestroy();
  }));

  it('reanuda consultas tras un reintento explícito de un pago rechazado', fakeAsync(() => {
    servicio.estado.and.resolveTo({ ...pagoRemoto(), estado: 'RECHAZADO' });
    void componente.ngOnInit();
    flushMicrotasks();
    servicio.reintentar.and.resolveTo(crearPagoFalso({ estado: 'EN_PROCESO' }));
    servicio.crearOConfirmarPago.and.resolveTo(servicio.prepararDesdeRemoto(pagoRemoto()));
    void componente.reintentar();
    flushMicrotasks();
    servicio.estado.and.resolveTo(pagoRemoto());
    tick(5000);
    flushMicrotasks();
    expect(servicio.estado.calls.count()).toBe(2);
    expect(servicio.reintentar).toHaveBeenCalledOnceWith('pago-1');
    componente.ngOnDestroy();
  }));

  it('espera la consulta en curso antes de verificar y no deja que sobrescriba el resultado', fakeAsync(() => {
    let resolver!: (pago: ResultadoPagoDiferido) => void;
    servicio.estado.and.returnValue(new Promise((resolve) => { resolver = resolve; }));
    void componente.ngOnInit();
    servicio.confirmarConStripe.and.resolveTo(crearPagoFalso({ estado: 'CONFIRMADO' }));
    void componente.confirmar();
    expect(servicio.confirmarConStripe).not.toHaveBeenCalled();
    resolver(pagoRemoto());
    flushMicrotasks();
    expect(componente.estado()).toBe('CONFIRMADO');
    tick(5000);
    expect(servicio.estado.calls.count()).toBe(1);
    componente.ngOnDestroy();
  }));

  it('no prepara ni crea pagos automáticamente mientras espera sincronización', fakeAsync(() => {
    servicio.estado.and.resolveTo(crearPagoFalso());
    servicio.crearOConfirmarPago.and.resolveTo({
      uuidPago: 'pago-1', pago: null, clientSecret: null, checkoutUrl: null,
      requiereAccion: false, pendienteOrden: true, mensaje: 'Esperando sincronización.'
    });
    void componente.ngOnInit();
    flushMicrotasks();
    tick(5000);
    flushMicrotasks();
    expect(servicio.crearOConfirmarPago.calls.count()).toBe(1);
    componente.ngOnDestroy();
  }));

  it('muestra descuentos y variantes en ramas diferentes', fakeAsync(() => {
    servicio.estado.and.resolveTo(crearPagoFalso());
    servicio.ordenDePago.and.resolveTo(crearOrdenFalsa({
      requiere_aceptacion: true, total_anterior: 175, total_nuevo: 148.75,
      diferencias: [
        { tipo: 'TOTAL_RECALCULADO', total_local: 175, total_servidor: 148.75, descuento: 26.25 },
        { variante_producto_id: 66, precio_local: 175, precio_central: 180 }
      ]
    }));
    const fixture = TestBed.createComponent(PendingPaymentComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    flushMicrotasks();
    fixture.detectChanges();
    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Total recalculado con promociones');
    expect(texto).toContain('Descuento: BOB 26.25');
    expect(texto).toContain('Variante #66');
    expect(texto).not.toMatch(/Variante #\s*$/);
    expect(servicio.crearOConfirmarPago).not.toHaveBeenCalled();
    fixture.destroy();
  }));
});

describe('Banner - sesión protegida y sesión vencida', () => {
  let sesion: any;
  let online: ReturnType<typeof signal<boolean>>;
  beforeEach(() => {
    online = signal(true);
    sesion = {
      sesionLocal: signal(null), sesionActiva: signal(false), sesionVencida: signal(false)
    };
    TestBed.configureTestingModule({
      imports: [ConnectivityBannerComponent], providers: [
        provideRouter([]),
        { provide: OfflineSessionService, useValue: sesion },
        { provide: ConnectivityService, useValue: {
          enLinea: online, iniciarMonitoreo: () => undefined, verificar: () => of(true)
        } }
      ]
    });
  });

  it('no anuncia vencimiento cuando no hay sesión local', () => {
    const componente = TestBed.runInInjectionContext(() => new ConnectivityBannerComponent());
    expect(componente.visible()).toBeFalse();
    expect(componente.mensaje()).not.toContain('terminó');
  });

  it('ofrece desbloquear con PIN una sesión vigente tras recargar', () => {
    sesion.sesionLocal.set({ token_offline_cifrado: 'cifrado', expira_en: new Date(Date.now() + 12 * 3600000).toISOString() });
    const fixture = TestBed.createComponent(ConnectivityBannerComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('plazo sigue vigente');
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/offline/acceso');
    expect(fixture.nativeElement.textContent).not.toContain('terminó');
    fixture.destroy();
  });

  it('muestra doce horas inmediatamente al renovar entre actualizaciones del reloj', fakeAsync(() => {
    sesion.sesionActiva.set(true);
    sesion.sesionLocal.set({ token_offline_cifrado: 'cifrado', expira_en: new Date(Date.now() + 3600000).toISOString() });
    const fixture = TestBed.createComponent(ConnectivityBannerComponent);
    fixture.detectChanges();
    tick(30000);
    sesion.sesionLocal.set({ token_offline_cifrado: 'renovado', expira_en: new Date(Date.now() + 12 * 3600000).toISOString() });
    fixture.detectChanges();
    expect(fixture.componentInstance.horasRestantes()).toBe(12);
    expect(fixture.nativeElement.textContent).toContain('12 h de sesión offline');
    fixture.destroy();
  }));

  it('anuncia solo consulta si está vencida aunque se haya ingresado el PIN sin red', () => {
    sesion.sesionLocal.set({ token_offline_cifrado: 'cifrado', expira_en: new Date(Date.now() - 1000).toISOString() });
    sesion.sesionVencida.set(true);
    sesion.sesionActiva.set(true);
    online.set(false);
    const componente = TestBed.runInInjectionContext(() => new ConnectivityBannerComponent());
    expect(componente.mensaje()).toContain('solo consulta');
    expect(componente.mensaje()).not.toContain('operando');
  });
});

describe('Consultas silenciosas - carga global', () => {
  let loading: jasmine.SpyObj<LoadingService>;
  let http: HttpTestingController;
  let api: PagosDiferidosApiService;
  beforeEach(() => {
    loading = jasmine.createSpyObj('LoadingService', ['show', 'hide']);
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([loadingInterceptor])), provideHttpClientTesting(),
      { provide: LoadingService, useValue: loading }
    ] });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(PagosDiferidosApiService);
  });
  afterEach(() => http.verify());

  it('consulta pagos en segundo plano sin mostrar ni ocultar la carga global', () => {
    api.obtenerPago('pago-1', true).subscribe();
    http.expectOne((req) => req.url.endsWith('/pagos/diferidos/pago-1')).flush(pagoRemoto());
    expect(loading.show).not.toHaveBeenCalled();
    expect(loading.hide).not.toHaveBeenCalled();
  });

  it('mantiene la carga para acciones explícitas y la libera al fallar', () => {
    api.confirmarPago('pago-1').subscribe({ error: () => undefined });
    expect(loading.show).toHaveBeenCalledTimes(1);
    http.expectOne((req) => req.method === 'POST').flush({}, { status: 500, statusText: 'Error' });
    expect(loading.hide).toHaveBeenCalledTimes(1);
  });
});
