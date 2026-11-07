import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BackupsApiService } from './backups-api.service';
import { firstValueFrom } from 'rxjs';

/** [EXAMEN-2] Contract tests de respaldos. */
describe('BackupsApiService', () => {
  let svc: BackupsApiService;
  let httpMock: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ imports: [HttpClientTestingModule] }); svc = TestBed.inject(BackupsApiService); httpMock = TestBed.inject(HttpTestingController); });
  afterEach(() => { httpMock.verify(); TestBed.resetTestingModule(); });
  it('lista, crea, detalle, uso y restaura', async () => {
    const c = firstValueFrom(svc.crearManual());
    httpMock.expectOne((r) => r.method === 'POST').flush({ id: 1, tipo: 'MANUAL', estado: 'COMPLETADO', fecha_inicio: 'x' });
    expect((await c).estado).toBe('COMPLETADO');
    const u = firstValueFrom(svc.uso());
    httpMock.expectOne((r) => r.url.includes('/uso')).flush({ backups_mes_actual: 1, max_backups_manuales: 2 });
    expect((await u).backups_mes_actual).toBe(1);
    const r = firstValueFrom(svc.restaurar(1, 'motivo valido de restauracion'));
    httpMock.expectOne((x) => x.url.includes('/restaurar')).flush({ id: 1, backup_id: 1, estado: 'SOLICITADA', motivo: 'motivo valido de restauracion', fecha_solicitud: 'x' });
    expect((await r).estado).toBe('SOLICITADA');
  });
});
