import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { VentaPresencial, VentaPresencialCreate } from '../models/cart.model';
import { ClientProfile } from '../models/user.model';
import { ComprobanteLocal, ProductoOffline } from '../models/offline.model';
import { OfflineCatalogService } from '../offline/offline-catalog.service';
import { OfflineDocumentService } from '../offline/offline-document.service';

export interface ValidacionStockLocal {
  suficiente: boolean;
  disponible: number | null;
  mensaje: string;
}

@Injectable({
  providedIn: 'root'
})
export class PosService {
  private http = inject(HttpClient);
  private catalog = inject(OfflineCatalogService);
  private documents = inject(OfflineDocumentService);
  private readonly API_URL = `${environment.apiUrl}/ventas-presenciales`;
  private readonly CLIENTES_URL = `${environment.apiUrl}/clientes`;
  private readonly ORDENES_URL = `${environment.apiUrl}/ordenes`;

  createInPersonSale(data: VentaPresencialCreate): Observable<VentaPresencial> {
    return this.http.post<VentaPresencial>(`${this.API_URL}/`, data);
  }

  getInPersonSales(
    skip: number = 0, 
    limit: number = 50, 
    sucursalId?: number, 
    cajeroId?: number
  ): Observable<VentaPresencial[]> {
    let params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());
    
    if (sucursalId) {
      params = params.set('sucursal_id', sucursalId.toString());
    }
    if (cajeroId) {
      params = params.set('cajero_id', cajeroId.toString());
    }
    
    return this.http.get<VentaPresencial[]>(`${this.API_URL}/`, { params });
  }

  getInPersonSaleById(id: number): Observable<VentaPresencial> {
    return this.http.get<VentaPresencial>(`${this.API_URL}/${id}`);
  }

  searchClients(query: string): Observable<ClientProfile[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<ClientProfile[]>(`${this.CLIENTES_URL}/buscar`, { params });
  }

  getClientByNit(nitCi: string): Observable<ClientProfile> {
    return this.http.get<ClientProfile>(`${this.CLIENTES_URL}/por-nit/${encodeURIComponent(nitCi)}`);
  }

  getSalePdfUrl(saleId: number): string {
    return `${this.API_URL}/${saleId}/comprobante/pdf`;
  }

  getOrderPdfUrl(orderId: number): string {
    return `${this.ORDENES_URL}/${orderId}/comprobante/pdf`;
  }

  // ============================================================
  // [EXAMEN-2] CU07: POS offline
  // ============================================================

  /** Cambio a devolver; nunca negativo. */
  calcularCambio(montoRecibido: number | string, total: number | string): number {
    const recibido = Number(montoRecibido);
    const importe = Number(total);
    if (!Number.isFinite(recibido) || !Number.isFinite(importe)) return 0;
    return this.redondear(Math.max(0, recibido - importe));
  }

  /** Búsqueda en el catálogo descargado, sin red. */
  buscarProductoLocal(termino: string, limite = 20): Promise<ProductoOffline[]> {
    return this.catalog.buscarLocal(termino, { limite });
  }

  /** Valida contra el stock conocido localmente antes de vender. */
  async validarStockLocal(
    varianteId: number,
    cantidad: number,
    sucursalId?: number | null
  ): Promise<ValidacionStockLocal> {
    const stock = await this.catalog.stockLocal(varianteId, sucursalId);
    if (!stock) {
      return {
        suficiente: true,
        disponible: null,
        mensaje: 'No hay stock local descargado para esta variante; la venta se enviará y puede quedar en conflicto.'
      };
    }
    const suficiente = stock.cantidad_disponible >= cantidad;
    return {
      suficiente,
      disponible: stock.cantidad_disponible,
      mensaje: suficiente
        ? `Stock local disponible: ${stock.cantidad_disponible}.`
        : `Stock local insuficiente: hay ${stock.cantidad_disponible} y se intentan ${cantidad}.`
    };
  }

  /** Comprobante temporal de venta offline con la leyenda de sincronización. */
  async generarComprobanteTemporal(
    datos: VentaPresencialCreate,
    total: number,
    moneda = 'BOB',
    detalle: string[] = []
  ): Promise<ComprobanteLocal> {
    return this.documents.generarComprobanteTemporal({
      tipo: 'VENTA_CONTADO',
      total,
      moneda,
      sucursalId: datos.sucursal_id,
      clienteId: datos.cliente_id ?? null,
      detalle: detalle.length > 0
        ? detalle
        : datos.detalles.map((linea) =>
            `${linea.cantidad} x variante ${linea.variante_producto_id} — ${moneda} ${Number(linea.precio_unitario ?? 0).toFixed(2)}`
          ),
      leyenda: 'Venta offline registrada localmente. Comprobante temporal; se reemplazará al sincronizar.'
    });
  }

  // ===== [EXAMEN-2] CU13/CU18: devolución y reposición POS =====
  calcularDiferencia(precioDevuelto: number, precioNuevo: number): { diferencia_precio: number; tipo_diferencia: string; monto_pagado_diferencia: number; saldo_favor: number } {
    const diff = this.redondear(Number(precioNuevo) - Number(precioDevuelto));
    if (diff > 0) return { diferencia_precio: diff, tipo_diferencia: 'COBRO', monto_pagado_diferencia: diff, saldo_favor: 0 };
    if (diff < 0) return { diferencia_precio: Math.abs(diff), tipo_diferencia: 'SALDO_FAVOR', monto_pagado_diferencia: 0, saldo_favor: Math.abs(diff) };
    return { diferencia_precio: 0, tipo_diferencia: 'SIN_DIFERENCIA', monto_pagado_diferencia: 0, saldo_favor: 0 };
  }
  buscarVentaPorComprobante(numeroComprobante: string): Observable<any> { return this.http.get<any>(`${environment.apiUrl}/devoluciones/venta/${encodeURIComponent(numeroComprobante)}`); }
  validarPlazoCambio(ordenId: number): Observable<{ valido: boolean; fecha_limite_cambio?: string; mensaje?: string }> { return this.http.get<{ valido: boolean; fecha_limite_cambio?: string; mensaje?: string }>(`${environment.apiUrl}/devoluciones/validar-plazo/${ordenId}`); }
  registrarDevolucion(dto: any): Observable<any> { return this.http.post<any>(`${environment.apiUrl}/devoluciones/cambio`, { ...dto, tipo: 'DEVOLUCION' }); }
  registrarReposicion(dto: any): Observable<any> { return this.http.post<any>(`${environment.apiUrl}/devoluciones/reposicion`, { ...dto, tipo: 'REPOSICION' }); }

  private redondear(valor: number): number {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }
}
