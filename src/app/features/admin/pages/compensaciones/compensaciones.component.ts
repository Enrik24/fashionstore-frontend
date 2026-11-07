import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompensacionesApiService } from '../../../../core/services/compensaciones-api.service';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';
import { Compensacion, ResumenCompensaciones } from '../../../../core/models/compensacion.model';

/**
 * [EXAMEN-2] CU19: compensaciones de ventas offline rechazadas.
 */
@Component({
  selector: 'app-compensaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgePipe],
  template: `
    <section>
      <header><span class="eyebrow">CU19 · Compensaciones</span><h1>Compensaciones de ventas offline rechazadas</h1></header>
      @if (resumen(); as r) { <div class="card">Pendientes {{ r.pendientes ?? r.total_pendiente ?? 0 }} · Completadas {{ r.completadas ?? r.total_completado ?? 0 }} · Monto pendiente Bs. {{ r.monto_pendiente ?? 0 }}</div> }
      <div class="card filtros"><select [(ngModel)]="filtro" (ngModelChange)="cargar()"><option value="">Todos</option><option value="PENDIENTE">Pendiente</option><option value="COMPLETADA">Completada</option><option value="FALLIDA">Fallida</option></select><button type="button" class="btn btn-sm" (click)="cargar()">Filtrar</button></div>
      @for (c of lista(); track c.id) {
        <div class="card">
          <strong>{{ c.orden?.numero_orden ?? c.orden_id }}</strong> <span class="badge" [ngClass]="(c.tipo | statusBadge).class">{{ (c.tipo | statusBadge).label }}</span> Bs. {{ c.monto }}
          <span class="badge" [ngClass]="(c.estado | statusBadge).class">{{ (c.estado | statusBadge).label }}</span>
          <p>{{ c.motivo }} · Cliente notificado: {{ c.notificado_cliente ? 'sí' : 'no' }} · {{ c.fecha_creacion }}</p>
          @if (c.estado === 'PENDIENTE' && c.tipo === 'REEMBOLSO_EFECTIVO') { <button type="button" class="btn btn-sm btn-accent" (click)="confirmar(c)">Confirmar efectivo</button> }
          @if (c.estado === 'PENDIENTE' || c.estado === 'FALLIDA') { <button type="button" class="btn btn-sm btn-outline" (click)="reintentar(c)">Reintentar pasarela</button> }
          @if (c.error_detalle) { <p class="error">{{ c.error_detalle }}</p> }
        </div>
      } @empty { <p>Sin compensaciones.</p> }
    </section>
  `,
  styles: [`.card{background:#fff;border:1px solid var(--border-color);border-radius:12px;padding:1rem;margin:.6rem 0} .error{color:#991b1b}`]
})
export class CompensacionesComponent implements OnInit {
  private api = inject(CompensacionesApiService);
  lista = signal<Compensacion[]>([]);
  resumen = signal<ResumenCompensaciones | null>(null);
  filtro = '';
  ngOnInit(): void { this.cargar(); this.api.resumen().subscribe({ next: (x) => this.resumen.set(x), error: () => undefined }); }
  cargar(): void { this.api.listar({ estado: this.filtro || undefined }).subscribe({ next: (x) => this.lista.set(x), error: () => undefined }); }
  confirmar(c: Compensacion): void { this.api.confirmarEfectivo(c.id).subscribe({ next: () => this.cargar() }); }
  reintentar(c: Compensacion): void { this.api.reintentar(c.id).subscribe({ next: () => this.cargar() }); }
}
