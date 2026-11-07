import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfiguracionOffline, PreferenciasOfflineUpdateDto } from '../../../../core/models/offline.model';

/**
 * [EXAMEN-2] CU04 paso 4: configuración offline.
 * Ajusta descarga automática, clientes, carrito offline y vigencia de la sesión.
 */
@Component({
  selector: 'app-config-wizard-step-offline',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <form class="paso" (ngSubmit)="emitir()" #formulario="ngForm" novalidate>
      <header class="paso-cabecera">
        <h2><i class="ri-wifi-off-line"></i> Operación offline</h2>
        <p>Define qué datos se guardan en el dispositivo y cuánto dura la sesión sin conexión.</p>
      </header>

      <div class="opciones">
        <label class="opcion">
          <input type="checkbox" name="descarga_automatica" [(ngModel)]="datos.descarga_automatica" />
          <span>
            <strong>Descarga automática</strong>
            <small>Actualiza el catálogo y el stock al iniciar sesión.</small>
          </span>
        </label>

        <label class="opcion">
          <input type="checkbox" name="incluir_clientes" [(ngModel)]="datos.incluir_clientes" />
          <span>
            <strong>Incluir clientes</strong>
            <small>Guarda clientes para reservas y ventas sin conexión.</small>
          </span>
        </label>

        <label class="opcion" [class.deshabilitada]="!permiteCarritoOffline">
          <input type="checkbox" name="habilitar_carrito_offline"
                 [(ngModel)]="datos.habilitar_carrito_offline"
                 [disabled]="!permiteCarritoOffline" />
          <span>
            <strong>Carrito offline</strong>
            <small>
              @if (permiteCarritoOffline) {
                Permite armar el carrito y diferir el pago hasta recuperar la red.
              } @else {
                Tu plan actual no incluye carrito offline. Mejora de plan para habilitarlo.
              }
            </small>
          </span>
        </label>
      </div>

      <div class="grid">
        <div class="campo">
          <label for="o-hora">Hora de descarga</label>
          <input id="o-hora" name="hora_descarga" type="time" [(ngModel)]="datos.hora_descarga" />
        </div>

        <div class="campo">
          <label for="o-max-clientes">Máximo de clientes locales</label>
          <input id="o-max-clientes" name="max_clientes" type="number" min="0" [(ngModel)]="datos.max_clientes" />
        </div>

        <div class="campo">
          <label for="o-max-horas">Máximo de horas de sesión offline</label>
          <input id="o-max-horas" name="max_horas_sesion_offline" type="number" min="1" max="72"
                 [(ngModel)]="datos.max_horas_sesion_offline" />
        </div>

        <div class="campo">
          <label for="o-max-dias">Días máximos de una orden pendiente</label>
          <input id="o-max-dias" name="max_dias_orden_pendiente" type="number" min="1" max="30"
                 [(ngModel)]="datos.max_dias_orden_pendiente" />
        </div>
      </div>

      <div class="aviso">
        <i class="ri-shield-keyhole-line"></i>
        <p>
          El PIN se configura al terminar el asistente, desde <strong>Perfil → Seguridad offline</strong>.
          El token offline se cifra y se borra al cerrar sesión o revocar el dispositivo.
        </p>
      </div>

      <footer class="paso-acciones">
        <span class="paso-aviso">Puedes ajustar estos valores más adelante.</span>
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

    .opciones { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.7rem; }
    .opcion {
      display: flex; gap: 0.55rem; align-items: flex-start;
      border: 1px solid var(--border-color); border-radius: var(--radius-md);
      padding: 0.75rem 0.85rem; cursor: pointer;
      &:has(input:checked) { border-color: var(--accent); background: rgba(225, 29, 72, 0.04); }
      &.deshabilitada { opacity: 0.65; cursor: not-allowed; background: var(--bg-main); }
      input { margin-top: 0.15rem; accent-color: var(--accent); }
      span { display: flex; flex-direction: column; gap: 0.1rem; }
      strong { font-size: 0.8rem; color: var(--primary); }
      small { font-size: 0.68rem; color: var(--text-muted); line-height: 1.4; }
    }

    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.9rem 1rem; }
    .campo { display: flex; flex-direction: column; gap: 0.28rem; }
    .campo label { font-size: 0.74rem; font-weight: 700; color: var(--primary); }
    .campo input {
      border: 1px solid var(--border-color); border-radius: var(--radius-md);
      padding: 0.55rem 0.7rem; font-size: 0.84rem; font-family: inherit; color: var(--primary); background: white;
      &:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    }

    .aviso {
      display: flex; gap: 0.55rem; align-items: flex-start;
      background: var(--info-bg); border-radius: var(--radius-md); padding: 0.8rem 0.95rem;
      i { color: var(--info); font-size: 1.1rem; flex-shrink: 0; }
      p { margin: 0; font-size: 0.74rem; color: var(--primary); line-height: 1.5; }
    }

    .paso-acciones { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; border-top: 1px solid var(--border-light); padding-top: 1rem; flex-wrap: wrap; }
    .paso-aviso { font-size: 0.7rem; color: var(--text-muted); }
    @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
  `]
})
export class ConfigWizardStepOfflineComponent implements OnChanges {
  @Input() config: ConfiguracionOffline | null = null;
  @Input() permiteCarritoOffline = false;
  @Input() guardando = false;
  @Output() guardar = new EventEmitter<PreferenciasOfflineUpdateDto>();

  public datos: PreferenciasOfflineUpdateDto = this.datosIniciales();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      this.datos = {
        descarga_automatica: this.config.descarga_automatica,
        hora_descarga: this.config.hora_descarga ?? null,
        incluir_clientes: this.config.incluir_clientes,
        max_clientes: this.config.max_clientes,
        habilitar_carrito_offline: this.config.habilitar_carrito_offline,
        max_horas_sesion_offline: this.config.max_horas_sesion_offline,
        max_dias_orden_pendiente: this.config.max_dias_orden_pendiente
      };
    }
    if (changes['permiteCarritoOffline'] && !this.permiteCarritoOffline) {
      this.datos.habilitar_carrito_offline = false;
    }
  }

  public emitir(): void {
    this.guardar.emit({ ...this.datos });
  }

  private datosIniciales(): PreferenciasOfflineUpdateDto {
    return {
      descarga_automatica: true,
      hora_descarga: null,
      incluir_clientes: true,
      max_clientes: 200,
      habilitar_carrito_offline: false,
      max_horas_sesion_offline: 8,
      max_dias_orden_pendiente: 7
    };
  }
}
