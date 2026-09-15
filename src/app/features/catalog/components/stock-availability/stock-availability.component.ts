import { Component, Input, Output, EventEmitter, AfterViewInit, OnChanges, SimpleChanges, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DisponibilidadSucursal } from '../../../../core/models/public-catalog.model';
import { Talla, Color } from '../../../../core/models/catalog.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-stock-availability',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stock-availability card">
      <!-- Header -->
      <div class="stock-header">
        <div class="stock-header-main">
          <h3 class="stock-title">
            <i class="ri-store-3-line"></i> Disponibilidad en Sucursales
          </h3>
          <span class="stock-subtitle">Consulta el stock físico y ubicación de nuestras tiendas</span>
        </div>

        <!-- Real-time Live Badge -->
        <div class="live-badge" [class.connected]="wsConnected" [title]="wsConnected ? 'Conectado a actualizaciones en tiempo real' : 'Conectando WebSocket...'">
          <span class="pulse-dot"></span>
          <span class="live-text">{{ wsConnected ? 'En vivo' : 'Conectando...' }}</span>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading) {
        <div class="loading-state">
          <i class="ri-loader-4-line spin-icon"></i>
          <span>Consultando stock en tiempo real...</span>
        </div>
      } @else if (branchList.length === 0) {
        <div class="empty-state">
          <i class="ri-information-line"></i>
          <span>No hay información de sucursales disponible para esta variante.</span>
        </div>
      } @else {
        <!-- Out of stock suggestion banner when total available stock is 0 -->
        @if (!hasAvailableStock()) {
          <div class="out-of-stock-banner">
            <div class="banner-header">
              <i class="ri-error-warning-line banner-icon"></i>
              <div class="banner-text">
                <strong>Agotado en esta combinación</strong>
                <span>No encontramos unidades disponibles para la talla/color seleccionado.</span>
              </div>
            </div>

            <!-- Alternative Suggestions -->
            <div class="suggestions-container">
              <div class="suggestion-title">
                <i class="ri-lightbulb-line"></i> Te sugerimos explorar otras opciones:
              </div>

              <!-- Other Sizes -->
              @if (otherSizes.length > 0) {
                <div class="suggestion-group">
                  <span class="suggestion-label">Otras tallas:</span>
                  <div class="chips-row">
                    @for (s of otherSizes; track s.id) {
                      <button 
                        type="button" 
                        class="suggestion-chip" 
                        (click)="onSelectSize(s)"
                      >
                        {{ s.valor || s.nombre }}
                      </button>
                    }
                  </div>
                </div>
              }

              <!-- Other Colors -->
              @if (otherColors.length > 0) {
                <div class="suggestion-group">
                  <span class="suggestion-label">Otros colores:</span>
                  <div class="chips-row">
                    @for (c of otherColors; track c.id) {
                      <button 
                        type="button" 
                        class="suggestion-chip color-chip" 
                        (click)="onSelectColor(c)"
                      >
                        <span class="color-dot" [style.background-color]="c.codigo_hex || '#cbd5e1'"></span>
                        {{ c.nombre }}
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
        <!-- Map Section - Only show if at least one branch has coordinates -->
        @if (branchesWithLocation.length > 0) {
          <div class="map-section">
            <div class="map-header">
              <i class="ri-map-pin-line"></i>
              <span>Ubicación de sucursales</span>
            </div>
            <div #mapContainer class="map-container"></div>
          </div>
        }

        <!-- Table / List of Branches -->

        <!-- Table / List of Branches -->
        <div class="table-responsive">
          <table class="table-custom">
            <thead>
              <tr>
                <th>Sucursal y Dirección</th>
                <th>Estado</th>
                <th class="text-center">Stock</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (item of branchList; track item.sucursal_id) {
                <tr>
                  <!-- Branch Info -->
                  <td>
                    <div class="branch-info-col">
                      <div class="branch-name-row">
                        <i class="ri-building-line branch-icon"></i>
                        <span class="branch-name">{{ item.sucursal_nombre }}</span>
                      </div>
                      @if (item.direccion) {
                        <div class="branch-meta">
                          <i class="ri-map-pin-2-line"></i>
                          <span>{{ item.direccion }}</span>
                        </div>
                      }
                      @if (item.horario_atencion) {
                        <div class="branch-meta">
                          <i class="ri-time-line"></i>
                          <span>{{ item.horario_atencion }}</span>
                        </div>
                      }
                    </div>
                  </td>

                  <!-- Status Badge -->
                  <td>
                    @if (item.cantidad_disponible > 5) {
                      <span class="badge badge-success">
                        <i class="ri-checkbox-circle-line"></i> Disponible
                      </span>
                    } @else if (item.cantidad_disponible > 0) {
                      <span class="badge badge-warning">
                        <i class="ri-alarm-warning-line"></i> Pocas ({{ item.cantidad_disponible }})
                      </span>
                    } @else {
                      <span class="badge badge-danger">
                        <i class="ri-close-circle-line"></i> Agotado
                      </span>
                    }
                  </td>

                  <!-- Stock Quantity -->
                  <td class="text-center font-bold">
                    <span [class.stock-zero]="item.cantidad_disponible <= 0" [class.stock-ok]="item.cantidad_disponible > 0">
                      {{ item.cantidad_disponible }}
                    </span>
                  </td>

                  <!-- Actions: Map Link & Reserve -->
                  <td class="text-right">
                    <div class="actions-cell">
                      @if (hasLocation(item)) {
                        <a 
                          [href]="getMapUrl(item)" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          class="btn btn-sm btn-outline-secondary map-btn"
                          title="Ver sucursal en Google Maps"
                        >
                          <i class="ri-map-pin-fill text-danger"></i>
                          <span class="map-btn-text">Mapa</span>
                        </a>
                      }
                      <button 
                        class="btn btn-sm btn-outline-accent"
                        [disabled]="item.cantidad_disponible <= 0"
                        (click)="onSelectBranch(item)"
                      >
                        <i class="ri-calendar-check-line"></i> Reservar
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .stock-availability {
      padding: 1.25rem;
      border-radius: var(--radius-lg);
      background: white;
      border: 1px solid var(--border-color);
      margin-top: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }

    .stock-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
      gap: 1rem;
    }

    .stock-header-main {
      flex: 1;
    }

    .stock-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--primary);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
    }

    .stock-subtitle {
      font-size: 0.8125rem;
      color: var(--text-muted);
      display: block;
      margin-top: 0.25rem;
    }

    /* Live Badge */
    .live-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: #f1f5f9;
      color: #64748b;
      white-space: nowrap;
      transition: all 0.2s ease;
    }

    .live-badge.connected {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #94a3b8;
    }

    .live-badge.connected .pulse-dot {
      background: #22c55e;
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
      animation: pulse-ring 1.8s infinite;
    }

    @keyframes pulse-ring {
      0% {
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
      }
      70% {
        box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
      }
    }

    /* Out of Stock & Suggestions Banner */
    .out-of-stock-banner {
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-radius: var(--radius-md);
      padding: 1rem;
      margin-bottom: 1.25rem;
    }

    .banner-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: #92400e;
      margin-bottom: 0.75rem;
    }

    .banner-icon {
      font-size: 1.35rem;
      color: #d97706;
      flex-shrink: 0;
    }

    .banner-text {
      display: flex;
      flex-direction: column;
      font-size: 0.875rem;
      line-height: 1.3;
    }

    .banner-text strong {
      font-weight: 700;
      color: #78350f;
    }

    .suggestions-container {
      background: rgba(255, 255, 255, 0.8);
      border-radius: var(--radius-sm);
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      border: 1px dashed #fcd34d;
    }

    .suggestion-title {
      font-size: 0.8125rem;
      font-weight: 700;
      color: #78350f;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .suggestion-group {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      flex-wrap: wrap;
    }

    .suggestion-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #6b7280;
      min-width: 75px;
    }

    .chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .suggestion-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 600;
      background: white;
      border: 1px solid #d1d5db;
      color: #374151;
      cursor: pointer;
      transition: all 0.15s ease;
      &:hover {
        border-color: var(--accent);
        color: var(--accent);
        background: #fdf2f8;
        transform: translateY(-1px);
      }
    }

    .color-chip {
      padding-left: 0.4rem;
    }

    .color-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 1px solid rgba(0,0,0,0.15);
      flex-shrink: 0;
    }

    /* Branch Info Column */
    .branch-info-col {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .branch-name-row {
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .branch-icon {
      color: var(--accent);
      font-size: 1rem;
    }

    .branch-name {
      font-weight: 600;
      color: var(--primary);
      font-size: 0.9375rem;
    }

    .branch-meta {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      color: var(--text-muted);
      i {
        font-size: 0.8125rem;
      }
    }

    .text-danger {
      color: #ef4444;
    }

    .actions-cell {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .map-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      text-decoration: none;
      font-size: 0.8125rem;
      padding: 0.25rem 0.5rem;
    }

    .map-btn:hover {
      background-color: #fee2e2;
      border-color: #fca5a5;
    }

    .stock-zero {
      color: #94a3b8;
    }

    .stock-ok {
      color: #15803d;
    }

    .loading-state, .empty-state {
      padding: 1.5rem;
      text-align: center;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .spin-icon {
      font-size: 1.5rem;
      animation: spin 1s linear infinite;
      color: var(--accent);
    }

    .map-section {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-color);
      background: #fafafa;
    }

    .map-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.75rem;

      i {
        color: var(--accent);
      }
    }

    .map-container {
      height: 300px;
      width: 100%;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border-color);
      z-index: 1;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
  `]
})
export class StockAvailabilityComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() branchList: DisponibilidadSucursal[] = [];
  @Input() loading: boolean = false;
  @Input() wsConnected: boolean = false;
  @Input() availableSizes: Talla[] = [];
  @Input() availableColors: Color[] = [];
  @Input() selectedSize: Talla | null = null;
  @Input() selectedColor: Color | null = null;

  @Output() selectBranch = new EventEmitter<DisponibilidadSucursal>();
  @Output() selectSize = new EventEmitter<Talla>();
  @Output() selectColor = new EventEmitter<Color>();

  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private map: L.Map | null = null;
  private markers: L.Marker[] = [];

  private readonly defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  /**
   * Determina si al menos una sucursal tiene stock disponible > 0
   */
  hasAvailableStock(): boolean {
    if (!this.branchList || this.branchList.length === 0) return true;
    return this.branchList.some(item => item.cantidad_disponible > 0);
  }

  /**
   * Obtiene otras tallas disponibles diferentes a la actualmente seleccionada
   */
  get otherSizes(): Talla[] {
    if (!this.selectedSize) return this.availableSizes;
    return this.availableSizes.filter(s => s.id !== this.selectedSize?.id);
  }

  /**
   * Obtiene otros colores disponibles diferentes al actualmente seleccionado
   */
  get otherColors(): Color[] {
    if (!this.selectedColor) return this.availableColors;
    return this.availableColors.filter(c => c.id !== this.selectedColor?.id);
  }

  /**
   * Determina si la sucursal tiene coordenadas geográficas válidas
   */
  hasLocation(item: DisponibilidadSucursal): boolean {
    return item.latitud !== null && item.latitud !== undefined &&
           item.longitud !== null && item.longitud !== undefined;
  }

  /**
   * Genera el enlace directo a Google Maps
   */
  getMapUrl(item: DisponibilidadSucursal): string {
    if (!this.hasLocation(item)) return '#';
    return `https://www.google.com/maps?q=${item.latitud},${item.longitud}`;
  }

  onSelectBranch(branch: DisponibilidadSucursal): void {
    this.selectBranch.emit(branch);
  }

  onSelectSize(size: Talla): void {
    this.selectSize.emit(size);
  }

  onSelectColor(color: Color): void {
    this.selectColor.emit(color);
  }

  // ===== LEAFLET MAP METHODS =====

  ngAfterViewInit(): void {
    if (this.branchesWithLocation.length > 0) {
      setTimeout(() => this.initMap(), 0);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['branchList'] && !changes['branchList'].firstChange) {
      if (this.map) {
        this.updateMarkers();
      } else if (this.branchesWithLocation.length > 0) {
        setTimeout(() => this.initMap(), 0);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  get branchesWithLocation(): DisponibilidadSucursal[] {
    return this.branchList.filter(b => this.hasLocation(b));
  }

  private initMap(): void {
    if (!this.mapContainer || this.branchesWithLocation.length === 0) return;

    const firstBranch = this.branchesWithLocation[0];
    this.map = L.map(this.mapContainer.nativeElement).setView(
      [firstBranch.latitud!, firstBranch.longitud!],
      12
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(this.map);

    this.updateMarkers();

    setTimeout(() => {
      this.map?.invalidateSize();
    }, 100);
  }

  private updateMarkers(): void {
    if (!this.map) return;

    this.markers.forEach(m => m.remove());
    this.markers = [];

    const bounds: L.LatLngExpression[] = [];

    this.branchesWithLocation.forEach(branch => {
      const lat = branch.latitud!;
      const lng = branch.longitud!;
      bounds.push([lat, lng]);

      const stockColor = branch.cantidad_disponible > 5 ? '#10b981' :
                         branch.cantidad_disponible > 0 ? '#f59e0b' : '#ef4444';

      const popupContent = `
        <div style="min-width: 200px; font-family: system-ui, -apple-system, sans-serif;">
          <h6 style="margin: 0 0 8px 0; font-weight: 600; color: #1e293b; font-size: 0.9rem;">
            ${branch.sucursal_nombre}
          </h6>
          <p style="margin: 0 0 4px 0; font-size: 0.8rem; color: #64748b;">
            <strong>Dirección:</strong> ${branch.direccion || 'N/A'}
          </p>
          <p style="margin: 0 0 4px 0; font-size: 0.8rem; color: #64748b;">
            <strong>Horario:</strong> ${branch.horario_atencion || 'N/A'}
          </p>
          <p style="margin: 0 0 10px 0; font-size: 0.85rem;">
            <strong>Stock:</strong>
            <span style="color: ${stockColor}; font-weight: 700;">
              ${branch.cantidad_disponible} unidades
            </span>
          </p>
          <a href="https://www.google.com/maps?q=${lat},${lng}"
             target="_blank" rel="noopener noreferrer"
             style="display: inline-block; padding: 4px 10px; background: #6366f1; color: white; text-decoration: none; border-radius: 4px; font-size: 0.75rem;">
            <i class="ri-external-link-line"></i> Abrir en Google Maps
          </a>
        </div>
      `;

      const marker = L.marker([lat, lng], { icon: this.defaultIcon })
        .addTo(this.map!)
        .bindPopup(popupContent);

      this.markers.push(marker);
    });

    if (bounds.length > 0) {
      this.map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [30, 30] });
    }
  }
}
