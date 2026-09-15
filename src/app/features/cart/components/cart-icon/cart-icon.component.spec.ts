import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CartIconComponent } from './cart-icon.component';
import { CartService } from '../../../../core/services/cart.service';
import { signal } from '@angular/core';

describe('CartIconComponent', () => {
  let component: CartIconComponent;
  let fixture: ComponentFixture<CartIconComponent>;
  let mockCartService: any;

  beforeEach(async () => {
    mockCartService = {
      itemCountSignal: signal<number>(0)
    };

    await TestBed.configureTestingModule({
      imports: [CartIconComponent, RouterTestingModule],
      providers: [
        { provide: CartService, useValue: mockCartService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CartIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('no debe mostrar el badge si el carrito está vacío', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.cart-badge')).toBeNull();
  });

  it('debe mostrar el badge con el conteo cuando hay items', () => {
    mockCartService.itemCountSignal.set(3);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const badge = compiled.querySelector('.cart-badge');
    expect(badge).not.toBeNull();
    expect(badge?.textContent?.trim()).toBe('3');
  });
});
