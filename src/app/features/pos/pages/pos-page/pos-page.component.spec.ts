import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { PosPageComponent } from './pos-page.component';
import { PosService } from '../../../../core/services/pos.service';
import { PublicCatalogService } from '../../../../core/services/public-catalog.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Sucursal } from '../../../../core/models/branch.model';
import { Producto, VarianteProducto } from '../../../../core/models/catalog.model';

describe('PosPageComponent (CU17 - Venta Presencial)', () => {
  let component: PosPageComponent;
  let fixture: ComponentFixture<PosPageComponent>;
  let branchServiceMock: any;
  let posServiceMock: any;
  let catalogServiceMock: any;
  let toastMock: any;

  const sucursalCentral: Sucursal = {
    id: 1,
    nombre: 'Sucursal Central',
    direccion: 'Av. Principal 123',
    telefono: '77712345',
    horario_atencion: '09:00 - 18:00',
    estado: 'ACTIVO',
    ciudad_id: 1
  };

  const sucursalNorte: Sucursal = {
    id: 2,
    nombre: 'Sucursal Norte',
    direccion: 'Av. Norte 456',
    telefono: '77798765',
    horario_atencion: '09:00 - 18:00',
    estado: 'ACTIVO',
    ciudad_id: 2
  };

  const variante: VarianteProducto = {
    id: 10,
    producto_id: 100,
    color_id: 1,
    sku_variante: 'CAM-LINO-S-BL',
    talla: { id: 1, valor: 'S' },
    color: { id: 1, nombre: 'Blanco' }
  };

  const producto: Producto = {
    id: 100,
    sku: 'CAM-LINO-001',
    nombre: 'Camisa Lino Premium',
    descripcion: 'Camisa fresca 100% lino',
    precio: 180,
    imagenes: ['https://example.com/camisa.jpg'],
    estado: 'ACTIVO',
    categoria_id: 1,
    variantes: [variante]
  };

  beforeEach(async () => {
    branchServiceMock = {
      getBranches: jasmine.createSpy('getBranches').and.returnValue(of([sucursalCentral, sucursalNorte])),
      // La Sucursal Central tiene 7 unidades y la Sucursal Norte ninguna
      getBranchProducts: jasmine.createSpy('getBranchProducts').and.callFake((sucursalId: number) =>
        of([
          {
            id: 1,
            variante_producto_id: 10,
            sucursal_id: sucursalId,
            cantidad: sucursalId === 1 ? 7 : 0,
            cantidad_reservada: 0,
            cantidad_vendida: 0,
            cantidad_disponible: sucursalId === 1 ? 7 : 0,
            stock_minimo: 2,
            estado: sucursalId === 1 ? 'DISPONIBLE' : 'AGOTADO'
          }
        ])
      )
    };

    catalogServiceMock = {
      getCatalog: jasmine.createSpy('getCatalog').and.returnValue(of({ items: [producto], total: 1, pagina: 1, total_paginas: 1 }))
    };

    posServiceMock = {
      createInPersonSale: jasmine.createSpy('createInPersonSale').and.returnValue(of({ id: 55 })),
      searchClients: jasmine.createSpy('searchClients').and.returnValue(of([])),
      getSalePdfUrl: jasmine.createSpy('getSalePdfUrl').and.returnValue('http://pdf')
    };

    toastMock = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    await TestBed.configureTestingModule({
      imports: [PosPageComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: BranchApiService, useValue: branchServiceMock },
        { provide: PublicCatalogService, useValue: catalogServiceMock },
        { provide: PosService, useValue: posServiceMock },
        { provide: ToastService, useValue: toastMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PosPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe cargar las sucursales activas y el stock de la sucursal inicial', () => {
    expect(component).toBeTruthy();
    expect(component.branches.length).toBe(2);
    expect(component.selectedBranchId).toBe(1);
    expect(branchServiceMock.getBranchProducts).toHaveBeenCalledWith(1);
    expect(component.getVariantStock(10)).toBe(7);
  });

  it('debe permitir cambiar de sucursal desde el select y recargar el stock de la nueva sucursal', () => {
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('.pos-branch-select select');
    expect(select).toBeTruthy();
    expect(select.options.length).toBe(2);

    select.value = select.options[1].value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(component.selectedBranchId).toBe(2);
    expect(component.selectedBranchName).toBe('Sucursal Norte');
    expect(branchServiceMock.getBranchProducts).toHaveBeenCalledWith(2);
    expect(component.getVariantStock(10)).toBe(0);
  });

  it('debe agregar variantes al ticket cuando hay stock en la sucursal activa', () => {
    component.addVariantToTicket(producto, variante);

    expect(component.ticketItems.length).toBe(1);
    expect(component.ticketItems[0].cantidad).toBe(1);
  });

  it('no debe agregar una variante sin stock en la sucursal activa', () => {
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('.pos-branch-select select');
    select.value = select.options[1].value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    component.addVariantToTicket(producto, variante);

    expect(component.ticketItems.length).toBe(0);
    expect(toastMock.warning).toHaveBeenCalled();
  });

  it('no debe permitir vender más unidades que el stock de la sucursal', () => {
    component.addVariantToTicket(producto, variante);
    expect(component.ticketItems[0].cantidad).toBe(1);

    // La sucursal solo tiene 7 unidades disponibles
    for (let i = 0; i < 10; i++) {
      component.changeQty(component.ticketItems[0], 1);
    }

    expect(component.ticketItems[0].cantidad).toBe(7);
    expect(toastMock.warning).toHaveBeenCalled();
  });

  it('debe registrar la venta con la sucursal seleccionada', () => {
    component.addVariantToTicket(producto, variante);
    component.submitSale();

    expect(posServiceMock.createInPersonSale).toHaveBeenCalled();
    const payload = posServiceMock.createInPersonSale.calls.mostRecent().args[0];
    expect(payload.sucursal_id).toBe(1);
    expect(payload.detalles.length).toBe(1);
    expect(payload.detalles[0].variante_producto_id).toBe(10);
  });
});