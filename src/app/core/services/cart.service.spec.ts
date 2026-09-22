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
    mockAuth = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'isClient', 'getUserFullName']);
    mockAuth.isAuthenticated.and.returnValue(false);
    mockAuth.isClient.and.returnValue(true);

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

  it('debe aplicar un cupón válido y actualizar el carrito (CU27)', () => {
    const updatedCart: Carrito = {
      ...mockCart,
      descuento_aplicado: 30,
      total: 270,
      cupon: {
        id: 1,
        codigo: 'DESCUENTO10',
        tipo: 'PORCENTAJE',
        valor: 10,
        fecha_inicio: '2026-01-01T00:00:00Z',
        fecha_fin: '2026-12-31T00:00:00Z',
        estado: 'ACTIVO',
        usos_actuales: 1
      }
    };

    service.applyCoupon('DESCUENTO10').subscribe(res => {
      expect(res.descuento_aplicado).toBe(30);
      expect(res.total).toBe(270);
    });

    const req = httpMock.expectOne(`${API_URL}/aplicar-cupon`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ codigo: 'DESCUENTO10' });
    req.flush(updatedCart);

    expect(mockToast.success).toHaveBeenCalledWith('Cupón aplicado exitosamente');
    expect(service.cartSignal()?.descuento_aplicado).toBe(30);
  });

  it('debe remover el cupón aplicado (CU27)', () => {
    service.removeCoupon().subscribe(res => {
      expect(res.descuento_aplicado).toBe(0);
      expect(res.total).toBe(300);
    });

    const req = httpMock.expectOne(`${API_URL}/remover-cupon`);
    expect(req.request.method).toBe('DELETE');
    req.flush(mockCart);

    expect(mockToast.info).toHaveBeenCalledWith('Cupón removido del carrito');
  });
});
