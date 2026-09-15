import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportsService } from '../../../../core/services/reports.service';
import { AiService } from '../../../../core/services/ai.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import {
  ReporteVentas,
  ReporteInventario,
  ReporteReservas,
  ReporteClientes,
  ReporteFinanciero,
  KPIDashboard,
  KPIItem
} from '../../../../core/models/report.model';
import { Sucursal } from '../../../../core/models/branch.model';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="reports-container animate-fade-in">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Reportes Analíticos & KPIs</h1>
          <p class="page-subtitle">Monitoreo ejecutivo, métricas operativas y análisis de negocio en tiempo real</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" (click)="exportarVentasCsv()">
            <i class="ri-file-excel-2-line"></i> Exportar Ventas CSV
          </button>
          <button class="btn btn-primary" (click)="openCreateKpiModal()">
            <i class="ri-add-line"></i> Nuevo KPI
          </button>
        </div>
      </div>

      <!-- Filters Bar -->
      <div class="card filter-bar">
        <div class="filter-group">
          <label>Fecha Inicio</label>
          <input type="date" class="form-control" [(ngModel)]="fechaInicio" (change)="cargarDatosSegunTab()" />
        </div>
        <div class="filter-group">
          <label>Fecha Fin</label>
          <input type="date" class="form-control" [(ngModel)]="fechaFin" (change)="cargarDatosSegunTab()" />
        </div>
        <div class="filter-group">
          <label>Sucursal</label>
          <select class="form-control" [(ngModel)]="selectedSucursalId" (change)="cargarDatosSegunTab()">
            <option [ngValue]="undefined">Todas las Sucursales</option>
            @for (s of sucursales(); track s.id) {
              <option [ngValue]="s.id">{{ s.nombre }} ({{ s.ciudad?.nombre || 'Central' }})</option>
            }
          </select>
        </div>
        <div class="filter-actions">
          <button class="btn btn-secondary" (click)="resetFilters()">
            <i class="ri-refresh-line"></i> Restablecer
          </button>
          <button class="btn btn-primary" (click)="cargarDatosSegunTab()">
            <i class="ri-filter-3-line"></i> Aplicar Filtros
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="tabs-nav">
        <button [class.active]="activeTab() === 'kpis'" (click)="setTab('kpis')">
          <i class="ri-dashboard-3-line"></i> Dashboard KPIs
        </button>
        <button [class.active]="activeTab() === 'ventas'" (click)="setTab('ventas')">
          <i class="ri-money-dollar-circle-line"></i> Ventas & Canales
        </button>
        <button [class.active]="activeTab() === 'inventario'" (click)="setTab('inventario')">
          <i class="ri-archive-line"></i> Inventario & Stock
        </button>
        <button [class.active]="activeTab() === 'reservas'" (click)="setTab('reservas')">
          <i class="ri-calendar-check-line"></i> Reservas
        </button>
        <button [class.active]="activeTab() === 'clientes'" (click)="setTab('clientes')">
          <i class="ri-user-star-line"></i> Clientes
        </button>
        <button [class.active]="activeTab() === 'financiero'" (click)="setTab('financiero')">
          <i class="ri-bank-card-line"></i> Financiero & Pagos
        </button>
        <button [class.active]="activeTab() === 'voz_ia'" (click)="setTab('voz_ia')">
          <i class="ri-mic-line"></i> Reporte por Voz IA
        </button>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-state">
          <i class="ri-loader-4-line ri-spin"></i>
          <span>Consultando datos y generando análisis...</span>
        </div>
      } @else {

        <!-- TAB 1: DASHBOARD KPIS -->
        @if (activeTab() === 'kpis') {
          <div class="tab-content">
            <!-- Summary Stats -->
            <div class="kpi-grid">
              <div class="stat-card">
                <div class="stat-icon bg-primary-soft">
                  <i class="ri-wallet-3-line"></i>
                </div>
                <div class="stat-info">
                  <span class="stat-label">Ventas del Mes</span>
                  <h3 class="stat-value">Bs. {{ (kpiDashboard()?.total_ventas_mes || 0) | number:'1.2-2' }}</h3>
                  <span class="stat-badge positive">
                    <i class="ri-shopping-cart-line"></i> {{ kpiDashboard()?.total_pedidos_mes || 0 }} pedidos
                  </span>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon bg-success-soft">
                  <i class="ri-shopping-bag-3-line"></i>
                </div>
                <div class="stat-info">
                  <span class="stat-label">Ticket Promedio</span>
                  <h3 class="stat-value">Bs. {{ (kpiDashboard()?.ticket_promedio || 0) | number:'1.2-2' }}</h3>
                  <span class="stat-badge neutral">
                    <i class="ri-scales-3-line"></i> Promedio por venta
                  </span>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon bg-warning-soft">
                  <i class="ri-calendar-event-line"></i>
                </div>
                <div class="stat-info">
                  <span class="stat-label">Conversión Reservas</span>
                  <h3 class="stat-value">{{ (kpiDashboard()?.tasa_conversion_reservas || 0) | number:'1.1-1' }}%</h3>
                  <span class="stat-badge positive">
                    <i class="ri-check-line"></i> Retiradas en tienda
                  </span>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon bg-info-soft">
                  <i class="ri-user-follow-line"></i>
                </div>
                <div class="stat-info">
                  <span class="stat-label">Total Clientes</span>
                  <h3 class="stat-value">{{ kpiDashboard()?.clientes_activos || 0 }}</h3>
                  <span class="stat-badge neutral">
                    <i class="ri-user-line"></i> Registrados
                  </span>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon" [ngClass]="(kpiDashboard()?.productos_bajo_stock || 0) > 0 ? 'bg-danger-soft' : 'bg-success-soft'">
                  <i class="ri-alert-line"></i>
                </div>
                <div class="stat-info">
                  <span class="stat-label">Stock Bajo Mínimo</span>
                  <h3 class="stat-value">{{ kpiDashboard()?.productos_bajo_stock || 0 }}</h3>
                  <span class="stat-badge" [ngClass]="(kpiDashboard()?.productos_bajo_stock || 0) > 0 ? 'negative' : 'positive'">
                    {{ (kpiDashboard()?.productos_bajo_stock || 0) > 0 ? 'Prendas por reabastecer' : 'Stock óptimo' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Custom KPIs Table & Target Bars -->
            <div class="card mt-4">
              <div class="card-header-flex">
                <div>
                  <h2 class="section-title">Objetivos Estratégicos & KPIs</h2>
                  <p class="section-desc">Seguimiento de metas operativas y comerciales configuradas</p>
                </div>
              </div>

              <div class="kpi-list">
                @for (kpi of getAllKpis(); track kpi.id || kpi.nombre) {
                  <div class="kpi-item-card">
                    <div class="kpi-item-header">
                      <div>
                        <h4>{{ kpi.nombre }}</h4>
                        <span class="kpi-desc">{{ kpi.descripcion || 'Sin descripción' }}</span>
                      </div>
                      <div class="kpi-badges">
                        <span class="badge" [class.badge-success]="kpi.tendencia === 'Positiva'" [class.badge-danger]="kpi.tendencia === 'Negativa'" [class.badge-neutral]="kpi.tendencia !== 'Positiva' && kpi.tendencia !== 'Negativa'">
                          {{ kpi.tendencia }}
                        </span>
                        <span class="badge badge-neutral">{{ kpi.periodo }}</span>
                      </div>
                    </div>

                    <div class="kpi-progress-wrapper">
                      <div class="kpi-progress-info">
                        <span>Actual: <strong>{{ kpi.valor_actual }} {{ kpi.unidad_medida }}</strong></span>
                        <span>Meta: <strong>{{ kpi.valor_objetivo }} {{ kpi.unidad_medida }}</strong></span>
                      </div>
                      <div class="progress-bar-bg">
                        <div class="progress-bar-fill" 
                             [style.width.%]="kpi.valor_objetivo > 0 ? ((kpi.valor_actual / kpi.valor_objetivo) * 100) : 0"
                             [class.over-target]="kpi.valor_actual >= kpi.valor_objetivo">
                        </div>
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="empty-state">
                    <i class="ri-line-chart-line"></i>
                    <p>No hay KPIs adicionales configurados. ¡Haz clic en "Nuevo KPI" para crear metas!</p>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- TAB 2: VENTAS & CANALES -->
        @if (activeTab() === 'ventas') {
          <div class="tab-content">
            <div class="metrics-row">
              <div class="card metric-box">
                <span class="metric-title">Total Recaudado</span>
                <span class="metric-big text-primary">Bs. {{ (reporteVentas()?.resumen?.total_recaudado || 0) | number:'1.2-2' }}</span>
              </div>
              <div class="card metric-box">
                <span class="metric-title">Ventas Online</span>
                <span class="metric-big">Bs. {{ (reporteVentas()?.resumen?.total_online || 0) | number:'1.2-2' }}</span>
                <span class="text-xs text-muted mt-1">{{ reporteVentas()?.resumen?.cantidad_pedidos_online || 0 }} pedidos</span>
              </div>
              <div class="card metric-box">
                <span class="metric-title">Ventas Presenciales (POS)</span>
                <span class="metric-big">Bs. {{ (reporteVentas()?.resumen?.total_presencial || 0) | number:'1.2-2' }}</span>
                <span class="text-xs text-muted mt-1">{{ reporteVentas()?.resumen?.cantidad_ventas_presenciales || 0 }} ventas</span>
              </div>
              <div class="card metric-box">
                <span class="metric-title">Ticket Promedio</span>
                <span class="metric-big">Bs. {{ (reporteVentas()?.resumen?.ticket_promedio || 0) | number:'1.2-2' }}</span>
              </div>
            </div>

            <div class="grid-2-col mt-4">
              <!-- Top Productos Más Vendidos -->
              <div class="card">
                <h3 class="card-subtitle"><i class="ri-fire-line text-warning"></i> Prendas Más Vendidas</h3>
                <div class="table-responsive mt-3">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Prenda</th>
                        <th class="text-right">Unidades Vendidas</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (p of reporteVentas()?.top_productos || []; track p.producto_id) {
                        <tr>
                          <td class="font-mono">#{{ p.producto_id }}</td>
                          <td class="font-medium">{{ p.nombre }}</td>
                          <td class="text-right font-bold text-primary">{{ p.unidades_vendidas }} uds.</td>
                        </tr>
                      } @empty {
                        <tr><td colspan="3" class="text-center py-4 text-muted">Sin registros de ventas en este período</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Distribución por Canal -->
              <div class="card">
                <h3 class="card-subtitle"><i class="ri-pie-chart-line text-primary"></i> Distribución por Canal de Venta</h3>
                <div class="channel-breakdown mt-3">
                  <div class="category-stat-item">
                    <div class="cat-stat-info">
                      <span><i class="ri-global-line"></i> Tienda Online E-commerce</span>
                      <span class="font-bold">Bs. {{ (reporteVentas()?.resumen?.total_online || 0) | number:'1.2-2' }} ({{ reporteVentas()?.resumen?.cantidad_pedidos_online || 0 }} pedidos)</span>
                    </div>
                    <div class="progress-bar-bg">
                      <div class="progress-bar-fill" [style.width.%]="calcularPorcentaje(reporteVentas()?.resumen?.total_online, reporteVentas()?.resumen?.total_recaudado)"></div>
                    </div>
                  </div>

                  <div class="category-stat-item mt-3">
                    <div class="cat-stat-info">
                      <span><i class="ri-store-2-line"></i> Sucursales Físicas / POS</span>
                      <span class="font-bold">Bs. {{ (reporteVentas()?.resumen?.total_presencial || 0) | number:'1.2-2' }} ({{ reporteVentas()?.resumen?.cantidad_ventas_presenciales || 0 }} ventas)</span>
                    </div>
                    <div class="progress-bar-bg">
                      <div class="progress-bar-fill bg-success" [style.width.%]="calcularPorcentaje(reporteVentas()?.resumen?.total_presencial, reporteVentas()?.resumen?.total_recaudado)"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- TAB 3: INVENTARIO & STOCK -->
        @if (activeTab() === 'inventario') {
          <div class="tab-content">
            <div class="metrics-row">
              <div class="card metric-box">
                <span class="metric-title">Ítems de Inventario Registrados</span>
                <span class="metric-big">{{ reporteInventario()?.total_items_registrados || 0 }}</span>
              </div>
              <div class="card metric-box">
                <span class="metric-title">Total Unidades Disponibles</span>
                <span class="metric-big text-primary">{{ reporteInventario()?.total_unidades_disponibles || 0 }}</span>
              </div>
              <div class="card metric-box border-warning">
                <span class="metric-title text-warning">Ítems Bajo Stock Mínimo</span>
                <span class="metric-big text-warning">{{ reporteInventario()?.items_con_bajo_stock || 0 }}</span>
              </div>
            </div>

            <div class="card mt-4">
              <h3 class="card-subtitle"><i class="ri-list-check text-primary"></i> Detalle de Existencias por Prenda y Sucursal</h3>
              <div class="table-responsive mt-3">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Prenda</th>
                      <th>SKU</th>
                      <th>Talla</th>
                      <th>Color</th>
                      <th>Sucursal</th>
                      <th>Disponible</th>
                      <th>Reservado</th>
                      <th>Mínimo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (inv of reporteInventario()?.inventario || []; track inv.inventario_id) {
                      <tr>
                        <td class="font-medium">{{ inv.producto_nombre }}</td>
                        <td><span class="sku-tag">{{ inv.sku }}</span></td>
                        <td>{{ inv.talla || '-' }}</td>
                        <td>{{ inv.color || '-' }}</td>
                        <td>{{ inv.sucursal || 'Central' }}</td>
                        <td class="font-bold">{{ inv.cantidad_disponible }}</td>
                        <td>{{ inv.cantidad_reservada || 0 }}</td>
                        <td>{{ inv.cantidad_minima }}</td>
                        <td>
                          @if (inv.alerta_bajo_stock) {
                            <span class="badge badge-danger">Bajo Stock</span>
                          } @else {
                            <span class="badge badge-success">Óptimo</span>
                          }
                        </td>
                      </tr>
                    } @empty {
                      <tr><td colspan="9" class="text-center py-4 text-muted">No hay registros de inventario disponibles.</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        }

        <!-- TAB 4: RESERVAS -->
        @if (activeTab() === 'reservas') {
          <div class="tab-content">
            <div class="metrics-row">
              <div class="card metric-box">
                <span class="metric-title">Total Reservas Realizadas</span>
                <span class="metric-big">{{ reporteReservas()?.total_reservas || 0 }}</span>
              </div>
              <div class="card metric-box">
                <span class="metric-title">Tasa de Conversión (Recogidas)</span>
                <span class="metric-big text-success">{{ (reporteReservas()?.tasa_conversion_recogida_pct || 0) | number:'1.1-1' }}%</span>
              </div>
              <div class="card metric-box">
                <span class="metric-title">Monto Total Convertido</span>
                <span class="metric-big text-primary">Bs. {{ (reporteReservas()?.monto_total_convertido || 0) | number:'1.2-2' }}</span>
              </div>
            </div>

            <div class="card mt-4">
              <h3 class="card-subtitle"><i class="ri-pie-chart-line text-warning"></i> Desglose por Estado de Reserva</h3>
              <div class="status-grid mt-3">
                @for (entry of getDesgloseReservas(); track entry.key) {
                  <div class="status-item-card">
                    <div class="status-header">
                      <span class="font-medium">{{ entry.key }}</span>
                      <span class="font-bold">{{ entry.value }} reservas</span>
                    </div>
                    <div class="progress-bar-bg mt-2">
                      <div class="progress-bar-fill" [style.width.%]="calcularPorcentaje(entry.value, reporteReservas()?.total_reservas)"></div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- TAB 5: CLIENTES -->
        @if (activeTab() === 'clientes') {
          <div class="tab-content">
            <div class="metrics-row">
              <div class="card metric-box">
                <span class="metric-title">Total Clientes Registrados</span>
                <span class="metric-big">{{ reporteClientes()?.total_clientes_registrados || 0 }}</span>
              </div>
              <div class="card metric-box">
                <span class="metric-title">Clientes con Compras</span>
                <span class="metric-big text-success">{{ reporteClientes()?.clientes_activos_con_compras || 0 }}</span>
              </div>
            </div>

            <div class="card mt-4">
              <h3 class="card-subtitle"><i class="ri-trophy-line text-warning"></i> Top 10 Clientes con Mayor Consumo</h3>
              <div class="table-responsive mt-3">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Correo Electrónico</th>
                      <th>Total Pedidos</th>
                      <th class="text-right">Total Gastado (Bs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of reporteClientes()?.top_10_clientes || []; track c.cliente_id) {
                      <tr>
                        <td class="font-medium">{{ c.nombre }}</td>
                        <td>{{ c.email }}</td>
                        <td>{{ c.total_pedidos }} pedidos</td>
                        <td class="text-right font-bold text-success">Bs. {{ c.total_gastado | number:'1.2-2' }}</td>
                      </tr>
                    } @empty {
                      <tr><td colspan="4" class="text-center py-4 text-muted">No hay registros de compras de clientes aún.</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        }

        <!-- TAB 6: FINANCIERO -->
        @if (activeTab() === 'financiero') {
          <div class="tab-content">
            <div class="metrics-row">
              <div class="card metric-box">
                <span class="metric-title">Ingresos Totales Brutos</span>
                <span class="metric-big text-primary">Bs. {{ (reporteFinanciero()?.ingresos?.total_recaudado || 0) | number:'1.2-2' }}</span>
              </div>
              <div class="card metric-box">
                <span class="metric-title">Beneficio Estimado (Margen 40%)</span>
                <span class="metric-big text-success">Bs. {{ (reporteFinanciero()?.beneficio_estimado_margen_40pct || 0) | number:'1.2-2' }}</span>
              </div>
            </div>

            <div class="card mt-4">
              <h3 class="card-subtitle"><i class="ri-bank-card-line text-info"></i> Desglose por Método de Pago</h3>
              <div class="mt-3">
                @for (entry of getDesgloseMetodosPago(); track entry.key) {
                  <div class="category-stat-item mb-3">
                    <div class="cat-stat-info">
                      <span class="font-semibold">{{ entry.key }}</span>
                      <span class="font-bold">Bs. {{ entry.value | number:'1.2-2' }}</span>
                    </div>
                    <div class="progress-bar-bg">
                      <div class="progress-bar-fill" [style.width.%]="calcularPorcentaje(entry.value, reporteFinanciero()?.ingresos?.total_recaudado)"></div>
                    </div>
                  </div>
                } @empty {
                  <p class="text-muted text-center py-3">No hay transacciones registradas en este período.</p>
                }
              </div>
            </div>
          </div>
        }

        <!-- TAB 7: REPORTE POR VOZ IA -->
        @if (activeTab() === 'voz_ia') {
          <div class="tab-content">
            <div class="card voice-card">
              <div class="voice-header">
                <div class="voice-icon-box" [class.pulsing]="isRecording()">
                  <i class="ri-mic-line"></i>
                </div>
                <div>
                  <h3 class="text-xl font-bold">Generador de Reportes por Comando de Voz con IA</h3>
                  <p class="text-muted">Dicta una consulta gerencial por micrófono o escribe tu pregunta en lenguaje natural.</p>
                </div>
              </div>

              <div class="voice-input-container mt-4">
                <div class="input-with-actions">
                  <textarea class="form-control voice-textarea" 
                            [(ngModel)]="voicePrompt" 
                            placeholder="Ejemplo: 'Muéstrame el resumen de ventas de esta semana y las prendas con mayor rotación'"></textarea>
                </div>
                <div class="voice-buttons mt-3">
                  <button class="btn btn-secondary" (click)="toggleVoiceRecording()">
                    <i [class]="isRecording() ? 'ri-mic-off-line text-danger' : 'ri-mic-line'"></i>
                    {{ isRecording() ? 'Detener Dictado' : 'Hablar por Micrófono' }}
                  </button>
                  <button class="btn btn-primary" [disabled]="!voicePrompt || aiLoading()" (click)="ejecutarReporteVoz()">
                    @if (aiLoading()) {
                      <i class="ri-loader-4-line ri-spin"></i> Analizando con IA...
                    } @else {
                      <i class="ri-sparkling-line"></i> Generar Reporte con IA
                    }
                  </button>
                </div>
              </div>

              <!-- AI Generated Result -->
              @if (voiceResult()) {
                <div class="ai-result-box mt-4 animate-fade-in">
                  <div class="ai-badge">
                    <i class="ri-sparkling-fill"></i> Reporte Generado por IA ({{ voiceResult()?.tipo_reporte }})
                  </div>
                  <div class="ai-summary mt-2">
                    <p class="font-medium text-lg">{{ voiceResult()?.resumen }}</p>
                  </div>
                  <div class="ai-raw-data mt-3">
                    <pre>{{ voiceResult()?.datos | json }}</pre>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      }

      <!-- Modal Crear KPI -->
      @if (showKpiModal()) {
        <div class="modal-backdrop" (click)="closeKpiModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Crear Indicador KPI</h3>
              <button class="btn-close" (click)="closeKpiModal()"><i class="ri-close-line"></i></button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Nombre del KPI *</label>
                <input type="text" class="form-control" [(ngModel)]="newKpi.nombre" placeholder="Ej: Rotación de Stock Trimestral" />
              </div>
              <div class="form-group">
                <label>Descripción</label>
                <textarea class="form-control" [(ngModel)]="newKpi.descripcion" rows="2" placeholder="Objetivo de este indicador..."></textarea>
              </div>
              <div class="form-row">
                <div class="form-group col">
                  <label>Valor Actual *</label>
                  <input type="number" class="form-control" [(ngModel)]="newKpi.valor_actual" />
                </div>
                <div class="form-group col">
                  <label>Valor Objetivo *</label>
                  <input type="number" class="form-control" [(ngModel)]="newKpi.valor_objetivo" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group col">
                  <label>Unidad de Medida *</label>
                  <input type="text" class="form-control" [(ngModel)]="newKpi.unidad_medida" placeholder="%, Bs., veces/año, etc." />
                </div>
                <div class="form-group col">
                  <label>Tendencia</label>
                  <select class="form-control" [(ngModel)]="newKpi.tendencia">
                    <option value="Positiva">Positiva</option>
                    <option value="Neutra">Neutra</option>
                    <option value="Negativa">Negativa</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>Período *</label>
                <input type="text" class="form-control" [(ngModel)]="newKpi.periodo" placeholder="Ej: Q3 2026, Mensual, etc." />
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeKpiModal()">Cancelar</button>
              <button class="btn btn-primary" (click)="guardarKpi()">Guardar KPI</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .reports-container {
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
      color: var(--text-color, #1e293b);
      margin: 0;
    }
    .page-subtitle {
      font-size: 0.875rem;
      color: var(--text-muted, #64748b);
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
      background: var(--surface-color, #ffffff);
      border-radius: var(--radius-lg, 12px);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
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
      color: var(--text-muted, #64748b);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .filter-actions { display: flex; gap: 0.5rem; }
    .tabs-nav {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--border-color, #e2e8f0);
      overflow-x: auto;
      padding-bottom: 0.5rem;
    }
    .tabs-nav button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      border: none;
      background: transparent;
      font-weight: 600;
      color: var(--text-muted, #64748b);
      cursor: pointer;
      border-radius: var(--radius-md, 8px);
      transition: all 0.2s;
      white-space: nowrap;
    }
    .tabs-nav button:hover {
      background: rgba(0,0,0,0.03);
      color: var(--primary, #0f172a);
    }
    .tabs-nav button.active {
      background: var(--primary, #0f172a);
      color: #ffffff;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
    }
    .stat-card {
      background: var(--surface-color, #ffffff);
      border-radius: var(--radius-lg, 12px);
      padding: 1.25rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      border: 1px solid var(--border-color, #e2e8f0);
    }
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }
    .bg-primary-soft { background: #e0e7ff; color: #4338ca; }
    .bg-success-soft { background: #dcfce7; color: #15803d; }
    .bg-warning-soft { background: #fef3c7; color: #b45309; }
    .bg-info-soft { background: #e0f2fe; color: #0369a1; }
    .bg-danger-soft { background: #fee2e2; color: #b91c1c; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-label { font-size: 0.75rem; color: var(--text-muted, #64748b); font-weight: 600; }
    .stat-value { font-size: 1.5rem; font-weight: 700; margin: 0.25rem 0; color: var(--text-color, #0f172a); }
    .stat-badge {
      font-size: 0.75rem;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .stat-badge.positive { color: #16a34a; }
    .stat-badge.neutral { color: #64748b; }
    .stat-badge.negative { color: #dc2626; }
    .kpi-list { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
    .kpi-item-card {
      background: #f8fafc;
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: 10px;
      padding: 1.25rem;
    }
    .kpi-item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }
    .kpi-item-header h4 { margin: 0; font-size: 1rem; font-weight: 600; }
    .kpi-desc { font-size: 0.8125rem; color: var(--text-muted, #64748b); }
    .kpi-badges { display: flex; gap: 0.5rem; }
    .kpi-progress-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.8125rem;
      margin-bottom: 0.25rem;
    }
    .progress-bar-bg {
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: var(--primary, #0f172a);
      border-radius: 4px;
      transition: width 0.4s ease;
    }
    .progress-bar-fill.bg-success { background: #16a34a; }
    .progress-bar-fill.over-target { background: #16a34a; }
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }
    .metric-box {
      padding: 1.25rem;
      background: #ffffff;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      border: 1px solid #e2e8f0;
    }
    .metric-title { font-size: 0.8125rem; color: #64748b; font-weight: 600; }
    .metric-big { font-size: 1.75rem; font-weight: 700; color: #0f172a; margin-top: 0.5rem; }
    .grid-2-col {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1.25rem;
    }
    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
    }
    .status-item-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1rem;
    }
    .status-header { display: flex; justify-content: space-between; font-size: 0.875rem; }
    .category-stat-item { margin-bottom: 1rem; }
    .cat-stat-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
      margin-bottom: 0.25rem;
      font-weight: 500;
    }
    .sku-tag {
      font-family: monospace;
      background: #f1f5f9;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-size: 0.8125rem;
    }
    .badge {
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .badge-neutral { background: #f1f5f9; color: #475569; }
    .voice-card { padding: 2rem; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; }
    .voice-header { display: flex; gap: 1.25rem; align-items: center; }
    .voice-icon-box {
      width: 56px;
      height: 56px;
      background: #eff6ff;
      color: #2563eb;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.75rem;
    }
    .voice-icon-box.pulsing {
      animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
      background: #fee2e2;
      color: #dc2626;
    }
    @keyframes pulse-ring {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
    }
    .voice-textarea { min-height: 100px; resize: vertical; }
    .voice-buttons { display: flex; gap: 0.75rem; }
    .ai-result-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 1.25rem;
    }
    .ai-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: #818cf8;
      color: #ffffff;
      padding: 0.25rem 0.6rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .ai-raw-data pre {
      background: #1e293b;
      color: #f8fafc;
      padding: 1rem;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 0.8125rem;
    }
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 1rem;
      gap: 0.75rem;
      color: #64748b;
      font-size: 1.125rem;
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
      max-width: 550px;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
    }
    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-header h3 { margin: 0; font-size: 1.25rem; }
    .btn-close { background: none; border: none; font-size: 1.25rem; cursor: pointer; }
    .modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }
    .form-row { display: flex; gap: 1rem; }
    .form-row .col { flex: 1; }
    .empty-state { text-align: center; padding: 3rem 1rem; color: #94a3b8; }
    .empty-state i { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .card-header-flex { display: flex; justify-content: space-between; align-items: center; }
    .card-subtitle { margin: 0; font-size: 1.125rem; display: flex; align-items: center; gap: 0.5rem; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; }
    .data-table th, .data-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #e2e8f0; font-size: 0.875rem; }
    .data-table th { background: #f8fafc; font-weight: 600; color: #475569; }
  `]
})
export class ReportsComponent implements OnInit {
  private reportsService = inject(ReportsService);
  private aiService = inject(AiService);
  private branchService = inject(BranchApiService);

  activeTab = signal<'kpis' | 'ventas' | 'inventario' | 'reservas' | 'clientes' | 'financiero' | 'voz_ia'>('kpis');
  loading = signal<boolean>(false);
  aiLoading = signal<boolean>(false);
  isRecording = signal<boolean>(false);
  showKpiModal = signal<boolean>(false);

  fechaInicio: string = '';
  fechaFin: string = '';
  selectedSucursalId: number | undefined = undefined;

  sucursales = signal<Sucursal[]>([]);
  kpiDashboard = signal<KPIDashboard | null>(null);
  kpiList = signal<KPIItem[]>([]);
  reporteVentas = signal<ReporteVentas | null>(null);
  reporteInventario = signal<ReporteInventario | null>(null);
  reporteReservas = signal<ReporteReservas | null>(null);
  reporteClientes = signal<ReporteClientes | null>(null);
  reporteFinanciero = signal<ReporteFinanciero | null>(null);

  voicePrompt: string = '';
  voiceResult = signal<any>(null);

  newKpi: Partial<KPIItem> = {
    nombre: '',
    descripcion: '',
    valor_actual: 0,
    valor_objetivo: 100,
    unidad_medida: '%',
    tendencia: 'Positiva',
    periodo: 'Mensual'
  };

  private recognition: any;

  ngOnInit(): void {
    this.cargarSucursales();
    this.cargarKpiDashboard();
    this.cargarKpiList();
    this.initSpeechRecognition();
  }

  setTab(tab: 'kpis' | 'ventas' | 'inventario' | 'reservas' | 'clientes' | 'financiero' | 'voz_ia') {
    this.activeTab.set(tab);
    this.cargarDatosSegunTab();
  }

  cargarSucursales() {
    this.branchService.getBranches().subscribe({
      next: (res) => this.sucursales.set(res),
      error: () => {}
    });
  }

  cargarDatosSegunTab() {
    const tab = this.activeTab();
    if (tab === 'kpis') {
      this.cargarKpiDashboard();
      this.cargarKpiList();
    } else if (tab === 'ventas') {
      this.cargarReporteVentas();
    } else if (tab === 'inventario') {
      this.cargarReporteInventario();
    } else if (tab === 'reservas') {
      this.cargarReporteReservas();
    } else if (tab === 'clientes') {
      this.cargarReporteClientes();
    } else if (tab === 'financiero') {
      this.cargarReporteFinanciero();
    }
  }

  cargarKpiDashboard() {
    this.loading.set(true);
    this.reportsService.getKpiDashboard().subscribe({
      next: (data) => {
        this.kpiDashboard.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  cargarKpiList() {
    this.reportsService.getKpis().subscribe({
      next: (data) => this.kpiList.set(data),
      error: () => {}
    });
  }

  cargarReporteVentas() {
    this.loading.set(true);
    this.reportsService.getSalesReport(this.fechaInicio, this.fechaFin, this.selectedSucursalId).subscribe({
      next: (data) => {
        this.reporteVentas.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  cargarReporteInventario() {
    this.loading.set(true);
    this.reportsService.getInventoryReport(this.selectedSucursalId).subscribe({
      next: (data) => {
        this.reporteInventario.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  cargarReporteReservas() {
    this.loading.set(true);
    this.reportsService.getReservationsReport(this.fechaInicio, this.fechaFin, this.selectedSucursalId).subscribe({
      next: (data) => {
        this.reporteReservas.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  cargarReporteClientes() {
    this.loading.set(true);
    this.reportsService.getClientsReport().subscribe({
      next: (data) => {
        this.reporteClientes.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  cargarReporteFinanciero() {
    this.loading.set(true);
    this.reportsService.getFinancialReport(this.fechaInicio, this.fechaFin).subscribe({
      next: (data) => {
        this.reporteFinanciero.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  exportarVentasCsv() {
    this.reportsService.exportSalesReportCsv(this.fechaInicio, this.fechaFin).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_ventas_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Error al exportar CSV', err)
    });
  }

  resetFilters() {
    this.fechaInicio = '';
    this.fechaFin = '';
    this.selectedSucursalId = undefined;
    this.cargarDatosSegunTab();
  }

  openCreateKpiModal() {
    this.newKpi = {
      nombre: '',
      descripcion: '',
      valor_actual: 0,
      valor_objetivo: 100,
      unidad_medida: '%',
      tendencia: 'Positiva',
      periodo: 'Mensual'
    };
    this.showKpiModal.set(true);
  }

  closeKpiModal() {
    this.showKpiModal.set(false);
  }

  guardarKpi() {
    if (!this.newKpi.nombre) return;
    this.reportsService.createKpi(this.newKpi).subscribe({
      next: (created) => {
        this.kpiList.update((prev) => [...prev, created]);
        this.closeKpiModal();
      },
      error: (err) => console.error('Error al crear KPI', err)
    });
  }

  getAllKpis(): KPIItem[] {
    const fromDashboard = this.kpiDashboard()?.kpis_detallados || [];
    const fromList = this.kpiList() || [];
    const map = new Map<string, KPIItem>();
    for (const item of [...fromDashboard, ...fromList]) {
      if (item.id) map.set(item.id.toString(), item);
      else map.set(item.nombre, item);
    }
    return Array.from(map.values());
  }

  getDesgloseReservas(): Array<{ key: string; value: number }> {
    const obj = this.reporteReservas()?.desglose_estados || {};
    return Object.entries(obj).map(([key, value]) => ({ key, value: value || 0 }));
  }

  getDesgloseMetodosPago(): Array<{ key: string; value: number }> {
    const obj = this.reporteFinanciero()?.desglose_por_metodo_pago || {};
    return Object.entries(obj).map(([key, value]) => ({ key, value: value || 0 }));
  }

  calcularPorcentaje(val?: number, total?: number): number {
    if (!val || !total || total <= 0) return 0;
    return Math.min(100, Math.round((val / total) * 100));
  }

  initSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'es-BO';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.voicePrompt = transcript;
        this.isRecording.set(false);
      };

      this.recognition.onerror = () => {
        this.isRecording.set(false);
      };

      this.recognition.onend = () => {
        this.isRecording.set(false);
      };
    }
  }

  toggleVoiceRecording() {
    if (!this.recognition) {
      alert('Tu navegador no soporta reconocimiento de voz nativo. Por favor escribe tu comando.');
      return;
    }
    if (this.isRecording()) {
      this.recognition.stop();
      this.isRecording.set(false);
    } else {
      this.recognition.start();
      this.isRecording.set(true);
    }
  }

  ejecutarReporteVoz() {
    if (!this.voicePrompt) return;
    this.aiLoading.set(true);
    this.aiService.generateVoiceReport(this.voicePrompt).subscribe({
      next: (res) => {
        this.voiceResult.set(res);
        this.aiLoading.set(false);
      },
      error: (err) => {
        console.error('Error al generar reporte de voz', err);
        this.aiLoading.set(false);
      }
    });
  }
}
