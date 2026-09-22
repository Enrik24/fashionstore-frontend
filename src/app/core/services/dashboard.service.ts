import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ChartConfiguration } from 'chart.js';
import { ReportsService } from './reports.service';
import { InventoryApiService } from './inventory-api.service';
import { BranchApiService } from './branch-api.service';
import { CatalogApiService } from './catalog-api.service';
import { DashboardFilters, KpiConfig, KpiTone, WidgetStatus } from '../models/dashboard.model';
import { ReporteVentas, ReporteVentasComparativo } from '../models/report.model';
import { CHART_COLORS, CHART_PALETTE, BASE_CHART_OPTIONS } from '../../shared/config/chart-theme';

export interface DashboardVm {
  kpiCards: KpiConfig[];
  comparativa: ChartConfiguration<'bar'>;
  topProductos: ChartConfiguration<'bar'>;
  mixCanal: ChartConfiguration<'doughnut'>;
  metodosPago: ChartConfiguration<'doughnut'> | null;
  reservasPorEstado: ChartConfiguration<'bar'>;
  stockCritico: ChartConfiguration<'bar'>;
  estado: Record<string, WidgetStatus>;
  score: { valor: number; tono: KpiTone; etiqueta: string } | null;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private reports = inject(ReportsService);
  private inventoryApi = inject(InventoryApiService);
  private branchApi = inject(BranchApiService);
  private catalogApi = inject(CatalogApiService);

  getDashboardBundle(f: DashboardFilters): Observable<DashboardVm> {
    return forkJoin({
      kpis: this.reports.getKpiDashboard().pipe(catchError(() => of(null))),
      ventas: this.reports.getSalesReport(f.fechaInicio, f.fechaFin, f.sucursalId).pipe(catchError(() => of(null))),
      comparativo: f.comparar
        ? this.reports.getSalesReportComparativo(f.fechaInicio, f.fechaFin, f.sucursalId).pipe(catchError(() => of(null)))
        : of(null),
      inventario: this.reports.getInventoryReport(f.sucursalId).pipe(catchError(() => of(null))),
      reservas: this.reports.getReservationsReport(f.fechaInicio, f.fechaFin, f.sucursalId).pipe(catchError(() => of(null))),
      clientes: this.reports.getClientsReport().pipe(catchError(() => of(null))),
      financiero: this.reports.getFinancialReport(f.fechaInicio, f.fechaFin).pipe(catchError(() => of(null))),
      sucursales: this.branchApi.getBranches(0, 500).pipe(catchError(() => of([]))),
      productos: this.catalogApi.getProducts(0, 1000).pipe(catchError(() => of([]))),
      alerts: this.inventoryApi.getStockAlerts().pipe(catchError(() => of([])))
    }).pipe(map(raw => this.buildViewModel(raw as any, f)));
  }

  buildViewModel(raw: any, f: DashboardFilters): DashboardVm {
    const estado: Record<string, WidgetStatus> = {};
    const mark = (k: string, v: any, isEmpty?: (x: any) => boolean) => {
      estado[k] = v === null || v === undefined ? 'error' : (isEmpty?.(v) ? 'empty' : 'success');
    };
    mark('kpis', raw.kpis);
    mark('ventas', raw.ventas, v => !v?.resumen || v.resumen.total_recaudado === 0);
    mark('inventario', raw.inventario);
    mark('reservas', raw.reservas);
    mark('clientes', raw.clientes);

    const bs = (n: number) => `Bs. ${Number(n || 0).toFixed(2)}`;
    const kpis: KpiConfig[] = [];
    const ventas = raw.ventas as ReporteVentas | null;
    const cmp = raw.comparativo as ReporteVentasComparativo | null;
    const d = (v: number | undefined) => (v === undefined || v === null ? null : v);

    kpis.push({ id: 'K01', label: 'Ventas del período', value: ventas?.resumen.total_recaudado ?? 0,
      formattedValue: bs(ventas?.resumen.total_recaudado ?? 0), icon: 'ri-wallet-3-line', tone: 'success',
      deltaPct: cmp ? d(cmp.deltaPct.total_recaudado) : null, subtext: `${f.fechaInicio} → ${f.fechaFin}` });
    kpis.push({ id: 'K02', label: 'Pedidos del período',
      value: (ventas?.resumen.cantidad_pedidos_online ?? 0) + (ventas?.resumen.cantidad_ventas_presenciales ?? 0),
      formattedValue: String((ventas?.resumen.cantidad_pedidos_online ?? 0) + (ventas?.resumen.cantidad_ventas_presenciales ?? 0)),
      icon: 'ri-shopping-cart-line', tone: 'info' });
    kpis.push({ id: 'K03', label: 'Ticket promedio', value: ventas?.resumen.ticket_promedio ?? 0,
      formattedValue: bs(ventas?.resumen.ticket_promedio ?? 0), icon: 'ri-ticket-line', tone: 'default' });
    const tot = (ventas?.resumen.total_online ?? 0) + (ventas?.resumen.total_presencial ?? 0);
    const pctOn = tot ? Math.round((ventas!.resumen.total_online / tot) * 100) : 0;
    kpis.push({ id: 'K05', label: 'Canal online', value: pctOn, formattedValue: `${pctOn}%`,
      icon: 'ri-global-line', tone: 'info', subtext: `Presencial ${tot ? 100 - pctOn : 0}%` });
    kpis.push({ id: 'K06', label: 'Conversión reservas', value: raw.reservas?.tasa_conversion_recogida_pct ?? 0,
      formattedValue: `${Number(raw.reservas?.tasa_conversion_recogida_pct ?? 0).toFixed(1)}%`,
      icon: 'ri-calendar-check-line', tone: 'success' });
    kpis.push({ id: 'K09', label: 'Clientes registrados', value: raw.clientes?.total_clientes_registrados ?? 0,
      formattedValue: String(raw.clientes?.total_clientes_registrados ?? 0), icon: 'ri-user-star-line', tone: 'info',
      subtext: `${raw.clientes?.clientes_activos_con_compras ?? 0} activos` });
    kpis.push({ id: 'K11', label: 'Ítems bajo stock', value: raw.inventario?.items_con_bajo_stock ?? 0,
      formattedValue: String(raw.inventario?.items_con_bajo_stock ?? 0), icon: 'ri-alarm-warning-line',
      tone: (raw.inventario?.items_con_bajo_stock ?? 0) > 0 ? 'error' : 'success', route: '/admin/inventory',
      subtext: 'Ver en Inventario (campana)' });
    kpis.push({ id: 'K12', label: 'Unidades disponibles', value: raw.inventario?.total_unidades_disponibles ?? 0,
      formattedValue: String(raw.inventario?.total_unidades_disponibles ?? 0), icon: 'ri-archive-line', tone: 'default' });
    kpis.push({ id: 'K18', label: 'Sucursales activas', value: (raw.sucursales ?? []).length,
      formattedValue: String((raw.sucursales ?? []).length), icon: 'ri-store-3-line', tone: 'success' });
    kpis.push({ id: 'K19', label: 'Prendas en catálogo', value: (raw.productos ?? []).length,
      formattedValue: String((raw.productos ?? []).length), icon: 'ri-t-shirt-2-line', tone: 'default' });
    if (raw.financiero) {
      const hasReal = raw.financiero.beneficio_real !== undefined && raw.financiero.beneficio_real !== null;
      const val = hasReal ? raw.financiero.beneficio_real : raw.financiero.beneficio_estimado_margen_40pct;
      const margen = raw.financiero.margen_real_pct;
      kpis.push({ id: 'K15', label: hasReal ? 'Beneficio real' : 'Beneficio estimado 40%', value: val,
        formattedValue: bs(val), icon: 'ri-bank-card-line',
        tone: margen !== undefined && margen !== null ? (margen >= 30 ? 'success' : margen >= 15 ? 'warning' : 'error') : 'success',
        subtext: hasReal ? `Costo ${bs(raw.financiero.costo_total_bienes ?? 0)} · Margen ${Number(margen ?? 0).toFixed(1)}%` : 'Sin costos cargados (40% fijo)' });
    }

    return {
      kpiCards: kpis,
      comparativa: this.comparativaPeriodosChart(cmp, ventas),
      topProductos: this.topProductosChart(ventas),
      mixCanal: this.doughnutChart(['Online', 'Presencial'],
        [ventas?.resumen.total_online ?? 0, ventas?.resumen.total_presencial ?? 0]),
      metodosPago: raw.financiero?.desglose_por_metodo_pago
        ? this.doughnutChart(Object.keys(raw.financiero.desglose_por_metodo_pago), Object.values(raw.financiero.desglose_por_metodo_pago) as number[])
        : null,
      reservasPorEstado: this.reservasChart(raw.reservas),
      stockCritico: this.stockCriticoChart(raw.alerts ?? []),
      estado,
      score: this.score(raw)
    };
  }

  topProductosChart(ventas: ReporteVentas | null): ChartConfiguration<'bar'> {
    const top = (ventas?.top_productos ?? []).slice(0, 10);
    return { type: 'bar',
      data: { labels: top.map(t => t.nombre),
        datasets: [{ label: 'Unidades vendidas', data: top.map(t => t.unidades_vendidas),
          backgroundColor: CHART_COLORS.accent, borderRadius: 6, maxBarThickness: 22 }] },
      options: { ...BASE_CHART_OPTIONS, indexAxis: 'y',
        plugins: { ...BASE_CHART_OPTIONS.plugins, legend: { display: false } } } };
  }

  doughnutChart(labels: string[], values: number[]): ChartConfiguration<'doughnut'> {
    return { type: 'doughnut',
      data: { labels, datasets: [{ data: values, backgroundColor: CHART_PALETTE, borderWidth: 0, hoverOffset: 6 }] },
      options: { ...BASE_CHART_OPTIONS, cutout: '62%' } };
  }

  reservasChart(reservas: any): ChartConfiguration<'bar'> {
    const entries = Object.entries(reservas?.desglose_estados ?? {}) as [string, number][];
    return { type: 'bar',
      data: { labels: entries.map(e => e[0]),
        datasets: [{ label: 'Reservas', data: entries.map(e => e[1]), backgroundColor: CHART_COLORS.info, borderRadius: 6 }] },
      options: { ...BASE_CHART_OPTIONS, plugins: { ...BASE_CHART_OPTIONS.plugins, legend: { display: false } } } };
  }

  stockCriticoChart(alerts: any[]): ChartConfiguration<'bar'> {
    const top = [...(alerts ?? [])].sort((a, b) => (a.cantidad ?? 0) - (b.cantidad ?? 0)).slice(0, 10);
    return { type: 'bar',
      data: { labels: top.map(a => a.variante_producto?.producto?.nombre ?? `Variante #${a.variante_producto_id}`),
        datasets: [
          { label: 'Stock actual', data: top.map(a => a.cantidad ?? 0), backgroundColor: CHART_COLORS.error, borderRadius: 4 },
          { label: 'Stock mínimo', data: top.map(a => a.stock_minimo ?? 0), backgroundColor: CHART_COLORS.neutral, borderRadius: 4 }
        ] },
      options: { ...BASE_CHART_OPTIONS, indexAxis: 'y' } };
  }

  comparativaPeriodosChart(cmp: ReporteVentasComparativo | null, ventas: ReporteVentas | null): ChartConfiguration<'bar'> {
    const cur = cmp?.actual?.resumen ?? ventas?.resumen;
    const prev = cmp?.anterior?.resumen;
    return { type: 'bar',
      data: { labels: ['Recaudado', 'Pedidos online', 'Ventas presenciales', 'Ticket'],
        datasets: [
          { label: 'Actual', data: cur ? [cur.total_recaudado, cur.cantidad_pedidos_online, cur.cantidad_ventas_presenciales, cur.ticket_promedio] : [],
            backgroundColor: CHART_COLORS.accent, borderRadius: 6 },
          { label: 'Anterior', data: prev ? [prev.total_recaudado, prev.cantidad_pedidos_online, prev.cantidad_ventas_presenciales, prev.ticket_promedio] : [],
            backgroundColor: CHART_COLORS.neutral, borderRadius: 6 }
        ] },
      options: { ...BASE_CHART_OPTIONS, scales: { y: { beginAtZero: true } } } };
  }

  serieDiariaChart(ventas: ReporteVentas | null): ChartConfiguration<'line'> | null {
    if (!ventas?.serie_diaria?.length) return null;
    return { type: 'line',
      data: { labels: ventas.serie_diaria.map(p => p.fecha),
        datasets: [
          { label: 'Total', data: ventas.serie_diaria.map(p => p.total), borderColor: CHART_COLORS.accent, backgroundColor: CHART_COLORS.accent + '22', fill: true, tension: 0.4, pointRadius: 0 },
          { label: 'Online', data: ventas.serie_diaria.map(p => p.online), borderColor: CHART_COLORS.info, tension: 0.4, pointRadius: 0 },
          { label: 'Presencial', data: ventas.serie_diaria.map(p => p.presencial), borderColor: CHART_COLORS.success, tension: 0.4, pointRadius: 0 }
        ] },
      options: { ...BASE_CHART_OPTIONS } };
  }

  calcularRunRate(ventasMes: number, diasTranscurridos: number, diasDelMes: number): number {
    if (!diasTranscurridos) return 0;
    return (ventasMes / diasTranscurridos) * diasDelMes;
  }

  score(raw: any): { valor: number; tono: KpiTone; etiqueta: string } | null {
    const parts: { v: number; w: number }[] = [];
    const cmpDelta: number | null = raw?.comparativo?.deltaPct?.total_recaudado ?? null;
    if (cmpDelta !== null && cmpDelta !== undefined) parts.push({ v: Math.max(0, Math.min(100, 50 + cmpDelta)), w: 40 });
    if (raw?.reservas?.tasa_conversion_recogida_pct !== null && raw?.reservas?.tasa_conversion_recogida_pct !== undefined)
      parts.push({ v: Number(raw.reservas.tasa_conversion_recogida_pct), w: 25 });
    if (raw?.inventario) {
      const tot = raw.inventario.total_items_registrados || 0;
      const bajo = raw.inventario.items_con_bajo_stock || 0;
      if (tot) parts.push({ v: ((tot - bajo) / tot) * 100, w: 20 });
    }
    if (raw?.clientes?.total_clientes_registrados) {
      parts.push({ v: (raw.clientes.clientes_activos_con_compras / raw.clientes.total_clientes_registrados) * 100, w: 15 });
    }
    if (!parts.length) return null;
    const wSum = parts.reduce((a, p) => a + p.w, 0);
    const valor = Math.round(parts.reduce((a, p) => a + p.v * (p.w / wSum), 0));
    return { valor, tono: valor >= 80 ? 'success' : valor >= 60 ? 'warning' : 'error',
             etiqueta: valor >= 80 ? 'Excelente' : valor >= 60 ? 'Aceptable' : 'Requiere atención' };
  }
}
