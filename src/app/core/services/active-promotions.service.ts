import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environments/environment";
import { PromocionPublica } from "../models/promotion.model";

/**
 * Servicio singleton que carga las promociones publicas activas una sola vez
 * y las mantiene en memoria para que los ProductCard puedan consultarlas.
 */
@Injectable({ providedIn: "root" })
export class ActivePromotionsService {
  private http = inject(HttpClient);
  private readonly URL = `${environment.apiUrl}/public/promociones/activas`;

  private readonly _promociones = signal<PromocionPublica[]>([]);
  private loaded = false;

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.http.get<PromocionPublica[]>(this.URL).subscribe({
      next: (data) => this._promociones.set(data),
      error: () => this._promociones.set([])
    });
  }

  /** Lista reactiva de promociones activas ya cargadas (para banner). */
  promociones(): PromocionPublica[] {
    return this._promociones();
  }

  /** [EXAMEN-2] Promo destacada para el banner de campañas: la de mayor %. */
  getPromocionDestacada(): PromocionPublica | null {
    const candidatas = this._promociones()
      .filter(p => p.tipo === "PORCENTAJE" && (p.valor ?? 0) > 0)
      .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0));
    return candidatas[0] ?? null;
  }

  getDiscountForProduct(productoId: number, categoriaId?: number): number | null {
    const promociones = this._promociones();
    let maxDescuento: number | null = null;
    for (const promo of promociones) {
      if (promo.tipo !== "PORCENTAJE") continue;
      const valor = promo.valor ?? 0;
      if (valor <= 0) continue;
      const aplicaProducto = promo.producto_ids.includes(productoId);
      const aplicaCategoria = categoriaId != null && promo.categoria_ids.includes(categoriaId);
      if (aplicaProducto || aplicaCategoria) {
        if (maxDescuento === null || valor > maxDescuento) {
          maxDescuento = valor;
        }
      }
    }
    return maxDescuento;
  }

  has2x1(productoId: number, categoriaId?: number): boolean {
    return this._promociones().some(p => {
      if (p.tipo !== "DOS_POR_UNO") return false;
      return p.producto_ids.includes(productoId) ||
        (categoriaId != null && p.categoria_ids.includes(categoriaId));
    });
  }
}
