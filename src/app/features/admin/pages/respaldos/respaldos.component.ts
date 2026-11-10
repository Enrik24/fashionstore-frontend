import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { BackupsApiService } from '../../../../core/services/backups-api.service';
import { PlanFeatureService } from '../../../../core/services/plan-feature.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PlanFeatureLockComponent } from '../../../../shared/components/plan-feature-lock/plan-feature-lock.component';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';
import { Backup, Restauracion, UsoRespaldos } from '../../../../core/models/backup.model';

/**
 * [EXAMEN-2] CU20: gestión separada de respaldos manuales y automáticos.
 */
@Component({
  selector: 'app-respaldos',
  standalone: true,
  imports: [CommonModule, FormsModule, PlanFeatureLockComponent, StatusBadgePipe],
  templateUrl: './respaldos.component.html',
  styleUrl: './respaldos.component.scss'
})
export class RespaldosComponent implements OnInit {
  private api = inject(BackupsApiService);
  private planFeature = inject(PlanFeatureService);
  private toast = inject(ToastService);

  manuales = signal<Backup[]>([]);
  automaticos = signal<Backup[]>([]);
  usoSig = signal<UsoRespaldos | null>(null);
  restauraciones = signal<Restauracion[]>([]);
  cargando = signal(true);
  creando = signal(false);
  descargandoId = signal<number | null>(null);
  restaurando = signal(false);
  seleccion: Backup | null = null;
  textoConfirmacion = '';
  motivo = '';

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    forkJoin({
      manuales: this.api.listar({ tipo: 'MANUAL', limit: 200 }),
      automaticos: this.api.listar({ tipo: 'AUTOMATICO', limit: 200 }),
      uso: this.api.uso(),
      restauraciones: this.api.listarRestauraciones()
    }).subscribe({
      next: ({ manuales, automaticos, uso, restauraciones }) => {
        this.manuales.set(manuales);
        this.automaticos.set(automaticos);
        this.usoSig.set(uso);
        this.restauraciones.set(restauraciones);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No fue posible cargar los respaldos. Intenta nuevamente.');
      }
    });
  }

  uso(): UsoRespaldos | null {
    return this.usoSig();
  }

  restantesManual(): number | null {
    const uso = this.usoSig();
    if (!uso) return null;
    if (uso.restantes_mes_actual !== undefined && uso.restantes_mes_actual !== null) {
      return uso.restantes_mes_actual;
    }
    if (uso.restantes !== undefined && uso.restantes !== null) return uso.restantes;
    if (uso.max_backups_manuales === null || uso.max_backups_manuales === undefined) return null;
    return Math.max(0, uso.max_backups_manuales - (uso.backups_mes_actual ?? 0));
  }

  puedeCrear(): boolean {
    const restantes = this.restantesManual();
    return this.planFeature.puedeRespaldos() && (restantes === null || restantes > 0) && !this.creando();
  }

  puedeRestaurar(): boolean {
    return this.planFeature.puedeRestaurar();
  }

  puedeConfirmar(): boolean {
    return this.textoConfirmacion === 'RESTAURAR' && this.motivo.trim().length >= 10 && !this.restaurando();
  }

  crear(): void {
    if (!this.puedeCrear()) return;
    this.creando.set(true);
    this.api.crearManual().pipe(finalize(() => this.creando.set(false))).subscribe({
      next: () => {
        this.toast.success('El respaldo manual se creó correctamente.', 'Respaldo creado');
        this.cargar();
      },
      error: (error) => this.toast.error(this.mensajeError(error, 'No se pudo crear el respaldo manual.'))
    });
  }

  descargar(backup: Backup): void {
    if (backup.estado !== 'COMPLETADO' || this.descargandoId() !== null) return;
    this.descargandoId.set(backup.id);
    this.api.descargar(backup.id).pipe(finalize(() => this.descargandoId.set(null))).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = this.nombreArchivo(backup);
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        URL.revokeObjectURL(url);
      },
      error: (error) => this.toast.error(this.mensajeError(error, 'No se pudo descargar el respaldo.'))
    });
  }

  nombreArchivo(backup: Backup): string {
    return backup.nombre_archivo ?? `respaldo-${backup.tipo.toLowerCase()}-${backup.id}`;
  }

  abrirRestauracion(backup: Backup): void {
    if (!this.puedeRestaurar() || backup.estado !== 'COMPLETADO') return;
    this.seleccion = backup;
    this.textoConfirmacion = '';
    this.motivo = '';
  }

  cerrarRestauracion(): void {
    this.seleccion = null;
    this.textoConfirmacion = '';
    this.motivo = '';
  }

  restaurar(): void {
    if (!this.seleccion || !this.puedeConfirmar()) return;
    this.restaurando.set(true);
    this.api.restaurar(this.seleccion.id, this.motivo.trim()).pipe(finalize(() => this.restaurando.set(false))).subscribe({
      next: () => {
        this.toast.success('La solicitud de restauración fue registrada.', 'Restauración solicitada');
        this.cerrarRestauracion();
        this.cargar();
      },
      error: (error) => this.toast.error(this.mensajeError(error, 'No se pudo solicitar la restauración.'))
    });
  }

  private mensajeError(error: { error?: { detail?: string }; message?: string }, fallback: string): string {
    return error.error?.detail ?? error.message ?? fallback;
  }
}
