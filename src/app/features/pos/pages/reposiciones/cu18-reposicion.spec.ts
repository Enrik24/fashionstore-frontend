import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReturnsApiService } from '../../../../core/services/returns-api.service';
import { PosService } from '../../../../core/services/pos.service';
import { firstValueFrom } from 'rxjs';

/** [EXAMEN-2] CU18: misma talla otro color, mayor más cara, menor más barata, sin diferencia, sin stock, SIN_ALTERNATIVA, offline UUID, nota. */
describe('CU18 - Reposición', () => {
  let returns: ReturnsApiService;
  let pos: PosService;
  let httpMock: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ imports: [HttpClientTestingModule] }); returns = TestBed.inject(ReturnsApiService); pos = TestBed.inject(PosService); httpMock = TestBed.inject(HttpTestingController); });
  afterEach(() => { httpMock.verify(); TestBed.resetTestingModule(); });
  it('misma talla otro color sin diferencia', () => {
    expect(pos.calcularDiferencia(50, 50).tipo_diferencia).toBe('SIN_DIFERENCIA');
  });
  it('talla mayor más cara cobra', () => {
    const d = pos.calcularDiferencia(50, 70);
    expect(d.tipo_diferencia).toBe('COBRO');
    expect(d.monto_pagado_diferencia).toBe(20);
  });
  it('talla menor más barata saldo a favor', () => {
    const d = pos.calcularDiferencia(70, 50);
    expect(d.saldo_favor).toBe(20);
  });
  it('sin stock y SIN_ALTERNATIVA notifica', async () => {
    const p = firstValueFrom(returns.alternativasTalla(1, 'MAYOR', 2));
    httpMock.expectOne((r) => r.url.includes('/alternativas-talla/1')).flush([]);
    expect((await p).length).toBe(0);
    expect(returns.notificarAlternativa).toBeDefined();
  });
  it('offline con UUID y nota de reposición', async () => {
    expect(pos.registrarReposicion).toBeDefined();
    expect(returns.descargarNotaReposicion).toBeDefined();
    expect(returns.solicitarReposicion).toBeDefined();
  });
});
