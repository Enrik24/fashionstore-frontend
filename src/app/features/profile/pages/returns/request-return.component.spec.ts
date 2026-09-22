import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { RequestReturnComponent } from './request-return.component';
import { OrderService } from '../../../../core/services/order.service';
import { ReturnsApiService } from '../../../../core/services/returns-api.service';
import { CatalogApiService } from '../../../../core/services/catalog-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AlertService } from '../../../../core/services/alert.service';

describe('RequestReturnComponent (CU28 - Devoluciones y cambios)', () => {
  let component: RequestReturnComponent;
  let fixture: ComponentFixture<RequestReturnComponent>;
  let orderServiceSpy: jasmine.SpyObj<OrderService>;
  let returnsApiSpy: jasmine.SpyObj<ReturnsApiService>;
  let toastSpy: jasmine.SpyObj<ToastService>;
  let alertServiceSpy: jasmine.SpyObj<AlertService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockOrder = {
    id: 5,
    numero_orden: 'ORD-2026-0005',
    cliente_id: 1,
    sucursal_id: 2,
    estado: 'ENTREGADO',
    total: 300,
    created_at: '2026-09-01T10:00:00Z',
    fecha: '2026-09-01T10:00:00Z',
    detalles: [
      {
        id: 10,
        orden_id: 5,
        variante_producto_id: 101,
        cantidad: 2,
        precio_unitario: 150,
        subtotal: 300,
        variante_producto: {
          id: 101,
          sku: 'VAR-101',
          precio: 150,
          producto_id: 1,
          producto: { id: 1, nombre: 'Camisa Lino Premium' }
        }
      }
    ]
  };

  beforeEach(async () => {
    orderServiceSpy = jasmine.createSpyObj('OrderService', ['getOrderById']);
    returnsApiSpy = jasmine.createSpyObj('ReturnsApiService', ['createRequest']);
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'warning', 'info']);
    alertServiceSpy = jasmine.createSpyObj('AlertService', ['confirm', 'success', 'error']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    orderServiceSpy.getOrderById.and.returnValue(of(mockOrder as any));

    await TestBed.configureTestingModule({
      imports: [RequestReturnComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: ReturnsApiService, useValue: returnsApiSpy },
        { provide: ToastService, useValue: toastSpy },
        { provide: AlertService, useValue: alertServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'orderId' ? '5' : null)
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RequestReturnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente y cargar la orden', () => {
    expect(component).toBeTruthy();
    expect(component.orden()?.id).toBe(5);
    expect(component.itemsSeleccionados().length).toBe(1);
    expect(component.pasoActual()).toBe(1);
  });

  it('no debe permitir avanzar el paso 1 si no hay prendas seleccionadas', () => {
    expect(component.puedeAvanzar()).toBeFalse();
    component.pasoSiguiente();
    expect(toastSpy.warning).toHaveBeenCalledWith('Selecciona al menos una prenda para continuar.');
    expect(component.pasoActual()).toBe(1);
  });

  it('debe calcular monto estimado al marcar prendas y avanzar al paso 2', () => {
    const item = component.itemsSeleccionados()[0];
    component.toggleItem(item, { target: { checked: true } } as any);
    expect(component.puedeAvanzar()).toBeTrue();
    expect(component.montoEstimado()).toBe(150);

    component.pasoSiguiente();
    expect(component.pasoActual()).toBe(2);
  });

  it('debe requerir selección de variante nueva si el tipo es CAMBIO', () => {
    const item = component.itemsSeleccionados()[0];
    component.toggleItem(item, { target: { checked: true } } as any);
    component.pasoSiguiente(); // Paso 2
    component.tipoSolicitud.set('CAMBIO');

    expect(component.puedeAvanzar()).toBeFalse();

    // Seleccionar variante cambio
    component.itemsSeleccionados.update(lista =>
      lista.map(x => ({ ...x, varianteCambioId: 102 }))
    );
    expect(component.puedeAvanzar()).toBeTrue();

    component.pasoSiguiente();
    expect(component.pasoActual()).toBe(3);
  });

  it('debe permitir retroceder entre pasos', () => {
    const item = component.itemsSeleccionados()[0];
    component.toggleItem(item, { target: { checked: true } } as any);
    component.pasoSiguiente();
    expect(component.pasoActual()).toBe(2);

    component.pasoAnterior();
    expect(component.pasoActual()).toBe(1);
  });
});