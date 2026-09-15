import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CartService } from './cart.service';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { Carrito, ItemCarrito, CuponValidacionResponse } from '../models/cart.model';

describe('CartService (Iteración 2 - CU11)', () => {
  let service: CartService;
  let httpMock: HttpTestingController;
  let mockToast: jasmine.SpyObj<ToastService>;
  let mockAuth: jasmine.SpyObj<AuthService>;
  const API_URL = `${environment.apiUrl}/carrito`;

  const mockCart: Carrito = {
    id: 1,
    cliente_id: 5,
    fecha_creacion: '2026-09-09T10:00:00Z',
    estado: 'ACTIVO',
    descuento_aplicado: 0,
    subtotal: 300,
    total: 300,
    items: [
      {
        id: 10,
        carrito_id: 1,
        variante_producto_id: 101,
        cantidad: 2,
        precio_unitario: 150,
        subtotal: 300,
        variante_producto: {
          id: 101,
          sku_variante: 'VEST-001-S-ROJO',
          producto_id: 1,
          talla: { id: 1, nombre: 'S' },
          color: { id: 1, nombre: 'Rojo' }
        }
      }
    ]
  };

  beforeEach(() => {
    mockToast = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    mockAuth = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'getUserFullName']);
    mockAuth.isAuthenticated.and.returnValue(false);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CartService,
        { provide: ToastService, useValue: mockToast },
        { provide: AuthService, useValue: mockAuth }
      ]
    });

    service = TestBed.inject(CartService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse con estado inicial vacío', () => {
    expect(service).toBeTruthy();
    expect(service.cartSignal()).toBeNull();
    expect(service.itemCountSignal()).toBe(0);
    expect(service.totalSignal()).toBe(0);
  });

  it('debe calcular itemCountSignal y totalSignal correctamente cuando el carrito tiene items', () => {
    service.cartSignal.set(mockCart);
    expect(service.itemCountSignal()).toBe(2);
    expect(service.subtotalSignal()).toBe(300);
    expect(service.totalSignal()).toBe(300);
  });

  it('debe agregar un item al carrito y recargar el carrito', () => {
    const newItem: ItemCarrito = {
      id: 11,
      carrito_id: 1,
      variante_producto_id: 102,
      cantidad: 1,
      precio_unitario: 100,
      subtotal: 100
    };

    service.addItem(102, 1).subscribe(res => {
      expect(res.variante_producto_id).toBe(102);
    });

    const addReq = httpMock.expectOne(`${API_URL}/items`);
    expect(addReq.request.method).toBe('POST');
    expect(addReq.request.body).toEqual({ variante_producto_id: 102, cantidad: 1 });
    addReq.flush(newItem);

    const loadReq = httpMock.expectOne(`${API_URL}/`);
    expect(loadReq.request.method).toBe('GET');
    loadReq.flush(mockCart);

    expect(mockToast.success).toHaveBeenCalledWith('Producto añadido al carrito');
  });

  it('debe aplicar un cupón válido y actualizar el carrito', () => {
    const couponResponse: CuponValidacionResponse = {
      valido: true,
      mensaje: 'Cupón de 10% aplicado',
      descuento_calculado: 30
    };

    service.applyCoupon('DESCUENTO10').subscribe(res => {
      expect(res.valido).toBeTrue();
      expect(res.descuento_calculado).toBe(30);
    });

    const req = httpMock.expectOne(`${API_URL}/aplicar-cupon`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ codigo: 'DESCUENTO10' });
    req.flush(couponResponse);

    const loadReq = httpMock.expectOne(`${API_URL}/`);
    loadReq.flush({ ...mockCart, descuento_aplicado: 30, total: 270 });

    expect(mockToast.success).toHaveBeenCalledWith('Cupón de 10% aplicado');
  });
});
