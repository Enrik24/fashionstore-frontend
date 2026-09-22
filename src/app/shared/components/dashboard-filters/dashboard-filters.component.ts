import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardFilters, RangePreset } from '../../../core/models/dashboard.model';
import { Sucursal } from '../../../core/models/branch.model';

@Component({
  selector: 'app-dashboard-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="filters-bar card">
      <div class="presets" role="group" aria-label="Rango de fechas">
        @for (p of presets; track p.value) {
          <button class="chip" [class.active]="value().preset === p.value" (click)="setPreset(p.value)">{{ p.label }}</button>
        }
      </div>
      @if (value().preset === 'custom') {
        <div class="date-range">
          <input type="date" class="form-control" [ngModel]="value().fechaInicio" (ngModelChange)="patch({ fechaInicio: $event })" aria-label="Fecha inicio" />
          <span>→</span>
          <input type="date" class="form-control" [ngModel]="value().fechaFin" (ngModelChange)="patch({ fechaFin: $event })" aria-label="Fecha fin" />
        </div>
      }
      <select class="form-control" [ngModel]="value().sucursalId" (ngModelChange)="patch({ sucursalId: $event || undefined })" aria-label="Sucursal">
        <option [ngValue]="undefined">Todas las sucursales</option>
        @for (s of sucursales(); track s.id) {
          <option [ngValue]="s.id">{{ s.nombre }}</option>
        }
      </select>
      <label class="switch"><input type="checkbox" [ngModel]="value().comparar" (ngModelChange)="patch({ comparar: $event })" /> Comparar con período anterior</label>
      <span class="range-label">{{ value().fechaInicio }} → {{ value().fechaFin }}</span>
    </div>
  `,
  styles: [`
    .filters-bar { display: flex; flex-wrap: wrap; gap: .75rem; align-items: center; padding: 1rem 1.25rem; }
    .presets { display: flex; flex-wrap: wrap; gap: .4rem; }
    .chip { border: 1px solid var(--border-light); background: #fff; border-radius: 999px; padding: .3rem .8rem; font-size: .8rem; cursor: pointer; }
    .chip.active { background: var(--accent); color: #fff; border-color: var(--accent); }
    .date-range { display: flex; align-items: center; gap: .4rem; }
    .switch { display: flex; align-items: center; gap: .4rem; font-size: .8rem; }
    .range-label { font-size: .75rem; color: var(--text-muted); margin-left: auto; }
  `]
})
export class DashboardFiltersComponent {
  readonly value = input.required<DashboardFilters>();
  readonly sucursales = input<Sucursal[]>([]);
  readonly changed = output<DashboardFilters>();
  readonly presets: { label: string; value: RangePreset }[] = [
    { label: 'Hoy', value: 'hoy' }, { label: '7 días', value: '7d' }, { label: '30 días', value: '30d' },
    { label: 'Mes', value: 'mes' }, { label: 'Trimestre', value: 'trimestre' }, { label: 'Año', value: 'anio' },
    { label: 'Personalizado', value: 'custom' }
  ];

  setPreset(preset: RangePreset): void {
    const v = { ...this.value(), preset };
    if (preset !== 'custom') {
      import('../../../core/utils/date-range.util').then(m => {
        const r = m.rangeFor(preset);
        this.changed.emit({ ...v, fechaInicio: r.fechaInicio, fechaFin: r.fechaFin });
      });
    } else this.changed.emit(v);
  }

  patch(p: Partial<DashboardFilters>): void {
    this.changed.emit({ ...this.value(), ...p });
  }
}
