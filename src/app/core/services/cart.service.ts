import { Injectable, inject, signal, computed, effect, DestroyRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Carrito,
  ItemCarrito,
  ItemCarritoCreate,
  ItemCarritoUpdate,
  AplicarCuponRequest
} from '../models/cart.model';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private authService = inject(AuthService);
  private readonly API_URL = `${environment.apiUrl}/carrito`;

  // Reactive state using signals
  public cartSignal = signal<Carrito | null>(null);
  public loadingSignal = signal<boolean>(false);

  // Computed signals for components to consume
  public itemCountSignal = computed(() => {
    const cart = this.cartSignal();
    if (!cart || !cart.items) return 0;
    return cart.items.reduce((acc, item) => acc + item.cantidad, 0);
  });

  public subtotalSignal = computed(() => {
    const cart = this.cartSignal();
    return cart ? Number(cart.subtotal) : 0;
  });

  public discountSignal = computed(() => {
    const cart = this.cartSignal();
    return cart ? Number(cart.descuento_aplicado) : 0;
  });

  public totalSignal = computed(() => {
    const cart = this.cartSignal();
    return cart ? Number(cart.total) : 0;
  });

  constructor() {
    // React to authentication state changes
    effect(() => {
      const isClient = this.authService.isClient();
      if (isClient) {
        // User logged in as client - load cart
        this.loadCart().subscribe();
      } else {
        // User logged out or staff role without client profile (Admin, Encargado, Cajero) - clear cart
        this.cartSignal.set(null);
      }
    }, { allowSignalWrites: true });
  }

  clearCartState(): void {
    this.cartSignal.set(null);
  }

  loadCart(): Observable<Carrito | null> {
    if (!this.authService.isClient()) {
      this.cartSignal.set(null);
      return of(null);
    }

    this.loadingSignal.set(true);
    return this.http.get<Carrito>(`${this.API_URL}/`).pipe(
      tap((cart) => {
        this.cartSignal.set(cart);
        this.loadingSignal.set(false);
      }),
      catchError((err) => {
        this.cartSignal.set(null);
        this.loadingSignal.set(false);
        return of(null);
      })
    );
  }

  addItem(varianteProductoId: number, cantidad: number = 1): Observable<ItemCarrito> {
    this.loadingSignal.set(true);
    const body: ItemCarritoCreate = {
      variante_producto_id: varianteProductoId,
      cantidad
    };

    return this.http.post<ItemCarrito>(`${this.API_URL}/items`, body).pipe(
      tap((item) => {
        this.toast.success('Producto añadido al carrito');
        this.loadCart().subscribe();
      }),
      catchError((err) => {
        this.loadingSignal.set(false);
        const msg = err.error?.detail || 'No se pudo agregar el producto al carrito';
        this.toast.error(msg);
        throw err;
      })
    );
  }

  updateItemQuantity(itemId: number, cantidad: number): Observable<ItemCarrito> {
    const body: ItemCarritoUpdate = { cantidad };
    return this.http.put<ItemCarrito>(`${this.API_URL}/items/${itemId}`, body).pipe(
      tap(() => {
        this.loadCart().subscribe();
      }),
      catchError((err) => {
        const msg = err.error?.detail || 'Error al actualizar cantidad';
        this.toast.error(msg);
        throw err;
      })
    );
  }

  removeItem(itemId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/items/${itemId}`).pipe(
      tap(() => {
        this.toast.info('Producto removido del carrito');
        this.loadCart().subscribe();
      }),
      catchError((err) => {
        const msg = err.error?.detail || 'Error al eliminar producto';
        this.toast.error(msg);
        throw err;
      })
    );
  }

  clearCart(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/`).pipe(
      tap(() => {
        this.cartSignal.set(null);
        this.toast.info('Carrito vaciado');
      }),
      catchError((err) => {
        const msg = err.error?.detail || 'Error al vaciar carrito';
        this.toast.error(msg);
        throw err;
      })
    );
  }

  applyCoupon(codigo: string): Observable<Carrito> {
    const body: AplicarCuponRequest = { codigo };
    return this.http.post<Carrito>(`${this.API_URL}/aplicar-cupon`, body).pipe(
      tap((carrito) => {
        this.cartSignal.set(carrito);
        this.toast.success('Cupón aplicado exitosamente');
      }),
      catchError((err) => {
        const msg = typeof err?.error?.detail === 'string'
          ? err.error.detail
          : 'Cupón inválido o no aplicable';
        this.toast.error(msg);
        throw err;
      })
    );
  }

  /** CU27: quita el cupón aplicado y restaura el total original. */
  removeCoupon(): Observable<Carrito> {
    this.loadingSignal.set(true);
    return this.http.delete<Carrito>(`${this.API_URL}/remover-cupon`).pipe(
      tap((carrito) => {
        this.cartSignal.set(carrito);
        this.loadingSignal.set(false);
        this.toast.info('Cupón removido del carrito');
      }),
      catchError((err) => {
        this.loadingSignal.set(false);
        const msg = typeof err?.error?.detail === 'string'
          ? err.error.detail
          : 'No se pudo quitar el cupón del carrito';
        this.toast.error(msg);
        throw err;
      })
    );
  }
}
