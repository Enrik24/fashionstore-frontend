import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { PromotionsComponent } from './promotions.component';
import { PromotionApiService } from '../../../../core/services/promotion-api.service';
import { CatalogApiService } from '../../../../core/services/catalog-api.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AlertService } from '../../../../core/services/alert.service';
import { Promocion } from '../../../../core/models/promotion.model';

describe('PromotionsComponent (CU24 - Gestión de Promociones)', () => {
  let component: PromotionsComponent;
  let fixture: ComponentFixture<PromotionsComponent>;
  let promotionApiSpy: jasmine.SpyObj<PromotionApiService>;
  let catalogApiSpy: jasmine.SpyObj<CatalogApiService>;
  let branchApiSpy: jasmine.SpyObj<BranchApiService>;
  let toastSpy: jasmine.SpyObj<ToastService>;
  let alertServiceSpy: jasmine.SpyObj<AlertService>;

  const mockPromotions: Promocion[] = [
    {
      id: 1,
      nombre: 'Black Friday 2026',
      descripcion: 'Descuento general',
      tipo: 'PORCENTAJE',
      valor: 20,
      fecha_inicio: '2026-11-20T00:00:00Z',
      fecha_fin: '2026-11-30T23:59:59Z',
      estado: 'ACTIVA',
      fecha_creacion: '2026-09-01T00:00:00Z',
      producto_ids: [],
      categoria_ids: [],
      sucursal_ids: []
    }
  ];

  beforeEach(async () => {
    promotionApiSpy = jasmine.createSpyObj('PromotionApiService', [
      'getPromotions',
      'createPromotion',
      'updatePromotion',
      'changeStatus',
      'deletePromotion'
    ]);
    catalogApiSpy = jasmine.createSpyObj('CatalogApiService', ['getProducts', 'getCategories']);
    branchApiSpy = jasmine.createSpyObj('BranchApiService', ['getBranches']);
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'warning', 'info']);
    alertServiceSpy = jasmine.createSpyObj('AlertService', ['confirm', 'success', 'error', 'warning']);

    promotionApiSpy.getPromotions.and.returnValue(of(mockPromotions));
    catalogApiSpy.getProducts.and.returnValue(of([]));
    catalogApiSpy.getCategories.and.returnValue(of([]));
    branchApiSpy.getBranches.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [PromotionsComponent, HttpClientTestingModule],
      providers: [
        { provide: PromotionApiService, useValue: promotionApiSpy },
        { provide: CatalogApiService, useValue: catalogApiSpy },
        { provide: BranchApiService, useValue: branchApiSpy },
        { provide: ToastService, useValue: toastSpy },
        { provide: AlertService, useValue: alertServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PromotionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse y cargar listado de promociones', () => {
    expect(component).toBeTruthy();
    expect(component.promotions().length).toBe(1);
    expect(component.activePromotions()).toBe(1);
  });

  it('debe abrir modal de creación y validar campos requeridos', () => {
    component.openCreateModal();
    expect(component.isPromotionModalOpen()).toBeTrue();
    expect(component.isEditingPromotion()).toBeFalse();
    expect(component.promotionForm.valid).toBeFalse();

    // Llenar datos válidos
    component.promotionForm.patchValue({
      nombre: 'Promo Primavera',
      tipo: 'PORCENTAJE',
      valor: 15,
      fecha_inicio: '2026-09-21T10:00',
      fecha_fin: '2026-09-30T10:00',
      estado: 'ACTIVA'
    });

    expect(component.promotionForm.valid).toBeTrue();
  });

  it('debe validar que fecha_fin sea posterior a fecha_inicio', () => {
    component.openCreateModal();
    component.promotionForm.patchValue({
      nombre: 'Promo Fechas Inválidas',
      tipo: 'PORCENTAJE',
      valor: 10,
      fecha_inicio: '2026-09-30T10:00',
      fecha_fin: '2026-09-20T10:00'
    });

    expect(component.promotionForm.errors?.['rangoFechas']).toBeTrue();
  });

  it('debe mostrar alerta clara ante error 409 de solapamiento', () => {
    component.openCreateModal();
    component.promotionForm.patchValue({
      nombre: 'Promo Solapada',
      tipo: 'PORCENTAJE',
      valor: 15,
      fecha_inicio: '2026-09-21T10:00',
      fecha_fin: '2026-09-30T10:00',
      estado: 'ACTIVA'
    });

    promotionApiSpy.createPromotion.and.returnValue(
      throwError(() => ({ status: 409, error: { detail: 'Existe una promoción activa solapada con estos productos' } }))
    );

    component.savePromotion();
    expect(alertServiceSpy.error).toHaveBeenCalledWith(
      'Solapamiento de promociones',
      'Existe una promoción activa solapada con estos productos'
    );
  });

  it('debe alternar el estado de la promoción', () => {
    promotionApiSpy.changeStatus.and.returnValue(of({ ...mockPromotions[0], estado: 'INACTIVA' }));
    promotionApiSpy.getPromotions.and.returnValue(of([{ ...mockPromotions[0], estado: 'INACTIVA' }]));

    component.togglePromotionStatus(mockPromotions[0]);
    expect(promotionApiSpy.changeStatus).toHaveBeenCalledWith(1, 'INACTIVA');
  });
});
