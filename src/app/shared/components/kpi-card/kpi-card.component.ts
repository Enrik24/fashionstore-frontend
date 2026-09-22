import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { KpiConfig } from '../../../core/models/dashboard.model';
import { CurrencyFormatPipe } from '../../pipes/currency-format.pipe';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyFormatPipe],
  template: `
    <article class="kpi-card card" [class.tone-error]="kpi().tone === 'error'"
             [attr.aria-label]="kpi().label + ': ' + kpi().formattedValue">
      <div class="kpi-icon-box" [ngClass]="'kpi-' + (kpi().tone || 'default')">
        <i [class]="kpi().icon"></i>
      </div>
      <div class="kpi-details">
        <span class="kpi-label">{{ kpi().label }}</span>
        <h3 class="kpi-value" role="status">{{ kpi().formattedValue }}</h3>
        @if (kpi().deltaPct !== undefined && kpi().deltaPct !== null) {
          <span class="kpi-delta" [class.positive]="(kpi().deltaPct ?? 0) >= 0" [class.negative]="(kpi().deltaPct ?? 0) < 0">
            <i [class]="(kpi().deltaPct ?? 0) >= 0 ? 'ri-arrow-up-line' : 'ri-arrow-down-line'"></i>
            {{ (kpi().deltaPct ?? 0) | number:'1.1-1' }}% vs anterior
          </span>
        } @else if (kpi().subtext) {
          <span class="kpi-subtext">{{ kpi().subtext }}</span>
        }
        @if (kpi().route) {
          <a [routerLink]="kpi().route" class="kpi-link">Ver detalle <i class="ri-arrow-right-line"></i></a>
        }
      </div>
    </article>
  `,
  styles: [`
    .kpi-card { display: flex; align-items: center; gap: 1.25rem; padding: 1.25rem 1.5rem; }
    .kpi-icon-box { width: 50px; height: 50px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; background: rgba(100,116,139,.12); color: var(--text-muted); }
    .kpi-success { background: rgba(16,185,129,.12); color: var(--success); }
    .kpi-warning { background: rgba(245,158,11,.12); color: var(--warning); }
    .kpi-error { background: rgba(239,68,68,.12); color: var(--error); }
    .kpi-info { background: rgba(59,130,246,.12); color: var(--info); }
    .kpi-default { background: rgba(225,29,72,.1); color: var(--accent); }
    .kpi-details { display: flex; flex-direction: column; gap: .15rem; }
    .kpi-label { font-size: .75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: .05em; }
    .kpi-value { font-size: 1.75rem; font-weight: 800; color: var(--primary); line-height: 1.2; margin: 0; }
    .kpi-subtext { font-size: .7rem; color: var(--text-muted); }
    .kpi-delta { font-size: .75rem; font-weight: 700; display: inline-flex; align-items: center; gap: .25rem; }
    .kpi-delta.positive { color: var(--success); }
    .kpi-delta.negative { color: var(--error); }
    .kpi-link { font-size: .75rem; font-weight: 600; color: var(--accent); text-decoration: none; }
    .tone-error { border-left: 4px solid var(--error); }
  `]
})
export class KpiCardComponent {
  readonly kpi = input.required<KpiConfig>();
}
