import { Injectable, inject, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, throwError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ProductoFavorito,
  FavoritoIdsResponse,
  MoverFavoritoCarritoDto,
  MoverFavoritoCarritoResponse
} from '../models/favorite.model';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';

const PENDING_FAVORITE_KEY = 'fashionstore_pending_favorite';

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private readonly API_URL = `${environment.apiUrl}/favoritos`;

  /** IDs de productos favoritos del cliente autenticado (para pintar los corazones del catálogo). */
  public favoriteIdsSignal = signal<Set<number>>(new Set());
  /** Lista completa de favoritos (pantalla "Mis Favoritos"). */
  public favoritesSignal = signal<ProductoFavorito[]>([]);
  public loadingSignal = signal<boolean>(false);

  constructor() {
    effect(() => {
      const isClient = this.authService.isClient();
      if (isClient) {
        this.loadIds().subscribe();
        this.procesarAccionPendiente();
      } else {
        this.favoriteIdsSignal.set(new Set());
        this.favoritesSignal.set([]);
      }
    }, { allowSignalWrites: true });
  }

  isFavorite(productoId: number): boolean {
    return this.favoriteIdsSignal().has(productoId);
  }

  /** Alterna el estado de favorito con actualización optimista (CU25, excepción 2). */
  toggle(productoId: number): void {
    if (!this.authService.isAuthenticated()) {
      this.registrarAccionPendiente(productoId);
      this.toast.info('Inicia sesión para guardar tus productos favoritos.');
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    if (!this.authService.isClient()) {
      this.toast.warning('Solo los clientes pueden gestionar productos favoritos.');
      return;
    }

    const yaEsFavorito = this.isFavorite(productoId);
    this.aplicarEstadoLocal(productoId, !yaEsFavorito);

    const peticion$ = yaEsFavorito
      ? this.http.delete<{ mensaje: string }>(`${this.API_URL}/${productoId}`)
      : this.http.post<{ mensaje: string; producto_id: number }>(`${this.API_URL}/${productoId}`, {});

    peticion$.pipe(
      catchError((err) => {
        // Rollback ante error (optimistic UI)
        this.aplicarEstadoLocal(productoId, yaEsFavorito);
        const msg = typeof err?.error?.detail === 'string'
          ? err.error.detail
          : 'No se pudo actualizar tus favoritos.';
        this.toast.error(msg);
        return of(null);
      })
    ).subscribe({
      next: (res) => {
        if (!res) return;
        if (yaEsFavorito) {
          this.toast.info('Producto eliminado de tus favoritos');
          this.favoritesSignal.update(list => list.filter(f => f.producto_id !== productoId));
        } else {
          this.toast.success('Producto agregado a tus favoritos');
        }
      }
    });
  }

  agregar(productoId: number): Observable<{ mensaje: string; producto_id: number }> {
    return this.http.post<{ mensaje: string; producto_id: number }>(`${this.API_URL}/${productoId}`, {}).pipe(
      tap(() => this.aplicarEstadoLocal(productoId, true))
    );
  }

  quitar(productoId: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.API_URL}/${productoId}`).pipe(
      tap(() => {
        this.aplicarEstadoLocal(productoId, false);
        this.favoritesSignal.update(list => list.filter(f => f.producto_id !== productoId));
      })
    );
  }

  loadIds(): Observable<number[]> {
    if (!this.authService.isClient()) {
      this.favoriteIdsSignal.set(new Set());
      return of([]);
    }

    return this.http.get<FavoritoIdsResponse>(`${this.API_URL}/ids`).pipe(
      map((res) => res?.producto_ids || []),
      tap((ids) => this.favoriteIdsSignal.set(new Set(ids))),
      catchError(() => {
        this.favoriteIdsSignal.set(new Set());
        return of([]);
      })
    );
  }

  getFavorites(skip: number = 0, limit: number = 100): Observable<ProductoFavorito[]> {
    this.loadingSignal.set(true);
    return this.http.get<ProductoFavorito[]>(`${this.API_URL}/`, {
      params: { skip: skip.toString(), limit: limit.toString() }
    }).pipe(
      tap((favoritos) => {
        const lista = favoritos || [];
        this.favoritesSignal.set(lista);
        this.favoriteIdsSignal.set(new Set(lista.map(f => f.producto_id)));
        this.loadingSignal.set(false);
      }),
      catchError((err) => {
        this.loadingSignal.set(false);
        const msg = typeof err?.error?.detail === 'string'
          ? err.error.detail
          : 'No se pudo cargar tu lista de favoritos.';
        this.toast.error(msg);
        return of([]);
      })
    );
  }

  moveToCart(
    productoId: number,
    varianteProductoId: number,
    cantidad: number = 1,
    quitarDeFavoritos: boolean = false
  ): Observable<MoverFavoritoCarritoResponse> {
    const body: MoverFavoritoCarritoDto = {
      variante_producto_id: varianteProductoId,
      cantidad,
      quitar_de_favoritos: quitarDeFavoritos
    };

    return this.http.post<MoverFavoritoCarritoResponse>(`${this.API_URL}/${productoId}/mover-al-carrito`, body).pipe(
      tap(() => {
        this.toast.success('Producto movido al carrito exitosamente');
        if (quitarDeFavoritos) {
          this.aplicarEstadoLocal(productoId, false);
          this.favoritesSignal.update(list => list.filter(f => f.producto_id !== productoId));
        }
      }),
      catchError((err) => {
        const msg = typeof err?.error?.detail === 'string'
          ? err.error.detail
          : 'No se pudo mover el producto al carrito.';
        this.toast.error(msg);
        return throwError(() => err);
      })
    );
  }

  /** Ejecuta la acción de favorito pendiente registrada antes de iniciar sesión (excepción 1 del CU25). */
  procesarAccionPendiente(): void {
    const pendiente = this.obtenerAccionPendiente();
    if (pendiente === null) return;

    try {
      localStorage.removeItem(PENDING_FAVORITE_KEY);
    } catch {
      // localStorage no disponible
    }

    if (this.isFavorite(pendiente)) return;

    this.agregar(pendiente).subscribe({
      next: () => this.toast.success('Producto agregado a tus favoritos'),
      error: () => { /* Silencioso: el usuario puede repetir la acción manualmente */ }
    });
  }

  private registrarAccionPendiente(productoId: number): void {
    try {
      localStorage.setItem(PENDING_FAVORITE_KEY, productoId.toString());
    } catch {
      // localStorage no disponible (modo privado): se ignora
    }
  }

  private obtenerAccionPendiente(): number | null {
    try {
      const raw = localStorage.getItem(PENDING_FAVORITE_KEY);
      if (!raw) return null;
      const id = Number(raw);
      return Number.isFinite(id) && id > 0 ? id : null;
    } catch {
      return null;
    }
  }

  private aplicarEstadoLocal(productoId: number, esFavorito: boolean): void {
    this.favoriteIdsSignal.update(actual => {
      const copia = new Set(actual);
      if (esFavorito) copia.add(productoId);
      else copia.delete(productoId);
      return copia;
    });
  }
}
