import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PublicCatalogService } from './public-catalog.service';
import { environment } from '../../../environments/environment';
import { ProductoBusquedaResponse, DisponibilidadProductoResponse } from '../models/public-catalog.model';

describe('PublicCatalogService (Iteración 2 - CU09, CU10)', () => {
  let service: PublicCatalogService;
  let httpMock: HttpTestingController;
  const API_URL = `${environment.apiUrl}/public`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PublicCatalogService]
    });
    service = TestBed.inject(PublicCatalogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('debe obtener el catálogo paginado con filtros (CU09)', () => {
    const mockResponse: ProductoBusquedaResponse = {
      items: [
        {
          id: 1,
          sku: 'VEST-001',
          nombre: 'Vestido Seda Floral',
          descripcion: 'Elegante vestido de seda',
          precio: 250,
          imagenes: ['https://example.com/img1.jpg'],
          estado: 'ACTIVO',
          categoria_id: 1
        }
      ],
      total: 1,
      pagina: 1,
      total_paginas: 1
    };

    service.getCatalog({ q: 'Vestido', categoria_id: 1, pagina: 1, limite: 10 }).subscribe(res => {
      expect(res.items.length).toBe(1);
      expect(res.items[0].sku).toBe('VEST-001');
      expect(res.total).toBe(1);
    });

    const req = httpMock.expectOne(req => 
      req.url === `${API_URL}/catalogo` && 
      req.params.get('q') === 'Vestido' && 
      req.params.get('categoria_id') === '1'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('debe consultar la disponibilidad por sucursal de un producto (CU10)', () => {
    const mockAvailability: DisponibilidadProductoResponse = {
      producto_id: 1,
      producto_nombre: 'Vestido Seda Floral',
      sku: 'VEST-001',
      disponibilidad: [
        {
          sucursal_id: 1,
          sucursal_nombre: 'Sucursal Central',
          cantidad_disponible: 12,
          cantidad_reservada: 2,
          estado: 'DISPONIBLE'
        },
        {
          sucursal_id: 2,
          sucursal_nombre: 'Sucursal Norte',
          cantidad_disponible: 0,
          cantidad_reservada: 0,
          estado: 'AGOTADO'
        }
      ]
    };

    service.getProductAvailability(1).subscribe(res => {
      expect(res.disponibilidad.length).toBe(2);
      expect(res.disponibilidad[0].sucursal_nombre).toBe('Sucursal Central');
      expect(res.disponibilidad[0].cantidad_disponible).toBe(12);
      expect(res.disponibilidad[1].cantidad_disponible).toBe(0);
    });

    const req = httpMock.expectOne(`${API_URL}/disponibilidad/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockAvailability);
  });

  it('debe consultar disponibilidad filtrando por talla y color (CU10)', () => {
    const mockAvailability: DisponibilidadProductoResponse = {
      producto_id: 1,
      producto_nombre: 'Vestido Seda Floral',
      sku: 'VEST-001',
      talla: 'M',
      color: 'Azul',
      disponibilidad: [
        {
          sucursal_id: 1,
          sucursal_nombre: 'Sucursal Central',
          cantidad_disponible: 5,
          cantidad_reservada: 0,
          estado: 'DISPONIBLE'
        }
      ]
    };

    service.getProductAvailability(1, 3, 7).subscribe(res => {
      expect(res.talla).toBe('M');
      expect(res.color).toBe('Azul');
      expect(res.disponibilidad.length).toBe(1);
    });

    const req = httpMock.expectOne(req =>
      req.url === `${API_URL}/disponibilidad/1` &&
      req.params.get('talla_id') === '3' &&
      req.params.get('color_id') === '7'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockAvailability);
  });
});
