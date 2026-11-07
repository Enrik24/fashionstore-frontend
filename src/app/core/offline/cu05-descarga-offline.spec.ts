import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DeviceService } from './device.service';
import { IndexedDbService } from './indexed-db.service';
import { OfflineAuditService } from './offline-audit.service';
import { OfflineCatalogService } from './offline-catalog.service';
import { StorageQuotaService } from './storage-quota.service';
import { OfflineApiService } from '../services/offline-api.service';
import { StorageService } from '../services/storage.service';
import {
  ConfiguracionOffline,
  PaqueteOffline,
  ProductoOffline,
  StockOffline,
  VarianteOffline
} from '../models/offline.model';
import {
  crearAuditoriaFalsa,
  crearDeviceFalso,
  crearMemoriaOffline,
  crearStorageFalso,
  MemoriaOffline
} from './testing/offline-test-doubles';

/**
 * [EXAMEN-2] CU05: descarga y catálogo offline.
 * Cubre la normalización del paquete, el sello de fecha, la descarga selectiva
 * por cuota, la sincronización incremental y la búsqueda local.
 */
describe('OfflineCatalogService - descarga y catálogo local', () => {
  let servicio: OfflineCatalogService;
  let memoria: MemoriaOffline;
  let api: jasmine.SpyObj<OfflineApiService>;
  let quota: jasmine.SpyObj<StorageQuotaService>;
  let auditoria: ReturnType<typeof crearAuditoriaFalsa>;

  const configuracion: ConfiguracionOffline = {
    id: 1,
    tenant_id: 10,
    descarga_automatica: true,
    hora_descarga: '23:59',
    incluir_clientes: true,
    max_clientes: 100,
    habilitar_carrito_offline: true,
    max_horas_sesion_offline: 8,
    max_dias_orden_pendiente: 7
  };

  const productos: ProductoOffline[] = [
    {
      id: 1,
      sku: 'BLU-001',
      nombre: 'Blusa de seda',
      descripcion: 'Blusa ligera',
      precio: 120,
      imagenes: [],
      estado: 'ACTIVO',
      genero: 'MUJER',
      categoria_id: 2,
      categoria: 'Blusas'
    },
    {
      id: 2,
      sku: 'PAN-001',
      nombre: 'Pantalón denim',
      precio: 180,
      imagenes: [],
      estado: 'ACTIVO',
      genero: 'HOMBRE',
      categoria_id: 3,
      categoria: 'Pantalones'
    }
  ];

  const variantes: VarianteOffline[] = [
    { id: 101, producto_id: 1, sku_variante: 'BLU-001-M', talla: 'M', color: 'Rojo', precio: 120 },
    { id: 102, producto_id: 2, sku_variante: 'PAN-001-32', talla: '32', color: 'Azul', precio: 180 }
  ];

  const stock: StockOffline[] = [
    {
      clave: '101:2',
      variante_producto_id: 101,
      sucursal_id: 2,
      cantidad: 5,
      cantidad_reservada: 0,
      cantidad_disponible: 5,
      stock_minimo: 1,
      estado: 'DISPONIBLE'
    },
    {
      clave: '102:2',
      variante_producto_id: 102,
      sucursal_id: 2,
      cantidad: 0,
      cantidad_reservada: 0,
      cantidad_disponible: 0,
      stock_minimo: 1,
      estado: 'AGOTADO'
    }
  ];

  function paquete(extra: Partial<PaqueteOffline> = {}): PaqueteOffline {
    return {
      tenant_id: 10,
      sucursal_id: 2,
      usuario_id: 7,
      version: 'v1',
      hash_paquete: 'hash-v1',
      fecha_corte: '2026-11-01T10:00:00.000Z',
      configuracion_offline: configuracion,
      catalogo: productos,
      variantes,
      stock,
      datos_maestros: {},
      promociones: { promociones: [{ id: 1 }, { id: 2 }] },
      clientes_frecuentes: [{ id: 5, nombre: 'Ana', apellido: 'Quispe' }],
      impuestos: { moneda: 'BOB', tasa_total: 13 },
      stripe: { stripe_publishable_key: 'pk_test_123' },
      permisos: { 'ventas.crear': true },
      ...extra
    };
  }

  beforeEach(() => {
    memoria = crearMemoriaOffline();
    auditoria = crearAuditoriaFalsa();
    api = jasmine.createSpyObj<OfflineApiService>('OfflineApiService', [
      'obtenerPaquete',
      'obtenerCatalogoIncremental',
      'obtenerStock',
      'obtenerClientes',
      'obtenerPromociones',
      'registrarDescarga'
    ]);
    quota = jasmine.createSpyObj<StorageQuotaService>('StorageQuotaService', [
      'puedeDescargar',
      'priorizarCatalogo'
    ]);
    quota.puedeDescargar.and.resolveTo(true);
    quota.priorizarCatalogo.and.callFake(<T>(candidatos: T[]) => candidatos);
    api.registrarDescarga.and.returnValue(of({
      registrada: true,
      dispositivo_id: 'dev-1'
    }));

    TestBed.configureTestingModule({
      providers: [
        { provide: IndexedDbService, useValue: memoria.servicio },
        { provide: DeviceService, useValue: crearDeviceFalso() },
        { provide: StorageService, useValue: crearStorageFalso() },
        { provide: OfflineApiService, useValue: api },
        { provide: StorageQuotaService, useValue: quota },
        { provide: OfflineAuditService, useValue: auditoria.servicio }
      ]
    });
    servicio = TestBed.inject(OfflineCatalogService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('descarga el paquete completo, lo normaliza y marca el sello de fecha', async () => {
    api.obtenerPaquete.and.returnValue(of(paquete() as unknown as Record<string, unknown>));

    const resultado = await servicio.descargarPaquete({ sucursalId: 2 });

    expect(resultado.version).toBe('v1');
    expect(resultado.productos).toBe(2);
    expect(resultado.variantes).toBe(2);
    expect(resultado.stock).toBe(2);
    expect(resultado.clientes).toBe(1);
    expect(resultado.promociones).toBe(2);
    expect(resultado.completa).toBeTrue();
    expect(resultado.bytes).toBeGreaterThan(0);
    expect(await servicio.selloActual()).toBe(resultado.fecha);
    expect(await servicio.datosCompletos()).toBeTrue();
    expect(memoria.todos<ProductoOffline>('productos')[0].tenant_id).toBe(10);
    expect((await servicio.versionLocal())?.hash_paquete).toBe('hash-v1');
    expect(await servicio.configuracionLocal()).toEqual(configuracion);
    expect((await servicio.obtenerClaveStripeLocal()).stripe_publishable_key).toBe('pk_test_123');
    expect(api.registrarDescarga).toHaveBeenCalledWith(jasmine.objectContaining({
      dispositivo_id: 'dev-1',
      sucursal_id: 2,
      version: 'v1',
      completo: true
    }));
  });

  it('la descarga local sobrevive si falla el registro de auditoría remota', async () => {
    api.obtenerPaquete.and.returnValue(of(paquete() as unknown as Record<string, unknown>));
    api.registrarDescarga.and.returnValue(throwError(() => new Error('sin red')));

    const resultado = await servicio.descargarPaquete({ sucursalId: 2 });

    expect(resultado.productos).toBe(2);
    expect(await servicio.datosCompletos()).toBeTrue();
    expect(auditoria.eventos.some((evento) => evento.tipo === 'DESCARGA')).toBeTrue();
  });

  it('recorta el catálogo cuando la cuota no alcanza y lo reporta como parcial', async () => {
    api.obtenerPaquete.and.returnValue(of(paquete() as unknown as Record<string, unknown>));
    quota.puedeDescargar.and.resolveTo(false);
    quota.priorizarCatalogo.and.returnValue([
      { variante_producto_id: 101, stock_disponible: 5, vendidos: 10 }
    ]);

    const resultado = await servicio.descargarPaquete({ sucursalId: 2 });

    expect(resultado.completa).toBeFalse();
    expect(resultado.variantes).toBe(1);
    expect(resultado.productos).toBe(1);
    expect(memoria.todos('variantes').length).toBe(1);
    expect(memoria.todos<VarianteOffline>('variantes')[0].id).toBe(101);
  });

  it('el incremental usa el cursor guardado y lo actualiza', async () => {
    memoria.sembrar('meta', { clave: 'cursor_catalogo', valor: 'v1' });
    api.obtenerCatalogoIncremental.and.returnValue(of({
      desde_version: 'v2',
      catalogo: [productos[0]],
      variantes: [variantes[0]],
      stock: [stock[0]]
    }));

    const resultado = await servicio.descargarIncremental();

    expect(resultado.version).toBe('v2');
    expect(resultado.completa).toBeFalse();
    expect(resultado.productos).toBe(1);
    expect((memoria.obtener('meta', 'cursor_catalogo') as any)?.valor).toBe('v2');
    expect(api.obtenerCatalogoIncremental).toHaveBeenCalledWith('v1', 2);
  });

  it('busca en el catálogo local ignorando tildes y aplica filtros', async () => {
    memoria.sembrar('productos', productos[0]);
    memoria.sembrar('productos', productos[1]);
    memoria.sembrar('productos', {
      ...productos[0],
      id: 3,
      sku: 'CHA-001',
      nombre: 'Chaqueta',
      categoria_id: 4,
      categoria: 'Chaquetas'
    });
    memoria.sembrar('variantes', variantes[0]);
    memoria.sembrar('variantes', variantes[1]);
    memoria.sembrar('variantes', { ...variantes[0], id: 103, producto_id: 3 });
    memoria.sembrar('stock', stock[0]);
    memoria.sembrar('stock', stock[1]);
    memoria.sembrar('stock', { ...stock[0], clave: '103:2', variante_producto_id: 103 });

    const porTexto = await servicio.buscarLocal('pantalon');
    const porGenero = await servicio.buscarLocal('', { genero: 'MUJER' });
    const conStock = await servicio.buscarLocal('', { soloConStock: true });
    const limitado = await servicio.buscarLocal('', { limite: 1 });

    expect(porTexto.map((producto) => producto.id)).toEqual([2]);
    expect(porGenero.map((producto) => producto.nombre)).toEqual(['Blusa de seda', 'Chaqueta']);
    expect(conStock.map((producto) => producto.id).sort()).toEqual([1, 3]);
    expect(limitado.length).toBe(1);
  });

  it('descuenta stock local al vender sin red sin bajar de cero', async () => {
    memoria.sembrar('stock', stock[0]);

    const actualizado = await servicio.descontarStockLocal(101, 2, 2);
    const agotado = await servicio.descontarStockLocal(101, 99, 2);

    expect(actualizado?.cantidad_disponible).toBe(3);
    expect(agotado?.cantidad_disponible).toBe(0);
  });

  it('programa la descarga automática según la hora del tenant', async () => {
    memoria.sembrar('meta', { clave: 'configuracion', valor: configuracion });

    const fecha = await servicio.programarDescarga();

    expect(fecha).not.toBeNull();
    expect(Date.parse(fecha as string)).toBeGreaterThan(Date.now());
    expect(ahoraEnHorasMinutos(fecha as string)).toBe('23:59');
  });

  it('no programa descarga si la configuración la desactiva', async () => {
    memoria.sembrar('meta', {
      clave: 'configuracion',
      valor: { ...configuracion, descarga_automatica: false }
    });

    await expectAsync(servicio.programarDescarga()).toBeResolvedTo(null);
  });

  function ahoraEnHorasMinutos(iso: string): string {
    const fecha = new Date(iso);
    return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
  }
});
