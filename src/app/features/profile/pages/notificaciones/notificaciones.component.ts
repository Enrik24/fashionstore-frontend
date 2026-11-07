import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificacionesClienteApiService } from '../../../../core/services/notificaciones-cliente-api.service';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';
import { NotificacionCliente } from '../../../../core/models/notificacion-cliente.model';

/**
 * [EXAMEN-2] RN-024: bandeja de avisos del cliente.
 */
@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule, StatusBadgePipe],
  template: `
    <section>
      <header><span class="eyebrow">RN-024 · Avisos</span><h1>Mis notificaciones</h1></header>
      @for (n of lista(); track n.id) {
        <div class="card" [class.no-leida]="!n.leida">
          <span class="badge" [ngClass]="(n.tipo | statusBadge).class">{{ (n.tipo | statusBadge).label }}</span>
          <span>{{ n.canal }}</span> <span class="badge" [ngClass]="(n.estado | statusBadge).class">{{ (n.estado | statusBadge).label }}</span>
          <h2>{{ n.asunto }}</h2><p>{{ n.mensaje }}</p>
          <small>{{ n.fecha_creacion }} @if (n.referencia_tipo) { · {{ n.referencia_tipo }} #{{ n.referencia_id }} }</small>
          @if (!n.leida) { <button type="button" class="btn btn-sm" (click)="marcar(n)">Marcar leída</button> }
        </div>
      } @empty { <p>Sin notificaciones.</p> }
    </section>
  `,
  styles: [`.card{background:#fff;border:1px solid var(--border-color);border-radius:12px;padding:1rem;margin:.6rem 0} .no-leida{border-left:4px solid var(--accent)}`]
})
export class NotificacionesComponent implements OnInit {
  private api = inject(NotificacionesClienteApiService);
  lista = signal<NotificacionCliente[]>([]);
  ngOnInit(): void { this.cargar(); }
  cargar(): void { this.api.misNotificaciones({ limit: 100 }).subscribe({ next: (x) => this.lista.set(x), error: () => undefined }); }
  marcar(n: NotificacionCliente): void { this.api.marcarLeida(n.id).subscribe({ next: () => this.cargar() }); }
}
