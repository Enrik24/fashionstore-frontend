import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FavoritesService } from './favorites.service';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

describe('FavoritesService (CU25 - Favoritos)', () => {
  let service: FavoritesService;
  let httpMock: HttpTestingController;
  let toastMock: jasmine.SpyObj<ToastService>;
  let authMock: jasmine.SpyObj<AuthService>;
  let routerMock: jasmine.SpyObj<Router>;
  const API_URL = `${environment.apiUrl}/favoritos`;

  beforeEach(() => {
    toastMock = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    authMock = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'isClient']);
    authMock.isAuthenticated.and.returnValue(false);
    authMock.isClient.and.returnValue(false);
    routerMock = jasmine.createSpyObj('Router', ['navigate']);
    Object.defineProperty(routerMock, 'url', { value: '/catalog', writable: true });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [
        FavoritesService,
        { provide: ToastService, useValue: toastMock },
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock }
      ]
    });

    service = TestBed.inject(FavoritesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem('fashionstore_pending_favorite');
  });

  it('debe crearse con la lista de favoritos vacía', () => {
    expect(service).toBeTruthy();
    expect(service.favoriteIdsSignal().size).toBe(0);
  });

  it('debe redirigir a login y registrar la acción pendiente si el usuario no está autenticado', () => {
    service.toggle(42);

    expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: '/catalog' }
    });
    expect(localStorage.getItem('fashionstore_pending_favorite')).toBe('42');
    expect(toastMock.info).toHaveBeenCalled();
  });

  it('debe alternar el estado optimista y revertirlo si la API falla', () => {
    authMock.isAuthenticated.and.returnValue(true);
    authMock.isClient.and.returnValue(true);

    service.toggle(7);
    expect(service.isFavorite(7)).toBeTrue();

    const req = httpMock.expectOne(`${API_URL}/7`);
    expect(req.request.method).toBe('POST');
    req.flush({ detail: 'error interno' }, { status: 500, statusText: 'Server Error' });

    expect(service.isFavorite(7)).toBeFalse();
    expect(toastMock.error).toHaveBeenCalled();
  });

  it('debe eliminar el favorito con DELETE cuando ya es favorito', () => {
    authMock.isAuthenticated.and.returnValue(true);
    authMock.isClient.and.returnValue(true);
    service.favoriteIdsSignal.set(new Set([9]));

    service.toggle(9);
    expect(service.isFavorite(9)).toBeFalse();

    const req = httpMock.expectOne(`${API_URL}/9`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ mensaje: 'Producto eliminado de favoritos', producto_id: 9 });

    expect(service.isFavorite(9)).toBeFalse();
    expect(toastMock.info).toHaveBeenCalled();
  });

  it('debe procesar la acción pendiente tras iniciar sesión como cliente', () => {
    localStorage.setItem('fashionstore_pending_favorite', '42');

    (authMock.isClient as jasmine.Spy).and.returnValue(true);
    service.procesarAccionPendiente();

    const req = httpMock.expectOne(`${API_URL}/42`);
    expect(req.request.method).toBe('POST');
    req.flush({ mensaje: 'Producto agregado a favoritos', producto_id: 42, favorito_id: 1 });

    expect(service.isFavorite(42)).toBeTrue();
    expect(localStorage.getItem('fashionstore_pending_favorite')).toBeNull();
    expect(toastMock.success).toHaveBeenCalled();
  });

  it('debe cargar los IDs de favoritos del cliente autenticado', () => {
    authMock.isClient.and.returnValue(true);
    service.loadIds().subscribe(ids => {
      expect(ids).toEqual([1, 2, 3]);
    });

    const req = httpMock.expectOne(`${API_URL}/ids`);
    expect(req.request.method).toBe('GET');
    req.flush({ producto_ids: [1, 2, 3] });

    expect(service.isFavorite(2)).toBeTrue();
    expect(service.isFavorite(99)).toBeFalse();
  });

  it('debe mover un favorito al carrito vía POST /favoritos/{id}/mover-al-carrito', () => {
    authMock.isClient.and.returnValue(true);
    service.favoriteIdsSignal.set(new Set([5]));

    service.moveToCart(5, 100, 2, true).subscribe(res => {
      expect(res.mensaje).toContain('carrito');
    });

    const req = httpMock.expectOne(`${API_URL}/5/mover-al-carrito`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      variante_producto_id: 100,
      cantidad: 2,
      quitar_de_favoritos: true
    });
    req.flush({
      mensaje: 'Producto movido al carrito exitosamente',
      producto_id: 5,
      variante_producto_id: 100,
      cantidad: 2
    });

    expect(service.isFavorite(5)).toBeFalse();
    expect(toastMock.success).toHaveBeenCalled();
  });
});
