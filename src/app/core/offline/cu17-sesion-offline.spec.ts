import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { OfflineSessionService } from './offline-session.service';
import { IndexedDbService } from './indexed-db.service';
import { LocalCryptoService } from './local-crypto.service';
import { ConnectivityService } from './connectivity.service';
import { DeviceService } from './device.service';
import { StorageService } from '../services/storage.service';
import {
  SesionOffline,
  SesionOfflineLocal
} from '../models/offline.model';

/**
 * [EXAMEN-2] CU17: sesión offline con PIN.
 * Cubre PIN trivial, PIN incorrecto con conteo de intentos, bloqueo, apertura
 * con token cifrado sin red, renovación del token con red y cierre con borrado.
 */
describe('CU17 - Sesión offline con PIN', () => {
  let servicio: OfflineSessionService;
  let indexedDb: jasmine.SpyObj<IndexedDbService>;
  let crypto: jasmine.SpyObj<LocalCryptoService>;
  let connectivity: jasmine.SpyObj<ConnectivityService>;
  let device: jasmine.SpyObj<DeviceService>;
  let storage: jasmine.SpyObj<StorageService>;
  let http: jasmine.SpyObj<HttpClient>;

  let registros: Map<string, unknown>;
  let pinEsperado: string;

  const usuario = { id: 7, tenant_id: 10, correo: 'cajero@modaandina.com' };
  const tenant = { id: 10, razon_social: 'Moda Andina S.R.L.' };
  const PIN_VALIDO = '135790';

  const sesionRemota: SesionOffline = {
    token_offline: 'tok-remoto',
    token_type: 'Bearer',
    expira_en: new Date(Date.now() + 3_600_000).toISOString(),
    usuario_id: 7,
    tenant_id: 10,
    dispositivo_id: 'dev-1',
    roles: ['Cajero'],
    permisos: ['ventas.crear'],
    configuracion: {
      id: 1,
      tenant_id: 10,
      descarga_automatica: true,
      incluir_clientes: true,
      max_clientes: 100,
      habilitar_carrito_offline: false,
      max_horas_sesion_offline: 8,
      max_dias_orden_pendiente: 7
    }
  };

  function sesionLocal(extra: Partial<SesionOfflineLocal> = {}): SesionOfflineLocal {
    return {
      clave: 'sesion',
      tenant_id: 10,
      usuario_id: 7,
      dispositivo_id: 'dev-1',
      token_offline_cifrado: JSON.stringify({
        iv: 'iv-simulado',
        ciphertext: 'cifrado:"tok-local"',
        algoritmo: 'AES-GCM'
      }),
      expira_en: new Date(Date.now() + 3_600_000).toISOString(),
      pin_hash: 'hash-simulado',
      pin_salt: 'salt-simulado',
      intentos_fallidos: 0,
      bloqueado: false,
      roles: ['Cajero'],
      permisos: ['ventas.crear'],
      ...extra
    };
  }

  function precargar(local: SesionOfflineLocal): void {
    registros.set('sesion', local);
  }

  async function esperarMicrotareas(): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve));
  }

  async function esperarError(promesa: Promise<unknown>): Promise<string> {
    try {
      await promesa;
      fail('La promesa debía rechazarse.');
      return '';
    } catch (error) {
      return (error as Error).message;
    }
  }

  async function crearServicio(): Promise<OfflineSessionService> {
    servicio = TestBed.inject(OfflineSessionService);
    // El constructor carga la sesión local de forma asíncrona.
    await esperarMicrotareas();
    return servicio;
  }

  beforeEach(() => {
    registros = new Map<string, unknown>();
    pinEsperado = PIN_VALIDO;

    indexedDb = jasmine.createSpyObj<IndexedDbService>('IndexedDbService', [
      'guardar',
      'obtener',
      'eliminar',
      'eliminarPorTenant'
    ]);
    indexedDb.guardar.and.callFake(async (almacen: string, registro: any) => {
      registros.set(registro.clave ?? almacen, registro);
    });
    indexedDb.obtener.and.callFake(async (almacen: string, clave: string) => (
      almacen === 'sesion' ? (registros.get(clave) as any) ?? null : null
    ));
    indexedDb.eliminar.and.callFake(async (almacen: string, clave: string) => {
      if (almacen === 'sesion') registros.delete(clave);
    });
    indexedDb.eliminarPorTenant.and.resolveTo();

    crypto = jasmine.createSpyObj<LocalCryptoService>('LocalCryptoService', [
      'generarSalt',
      'derivarClave',
      'cifrar',
      'descifrar',
      'hashPin',
      'verificarPin'
    ]);
    crypto.generarSalt.and.returnValue('salt-simulado');
    crypto.derivarClave.and.resolveTo({} as CryptoKey);
    crypto.hashPin.and.resolveTo('hash-simulado');
    crypto.verificarPin.and.callFake(async (pin: string) => pin === pinEsperado);
    crypto.cifrar.and.callFake(async (objeto: unknown) => ({
      iv: 'iv-simulado',
      ciphertext: `cifrado:${JSON.stringify(objeto)}`,
      algoritmo: 'AES-GCM' as const
    }));
    crypto.descifrar.and.callFake(async (sobre: any) => (
      JSON.parse(String(sobre.ciphertext).replace(/^cifrado:/, ''))
    ));

    connectivity = jasmine.createSpyObj<ConnectivityService>('ConnectivityService', ['enLinea']);
    connectivity.enLinea.and.returnValue(true);

    device = jasmine.createSpyObj<DeviceService>('DeviceService', [
      'obtenerDispositivoId',
      'registrarDispositivo'
    ]);
    device.obtenerDispositivoId.and.returnValue('dev-1');
    device.registrarDispositivo.and.returnValue(of({
      id: 'dev-1',
      tenant_id: 10,
      usuario_id: 7,
      plataforma: 'WEB',
      activo: true
    }));

    storage = jasmine.createSpyObj<StorageService>('StorageService', [
      'getUser',
      'getTenantActivo',
      'getPinConfigurado',
      'setPinConfigurado'
    ]);
    storage.getUser.and.returnValue(usuario as any);
    storage.getTenantActivo.and.returnValue(tenant as any);
    storage.getPinConfigurado.and.returnValue(false);

    http = jasmine.createSpyObj<HttpClient>('HttpClient', ['post', 'get', 'delete']);
    http.post.and.callFake(((url: string) => {
      if (url.endsWith('/sesion/pin')) {
        return of({ configurado: true, mensaje: 'PIN configurado.' });
      }
      if (url.endsWith('/sesion/iniciar')) {
        return of(sesionRemota);
      }
      if (url.endsWith('/sesion/cerrar')) {
        return of({ cerrada: true, instruccion_borrado_local: { tenant_id: 10 } });
      }
      return of({});
    }) as any);

    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: http },
        { provide: IndexedDbService, useValue: indexedDb },
        { provide: LocalCryptoService, useValue: crypto },
        { provide: ConnectivityService, useValue: connectivity },
        { provide: DeviceService, useValue: device },
        { provide: StorageService, useValue: storage }
      ]
    });
  });

  it('rechaza un PIN trivial sin registrar el dispositivo', async () => {
    const mensaje = await esperarError(firstValueFrom(
      (await crearServicio()).configurarPin('111111', 'secreta')
    ));

    expect(mensaje).toContain('secuencia trivial');
    expect(device.registrarDispositivo).not.toHaveBeenCalled();
    expect(http.post).not.toHaveBeenCalled();
  });

  it('rechaza un PIN de menos de seis dígitos', async () => {
    const mensaje = await esperarError(firstValueFrom(
      (await crearServicio()).configurarPin('1234', 'secreta')
    ));

    expect(mensaje).toContain('al menos 6 dígitos');
    expect(device.registrarDispositivo).not.toHaveBeenCalled();
  });

  it('configura el PIN guardando solo su hash y solicita el token inicial', async () => {
    const service = await crearServicio();

    const respuesta = await firstValueFrom(service.configurarPin(PIN_VALIDO, 'secreta'));

    expect(respuesta.configurado).toBeTrue();
    expect(device.registrarDispositivo).toHaveBeenCalled();

    const guardado = registros.get('sesion') as SesionOfflineLocal;
    expect(guardado.pin_hash).toBe('hash-simulado');
    expect(guardado.pin_salt).toBe('salt-simulado');
    expect(JSON.stringify(guardado)).not.toContain(PIN_VALIDO);
    expect(guardado.token_offline_cifrado).toContain('cifrado:');

    expect(service.pinConfigurado()).toBeTrue();
    expect(service.tokenOffline()).toBe('tok-remoto');
    expect(service.sesionActiva()).toBeTrue();
    expect(storage.setPinConfigurado).toHaveBeenCalledWith(true);
  });

  it('falla al iniciar sin PIN configurado en el dispositivo', async () => {
    const service = await crearServicio();

    const mensaje = await esperarError(firstValueFrom(service.iniciarSesionOffline(PIN_VALIDO)));

    expect(mensaje).toContain('No hay un PIN configurado');
  });

  it('descuenta intentos con PIN incorrecto y bloquea al quinto intento', async () => {
    precargar(sesionLocal());
    const service = await crearServicio();
    pinEsperado = '999999';

    const primero = await esperarError(firstValueFrom(service.iniciarSesionOffline('000001')));
    expect(primero).toContain('Intentos restantes: 4');
    expect(service.intentosRestantes()).toBe(4);
    expect((registros.get('sesion') as SesionOfflineLocal).intentos_fallidos).toBe(1);

    for (let intento = 2; intento <= 5; intento++) {
      await esperarError(firstValueFrom(service.iniciarSesionOffline('000001')));
    }

    expect(service.intentosRestantes()).toBe(0);
    expect((registros.get('sesion') as SesionOfflineLocal).bloqueado).toBeTrue();
    expect(service.sesionActiva()).toBeFalse();
  });

  it('rechaza el ingreso cuando la sesión local está bloqueada', async () => {
    precargar(sesionLocal({ bloqueado: true }));
    const service = await crearServicio();

    const mensaje = await esperarError(firstValueFrom(service.iniciarSesionOffline(PIN_VALIDO)));

    expect(mensaje).toContain('La sesión está bloqueada');
    expect(http.post).not.toHaveBeenCalled();
  });

  it('con red valida el PIN y renueva el token contra el backend', async () => {
    precargar(sesionLocal());
    const service = await crearServicio();

    const sesion = await firstValueFrom(service.iniciarSesionOffline(PIN_VALIDO));

    expect(sesion?.token_offline).toBe('tok-remoto');
    expect(http.post).toHaveBeenCalled();
    expect(service.tokenOffline()).toBe('tok-remoto');
    expect(service.sesionActiva()).toBeTrue();
    expect(service.haySesionOffline()).toBeTrue();
    expect((registros.get('sesion') as SesionOfflineLocal).intentos_fallidos).toBe(0);
  });

  it('sin red abre la sesión con el token cifrado guardado', async () => {
    precargar(sesionLocal());
    connectivity.enLinea.and.returnValue(false);
    const service = await crearServicio();

    const resultado = await firstValueFrom(service.iniciarSesionOffline(PIN_VALIDO));

    expect(resultado).toBeNull();
    expect(http.post).not.toHaveBeenCalled();
    expect(service.tokenOffline()).toBe('tok-local');
    expect(service.sesionActiva()).toBeTrue();
    expect(service.haySesionOffline()).toBeTrue();
  });

  it('sin red y con token vencido deja la sesión en modo solo consulta', async () => {
    precargar(sesionLocal({ expira_en: new Date(Date.now() - 60_000).toISOString() }));
    connectivity.enLinea.and.returnValue(false);
    const service = await crearServicio();

    const resultado = await firstValueFrom(service.iniciarSesionOffline(PIN_VALIDO));

    expect(resultado).toBeNull();
    expect(service.tokenOffline()).toBeNull();
    expect(service.sesionActiva()).toBeTrue();
    expect(service.haySesionOffline()).toBeFalse();
  });

  it('cierra la sesión y borra los datos del tenant del dispositivo', async () => {
    precargar(sesionLocal());
    const service = await crearServicio();

    const respuesta = await firstValueFrom(service.cerrarSesionOffline());

    expect(respuesta.cerrada).toBeTrue();
    expect(indexedDb.eliminarPorTenant).toHaveBeenCalledWith(10);
    expect(service.sesionActiva()).toBeFalse();
    expect(service.tokenOffline()).toBeNull();
    expect(service.pinConfigurado()).toBeFalse();
    expect(storage.setPinConfigurado).toHaveBeenCalledWith(false);
    expect(registros.has('sesion')).toBeFalse();
  });
});
