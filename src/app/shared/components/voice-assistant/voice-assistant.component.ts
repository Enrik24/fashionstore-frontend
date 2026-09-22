import { Component, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService } from '../../../core/services/ai.service';
import { VoiceReportService } from '../../../core/services/voice-report.service';
import { ToastService } from '../../../core/services/toast.service';
import { ExportButtonsComponent } from '../export-buttons/export-buttons.component';
import { TipoReporteExport } from '../../../core/models/export.model';

@Component({
  selector: 'app-voice-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, ExportButtonsComponent],
  template: `
    <div class="voice-box card">
      <div class="voice-header">
        <h3 class="card-title"><i class="ri-mic-line text-primary"></i> Reporte por voz o texto</h3>
        <span class="badge-ai"><i class="ri-sparkle-fill"></i> IA Asistente</span>
      </div>
      <p class="hint">1) Dicta o escribe tu comando · 2) La IA genera y almacena el reporte · 3) Revisa y descárgalo en el formato que elijas.</p>
      <p class="hint examples-hint">Ej.: "Genera un reporte de inventarios", "Ventas de esta semana en excel", "Reservas de ayer en pdf".</p>

      <div class="voice-row">
        <button type="button" class="btn"
                [class.btn-danger]="voice.isRecording()"
                [class.btn-warning]="voice.isProcessing()"
                [class.btn-primary]="!voice.isRecording() && !voice.isProcessing()"
                (click)="toggleMic()"
                [disabled]="loading() || voice.isProcessing()"
                [title]="voice.isSupported() ? 'Dictar el comando por micrófono' : 'Este navegador no soporta dictado por voz'">
          @if (voice.isProcessing()) {
            <i class="ri-loader-4-line ri-spin"></i> Procesando voz…
          } @else if (voice.isRecording()) {
            <i class="ri-stop-line"></i> Detener dictado
          } @else {
            <i class="ri-mic-line"></i> Dictar por micrófono
          }
        </button>

        <button type="button" class="btn btn-secondary" (click)="ejecutar()" [disabled]="loading() || voice.isRecording() || voice.isProcessing() || !prompt().trim()">
          @if (loading()) { <i class="ri-loader-4-line ri-spin"></i> Generando reporte… } @else { <i class="ri-sparkle-line"></i> Generar reporte }
        </button>

        @if (resultado() || prompt()) {
          <button type="button" class="btn btn-outline btn-sm ml-auto" (click)="limpiar()" title="Limpiar consulta y resultado">
            <i class="ri-refresh-line"></i> Nueva consulta
          </button>
        }
      </div>

      @if (!voice.isSupported()) {
        <p class="hint warn"><i class="ri-information-line"></i> Tu navegador no soporta dictado Web Speech nativo (usa Chrome o Edge); escribe el comando manualmente en el cuadro.</p>
      }

      @if (voice.isRecording()) {
        <div class="interim-banner recording animate-pulse">
          <i class="ri-record-circle-fill text-danger"></i>
          <div>
            <strong>Escuchando:</strong> “{{ prompt() || 'Habla ahora tu comando…' }}”
            <div class="interim-sub">Habla con claridad. El reporte se generará automáticamente al terminar o puedes pulsar "Detener dictado".</div>
          </div>
        </div>
      }

      @if (voice.isProcessing()) {
        <div class="interim-banner processing">
          <i class="ri-loader-4-line ri-spin text-warning"></i>
          <div>Transcribiendo comando de voz… un momento por favor.</div>
        </div>
      }

      <textarea class="form-control" rows="2" [ngModel]="prompt()" (ngModelChange)="prompt.set($event)"
                placeholder="Escribe o dicta tu comando aquí (ej.: Genera un reporte de inventario)..."
                aria-label="Comando de voz o texto"
                (keydown.enter)="onEnterPressed($event)"></textarea>

      <div class="examples">
        <span class="examples-label"><i class="ri-lightbulb-line"></i> Sugerencias:</span>
        @for (e of ejemplos; track e) {
          <button type="button" class="chip" (click)="usarEjemplo(e)">{{ e }}</button>
        }
      </div>

      @if (error()) {
        <div class="alert alert-danger" role="alert">
          <i class="ri-error-warning-line"></i> {{ error() }}
        </div>
      }

      <!-- RESULTADO DEL REPORTE DIRECTAMENTE VISIBLE -->
      @if (resultado()) {
        <div class="result-card animate-fade-in">
          <!-- Encabezado del reporte -->
          <div class="result-header">
            <div class="result-title-group">
              <span class="badge badge-type">{{ resultado()!.tipo_reporte }}</span>
              <h4 class="result-title">
                <i class="ri-checkbox-circle-fill text-success"></i>
                Reporte de {{ resultado()!.tipo_reporte | titlecase }}
                <small class="report-id">ID #{{ resultado()!.reporte_guardado_id ?? 'Auto' }}</small>
              </h4>
            </div>

            <button type="button" class="btn btn-outline-primary btn-sm" (click)="irATab(exportTipo())">
              <i class="ri-dashboard-line"></i> Abrir pestaña {{ exportTipo() | titlecase }}
            </button>
          </div>

          <!-- Interpretación de la IA -->
          <div class="interpretation-box">
            <i class="ri-robot-2-line interp-icon"></i>
            <div class="interp-content">
              <strong>Interpretación de la IA:</strong>
              <p class="interp-text">{{ resultado()!.interpretacion }}</p>
              @if (resultado()!.fecha_inicio || resultado()!.fecha_fin) {
                <span class="interp-meta"><i class="ri-calendar-line"></i> Rango: {{ rangoTexto() }}</span>
              }
            </div>
          </div>

          <!-- BARRA DE ACCIONES DE EXPORTACIÓN (DESTACADA) -->
          <div class="export-banner">
            <div class="export-header-row">
              <div class="export-title">
                <i class="ri-download-cloud-2-line text-primary"></i>
                <span><strong>Elige el formato de descarga:</strong></span>
              </div>
              @if (resultado()!.formato_sugerido) {
                <span class="badge-sugerido">
                  <i class="ri-sparkle-fill"></i> Sugerido por tu comando: <strong>{{ resultado()!.formato_sugerido }}</strong>
                </span>
              }
            </div>
            <div class="export-buttons-wrap">
              <app-export-buttons [tipo]="exportTipo()" [filtros]="exportFiltros()" />
            </div>
          </div>

          <!-- VISTA DE DATOS SEGÚN EL TIPO -->
          <!-- 1. Caso INVENTARIO -->
          @if (exportTipo() === 'inventario') {
            <div class="data-preview-section">
              <div class="kpi-mini-grid">
                <div class="kpi-mini-box">
                  <span class="kpi-mini-label">Total Ítems Registrados</span>
                  <span class="kpi-mini-val">{{ resultado()!.datos?.total_items_registrados ?? 0 }}</span>
                </div>
                <div class="kpi-mini-box">
                  <span class="kpi-mini-label">Unidades Disponibles</span>
                  <span class="kpi-mini-val text-primary">{{ resultado()!.datos?.total_unidades_disponibles ?? 0 }}</span>
                </div>
                <div class="kpi-mini-box" [class.alert-border]="(resultado()!.datos?.items_con_bajo_stock || 0) > 0">
                  <span class="kpi-mini-label">Items Bajo Stock</span>
                  <span class="kpi-mini-val" [class.text-danger]="(resultado()!.datos?.items_con_bajo_stock || 0) > 0"
                                            [class.text-success]="(resultado()!.datos?.items_con_bajo_stock || 0) === 0">
                    {{ resultado()!.datos?.items_con_bajo_stock ?? 0 }}
                  </span>
                </div>
              </div>

              @if (resultado()!.datos?.inventario?.length) {
                <div class="table-responsive-box">
                  <table class="preview-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>SKU</th>
                        <th>Talla / Color</th>
                        <th>Sucursal</th>
                        <th class="text-right">Disponible</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of resultado()!.datos.inventario.slice(0, 8); track item.inventario_id) {
                        <tr>
                          <td class="font-medium">{{ item.producto_nombre }}</td>
                          <td><span class="sku-tag">{{ item.sku }}</span></td>
                          <td>{{ item.talla }} / {{ item.color }}</td>
                          <td>{{ item.sucursal }}</td>
                          <td class="text-right font-bold">{{ item.cantidad_disponible }}</td>
                          <td>
                            @if (item.alerta_bajo_stock) {
                              <span class="badge badge-danger">Bajo Stock</span>
                            } @else {
                              <span class="badge badge-success">Óptimo</span>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                  @if (resultado()!.datos.inventario.length > 8) {
                    <p class="table-footer-hint">Mostrando los primeros 8 productos. Descarga el reporte para ver los {{ resultado()!.datos.inventario.length }} registros completos.</p>
                  }
                </div>
              }
            </div>
          }

          <!-- 2. Caso VENTAS -->
          @if (exportTipo() === 'ventas') {
            <div class="data-preview-section">
              <div class="kpi-mini-grid">
                <div class="kpi-mini-box">
                  <span class="kpi-mini-label">Total Recaudado</span>
                  <span class="kpi-mini-val text-success">Bs. {{ (resultado()!.datos?.resumen?.total_recaudado || 0) | number:'1.2-2' }}</span>
                </div>
                <div class="kpi-mini-box">
                  <span class="kpi-mini-label">Ventas Online</span>
                  <span class="kpi-mini-val">Bs. {{ (resultado()!.datos?.resumen?.total_online || 0) | number:'1.2-2' }}</span>
                </div>
                <div class="kpi-mini-box">
                  <span class="kpi-mini-label">Ventas Presenciales</span>
                  <span class="kpi-mini-val">Bs. {{ (resultado()!.datos?.resumen?.total_presencial || 0) | number:'1.2-2' }}</span>
                </div>
                <div class="kpi-mini-box">
                  <span class="kpi-mini-label">Ticket Promedio</span>
                  <span class="kpi-mini-val">Bs. {{ (resultado()!.datos?.resumen?.ticket_promedio || 0) | number:'1.2-2' }}</span>
                </div>
              </div>

              @if (resultado()!.datos?.top_productos?.length) {
                <div class="table-responsive-box">
                  <table class="preview-table">
                    <thead>
                      <tr>
                        <th>Top Producto</th>
                        <th class="text-right">Unidades Vendidas</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (p of resultado()!.datos.top_productos; track p.producto_id) {
                        <tr>
                          <td class="font-medium">{{ p.nombre }}</td>
                          <td class="text-right font-bold text-primary">{{ p.unidades_vendidas }} uds.</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          }

          <!-- 3. Caso RESERVAS -->
          @if (exportTipo() === 'reservas') {
            <div class="data-preview-section">
              <div class="kpi-mini-grid">
                <div class="kpi-mini-box">
                  <span class="kpi-mini-label">Total Reservas</span>
                  <span class="kpi-mini-val">{{ resultado()!.datos?.total_reservas ?? 0 }}</span>
                </div>
                <div class="kpi-mini-box">
                  <span class="kpi-mini-label">Conversión (Completadas)</span>
                  <span class="kpi-mini-val text-success">{{ (resultado()!.datos?.tasa_conversion_recogida_pct ?? 0) | number:'1.1-1' }}%</span>
                </div>
                <div class="kpi-mini-box">
                  <span class="kpi-mini-label">Monto Convertido</span>
                  <span class="kpi-mini-val text-primary">Bs. {{ (resultado()!.datos?.monto_total_convertido ?? 0) | number:'1.2-2' }}</span>
                </div>
              </div>

              @if (desgloseEntries(resultado()!.datos?.desglose_estados).length) {
                <div class="table-responsive-box">
                  <table class="preview-table">
                    <thead><tr><th>Estado</th><th class="text-right">Reservas</th></tr></thead>
                    <tbody>
                      @for (e of desgloseEntries(resultado()!.datos?.desglose_estados); track e.key) {
                        <tr><td class="font-medium">{{ e.key }}</td><td class="text-right font-bold">{{ e.value }}</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          }

          <!-- 4. Caso CLIENTES -->
          @if (exportTipo() === 'clientes') {
            <div class="data-preview-section">
              <div class="kpi-mini-grid">
                <div class="kpi-mini-box">
                  <span class="kpi-mini-label">Clientes Registrados</span>
                  <span class="kpi-mini-val">{{ resultado()!.datos?.total_clientes_registrados ?? 0 }}</span>
                </div>
                <div class="kpi-mini-box">
                  <span class="kpi-mini-label">Con Compras</span>
                  <span class="kpi-mini-val text-success">{{ resultado()!.datos?.clientes_activos_con_compras ?? 0 }}</span>
                </div>
              </div>

              @if (resultado()!.datos?.top_10_clientes?.length) {
                <div class="table-responsive-box">
                  <table class="preview-table">
                    <thead><tr><th>Cliente</th><th>Correo</th><th class="text-right">Gastado</th></tr></thead>
                    <tbody>
                      @for (c of resultado()!.datos.top_10_clientes.slice(0, 8); track c.cliente_id) {
                        <tr>
                          <td class="font-medium">{{ c.nombre }}</td>
                          <td>{{ c.correo || c.email || '—' }}</td>
                          <td class="text-right font-bold text-primary">Bs. {{ (c.total_gastado || 0) | number:'1.2-2' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                  @if (resultado()!.datos.top_10_clientes.length > 8) {
                    <p class="table-footer-hint">Mostrando los primeros 8. Descarga el reporte para ver el top completo.</p>
                  }
                </div>
              }
            </div>
          }

          <!-- 5. Caso FINANCIERO -->
          @if (exportTipo() === 'financiero') {
            <div class="data-preview-section">
              <div class="kpi-mini-grid">
                <div class="kpi-mini-box">
                  <span class="kpi-mini-label">Ingresos Brutos</span>
                  <span class="kpi-mini-val text-success">Bs. {{ (resultado()!.datos?.ingresos?.total_recaudado ?? 0) | number:'1.2-2' }}</span>
                </div>
                <div class="kpi-mini-box">
                  <span class="kpi-mini-label">{{ resultado()!.datos?.beneficio_real !== undefined && resultado()!.datos?.beneficio_real !== null ? 'Beneficio Real' : 'Beneficio Est. 40%' }}</span>
                  <span class="kpi-mini-val text-primary">Bs. {{ ((resultado()!.datos?.beneficio_real ?? resultado()!.datos?.beneficio_estimado_margen_40pct) || 0) | number:'1.2-2' }}</span>
                </div>
                @if (resultado()!.datos?.beneficio_real !== undefined && resultado()!.datos?.beneficio_real !== null) {
                  <div class="kpi-mini-box">
                    <span class="kpi-mini-label">Margen Real</span>
                    <span class="kpi-mini-val">{{ (resultado()!.datos?.margen_real_pct || 0) | number:'1.1-1' }}%</span>
                  </div>
                }
              </div>

              @if (desgloseEntries(resultado()!.datos?.desglose_por_metodo_pago).length) {
                <div class="table-responsive-box">
                  <table class="preview-table">
                    <thead><tr><th>Método de Pago</th><th class="text-right">Total</th></tr></thead>
                    <tbody>
                      @for (e of desgloseEntries(resultado()!.datos?.desglose_por_metodo_pago); track e.key) {
                        <tr><td class="font-medium">{{ e.key }}</td><td class="text-right font-bold">Bs. {{ (e.value || 0) | number:'1.2-2' }}</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          }

          <!-- Alternar vista JSON técnica -->
          <div class="json-toggle-row">
            <button type="button" class="btn-link-json" (click)="showJson.set(!showJson())">
              <i [class]="showJson() ? 'ri-eye-off-line' : 'ri-code-line'"></i>
              {{ showJson() ? 'Ocultar datos técnicos (JSON)' : 'Ver datos técnicos completos (JSON)' }}
            </button>
          </div>

          @if (showJson()) {
            <pre class="json-box animate-fade-in">{{ resultado()!.datos | json }}</pre>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .voice-box { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; border-radius: 14px; background: #ffffff; }
    .voice-header { display: flex; justify-content: space-between; align-items: center; }
    .card-title { font-size: 1.125rem; font-weight: 700; display: flex; gap: .5rem; align-items: center; margin: 0; color: #0f172a; }
    .badge-ai { font-size: .75rem; background: #ede9fe; color: #6d28d9; padding: .25rem .6rem; border-radius: 999px; font-weight: 600; display: flex; align-items: center; gap: .3rem; }
    .hint { font-size: .8125rem; color: #64748b; margin: 0; line-height: 1.4; }
    .examples-hint { font-style: italic; color: #94a3b8; }
    .hint.warn { color: #d97706; }
    .voice-row { display: flex; gap: .75rem; flex-wrap: wrap; align-items: center; }
    .ml-auto { margin-left: auto; }

    .interim-banner {
      display: flex; gap: .75rem; align-items: center; padding: .75rem 1rem;
      border-radius: 8px; font-size: .875rem;
    }
    .interim-banner.recording { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
    .interim-banner.processing { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
    .interim-sub { font-size: .75rem; color: #7f1d1d; margin-top: .2rem; }

    .examples { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; }
    .examples-label { font-size: .75rem; color: #64748b; font-weight: 600; display: flex; align-items: center; gap: .2rem; }
    .chip { border: 1px solid #e2e8f0; background: #f8fafc; color: #475569; border-radius: 999px;
            padding: .25rem .75rem; font-size: .75rem; cursor: pointer; transition: all .15s ease; }
    .chip:hover { border-color: #3b82f6; color: #2563eb; background: #eff6ff; }

    .alert { padding: .75rem 1rem; border-radius: 8px; font-size: .85rem; display: flex; align-items: center; gap: .5rem; }
    .alert-danger { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

    /* CARD DE RESULTADO */
    .result-card {
      margin-top: .5rem;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 1.25rem;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .result-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: .75rem; }
    .result-title-group { display: flex; align-items: center; gap: .6rem; }
    .result-title { margin: 0; font-size: 1.1rem; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: .4rem; }
    .report-id { font-size: .8rem; color: #64748b; font-weight: 400; }
    .badge-type { background: #0f172a; color: #ffffff; font-size: .7rem; padding: .2rem .5rem; border-radius: 6px; font-weight: 700; text-transform: uppercase; }

    .interpretation-box {
      display: flex; gap: .75rem; background: #ffffff; border: 1px solid #e2e8f0;
      border-radius: 8px; padding: .85rem 1rem; align-items: flex-start;
    }
    .interp-icon { font-size: 1.5rem; color: #2563eb; flex-shrink: 0; margin-top: .1rem; }
    .interp-content { font-size: .875rem; color: #1e293b; }
    .interp-text { margin: .2rem 0 .4rem 0; color: #334155; }
    .interp-meta { font-size: .75rem; color: #64748b; display: inline-flex; align-items: center; gap: .3rem; }

    /* BANNER DE EXPORTACIÓN */
    .export-banner {
      background: #ffffff;
      border: 2px solid #3b82f6;
      border-radius: 10px;
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: .75rem;
    }
    .export-header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: .5rem; }
    .export-title { display: flex; align-items: center; gap: .5rem; font-size: .95rem; color: #0f172a; }
    .badge-sugerido { background: #dbeafe; color: #1e40af; padding: .25rem .6rem; border-radius: 6px; font-size: .75rem; font-weight: 600; display: inline-flex; align-items: center; gap: .3rem; }
    .export-buttons-wrap { display: flex; flex-wrap: wrap; gap: .5rem; }

    /* MINI KPIS */
    .kpi-mini-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: .75rem; }
    .kpi-mini-box { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: .75rem 1rem; display: flex; flex-direction: column; }
    .kpi-mini-box.alert-border { border-color: #fca5a5; background: #fff5f5; }
    .kpi-mini-label { font-size: .75rem; color: #64748b; font-weight: 600; }
    .kpi-mini-val { font-size: 1.4rem; font-weight: 700; color: #0f172a; margin-top: .2rem; }

    /* TABLA PREVIEW */
    .table-responsive-box { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .preview-table { width: 100%; border-collapse: collapse; font-size: .8125rem; text-align: left; }
    .preview-table th, .preview-table td { padding: .6rem .85rem; border-bottom: 1px solid #f1f5f9; }
    .preview-table th { background: #f8fafc; font-weight: 600; color: #475569; }
    .sku-tag { font-family: monospace; background: #f1f5f9; padding: .15rem .4rem; border-radius: 4px; font-size: .75rem; }
    .badge { padding: .2rem .45rem; border-radius: 4px; font-size: .7rem; font-weight: 600; }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .table-footer-hint { font-size: .75rem; color: #64748b; padding: .5rem .85rem; margin: 0; background: #f8fafc; border-top: 1px solid #f1f5f9; }

    .json-toggle-row { display: flex; justify-content: flex-end; }
    .btn-link-json { background: none; border: none; font-size: .75rem; color: #64748b; cursor: pointer; display: flex; align-items: center; gap: .3rem; text-decoration: underline; }
    .btn-link-json:hover { color: #0f172a; }
    .json-box { background: #0f172a; color: #f8fafc; border-radius: 8px; padding: 1rem; max-height: 250px; overflow: auto; font-size: .75rem; margin: 0; }
  `]
})
export class VoiceAssistantComponent {
  protected voice = inject(VoiceReportService);
  private ai = inject(AiService);
  private toast = inject(ToastService);

  readonly tabChange = output<{ tab: 'ventas' | 'inventario' | 'reservas' | 'clientes' | 'financiero'; filtros: { fechaInicio?: string; fechaFin?: string; sucursalId?: number } }>();

  protected prompt = signal('');
  protected loading = signal(false);
  protected error = signal('');
  protected resultado = signal<any | null>(null);
  protected showJson = signal(false);

  protected exportTipo = signal<TipoReporteExport>('ventas');
  protected exportFiltros = signal({});

  protected readonly ejemplos: string[] = [
    'Genera un reporte de inventarios',
    'Ventas de esta semana en excel',
    'Reservas pendientes de ayer en pdf',
    'Reporte financiero del mes'
  ];
  private static readonly TIPOS_VALIDOS: string[] = ['ventas', 'inventario', 'reservas', 'clientes', 'financiero'];

  private lastToggleTime = 0;
  private lastCompletedDictationTime = 0;

  protected rangoTexto = computed(() => {
    const r = this.resultado();
    if (!r) return 'Todas las fechas';
    if (r.fecha_inicio && r.fecha_fin) return `${r.fecha_inicio} → ${r.fecha_fin}`;
    if (r.fecha_inicio) return `Desde ${r.fecha_inicio}`;
    return 'Todas las fechas';
  });

  /** Botón del micrófono: inicia el dictado o lo detiene entregando lo escuchado. */
  toggleMic(): void {
    const now = Date.now();

    // Protección: si un dictado acaba de finalizar exitosamente hace menos de 1.5s,
    // ignorar clics residuales en el botón para evitar reiniciar la grabación por accidente.
    if (now - this.lastCompletedDictationTime < 1500) {
      console.log('[VOZ] toggleMic() ignorado: el dictado acaba de completarse');
      return;
    }

    if (now - this.lastToggleTime < 600) {
      console.log('[VOZ] toggleMic() ignorado por clic repetido muy rápido (<600ms)');
      return;
    }
    this.lastToggleTime = now;

    if (this.voice.isProcessing()) {
      return;
    }

    console.log('[VOZ] toggleMic() -> click | isRecording:', this.voice.isRecording(), '| isSupported:', this.voice.isSupported());
    if (this.voice.isRecording()) {
      this.voice.stop();
      return;
    }

    this.error.set('');
    // IMPORTANTE: NO borramos this.resultado aquí para que el reporte actual no desaparezca si se pulsa el micro

    if (!this.voice.isSupported()) {
      const msg = 'Este navegador no soporta dictado por voz nativo. Usa Chrome o Edge, o escribe el comando en el cuadro.';
      this.error.set(msg);
      this.toast.warning(msg, 'Dictado por voz');
      return;
    }

    this.voice.start('es-ES', {
      onInterim: (parcial) => {
        console.log('[VOZ] dictado onInterim -> parcial:', parcial);
        this.prompt.set(parcial);
      },
      onFinal: (texto) => {
        console.log('[VOZ] dictado onFinal -> texto reconocido:', texto);
        this.lastCompletedDictationTime = Date.now();
        this.prompt.set(texto);
        this.ejecutar();
      },
      onError: (_code, message) => {
        console.log('[VOZ] dictado onError -> code:', _code, '| message:', message);
        this.error.set(message);
        this.toast.warning(message, 'Dictado por voz');
      }
    });
  }

  protected usarEjemplo(texto: string): void {
    this.prompt.set(texto);
    this.error.set('');
    this.ejecutar();
  }

  protected onEnterPressed(event: Event): void {
    const kbEvent = event as KeyboardEvent;
    if (!kbEvent.shiftKey) {
      kbEvent.preventDefault();
      this.ejecutar();
    }
  }

  limpiar(): void {
    this.prompt.set('');
    this.resultado.set(null);
    this.error.set('');
    this.showJson.set(false);
  }

  /** Envía el comando (dictado o escrito) al backend: POST /inteligencia/reporte-voz. */
  ejecutar(): void {
    const text = this.prompt().trim();
    console.log('[VOZ] ejecutar() -> prompt actual:', this.prompt());
    console.log('[VOZ] ejecutar() -> texto que se enviara al backend:', text);
    if (!text || text.length < 2) {
      this.error.set('Escribe o dicta un comando más descriptivo (ej.: "Genera un reporte de inventario").');
      return;
    }
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set('');

    console.log('[VOZ] ejecutar() -> llamando a ai.generateVoiceReport con:', text);
    this.ai.generateVoiceReport(text).subscribe({
      next: (r: any) => {
        console.log('[VOZ] ejecutar() -> respuesta OK del backend:', r);
        this.loading.set(false);

        const tipo = String(r.tipo_reporte || 'ventas').toLowerCase();
        const exportTipoValido = (VoiceAssistantComponent.TIPOS_VALIDOS.includes(tipo) ? tipo : 'ventas') as TipoReporteExport;

        this.exportTipo.set(exportTipoValido);
        this.exportFiltros.set({
          fechaInicio: r.fecha_inicio || undefined,
          fechaFin: r.fecha_fin || undefined,
          sucursalId: r.sucursal_id || undefined
        });

        // Mostrar directamente el resultado y los botones de exportación
        this.resultado.set(r);
        this.toast.success(r.interpretacion || `Reporte de ${tipo} generado`, 'Reporte listo');
      },
      error: (err: any) => {
        console.log('[VOZ] ejecutar() -> ERROR del backend:', err);
        console.log('[VOZ] ejecutar() -> status:', err?.status, '| body:', err?.error);
        this.loading.set(false);
        let msg = 'No se pudo generar el reporte. Verifica que el backend esté activo e intenta de nuevo.';
        if (err?.status === 401 || err?.status === 403) {
          msg = 'Tu usuario no tiene permisos de administrador para generar reportes por voz.';
        } else if (err?.status === 422) {
          msg = 'El comando de voz fue muy corto o no se entendió claramente. Intenta hablar más cerca del micrófono o escribe el comando.';
        }
        this.error.set(msg);
        this.toast.error(msg, 'Reporte por voz');
      }
    });
  }

  /** Convierte un objeto {clave: valor} en lista para pintarlo en tablas. */
  protected desgloseEntries(obj: any): Array<{ key: string; value: number }> {
    if (!obj || typeof obj !== 'object') return [];
    return Object.entries(obj).map(([key, value]) => ({ key, value: Number(value) || 0 }));
  }

  irATab(tipo: string): void {
    const validTabs: Record<string, 'ventas' | 'inventario' | 'reservas' | 'clientes' | 'financiero'> = {
      ventas: 'ventas',
      inventario: 'inventario',
      reservas: 'reservas',
      clientes: 'clientes',
      financiero: 'financiero'
    };
    const tab = validTabs[tipo.toLowerCase()];
    if (tab) {
      // Se emiten también los filtros inferidos para que la pestaña muestre los mismos números
      this.tabChange.emit({ tab, filtros: this.exportFiltros() });
    }
  }
}
