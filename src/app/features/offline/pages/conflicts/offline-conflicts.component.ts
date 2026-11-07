import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ConflictService, ClasificacionConflicto } from '../../../../core/offline/conflict.service';
import { ConnectivityService } from '../../../../core/offline/connectivity.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LogConflicto } from '../../../../core/models/offline.model';
import {
  ConflictCardComponent,
  DecisionConflicto
} from '../../../../shared/components/conflict-card/conflict-card.component';

type FiltroEstado = 'PENDIENTES' | 'RESUELTOS' | 'TODOS';

/**
 * [EXAMEN-2] CU09: conflictos pendientes con comparación local vs central,
 * decisión sugerida, resolución manual y descarte.
 */
@Component({
  selector: 'app-offline-conflicts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ConflictCardComponent],
  template: `
    <div class="offline-page">
      <div class="container offline-container">
        <header class="page-head">
          <div>
            <span class="eyebrow"><i class="ri-error-warning-line"></i> CU09 · Conflictos</span>
            <h1>Conflictos de sincronización</h1>
            <p>Compara lo registrado localmente con el estado central antes de decidir.</p>
          </div>
          <div class="head-acciones">
            <span class="badge badge-conflict">{{ pendientes() }} pendientes</span>
            <button type="button" class="btn btn-outline btn-sm" (click)="cargar()">
              <i class="ri-refresh-line"></i> Actualizar
            </button>
          </div>
        </header>

        <section class="card filtros">
          <div class="filtro-grupo">
            <label class="form-label">Estado</label>
            <div class="segmentado">
              @for (opcion of filtrosEstado; track opcion.valor) {
                <button
                  type="button"
                  class="segmento"
                  [class.activo]="filtroEstado === opcion.valor"
                  (click)="cambiarEstado(opcion.valor)"
                >{{ opcion.etiqueta }}</button>
              }
            </div>
          </div>
          <div class="filtro-grupo">
            <label class="form-label">Tipo</label>
            <select class="form-control" [(ngModel)]="filtroTipo" (ngModelChange)="cargar()">
              <option value="">Todos los tipos</option>
              @for (tipo of tipos(); track tipo) {
                <option [value]="tipo">{{ tipo }}</option>
              }
            </select>
          </div>
        </section>

        @if (filtroUuid()) {
          <div class="aviso aviso-info">
            <i class="ri-filter-3-line"></i>
            Filtrando por operación <code>{{ filtroUuid() }}</code>.
            <button type="button" class="link-button" (click)="limpiarFiltro()">Quitar filtro</button>
          </div>
        }

        @if (cargando()) {
          <div class="estado"><i class="ri-loader-4-line spin-icon"></i> Cargando conflictos…</div>
        } @else if (conflictos().length === 0) {
          <div class="card estado-vacio">
            <i class="ri-checkbox-circle-line"></i>
            <h2>Sin conflictos {{ filtroEstado === 'RESUELTOS' ? 'resueltos' : 'pendientes' }}</h2>
            <p>La cola local está conciliada con el servidor.</p>
            <a routerLink="/offline/sincronizacion" class="btn btn-outline btn-sm">Volver al centro de sincronización</a>
          </div>
        } @else {
          <div class="conflictos-lista">
            @for (conflicto of conflictos(); track conflicto.id) {
              <app-conflict-card
                [conflicto]="conflicto"
                [clasificacion]="clasificacion(conflicto)"
                [comparacion]="comparacion(conflicto)"
                (resolver)="resolver($event)"
                (descartar)="descartar($event)"
              ></app-conflict-card>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .offline-page { min-height: 100vh; background: var(--bg-main); padding: 2rem 0 4rem; }
    .offline-container { max-width: 1000px; margin: 0 auto; padding: 0 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .page-head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; flex-wrap: wrap; }
    .eyebrow { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.04em; }
    .page-head h1 { margin: 0.25rem 0 0; font-size: 1.9rem; font-weight: 800; color: var(--primary); }
    .page-head p { margin: 0.3rem 0 0; color: var(--text-muted); font-size: 0.9rem; }
    .head-acciones { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .filtros { padding: 0.9rem 1rem; display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap; }
    .filtro-grupo { display: flex; flex-direction: column; gap: 0.3rem; min-width: 200px; }
    .filtro-grupo .form-label { margin: 0; font-size: 0.72rem; }
    .segmentado { display: inline-flex; border: 1px solid #cbd5e1; border-radius: 0.5rem; overflow: hidden; }
    .segmento { border: 0; background: #ffffff; padding: 0.4rem 0.8rem; font-size: 0.76rem; font-weight: 600; color: #475569; cursor: pointer; }
    .segmento.activo { background: var(--primary); color: #ffffff; }
    .aviso { display: flex; gap: 0.5rem; align-items: center; padding: 0.65rem 0.9rem; border-radius: 0.6rem; font-size: 0.8rem; }
    .aviso-info { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
    .aviso code { background: rgba(0,0,0,0.06); padding: 0.05rem 0.3rem; border-radius: 0.25rem; }
    .conflictos-lista { display: flex; flex-direction: column; gap: 0.8rem; }
    .estado { display: flex; justify-content: center; align-items: center; gap: 0.4rem; padding: 2rem; color: #64748b; }
    .estado-vacio { padding: 2.5rem 1.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
    .estado-vacio > i { font-size: 2.4rem; color: #16a34a; }
    .estado-vacio h2 { margin: 0; font-size: 1.05rem; color: var(--primary); }
    .estado-vacio p { margin: 0; color: #64748b; font-size: 0.82rem; }
    .link-button { border: 0; background: transparent; color: #1d4ed8; font-weight: 700; cursor: pointer; text-decoration: underline; font-size: 0.78rem; }
  `]
})
export class OfflineConflictsComponent implements OnInit {
  private conflict = inject(ConflictService);
  private connectivity = inject(ConnectivityService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);

  readonly filtrosEstado: Array<{ valor: FiltroEstado; etiqueta: string }> = [
    { valor: 'PENDIENTES', etiqueta: 'Pendientes' },
    { valor: 'RESUELTOS', etiqueta: 'Resueltos' },
    { valor: 'TODOS', etiqueta: 'Todos' }
  ];

  conflictos = signal<LogConflicto[]>([]);
  tipos = signal<string[]>([]);
  cargando = signal(true);
  pendientes = signal(0);
  filtroEstado: FiltroEstado = 'PENDIENTES';
  filtroTipo = '';
  filtroUuid = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    this.filtroUuid.set(this.route.snapshot.queryParamMap.get('uuid'));
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const resuelto = this.filtroEstado === 'RESUELTOS' ? true : this.filtroEstado === 'PENDIENTES' ? false : undefined;
      const filtros = {
        ...(resuelto !== undefined ? { resuelto } : {}),
        ...(this.filtroTipo ? { tipo: this.filtroTipo } : {})
      };

      let lista: LogConflicto[];
      if (this.filtroEstado === 'PENDIENTES') {
        lista = await this.conflict.listarPendientes(filtros);
      } else {
        lista = await this.conflict.listarLocal(filtros);
      }

      const uuid = this.filtroUuid();
      if (uuid) lista = lista.filter((conflicto) => conflicto.uuid_operacion === uuid);

      this.conflictos.set(lista);
      this.pendientes.set(await this.conflict.contarPendientes());
      await this.cargarTipos();
    } catch (error) {
      this.toast.error(this.mensajeError(error), 'No se pudieron cargar los conflictos');
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarEstado(estado: FiltroEstado): void {
    this.filtroEstado = estado;
    void this.cargar();
  }

  limpiarFiltro(): void {
    this.filtroUuid.set(null);
    void this.cargar();
  }

  clasificacion(conflicto: LogConflicto): ClasificacionConflicto {
    return this.conflict.clasificarLocal(conflicto);
  }

  comparacion(conflicto: LogConflicto): { local: string; central: string } | null {
    const detalle = conflicto.detalle_json ?? {};
    const local = detalle['local'] ?? detalle['payload'] ?? detalle['solicitado']
      ?? detalle['stock_local'] ?? detalle['precio_local'] ?? detalle['cantidad_local'];
    const central = detalle['central'] ?? detalle['servidor'] ?? detalle['disponible']
      ?? detalle['stock_central'] ?? detalle['precio_servidor'] ?? detalle['cantidad_central'];

    if (local === undefined && central === undefined) {
      if (Object.keys(detalle).length === 0) return null;
      return { local: this.formatear(detalle), central: 'Sin contraparte central registrada' };
    }
    return { local: this.formatear(local), central: this.formatear(central) };
  }

  async resolver(evento: DecisionConflicto): Promise<void> {
    try {
      await this.conflict.resolver(evento.id, evento.decision, evento.observacion);
      this.toast.success(`Conflicto #${evento.id} resuelto con decisión ${evento.decision}.`, 'Conflicto resuelto');
      await this.cargar();
    } catch (error) {
      this.toast.error(this.mensajeError(error), 'No se pudo resolver');
    }
  }

  async descartar(evento: { id: number; motivo?: string }): Promise<void> {
    try {
      await this.conflict.descartar(evento.id, evento.motivo);
      this.toast.info(`Conflicto #${evento.id} descartado.`, 'Conflicto descartado');
      await this.cargar();
    } catch (error) {
      this.toast.error(this.mensajeError(error), 'No se pudo descartar');
    }
  }

  private async cargarTipos(): Promise<void> {
    const resumen = await this.conflict.resumenPorTipo();
    this.tipos.set(Object.keys(resumen).sort());
  }

  private formatear(valor: unknown): string {
    if (valor === null || valor === undefined) return '—';
    if (typeof valor === 'object') {
      try {
        return JSON.stringify(valor, null, 2);
      } catch {
        return String(valor);
      }
    }
    return String(valor);
  }

  private mensajeError(error: unknown): string {
    if (error instanceof Error) return error.message;
    const detalle = (error as { error?: { detail?: string } })?.error?.detail;
    return detalle ?? 'Error inesperado al procesar conflictos.';
  }
}
