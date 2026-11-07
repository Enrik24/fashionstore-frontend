import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { OfflineCatalogService } from './offline-catalog.service';
import { OfflineDocumentService } from './offline-document.service';
import { PosService } from '../services/pos.service';
import { VentaPresencialCreate } from '../models/cart.model';
import { ComprobanteLocal, ProductoOffline, StockOffline } from '../models/offline.model';
import { crearComprobanteFalso } from './testing/offline-test-doubles';

/**
 * [EXAMEN-2] CU07: venta de contado sin conexión.
 * Calcula el cambio, valida el stock local y emite un comprobante temporal con
 * la leyenda de sincronización.
 */
describe('PosService - venta de contado offline', () => {
  let servicio: PosService;
  let catalogo: jasmine.SpyObj<OfflineCatalogService>;
  let documentos: jasmine.SpyObj<OfflineDocumentService>;

  const venta: VentaPresencialCreate = {
    sucursal_id: 2,
    cliente_id: 5,
    metodo_pago: 'EFECTIVO',
    detalles: [
      { variante_producto_id: 101, cantidad: 2, precio_unitario: 60 }
    ]
  };

  beforeEach(() => {
    catalogo = jasmine.createSpyObj<OfflineCatalogService>('OfflineCatalogService', [
      'buscarLocal',
      'stockLocal'
    ]);
    documentos = jasmine.createSpyObj<OfflineDocumentService>('OfflineDocumentService', [
      'generarComprobanteTemporal'
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: OfflineCatalogService, useValue: catalogo },
        { provide: OfflineDocumentService, useValue: documentos }
      ]
    });
    servicio = TestBed.inject(PosService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('calcula el cambio sin valores negativos y con dos decimales', () => {
    expect(servicio.calcularCambio(100, 60)).toBe(40);
    expect(servicio.calcularCambio('50.50', '50.25')).toBe(0.25);
    expect(servicio.calcularCambio(40, 60)).toBe(0);
    expect(servicio.calcularCambio('no-numero', 60)).toBe(0);
    expect(servicio.calcularCambio(0.1 + 0.2, 0.1)).toBe(0.2);
  });

  it('busca productos en el catálogo local con límite', async () => {
    const productos = [{ id: 1, nombre: 'Blusa' }] as ProductoOffline[];
    catalogo.buscarLocal.and.resolveTo(productos);

    const resultado = await servicio.buscarProductoLocal('blusa', 8);

    expect(resultado).toBe(productos);
    expect(catalogo.buscarLocal).toHaveBeenCalledWith('blusa', { limite: 8 });
  });

  it('valida stock local suficiente e insuficiente', async () => {
    const stock: StockOffline = {
      clave: '101:2',
      variante_producto_id: 101,
      sucursal_id: 2,
      cantidad: 3,
      cantidad_reservada: 0,
      cantidad_disponible: 3,
      stock_minimo: 1,
      estado: 'DISPONIBLE'
    };
    catalogo.stockLocal.and.resolveTo(stock);

    const suficiente = await servicio.validarStockLocal(101, 2, 2);
    const insuficiente = await servicio.validarStockLocal(101, 4, 2);

    expect(suficiente.suficiente).toBeTrue();
    expect(suficiente.disponible).toBe(3);
    expect(suficiente.mensaje).toContain('Stock local disponible');
    expect(insuficiente.suficiente).toBeFalse();
    expect(insuficiente.mensaje).toContain('insuficiente');
    expect(catalogo.stockLocal).toHaveBeenCalledWith(101, 2);
  });

  it('permite vender sin stock local descargado y avisa del posible conflicto', async () => {
    catalogo.stockLocal.and.resolveTo(null);

    const resultado = await servicio.validarStockLocal(999, 1);

    expect(resultado.suficiente).toBeTrue();
    expect(resultado.disponible).toBeNull();
    expect(resultado.mensaje).toContain('conflicto');
  });

  it('genera el comprobante temporal con la leyenda de venta offline', async () => {
    const comprobante = crearComprobanteFalso({
      tipo: 'VENTA_CONTADO',
      numero_temporal: 'VTA-20261104-0002',
      total: 120
    });
    documentos.generarComprobanteTemporal.and.resolveTo(comprobante);

    const resultado = await servicio.generarComprobanteTemporal(venta, 120);

    expect(resultado).toBe(comprobante);
    expect(documentos.generarComprobanteTemporal).toHaveBeenCalledWith(jasmine.objectContaining({
      tipo: 'VENTA_CONTADO',
      total: 120,
      moneda: 'BOB',
      sucursalId: 2,
      clienteId: 5,
      detalle: ['2 x variante 101 — BOB 60.00'],
      leyenda: jasmine.stringContaining('Comprobante temporal')
    }));
  });

  it('respeta un detalle de comprobante explícito', async () => {
    documentos.generarComprobanteTemporal.and.resolveTo(crearComprobanteFalso({
      tipo: 'VENTA_CONTADO'
    }) as ComprobanteLocal);

    await servicio.generarComprobanteTemporal(venta, 120, 'BOB', ['Línea manual']);

    expect(documentos.generarComprobanteTemporal).toHaveBeenCalledWith(jasmine.objectContaining({
      detalle: ['Línea manual']
    }));
  });
});
