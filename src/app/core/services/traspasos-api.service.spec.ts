import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TraspasosApiService } from './traspasos-api.service';
import { firstValueFrom } from 'rxjs';

/** [EXAMEN-2] Contract tests de traspasos. */
describe('TraspasosApiService', () => {
  let svc: TraspasosApiService;
  let httpMock: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ imports: [HttpClientTestingModule] }); svc = TestBed.inject(TraspasosApiService); httpMock = TestBed.inject(HttpTestingController); });
  afterEach(() => { httpMock.verify(); TestBed.resetTestingModule(); });
  it('crea, lista, detalle, sugerencias e historial', async () => {
    const c = firstValueFrom(svc.crear({ sucursal_origen_id: 1, sucursal_destino_id: 2, detalles: [{ variante_producto_id: 1, cantidad: 1 }] }));
    httpMock.expectOne((r) => r.method === 'POST').flush({ id: 1, numero: 'T-1', estado: 'EN_TRANSITO', detalles: [] });
    expect((await c).numero).toBe('T-1');
    const l = firstValueFrom(svc.listar());
    httpMock.expectOne((r) => r.url.includes('/traspasos')).flush([]);
    expect((await l).length).toBe(0);
    const s = firstValueFrom(svc.sugerencias());
    httpMock.expectOne((r) => r.url.includes('/sugerencias')).flush([]);
    expect((await s).length).toBe(0);
  });
  it('desenvuelve sugerencias e historial estructurado del backend', async () => {
    const s = firstValueFrom(svc.sugerencias());
    httpMock.expectOne((r) => r.url.includes('/sugerencias')).flush({
      sugerencias: [{ variante_producto_id: 1, sucursal_origen_id: 1, sucursal_destino_id: 2 }],
    });
    expect((await s).length).toBe(1);

    const h = firstValueFrom(svc.historialProducto(8));
    httpMock.expectOne((r) => r.url.includes('/producto/8')).flush({
      producto_id: 8,
      producto: 'Camisa',
      total_movimientos: 1,
      movimientos: [{ traspaso_id: 1, numero: 'T-1', estado: 'EN_TRANSITO', sucursal_origen_id: 1, sucursal_destino_id: 2, variante_producto_id: 1, cantidad: 2 }],
    });
    const historial = await h;
    expect(historial.producto).toBe('Camisa');
    expect(historial.movimientos.length).toBe(1);
  });
});
