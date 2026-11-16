import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CartService } from '../services/cart.service';
import { AuthService } from '../services/auth.service';
import { StorageService } from '../services/storage.service';
import { TenantContextService } from '../services/tenant-context.service';
import { PlanFeatureService } from '../services/plan-feature.service';
import { ToastService } from '../services/toast.service';
import { ActivePromotionsService } from '../services/active-promotions.service';
import { CatalogApiService } from '../services/catalog-api.service';
import { PublicCatalogService } from '../services/public-catalog.service';
import { CartOfflinePanelComponent } from '../../features/cart/components/cart-offline-panel/cart-offline-panel.component';
import { OfflineAccessComponent } from '../../features/offline/pages/access/offline-access.component';
import { CatalogListComponent } from '../../features/catalog/pages/catalog-list/catalog-list.component';
import { OfflineCartService, ConversionLocal } from './offline-cart.service';
import { OfflineSessionService } from './offline-session.service';
import { OfflineCatalogService } from './offline-catalog.service';
import { ConnectivityService } from './connectivity.service';
import { crearCarritoFalso, crearOrdenFalsa, crearPagoFalso, crearOperacionFalsa } from './testing/offline-test-doubles';
import { environment } from '../../../environments/environment';

const conversionAnterior = (): ConversionLocal => ({
  orden: crearOrdenFalsa(), pago: crearPagoFalso(), operacion: crearOperacionFalsa()
});
const carritoNuevo = () => crearCarritoFalso({
  uuid_carrito: 'carrito-nuevo', subtotal_local: 175, total_local: 175,
  items: [{ item_id: 'item-nuevo', variante_producto_id: 66, cantidad: 1,
    precio_unitario_local: 175, subtotal_local: 175, stock_local_conocido: 137, stock_suficiente: true }]
});

const toastFalso = () => jasmine.createSpyObj('ToastService', ['success', 'error', 'warning', 'info']);

describe('Carrito - nueva compra con pedido previo', () => {
  let servicio: CartService;
  let offline: jasmine.SpyObj<OfflineCartService>;
  let auth: jasmine.SpyObj<AuthService>;
  let http: HttpTestingController;

  beforeEach(() => {
    auth = jasmine.createSpyObj('AuthService', ['isClient', 'currentUserSignal']);
    auth.isClient.and.returnValue(false);
    auth.currentUserSignal.and.returnValue(null);
    offline = jasmine.createSpyObj('OfflineCartService', ['cargarCarritoLocal', 'ultimaConversion', 'convertirAOrden']);
    offline.cargarCarritoLocal.and.resolveTo(carritoNuevo());
    offline.ultimaConversion.and.resolveTo(conversionAnterior());
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, CartOfflinePanelComponent], providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ToastService, useValue: toastFalso() },
        { provide: OfflineCartService, useValue: offline },
        { provide: ConnectivityService, useValue: { enLinea: signal(false), alRecuperarConexion: () => () => undefined } }
      ]
    });
    servicio = TestBed.inject(CartService);
    TestBed.flushEffects();
    auth.isClient.and.returnValue(true);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('muestra confirmar compra para el carrito activo, no la orden anterior', fakeAsync(() => {
    servicio.conversionOffline.set(conversionAnterior());
    servicio.loadCart().subscribe();
    flushMicrotasks();
    const fixture = TestBed.createComponent(CartOfflinePanelComponent);
    fixture.detectChanges();
    expect(servicio.cartSignal()?.uuid_carrito).toBe('carrito-nuevo');
    expect(servicio.conversionOffline()).toBeNull();
    expect(offline.ultimaConversion).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Confirmar compra offline');
    expect(fixture.nativeElement.textContent).not.toContain('Pedido guardado localmente');
    http.expectNone(() => true);
    fixture.destroy();
  }));

  it('restaura el pedido convertido cuando no hay carrito activo tras la recarga', fakeAsync(() => {
    offline.cargarCarritoLocal.and.resolveTo(null);
    servicio.loadCart().subscribe();
    flushMicrotasks();
    expect(servicio.conversionOffline()?.orden.uuid_orden).toBe('orden-1');
    expect(servicio.cartSignal()).toBeNull();
    expect(servicio.loadingSignal()).toBeFalse();
  }));

  it('una conversión antigua tardía no sobrescribe la carga del carrito nuevo', fakeAsync(() => {
    let liberar!: (valor: ConversionLocal) => void;
    offline.cargarCarritoLocal.and.resolveTo(null);
    offline.ultimaConversion.and.returnValue(new Promise(resolve => liberar = resolve));
    servicio.loadCart().subscribe();
    flushMicrotasks();
    offline.cargarCarritoLocal.and.resolveTo(carritoNuevo());
    servicio.loadCart().subscribe();
    flushMicrotasks();
    liberar(conversionAnterior());
    flushMicrotasks();
    expect(servicio.cartSignal()?.uuid_carrito).toBe('carrito-nuevo');
    expect(servicio.conversionOffline()).toBeNull();
    expect(servicio.loadingSignal()).toBeFalse();
  }));

  it('confirmar el pedido nuevo invalida una restauración anterior en curso', fakeAsync(() => {
    let liberar!: (valor: ConversionLocal) => void;
    offline.cargarCarritoLocal.and.resolveTo(null);
    offline.ultimaConversion.and.returnValue(new Promise(resolve => liberar = resolve));
    servicio.loadCart().subscribe();
    flushMicrotasks();
    const nueva = { ...conversionAnterior(), orden: crearOrdenFalsa({ uuid_orden: 'orden-nueva', uuid_carrito: 'carrito-nuevo' }) };
    offline.convertirAOrden.and.resolveTo(nueva);
    void servicio.confirmarCompraOffline();
    flushMicrotasks();
    liberar(conversionAnterior());
    flushMicrotasks();
    expect(servicio.conversionOffline()?.orden.uuid_orden).toBe('orden-nueva');
    expect(servicio.loadingSignal()).toBeFalse();
  }));

  it('limpiar la sesión impide restaurar el pedido de una carga pendiente', fakeAsync(() => {
    let liberar!: (valor: ConversionLocal) => void;
    offline.cargarCarritoLocal.and.resolveTo(null);
    offline.ultimaConversion.and.returnValue(new Promise(resolve => liberar = resolve));
    servicio.loadCart().subscribe();
    flushMicrotasks();
    servicio.clearCartState();
    liberar(conversionAnterior());
    flushMicrotasks();
    expect(servicio.conversionOffline()).toBeNull();
    expect(servicio.cartSignal()).toBeNull();
  }));
});

describe('Acceso PIN - resultado local visible', () => {
  let sesion: any;
  let returnUrl: string;
  beforeEach(() => {
    returnUrl = '';
    sesion = {
      pinConfigurado: signal(true), intentosRestantes: signal(5), sesionActiva: signal(true),
      sesionLocal: signal({ expira_en: new Date(Date.now() + 3600000).toISOString(), roles: ['Cliente'] }),
      haySesionOffline: jasmine.createSpy().and.returnValue(true),
      iniciarSesionOffline: jasmine.createSpy().and.returnValue(of(null)),
      estadoSesion: () => of({ dispositivo_id: 'dev-1', dispositivo_activo: true, intentos_restantes: 5 })
    };
    TestBed.configureTestingModule({ imports: [OfflineAccessComponent], providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => returnUrl } } } },
      { provide: OfflineSessionService, useValue: sesion },
      { provide: ConnectivityService, useValue: { enLinea: signal(false) } },
      { provide: ToastService, useValue: toastFalso() }
    ] });
  });

  it('muestra sesión activa e Ir a la tienda y retira el teclado tras el PIN local', () => {
    const fixture = TestBed.createComponent(OfflineAccessComponent);
    fixture.detectChanges();
    fixture.componentInstance.validarPin('123456');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sesión offline activa');
    expect(fixture.nativeElement.textContent).toContain('Ir a la tienda');
    expect(fixture.nativeElement.querySelector('app-pin-pad')).toBeNull();
    expect(fixture.componentInstance.exito()).toEqual({
      expira_en: sesion.sesionLocal().expira_en, roles: ['Cliente']
    });
    fixture.destroy();
  });

  it('conserva el destino solicitado por el guard', () => {
    returnUrl = '/offline/sincronizacion';
    const navegar = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    const componente = TestBed.runInInjectionContext(() => new OfflineAccessComponent());
    componente.validarPin('123456');
    expect(navegar).toHaveBeenCalledWith(returnUrl);
  });

  it('no anuncia acceso operativo con token vencido', () => {
    sesion.haySesionOffline.and.returnValue(false);
    const componente = TestBed.runInInjectionContext(() => new OfflineAccessComponent());
    componente.validarPin('123456');
    expect(componente.exito()).toBeNull();
    expect(componente.error()).toContain('solo puedes consultar');
  });

  it('muestra el error del PIN local sin reemplazarlo por un mensaje genérico', () => {
    sesion.iniciarSesionOffline.and.returnValue(throwError(() => new Error('PIN incorrecto. Te quedan 4 intentos.')));
    const fixture = TestBed.createComponent(OfflineAccessComponent);
    fixture.detectChanges();
    fixture.componentInstance.validarPin('000000');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-pin-pad')).not.toBeNull();
    expect(fixture.componentInstance.exito()).toBeNull();
    expect(fixture.componentInstance.error()).toBe('PIN incorrecto. Te quedan 4 intentos.');
    fixture.destroy();
  });

  it('el PIN incorrecto conserva el teclado y muestra el error', () => {
    sesion.iniciarSesionOffline.and.returnValue(throwError(() => ({ status: 401 })));
    const fixture = TestBed.createComponent(OfflineAccessComponent);
    fixture.detectChanges();
    fixture.componentInstance.validarPin('000000');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-pin-pad')).not.toBeNull();
    expect(fixture.componentInstance.exito()).toBeNull();
    expect(fixture.componentInstance.error()).toBe('PIN incorrecto.');
    fixture.destroy();
  });
});

describe('Perfil - recarga offline y revalidación online', () => {
  let online: ReturnType<typeof signal<boolean>>;
  let reconectar: () => void;
  let storage: jasmine.SpyObj<StorageService>;
  let servicio: AuthService;
  let http: HttpTestingController;
  const usuario = { id: 7, nombre: 'Cliente local', roles: [{ nombre: 'Cliente' }] };
  const url = `${environment.apiUrl}/auth/me`;

  beforeEach(() => {
    online = signal(false);
    storage = jasmine.createSpyObj('StorageService', ['getUser', 'getAccessToken', 'getEsSuperAdmin', 'setUser', 'setEsSuperAdmin', 'clearAuth']);
    storage.getUser.and.returnValue(usuario);
    storage.getAccessToken.and.returnValue('token-local');
    storage.getEsSuperAdmin.and.returnValue(false);
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [
      provideRouter([]),
      { provide: StorageService, useValue: storage },
      { provide: ToastService, useValue: toastFalso() },
      { provide: TenantContextService, useValue: {} },
      { provide: PlanFeatureService, useValue: {} },
      { provide: OfflineSessionService, useValue: {} },
      { provide: ConnectivityService, useValue: {
        enLinea: online, alRecuperarConexion: (callback: () => void) => { reconectar = callback; return () => undefined; }
      } }
    ] });
    servicio = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('conserva el perfil local sin HTTP y lo revalida al recuperar conexión', () => {
    http.expectNone(() => true);
    expect(servicio.currentUserSignal()).toEqual(usuario as any);
    expect(servicio.isAuthenticated()).toBeTrue();
    online.set(true);
    reconectar();
    http.expectOne(url).flush({ ...usuario, nombre: 'Perfil revalidado' });
    expect(servicio.currentUserSignal()?.nombre).toBe('Perfil revalidado');
    expect(storage.setUser).toHaveBeenCalled();
  });

  it('no consulta el perfil al reconectar si ya se cerró la sesión', () => {
    storage.getAccessToken.and.returnValue(null);
    online.set(true);
    reconectar();
    http.expectNone(() => true);
  });

  it('mantiene el contexto local ante un fallo temporal del servidor', () => {
    online.set(true);
    reconectar();
    http.expectOne(url).flush({}, { status: 503, statusText: 'Service Unavailable' });
    expect(storage.clearAuth).not.toHaveBeenCalled();
    expect(servicio.isAuthenticated()).toBeTrue();
  });

  for (const status of [401, 403]) {
    it(`elimina el contexto online cuando el servidor rechaza la sesión con ${status}`, () => {
      online.set(true);
      reconectar();
      http.expectOne(url).flush({}, { status, statusText: 'Forbidden' });
      expect(storage.clearAuth).toHaveBeenCalled();
      expect(servicio.isAuthenticated()).toBeFalse();
      expect(servicio.currentUserSignal()).toBeNull();
    });
  }
});

describe('Promociones - consultas según conexión', () => {
  let online: ReturnType<typeof signal<boolean>>;
  let reconectar: () => void;
  let servicio: ActivePromotionsService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/public/promociones/activas`;
  beforeEach(() => {
    online = signal(false);
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [
      { provide: ConnectivityService, useValue: {
        enLinea: online, alRecuperarConexion: (callback: () => void) => { reconectar = callback; return () => undefined; }
      } }
    ] });
    servicio = TestBed.inject(ActivePromotionsService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('no hace HTTP offline y carga una vez al reconectar', () => {
    servicio.load();
    servicio.load();
    http.expectNone(() => true);
    online.set(true);
    reconectar();
    servicio.load();
    http.expectOne(url).flush([]);
    servicio.load();
    http.expectNone(() => true);
  });

  it('un fallo real online permite volver a cargar', () => {
    online.set(true);
    servicio.load();
    http.expectOne(url).flush({}, { status: 503, statusText: 'Unavailable' });
    servicio.load();
    http.expectOne(url).flush([]);
  });
});

describe('Catálogo - colección offline y reconexión', () => {
  it('no consulta la colección sin red y recupera su nombre al reconectar', fakeAsync(() => {
    const online = signal(false);
    let reconectar!: () => void;
    const quitar = jasmine.createSpy();
    const api = jasmine.createSpyObj('CatalogApiService', ['getCollections']);
    api.getCollections.and.returnValue(of([{ id: 3, nombre: 'Colección local' }]));
    const catalogo = jasmine.createSpyObj('PublicCatalogService', ['getCatalog']);
    catalogo.getCatalog.and.returnValue(of({ items: [], total: 0, total_paginas: 1, pagina: 1 }));
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { queryParams: of({ coleccion_id: 3 }), snapshot: { queryParamMap: convertToParamMap({}) } } },
      { provide: CatalogApiService, useValue: api },
      { provide: PublicCatalogService, useValue: catalogo },
      { provide: OfflineCatalogService, useValue: { buscarLocal: async () => [], selloActual: async () => null } },
      { provide: ConnectivityService, useValue: {
        enLinea: online, alRecuperarConexion: (callback: () => void) => { reconectar = callback; return quitar; }
      } }
    ] });
    const componente = TestBed.runInInjectionContext(() => new CatalogListComponent());
    componente.ngOnInit();
    flushMicrotasks();
    expect(api.getCollections).not.toHaveBeenCalled();
    expect(catalogo.getCatalog).not.toHaveBeenCalled();
    expect(componente.nombreColeccion).toBe('Colección #3');
    online.set(true);
    reconectar();
    expect(api.getCollections).toHaveBeenCalledTimes(1);
    expect(catalogo.getCatalog).toHaveBeenCalledTimes(1);
    expect(componente.nombreColeccion).toBe('Colección local');
    componente.ngOnDestroy();
    expect(quitar).toHaveBeenCalled();
  }));
});
