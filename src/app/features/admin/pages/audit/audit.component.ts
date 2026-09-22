import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditService } from '../../../../core/services/audit.service';
import { BitacoraEntry, BitacoraFilter } from '../../../../core/models/audit.model';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  template: `
    <div class="audit-container animate-fade-in">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Bitácora de Auditoría del Sistema</h1>
          <p class="page-subtitle">Registro inmutable y trazabilidad de eventos de seguridad y operaciones críticas</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" (click)="exportarCsv()">
            <i class="ri-download-2-line"></i> Exportar Bitácora CSV
          </button>
          <button class="btn btn-primary" (click)="cargarLogs()">
            <i class="ri-refresh-line"></i> Actualizar
          </button>
        </div>
      </div>

      <!-- Filters Bar -->
      <div class="card filter-bar">
        <div class="filter-group">
          <label>Acción / Evento</label>
          <input type="text" class="form-control" [(ngModel)]="filter.accion" placeholder="LOGIN, CREAR, ACTUALIZAR..." (keyup.enter)="cargarLogs()" />
        </div>
        <div class="filter-group">
          <label>Tabla / Módulo</label>
          <input type="text" class="form-control" [(ngModel)]="filter.tabla" placeholder="usuarios, productos, ordenes..." (keyup.enter)="cargarLogs()" />
        </div>
        <div class="filter-group">
          <label>Fecha Desde</label>
          <input type="date" class="form-control" [(ngModel)]="filter.fecha_inicio" (change)="cargarLogs()" />
        </div>
        <div class="filter-group">
          <label>Fecha Hasta</label>
          <input type="date" class="form-control" [(ngModel)]="filter.fecha_fin" (change)="cargarLogs()" />
        </div>
        <div class="filter-actions">
          <button class="btn btn-secondary" (click)="limpiarFiltros()">
            <i class="ri-filter-off-line"></i> Limpiar
          </button>
          <button class="btn btn-primary" (click)="cargarLogs()">
            <i class="ri-search-line"></i> Filtrar
          </button>
        </div>
      </div>

      <!-- Logs Table -->
      <div class="card table-card">
        @if (loading()) {
          <div class="loading-box">
            <i class="ri-loader-4-line ri-spin"></i>
            <span>Consultando registros de auditoría...</span>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Fecha & Hora</th>
                  <th>Usuario</th>
                  <th>Acción Realizada</th>
                  <th>Módulo / Tabla</th>
                  <th>ID Registro</th>
                  <th>IP Origen</th>
                  <th class="text-right">Detalles</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of paginatedLogs(); track entry.id) {
                  <tr>
                    <td class="whitespace-nowrap font-mono text-xs">
                      {{ entry.created_at | date:'dd/MM/yyyy HH:mm:ss' }}
                    </td>
                    <td>
                      <div class="user-cell">
                        <div class="avatar-circle">
                          {{ (entry.usuario_nombre || 'S')[0] | uppercase }}
                        </div>
                        <div>
                          <span class="user-name">{{ entry.usuario_nombre || 'Sistema / Anónimo' }}</span>
                          @if (entry.usuario_id) {
                            <span class="user-id">#ID: {{ entry.usuario_id }}</span>
                          }
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="action-tag" [ngClass]="getActionClass(entry.accion)">
                        {{ entry.accion }}
                      </span>
                    </td>
                    <td>
                      <span class="table-tag">{{ entry.tabla_afectada || 'General' }}</span>
                    </td>
                    <td>
                      @if (entry.registro_id !== undefined && entry.registro_id !== null) {
                        <span class="font-mono">#{{ entry.registro_id }}</span>
                      } @else {
                        <span class="text-muted">-</span>
                      }
                    </td>
                    <td class="font-mono text-xs">{{ entry.ip_origen || '127.0.0.1' }}</td>
                    <td class="text-right">
                      <button class="btn-icon" title="Ver valores modificados" (click)="verDetalle(entry)">
                        <i class="ri-file-search-line"></i>
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="text-center py-5 text-muted">
                      <i class="ri-shield-check-line text-2xl d-block mb-1"></i>
                      No se encontraron registros de auditoría con los filtros aplicados.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Paginación de Bitácora -->
          <app-pagination
            [currentPage]="currentPage()"
            [totalItems]="logs().length"
            [pageSize]="pageSize()"
            [pageSizeOptions]="[10, 15, 25, 50, 100]"
            (pageChange)="onPageChange($event)"
            (pageSizeChange)="onPageSizeChange($event)"
          ></app-pagination>
        }
      </div>

      <!-- Modal Detalle de Auditoría -->
      @if (selectedEntry()) {
        <div class="modal-backdrop" (click)="selectedEntry.set(null)">
          <div class="modal-card modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-header-title">
                <i class="ri-shield-keyhole-line text-primary text-xl"></i>
                <h3>Detalle de Evento de Auditoría #{{ selectedEntry()?.id }}</h3>
              </div>
              <button class="btn-close" (click)="selectedEntry.set(null)"><i class="ri-close-line"></i></button>
            </div>
            <div class="modal-body">
              <div class="audit-meta-grid">
                <div><strong>Acción:</strong> {{ selectedEntry()?.accion }}</div>
                <div><strong>Fecha:</strong> {{ selectedEntry()?.created_at | date:'dd/MM/yyyy HH:mm:ss' }}</div>
                <div><strong>Usuario:</strong> {{ selectedEntry()?.usuario_nombre || 'Sistema' }}</div>
                <div><strong>Tabla/Entidad:</strong> {{ selectedEntry()?.tabla_afectada || 'N/A' }}</div>
                <div><strong>IP:</strong> {{ selectedEntry()?.ip_origen || selectedEntry()?.ip_address || 'N/A' }}</div>
                <div><strong>ID Registro:</strong> {{ selectedEntry()?.registro_id !== undefined && selectedEntry()?.registro_id !== null ? '#' + selectedEntry()?.registro_id : 'N/A' }}</div>
              </div>

              @if (tieneDiff()) {
                <div class="diff-container mt-4">
                  <div class="diff-col diff-col-full">
                    <h4>Cambios (Anterior → Nuevo)</h4>
                    <pre class="json-viewer">{{ cambiosDiff() }}</pre>
                  </div>
                </div>
              } @else {
                <div class="detail-box mt-4">
                  <h4>Detalle del Evento</h4>
                  <p class="detail-text">{{ selectedEntry()?.detalles || 'Sin detalle registrado para este evento.' }}</p>
                </div>
              }
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="selectedEntry.set(null)">Cerrar</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .audit-container {
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .page-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .page-subtitle {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0.25rem 0 0 0;
    }
    .header-actions { display: flex; gap: 0.75rem; }
    .filter-bar {
      display: flex;
      align-items: flex-end;
      gap: 1rem;
      padding: 1rem 1.25rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 180px;
    }
    .filter-group label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
    }
    .filter-actions { display: flex; gap: 0.5rem; }
    .table-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .data-table th, .data-table td {
      padding: 0.875rem 1rem;
      border-bottom: 1px solid #e2e8f0;
      font-size: 0.875rem;
    }
    .data-table th {
      background: #f8fafc;
      font-weight: 600;
      color: #475569;
    }
    .user-cell {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .avatar-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #e2e8f0;
      color: #334155;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.8125rem;
    }
    .user-name { font-weight: 500; font-size: 0.875rem; display: block; }
    .user-id { font-size: 0.75rem; color: #94a3b8; }
    .action-tag {
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.75rem;
    }
    .action-tag.action-login { background: #dbeafe; color: #1e40af; }
    .action-tag.action-create { background: #dcfce7; color: #166534; }
    .action-tag.action-update { background: #fef3c7; color: #92400e; }
    .action-tag.action-delete { background: #fee2e2; color: #991b1b; }
    .action-tag.action-default { background: #f1f5f9; color: #475569; }
    .table-tag {
      font-family: monospace;
      font-size: 0.8125rem;
      background: #f1f5f9;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
    }
    .btn-icon {
      background: none;
      border: 1px solid #e2e8f0;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #475569;
      transition: all 0.2s;
    }
    .btn-icon:hover {
      background: #f8fafc;
      color: #0f172a;
      border-color: #cbd5e1;
    }
    .loading-box {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      gap: 0.75rem;
      color: #64748b;
    }
    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 1rem;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 16px;
      width: 100%;
      max-width: 600px;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
    }
    .modal-lg { max-width: 800px; }
    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-header-title { display: flex; align-items: center; gap: 0.5rem; }
    .modal-header h3 { margin: 0; font-size: 1.125rem; }
    .modal-body { padding: 1.5rem; }
    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
    }
    .audit-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      font-size: 0.875rem;
      background: #f8fafc;
      padding: 1rem;
      border-radius: 8px;
    }
    .diff-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .detail-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1rem 1.25rem;
    }
    .detail-box h4 { margin: 0 0 0.5rem 0; font-size: 0.875rem; color: #475569; }
    .detail-text {
      margin: 0;
      font-size: 0.875rem;
      color: #0f172a;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .diff-col h4 { margin: 0 0 0.5rem 0; font-size: 0.875rem; color: #475569; }
    .diff-col-full { grid-column: 1 / -1; }
    .json-viewer {
      background: #0f172a;
      color: #38bdf8;
      padding: 0.75rem;
      border-radius: 8px;
      font-size: 0.75rem;
      height: 180px;
      overflow: auto;
    }
  `]
})
export class AuditComponent implements OnInit {
  private auditService = inject(AuditService);

  logs = signal<BitacoraEntry[]>([]);
  loading = signal<boolean>(false);
  selectedEntry = signal<BitacoraEntry | null>(null);

  // Paginación (15 filas por defecto)
  currentPage = signal<number>(1);
  pageSize = signal<number>(15);

  filter: BitacoraFilter = {
    skip: 0,
    limit: 100,
    accion: '',
    tabla: '',
    fecha_inicio: '',
    fecha_fin: ''
  };

  paginatedLogs = computed(() => {
    const list = this.logs();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  ngOnInit(): void {
    this.cargarLogs();
  }

  cargarLogs() {
    this.loading.set(true);
    this.auditService.getLogs(this.filter).subscribe({
      next: (data) => {
        this.logs.set(data);
        this.currentPage.set(1);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar bitácora', err);
        this.loading.set(false);
      }
    });
  }

  limpiarFiltros() {
    this.filter = {
      skip: 0,
      limit: 100,
      accion: '',
      tabla: '',
      fecha_inicio: '',
      fecha_fin: ''
    };
    this.currentPage.set(1);
    this.cargarLogs();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  exportarCsv() {
    this.auditService.exportCsv().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bitacora_auditoria_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Error al exportar CSV de bitácora', err)
    });
  }

    verDetalle(entry: BitacoraEntry) {
    this.selectedEntry.set(entry);
  }

  /** ¿Tiene diff antes/después? (filas viejas solo traen texto en Detalles). */
  tieneDiff(): boolean {
    const e = this.selectedEntry();
    return !!(e && (e.valores_anteriores || e.valores_nuevos));
  }

  /** Lista solo los campos que cambiaron: "campo: antes → después". */
  cambiosDiff(): string {
    const e = this.selectedEntry();
    const ant: Record<string, any> = (e?.valores_anteriores as any) || {};
    const nue: Record<string, any> = (e?.valores_nuevos as any) || {};
    const keys = Array.from(new Set([...Object.keys(ant), ...Object.keys(nue)]));
    const changed = keys.filter(k => JSON.stringify(ant[k]) !== JSON.stringify(nue[k]));
    if (changed.length === 0) return 'Sin cambios detectados.';
    const fmt = (v: any) => v === undefined || v === null || v === '' ? '—' : String(v);
    return changed.map(k => `${k}: ${fmt(ant[k])} → ${fmt(nue[k])}`).join('\n');
  }

  getActionClass(accion: string): string {
    const act = (accion || '').toUpperCase();
    if (act.includes('LOGIN') || act.includes('AUTH') || act.includes('INICIO_SESION')) return 'action-login';
    if (act.includes('CREAR') || act.includes('CREATE') || act.includes('REGISTRO')) return 'action-create';
    if (act.includes('ACTUALIZAR') || act.includes('UPDATE') || act.includes('MODIFICAR')) return 'action-update';
    if (act.includes('ELIMINAR') || act.includes('DELETE') || act.includes('CANCELAR')) return 'action-delete';
    return 'action-default';
  }
}
