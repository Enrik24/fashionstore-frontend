import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * [EXAMEN-2] CU17: teclado numérico táctil para el PIN offline.
 * - Nunca muestra el PIN: solo bolitas de progreso.
 * - Informa intentos restantes y bloqueo.
 * - Emite el PIN completo; el servicio valida y decide si hay error.
 */
@Component({
  selector: 'app-pin-pad',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pin-pad" [class.bloqueado]="bloqueado">
      @if (titulo) {
        <h2 class="pin-title">{{ titulo }}</h2>
      }
      @if (subtitulo) {
        <p class="pin-subtitle">{{ subtitulo }}</p>
      }

      <div class="pin-dots" role="status"
           [attr.aria-label]="'PIN ingresado de ' + longitud + ' dígitos'">
        @for (posicion of posiciones; track posicion) {
          <span class="pin-dot" [class.lleno]="posicion < pin().length"></span>
        }
      </div>

      @if (error) {
        <p class="pin-error" role="alert"><i class="ri-error-warning-line"></i> {{ error }}</p>
      }

      @if (bloqueado) {
        <div class="pin-bloqueo" role="alert">
          <i class="ri-lock-2-fill"></i>
          <strong>Acceso bloqueado</strong>
          <span>Se agotaron los intentos. Inicia sesión con conexión para restablecer el PIN.</span>
        </div>
      } @else {
        @if (intentosRestantes !== null) {
          <p class="pin-intentos" [class.pocos]="intentosRestantes <= 2">
            <i class="ri-shield-keyhole-line"></i>
            {{ intentosRestantes }} {{ intentosRestantes === 1 ? 'intento restante' : 'intentos restantes' }}
          </p>
        }

        <div class="pin-teclado" [class.inhabilitado]="cargando">
          @for (tecla of teclas; track tecla) {
            <button type="button"
                    class="pin-tecla"
                    [attr.aria-label]="'Dígito ' + tecla"
                    [disabled]="cargando"
                    (click)="agregar(tecla)">
              {{ tecla }}
            </button>
          }
          <button type="button" class="pin-tecla accion"
                  aria-label="Borrar último dígito"
                  [disabled]="cargando || !pin().length"
                  (click)="borrar()">
            <i class="ri-delete-back-2-line"></i>
          </button>
          <button type="button" class="pin-tecla"
                  aria-label="Dígito 0"
                  [disabled]="cargando"
                  (click)="agregar('0')">0</button>
          <button type="button" class="pin-tecla accion"
                  aria-label="Borrar todo"
                  [disabled]="cargando || !pin().length"
                  (click)="limpiar()">
            <i class="ri-close-line"></i>
          </button>
        </div>

        @if (cargando) {
          <p class="pin-cargando"><i class="ri-loader-4-line"></i> Verificando…</p>
        }
      }
    </div>
  `,
  styles: [`
    .pin-pad {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.65rem;
      max-width: 340px;
      margin: 0 auto;
    }

    .pin-title { font-size: 1.15rem; font-weight: 800; color: var(--primary); margin: 0; text-align: center; }
    .pin-subtitle { font-size: 0.82rem; color: var(--text-muted); margin: 0; text-align: center; }

    .pin-dots {
      display: flex;
      gap: 0.55rem;
      margin: 0.35rem 0;
      min-height: 22px;
      align-items: center;
    }

    .pin-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid var(--border-color);
      background: transparent;
      transition: background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
    }

    .pin-dot.lleno {
      background: var(--accent);
      border-color: var(--accent);
      transform: scale(1.08);
    }

    .pin-error {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: var(--error);
      background: var(--error-bg);
      border-radius: var(--radius-sm);
      padding: 0.4rem 0.7rem;
      font-size: 0.78rem;
      margin: 0;
      text-align: center;
    }

    .pin-intentos {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      margin: 0;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .pin-intentos.pocos { color: var(--critical); font-weight: 700; }

    .pin-teclado {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.55rem;
      width: 100%;
      margin-top: 0.35rem;
    }

    .pin-teclado.inhabilitado { opacity: 0.6; pointer-events: none; }

    .pin-tecla {
      min-height: var(--pos-touch);
      height: 58px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      background: var(--bg-card);
      color: var(--primary);
      font-size: 1.35rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background var(--transition-fast), transform var(--transition-fast);

      &:hover:not(:disabled) { background: var(--bg-main); }
      &:active:not(:disabled) { transform: scale(0.96); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
      &:focus-visible { outline: 3px solid var(--accent-glow); outline-offset: 1px; }
    }

    .pin-tecla.accion { background: var(--bg-main); color: var(--text-muted); font-size: 1.2rem; }

    .pin-bloqueo {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      padding: 1.1rem;
      border-radius: var(--radius-md);
      background: var(--critical-bg);
      color: var(--critical);
      text-align: center;
      font-size: 0.8rem;

      i { font-size: 1.6rem; }
      strong { font-size: 0.9rem; }
    }

    .pin-cargando { font-size: 0.78rem; color: var(--text-muted); margin: 0; }

    @media (max-width: 576px) {
      .pin-tecla { height: 54px; }
    }

    @media (prefers-reduced-motion: reduce) {
      .pin-dot, .pin-tecla { transition: none; }
    }
  `]
})
export class PinPadComponent {
  @Input() titulo?: string;
  @Input() subtitulo?: string;
  @Input() longitud = 6;
  @Input() intentosRestantes: number | null = null;
  @Input() bloqueado = false;
  @Input() cargando = false;
  @Input() error?: string;

  @Output() pinCompleto = new EventEmitter<string>();
  @Output() pinCambiado = new EventEmitter<number>();

  public teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  public pin = signal<string>('');

  public get posiciones(): number[] {
    return Array.from({ length: this.longitud }, (_, i) => i);
  }

  public agregar(digito: string): void {
    if (this.bloqueado || this.cargando) return;
    if (this.pin().length >= this.longitud) return;

    const nuevo = this.pin() + digito;
    this.pin.set(nuevo);
    this.pinCambiado.emit(nuevo.length);

    if (nuevo.length === this.longitud) {
      this.pinCompleto.emit(nuevo);
    }
  }

  public borrar(): void {
    if (this.bloqueado || this.cargando || !this.pin().length) return;
    const nuevo = this.pin().slice(0, -1);
    this.pin.set(nuevo);
    this.pinCambiado.emit(nuevo.length);
  }

  public limpiar(): void {
    if (this.bloqueado) return;
    this.pin.set('');
    this.pinCambiado.emit(0);
  }

  /** Permite al contenedor vaciar el PIN tras un intento fallido. */
  public reiniciar(): void {
    this.pin.set('');
    this.pinCambiado.emit(0);
  }
}
