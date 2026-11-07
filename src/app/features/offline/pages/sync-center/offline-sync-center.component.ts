import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SyncEngineService } from '../../../../core/offline/sync-engine.service';
import { ContadoresCola, OfflineQueueService, ResumenCola } from '../../../../core/offline/offline-queue.service';
import { ConflictService } from '../../../../core/offline/conflict.service';
import { ConnectivityService } from '../../../../core/offline/connectivity.service';
import { ToastService } from '../../../../core/services/toast.service';
import { OperacionOfflineLocal } from '../../../../core/models/offline.model';
import { SyncStatusBadgeComponent } from '../../../../shared/components/sync-status-badge/sync-status-badge.component';
import { QueueTableComponent } from '../../../../shared/components/queue-table/queue-table.component';

/**
 * [EXAMEN-2] CU08 / RF-030: centro de sincronización.
 * Contadores, cola FIFO, progreso del lote, reintento manual y resumen final.
 */
@Component({
  selector: 'app-offline-sync-center',
  standalone: true,
  imports: [CommonModule, RouterLink, SyncStatusBadgeComponent, QueueTableComponent],
  template: `
    <div class="offline-page">
      <div class="container offline-container">
        <header class="page-head">
          <div>
            <span class="eyebrow"><i class="ri-loop-left-line"></i> CU08 · Sincronización</span>
            <h1>Centro de sincronización</h1>
            <p>Las operaciones se envían en orden FIFO por <code>secuencia_local</code>, sin duplicados.</p>
          </div>
          <div class="head-acciones">
            <app-sync-status-badge [estado]="motor.estado()" [pendientes]="motor.pendientes()" [conflictos]="motor.conflictosPendientes()" />
            <button type="button" class="btn btn-accent btn-sm" [disabled]="sincronizando() || !enLinea()" (click)="sincronizar()">
              @if (sincronizando()) {
                <i class="ri-loader-4-line spin-icon"></i> Sincronizando…
              } @else {
                <i class="ri-refresh-line"></i> Sincronizar ahora
              }
            </button>
          </div>
        </header>

        @if (!enLinea()) {
          <div class="aviso aviso-warning">
            <i class="ri-wifi-off-line"></i>
            <div>
              <strong>Sin conexión</strong>
              <p>Las operaciones permanecen guardadas y se enviarán automáticamente al recuperar la red.</p>
            </div>
          </div>
        }

        <section class="contadores-grid">
          <article class="card contador-card">
            <span class="contador-label">Pendientes</span>
            <strong class="contador-valor">{{ contadores()?.pendientes ?? 0 }}</strong>
            <span class="contador-pie">Esperando envío</span>
          </article>
          <article class="card contador-card">
            <span class="contador-label">Sincronizando</span>
            <strong class="contador-valor text-info">{{ contadores()?.sincronizando ?? 0 }}</strong>
            <span class="contador-pie">En lote actual</span>
          </article>
          <article class="card contador-card">
            <span class="contador-label">Confirmadas</span>
            <strong class="contador-valor text-success">{{ contadores()?.confirmadas ?? 0 }}</strong>
            <span class="contador-pie">Aceptadas por el servidor</span>
          </article>
          <article class="card contador-card">
            <span class="contador-label">Conflictos</span>
            <strong class="contador-valor text-warning">{{ contadores()?.conflictos ?? 0 }}</strong>
            <span class="contador-pie">Requieren decisión</span>
          </article>
          <article class="card contador-card">
            <span class="contador-label">Rechazadas</span>
            <strong class="contador-valor text-danger">{{ (contadores()?.rechazadas ?? 0) + (contadores()?.erroresCriticos ?? 0) }}</strong>
            <span class="contador-pie">Con motivo registrado</span>
          </article>
          <article class="card contador-card">
            <span class="contador-label">Antigüedad</span>
            <strong class="contador-valor">{{ resumen()?.antiguedadDias ?? 0 }} d</strong>
            <span class="contador-pie">{{ resumen()?.masAntigua ? (resumen()?.masAntigua | date:'dd/MM/yy HH:mm') : 'Sin pendientes' }}</span>
          </article>
        </section>

        @if (sincronizando()) {
          <section class="card progreso-card">
            <div class="progreso-head">
              <strong>Enviando lote</strong>
              <span>{{ motor.progreso().enviadas }} / {{ motor.progreso().total }}</span>
            </div>
            <div class="progreso" role="progressbar" [attr.aria-valuenow]="porcentaje()" aria-valuemin="0" aria-valuemax="100">
              <div class="progreso-bar" [style.width.%]="porcentaje()"></div>
            </div>
          </section>
        }

        @if (motor.ultimoResultado(); as resultado) {
          <section class="card resumen-card" [class.is-empty]="resultado.vacio">
            <div class="resumen-head">
              <h2><i class="ri-file-chart-line"></i> Resumen del último lote</h2>
              <span class="badge" [ngClass]="resultado.vacio ? 'badge-info' : 'badge-synced'">
                {{ resultado.vacio ? 'Sin cambios' : 'Procesado' }}
              </span>
            </div>
            <p class="resumen-texto">{{ resultado.texto }}</p>
            @if (!resultado.vacio) {
              <div class="resumen-numeros">
                <span><strong>{{ resultado.recibidas }}</strong> recibidas</span>
                <span><strong>{{ resultado.procesadas }}</strong> procesadas</span>
                <span><strong>{{ resultado.confirmadas }}</strong> confirmadas</span>
                <span><strong>{{ resultado.duplicadas }}</strong> duplicadas</span>
                <span><strong>{{ resultado.rechazadas }}</strong> rechazadas</span>
                <span><strong>{{ resultado.conflictos }}</strong> conflictos</span>
                <span><strong>{{ resultado.erroresCriticos }}</strong> errores</span>
              </div>
            }
          </section>
        }

        @if (conflictosPendientes() > 0) {
          <div class="aviso aviso-conflicto">
            <i class="ri-error-warning-line"></i>
            <div>
              <strong>{{ conflictosPendientes() }} conflicto(s) sin resolver</strong>
              <p>Revisa la comparación local vs central antes de reintentar.</p>
            </div>
            <a routerLink="/offline/conflictos" class="btn btn-outline btn-sm">Resolver conflictos</a>
          </div>
        }

        <section class="card cola-card">
          <div class="cola-head">
            <div>
              <h2><i class="ri-list-ordered-2"></i> Cola local</h2>
              <p>{{ resumenCola()?.texto || 'Sin operaciones registradas.' }}</p>
            </div>
            <div class="cola-acciones">
              <button type="button" class="btn btn-outline btn-sm" (click)="refrescar()">
                <i class="ri-refresh-line"></i> Actualizar
              </button>
              <button type="button" class="btn btn-outline btn-sm" [disabled]="!enLinea() || sincronizando()" (click)="reintentarFallidas()">
                <i class="ri-restart-line"></i> Reintentar fallidas
              </button>
            </div>
          </div>

          <app-queue-table
            [operaciones]="operaciones()"
            [cargando]="cargando()"
            [procesando]="procesando()"
            mensajeVacio="La cola está vacía: todas las operaciones fueron confirmadas."
            (reintentar)="reintentar($event)"
            (verConflicto)="verConflicto($event)"
          ></app-queue-table>
        </section>

        @if (errores().length > 0) {
          <section class="card errores-card">
            <h2><i class="ri-error-warning-line"></i> Últimos errores</h2>
            <ul>
              @for (operacion of errores(); track operacion.uuid_operacion) {
                <li>
                  <strong>{{ operacion.tipo_operacion }}</strong>
                  <span>#{{ operacion.secuencia_local }} · {{ operacion.error_detalle || operacion.motivo_rechazo || 'Sin detalle' }}</span>
                </li>
              }
            </ul>
          </section>
        }
      </div>
    </div>
  `,
  styles: [`
    .offline-page { min-height: 100vh; background: var(--bg-main); padding: 2rem 0 4rem; }
    .offline-container { max-width: 1120px; margin: 0 auto; padding: 0 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .page-head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; flex-wrap: wrap; }
    .eyebrow { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.04em; }
    .page-head h1 { margin: 0.25rem 0 0; font-size: 1.9rem; font-weight: 800; color: var(--primary); }
    .page-head p { margin: 0.3rem 0 0; color: var(--text-muted); font-size: 0.9rem; }
    .page-head code { background: #f1f5f9; padding: 0.05rem 0.3rem; border-radius: 0.25rem; font-size: 0.8rem; }
    .head-acciones { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .aviso { display: flex; gap: 0.6rem; align-items: flex-start; padding: 0.75rem 0.9rem; border-radius: 0.65rem; font-size: 0.82rem; }
    .aviso-warning { background: #fffbeb; border: 1px solid #fcd34d; color: #92400e; }
    .aviso-conflicto { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; align-items: center; }
    .aviso-conflicto div { flex: 1; }
    .aviso p { margin: 0.15rem 0 0; }
    .contadores-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.7rem; }
    .contador-card { padding: 0.8rem 0.95rem; display: flex; flex-direction: column; gap: 0.1rem; }
    .contador-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; font-weight: 700; }
    .contador-valor { font-size: 1.55rem; font-weight: 800; color: var(--primary); line-height: 1.1; }
    .contador-pie { font-size: 0.68rem; color: #64748b; }
    .text-info { color: #2563eb; }
    .text-success { color: #16a34a; }
    .text-warning { color: #d97706; }
    .text-danger { color: #dc2626; }
    .progreso-card { padding: 0.9rem 1.1rem; }
    .progreso-head { display: flex; justify-content: space-between; font-size: 0.8rem; color: #475569; margin-bottom: 0.35rem; }
    .progreso { height: 9px; border-radius: 9999px; background: #e2e8f0; overflow: hidden; }
    .progreso-bar { height: 100%; background: linear-gradient(90deg, #3b82f6, #2563eb); transition: width 0.3s; }
    .resumen-card { padding: 1rem 1.2rem; }
    .resumen-card.is-empty { opacity: 0.85; }
    .resumen-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
    .resumen-head h2 { margin: 0; font-size: 0.95rem; color: var(--primary); display: inline-flex; gap: 0.35rem; align-items: center; }
    .resumen-texto { margin: 0.4rem 0; color: #475569; font-size: 0.84rem; }
    .resumen-numeros { display: flex; gap: 0.9rem; flex-wrap: wrap; font-size: 0.75rem; color: #475569; }
    .resumen-numeros strong { color: var(--primary); }
    .cola-card { padding: 1.1rem 1.2rem; }
    .cola-head { display: flex; justify-content: space-between; gap: 0.8rem; align-items: flex-start; flex-wrap: wrap; margin-bottom: 0.5rem; }
    .cola-head h2 { margin: 0; font-size: 1rem; color: var(--primary); display: inline-flex; gap: 0.35rem; align-items: center; }
    .cola-head p { margin: 0.2rem 0 0; color: #64748b; font-size: 0.78rem; }
    .cola-acciones { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .errores-card { padding: 1rem 1.2rem; }
    .errores-card h2 { margin: 0 0 0.5rem; font-size: 0.95rem; color: #991b1b; display: inline-flex; gap: 0.35rem; align-items: center; }
    .errores-card ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 0.35rem; }
    .errores-card li { display: flex; flex-direction: column; gap: 0.1rem; font-size: 0.75rem; color: #475569; }
  `]
})
export class OfflineSyncCenterComponent implements OnInit, OnDestroy {
  public motor = inject(SyncEngineService);
  private queue = inject(OfflineQueueService);
  private conflict = inject(ConflictService);
  private connectivity = inject(ConnectivityService);
  private toast = inject(ToastService);
  private router = inject(Router);

  enLinea = this.connectivity.enLinea;
  operaciones = signal<OperacionOfflineLocal[]>([]);
  contadores = signal<ContadoresCola | null>(null);
  resumenCola = signal<ResumenCola | null>(null);
  resumen = signal<ResumenCola | null>(null);
  conflictosPendientes = signal(0);
  cargando = signal(true);
  sincronizando = signal(false);
  procesando = signal<string | null>(null);

  private intervalo: ReturnType<typeof setInterval> | null = null;

  async ngOnInit(): Promise<void> {
    this.motor.iniciar();
    await this.refrescar();
    this.intervalo = setInterval(() => void this.refrescarContadores(), 15_000);
  }

  ngOnDestroy(): void {
    if (this.intervalo) clearInterval(this.intervalo);
  }

  porcentaje(): number {
    const progreso = this.motor.progreso();
    if (!progreso.total) return 5;
    return Math.min(100, Math.round((progreso.enviadas / progreso.total) * 100));
  }

  errores(): OperacionOfflineLocal[] {
    return this.operaciones().filter((operacion) =>
      ['RECHAZADA', 'ERROR_CRITICO'].includes(operacion.estado_sincronizacion)
        || !!operacion.error_detalle
    ).slice(0, 5);
  }

  async refrescar(): Promise<void> {
    this.cargando.set(true);
    try {
      const [operaciones, contadores, resumen, conflictos] = await Promise.all([
        this.queue.listarTodas(),
        this.queue.contadores(),
        this.queue.resumen(),
        this.conflict.contarPendientes()
      ]);
      this.operaciones.set(operaciones.sort((a, b) => a.secuencia_local - b.secuencia_local));
      this.contadores.set(contadores);
      this.resumenCola.set(resumen);
      this.resumen.set(resumen);
      this.conflictosPendientes.set(conflictos);
    } finally {
      this.cargando.set(false);
    }
  }

  async sincronizar(): Promise<void> {
    if (!this.enLinea()) {
      this.toast.warning('Sin conexión: la cola se enviará al recuperar la red.', 'No se puede sincronizar');
      return;
    }
    this.sincronizando.set(true);
    try {
      const resultado = await this.motor.sincronizarAhora();
      if (resultado && !resultado.vacio) {
        this.toast.success(resultado.texto, 'Sincronización completada');
      } else {
        this.toast.info('No hay operaciones pendientes.', 'Cola al día');
      }
    } catch (error) {
      this.toast.error(this.mensajeError(error), 'Error de sincronización');
    } finally {
      this.sincronizando.set(false);
      await this.refrescar();
    }
  }

  async reintentar(uuid: string): Promise<void> {
    this.procesando.set(uuid);
    try {
      const operacion = await this.queue.prepararReintento(uuid);
      if (!operacion) {
        this.toast.warning('La operación ya no existe en la cola.', 'No encontrada');
        return;
      }
      await this.sincronizar();
    } finally {
      this.procesando.set(null);
    }
  }

  async reintentarFallidas(): Promise<void> {
    this.sincronizando.set(true);
    try {
      const cantidad = await this.motor.reintentarFallidas();
      this.toast.info(`${cantidad} operación(es) preparadas para reintento.`, 'Reintento masivo');
      await this.sincronizar();
    } catch (error) {
      this.toast.error(this.mensajeError(error), 'No se pudo reintentar');
    } finally {
      this.sincronizando.set(false);
    }
  }

  verConflicto(operacion: OperacionOfflineLocal): void {
    this.router.navigate(['/offline/conflictos'], {
      queryParams: { uuid: operacion.uuid_operacion }
    });
  }

  private async refrescarContadores(): Promise<void> {
    await this.motor.refrescarContadores();
    this.conflictosPendientes.set(await this.conflict.contarPendientes());
  }

  private mensajeError(error: unknown): string {
    if (error instanceof Error) return error.message;
    const detalle = (error as { error?: { detail?: string } })?.error?.detail;
    return detalle ?? 'Error inesperado al sincronizar.';
  }
}
