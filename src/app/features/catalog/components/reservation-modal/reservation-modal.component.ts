import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Producto, VarianteProducto } from '../../../../core/models/catalog.model';
import { DisponibilidadSucursal } from '../../../../core/models/public-catalog.model';
import { ReservationService } from '../../../../core/services/reservation.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-reservation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close()">
      <div class="modal-dialog card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div class="modal-title-box">
            <i class="ri-calendar-check-line header-icon"></i>
            <h3 class="modal-title">Reservar Prenda en Sucursal</h3>
          </div>
          <button class="btn-close" (click)="close()">
            <i class="ri-close-line"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          @if (!authService.isAuthenticated()) {
            <div class="auth-notice">
              <i class="ri-lock-line"></i>
              <p>Debes iniciar sesión para realizar una reserva en tienda.</p>
              <button class="btn btn-primary btn-sm" (click)="goToLogin()">
                Iniciar Sesión
              </button>
            </div>
          } @else {
            <!-- Product Summary -->
            <div class="product-summary">
              <img [src]="product.imagenes[0] || 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=400&auto=format&fit=crop'" [alt]="product.nombre" class="summary-img" />
              <div class="summary-info">
                <h4 class="summary-title">{{ product.nombre }}</h4>
                <div class="summary-specs">
                  @if (variant.talla) {
                    <span class="spec-badge">Talla: {{ variant.talla.valor || variant.talla.nombre }}</span>
                  }
                  @if (variant.color) {
                    <span class="spec-badge">Color: {{ variant.color.nombre }}</span>
                  }
                </div>
                <div class="summary-price">Bs. {{ product.precio | number:'1.2-2' }}</div>
              </div>
            </div>

            <!-- Branch Info -->
            <div class="branch-card">
              <div class="branch-card-header">
                <i class="ri-map-pin-2-line"></i>
                <span class="branch-card-title">{{ branch.sucursal_nombre }}</span>
              </div>
              <span class="branch-card-stock">
                Stock disponible en sucursal: <strong>{{ branch.cantidad_disponible }} uds.</strong>
              </span>
            </div>

            <!-- Form -->
            <form (ngSubmit)="submitReservation()">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Cantidad <span class="required">*</span></label>
                  <input 
                    type="number" 
                    class="form-control" 
                    [(ngModel)]="quantity" 
                    name="quantity"
                    min="1" 
                    [max]="branch.cantidad_disponible" 
                    required
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Fecha de Visita <span class="required">*</span></label>
                  <input 
                    type="date" 
                    class="form-control" 
                    [(ngModel)]="reservationDate" 
                    name="reservationDate"
                    [min]="minDate"
                    required
                  />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Horario Aproximado</label>
                <input 
                  type="time" 
                  class="form-control" 
                  [(ngModel)]="reservationTime" 
                  name="reservationTime"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Notas Adicionales</label>
                <textarea 
                  class="form-control" 
                  rows="2" 
                  [(ngModel)]="notes" 
                  name="notes"
                  placeholder="Ej: Iré en la tarde a probármelo..."
                ></textarea>
              </div>

              <!-- Footer Actions -->
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" (click)="close()">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  class="btn btn-accent" 
                  [disabled]="loading || !reservationDate || quantity < 1"
                >
                  @if (loading) {
                    <i class="ri-loader-4-line spin-icon"></i> Procesando...
                  } @else {
                    <i class="ri-check-line"></i> Confirmar Reserva
                  }
                </button>
              </div>
            </form>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .modal-dialog {
      width: 100%;
      max-width: 520px;
      background: white;
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-xl);
      overflow: hidden;
      padding: 0;
      animation: fadeIn 0.3s ease;
    }

    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-light);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .modal-title-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .header-icon {
      font-size: 1.35rem;
      color: var(--accent);
    }

    .modal-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--primary);
      margin: 0;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 1.25rem;
      color: var(--text-muted);
      cursor: pointer;
      &:hover { color: var(--error); }
    }

    .modal-body {
      padding: 1.5rem;
    }

    .auth-notice {
      text-align: center;
      padding: 2rem 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      color: var(--text-muted);

      i { font-size: 2.5rem; color: var(--accent); }
    }

    .product-summary {
      display: flex;
      gap: 1rem;
      padding: 0.75rem;
      background: #f8fafc;
      border-radius: var(--radius-md);
      margin-bottom: 1rem;
    }

    .summary-img {
      width: 60px;
      height: 60px;
      border-radius: var(--radius-sm);
      object-fit: cover;
    }

    .summary-info {
      flex: 1;
    }

    .summary-title {
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--primary);
    }

    .summary-specs {
      display: flex;
      gap: 0.35rem;
      margin: 0.25rem 0;
    }

    .spec-badge {
      font-size: 0.75rem;
      background: white;
      padding: 0.1rem 0.4rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
      color: var(--secondary);
    }

    .summary-price {
      font-weight: 700;
      color: var(--accent);
      font-size: 0.9rem;
    }

    .branch-card {
      background: rgba(225, 29, 72, 0.04);
      border: 1px solid rgba(225, 29, 72, 0.2);
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      margin-bottom: 1.25rem;
    }

    .branch-card-header {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      color: var(--accent);
      font-weight: 700;
      font-size: 0.9375rem;
    }

    .branch-card-stock {
      font-size: 0.8125rem;
      color: var(--text-muted);
      margin-left: 1.4rem;
      display: block;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-light);
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class ReservationModalComponent {
  private resService = inject(ReservationService);
  private toast = inject(ToastService);
  public authService = inject(AuthService);
  private router = inject(Router);

  @Input({ required: true }) product!: Producto;
  @Input({ required: true }) variant!: VarianteProducto;
  @Input({ required: true }) branch!: DisponibilidadSucursal;
  @Output() closed = new EventEmitter<boolean>();

  public quantity: number = 1;
  public reservationDate: string = '';
  public reservationTime: string = '15:00';
  public notes: string = '';
  public loading: boolean = false;

  get minDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  close(): void {
    this.closed.emit(false);
  }

  goToLogin(): void {
    this.close();
    this.router.navigate(['/auth/login']);
  }

  submitReservation(): void {
    if (!this.variant?.id) {
      this.toast.error('Debe seleccionar una variante válida');
      return;
    }

    this.loading = true;
    const isoDateTime = `${this.reservationDate}T${this.reservationTime || '12:00'}:00`;

    this.resService.createReservation({
      sucursal_id: this.branch.sucursal_id,
      fecha_reserva: isoDateTime,
      horario_aproximado: this.reservationTime || undefined,
      notas: this.notes || undefined,
      detalles: [
        {
          variante_producto_id: this.variant.id,
          cantidad: this.quantity
        }
      ]
    }).subscribe({
      next: (res) => {
        this.loading = false;
        this.toast.success(`¡Reserva creada exitosamente! Código: ${res.numero_reserva}`);
        this.closed.emit(true);
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.detail || 'Error al crear la reserva';
        this.toast.error(msg);
      }
    });
  }
}
