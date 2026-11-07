import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatosEmpresaUpdateDto, Tenant } from '../../../../core/models/saas.model';

/**
 * [EXAMEN-2] CU04 paso 1: datos de la empresa.
 * Emite el payload al padre para que él guarde y avance el asistente.
 */
@Component({
  selector: 'app-config-wizard-step-empresa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <form class="paso" (ngSubmit)="emitir()" #formulario="ngForm" novalidate>
      <header class="paso-cabecera">
        <h2><i class="ri-building-4-line"></i> Datos de la empresa</h2>
        <p>Confirma la información fiscal y de contacto que verá el equipo.</p>
      </header>

      <div class="grid">
        <div class="campo campo-full">
          <label for="w-razon">Razón social *</label>
          <input id="w-razon" name="razon_social" [(ngModel)]="datos.razon_social" required maxlength="200" />
        </div>

        <div class="campo">
          <label for="w-nit">NIT</label>
          <input id="w-nit" name="nit" [ngModel]="tenant?.nit" disabled />
          <small>El NIT solo lo puede cambiar el Super Administrador.</small>
        </div>

        <div class="campo">
          <label for="w-correo">Correo de contacto *</label>
          <input id="w-correo" name="correo_contacto" type="email" [(ngModel)]="datos.correo_contacto" required />
        </div>

        <div class="campo">
          <label for="w-telefono">Teléfono</label>
          <input id="w-telefono" name="telefono" [(ngModel)]="datos.telefono" maxlength="30" />
        </div>

        <div class="campo">
          <label for="w-moneda">Moneda</label>
          <select id="w-moneda" name="moneda" [(ngModel)]="datos.moneda">
            <option value="BOB">Boliviano (BOB)</option>
            <option value="USD">Dólar (USD)</option>
            <option value="PEN">Sol (PEN)</option>
            <option value="ARS">Peso argentino (ARS)</option>
          </select>
        </div>

        <div class="campo">
          <label for="w-zona">Zona horaria</label>
          <select id="w-zona" name="zona_horaria" [(ngModel)]="datos.zona_horaria">
            <option value="America/La_Paz">América/La Paz</option>
            <option value="America/Lima">América/Lima</option>
            <option value="America/Argentina/Buenos_Aires">América/Buenos Aires</option>
          </select>
        </div>

        <div class="campo campo-full">
          <label for="w-direccion">Dirección fiscal *</label>
          <textarea id="w-direccion" name="direccion_fiscal" rows="2" [(ngModel)]="datos.direccion_fiscal" required></textarea>
        </div>

        <div class="campo campo-full">
          <label for="w-logo">URL del logo</label>
          <input id="w-logo" name="logo_url" [(ngModel)]="datos.logo_url" placeholder="https://…" />
        </div>
      </div>

      <footer class="paso-acciones">
        <span class="paso-aviso">Los campos con * son obligatorios.</span>
        <button type="submit" class="btn btn-accent" [disabled]="guardando || formulario.invalid">
          <i class="ri-save-3-line"></i> {{ guardando ? 'Guardando…' : 'Guardar y continuar' }}
        </button>
      </footer>
    </form>
  `,
  styles: [`
    .paso { display: flex; flex-direction: column; gap: 1rem; }
    .paso-cabecera h2 { display: flex; align-items: center; gap: 0.45rem; margin: 0 0 0.2rem; font-size: 1rem; font-weight: 800; color: var(--primary); }
    .paso-cabecera h2 i { color: var(--accent); }
    .paso-cabecera p { margin: 0; font-size: 0.78rem; color: var(--text-muted); }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.9rem 1rem; }
    .campo-full { grid-column: 1 / -1; }
    .campo { display: flex; flex-direction: column; gap: 0.28rem; }
    .campo label { font-size: 0.74rem; font-weight: 700; color: var(--primary); }
    .campo input, .campo select, .campo textarea {
      border: 1px solid var(--border-color); border-radius: var(--radius-md);
      padding: 0.55rem 0.7rem; font-size: 0.84rem; font-family: inherit; color: var(--primary); background: white;
      &:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
      &:disabled { background: var(--bg-main); color: var(--text-muted); }
    }
    .campo small { font-size: 0.66rem; color: var(--text-muted); }
    .paso-acciones { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; border-top: 1px solid var(--border-light); padding-top: 1rem; flex-wrap: wrap; }
    .paso-aviso { font-size: 0.7rem; color: var(--text-muted); }
    @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
  `]
})
export class ConfigWizardStepEmpresaComponent implements OnChanges {
  @Input() tenant: Tenant | null = null;
  @Input() guardando = false;
  @Output() guardar = new EventEmitter<DatosEmpresaUpdateDto>();

  public datos: DatosEmpresaUpdateDto = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tenant'] && this.tenant) {
      this.datos = {
        razon_social: this.tenant.razon_social,
        direccion_fiscal: this.tenant.direccion_fiscal,
        telefono: this.tenant.telefono ?? '',
        correo_contacto: this.tenant.correo_contacto,
        logo_url: this.tenant.logo_url ?? '',
        moneda: this.tenant.moneda,
        zona_horaria: this.tenant.zona_horaria
      };
    }
  }

  public emitir(): void {
    this.guardar.emit({ ...this.datos });
  }
}
