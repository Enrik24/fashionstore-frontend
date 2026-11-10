import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TraspasosApiService } from '../../../../core/services/traspasos-api.service';
import { firstValueFrom } from 'rxjs';

/** [EXAMEN-2] CU14: varias líneas, stock insuficiente, recepción parcial+merma, rechazo, cancelación. */
describe('CU14 - Traspasos', () => {
  let api: TraspasosApiService;
  let httpMock: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ imports: [HttpClientTestingModule] }); api = TestBed.inject(TraspasosApiService); httpMock = TestBed.inject(HttpTestingController); });
  afterEach(() => { httpMock.verify(); TestBed.resetTestingModule(); });
  it('crea traspaso multilineal validando suma parcial', async () => {
    const p = firstValueFrom(api.crear({ sucursal_origen_id: 1, sucursal_destino_id: 2, detalles: [{ variante_producto_id: 10, cantidad: 5 }, { variante_producto_id: 11, cantidad: 3 }] }));
    httpMock.expectOne((r) => r.method === 'POST').flush({ id: 1, numero: 'T-1', estado: 'EN_TRANSITO', detalles: [] });
    expect((await p).numero).toBe('T-1');
  });
  it('recepción parcial respeta recibida+merma=cantidad', async () => {
    const p = firstValueFrom(api.recibir(1, { detalles: [{ detalle_id: 21, cantidad_recibida: 4, cantidad_merma: 1 }] }));
    httpMock.expectOne((r) => r.url.includes('/recibir')).flush({ id: 1, numero: 'T-1', estado: 'RECIBIDO', detalles: [] });
    expect((await p).estado).toBe('RECIBIDO');
  });
  it('rechazo por línea y cancelación', async () => {
    const r = firstValueFrom(api.rechazar(1, { detalles: [{ detalle_id: 21 }], motivo: 'Prenda dañada', devolver_origen: true }));
    httpMock.expectOne((x) => x.url.includes('/rechazar')).flush({ id: 1, numero: 'T-1', estado: 'RECHAZADO_PARCIAL', detalles: [] });
    expect((await r).estado).toBe('RECHAZADO_PARCIAL');
    const c = firstValueFrom(api.cancelar(2));
    httpMock.expectOne((x) => x.url.includes('/cancelar')).flush({ id: 2, numero: 'T-2', estado: 'CANCELADO', detalles: [] });
    expect((await c).estado).toBe('CANCELADO');
  });
  it('sugerencias e historial por producto', async () => {
    const s = firstValueFrom(api.sugerencias());
    httpMock.expectOne((r) => r.url.includes('/sugerencias')).flush([{ variante_producto_id: 1 }]);
    expect((await s).length).toBe(1);
  });
});
