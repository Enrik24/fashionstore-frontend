import { Component, input, output, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';

@Component({
  selector: 'app-chart-card',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <section class="chart-card card" [attr.aria-label]="title()">
      <header class="chart-header">
        <div>
          <h3 class="chart-title"><i [class]="icon()"></i> {{ title() }}</h3>
          @if (subtitle()) { <p class="chart-subtitle">{{ subtitle() }}</p> }
        </div>
        @if (exportable() && status() === 'success') {
          <button class="btn btn-outline btn-sm" (click)="exportPng()" title="Exportar PNG">
            <i class="ri-download-2-line"></i>
          </button>
        }
      </header>
      @if (status() === 'loading') {
        <div class="chart-skeleton" aria-hidden="true"></div>
      } @else if (status() === 'error') {
        <div class="chart-state error" role="alert">
          <i class="ri-error-warning-line"></i>
          <p>{{ errorMessage() || 'No se pudo cargar esta gráfica' }}</p>
          <button class="btn btn-outline btn-sm" (click)="retry.emit()">Reintentar</button>
        </div>
      } @else if (status() === 'empty') {
        <div class="chart-state empty">
          <i class="ri-bar-chart-2-line"></i>
          <p>{{ emptyMessage() || 'Sin datos para el período seleccionado' }}</p>
        </div>
      } @else {
        <div class="chart-canvas">
          <canvas baseChart [type]="type()" [data]="data()" [options]="options()" [plugins]="plugins()"></canvas>
        </div>
      }
    </section>
  `,
  styles: [`
    .chart-card { display: flex; flex-direction: column; gap: .75rem; padding: 1.25rem; }
    .chart-header { display: flex; align-items: flex-start; justify-content: space-between; gap: .5rem; }
    .chart-title { font-size: 1rem; font-weight: 700; color: var(--primary); display: flex; gap: .5rem; align-items: center; margin: 0; }
    .chart-subtitle { font-size: .8rem; color: var(--text-muted); margin: .25rem 0 0; }
    .chart-canvas { position: relative; height: 260px; }
    .chart-skeleton { height: 260px; border-radius: var(--radius-md); background: linear-gradient(90deg, var(--border-light) 25%, #e9eef5 37%, var(--border-light) 63%); background-size: 400% 100%; animation: shimmer 1.4s ease infinite; }
    @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
    .chart-state { height: 260px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .5rem; color: var(--text-muted); text-align: center; }
    .chart-state i { font-size: 2rem; }
    .chart-state.error i { color: var(--error); }
  `]
})
export class ChartCardComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly icon = input<string>('ri-bar-chart-line');
  readonly type = input.required<ChartType>();
  readonly data = input.required<ChartConfiguration['data']>();
  readonly options = input<any>({});
  readonly plugins = input<any[]>([]);
  readonly status = input<'loading' | 'success' | 'empty' | 'error'>('success');
  readonly errorMessage = input<string>('');
  readonly emptyMessage = input<string>('');
  readonly exportable = input<boolean>(true);
  readonly retry = output<void>();
  private readonly chartRef = viewChild(BaseChartDirective);

  protected exportPng(): void {
    const url = this.chartRef()?.toBase64Image();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.title().toLowerCase().replace(/\s+/g, '_')}.png`;
    a.click();
  }
}
