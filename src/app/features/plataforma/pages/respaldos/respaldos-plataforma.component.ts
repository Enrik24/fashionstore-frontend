import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackupsApiService } from '../../../../core/services/backups-api.service';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';
import { Backup } from '../../../../core/models/backup.model';

/**
 * [EXAMEN-2] CU20: respaldos de plataforma (Super Administrador).
 */
@Component({
  selector: 'app-respaldos-plataforma',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgePipe],
  template: `
    <section>
      <header><span class="eyebrow">CU20 · Plataforma</span><h1>Respaldos de todos los tenants</h1></header>
      @for (b of lista(); track b.id) {
        <div class="card">
          <strong>{{ b.tenant?.razon_social ?? b.tenant_id }}</strong> {{ b.nombre_archivo }}
          <span class="badge" [ngClass]="(b.estado | statusBadge).class">{{ (b.estado | statusBadge).label }}</span>
          <p>{{ b.fecha_inicio }} · creador {{ b.creado_por }}</p>
          <button type="button" class="btn btn-sm btn-outline" (click)="descargar(b)">Descargar</button>
          <button type="button" class="btn btn-sm" (click)="seleccion = b">Restaurar</button>
        </div>
      } @empty { <p>Sin respaldos de plataforma.</p> }
      @if (seleccion) {
        <div class="card">
          <h2>Restauración con motivo obligatorio</h2>
          <textarea [(ngModel)]="motivo" rows="2"></textarea>
          <button type="button" class="btn btn-sm" [disabled]="motivo.trim().length < 10" (click)="restaurar()">Confirmar con motivo</button>
        </div>
      }
    </section>
  `,
  styles: [`.card{background:#fff;border:1px solid var(--border-color);border-radius:12px;padding:1rem;margin:.6rem 0}`]
})
export class RespaldosPlataformaComponent implements OnInit {
  private api = inject(BackupsApiService);
  lista = signal<Backup[]>([]);
  seleccion: Backup | null = null;
  motivo = '';
  ngOnInit(): void { this.api.listar({ limit: 100 }).subscribe({ next: (x) => this.lista.set(x), error: () => undefined }); }
  descargar(b: Backup): void { this.api.descargar(b.id).subscribe({ next: (blob) => { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = b.nombre_archivo ?? `respaldo-${b.id}`; a.click(); URL.revokeObjectURL(u); } }); }
  restaurar(): void { if (!this.seleccion) return; this.api.restaurar(this.seleccion.id, this.motivo).subscribe({ next: () => { this.seleccion = null; this.motivo = ''; } }); }
}
