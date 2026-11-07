import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OfflineCatalogService } from '../../../../core/offline/offline-catalog.service';
import { StorageQuotaService, PlanDescargaSelectiva } from '../../../../core/offline/storage-quota.service';
import { ConnectivityService } from '../../../../core/offline/connectivity.service';
import { OfflineSessionService } from '../../../../core/offline/offline-session.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  ResultadoDescargaOffline,
  UsoAlmacenamientoLocal,
  VersionPaquete
} from '../../../../core/models/offline.model';
import { OfflineDataStampComponent } from '../../../../shared/components/offline-data-stamp/offline-data-stamp.component';
import { SyncStatusBadgeComponent } from '../../../../shared/components/sync-status-badge/sync-status-badge.component';

/**
 * [EXAMEN-2] CU05: descarga y estado de los datos locales.
 * Muestra progreso, resumen, peso, sello, última descarga completa y aviso
 * de lo que no estará disponible si la cuota obliga a una descarga selectiva.
 */
@Component({
  selector: 'app-offline-download',
  standalone: true,
  imports: [CommonModule, RouterLink, OfflineDataStampComponent, SyncStatusBadgeComponent],
  template: `
    <div class="offline-page">
      <div class="container offline-container">
        <header class="page-head">
          <div>
            <span class="eyebrow"><i class="ri-download-cloud-2-line"></i> CU05 · Datos sin conexión</span>
            <h1>Descarga offline</h1>
            <p>Prepara el catálogo, stock y clientes frecuentes para operar sin internet.</p>
          </div>
          <app-sync-status-badge [estado]="enLinea() ? 'ONLINE' : 'SIN_RED'" [compacto]="true" />
        </header>

        @if (!enLinea()) {
          <div class="aviso aviso-warning">
            <i class="ri-wifi-off-line"></i>
            <div>
              <strong>Sin conexión</strong>
              <p>No puedes descargar datos nuevos. Se muestra el último paquete guardado en este dispositivo.</p>
            </div>
          </div>
        }

        <section class="estado-grid">
          <article class="card estado-card">
            <span class="estado-icon"><i class="ri-database-2-line"></i></span>
            <div>
              <span class="estado-label">Sello de datos</span>
              @if (sello()) {
                <app-offline-data-stamp [fecha]="sello()" [version]="version()?.version ?? null" etiqueta="Última descarga" />
              } @else {
                <strong class="estado-empty">Sin descarga registrada</strong>
              }
            </div>
          </article>

          <article class="card estado-card">
            <span class="estado-icon"><i class="ri-hard-drive-2-line"></i></span>
            <div>
              <span class="estado-label">Almacenamiento local</span>
              @if (uso(); as medido) {
                <strong>{{ bytes(medido.usadoBytes) }} / {{ bytes(medido.limiteBytes) }}</strong>
                <div class="quota-bar">
                  <span [style.width.%]="medido.porcentaje" [class.is-high]="medido.porcentaje >= 85"></span>
                </div>
                <small>{{ medido.porcentaje }}% usado · {{ registros(medido) }} registros</small>
              } @else {
                <strong class="estado-empty">Midiendo…</strong>
              }
            </div>
          </article>

          <article class="card estado-card">
            <span class="estado-icon"><i class="ri-check-double-line"></i></span>
            <div>
              <span class="estado-label">Paquete</span>
              <strong>{{ datosCompletos() ? 'Completo' : 'Incompleto o parcial' }}</strong>
              <small>{{ version()?.fecha_corte ? (version()?.fecha_corte | date:'dd/MM/yyyy HH:mm') : 'Sin fecha de corte' }}</small>
            </div>
          </article>
        </section>

        <section class="card descarga-card">
          <div class="descarga-head">
            <div>
              <h2>Descargar datos</h2>
              <p>La descarga completa reemplaza el paquete; la incremental solo trae cambios.</p>
            </div>
            <span class="limite-chip"><i class="ri-hard-drive-line"></i> Límite {{ limiteMb() }} MB</span>
          </div>

          @if (descargando()) {
            <div class="progreso" role="progressbar" [attr.aria-valuenow]="progreso()" aria-valuemin="0" aria-valuemax="100">
              <div class="progreso-bar" [style.width.%]="progreso()"></div>
            </div>
            <p class="progreso-texto"><i class="ri-loader-4-line spin-icon"></i> {{ mensajeProgreso() }}</p>
          } @else {
            <div class="descarga-acciones">
              <button type="button" class="btn btn-accent" [disabled]="!enLinea()" (click)="descargar(true)">
                <i class="ri-download-cloud-2-line"></i> Descarga completa
              </button>
              <button type="button" class="btn btn-outline" [disabled]="!enLinea()" (click)="descargar(false)">
                <i class="ri-refresh-line"></i> Descarga incremental
              </button>
              <button type="button" class="btn btn-outline" [disabled]="!enLinea()" (click)="descargarStock()">
                <i class="ri-archive-stack-line"></i> Solo stock
              </button>
              <button type="button" class="btn btn-outline" [disabled]="!enLinea()" (click)="descargarClientes()">
                <i class="ri-user-heart-line"></i> Clientes frecuentes
              </button>
            </div>
          }

          @if (planSelectivo(); as plan) {
            <div class="aviso aviso-warning">
              <i class="ri-alert-line"></i>
              <div>
                <strong>Espacio insuficiente</strong>
                <p>{{ plan.mensaje }}</p>
                <p>Se priorizarán {{ plan.prioridad.length }} variantes con mayor rotación; el resto no estará disponible offline.</p>
              </div>
              <button type="button" class="btn btn-outline btn-sm" (click)="limpiar()">
                <i class="ri-broom-line"></i> Liberar espacio
              </button>
            </div>
          }

          @if (resultado(); as res) {
            <div class="resumen-descarga">
              <div class="resumen-head">
                <h3><i class="ri-checkbox-circle-line"></i> Resumen de la descarga</h3>
                <span class="badge" [ngClass]="res.completa ? 'badge-synced' : 'badge-warning'">
                  {{ res.completa ? 'Completa' : 'Parcial' }}
                </span>
              </div>
              <div class="resumen-grid">
                <div><span>Productos</span><strong>{{ res.productos }}</strong></div>
                <div><span>Variantes</span><strong>{{ res.variantes }}</strong></div>
                <div><span>Stock</span><strong>{{ res.stock }}</strong></div>
                <div><span>Clientes</span><strong>{{ res.clientes }}</strong></div>
                <div><span>Promociones</span><strong>{{ res.promociones }}</strong></div>
                <div><span>Peso</span><strong>{{ bytes(res.bytes) }}</strong></div>
              </div>
              <small class="resumen-fecha">Descargado el {{ res.fecha | date:'dd/MM/yyyy HH:mm' }} · versión {{ res.version }}</small>
            </div>
          }
        </section>

        <section class="card aviso-offline">
          <h3><i class="ri-information-line"></i> ¿Qué no estará disponible sin conexión?</h3>
          <ul>
            <li>Los cupones y promociones que requieren validación del servidor (RN-014).</li>
            <li>El pago con tarjeta en línea; se usa pago diferido al recuperar la red.</li>
            <li>El catálogo completo si la cuota de almacenamiento solo permitió una descarga selectiva.</li>
          </ul>
          <div class="aviso-acciones">
            <a routerLink="/offline/catalogo" class="btn btn-outline btn-sm">
              <i class="ri-search-eye-line"></i> Consultar catálogo local
            </a>
            @if (offlineSession.haySesionOffline()) {
              <a routerLink="/offline/sincronizacion" class="btn btn-outline btn-sm">
                <i class="ri-loop-left-line"></i> Centro de sincronización
              </a>
            } @else {
              <a routerLink="/offline/acceso" class="btn btn-outline btn-sm">
                <i class="ri-shield-keyhole-line"></i> Activar sesión offline
              </a>
            }
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .offline-page { min-height: 100vh; background: var(--bg-main); padding: 2rem 0 4rem; }
    .offline-container { max-width: 1080px; margin: 0 auto; padding: 0 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
    .page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
    .eyebrow { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.04em; }
    .page-head h1 { margin: 0.25rem 0 0; font-size: 1.9rem; font-weight: 800; color: var(--primary); }
    .page-head p { margin: 0.3rem 0 0; color: var(--text-muted); font-size: 0.9rem; }
    .estado-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
    .estado-card { padding: 1rem 1.1rem; display: flex; align-items: flex-start; gap: 0.8rem; }
    .estado-icon { width: 40px; height: 40px; border-radius: 0.7rem; background: #f1f5f9; display: inline-flex; align-items: center; justify-content: center; font-size: 1.15rem; color: var(--accent); flex: 0 0 auto; }
    .estado-label { display: block; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; margin-bottom: 0.2rem; }
    .estado-card strong { display: block; font-size: 0.95rem; color: var(--primary); }
    .estado-card small { color: #64748b; font-size: 0.74rem; }
    .estado-empty { color: #94a3b8 !important; font-weight: 600; }
    .quota-bar { height: 6px; border-radius: 9999px; background: #e2e8f0; margin: 0.35rem 0; overflow: hidden; }
    .quota-bar span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #22c55e, #16a34a); transition: width 0.3s; }
    .quota-bar span.is-high { background: linear-gradient(90deg, #f59e0b, #ef4444); }
    .descarga-card { padding: 1.4rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .descarga-head { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .descarga-head h2 { margin: 0; font-size: 1.1rem; color: var(--primary); }
    .descarga-head p { margin: 0.2rem 0 0; color: var(--text-muted); font-size: 0.82rem; }
    .limite-chip { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0.6rem; border-radius: 9999px; background: #f1f5f9; font-size: 0.72rem; font-weight: 700; color: #475569; }
    .descarga-acciones { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .progreso { height: 10px; border-radius: 9999px; background: #e2e8f0; overflow: hidden; }
    .progreso-bar { height: 100%; background: linear-gradient(90deg, var(--accent), #db2777); transition: width 0.35s; }
    .progreso-texto { margin: 0; display: flex; align-items: center; gap: 0.4rem; color: #475569; font-size: 0.82rem; }
    .aviso { display: flex; gap: 0.65rem; align-items: flex-start; padding: 0.85rem 1rem; border-radius: 0.7rem; font-size: 0.82rem; }
    .aviso-warning { background: #fffbeb; border: 1px solid #fcd34d; color: #92400e; }
    .aviso p { margin: 0.2rem 0 0; }
    .resumen-descarga { background: #f8fafc; border-radius: 0.75rem; padding: 1rem; }
    .resumen-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
    .resumen-head h3 { margin: 0; font-size: 0.95rem; color: var(--primary); display: inline-flex; gap: 0.3rem; align-items: center; }
    .resumen-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 0.6rem; margin-top: 0.7rem; }
    .resumen-grid div { background: #ffffff; border-radius: 0.5rem; padding: 0.5rem 0.65rem; display: flex; flex-direction: column; gap: 0.1rem; }
    .resumen-grid span { font-size: 0.68rem; text-transform: uppercase; color: #94a3b8; font-weight: 700; }
    .resumen-grid strong { font-size: 1rem; color: var(--primary); }
    .resumen-fecha { display: block; margin-top: 0.6rem; color: #64748b; font-size: 0.72rem; }
    .aviso-offline { padding: 1.2rem 1.4rem; }
    .aviso-offline h3 { margin: 0 0 0.5rem; font-size: 1rem; color: var(--primary); display: inline-flex; gap: 0.35rem; align-items: center; }
    .aviso-offline ul { margin: 0; padding-left: 1.2rem; color: #475569; font-size: 0.84rem; display: flex; flex-direction: column; gap: 0.3rem; }
    .aviso-acciones { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.9rem; }
    @media (max-width: 640px) { .descarga-acciones .btn { flex: 1 1 100%; } }
  `]
})
export class OfflineDownloadComponent implements OnInit {
  private catalog = inject(OfflineCatalogService);
  private quota = inject(StorageQuotaService);
  private connectivity = inject(ConnectivityService);
  public offlineSession = inject(OfflineSessionService);
  private toast = inject(ToastService);

  enLinea = this.connectivity.enLinea;
  sello = signal<string | null>(null);
  version = signal<VersionPaquete | null>(null);
  uso = signal<UsoAlmacenamientoLocal | null>(null);
  datosCompletos = signal(false);
  descargando = signal(false);
  progreso = signal(0);
  mensajeProgreso = signal('Preparando descarga…');
  resultado = signal<ResultadoDescargaOffline | null>(null);
  planSelectivo = signal<PlanDescargaSelectiva | null>(null);

  async ngOnInit(): Promise<void> {
    await this.cargarEstado();
  }

  limiteMb(): number {
    return this.catalog.limiteMb();
  }

  bytes(valor: number): string {
    if (!Number.isFinite(valor) || valor <= 0) return '0 MB';
    if (valor < 1024 * 1024) return `${(valor / 1024).toFixed(1)} KB`;
    return `${(valor / (1024 * 1024)).toFixed(1)} MB`;
  }

  registros(uso: UsoAlmacenamientoLocal): number {
    return uso.almacenes.reduce((total, almacen) => total + almacen.registros, 0);
  }

  async descargar(completo: boolean): Promise<void> {
    this.planSelectivo.set(null);
    await this.ejecutarDescarga(
      () => this.catalog.descargarPaquete({ completo }),
      completo ? 'Descargando paquete completo…' : 'Descargando cambios incrementales…'
    );
  }

  async descargarStock(): Promise<void> {
    await this.ejecutarDescarga(
      async () => {
        const stock = await this.catalog.descargarStock();
        return {
          version: this.version()?.version ?? 'stock',
          productos: 0,
          variantes: 0,
          stock,
          clientes: 0,
          promociones: 0,
          bytes: stock * 256,
          completa: false,
          fecha: new Date().toISOString()
        } satisfies ResultadoDescargaOffline;
      },
      'Actualizando stock local…'
    );
  }

  async descargarClientes(): Promise<void> {
    await this.ejecutarDescarga(
      async () => {
        const clientes = await this.catalog.descargarClientesFrecuentes();
        return {
          version: this.version()?.version ?? 'clientes',
          productos: 0,
          variantes: 0,
          stock: 0,
          clientes,
          promociones: 0,
          bytes: clientes * 512,
          completa: false,
          fecha: new Date().toISOString()
        } satisfies ResultadoDescargaOffline;
      },
      'Descargando clientes frecuentes…'
    );
  }

  async limpiar(): Promise<void> {
    const resultado = await this.quota.limpiarSincronizados();
    this.toast.success(
      `Liberados ${this.bytes(resultado.bytesLiberadosEstimados)} sin tocar operaciones pendientes.`,
      'Limpieza completada'
    );
    await this.cargarEstado();
  }

  private async ejecutarDescarga(
    tarea: () => Promise<ResultadoDescargaOffline>,
    mensaje: string
  ): Promise<void> {
    if (!this.enLinea()) {
      this.toast.warning('Necesitas conexión para descargar datos.', 'Sin conexión');
      return;
    }

    this.descargando.set(true);
    this.progreso.set(8);
    this.mensajeProgreso.set(mensaje);
    const temporizador = setInterval(() => {
      this.progreso.update((valor) => Math.min(90, valor + 7));
    }, 350);

    try {
      const res = await tarea();
      this.resultado.set(res);
      this.progreso.set(100);
      this.mensajeProgreso.set('Descarga completada.');
      this.toast.success(`${res.productos} productos y ${res.variantes} variantes disponibles offline.`, 'Datos descargados');
      await this.cargarEstado();
    } catch (error) {
      this.toast.error(this.mensajeError(error), 'No se pudo descargar');
    } finally {
      clearInterval(temporizador);
      setTimeout(() => {
        this.descargando.set(false);
        this.progreso.set(0);
      }, 450);
    }
  }

  private async cargarEstado(): Promise<void> {
    const [sello, version, uso, completos] = await Promise.all([
      this.catalog.selloActual(),
      this.catalog.versionLocal(),
      this.quota.medirUso(),
      this.catalog.datosCompletos()
    ]);
    this.sello.set(sello);
    this.version.set(version);
    this.uso.set(uso);
    this.datosCompletos.set(completos);
  }

  private mensajeError(error: unknown): string {
    if (error instanceof Error) return error.message;
    const detalle = (error as { error?: { detail?: string } })?.error?.detail;
    return detalle ?? 'Error inesperado al descargar los datos.';
  }
}
