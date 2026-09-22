import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CatalogFiltersComponent } from './catalog-filters.component';
import { CatalogApiService } from '../../../../core/services/catalog-api.service';
import { of } from 'rxjs';

describe('CatalogFiltersComponent', () => {
  let component: CatalogFiltersComponent;
  let fixture: ComponentFixture<CatalogFiltersComponent>;
  let mockCatalogApi: jasmine.SpyObj<CatalogApiService>;

  beforeEach(async () => {
    mockCatalogApi = jasmine.createSpyObj('CatalogApiService', [
      'getCategories', 'getSeasons', 'getSizes', 'getColors'
    ]);
    mockCatalogApi.getCategories.and.returnValue(of([{ id: 1, nombre: 'Vestidos' }]));
    mockCatalogApi.getSeasons.and.returnValue(of([{ id: 1, nombre: 'Verano 2026', fecha_inicio: '2026-01-01', fecha_fin: '2026-03-31' }]));
    mockCatalogApi.getSizes.and.returnValue(of([{ id: 1, nombre: 'M', valor: 'M' }]));
    mockCatalogApi.getColors.and.returnValue(of([{ id: 1, nombre: 'Azul', codigo_hex: '#0000ff' }]));

    await TestBed.configureTestingModule({
      imports: [CatalogFiltersComponent, HttpClientTestingModule],
      providers: [
        { provide: CatalogApiService, useValue: mockCatalogApi }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe inicializar y cargar categorías, temporadas, tallas y colores', () => {
    expect(component.categories.length).toBe(1);
    expect(component.seasons.length).toBe(1);
    expect(component.sizes.length).toBe(1);
    expect(component.colors.length).toBe(1);
  });

  it('debe emitir evento filtersChange al seleccionar talla o color', () => {
    spyOn(component.filtersChange, 'emit');

    component.selectSize(1);
    expect(component.filters.talla_id).toBe(1);
    expect(component.filtersChange.emit).toHaveBeenCalled();

    component.selectColor(1);
    expect(component.filters.color_id).toBe(1);
    expect(component.filtersChange.emit).toHaveBeenCalled();
  });

  it('debe reiniciar los filtros a su estado inicial', () => {
    spyOn(component.filtersChange, 'emit');

    component.filters.q = 'test';
    component.filters.categoria_id = 1;
    component.resetFilters();

    expect(component.filters.q).toBe('');
    expect(component.filters.categoria_id).toBeUndefined();
    expect(component.filtersChange.emit).toHaveBeenCalled();
  });
});
