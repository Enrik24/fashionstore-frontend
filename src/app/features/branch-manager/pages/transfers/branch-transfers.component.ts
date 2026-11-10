import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { TraspasosApiService } from '../../../../core/services/traspasos-api.service';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';
import { DetalleTraspaso, Traspaso } from '../../../../core/models/traspaso.model';
import { Sucursal } from '../../../../core/models/branch.model';

/**
 * [EXAMEN-2] CU14: recepción total o parcial con merma.
 */
@Component({
  selector: 'app-branch-transfers',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgePipe],
  templateUrl: './branch-transfers.component.html',
  styleUrls: ['./branch-transfers.component.scss'],
})
export class BranchTransfersComponent implements OnInit {
  private api = inject(TraspasosApiService);
  private branchApi = inject(BranchApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  lista = signal<Traspaso[]>([]);
  sucursales = signal<Sucursal[]>([]);
  cargando = signal(true);
  error = signal('');
  accion = signal<'recibir' | 'rechazar' | null>(null);
  panelRechazoId = signal<number | null>(null);
  motivoRechazo = '';
  cantidadesRecibidas: Record<number, number> = {};
  cantidadesMerma: Record<number, number> = {};
  lineasRechazables: Record<number, boolean> = {};

  get sucursalActual(): number | null {
    return this.auth.userSucursalId();
  }

  get nombreSucursalActual(): string {
    return this.auth.userSucursalNombre() || 'tu sucursal';
  }

  ngOnInit(): void {
    this.cargar();
    this.branchApi.getBranches(0, 100).subscribe({
      next: (x) => this.sucursales.set(Array.isArray(x) ? x : []),
      error: () => this.toast.error('No se pudieron cargar los nombres de las sucursales.'),
    });
  }

  cargar(): void {
    const sucursalId = this.sucursalActual;
    if (!sucursalId) {
      this.lista.set([]);
      this.cargando.set(false);
      this.error.set('Tu sesión no tiene una sucursal asignada. Contacta al administrador.');
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    this.api.listar({ estado: 'EN_TRANSITO', sucursal_id: sucursalId, limit: 100 }).subscribe({
      next: (x) => {
        // El endpoint filtra por origen o destino; esta pantalla solo admite
        // mercancía dirigida a la sucursal del Encargado.
        this.lista.set(x.filter((t) => t.sucursal_destino_id === sucursalId));
        this.prepararLineas(this.lista());
        this.cargando.set(false);
      },
      error: () => {
        this.lista.set([]);
        this.cargando.set(false);
        this.error.set('No se pudieron cargar los traspasos pendientes.');
      },
    });
  }

  private prepararLineas(traspasos: Traspaso[]): void {
    for (const traspaso of traspasos) {
      for (const detalle of traspaso.detalles ?? []) {
        const id = this.claveDetalle(detalle);
        this.cantidadesRecibidas[id] = detalle.cantidad;
        this.cantidadesMerma[id] = detalle.cantidad_merma ?? 0;
        this.lineasRechazables[id] = false;
      }
    }
  }

  claveDetalle(detalle: DetalleTraspaso): number {
    return detalle.id ?? detalle.variante_producto_id;
  }

  nombreSucursal(id: number): string {
    return this.sucursales().find((s) => s.id === id)?.nombre ?? `Sucursal #${id}`;
  }

  cantidadRecibida(detalle: DetalleTraspaso): number {
    return this.cantidadesRecibidas[this.claveDetalle(detalle)] ?? detalle.cantidad;
  }

  cantidadMerma(detalle: DetalleTraspaso): number {
    return this.cantidadesMerma[this.claveDetalle(detalle)] ?? 0;
  }

  pendiente(detalle: DetalleTraspaso): number {
    return Math.max(0, detalle.cantidad - this.cantidadRecibida(detalle) - this.cantidadMerma(detalle));
  }

  totalUnidades(t: Traspaso): number {
    return (t.detalles ?? []).reduce((total, detalle) => total + detalle.cantidad, 0);
  }

  totalPendiente(t: Traspaso): number {
    return (t.detalles ?? []).reduce((total, detalle) => total + this.pendiente(detalle), 0);
  }

  totalPendienteGlobal(): number {
    return this.lista().reduce((total, traspaso) => total + this.totalPendiente(traspaso), 0);
  }

  totalLineas(): number {
    return this.lista().reduce((total, traspaso) => total + (traspaso.detalles?.length ?? 0), 0);
  }

  setCantidadRecibida(detalle: DetalleTraspaso, valor: number | string): void {
    this.cantidadesRecibidas[this.claveDetalle(detalle)] = Math.max(0, Number(valor) || 0);
  }

  setCantidadMerma(detalle: DetalleTraspaso, valor: number | string): void {
    this.cantidadesMerma[this.claveDetalle(detalle)] = Math.max(0, Number(valor) || 0);
  }

  lineaValida(detalle: DetalleTraspaso): boolean {
    const recebida = this.cantidadRecibida(detalle);
    const merma = this.cantidadMerma(detalle);
    return recebida + merma === detalle.cantidad && recebida >= 0 && merma >= 0;
  }

  puedeRecibir(t: Traspaso): boolean {
    return (t.detalles ?? []).every((d) => this.lineaValida(d));
  }

  abrirRechazo(t: Traspaso): void {
    this.panelRechazoId.set(t.id ?? null);
    this.motivoRechazo = '';
    for (const detalle of t.detalles ?? []) {
      this.lineasRechazables[this.claveDetalle(detalle)] = false;
    }
  }

  cerrarRechazo(): void {
    this.panelRechazoId.set(null);
    this.motivoRechazo = '';
  }

  alternarLineaRechazo(detalle: DetalleTraspaso): void {
    const id = this.claveDetalle(detalle);
    this.lineasRechazables[id] = !this.lineasRechazables[id];
  }

  recibir(t: Traspaso): void {
    if (!t.id || this.accion()) return;
    if (!this.puedeRecibir(t)) {
      this.toast.warning('Revisa las cantidades: recibida + merma debe igualar lo enviado.');
      return;
    }

    this.accion.set('recibir');
    const detalles = t.detalles.map((d) => ({
      detalle_id: this.claveDetalle(d),
      cantidad_recibida: this.cantidadRecibida(d),
      cantidad_merma: this.cantidadMerma(d),
    }));
    this.api.recibir(t.id, { detalles }).pipe(finalize(() => this.accion.set(null))).subscribe({
      next: () => {
        this.toast.success(`Recepción de ${t.numero} confirmada correctamente.`);
        this.cargar();
      },
      error: (error) => this.toast.error(this.errorApi(error, 'No se pudo confirmar la recepción.')),
    });
  }

  rechazar(t: Traspaso): void {
    if (!t.id || this.accion()) return;
    const detalleIds = (t.detalles ?? [])
      .filter((d) => this.lineasRechazables[this.claveDetalle(d)])
      .map((d) => this.claveDetalle(d));
    if (!detalleIds.length) {
      this.toast.warning('Selecciona al menos una línea para rechazar.');
      return;
    }
    if (this.motivoRechazo.trim().length < 3) {
      this.toast.warning('Escribe el motivo del rechazo.');
      return;
    }

    this.accion.set('rechazar');
    this.api.rechazar(t.id, {
      detalles: detalleIds.map((detalle_id) => ({ detalle_id })),
      motivo: this.motivoRechazo.trim(),
      devolver_origen: true,
    }).pipe(finalize(() => this.accion.set(null))).subscribe({
      next: () => {
        this.toast.success(`Las líneas seleccionadas de ${t.numero} fueron rechazadas.`);
        this.cerrarRechazo();
        this.cargar();
      },
      error: (error) => this.toast.error(this.errorApi(error, 'No se pudo rechazar las líneas.')),
    });
  }

  private errorApi(error: { error?: { detail?: string }; detail?: string }, fallback: string): string {
    return error?.error?.detail ?? error?.detail ?? fallback;
  }
}