import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DeviceService } from './device.service';
import { IndexedDbService } from './indexed-db.service';
import { OfflineAuditService } from './offline-audit.service';
import { OfflineCartService } from './offline-cart.service';
import { OfflineCatalogService } from './offline-catalog.service';
import { OfflineQueueService } from './offline-queue.service';
import { StorageService } from '../services/storage.service';
import {
  CarritoLocal,
  ItemCarritoLocal,
  ProductoOffline,
  StockOffline,
  VarianteOffline
} from '../models/offline.model';
import {
  crearAuditoriaFalsa,
  crearCarritoFalso,
  crearDeviceFalso,
  crearMemoriaOffline,
  crearOperacionFalsa,
  crearStorageFalso,
  MemoriaOffline
} from './testing/offline-test-doubles';

/**
 * [EXAMEN-2] CU15 / RN-014: carrito local y conversión a orden con pago diferido.
 * El cupón solo se valida con conexión; la conversión genera orden, pago local
 * y una operación FIFO sin duplicar el carrito.
 */
describe('OfflineCartService - carrito local y conversión', () => {
  let servicio: OfflineCartService;
  let memoria: MemoriaOffline;
  let catalogo: jasmine.SpyObj<OfflineCatalogService>;
  let cola: jasmine.SpyObj<OfflineQueueService>;

  const variante: VarianteOffline = {
    id: 101,
    producto_id: 1,
    sku_producto: 'BLU-001',
    sku_variante: 'BLU-001-M',
    talla: 'M',
    color: 'Rojo',
    precio: 50,
    precio_variante: 50
  };

  const producto: ProductoOffline = {
    id: 1,
    sku: 'BLU-001',
    nombre: 'Blusa de seda',
    precio: 50,
    imagenes: ['blusa.jpg'],
    estado: 'ACTIVO'
  };

  const stock: StockOffline = {
    clave: '101:2',
    variante_producto_id: 101,
    sucursal_id: 2,
    cantidad: 5,
    cantidad_reservada: 0,
    cantidad_disponible: 5,
    stock_minimo: 1,
    estado: 'DISPONIBLE'
  };

  function item(parcial: Partial<ItemCarritoLocal> = {}): ItemCarritoLocal {
    return {
      item_id: 'item-1',
      variante_producto_id: 101,
      cantidad: 1,
      precio_unitario_local: 50,
      stock_local_conocido: 5,
      sku_variante: 'BLU-001-M',
      nombre_producto: 'Blusa de seda',
      imagen: 'blusa.jpg',
      talla: 'M',
      color: 'Rojo',
      subtotal_local: 50,
      stock_suficiente: true,
      ...parcial
    };
  }

  function carritoCon(items: ItemCarritoLocal[]): CarritoLocal {
    return crearCarritoFalso({
      items,
      subtotal_local: items.reduce((suma, linea) => suma + linea.subtotal_local, 0),
      total_local: items.reduce((suma, linea) => suma + linea.subtotal_local, 0)
    });
  }

  beforeEach(() => {
    memoria = crearMemoriaOffline();
    catalogo = jasmine.createSpyObj<OfflineCatalogService>('OfflineCatalogService', ['stockLocal']);
    cola = jasmine.createSpyObj<OfflineQueueService>('OfflineQueueService', ['encolar']);

    catalogo.stockLocal.and.resolveTo(stock);
    cola.encolar.and.resolveTo(crearOperacionFalsa({
      uuid_operacion: 'op-orden',
      tipo_operacion: 'ORDEN_PAGO_DIFERIDO'
    }));

    const auditoria = crearAuditoriaFalsa();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: IndexedDbService, useValue: memoria.servicio },
        { provide: DeviceService, useValue: crearDeviceFalso() },
        { provide: StorageService, useValue: crearStorageFalso() },
        { provide: OfflineCatalogService, useValue: catalogo },
        { provide: OfflineQueueService, useValue: cola },
        { provide: OfflineAuditService, useValue: auditoria.servicio }
      ]
    });
    servicio = TestBed.inject(OfflineCartService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('agrega un producto y acumula la cantidad si se repite', async () => {
    memoria.sembrar('variantes', variante);
    memoria.sembrar('productos', producto);

    const primero = await servicio.agregarItem(101, 1);
    const segundo = await servicio.agregarItem(101, 1);

    expect(primero.items.length).toBe(1);
    expect(primero.items[0].cantidad).toBe(1);
    expect(primero.items[0].subtotal_local).toBe(50);
    expect(primero.items[0].stock_suficiente).toBeTrue();
    expect(segundo.items[0].cantidad).toBe(2);
    expect(segundo.total_local).toBe(100);
    expect(segundo.sello_local).toMatch(/^[0-9a-f]{8}$/);
  });

  it('advierte el stock insuficiente y permite forzar la venta', async () => {
    memoria.sembrar('variantes', variante);
    memoria.sembrar('productos', producto);
    catalogo.stockLocal.and.resolveTo({ ...stock, cantidad_disponible: 1 });

    await expectAsync(servicio.agregarItem(101, 2)).toBeRejectedWithError(/Stock local insuficiente/);

    const forzado = await servicio.agregarItem(101, 2, { forzar: true });

    expect(forzado.items[0].cantidad).toBe(2);
    expect(forzado.items[0].stock_suficiente).toBeFalse();
  });

  it('modifica cantidades, elimina líneas y vacía el carrito', async () => {
    memoria.sembrar('carrito', carritoCon([item()]));

    const modificado = await servicio.modificarCantidad('item-1', 3);
    expect(modificado.items[0].cantidad).toBe(3);
    expect(modificado.total_local).toBe(150);

    const eliminado = await servicio.eliminarItem('item-1');
    expect(eliminado.items.length).toBe(0);

    const vacio = await servicio.vaciar();
    expect(vacio.total_local).toBe(0);
    expect(vacio.items).toEqual([]);
  });

  it('guarda el cupón pero no lo aplica sin conexión (RN-014)', async () => {
    const advertencia = await servicio.aplicarCupon(' PROMO10 ');

    const carrito = await servicio.cargarCarritoLocal();
    expect(advertencia.aplicado).toBeFalse();
    expect(advertencia.mensaje).toContain('únicamente con conexión');
    expect(carrito?.cupon_codigo).toBe('PROMO10');
    expect(carrito?.cupon_bloqueado).toBeTrue();
  });

  it('convierte el carrito en orden local, pago y operación FIFO', async () => {
    memoria.sembrar('carrito', carritoCon([item()]));

    const conversion = await servicio.convertirAOrden({
      clienteId: 5,
      direccionEnvio: 'Av. Siempre Viva 123'
    });

    expect(conversion.orden.estado).toBe('PENDIENTE_PAGO_DIFERIDO');
    expect(conversion.orden.total_local).toBe(50);
    expect(conversion.orden.cliente_id).toBe(5);
    expect(conversion.pago.estado).toBe('PENDIENTE_ENVIO');
    expect(conversion.pago.monto).toBe(50);
    expect(Date.parse(conversion.pago.fecha_expiracion as string)).toBeGreaterThan(Date.now());
    expect(conversion.operacion.tipo_operacion).toBe('ORDEN_PAGO_DIFERIDO');

    expect(cola.encolar).toHaveBeenCalledWith(
      'ORDEN_PAGO_DIFERIDO',
      jasmine.objectContaining({
        uuid_carrito: 'carrito-1',
        uuid_orden: conversion.orden.uuid_orden,
        uuid_pago: conversion.pago.uuid_pago,
        acepta_nuevo_total: true,
        direccion_envio: 'Av. Siempre Viva 123',
        items: [jasmine.objectContaining({ variante_producto_id: 101, cantidad: 1 })]
      }),
      { sucursalId: 2 }
    );

    expect((memoria.obtener('carrito', 'carrito-1') as any)?.estado).toBe('CONVERTIDO');
    expect(memoria.obtener('ordenes_locales', conversion.orden.uuid_orden)).not.toBeNull();
    expect(memoria.obtener('pagos', conversion.pago.uuid_pago)).not.toBeNull();
    expect(servicio.carrito()).toBeNull();
  });

  it('no convierte un carrito vacío', async () => {
    await expectAsync(servicio.convertirAOrden())
      .toBeRejectedWithError(/carrito está vacío/);
  });

  it('informa el estado de sincronización de la operación del carrito', async () => {
    memoria.sembrar('carrito', crearCarritoFalso({ uuid_carrito: 'carrito-x' }));
    memoria.sembrar('operaciones', crearOperacionFalsa({
      uuid_operacion: 'op-x',
      estado_sincronizacion: 'CONFLICTO',
      payload: { uuid_carrito: 'carrito-x' }
    }));

    const estado = await servicio.estadoSincronizacion('carrito-x');

    expect(estado.estado).toBe('CONFLICTO');
    expect(estado.operacion?.uuid_operacion).toBe('op-x');
    expect(estado.mensaje).toContain('conflicto');
  });

  it('expone los ítems locales con el contrato HTTP del backend', async () => {
    memoria.sembrar('carrito', carritoCon([item({ cantidad: 2, subtotal_local: 100 })]));
    await servicio.cargarCarritoLocal();

    const items = servicio.aItemsRemotos();

    expect(items).toEqual([{
      variante_producto_id: 101,
      cantidad: 2,
      precio_unitario_local: 50,
      stock_local_conocido: 5
    }]);
  });
});
