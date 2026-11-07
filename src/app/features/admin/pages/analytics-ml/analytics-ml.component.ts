import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnaliticaApiService } from '../../../../core/services/analitica-api.service';
import { PlanFeatureLockComponent } from '../../../../shared/components/plan-feature-lock/plan-feature-lock.component';
import { DashboardAnalitico, ModeloMachineLearning, PrediccionVentas, SegmentoClientes, Anomalia } from '../../../../core/models/analitica.model';

/**
 * [EXAMEN-2] CU12: dashboard analítico + ML.
 */
@Component({
  selector: 'app-analytics-ml',
  standalone: true,
  imports: [CommonModule, FormsModule, PlanFeatureLockComponent],
  template: `
    <section>
      <header><span class="eyebrow">CU12 · Analítica</span><h1>Dashboard analítico y ML</h1></header>
      <app-plan-feature-lock funcionalidad="reportes_ia" titulo="Analítica no incluida en tu plan">
        <div class="card filtros">
          <label>Sucursal <input type="number" [(ngModel)]="sucursalId" placeholder="Todas"></label>
          <button type="button" class="btn btn-accent btn-sm" (click)="cargar()">Filtrar</button>
          @if (datos()?.desde_cache) { <span>Datos cacheados el {{ datos()?.cacheado_en }}</span> }
        </div>
        @for (k of datos()?.kpis ?? []; track k.nombre) { <div class="card kpi"><span>{{ k.nombre }}</span><strong>{{ k.valor }}</strong><small>{{ k.unidad }} · tendencia {{ k.tendencia }}</small></div> }
        <div class="card"><strong>Prendas repuestas</strong><span>{{ datos()?.prendas_repuestas ?? 0 }}</span><strong>Monto compensaciones</strong><span>Bs. {{ datos()?.monto_compensaciones ?? 0 }}</span></div>
        @if (datos()?.datos_insuficientes) { <div class="aviso">{{ datos()?.mensaje_datos_insuficientes || 'Se requiere mínimo 3 meses de historial para entrenar el modelo.' }}</div> }
        <div class="card">
          <h2>Modelos ML</h2>
          <button type="button" class="btn btn-sm btn-accent" (click)="entrenar()">Entrenar</button>
          <button type="button" class="btn btn-sm btn-outline" (click)="predecir()">Predecir ventas</button>
          <button type="button" class="btn btn-sm btn-outline" (click)="segmentarCompat()">Segmentar clientes</button>
          <button type="button" class="btn btn-sm btn-outline" (click)="anomalias()">Detectar anomalías</button>
          @if (prediccion(); as p) { <p>Predicción — RMSE {{ p.rmse }} · accuracy {{ p.accuracy }}</p> }
          @for (s of segmentos(); track s.segmento_id) { <p>Segmento {{ s.nombre }} — {{ s.cantidad_clientes }} clientes · silhouette {{ s.silhouette }}</p> }
          @if (silhouetteBajo()) { <p class="aviso">No se detectaron patrones claros en los datos actuales.</p> }
          @for (a of anomaliasList(); track a.id) { <p>Anomalía: {{ a.descripcion }}</p> }
          @for (m of modelos(); track m.id) { <p>{{ m.nombre }} — {{ m.tipo }} — {{ m.estado }} — accuracy {{ m.metricas_json?.accuracy }} · rmse {{ m.metricas_json?.rmse }}</p> }
        </div>
        <div class="card">
          <h2>Datos sintéticos</h2>
          <button type="button" class="btn btn-sm" (click)="generar()">Generar dataset</button>
          @for (d of datasets(); track d.id) { <p>{{ d.nombre }} ({{ d.filas }} filas) <button (click)="sembrar(d)">Sembrar</button> <button (click)="eliminar(d)">Eliminar</button></p> }
        </div>
      </app-plan-feature-lock>
    </section>
  `,
  styles: [`.card{background:#fff;border:1px solid var(--border-color);border-radius:12px;padding:1rem;margin:.6rem 0} .aviso{background:#fffbeb;border:1px solid #fcd34d;padding:.5rem}`]
})
export class AnalyticsMlComponent implements OnInit {
  private api = inject(AnaliticaApiService);
  sucursalId: number | null = null;
  datos = signal<DashboardAnalitico | null>(null);
  modelos = signal<ModeloMachineLearning[]>([]);
  prediccion = signal<PrediccionVentas | null>(null);
  segmentos = signal<SegmentoClientes[]>([]);
  anomaliasList = signal<Anomalia[]>([]);
  datasets = signal<any[]>([]);
  ngOnInit(): void { this.cargar(); this.api.listarModelos().subscribe({ next: (x) => this.modelos.set(x), error: () => undefined }); }
  cargar(): void { this.api.obtenerDashboard({ sucursal_id: this.sucursalId }).subscribe({ next: (x) => this.datos.set(x), error: () => undefined }); }
  entrenar(): void { this.api.entrenar({ tipo: 'SUPERVISADO' }).subscribe({ next: () => this.api.listarModelos().subscribe({ next: (x) => this.modelos.set(x) }) }); }
  predecir(): void { this.api.predecir({ periodo: 'proximo-mes' }).subscribe({ next: (x) => this.prediccion.set(x) }); }
  segmentarCompat(): void { this.api.segmentar().subscribe({ next: (x) => this.segmentos.set(x) }); }
  anomalias(): void { this.api.anomalias().subscribe({ next: (x) => this.anomaliasList.set(x) }); }
  silhouetteBajo(): boolean { return this.segmentos().some((s) => s.silhouette !== null && s.silhouette !== undefined && s.silhouette < 0.3); }
  generar(): void { this.api.generarDataset({ filas: 500 }).subscribe({ next: (d) => this.datasets.update((l) => [...l, d]) }); }
  sembrar(d: any): void { this.api.sembrarDataset(d.id).subscribe(); }
  eliminar(d: any): void { this.api.eliminarDataset(d.id).subscribe({ next: () => this.datasets.update((l) => l.filter((x) => x.id !== d.id)) }); }
}
