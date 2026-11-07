import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackupsApiService } from '../../../../core/services/backups-api.service';
import { PlanFeatureService } from '../../../../core/services/plan-feature.service';
import { PlanFeatureLockComponent } from '../../../../shared/components/plan-feature-lock/plan-feature-lock.component';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';
import { Backup, Restauracion, UsoRespaldos } from '../../../../core/models/backup.model';

/**
 * [EXAMEN-2] CU20: respaldos del tenant con doble confirmación.
 */
@Component({
  selector: 'app-respaldos',
  standalone: true,
  imports: [CommonModule, FormsModule, PlanFeatureLockComponent, StatusBadgePipe],
  template: `
    <app-plan-feature-lock funcionalidad="respaldos">
      <section>
        <header><span class="eyebrow">CU20 · Respaldos</span><h1>Respaldos del tenant</h1></header>
        @if (uso(); as u) { <div class="card">Uso del mes: {{ u.backups_mes_actual }} / {{ u.max_backups_manuales ?? '∞' }}</div> }
        <button type="button" class="btn btn-sm btn-accent" [disabled]="!puedeCrear()" (click)="crear()">Crear respaldo manual</button>
        @for (b of lista(); track b.id) {
          <div class="card">
            <strong>{{ b.tipo }}</strong> <span class="badge" [ngClass]="(b.estado | statusBadge).class">{{ (b.estado | statusBadge).label }}</span>
            <p>{{ b.fecha_inicio }} · {{ b.tamano_bytes }} bytes · Retención hasta {{ b.retencion_hasta }}</p>
            <button type="button" class="btn btn-sm btn-outline" (click)="descargar(b)">Descargar</button>
            <button type="button" class="btn btn-sm" [disabled]="!puedeRestaurar()" (click)="seleccion = b">Solicitar restauración</button>
          </div>
        } @empty { <p>Sin respaldos.</p> }
        @if (seleccion) {
          <div class="dialog card">
            <h2>Restauración destructiva</h2>
            <p>Escribe RESTAURAR para confirmar. Motivo (mín. 10 caracteres):</p>
            <input [(ngModel)]="textoConfirmacion" placeholder="RESTAURAR">
            <textarea [(ngModel)]="motivo" rows="2"></textarea>
            <button type="button" class="btn btn-sm" [disabled]="!puedeConfirmar()" (click)="restaurar()">Confirmar restauración</button>
            <button type="button" class="btn btn-sm btn-outline" (click)="seleccion = null">Cancelar</button>
            @if (restauraciones().length) { <ul>@for (r of restauraciones(); track r.id) { <li>{{ r.estado }} — {{ r.motivo }}</li> }</ul> }
          </div>
        }
      </section>
    </app-plan-feature-lock>
  `,
  styles: [`.card{background:#fff;border:1px solid var(--border-color);border-radius:12px;padding:1rem;margin:.6rem 0} .dialog{border-color:#fecaca}`]
})
export class RespaldosComponent implements OnInit {
  private api = inject(BackupsApiService);
  private planFeature = inject(PlanFeatureService);
  lista = signal<Backup[]>([]);
  usoSig = signal<UsoRespaldos | null>(null);
  restauraciones = signal<Restauracion[]>([]);
  seleccion: Backup | null = null;
  textoConfirmacion = '';
  motivo = '';
  uso(): UsoRespaldos | null { return this.usoSig(); }
  ngOnInit(): void { this.cargar(); }
  cargar(): void { this.api.listar().subscribe({ next: (x) => this.lista.set(x), error: () => undefined }); this.api.uso().subscribe({ next: (x) => this.usoSig.set(x), error: () => undefined }); this.api.listarRestauraciones().subscribe({ next: (x) => this.restauraciones.set(x), error: () => undefined }); }
  puedeCrear(): boolean { return this.planFeature.puedeRespaldos(); }
  puedeRestaurar(): boolean { return this.planFeature.puedeRestaurar(); }
  puedeConfirmar(): boolean { return this.textoConfirmacion === 'RESTAURAR' && this.motivo.trim().length >= 10; }
  crear(): void { this.api.crearManual().subscribe({ next: () => this.cargar() }); }
  descargar(b: Backup): void { this.api.descargar(b.id).subscribe({ next: (blob) => { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = b.nombre_archivo ?? `respaldo-${b.id}`; a.click(); URL.revokeObjectURL(u); } }); }
  restaurar(): void { if (!this.seleccion || !this.puedeConfirmar()) return; this.api.restaurar(this.seleccion.id, this.motivo).subscribe({ next: () => { this.seleccion = null; this.cargar(); } }); }
}
