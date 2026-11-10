import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { TraspasosApiService } from '../../../../core/services/traspasos-api.service';
import { InventoryApiService } from '../../../../core/services/inventory-api.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { CatalogApiService } from '../../../../core/services/catalog-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';
import { Traspaso, SugerenciaTraspaso, HistorialProductoTraspaso } from '../../../../core/models/traspaso.model';
import { Sucursal } from '../../../../core/models/branch.model';
import { Producto, VarianteProducto } from '../../../../core/models/catalog.model';

/**
 * [EXAMEN-2] CU14: traspasos admin.
 */
@Component({
  selector: 'app-transfers',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgePipe],
  templateUrl: './transfers.component.html',
  styleUrls: ['./transfers.component.scss'],
})
export class TransfersComponent implements OnInit {
  private api = inject(TraspasosApiService);
  private inv = inject(InventoryApiService);
  private branch = inject(BranchApiService);
  private catalog = inject(CatalogApiService);
  private toast = inject(ToastService);

  lista = signal<Traspaso[]>([]);
  sugerencias = signal<SugerenciaTraspaso[]>([]);
  sucursales = signal<Sucursal[]>([]);
  productos = signal<Producto[]>([]);
  variantes = signal<VarianteProducto[]>([]);
  origen: number | null = null;
  destino: number | null = null;
  productoId: number | null = null;
  variante: number | null = null;
  cantidad = 1;
  errorStock = signal('');
  cargando = signal(true);
  cargandoSugerencias = signal(true);
  creando = signal(false);
  cargandoStock = signal(false);
  filtroEstado = '';
  historialSel = signal<number | null>(null);
  historialProducto = signal<HistorialProductoTraspaso | null>(null);
  cargandoHistorial = signal(false);
  private stockOrigen = signal<Map<number, number>>(new Map());

  ngOnInit(): void {
    this.cargar();
    this.branch.getBranches(0, 100).subscribe({
      next: (x) => this.sucursales.set(Array.isArray(x) ? x : []),
      error: () => this.toast.error('No se pudieron cargar las sucursales.'),
    });
    this.catalog.getProducts(0, 500).subscribe({
      next: (x) => this.productos.set(Array.isArray(x) ? x : []),
      error: () => this.toast.error('No se pudo cargar el catálogo de productos.'),
    });
    this.cargarSugerencias();
  }

  cargar(): void {
    this.cargando.set(true);
    this.api.listar({ estado: this.filtroEstado || undefined, limit: 100 }).subscribe({
      next: (x) => {
        this.lista.set(Array.isArray(x) ? x : []);
        this.cargando.set(false);
      },
      error: () => {
        this.lista.set([]);
        this.cargando.set(false);
        this.toast.error('No se pudo cargar el historial de traspasos.');
      },
    });
  }

  cargarSugerencias(): void {
    this.cargandoSugerencias.set(true);
    this.api.sugerencias().subscribe({
      next: (x) => {
        this.sugerencias.set(Array.isArray(x) ? x : []);
        this.cargandoSugerencias.set(false);
      },
      error: () => {
        this.sugerencias.set([]);
        this.cargandoSugerencias.set(false);
      },
    });
  }

  onOrigenChange(): void {
    this.variante = null;
    this.errorStock.set('');
    this.cargarStockOrigen();
  }

  onProductoChange(): void {
    this.variante = null;
    const pid = this.productoId;
    if (!pid) {
      this.variantes.set([]);
      return;
    }
    this.catalog.getProductVariants(pid).subscribe({
      next: (x) => this.variantes.set(Array.isArray(x) ? x : []),
      error: () => this.variantes.set([]),
    });
  }

  stockDe(varianteId: number): number {
    return this.stockOrigen().get(varianteId) ?? 0;
  }

  stockSeleccionado(): number {
    return this.variante != null ? this.stockDe(this.variante) : 0;
  }

  nombreSucursal(id: number): string {
    return this.sucursales().find((sucursal) => sucursal.id === id)?.nombre ?? `Sucursal #${id}`;
  }

  productoDeDetalle(productoId?: number | null): string {
    if (!productoId) return 'Producto';
    return this.productos().find((producto) => producto.id === productoId)?.nombre ?? `Producto #${productoId}`;
  }

  totalUnidades(t: Traspaso): number {
    return (t.detalles ?? []).reduce((total, detalle) => total + (detalle.cantidad ?? 0), 0);
  }

  tieneHistorial(t: Traspaso): boolean {
    return !!t.detalles?.[0]?.producto_id;
  }

  private cargarStockOrigen(): void {
    if (!this.origen) {
      this.stockOrigen.set(new Map());
      return;
    }
    this.cargandoStock.set(true);
    this.inv.getBranchInventory(this.origen).subscribe({
      next: (items) => {
        const mapa = new Map<number, number>();
        for (const item of Array.isArray(items) ? items : []) {
          mapa.set(item.variante_producto_id, item.cantidad_disponible ?? item.cantidad ?? 0);
        }
        this.stockOrigen.set(mapa);
        this.cargandoStock.set(false);
      },
      error: () => {
        this.stockOrigen.set(new Map());
        this.cargandoStock.set(false);
      },
    });
  }
  crear(): void {
    if (!this.origen || !this.destino || !this.variante || this.creando()) return;
    if (this.origen === this.destino) {
      this.errorStock.set('Origen y destino no pueden ser la misma sucursal.');
      return;
    }
    const stockLocal = this.stockDe(this.variante);
    if (this.stockOrigen().size > 0 && stockLocal < this.cantidad) {
      this.errorStock.set(`Stock insuficiente en origen: disponible ${stockLocal}, solicitado ${this.cantidad}.`);
      return;
    }
    this.errorStock.set('');
    this.creando.set(true);
    const crear = () => this.api.crear({
      sucursal_origen_id: this.origen!,
      sucursal_destino_id: this.destino!,
      detalles: [{ variante_producto_id: this.variante!, cantidad: this.cantidad }],
    }).pipe(finalize(() => this.creando.set(false))).subscribe({
      next: () => {
        this.toast.success('El traspaso fue creado y el stock se descontó del origen.', 'Traspaso creado');
        this.cargar();
        this.cargarSugerencias();
      },
      error: () => this.toast.error('No se pudo crear el traspaso. Revisa el stock disponible.'),
    });
    if (this.stockOrigen().size > 0) {
      crear();
      return;
    }
    this.inv.getBranchInventory(this.origen).subscribe({
      next: (items) => {
        const stock = (Array.isArray(items) ? items : []).find((item) => item.variante_producto_id === this.variante)?.cantidad_disponible ?? 0;
        if (stock < this.cantidad) {
          this.creando.set(false);
          this.errorStock.set(`Stock insuficiente en origen: disponible ${stock}, solicitado ${this.cantidad}.`);
          return;
        }
        crear();
      },
      error: () => {
        this.creando.set(false);
        this.errorStock.set('No se pudo verificar el stock de la sucursal origen.');
      },
    });
  }

  historial(t: Traspaso): void {
    const productoId = t.detalles?.[0]?.producto_id;
    if (!productoId) return;
    this.historialSel.set(t.id ?? null);
    this.historialProducto.set(null);
    this.cargandoHistorial.set(true);
    this.api.historialProducto(productoId).subscribe({
      next: (historial) => {
        this.historialProducto.set(historial);
        this.cargandoHistorial.set(false);
      },
      error: () => {
        this.cargandoHistorial.set(false);
        this.toast.error('No se pudo cargar el historial del producto.');
      },
    });
  }
}
