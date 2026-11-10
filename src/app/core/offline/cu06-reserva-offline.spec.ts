import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { OfflineCatalogService } from './offline-catalog.service';
import { OfflineDocumentService } from './offline-document.service';
import { OfflineQueueService } from './offline-queue.service';
import { ReservationService } from '../services/reservation.service';
import { StorageService } from '../services/storage.service';
import { ReservaCreate } from '../models/reservation.model';
import { ProductoOffline } from '../models/offline.model';
import {
  crearComprobanteFalso,
  crearOperacionFalsa,
  crearStorageFalso
} from './testing/offline-test-doubles';

/**
 * [EXAMEN-2] CU06: reserva offline.
 * El servidor recibe el payload exacto `RESERVA`; el cliente obtiene un
 * comprobante temporal y la reserva queda marcada como offline.
 */
describe('ReservationService - reserva sin conexión', () => {
  let servicio: ReservationService;
  let cola: jasmine.SpyObj<OfflineQueueService>;
  let documentos: jasmine.SpyObj<OfflineDocumentService>;
  let catalogo: jasmine.SpyObj<OfflineCatalogService>;

  const datos: ReservaCreate = {
    sucursal_id: 2,
    cliente_id: 5,
    fecha_reserva: '2026-11-10T15:00:00.000Z',
    horario_aproximado: '15:00',
    notas: 'Reserva de prueba',
    detalles: [
      { variante_producto_id: 101, cantidad: 2 },
      { variante_producto_id: 102, cantidad: 1 }
    ]
  };

  beforeEach(() => {
    cola = jasmine.createSpyObj<OfflineQueueService>('OfflineQueueService', ['encolar']);
    documentos = jasmine.createSpyObj<OfflineDocumentService>('OfflineDocumentService', [
      'generarComprobanteTemporal'
    ]);
    catalogo = jasmine.createSpyObj<OfflineCatalogService>('OfflineCatalogService', [
      'buscarLocal',
      // [EXAMEN-2] El servicio resuelve precio/detalle de la variante desde el
      // catálogo local; en estos tests se simula catálogo vacío (total Bs. 0).
      'obtenerVariante',
      'obtenerProducto'
    ]);
    catalogo.obtenerVariante.and.resolveTo(null);
    catalogo.obtenerProducto.and.resolveTo(null);

    cola.encolar.and.resolveTo(crearOperacionFalsa({
      uuid_operacion: 'op-reserva',
      tipo_operacion: 'RESERVA',
      estado_sincronizacion: 'PENDIENTE',
      payload: { uuid_reserva: 'uuid-reserva' }
    }));
    documentos.generarComprobanteTemporal.and.resolveTo(crearComprobanteFalso({
      tipo: 'RESERVA',
      numero_temporal: 'RES-20261104-0001',
      total: 0
    }));

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: OfflineQueueService, useValue: cola },
        { provide: OfflineDocumentService, useValue: documentos },
        { provide: OfflineCatalogService, useValue: catalogo },
        { provide: StorageService, useValue: crearStorageFalso() }
      ]
    });
    servicio = TestBed.inject(ReservationService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('encola la reserva con el contrato del backend y genera comprobante temporal', async () => {
    const resultado = await servicio.crearReservaLocal(datos, 5);

    expect(cola.encolar).toHaveBeenCalledTimes(1);
    const [tipo, payload, opciones] = cola.encolar.calls.mostRecent().args;
    expect(tipo).toBe('RESERVA');
    expect(payload).toEqual(jasmine.objectContaining({
      sucursal_id: 2,
      cliente_id: 5,
      fecha_reserva: '2026-11-10T15:00:00.000Z',
      detalles: [
        { variante_producto_id: 101, cantidad: 2 },
        { variante_producto_id: 102, cantidad: 1 }
      ]
    }));
    expect((payload as Record<string, unknown>)['uuid_reserva']).toEqual(jasmine.any(String));
    expect(opciones).toEqual({ sucursalId: 2 });

    expect(documentos.generarComprobanteTemporal).toHaveBeenCalledWith(jasmine.objectContaining({
      tipo: 'RESERVA',
      total: 0,
      sucursalId: 2,
      clienteId: 5,
      leyenda: jasmine.stringContaining('registrada localmente')
    }));

    expect(resultado.reserva.numero_reserva).toBe('RES-20261104-0001');
    expect(resultado.reserva.es_offline).toBeTrue();
    expect(resultado.reserva.estado).toBe('PENDIENTE');
    expect(resultado.reserva.estado_sincronizacion).toBe('PENDIENTE');
    expect(resultado.reserva.uuid_reserva).toEqual(jasmine.any(String));
    expect(resultado.reserva.detalles.length).toBe(2);
    expect(resultado.operacion.uuid_operacion).toBe('op-reserva');
    expect(resultado.comprobante.tipo).toBe('RESERVA');
  });

  it('usa el cliente del payload cuando no se pasa explícitamente', async () => {
    await servicio.crearReservaLocal(datos);

    const [, payload] = cola.encolar.calls.mostRecent().args;
    expect((payload as Record<string, unknown>)['cliente_id']).toBe(5);
  });

  it('sirve el catálogo local con el término y filtros pedidos', async () => {
    const productos = [{ id: 1, nombre: 'Blusa' }] as ProductoOffline[];
    catalogo.buscarLocal.and.resolveTo(productos);

    const resultado = await servicio.catalogoLocal('blusa', { genero: 'MUJER', limite: 5 });

    expect(resultado).toBe(productos);
    expect(catalogo.buscarLocal).toHaveBeenCalledWith('blusa', { genero: 'MUJER', limite: 5 });
  });

  it('reutiliza el número de reserva al regenerar el comprobante local', async () => {
    const reserva = {
      id: 0,
      numero_reserva: 'RES-20261104-9999',
      cliente_id: 5,
      sucursal_id: 2,
      fecha_creacion: '2026-11-04T10:00:00.000Z',
      fecha_reserva: '2026-11-10T15:00:00.000Z',
      estado: 'PENDIENTE' as const,
      detalles: []
    };

    await servicio.generarComprobanteLocal(reserva, ['2 x variante 101']);

    expect(documentos.generarComprobanteTemporal).toHaveBeenCalledWith(jasmine.objectContaining({
      tipo: 'RESERVA',
      numeroTemporal: 'RES-20261104-9999',
      sucursalId: 2,
      clienteId: 5,
      detalle: ['2 x variante 101']
    }));
  });
});
