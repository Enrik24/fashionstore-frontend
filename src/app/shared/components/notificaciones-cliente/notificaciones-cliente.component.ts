import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificacionesClienteApiService } from '../../../core/services/notificaciones-cliente-api.service';
import { NotificacionCliente } from '../../../core/models/notificacion-cliente.model';
import { StatusBadgePipe } from '../../pipes/status-badge.pipe';

/**
 * [EXAMEN-2] RN-024: campana de avisos (CU18/CU19).
 */
@Component({
  selector: 'app-notificaciones-cliente',
  standalone: true,
  imports: [CommonModule, StatusBadgePipe],
  template: `
    <div class="notif">
      <button type="button" class="bell" (click)="toggle()" aria-label="Notificaciones">
        <i [class]="noLeidas() > 0 ? 'ri-notification-3-fill' : 'ri-notification-3-line'"></i>
        @if (noLeidas() > 0) { <span class="badge">{{ noLeidas() }}</span> }
      </button>
      @if (abierta()) {
        <div class="panel" role="status" aria-live="polite">
          <div class="panel-head"><strong>Avisos</strong><span>{{ noLeidas() }} sin leer</span></div>
          @for (n of notificaciones(); track n.id) {
            <article class="item" [class.no-leida]="!n.leida">
              <span class="badge" [ngClass]="(n.tipo | statusBadge).class">{{ (n.tipo | statusBadge).label }}</span>
              <div><strong>{{ n.asunto }}</strong><p>{{ n.mensaje }}</p><small>{{ n.canal }} · {{ n.estado }} · {{ n.fecha_creacion }}</small></div>
              @if (!n.leida) { <button type="button" (click)="marcar(n)">Marcar leída</button> }
            </article>
          } @empty { <p class="vacio">Sin avisos por ahora.</p> }
        </div>
      }
    </div>
  `,
  styles: [`.notif{position:relative}.bell{position:relative;background:#fff;border:1px solid var(--border-color);border-radius:50%;width:40px;height:40px}.badge{background:#ef4444;color:#fff;border-radius:9999px;font-size:.65rem;padding:.1rem .35rem}.panel{position:absolute;right:0;top:calc(100% + 8px);width:340px;max-width:90vw;background:#fff;border:1px solid var(--border-color);border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.15);z-index:1000;padding:.8rem}.panel-head{display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding-bottom:.4rem}.item{display:flex;gap:.5rem;padding:.5rem 0;border-bottom:1px solid #f1f5f9}.item.no-leida{background:#fff7ed}.vacio{text-align:center;color:var(--text-muted)}`]
})
export class NotificacionesClienteComponent implements OnInit {
  private api = inject(NotificacionesClienteApiService);
  notificaciones = signal<NotificacionCliente[]>([]);
  noLeidas = signal(0);
  abierta = signal(false);
  ngOnInit(): void { void this.cargar(); }
  toggle(): void { this.abierta.update((v) => !v); void this.cargar(); }
  cargar(): Promise<void> { return new Promise((res) => this.api.misNotificaciones({ limit: 50 }).subscribe({ next: (items) => { this.notificaciones.set(items); this.noLeidas.set(items.filter((n) => !n.leida).length); res(); }, error: () => res() })); }
  marcar(n: NotificacionCliente): void { this.api.marcarLeida(n.id).subscribe({ next: () => { this.notificaciones.update((items) => items.map((x) => x.id === n.id ? { ...x, leida: true } : x)); this.noLeidas.update((c) => Math.max(0, c - 1)); } }); }
}
