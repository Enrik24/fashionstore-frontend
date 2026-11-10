import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TransfersComponent } from './transfers.component';
import { TraspasosApiService } from '../../../../core/services/traspasos-api.service';
import { InventoryApiService } from '../../../../core/services/inventory-api.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { CatalogApiService } from '../../../../core/services/catalog-api.service';
import { ToastService } from '../../../../core/services/toast.service';

/**
 * CU14: verifica que el historial pueda renderizar sus líneas sin errores
 * de plantilla en tiempo de ejecución.
 */
describe('TransfersComponent', () => {
  beforeEach(async () => {
    const traspasosApi = jasmine.createSpyObj<TraspasosApiService>('TraspasosApiService', [
      'listar',
      'sugerencias',
    ]);
    traspasosApi.listar.and.returnValue(of([]));
    traspasosApi.sugerencias.and.returnValue(of([]));

    const branchApi = jasmine.createSpyObj<BranchApiService>('BranchApiService', ['getBranches']);
    branchApi.getBranches.and.returnValue(of([]));

    const catalogApi = jasmine.createSpyObj<CatalogApiService>('CatalogApiService', [
      'getProducts',
      'getProductVariants',
    ]);
    catalogApi.getProducts.and.returnValue(of([]));
    catalogApi.getProductVariants.and.returnValue(of([]));

    const inventoryApi = jasmine.createSpyObj<InventoryApiService>('InventoryApiService', [
      'getBranchInventory',
    ]);
    const toastService = jasmine.createSpyObj<ToastService>('ToastService', [
      'success',
      'error',
      'warning',
      'info',
    ]);

    await TestBed.configureTestingModule({
      imports: [TransfersComponent],
      providers: [
        { provide: TraspasosApiService, useValue: traspasosApi },
        { provide: InventoryApiService, useValue: inventoryApi },
        { provide: BranchApiService, useValue: branchApi },
        { provide: CatalogApiService, useValue: catalogApi },
        { provide: ToastService, useValue: toastService },
      ],
    }).compileComponents();
  });

  it('renderiza las líneas de un traspaso sin lanzar ReferenceError', () => {
    const fixture = TestBed.createComponent(TransfersComponent);
    const component = fixture.componentInstance;

    // Inicializa ngOnInit con la respuesta vacía del API y luego simula un
    // traspaso ya recibido para ejercitar el bloque @for del historial.
    fixture.detectChanges();
    component.lista.set([{
      id: 1,
      numero: 'T-001',
      sucursal_origen_id: 1,
      sucursal_destino_id: 2,
      estado: 'EN_TRANSITO',
      detalles: [{
        id: 10,
        variante_producto_id: 100,
        producto_id: 5,
        producto: 'Camisa azul',
        cantidad: 3,
      }],
    }]);
    component.cargando.set(false);

    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.nativeElement.textContent).toContain('Camisa azul');
    expect(fixture.nativeElement.textContent).toContain('Variante #100');
  });
});
