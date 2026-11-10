import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { CompensacionesApiService } from '../../../../core/services/compensaciones-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';
import {
  Compensacion,
  ResumenCompensacionEstado,
  ResumenCompensaciones,
} from '../../../../core/models/compensacion.model';

/**
 * [EXAMEN-2] CU19: compensaciones de ventas offline rechazadas.
 */
@Component({
  selector: 'app-compensaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgePipe],
  templateUrl: './compensaciones.component.html',
  styleUrls: ['./compensaciones.component.scss'],
})
export class CompensacionesComponent implements OnInit {
  private api = inject(CompensacionesApiService);
  private toast = inject(ToastService);

  lista = signal<Compensacion[]>([]);
  resumen = signal<ResumenCompensaciones | null>(null);
  cargando = signal(true);
  error = signal('');
  procesandoId = signal<number | null>(null);
  filtro = '';
  tipoFiltro = '';
  detalleAbierto = signal<number | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.api.resumen().subscribe({
      next: (resumen) => this.resumen.set(resumen),
      error: () => this.resumen.set(null),
    });

    this.api.listar({
      estado: this.filtro || undefined,
      limit: 100,
    }).subscribe({
      next: (lista) => {
        this.lista.set(Array.isArray(lista) ? lista : []);
        this.cargando.set(false);
      },
      error: () => {
        this.lista.set([]);
        this.cargando.set(false);
        this.error.set('No se pudieron cargar las compensaciones. Intenta nuevamente.');
      },
    });
  }

  limpiarFiltros(): void {
    this.filtro = '';
    this.tipoFiltro = '';
    this.cargar();
  }

  listaVisible(): Compensacion[] {
    return this.tipoFiltro
      ? this.lista().filter((compensacion) => compensacion.tipo === this.tipoFiltro)
      : this.lista();
  }

  resumenEstado(estado: string): ResumenCompensacionEstado {
    const resumen = this.resumen();
    return resumen?.por_estado?.[estado] ?? { cantidad: 0, monto: 0 };
  }

  totalPendientes(): number {
    const resumen = this.resumen();
    return resumen?.pendientes ?? resumen?.total_pendiente ?? this.resumenEstado('PENDIENTE').cantidad;
  }

  montoPendiente(): number {
    const resumen = this.resumen();
    return resumen?.monto_pendiente ?? this.resumenEstado('PENDIENTE').monto;
  }

  totalCompletadas(): number {
    const resumen = this.resumen();
    return resumen?.completadas ?? resumen?.total_completado ?? this.resumenEstado('COMPLETADA').cantidad;
  }

  totalFallidas(): number {
    const resumen = this.resumen();
    return resumen?.fallidas ?? this.resumenEstado('FALLIDA').cantidad;
  }

  etiquetaTipo(tipo: string): string {
    const etiquetas: Record<string, string> = {
      REEMBOLSO_EFECTIVO: 'Reembolso en efectivo',
      REEMBOLSO_TARJETA: 'Reembolso por tarjeta',
      NOTA_CREDITO: 'Nota de crédito',
      SALDO_FAVOR: 'Saldo a favor',
    };
    return etiquetas[tipo] ?? tipo;
  }

  referencia(c: Compensacion): string {
    return c.orden?.numero_orden ?? (c.orden_id != null ? `Orden #${c.orden_id}` : `Compensación #${c.id}`);
  }

  alternarDetalle(c: Compensacion): void {
    this.detalleAbierto.set(this.detalleAbierto() === c.id ? null : c.id);
  }

  confirmar(c: Compensacion): void {
    if (this.procesandoId() !== null) return;
    this.procesandoId.set(c.id);
    this.api.confirmarEfectivo(c.id).pipe(finalize(() => this.procesandoId.set(null))).subscribe({
      next: () => {
        this.toast.success('El reembolso en efectivo fue confirmado.', 'Compensación completada');
        this.cargar();
      },
      error: () => this.toast.error('No se pudo confirmar el reembolso en efectivo.'),
    });
  }

  reintentar(c: Compensacion): void {
    if (this.procesandoId() !== null) return;
    this.procesandoId.set(c.id);
    this.api.reintentar(c.id).pipe(finalize(() => this.procesandoId.set(null))).subscribe({
      next: (actualizada) => {
        if (actualizada.estado === 'COMPLETADA') {
          this.toast.success('La compensación fue procesada correctamente.', 'Reintento completado');
        } else {
          this.toast.warning(actualizada.error_detalle || 'La pasarela rechazó nuevamente la operación.', 'Reintento fallido');
        }
        this.cargar();
      },
      error: () => this.toast.error('No se pudo reintentar la compensación por la pasarela.'),
    });
  }
}
