import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BranchTransfersComponent } from './branch-transfers.component';
import { TraspasosApiService } from '../../../../core/services/traspasos-api.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

describe('BranchTransfersComponent', () => {
  let traspasosApi: jasmine.SpyObj<TraspasosApiService>;
  let branchApi: jasmine.SpyObj<BranchApiService>;
  let toast: jasmine.SpyObj<ToastService>;

  const traspaso = {
    id: 1,
    numero: 'TRASP-TEST-01',
    sucursal_origen_id: 1,
    sucursal_destino_id: 2,
    estado: 'EN_TRANSITO' as const,
    fecha_envio: '2026-11-09T01:06:56Z',
    detalles: [{
      id: 11,
      variante_producto_id: 97,
      producto_id: 40,
      producto: 'Zapatilla Canvas',
      cantidad: 5,
      cantidad_recibida: 0,
      cantidad_merma: 0,
    }],
  };

  beforeEach(async () => {
    traspasosApi = jasmine.createSpyObj<TraspasosApiService>('TraspasosApiService', ['listar', 'recibir', 'rechazar']);
    traspasosApi.listar.and.returnValue(of([traspaso]));
    traspasosApi.recibir.and.returnValue(of({ ...traspaso, estado: 'RECIBIDO' }));
    traspasosApi.rechazar.and.returnValue(of({ ...traspaso, estado: 'RECHAZADO_PARCIAL' }));

    branchApi = jasmine.createSpyObj<BranchApiService>('BranchApiService', ['getBranches']);
    branchApi.getBranches.and.returnValue(of([
      { id: 1, nombre: 'Sucursal Central' },
      { id: 2, nombre: 'Sucursal Equipetrol' },
    ] as any));

    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['userSucursalId', 'userSucursalNombre']);
    auth.userSucursalId.and.returnValue(2);
    auth.userSucursalNombre.and.returnValue('Sucursal Equipetrol');

    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'warning', 'info']);

    await TestBed.configureTestingModule({
      imports: [BranchTransfersComponent],
      providers: [
        { provide: TraspasosApiService, useValue: traspasosApi },
        { provide: BranchApiService, useValue: branchApi },
        { provide: AuthService, useValue: auth },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();
  });

  it('renderiza el rediseño y filtra por la sucursal asignada', () => {
    const fixture = TestBed.createComponent(BranchTransfersComponent);
    fixture.detectChanges();

    expect(traspasosApi.listar).toHaveBeenCalledWith({ estado: 'EN_TRANSITO', sucursal_id: 2, limit: 100 });
    expect(fixture.nativeElement.textContent).toContain('Traspasos por recibir');
    expect(fixture.nativeElement.textContent).toContain('Sucursal Equipetrol');
    expect(fixture.nativeElement.textContent).toContain('Zapatilla Canvas');
    expect(fixture.nativeElement.textContent).toContain('Confirmar recepción');
    expect(fixture.nativeElement.querySelectorAll('.summary-card').length).toBe(3);
  });

  it('envía el contrato vigente de recepción con detalle_id', () => {
    const fixture = TestBed.createComponent(BranchTransfersComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.recibir(component.lista()[0]);

    expect(traspasosApi.recibir).toHaveBeenCalledWith(1, {
      detalles: [{ detalle_id: 11, cantidad_recibida: 5, cantidad_merma: 0 }],
    });
  });

  it('solicita motivo y solo las líneas marcadas para rechazo', () => {
    const fixture = TestBed.createComponent(BranchTransfersComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const actual = component.lista()[0];

    component.abrirRechazo(actual);
    component.alternarLineaRechazo(actual.detalles[0]);
    component.motivoRechazo = 'Prenda dañada';
    component.rechazar(actual);

    expect(traspasosApi.rechazar).toHaveBeenCalledWith(1, {
      detalles: [{ detalle_id: 11 }],
      motivo: 'Prenda dañada',
      devolver_origen: true,
    });
  });
});
