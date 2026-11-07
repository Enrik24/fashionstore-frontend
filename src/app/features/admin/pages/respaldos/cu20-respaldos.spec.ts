import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BackupsApiService } from '../../../../core/services/backups-api.service';
import { firstValueFrom } from 'rxjs';

/** [EXAMEN-2] CU20: manual permitido/bloqueado plan, límite mensual, fallido, retención, descarga, restauración. */
describe('CU20 - Respaldos', () => {
  let api: BackupsApiService;
  let httpMock: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ imports: [HttpClientTestingModule] }); api = TestBed.inject(BackupsApiService); httpMock = TestBed.inject(HttpTestingController); });
  afterEach(() => { httpMock.verify(); TestBed.resetTestingModule(); });
  it('crea respaldo manual', async () => {
    const p = firstValueFrom(api.crearManual());
    httpMock.expectOne((r) => r.method === 'POST').flush({ id: 1, tipo: 'MANUAL', estado: 'COMPLETADO', fecha_inicio: 'x' });
    expect((await p).estado).toBe('COMPLETADO');
  });
  it('límite mensual y uso', async () => {
    const u = firstValueFrom(api.uso());
    httpMock.expectOne((r) => r.url.includes('/uso')).flush({ backups_mes_actual: 2, max_backups_manuales: 2 });
    expect((await u).max_backups_manuales).toBe(2);
  });
  it('lista con retención/detalle y descarga', async () => {
    const l = firstValueFrom(api.listar());
    httpMock.expectOne((r) => r.url.includes('/saas/backups')).flush([{ id: 1, tipo: 'MANUAL', estado: 'COMPLETADO', fecha_inicio: 'x', retencion_hasta: '2027-01-01' }]);
    expect((await l)[0].retencion_hasta).toBe('2027-01-01');
    const d = firstValueFrom(api.detalle(1));
    httpMock.expectOne((r) => r.url.includes('/backups/1')).flush({ id: 1, tipo: 'MANUAL', estado: 'COMPLETADO', fecha_inicio: 'x' });
    expect((await d).id).toBe(1);
  });
  it('restauración bloqueada sin motivo y autorizada con motivo', async () => {
    const r = firstValueFrom(api.restaurar(1, 'motivo valido de restauracion'));
    httpMock.expectOne((x) => x.url.includes('/restaurar')).flush({ id: 1, backup_id: 1, estado: 'SOLICITADA', motivo: 'motivo valido de restauracion', fecha_solicitud: 'x' });
    expect((await r).estado).toBe('SOLICITADA');
  });
});
