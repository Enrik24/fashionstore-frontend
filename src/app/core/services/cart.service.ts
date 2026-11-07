import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, from, map, of, switchMap, tap, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Carrito,
  ItemCarrito,
  ItemCarritoCreate,
  ItemCarritoUpdate,
  AplicarCuponRequest
} from '../models/cart.model';
import { CarritoLocal } from '../models/offline.model';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';
import { ConnectivityService } from '../offline/connectivity.service';
import { OfflineCartService, ConversionLocal } from '../offline/offline-cart.service';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private authService = inject(AuthService);
  private connectivity = inject(ConnectivityService);
  private offlineCart = inject(OfflineCartService);
  private readonly API_URL = `${environment.apiUrl}/carrito`;

  // Reactive state using signals
  public cartSignal = signal<Carrito | null>(null);
  public loadingSignal = signal<boolean>(false);

  // [EXAMEN-2] Estado para `sync-status-badge` y aviso del ícono del carrito.
  public estadoSincronizacion = signal<string>('ONLINE');
  public esOffline = computed(() => !this.connectivity.enLinea() || this.cartSignal()?.es_offline === true);
  public tieneCambiosSinSincronizar = computed(() => this.esOffline() && this.itemCountSignal() > 0);

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

    // [EXAMEN-2] Al recuperar la red se intenta migrar el carrito local.
    this.connectivity.alRecuperarConexion(() => {
      if (this.authService.isClient() && this.cartSignal()?.es_offline) {
        this.migrarCarritoLocal().subscribe({ error: () => undefined });
      }
    });
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
    if (!this.connectivity.enLinea()) {
      return from(this.cargarCarritoOffline()).pipe(
        tap((cart) => {
          this.cartSignal.set(cart);
          this.estadoSincronizacion.set(cart?.estado_sincronizacion ?? 'OFFLINE');
          this.loadingSignal.set(false);
        })
      );
    }

    return this.http.get<Carrito>(`${this.API_URL}/`).pipe(
      tap((cart) => {
        this.cartSignal.set(cart);
        this.estadoSincronizacion.set('ONLINE');
        this.loadingSignal.set(false);
      }),
      catchError((err) => {
        this.loadingSignal.set(false);
        // Si el backend falla pero hay carrito local, se ofrece continuar offline.
        return from(this.cargarCarritoOffline()).pipe(
          catchError(() => {
            this.cartSignal.set(null);
            return of(null);
          })
        );
      })
    );
  }

  addItem(varianteProductoId: number, cantidad: number = 1): Observable<ItemCarrito> {
    this.loadingSignal.set(true);

    if (!this.connectivity.enLinea()) {
      return from(this.offlineCart.agregarItem(varianteProductoId, cantidad)).pipe(
        map((carrito) => this.aItemCarrito(carrito)),
        tap(() => {
          this.toast.success('Producto añadido al carrito offline');
          this.loadCart().subscribe();
        })
      );
    }

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

  updateItemQuantity(itemId: number | string, cantidad: number): Observable<ItemCarrito> {
    if (!this.connectivity.enLinea()) {
      return from(this.offlineCart.modificarCantidad(String(itemId), cantidad)).pipe(
        map((carrito) => this.aItemCarrito(carrito)),
        tap(() => this.loadCart().subscribe())
      );
    }

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

  removeItem(itemId: number | string): Observable<{ message: string }> {
    if (!this.connectivity.enLinea()) {
      return from(this.offlineCart.eliminarItem(String(itemId))).pipe(
        map(() => ({ message: 'Producto removido del carrito offline' })),
        tap(() => {
          this.toast.info('Producto removido del carrito');
          this.loadCart().subscribe();
        })
      );
    }

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
    if (!this.connectivity.enLinea()) {
      return from(this.offlineCart.vaciar()).pipe(
        map(() => ({ message: 'Carrito offline vaciado' })),
        tap(() => {
          this.cartSignal.set(null);
          this.toast.info('Carrito vaciado');
        })
      );
    }

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
    if (!this.connectivity.enLinea()) {
      // RN-014: los cupones se validan solo con conexión.
      return from(this.offlineCart.aplicarCupon(codigo)).pipe(
        tap((advertencia) => this.toast.info(advertencia.mensaje)),
        switchMap(() => this.loadCart()),
        map((carrito) => carrito as Carrito)
      );
    }

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

  // ============================================================
  // [EXAMEN-2] CU15: carrito offline
  // ============================================================

  /** Migra el carrito local al servidor sin duplicar ítems. */
  migrarCarritoLocal(): Observable<Carrito | null> {
    return from(this.offlineCart.cargarCarritoLocal()).pipe(
      switchMap((local) => {
        if (!local || local.items.length === 0) return this.loadCart();
        if (!this.connectivity.enLinea()) return this.loadCart();

        return this.http.get<Carrito>(`${this.API_URL}/`).pipe(
          switchMap((servidor) => {
            const existentes = new Set(
              (servidor.items ?? []).map((item) => item.variante_producto_id)
            );
            const faltantes = local.items.filter((item) => !existentes.has(item.variante_producto_id));
            if (faltantes.length === 0) {
              this.estadoSincronizacion.set('MIGRADO');
              return this.loadCart();
            }

            const peticiones = faltantes.map((item) =>
              this.http.post<ItemCarrito>(`${this.API_URL}/items`, {
                variante_producto_id: item.variante_producto_id,
                cantidad: item.cantidad
              } satisfies ItemCarritoCreate)
            );
            return forkJoin(peticiones).pipe(
              switchMap(() => from(this.offlineCart.vaciar())),
              tap(() => this.estadoSincronizacion.set('MIGRADO')),
              switchMap(() => this.loadCart())
            );
          })
        );
      })
    );
  }

  /** Confirma la compra offline y crea la orden con pago diferido (CU15). */
  confirmarCompraOffline(opciones: {
    aceptaNuevoTotal?: boolean;
    direccionEnvio?: string;
    clienteId?: number | null;
    sucursalId?: number | null;
  } = {}): Promise<ConversionLocal> {
    return this.offlineCart.convertirAOrden(opciones).then((conversion) => {
      this.estadoSincronizacion.set(conversion.operacion.estado_sincronizacion);
      this.cartSignal.set(null);
      return conversion;
    });
  }

  async estadoCarritoOffline(): Promise<string> {
    const estado = await this.offlineCart.estadoSincronizacion();
    this.estadoSincronizacion.set(estado.estado);
    return estado.estado;
  }

  private async cargarCarritoOffline(): Promise<Carrito | null> {
    const local = await this.offlineCart.cargarCarritoLocal();
    return local ? this.aCarrito(local) : null;
  }

  private aCarrito(local: CarritoLocal): Carrito {
    return {
      id: 0,
      cliente_id: local.cliente_id ?? 0,
      fecha_creacion: local.updated_at,
      estado: local.estado === 'CONVERTIDO' ? 'CONVERTIDO' : 'ACTIVO',
      descuento_aplicado: local.descuento_local,
      items: local.items.map((item, indice) => ({
        id: indice + 1,
        carrito_id: 0,
        variante_producto_id: item.variante_producto_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario_local,
        precio_unitario_local: item.precio_unitario_local,
        stock_local_conocido: item.stock_local_conocido ?? undefined,
        subtotal: item.subtotal_local
      })),
      subtotal: local.subtotal_local,
      total: local.total_local,
      uuid_carrito: local.uuid_carrito,
      dispositivo_id: local.dispositivo_id,
      es_offline: true,
      estado_sincronizacion: local.estado,
      tenant_id: local.tenant_id,
      sello_local: local.sello_local
    };
  }

  private aItemCarrito(local: CarritoLocal): ItemCarrito {
    const item = local.items[local.items.length - 1];
    return {
      id: local.items.length,
      carrito_id: 0,
      variante_producto_id: item?.variante_producto_id ?? 0,
      cantidad: item?.cantidad ?? 0,
      precio_unitario: item?.precio_unitario_local ?? 0,
      subtotal: item?.subtotal_local ?? 0
    };
  }
}
