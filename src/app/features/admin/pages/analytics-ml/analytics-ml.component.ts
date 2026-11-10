import { Component, OnDestroy, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AnaliticaApiService } from '../../../../core/services/analitica-api.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PlanFeatureLockComponent } from '../../../../shared/components/plan-feature-lock/plan-feature-lock.component';
import { environment } from '../../../../../environments/environment';
import {
  DashboardAnalitico,
  DatasetSintetico,
  ModeloMachineLearning,
  PrediccionVentas,
  SegmentoClientes,
  Anomalia,
} from '../../../../core/models/analitica.model';
import { Sucursal } from '../../../../core/models/branch.model';

/**
 * [EXAMEN-2] CU12: dashboard analítico + ML.
 */
@Component({
  selector: 'app-analytics-ml',
  standalone: true,
  imports: [CommonModule, FormsModule, PlanFeatureLockComponent],
  templateUrl: './analytics-ml.component.html',
  styleUrls: ['./analytics-ml.component.scss'],
})
export class AnalyticsMlComponent implements OnInit, OnDestroy {
  private api = inject(AnaliticaApiService);
  private branchApi = inject(BranchApiService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  sucursalId: number | null = null;
  periodo = 'MES';
  datos = signal<DashboardAnalitico | null>(null);
  sucursales = signal<Sucursal[]>([]);
  modelos = signal<ModeloMachineLearning[]>([]);
  prediccion = signal<PrediccionVentas | null>(null);
  segmentos = signal<SegmentoClientes[]>([]);
  anomaliasList = signal<Anomalia[]>([]);
  datasets = signal<DatasetSintetico[]>([]);
  cargando = signal(true);
  error = signal('');
  accion = signal<'entrenar' | 'predecir' | 'segmentar' | 'anomalias' | 'dataset' | null>(null);
  modeloSeleccionadoId: number | null = null;
  detalle = signal<Record<string, any> | null>(null);
  detalleClave = signal<string | null>(null);
  detalleCargando = signal(false);
  ultimaActualizacion = signal<Date | null>(null);
  /** Intervalo de actualización automática (CU12, paso 7): 5 minutos. */
  readonly autoRefreshMs = Math.max(30, Number(environment.analiticaCacheTtlSeg ?? 300)) * 1000;
  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    // CU12: seleccionar automáticamente el primer modelo SUPERVISADO disponible.
    this.cargar();
    this.cargarModelos();
    this.cargarDatasets();
    this.branchApi.getBranches(0, 100).subscribe({
      next: (x) => this.sucursales.set(Array.isArray(x) ? x : []),
      error: () => this.toast.error('No se pudieron cargar las sucursales.'),
    });
    this.iniciarAutoRefresh();
    this.destroyRef.onDestroy(() => this.detenerAutoRefresh());
  }

  ngOnDestroy(): void {
    this.detenerAutoRefresh();
  }

  private iniciarAutoRefresh(): void {
    this.detenerAutoRefresh();
    if (!this.autoRefreshMs) return;
    this.timer = setInterval(() => {
      if (document.hidden || this.cargando()) return;
      this.cargar(true);
    }, this.autoRefreshMs);
  }

  private detenerAutoRefresh(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  cargar(silenciosa = false): void {
    if (!silenciosa) this.cargando.set(true);
    this.error.set('');
    this.api.obtenerDashboard({ sucursal_id: this.sucursalId, periodo: this.periodo }).subscribe({
      next: (x) => {
        this.datos.set(x);
        this.ultimaActualizacion.set(new Date());
        this.cargando.set(false);
      },
      error: () => {
        // Flujo offline (CU12): al fallar la red mostrar el último conocido.
        if (typeof (this.api as any).ultimoConocido === 'function') {
          (this.api as any).ultimoConocido({ sucursal_id: this.sucursalId, periodo: this.periodo }).subscribe({
            next: (x: DashboardAnalitico) => {
              this.datos.set({ ...x, desactualizado: true });
              this.cargando.set(false);
              this.error.set('Sin conexión: se muestran los últimos datos conocidos.');
            },
            error: () => {
              this.datos.set(null);
              this.cargando.set(false);
              this.error.set('No se pudo cargar el dashboard analítico. Intenta nuevamente.');
            },
          });
        } else {
          this.datos.set(null);
          this.cargando.set(false);
          this.error.set('No se pudo cargar el dashboard analítico. Intenta nuevamente.');
        }
      },
    });
  }

  cargarModelos(): void {
    this.api.listarModelos().subscribe({
      next: (x) => {
        this.modelos.set(x);
        if (!this.modeloSeleccionadoId) {
          this.modeloSeleccionadoId = this.modelosPredictivosDe(x)[0]?.id ?? null;
        }
      },
      error: () => this.toast.error('No se pudieron cargar los modelos de machine learning.'),
    });
  }

  /**
   * Solo los modelos SUPERVISADOS activos sirven para predecir ventas.
   * El backend guarda `estado='ACTIVO'` (no 'ENTRENADO'); los no
   * supervisados (KMeans/IsolationForest) no tienen artefacto de pronóstico.
   */
  modelosPredictivosDe(lista: ModeloMachineLearning[] = this.modelos()): ModeloMachineLearning[] {
    return lista.filter(
      (modelo) =>
        modelo.tipo === 'SUPERVISADO' &&
        (modelo.estado === 'ACTIVO' || modelo.estado === 'ENTRENADO'),
    );
  }

  modelosPredictivos(): ModeloMachineLearning[] {
    return this.modelosPredictivosDe();
  }

  cargarDatasets(): void {
    this.api.listarDatasets().subscribe({
      next: (x) => this.datasets.set(x),
      error: () => this.toast.error('No se pudieron cargar los datasets sintéticos.'),
    });
  }

  widget<T>(clave: string): T | null {
    const widgets = this.datos()?.widgets;
    return (widgets?.[clave] as T | null) ?? null;
  }

  prendasRepuestas(): Array<{ producto: string; talla?: string | null; color?: string | null; unidades: number }> {
    const actuales = this.widget<Array<{ producto: string; talla?: string | null; color?: string | null; unidades: number }>>('prendas_repuestas');
    if (Array.isArray(actuales)) return actuales;
    const legado = this.datos()?.prendas_repuestas;
    return Array.isArray(legado) ? legado : [];
  }

  montoCompensaciones(): { monto_total?: number; monto_pendiente?: number; cantidad?: number } {
    const actual = this.widget<{ monto_total?: number; monto_pendiente?: number; cantidad?: number }>('monto_compensaciones');
    if (actual) return actual;
    const legado = this.datos()?.monto_compensaciones;
    return typeof legado === 'number' ? { monto_total: legado } : legado ?? {};
  }

  kpis(): Array<{ clave: string; nombre: string; valor: number | string; unidad?: string; tendencia?: number | null }> {
    if (this.datos()?.kpis?.length) return this.datos()!.kpis!.map((k) => ({ clave: (k as any).clave ?? k.nombre, ...k }));
    const widgets = this.datos()?.widgets as Record<string, any> | undefined;
    if (!widgets) return [];
    const resultado: Array<{ clave: string; nombre: string; valor: number | string; unidad?: string; tendencia?: number | null }> = [];
    const ventasDia = widgets['ventas_dia'];
    const ventasMes = widgets['ventas_mes'];
    const stockCritico = widgets['stock_critico'];
    const reservas = widgets['reservas_pendientes'];
    const devoluciones = widgets['tasa_devoluciones'];
    const reposiciones = widgets['tasa_reposiciones'];
    const ticket = widgets['ticket_promedio'];
    if (ventasDia) resultado.push({ clave: 'ventas_dia', nombre: 'Ventas de hoy', valor: ventasDia.total ?? 0, unidad: 'Bs.' });
    if (ventasMes) resultado.push({ clave: 'ventas_mes', nombre: 'Ventas del mes', valor: ventasMes.actual?.total ?? 0, unidad: 'Bs.', tendencia: ventasMes.variacion_pct });
    if (stockCritico) resultado.push({ clave: 'stock_critico', nombre: 'Stock crítico', valor: stockCritico.variantes ?? 0, unidad: 'variantes' });
    if (reservas) resultado.push({ clave: 'reservas_pendientes', nombre: 'Reservas pendientes', valor: reservas.reservas ?? 0, unidad: 'reservas' });
    if (devoluciones) resultado.push({ clave: 'tasa_devoluciones', nombre: 'Tasa de devoluciones', valor: devoluciones.tasa_pct ?? 0, unidad: '%' });
    if (reposiciones) resultado.push({ clave: 'tasa_reposiciones', nombre: 'Tasa de reposiciones', valor: reposiciones.tasa_pct ?? 0, unidad: '%' });
    if (ticket) resultado.push({ clave: 'ticket_promedio', nombre: 'Ticket promedio', valor: ticket.ticket_promedio ?? 0, unidad: 'Bs.' });
    return resultado;
  }

  tendencia(kpi: { tendencia?: number | null }): string {
    if (kpi.tendencia === null || kpi.tendencia === undefined) return 'Sin comparativo';
    return `${kpi.tendencia > 0 ? '+' : ''}${kpi.tendencia}% vs. período anterior`;
  }

  /** CU12, paso 6: drill-down al hacer clic en un KPI. */
  abrirDetalle(entrada: { clave?: string; nombre?: string } | string): void {
    const clave = typeof entrada === 'string' ? entrada : (entrada.clave ?? entrada.nombre ?? '');
    const mapa: Record<string, string> = {
      'Ventas de hoy': 'ventas_dia',
      'Ventas del mes': 'ventas_mes',
      'Stock crítico': 'stock_critico',
      'Reservas pendientes': 'reservas_pendientes',
      'Tasa de devoluciones': 'tasa_devoluciones',
      'Tasa de reposiciones': 'tasa_reposiciones',
      'Ticket promedio': 'ticket_promedio',
      'Prendas repuestas': 'prendas_repuestas',
      'Compensaciones': 'monto_compensaciones',
    };
    const claveApi = mapa[clave] ?? clave;
    if (!claveApi) return;
    this.detalleClave.set(claveApi);
    this.detalleCargando.set(true);
    this.api.detalleKpi(claveApi, { sucursal_id: this.sucursalId, periodo: this.periodo }).subscribe({
      next: (x) => {
        this.detalle.set(x as Record<string, any>);
        this.detalleCargando.set(false);
      },
      error: (error) => {
        this.detalleCargando.set(false);
        this.toast.error(this.errorMl(error, 'No se pudo cargar el detalle del indicador.'));
      },
    });
  }

  cerrarDetalle(): void {
    this.detalle.set(null);
    this.detalleClave.set(null);
  }

  entrenar(): void {
    if (this.accion()) return;
    this.accion.set('entrenar');
    this.api.entrenar({ objetivo: 'VENTAS' }).pipe(finalize(() => this.accion.set(null))).subscribe({
      next: () => {
        this.toast.success('El modelo de ventas fue entrenado correctamente.', 'Entrenamiento completado');
        this.cargarModelos();
      },
      error: (error) => this.toast.error(this.errorMl(error, 'No se pudo entrenar el modelo.')),
    });
  }

  predecir(): void {
    if (this.accion()) return;
    if (!this.modeloSeleccionadoId) {
      this.toast.warning('Entrena o selecciona un modelo antes de generar una predicción.');
      return;
    }
    this.accion.set('predecir');
    this.api.predecir({ modelo_id: this.modeloSeleccionadoId, horizonte: 7 }).pipe(finalize(() => this.accion.set(null))).subscribe({
      next: (x) => {
        this.prediccion.set(x);
        this.toast.success('La predicción de ventas se generó correctamente.');
      },
      error: (error) => this.toast.error(this.errorMl(error, 'No se pudo generar la predicción.')),
    });
  }

  segmentarCompat(): void {
    if (this.accion()) return;
    this.accion.set('segmentar');
    this.api.segmentar({ n_clusters: 4, persistir: true }).pipe(finalize(() => this.accion.set(null))).subscribe({
      next: (x) => {
        this.segmentos.set(Array.isArray(x) ? x : []);
        this.toast.success('La segmentación de clientes se completó.');
      },
      error: (error) => this.toast.error(this.errorMl(error, 'No se pudo segmentar a los clientes.')),
    });
  }

  anomalias(): void {
    if (this.accion()) return;
    this.accion.set('anomalias');
    this.api.anomalias({ periodo_dias: 90, persistir: true }).pipe(finalize(() => this.accion.set(null))).subscribe({
      next: (x) => {
        this.anomaliasList.set(Array.isArray(x) ? x : []);
        this.toast.success('El análisis de anomalías se completó.');
      },
      error: (error) => this.toast.error(this.errorMl(error, 'No se pudieron detectar anomalías.')),
    });
  }

  generar(): void {
    if (this.accion()) return;
    this.accion.set('dataset');
    this.api.generarDataset({ cantidad_clientes: 15, cantidad_ventas: 500, dias: 120, semilla: 2026 }).pipe(finalize(() => this.accion.set(null))).subscribe({
      next: (d) => {
        this.datasets.update((lista) => [d, ...lista]);
        this.toast.success('El dataset sintético fue generado.');
      },
      error: (error) => this.toast.error(this.errorMl(error, 'No se pudo generar el dataset.')),
    });
  }

  sembrar(d: DatasetSintetico): void {
    const id = d.dataset_id ?? d.id;
    if (!id || this.accion()) return;
    this.accion.set('dataset');
    this.api.sembrarDataset(id).pipe(finalize(() => this.accion.set(null))).subscribe({
      next: () => {
        this.datasets.update((lista) => lista.filter((item) => (item.dataset_id ?? item.id) !== id));
        this.toast.success('El dataset fue sembrado en el ambiente de pruebas.');
      },
      error: (error) => this.toast.error(this.errorMl(error, 'No se pudo sembrar el dataset.')),
    });
  }

  eliminar(d: DatasetSintetico): void {
    const id = d.dataset_id ?? d.id;
    if (!id || this.accion()) return;
    this.accion.set('dataset');
    this.api.eliminarDataset(id).pipe(finalize(() => this.accion.set(null))).subscribe({
      next: () => {
        this.datasets.update((lista) => lista.filter((item) => (item.dataset_id ?? item.id) !== id));
        this.toast.success('El dataset fue eliminado.');
      },
      error: (error) => this.toast.error(this.errorMl(error, 'No se pudo eliminar el dataset.')),
    });
  }

  silhouetteBajo(): boolean {
    return this.segmentos().some((s) => s.silhouette !== null && s.silhouette !== undefined && s.silhouette < 0.3);
  }

  private errorMl(error: { error?: { detail?: string }; detail?: string }, fallback: string): string {
    return error?.error?.detail ?? error?.detail ?? fallback;
  }
}
