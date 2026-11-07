import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogApiService } from '../../../../core/services/catalog-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TipoTela } from '../../../../core/models/tipo-tela.model';
import { SectionTitleComponent } from '../../../../shared/components/section-title/section-title.component';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';
import { TipoTelaFormComponent } from './tipo-tela-form.component';

/**
 * [EXAMEN-2] CU04 / Punto 3: tipos de tela del tenant.
 * Listado con composición sugerida, cuidados y estado; alta, edición y baja lógica.
 */
@Component({
  selector: 'app-tipos-tela-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SectionTitleComponent, StatusBadgePipe, TipoTelaFormComponent],
  template: `
    <div class="page">
      <app-section-title
        titulo="Tipos de tela"
        subtitulo="Define composiciones y cuidados para reutilizarlos en el catálogo de productos."
        icono="ri-price-tag-3-line">
        <button acciones type="button" class="btn btn-accent btn-sm" (click)="nuevo()">
          <i class="ri-add-line"></i> Nuevo tipo de tela
        </button>
      </app-section-title>

      @if (formularioAbierto()) {
        <app-tipo-tela-form
          [tipo]="tipoEnEdicion()"
          (guardado)="alGuardar($event)"
          (cancelado)="cerrarFormulario()">
        </app-tipo-tela-form>
      }

      <div class="filtros card">
        <div class="filtro">
          <label for="buscar">Buscar</label>
          <div class="input-icon">
            <i class="ri-search-line"></i>
            <input id="buscar" type="search" [(ngModel)]="busqueda" placeholder="Nombre, composición o cuidados" />
          </div>
        </div>

        <div class="filtro">
          <label for="estado">Estado</label>
          <select id="estado" [(ngModel)]="estadoFiltro">
            <option value="">Todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
            <option value="AGOTADO">Agotado</option>
            <option value="PROXIMO_INGRESO">Próximo ingreso</option>
          </select>
        </div>

        <div class="filtro-check">
          <label class="check-inline">
            <input type="checkbox" [(ngModel)]="incluirInactivos" (change)="cargar()" />
            Incluir inactivos
          </label>
        </div>
      </div>

      @if (cargando()) {
        <div class="loading-box card"><i class="ri-loader-4-line spin"></i> Cargando tipos de tela…</div>
      } @else if (filtrados().length === 0) {
        <div class="empty-box card">
          <i class="ri-price-tag-3-line"></i>
          <h3>No hay tipos de tela</h3>
          <p>Crea el primero para asignarlo a tus productos.</p>
          <button type="button" class="btn btn-accent" (click)="nuevo()">Crear tipo de tela</button>
        </div>
      } @else {
        <div class="tabla-wrapper card">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Composición sugerida</th>
                <th>Cuidados de lavado</th>
                <th>Estado</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (tipo of filtrados(); track tipo.id) {
                <tr>
                  <td class="nombre">{{ tipo.nombre }}</td>
                  <td>{{ tipo.descripcion || '—' }}</td>
                  <td>{{ tipo.cuidados_lavado || '—' }}</td>
                  <td>
                    <span class="badge" [ngClass]="((tipo.estado || 'ACTIVO') | statusBadge).class">
                      {{ ((tipo.estado || 'ACTIVO') | statusBadge).label }}
                    </span>
                  </td>
                  <td class="text-right">
                    <div class="acciones-fila">
                      <a class="btn btn-sm btn-outline" routerLink="/admin/products"
                         [queryParams]="{ tipo_tela: tipo.id }" title="Ver productos de este tipo">
                        <i class="ri-t-shirt-2-line"></i>
                      </a>
                      <button type="button" class="btn btn-sm btn-outline" (click)="editar(tipo)" title="Editar">
                        <i class="ri-edit-line"></i>
                      </button>
                      <button type="button" class="btn btn-sm btn-outline danger" (click)="eliminar(tipo)" title="Dar de baja">
                        <i class="ri-delete-bin-line"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <p class="nota">
          <i class="ri-information-line"></i>
          La baja es lógica: el tipo deja de estar disponible para nuevos productos pero conserva el historial.
        </p>
      }
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1rem; }

    .filtros { display: flex; align-items: flex-end; gap: 1rem; padding: 1rem 1.15rem; flex-wrap: wrap; }
    .filtro { display: flex; flex-direction: column; gap: 0.3rem; min-width: 200px; flex: 1; }
    .filtro label { font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .filtro input, .filtro select {
      height: 40px; border: 1px solid var(--border-color); border-radius: var(--radius-md);
      padding: 0 0.75rem; font-size: 0.84rem; color: var(--primary); background: white; font-family: inherit;
      &:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    }
    .input-icon { position: relative; }
    .input-icon i { position: absolute; left: 0.7rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
    .input-icon input { width: 100%; padding-left: 2rem; }
    .filtro-check { padding-bottom: 0.55rem; }
    .check-inline { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--primary); font-weight: 600; }
    .check-inline input { accent-color: var(--accent); }

    .tabla-wrapper { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 760px; }
    th { text-align: left; font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); padding: 0.7rem 1rem; background: var(--bg-main); border-bottom: 1px solid var(--border-color); }
    td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-light); font-size: 0.8rem; color: var(--text-muted); vertical-align: top; }
    tbody tr:hover { background: var(--bg-main); }
    .nombre { color: var(--primary); font-weight: 700; }
    .text-right { text-align: right; }
    .acciones-fila { display: inline-flex; gap: 0.3rem; }
    .danger { color: var(--critical); border-color: rgba(220, 38, 38, 0.4); }

    .nota { display: flex; align-items: center; gap: 0.35rem; margin: 0; font-size: 0.72rem; color: var(--text-muted); }

    .loading-box, .empty-box {
      display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
      padding: 3rem 1.5rem; text-align: center;
      i { font-size: 2.5rem; color: var(--text-muted); }
      h3 { margin: 0; font-size: 1rem; color: var(--primary); }
      p { margin: 0 0 0.75rem; font-size: 0.82rem; color: var(--text-muted); }
    }
    .loading-box { flex-direction: row; justify-content: center; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class TiposTelaListComponent implements OnInit {
  private catalogApi = inject(CatalogApiService);
  private toast = inject(ToastService);

  public tipos = signal<TipoTela[]>([]);
  public cargando = signal(true);
  public formularioAbierto = signal(false);
  public tipoEnEdicion = signal<TipoTela | null>(null);

  public busqueda = '';
  public estadoFiltro = '';
  public incluirInactivos = false;

  public filtrados = computed(() => {
    const query = this.busqueda.toLowerCase().trim();
    return this.tipos().filter((tipo) => {
      if (this.estadoFiltro && (tipo.estado || 'ACTIVO') !== this.estadoFiltro) return false;
      if (!query) return true;
      return [tipo.nombre, tipo.descripcion, tipo.cuidados_lavado]
        .some((valor) => (valor ?? '').toLowerCase().includes(query));
    });
  });

  ngOnInit(): void {
    this.cargar();
  }

  public cargar(): void {
    this.cargando.set(true);
    this.catalogApi.listarTiposTela(this.incluirInactivos).subscribe({
      next: (tipos) => {
        this.tipos.set(tipos);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudieron cargar los tipos de tela.');
      }
    });
  }

  public nuevo(): void {
    this.tipoEnEdicion.set(null);
    this.formularioAbierto.set(true);
  }

  public editar(tipo: TipoTela): void {
    this.tipoEnEdicion.set(tipo);
    this.formularioAbierto.set(true);
  }

  public cerrarFormulario(): void {
    this.formularioAbierto.set(false);
    this.tipoEnEdicion.set(null);
  }

  public alGuardar(tipo: TipoTela): void {
    this.cerrarFormulario();
    this.cargar();
  }

  public eliminar(tipo: TipoTela): void {
    if (!confirm(`¿Dar de baja el tipo de tela "${tipo.nombre}"?`)) return;
    this.catalogApi.eliminarTipoTela(tipo.id).subscribe({
      next: () => {
        this.toast.warning('Tipo de tela dado de baja.');
        this.cargar();
      },
      error: (err) => {
        const detalle = err?.error?.detail ?? err?.error?.message;
        this.toast.error(typeof detalle === 'string' ? detalle : 'No se pudo dar de baja el tipo de tela.');
      }
    });
  }
}
