import { Injectable, inject } from '@angular/core';
import { ComprobanteLocal } from '../models/offline.model';
import { IndexedDbService } from './indexed-db.service';
import { DeviceService } from './device.service';
import { StorageService } from '../services/storage.service';

export interface DatosComprobanteLocal {
  tipo: ComprobanteLocal['tipo'];
  total: number;
  moneda?: string;
  sucursalId?: number | null;
  clienteId?: number | null;
  detalle: string[];
  leyenda?: string;
  numeroTemporal?: string;
}

/**
 * [EXAMEN-2] CU06/CU07/CU13: comprobantes temporales y notas de devolución.
 * Se generan localmente y se reemplazan cuando la operación sincroniza.
 */
@Injectable({ providedIn: 'root' })
export class OfflineDocumentService {
  private indexedDb = inject(IndexedDbService);
  private device = inject(DeviceService);
  private storage = inject(StorageService);

  async generarComprobanteTemporal(datos: DatosComprobanteLocal): Promise<ComprobanteLocal> {
    const comprobante: ComprobanteLocal = {
      uuid_offline: this.generarUuid(),
      tenant_id: this.storage.getTenantActivo<{ id: number }>()?.id ?? 0,
      dispositivo_id: this.device.obtenerDispositivoId(),
      tipo: datos.tipo,
      numero_temporal: datos.numeroTemporal ?? this.numeroTemporal(datos.tipo),
      es_temporal: true,
      reemplazado_por: null,
      total: this.redondear(datos.total),
      moneda: datos.moneda ?? 'BOB',
      sucursal_id: datos.sucursalId ?? this.sucursalActual(),
      cliente_id: datos.clienteId ?? null,
      detalle: datos.detalle,
      leyenda: datos.leyenda ?? this.leyendaPorTipo(datos.tipo),
      created_at: new Date().toISOString()
    };

    await this.indexedDb.guardar('comprobantes', comprobante);
    return comprobante;
  }

  async generarNotaDevolucion(datos: Omit<DatosComprobanteLocal, 'tipo' | 'leyenda'> & { leyenda?: string }): Promise<ComprobanteLocal> {
    return this.generarComprobanteTemporal({
      ...datos,
      tipo: 'DEVOLUCION',
      leyenda: datos.leyenda ?? 'Nota de devolución/cambio generada localmente. Válida al sincronizar.'
    });
  }

  /** [EXAMEN-2] CU18: nota de reposición temporal. */
  async generarNotaReposicion(datos: Omit<DatosComprobanteLocal, 'tipo' | 'leyenda'> & { leyenda?: string }): Promise<ComprobanteLocal> {
    return this.generarComprobanteTemporal({ ...datos, tipo: 'REPOSICION', leyenda: datos.leyenda ?? 'Nota de reposición generada localmente. Válida al sincronizar.' });
  }

  /** Envía el comprobante a la ticketera del POS mediante el diálogo del navegador. */
  imprimir(comprobante: ComprobanteLocal): boolean {
    if (typeof window === 'undefined') return false;
    const ventana = window.open('', '_blank', 'width=420,height=640');
    if (!ventana) return false;
    ventana.document.write(this.htmlComprobante(comprobante));
    ventana.document.close();
    ventana.focus();
    ventana.print();
    return true;
  }

  /** Descarga el comprobante como archivo de texto legible. */
  descargar(comprobante: ComprobanteLocal): boolean {
    if (typeof document === 'undefined') return false;
    const contenido = this.textoComprobante(comprobante);
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `${comprobante.numero_temporal}.txt`;
    enlace.click();
    URL.revokeObjectURL(url);
    return true;
  }

  async marcarReemplazado(uuidOffline: string, reemplazo?: string | null): Promise<ComprobanteLocal | null> {
    const comprobante = await this.indexedDb.obtener<ComprobanteLocal>('comprobantes', uuidOffline);
    if (!comprobante) return null;
    const actualizado: ComprobanteLocal = {
      ...comprobante,
      es_temporal: false,
      reemplazado_por: reemplazo ?? 'DEFINITIVO'
    };
    await this.indexedDb.guardar('comprobantes', actualizado);
    return actualizado;
  }

  async listarTemporales(): Promise<ComprobanteLocal[]> {
    const comprobantes = await this.indexedDb.obtenerTodos<ComprobanteLocal>('comprobantes');
    const tenantId = this.storage.getTenantActivo<{ id: number }>()?.id;
    return comprobantes
      .filter((comprobante) => comprobante.es_temporal
        && (tenantId == null || comprobante.tenant_id === tenantId))
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  }

  htmlComprobante(comprobante: ComprobanteLocal): string {
    const lineas = comprobante.detalle.map((linea) => `<li>${this.escapar(linea)}</li>`).join('');
    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${this.escapar(comprobante.numero_temporal)}</title>
  <style>
    body { font-family: 'Courier New', monospace; font-size: 12px; width: 300px; margin: 0 auto; }
    h1 { font-size: 15px; text-align: center; }
    ul { padding-left: 16px; }
    .total { font-size: 14px; font-weight: bold; text-align: right; }
    .leyenda { margin-top: 10px; font-size: 11px; text-align: center; }
  </style>
</head>
<body>
  <h1>FashionStore</h1>
  <p>Comprobante: ${this.escapar(comprobante.numero_temporal)}</p>
  <p>Tipo: ${this.escapar(comprobante.tipo)}</p>
  <p>Fecha: ${this.escapar(comprobante.created_at)}</p>
  <ul>${lineas}</ul>
  <p class="total">Total: ${comprobante.moneda} ${comprobante.total.toFixed(2)}</p>
  <p class="leyenda">${this.escapar(comprobante.leyenda)}</p>
</body>
</html>`;
  }

  textoComprobante(comprobante: ComprobanteLocal): string {
    return [
      'FashionStore',
      `Comprobante: ${comprobante.numero_temporal}`,
      `Tipo: ${comprobante.tipo}`,
      `Fecha: ${comprobante.created_at}`,
      ...comprobante.detalle,
      `Total: ${comprobante.moneda} ${comprobante.total.toFixed(2)}`,
      comprobante.leyenda
    ].join('\n');
  }

  private leyendaPorTipo(tipo: ComprobanteLocal['tipo']): string {
    switch (tipo) {
      case 'RESERVA':
        return 'Reserva registrada localmente. Se confirmará al sincronizar con el servidor.';
      case 'VENTA_CONTADO':
        return 'Venta offline registrada localmente. Comprobante temporal; se reemplazará al sincronizar.';
      case 'ORDEN_PAGO_DIFERIDO':
        return 'Pedido guardado localmente con pago diferido pendiente de confirmación.';
      case 'DEVOLUCION':
        return 'Nota de devolución/cambio generada localmente.';
      case 'REPOSICION':
        return 'Nota de reposición generada localmente.';
      default:
        return 'Documento temporal generado sin conexión.';
    }
  }

  private numeroTemporal(tipo: ComprobanteLocal['tipo']): string {
    const prefijo = tipo === 'RESERVA' ? 'RES'
      : tipo === 'VENTA_CONTADO' ? 'VTA'
        : tipo === 'ORDEN_PAGO_DIFERIDO' ? 'ORD'
          : tipo === 'DEVOLUCION' ? 'DEV'
            : 'REP';
    const fecha = new Date();
    const sello = `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}`
      + `${String(fecha.getDate()).padStart(2, '0')}`;
    const aleatorio = Math.floor(Math.random() * 10_000).toString().padStart(4, '0');
    return `${prefijo}-${sello}-${aleatorio}`;
  }

  private generarUuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (caracter) => {
      const aleatorio = Math.floor(Math.random() * 16);
      const valor = caracter === 'x' ? aleatorio : (aleatorio & 0x3) | 0x8;
      return valor.toString(16);
    });
  }

  private redondear(valor: number): number {
    return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
  }

  private sucursalActual(): number | null {
    return this.storage.getUser<{ sucursal_id?: number | null }>()?.sucursal_id ?? null;
  }

  private escapar(valor: string): string {
    return String(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
