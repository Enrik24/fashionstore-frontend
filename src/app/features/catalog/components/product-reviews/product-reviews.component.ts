import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewsApiService } from '../../../../core/services/reviews-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StarRatingComponent } from '../../../../shared/components/star-rating/star-rating.component';
import { Valoracion, PuedeValorarResponse } from '../../../../core/models/review.model';

@Component({
  selector: 'app-product-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, StarRatingComponent],
  template: `
    <div class="reviews-section card" id="reviews">
      <div class="reviews-header">
        <h2 class="reviews-title"><i class="ri-star-smile-line"></i> Valoraciones de Clientes</h2>
      </div>

      <!-- Resumen -->
      <div class="reviews-summary">
        <div class="summary-average">
          @if (totalValoraciones > 0) {
            <span class="average-number">{{ promedioValoracion | number:'1.1-1' }}</span>
            <app-star-rating [value]="promedioValoracion" [readonly]="true" [size]="'md'"></app-star-rating>
            <span class="average-total">{{ totalValoraciones }} valoración(es)</span>
          } @else {
            <span class="average-number muted">Sin valoraciones</span>
            <app-star-rating [value]="0" [readonly]="true" [size]="'md'"></app-star-rating>
            <span class="average-total">Sé el primero en opinar sobre esta prenda</span>
          }
        </div>

        <div class="summary-distribution">
          @for (fila of distribucion(); track fila.estrella) {
            <div class="distribution-row">
              <span class="dist-label">{{ fila.estrella }} <i class="ri-star-fill"></i></span>
              <div class="dist-bar">
                <div class="dist-fill" [style.width.%]="fila.porcentaje"></div>
              </div>
              <span class="dist-count">{{ fila.cantidad }}</span>
            </div>
          }
        </div>
      </div>

      <!-- Zona de valoración -->
      <div class="review-actions-area">
        @if (!esCliente()) {
          <div class="info-box">
            <i class="ri-information-line"></i>
            <span>Inicia sesión como cliente y compra esta prenda para poder valorarla.</span>
          </div>
        } @else if (cargandoPuedeValorar()) {
          <div class="info-box">
            <i class="ri-loader-4-line spin-icon"></i>
            <span>Verificando si puedes valorar este producto...</span>
          </div>
        } @else if (mostrandoFormulario()) {
          <div class="review-form">
            <h4 class="form-title">
              <i class="ri-edit-2-line"></i>
              {{ miValoracion() ? 'Editar tu valoración' : 'Nueva valoración' }}
            </h4>

            <div class="form-group">
              <label class="form-label">Tu puntuación <span class="required">*</span></label>
              <app-star-rating
                [value]="nuevaPuntuacion()"
                [readonly]="false"
                [size]="'lg'"
                (valueChange)="nuevaPuntuacion.set($event)"
              ></app-star-rating>
              @if (errorPuntuacion()) {
                <span class="form-error">Selecciona de 1 a 5 estrellas para continuar</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="r-comentario">Comentario (opcional)</label>
              <textarea
                id="r-comentario"
                rows="4"
                maxlength="1000"
                class="form-control"
                [(ngModel)]="nuevoComentario"
                placeholder="Cuéntanos tu experiencia con esta prenda..."
              ></textarea>
              <span class="char-count">{{ nuevoComentario.length }}/1000 caracteres</span>
            </div>

            <div class="form-buttons">
              <button class="btn btn-outline btn-sm" [disabled]="guardando()" (click)="cancelarFormulario()">
                Cancelar
              </button>
              <button class="btn btn-accent btn-sm" [disabled]="guardando()" (click)="enviarValoracion()">
                @if (guardando()) {
                  <i class="ri-loader-4-line spin-icon"></i> Guardando...
                } @else {
                  <i class="ri-send-plane-line"></i> {{ miValoracion() ? 'Guardar cambios' : 'Publicar valoración' }}
                }
              </button>
            </div>
          </div>
        } @else if (miValoracion()) {
          <div class="my-review-box">
            <div class="my-review-header">
              <span class="my-review-tag"><i class="ri-user-3-line"></i> Tu valoración</span>
              <span class="estado-chip" [ngClass]="getEstadoClass(miValoracion()!.estado)">{{ miValoracion()!.estado }}</span>
            </div>
            <app-star-rating [value]="miValoracion()!.puntuacion" [readonly]="true" [size]="'sm'"></app-star-rating>
            @if (miValoracion()!.comentario) {
              <p class="my-review-text">{{ miValoracion()!.comentario }}</p>
            }
            @if (miValoracion()!.estado === 'PENDIENTE_MODERACION') {
              <span class="moderation-note">
                <i class="ri-alert-line"></i> Tu comentario está pendiente de moderación y no afecta el promedio.
              </span>
            }
            <button class="btn btn-outline btn-sm" (click)="abrirFormulario()">
              <i class="ri-edit-line"></i> Editar mi valoración
            </button>
          </div>
        } @else if (puedeValorar()) {
          <button class="btn btn-accent btn-sm" (click)="abrirFormulario()">
            <i class="ri-star-line"></i> Escribir valoración
          </button>
        } @else {
          <div class="info-box">
            <i class="ri-lock-2-line"></i>
            <span>{{ motivoNoPuedeValorar() || 'Solo los clientes que hayan adquirido este producto pueden valorarlo.' }}</span>
          </div>
        }
      </div>

      <!-- Lista de comentarios -->
      <div class="reviews-list">
        <h4 class="list-title"><i class="ri-chat-3-line"></i> Opiniones de la comunidad</h4>

        @if (cargandoLista()) {
          <div class="list-state">
            <i class="ri-loader-4-line spin-icon"></i>
            <span>Cargando comentarios...</span>
          </div>
        } @else if (valoraciones().length === 0) {
          <div class="list-state">
            <i class="ri-chat-3-line"></i>
            <span>Aún no hay comentarios publicados para esta prenda.</span>
          </div>
        } @else {
          @for (valoracion of valoraciones(); track valoracion.id) {
            <div class="review-item">
              <div class="review-avatar">{{ getInicial(valoracion) }}</div>
              <div class="review-content">
                <div class="review-meta">
                  <span class="review-author">{{ valoracion.cliente_nombre }}</span>
                  <span class="review-date">{{ valoracion.fecha_creacion | date:'dd/MM/yyyy' }}</span>
                </div>
                <app-star-rating [value]="valoracion.puntuacion" [readonly]="true" [size]="'sm'"></app-star-rating>
                @if (valoracion.comentario) {
                  <p class="review-text">{{ valoracion.comentario }}</p>
                }
              </div>
            </div>
          }

          @if (hayMas()) {
            <button class="btn btn-outline btn-sm load-more" [disabled]="cargandoLista()" (click)="cargarMas()">
              <i class="ri-arrow-down-line"></i> Cargar más comentarios
            </button>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .reviews-section {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      scroll-margin-top: 90px;
    }

    .reviews-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--primary);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;

      i { color: #f59e0b; }
    }

    .reviews-summary {
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 2rem;
      align-items: center;
      padding: 1.25rem;
      background: #f8fafc;
      border-radius: var(--radius-lg, 12px);
    }

    .summary-average {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      text-align: center;
    }

    .average-number {
      font-size: 2.75rem;
      font-weight: 800;
      font-family: 'Outfit', sans-serif;
      color: var(--primary);
      line-height: 1;

      &.muted { font-size: 1rem; color: var(--text-muted); }
    }

    .average-total { font-size: 0.8125rem; color: var(--text-muted); }

    .summary-distribution {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .distribution-row {
      display: grid;
      grid-template-columns: 42px 1fr 34px;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.75rem;
      color: #64748b;
    }

    .dist-label i { color: #f59e0b; font-size: 0.7rem; }

    .dist-bar {
      height: 8px;
      background: #e2e8f0;
      border-radius: 999px;
      overflow: hidden;
    }

    .dist-fill {
      height: 100%;
      background: linear-gradient(90deg, #fbbf24, #f59e0b);
      border-radius: 999px;
      transition: width 0.3s ease;
    }

    .review-actions-area { display: flex; flex-direction: column; gap: 0.75rem; }

    .info-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #f1f5f9;
      color: #475569;
      border-radius: 10px;
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
    }

    .review-form {
      border: 1px solid #e2e8f0;
      border-radius: var(--radius-lg, 12px);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      background: #ffffff;
    }

    .form-title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--primary);
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin: 0;

      i { color: var(--accent); }
    }

    .char-count {
      display: block;
      text-align: right;
      font-size: 0.7rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    .form-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
    }

    .my-review-box {
      border: 1px solid #e2e8f0;
      border-left: 4px solid var(--accent);
      border-radius: 10px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      background: #fffafb;
    }

    .my-review-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .my-review-tag {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--primary);
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .my-review-text {
      font-size: 0.875rem;
      color: #475569;
      margin: 0;
      line-height: 1.5;
    }

    .moderation-note {
      font-size: 0.75rem;
      color: #b45309;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .estado-chip {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
    }

    .estado-publicada { background: #dcfce7; color: #15803d; }
    .estado-pendiente { background: #fef3c7; color: #b45309; }
    .estado-rechazada { background: #fee2e2; color: #b91c1c; }

    .reviews-list {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      border-top: 1px solid #f1f5f9;
      padding-top: 1.25rem;
    }

    .list-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--primary);
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin: 0 0 0.5rem 0;
    }

    .list-state {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1.5rem 0;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .review-item {
      display: flex;
      gap: 0.85rem;
      padding: 0.9rem 0;
      border-bottom: 1px solid #f1f5f9;
    }

    .review-item:last-of-type { border-bottom: none; }

    .review-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent, #e11d48), #9f1239);
      color: #ffffff;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .review-content {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      flex: 1;
    }

    .review-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .review-author { font-weight: 700; font-size: 0.875rem; color: var(--primary); }
    .review-date { font-size: 0.75rem; color: var(--text-muted); }

    .review-text {
      font-size: 0.875rem;
      color: #475569;
      line-height: 1.55;
      margin: 0;
    }

    .load-more { align-self: center; margin-top: 0.75rem; }

    .spin-icon { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .reviews-summary { grid-template-columns: 1fr; }
    }
  `]
})
export class ProductReviewsComponent implements OnInit, OnChanges {
  private reviewsApi = inject(ReviewsApiService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  @Input() productoId!: number;
  @Input() promedioValoracion: number = 0;
  @Input() totalValoraciones: number = 0;

  @Output() cambioValoraciones = new EventEmitter<void>();

  public valoraciones = signal<Valoracion[]>([]);
  public cargandoLista = signal<boolean>(false);
  public guardando = signal<boolean>(false);
  public cargandoPuedeValorar = signal<boolean>(false);
  public puedeValorar = signal<boolean>(false);
  public motivoNoPuedeValorar = signal<string | null>(null);
  public miValoracion = signal<Valoracion | null>(null);
  public mostrandoFormulario = signal<boolean>(false);
  public nuevaPuntuacion = signal<number>(0);
  public errorPuntuacion = signal<boolean>(false);
  public hayMas = signal<boolean>(false);

  public nuevoComentario: string = '';

  public esCliente = computed(() => this.authService.isClient());

  /** Distribución por estrellas calculada sobre las valoraciones cargadas (CU26). */
  public distribucion = computed(() => {
    const lista = this.valoraciones();
    const totalLista = lista.length;

    return [5, 4, 3, 2, 1].map(estrella => {
      const cantidad = lista.filter(v => v.puntuacion === estrella).length;
      const porcentaje = totalLista > 0 ? Math.round((cantidad / totalLista) * 100) : 0;
      return { estrella, cantidad, porcentaje };
    });
  });

  private pagina: number = 0;
  private readonly limite: number = 5;

  ngOnInit(): void {
    this.cargarTodo();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productoId'] && !changes['productoId'].firstChange && this.productoId) {
      this.cargarTodo();
    }
  }

  cargarTodo(): void {
    if (!this.productoId) return;

    this.mostrandoFormulario.set(false);
    this.errorPuntuacion.set(false);
    this.pagina = 0;
    this.cargarValoraciones(true);

    if (this.esCliente()) {
      this.cargarPuedeValorar();
    } else {
      this.puedeValorar.set(false);
      this.motivoNoPuedeValorar.set(null);
      this.miValoracion.set(null);
    }
  }

  cargarValoraciones(reset: boolean): void {
    this.cargandoLista.set(true);

    this.reviewsApi.getProductReviews(this.productoId, this.pagina, this.limite).subscribe({
      next: (lista) => {
        const items = lista || [];
        this.valoraciones.update(actual => reset ? items : [...actual, ...items]);
        this.hayMas.set(items.length === this.limite);
        this.pagina = this.pagina + 1;
        this.cargandoLista.set(false);
      },
      error: () => {
        this.cargandoLista.set(false);
        this.toast.error('No se pudieron cargar las valoraciones del producto.');
      }
    });
  }

  cargarMas(): void {
    this.cargarValoraciones(false);
  }

  cargarPuedeValorar(): void {
    this.cargandoPuedeValorar.set(true);
    this.reviewsApi.canReview(this.productoId).subscribe({
      next: (res: PuedeValorarResponse) => {
        this.puedeValorar.set(!!res?.puede_valorar);
        this.motivoNoPuedeValorar.set(res?.motivo ?? null);
        this.miValoracion.set(res?.valoracion_existente ?? null);
        this.cargandoPuedeValorar.set(false);
      },
      error: () => this.cargandoPuedeValorar.set(false)
    });
  }

  abrirFormulario(): void {
    const existente = this.miValoracion();
    this.nuevaPuntuacion.set(existente ? existente.puntuacion : 0);
    this.nuevoComentario = existente?.comentario || '';
    this.errorPuntuacion.set(false);
    this.mostrandoFormulario.set(true);
  }

  cancelarFormulario(): void {
    this.mostrandoFormulario.set(false);
    this.errorPuntuacion.set(false);
  }

  enviarValoracion(): void {
    const puntuacion = this.nuevaPuntuacion();

    if (!puntuacion || puntuacion < 1 || puntuacion > 5) {
      this.errorPuntuacion.set(true);
      return;
    }

    this.guardando.set(true);

    const dto = {
      puntuacion,
      comentario: this.nuevoComentario?.trim() ? this.nuevoComentario.trim() : null
    };

    const existente = this.miValoracion();
    const peticion$ = existente
      ? this.reviewsApi.updateReview(existente.id, dto)
      : this.reviewsApi.createReview(this.productoId, dto);

    peticion$.subscribe({
      next: (valoracion) => {
        this.guardando.set(false);
        this.mostrandoFormulario.set(false);
        this.errorPuntuacion.set(false);
        this.miValoracion.set(valoracion);
        this.puedeValorar.set(true);

        this.toast.success(existente ? 'Valoración actualizada correctamente' : '¡Gracias por tu valoración!');

        if (valoracion.estado === 'PENDIENTE_MODERACION') {
          this.toast.info('Tu comentario quedará visible una vez aprobado por moderación.');
        }

        this.pagina = 0;
        this.cargarValoraciones(true);
        this.cambioValoraciones.emit();
      },
      error: (err) => {
        this.guardando.set(false);
        const detail = typeof err?.error?.detail === 'string'
          ? err.error.detail
          : 'No se pudo guardar tu valoración.';
        this.toast.error(detail);
      }
    });
  }

  getInicial(valoracion: Valoracion): string {
    const nombre = valoracion?.cliente_nombre || 'C';
    return nombre.charAt(0).toUpperCase();
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'PUBLICADA': return 'estado-publicada';
      case 'PENDIENTE_MODERACION': return 'estado-pendiente';
      case 'RECHAZADA': return 'estado-rechazada';
      default: return 'estado-publicada';
    }
  }
}
