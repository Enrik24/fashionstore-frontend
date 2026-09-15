import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ProductCardComponent } from './product-card.component';
import { Producto } from '../../../../core/models/catalog.model';

describe('ProductCardComponent', () => {
  let component: ProductCardComponent;
  let fixture: ComponentFixture<ProductCardComponent>;

  const mockProduct: Producto = {
    id: 1,
    sku: 'CAM-001',
    nombre: 'Camisa Lino Premium',
    descripcion: 'Camisa fresca 100% lino',
    precio: 180,
    imagenes: ['https://example.com/camisa.jpg'],
    estado: 'ACTIVO',
    categoria_id: 1,
    categoria: { id: 1, nombre: 'Camisas' }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCardComponent, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductCardComponent);
    component = fixture.componentInstance;
    component.product = mockProduct;
    fixture.detectChanges();
  });

  it('debe renderizar el nombre, precio y SKU del producto', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.product-title')?.textContent).toContain('Camisa Lino Premium');
    expect(compiled.querySelector('.product-sku')?.textContent).toContain('CAM-001');
    expect(compiled.querySelector('.amount')?.textContent).toContain('180.00');
  });

  it('debe devolver la primera imagen del producto o la imagen por defecto', () => {
    expect(component.getProductImage()).toBe('https://example.com/camisa.jpg');

    component.product = { ...mockProduct, imagenes: [] };
    expect(component.getProductImage()).toContain('unsplash.com');
  });
});
