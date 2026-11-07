import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuarioConfigCreateDto } from '../../../../core/models/saas.model';
import { Sucursal } from '../../../../core/models/branch.model';
import { PlanLimitAlertComponent } from '../../../../shared/components/plan-limit-alert/plan-limit-alert.component';

/**
 * [EXAMEN-2] CU04 paso 3: usuarios.
 * Permite crear Encargados y Cajeros y bloquea el alta al alcanzar el límite.
 */
@Component({
  selector: 'app-config-wizard-step-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, PlanLimitAlertComponent],
  template: `
    <form class="paso" (ngSubmit)="emitir()" #formulario="ngForm" novalidate>
      <header class="paso-cabecera">
        <h2><i class="ri-team-line"></i> Usuarios del equipo</h2>
        <p>Crea el primer Encargado o Cajero. Recibirá una contraseña temporal.</p>
      </header>

      <div class="contador" [class.limite]="enLimite">
        <span><i class="ri-user-settings-line"></i> Usuarios registrados</span>
        <strong>{{ usadas }} / {{ limite === null ? '∞' : limite }}</strong>
      </div>

      @if (enLimite) {
        <app-plan-limit-alert recurso="usuarios" [usado]="usadas" [limite]="limite"></app-plan-limit-alert>
      } @else {
        <div class="grid">
          <div class="campo">
            <label for="u-nombre">Nombre *</label>
            <input id="u-nombre" name="nombre" [(ngModel)]="datos.nombre" required maxlength="100" />
          </div>

          <div class="campo">
            <label for="u-apellido">Apellido *</label>
            <input id="u-apellido" name="apellido" [(ngModel)]="datos.apellido" required maxlength="100" />
          </div>

          <div class="campo">
            <label for="u-correo">Correo *</label>
            <input id="u-correo" name="correo" type="email" [(ngModel)]="datos.correo" required />
          </div>

          <div class="campo">
            <label for="u-telefono">Teléfono</label>
            <input id="u-telefono" name="telefono" [(ngModel)]="datos.telefono" maxlength="30" />
          </div>

          <div class="campo">
            <label for="u-rol">Rol *</label>
            <select id="u-rol" name="rol" [(ngModel)]="datos.rol" required>
              <option value="Encargado">Encargado de sucursal</option>
              <option value="Cajero">Cajero</option>
            </select>
          </div>

          <div class="campo">
            <label for="u-sucursal">Sucursal *</label>
            <select id="u-sucursal" name="sucursal_id" [(ngModel)]="datos.sucursal_id" required>
              <option [ngValue]="0">Selecciona una sucursal</option>
              @for (sucursal of sucursales; track sucursal.id) {
                <option [ngValue]="sucursal.id">{{ sucursal.nombre }}</option>
              }
            </select>
          </div>

          <div class="campo campo-full">
            <label for="u-contrasena">Contraseña temporal *</label>
            <input id="u-contrasena" name="contrasena" type="password" [(ngModel)]="datos.contrasena"
                   required minlength="8" maxlength="72" />
            <small>Mínimo 8 caracteres. El usuario deberá cambiarla al ingresar.</small>
          </div>
        </div>

        <footer class="paso-acciones">
          <span class="paso-aviso">Puedes crear más usuarios después de terminar el asistente.</span>
          <button type="submit" class="btn btn-accent" [disabled]="guardando || formulario.invalid">
            <i class="ri-user-add-line"></i> {{ guardando ? 'Guardando…' : 'Guardar usuario y continuar' }}
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
    .campo input, .campo select {
      border: 1px solid var(--border-color); border-radius: var(--radius-md);
      padding: 0.55rem 0.7rem; font-size: 0.84rem; font-family: inherit; color: var(--primary); background: white;
      &:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    }
    .campo small { font-size: 0.66rem; color: var(--text-muted); }
    .paso-acciones { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; border-top: 1px solid var(--border-light); padding-top: 1rem; flex-wrap: wrap; }
    .paso-aviso { font-size: 0.7rem; color: var(--text-muted); }
    @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
  `]
})
export class ConfigWizardStepUsuariosComponent {
  @Input() usadas = 0;
  @Input() limite: number | null = 0;
  @Input() sucursales: Sucursal[] = [];
  @Input() guardando = false;
  @Output() guardar = new EventEmitter<UsuarioConfigCreateDto>();

  public datos: UsuarioConfigCreateDto = this.datosIniciales();

  public get enLimite(): boolean {
    return this.limite !== null && this.limite > 0 && this.usadas >= this.limite;
  }

  public emitir(): void {
    this.guardar.emit({ ...this.datos });
  }

  private datosIniciales(): UsuarioConfigCreateDto {
    return {
      nombre: '',
      apellido: '',
      correo: '',
      contrasena: '',
      rol: 'Encargado',
      sucursal_id: 0,
      telefono: ''
    };
  }
}
