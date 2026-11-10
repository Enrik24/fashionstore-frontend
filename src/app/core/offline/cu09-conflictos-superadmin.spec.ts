import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConflictService } from './conflict.service';
import { ConnectivityService } from './connectivity.service';
import { DeviceService } from './device.service';
import { IndexedDbService } from './indexed-db.service';
import { OfflineAuditService } from './offline-audit.service';
import { OfflineApiService } from '../services/offline-api.service';
import { StorageService } from '../services/storage.service';
import {
  crearAuditoriaFalsa,
  crearConectividadFalsa,
  crearConflictoFalso,
  crearDeviceFalso,
  crearMemoriaOffline,
  crearStorageFalso,
  MemoriaOffline
} from './testing/offline-test-doubles';

/**
 * [EXAMEN-2] CU09: un Super Administrador sin tenant consultado no puede
 * consultar el backend (exige `X-Tenant-ID`); el servicio debe quedarse en la
 * caché local en lugar de disparar un 404 RECURSO_NO_ENCONTRADO.
 */
describe('ConflictService - Super Administrador', () => {
  let memoria: MemoriaOffline;
  let conectividad: ReturnType<typeof crearConectividadFalsa>;
  let api: jasmine.SpyObj<OfflineApiService>;

  beforeEach(() => {
    memoria = crearMemoriaOffline();
    conectividad = crearConectividadFalsa(true);
    api = jasmine.createSpyObj<OfflineApiService>('OfflineApiService', [
      'listarConflictos',
      'obtenerConflicto',
      'resolverConflicto',
      'descartarConflicto',
      'contarConflictosPendientes'
    ]);
    api.listarConflictos.and.returnValue(of([]));
    api.contarConflictosPendientes.and.returnValue(of({ pendientes: 4 }));
  });

  afterEach(() => TestBed.resetTestingModule());

  function configurar(tenantConsultadoId: number | null): ConflictService {
    TestBed.configureTestingModule({
      providers: [
        { provide: IndexedDbService, useValue: memoria.servicio },
        { provide: DeviceService, useValue: crearDeviceFalso() },
        {
          provide: StorageService,
          useValue: crearStorageFalso({
            tenantId: null,
            esSuperAdmin: true,
            tenantConsultadoId
          })
        },
        { provide: ConnectivityService, useValue: conectividad.servicio },
        { provide: OfflineApiService, useValue: api },
        { provide: OfflineAuditService, useValue: crearAuditoriaFalsa().servicio }
      ]
    });
    return TestBed.inject(ConflictService);
  }

  it('sin tenant consultado lista la caché local y no llama al backend', async () => {
    const servicio = configurar(null);
    memoria.sembrar('conflictos', crearConflictoFalso({ id: 1, tenant_id: 10 }));

    const pendientes = await servicio.listarPendientes();

    expect(pendientes.map((conflicto) => conflicto.id)).toEqual([1]);
    expect(api.listarConflictos).not.toHaveBeenCalled();
  });

  it('sin tenant consultado el conteo de pendientes no llama al backend', async () => {
    const servicio = configurar(null);
    memoria.sembrar('conflictos', crearConflictoFalso({ id: 1, tenant_id: 10 }));

    const total = await servicio.contarPendientes();

    expect(total).toBe(1);
    expect(servicio.nuevos()).toBe(1);
    expect(api.contarConflictosPendientes).not.toHaveBeenCalled();
  });

  it('con tenant consultado sí consulta el backend', async () => {
    const servicio = configurar(10);
    api.contarConflictosPendientes.and.returnValue(of({ pendientes: 4 }));

    const total = await servicio.contarPendientes();

    expect(total).toBe(4);
    expect(api.contarConflictosPendientes).toHaveBeenCalled();
  });
});
