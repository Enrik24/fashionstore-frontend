import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogApiService } from '../../../../core/services/catalog-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EstadoTipoTela, TipoTela, TipoTelaCreate, TipoTelaUpdate } from '../../../../core/models/tipo-tela.model';

/**
 * [EXAMEN-2] CU04 / Punto 3: alta y edición de un tipo de tela.
 * `descripcion` se rotula como composición sugerida y `cuidados_lavado`
 * como instrucciones de lavado.
 */
@Component({
  selector: 'app-tipo-tela-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <form class="tipo-form card" (ngSubmit)="guardar()" #formulario="ngForm" novalidate>
      <header>
        <h2><i class="ri-price-tag-3-line"></i> {{ tipo ? 'Editar tipo de tela' : 'Nuevo tipo de tela' }}</h2>
        <button type="button" class="btn-cerrar" (click)="cancelado.emit()" aria-label="Cerrar formulario">
          <i class="ri-close-line"></i>
        </button>
      </header>

      <div class="grid">
        <div class="campo campo-full">
          <label for="t-nombre">Nombre *</label>
          <input id="t-nombre" name="nombre" [(ngModel)]="datos.nombre" required maxlength="100"
                 placeholder="Ej. Algodón peinado" />
        </div>

        <div class="campo campo-full">
          <label for="t-composicion">Composición sugerida</label>
          <textarea id="t-composicion" name="descripcion" rows="2" [(ngModel)]="datos.descripcion"
                    maxlength="250" placeholder="Ej. 95% algodón, 5% elastano"></textarea>
          <small>Se muestra en el catálogo como composición de la prenda.</small>
        </div>

        <div class="campo campo-full">
          <label for="t-cuidados">Cuidados de lavado</label>
          <textarea id="t-cuidados" name="cuidados_lavado" rows="2" [(ngModel)]="datos.cuidados_lavado"
                    maxlength="250" placeholder="Ej. Lavar a máquina en frío, no usar secadora"></textarea>
        </div>

        <div class="campo">
          <label for="t-estado">Estado</label>
          <select id="t-estado" name="estado" [(ngModel)]="datos.estado">
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
            <option value="AGOTADO">Agotado</option>
            <option value="PROXIMO_INGRESO">Próximo ingreso</option>
          </select>
        </div>
      </div>

      @if (error()) {
        <div class="error-box" role="alert"><i class="ri-error-warning-line"></i> {{ error() }}</div>
      }

      <footer>
        <button type="button" class="btn btn-outline" (click)="cancelado.emit()" [disabled]="guardando()">Cancelar</button>
        <button type="submit" class="btn btn-accent" [disabled]="guardando() || formulario.invalid">
          <i class="ri-save-3-line"></i> {{ guardando() ? 'Guardando…' : 'Guardar' }}
        </button>
      </footer>
    </form>
  `,
  styles: [`
    .tipo-form { padding: 1.25rem 1.35rem; display: flex; flex-direction: column; gap: 1rem; border-left: 4px solid var(--accent); }
    header { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
    header h2 { display: flex; align-items: center; gap: 0.45rem; margin: 0; font-size: 0.98rem; font-weight: 800; color: var(--primary); }
    header h2 i { color: var(--accent); }
    .btn-cerrar { border: none; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 1.15rem; padding: 0.2rem; }

    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.85rem 1rem; }
    .campo-full { grid-column: 1 / -1; }
    .campo { display: flex; flex-direction: column; gap: 0.28rem; }
    .campo label { font-size: 0.74rem; font-weight: 700; color: var(--primary); }
    .campo input, .campo select, .campo textarea {
      border: 1px solid var(--border-color); border-radius: var(--radius-md);
      padding: 0.55rem 0.7rem; font-size: 0.84rem; font-family: inherit; color: var(--primary); background: white;
      &:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    }
    .campo textarea { resize: vertical; }
    .campo small { font-size: 0.66rem; color: var(--text-muted); }

    .error-box { display: flex; align-items: center; gap: 0.45rem; background: var(--error-bg); color: var(--error); border-radius: var(--radius-md); padding: 0.7rem 0.85rem; font-size: 0.78rem; }
    footer { display: flex; justify-content: flex-end; gap: 0.5rem; }
    @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
  `]
})
export class TipoTelaFormComponent implements OnChanges {
  private catalogApi = inject(CatalogApiService);
  private toast = inject(ToastService);

  @Input() tipo: TipoTela | null = null;
  @Output() guardado = new EventEmitter<TipoTela>();
  @Output() cancelado = new EventEmitter<void>();

  public guardando = signal(false);
  public error = signal<string | null>(null);

  public datos: TipoTelaCreate = this.datosIniciales();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tipo']) {
      this.datos = this.tipo ? this.desdeTipo(this.tipo) : this.datosIniciales();
      this.error.set(null);
    }
  }

  public guardar(): void {
    this.error.set(null);
    if (!this.datos.nombre.trim()) {
      this.error.set('El nombre del tipo de tela es obligatorio.');
      return;
    }

    this.guardando.set(true);
    const peticion = this.tipo
      ? this.catalogApi.actualizarTipoTela(this.tipo.id, this.comoUpdate())
      : this.catalogApi.crearTipoTela(this.datos);

    peticion.subscribe({
      next: (tipo) => {
        this.guardando.set(false);
        this.toast.success(this.tipo ? 'Tipo de tela actualizado.' : 'Tipo de tela creado.');
        this.guardado.emit(tipo);
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(this.mensajeError(err));
      }
    });
  }

  private comoUpdate(): TipoTelaUpdate {
    return {
      nombre: this.datos.nombre,
      descripcion: this.datos.descripcion || null,
      cuidados_lavado: this.datos.cuidados_lavado || null,
      estado: this.datos.estado
    };
  }

  private desdeTipo(tipo: TipoTela): TipoTelaCreate {
    return {
      nombre: tipo.nombre,
      descripcion: tipo.descripcion ?? '',
      cuidados_lavado: tipo.cuidados_lavado ?? '',
      estado: (tipo.estado ?? 'ACTIVO') as EstadoTipoTela
    };
  }

  private datosIniciales(): TipoTelaCreate {
    return {
      nombre: '',
      descripcion: '',
      cuidados_lavado: '',
      estado: 'ACTIVO'
    };
  }

  private mensajeError(err: any): string {
    const detalle = err?.error?.detail ?? err?.error?.message;
    if (typeof detalle === 'string') {
      if (/nombre/i.test(detalle)) return 'Ya existe un tipo de tela con ese nombre.';
      return detalle;
    }
    if (Array.isArray(detalle) && detalle.length) return String(detalle[0]?.msg ?? 'Revisa los datos.');
    return 'No se pudo guardar el tipo de tela.';
  }
}
