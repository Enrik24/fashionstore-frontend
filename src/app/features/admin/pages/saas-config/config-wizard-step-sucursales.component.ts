import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SucursalConfigCreateDto } from '../../../../core/models/saas.model';
import { PlanLimitAlertComponent } from '../../../../shared/components/plan-limit-alert/plan-limit-alert.component';

/**
 * [EXAMEN-2] CU04 paso 2: sucursales.
 * Bloquea el alta cuando el tenant alcanza el límite de sucursales del plan.
 */
@Component({
  selector: 'app-config-wizard-step-sucursales',
  standalone: true,
  imports: [CommonModule, FormsModule, PlanLimitAlertComponent],
  template: `
    <form class="paso" (ngSubmit)="emitir()" #formulario="ngForm" novalidate>
      <header class="paso-cabecera">
        <h2><i class="ri-store-3-line"></i> Sucursales</h2>
        <p>Registra al menos una sucursal operativa. Cada sucursal necesita dirección y teléfono.</p>
      </header>

      <div class="contador" [class.limite]="enLimite">
        <span><i class="ri-store-3-line"></i> Sucursales registradas</span>
        <strong>{{ usadas }} / {{ limite === null ? '∞' : limite }}</strong>
      </div>

      @if (enLimite) {
        <app-plan-limit-alert recurso="sucursales" [usado]="usadas" [limite]="limite"></app-plan-limit-alert>
      } @else {
        <div class="grid">
          <div class="campo campo-full">
            <label for="s-nombre">Nombre de la sucursal *</label>
            <input id="s-nombre" name="nombre" [(ngModel)]="datos.nombre" required maxlength="120"
                   placeholder="Ej. Sucursal Centro" />
          </div>

          <div class="campo campo-full">
            <label for="s-direccion">Dirección *</label>
            <input id="s-direccion" name="direccion" [(ngModel)]="datos.direccion" required maxlength="250" />
          </div>

          <div class="campo">
            <label for="s-telefono">Teléfono *</label>
            <input id="s-telefono" name="telefono" [(ngModel)]="datos.telefono" required maxlength="30" />
          </div>

          <div class="campo">
            <label for="s-horario">Horario de atención</label>
            <input id="s-horario" name="horario_atencion" [(ngModel)]="datos.horario_atencion"
                   placeholder="Lun–Sáb 09:00–20:00" maxlength="120" />
          </div>
        </div>

        <footer class="paso-acciones">
          <span class="paso-aviso">Se guarda una sucursal por vez.</span>
          <button type="submit" class="btn btn-accent" [disabled]="guardando || formulario.invalid">
            <i class="ri-add-line"></i> {{ guardando ? 'Guardando…' : 'Guardar sucursal y continuar' }}
          </button>
        </footer>
      }
    </form>
  `,
  styles: [`
    .paso { display: flex; flex-direction: column; gap: 1rem; }
    .paso-cabecera h2 { display: flex; align-items: center; gap: 0.45rem; margin: 0 0 0.2rem; font-size: 1rem; font-weight: 800; color: var(--primary); }
    .paso-cabecera h2 i { color: var(--accent); }
    .paso-cabecera p { margin: 0; font-size: 0.78rem; color: var(--text-muted); }

    .contador {
      display: flex; align-items: center; justify-content: space-between;
      background: var(--bg-main); border-radius: var(--radius-md);
      padding: 0.7rem 0.9rem; font-size: 0.8rem; color: var(--text-muted);
      &.limite { background: var(--error-bg); color: var(--critical); }
    }
    .contador span { display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 600; }
    .contador strong { font-size: 1rem; color: var(--primary); }
    .contador.limite strong { color: var(--critical); }

    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.9rem 1rem; }
    .campo-full { grid-column: 1 / -1; }
    .campo { display: flex; flex-direction: column; gap: 0.28rem; }
    .campo label { font-size: 0.74rem; font-weight: 700; color: var(--primary); }
    .campo input {
      border: 1px solid var(--border-color); border-radius: var(--radius-md);
      padding: 0.55rem 0.7rem; font-size: 0.84rem; font-family: inherit; color: var(--primary); background: white;
      &:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    }
    .paso-acciones { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; border-top: 1px solid var(--border-light); padding-top: 1rem; flex-wrap: wrap; }
    .paso-aviso { font-size: 0.7rem; color: var(--text-muted); }
    @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
  `]
})
export class ConfigWizardStepSucursalesComponent {
  @Input() usadas = 0;
  @Input() limite: number | null = 0;
  @Input() guardando = false;
  @Output() guardar = new EventEmitter<SucursalConfigCreateDto>();

  public datos: SucursalConfigCreateDto = this.datosIniciales();

  public get enLimite(): boolean {
    return this.limite !== null && this.limite > 0 && this.usadas >= this.limite;
  }

  public emitir(): void {
    this.guardar.emit({ ...this.datos });
  }

  private datosIniciales(): SucursalConfigCreateDto {
    return {
      nombre: '',
      direccion: '',
      telefono: '',
      horario_atencion: '',
      ciudad_id: null,
      latitud: null,
      longitud: null
    };
  }
}
