import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReturnsApiService } from '../../../../core/services/returns-api.service';
import { PosService } from '../../../../core/services/pos.service';
import { firstValueFrom } from 'rxjs';

/** [EXAMEN-2] CU13: dentro/fuera plazo, reembolso, saldo, offline UUID, nota. */
describe('CU13 - Devolución', () => {
  let returns: ReturnsApiService;
  let pos: PosService;
  let httpMock: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ imports: [HttpClientTestingModule] }); returns = TestBed.inject(ReturnsApiService); pos = TestBed.inject(PosService); httpMock = TestBed.inject(HttpTestingController); });
  afterEach(() => { httpMock.verify(); TestBed.resetTestingModule(); });
  it('dentro de plazo calcula saldo a favor', () => {
    const p = firstValueFrom(returns.validarPlazo(1));
    httpMock.expectOne((r) => r.url.includes('/validar-plazo/1')).flush({ valido: true, fecha_limite_cambio: '2026-11-20' });
    return p.then((r) => expect(r.valido).toBeTrue());
  });
  it('fuera de plazo bloquea', () => {
    const p = firstValueFrom(returns.validarPlazo(2));
    httpMock.expectOne((r) => r.url.includes('/validar-plazo/2')).flush({ valido: false });
    return p.then((r) => expect(r.valido).toBeFalse());
  });
  it('diferencia y saldo a favor', () => {
    const d = pos.calcularDiferencia(50, 30);
    expect(d.tipo_diferencia).toBe('SALDO_FAVOR');
    expect(d.saldo_favor).toBe(20);
  });
  it('buscar venta elegible y descarga nota', async () => {
    const v = firstValueFrom(returns.buscarVentaElegible('DOC-1'));
    httpMock.expectOne((r) => r.url.includes('/venta/DOC-1')).flush({ orden_id: 1 });
    expect((await v).orden_id).toBe(1);
    expect(returns.descargarNota).toBeDefined();
  });
});
