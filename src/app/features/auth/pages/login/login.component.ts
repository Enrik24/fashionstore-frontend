import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page-wrapper">
      <div class="auth-card card animate-fade-in">
        <!-- Auth Header -->
        <div class="auth-header">
          <a routerLink="/home" class="auth-logo">
            <div class="logo-box">
              <i class="ri-t-shirt-2-line"></i>
            </div>
            <span class="logo-title">Fashion<span class="text-accent">Store</span></span>
          </a>
          <h2 class="auth-title">Iniciar Sesión</h2>
          <p class="auth-subtitle">Ingresa tus credenciales para acceder a tu cuenta</p>
        </div>

        <!-- Form -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form">
          <div class="form-group">
            <label class="form-label" for="correo">
              Correo Electrónico <span class="required">*</span>
            </label>
            <div class="input-icon-wrapper">
              <i class="ri-mail-line input-icon"></i>
              <input 
                id="correo"
                type="email" 
                formControlName="correo" 
                class="form-control with-icon" 
                placeholder="ejemplo@correo.com"
                [class.is-invalid]="isFieldInvalid('correo')"
                autocomplete="email"
              />
            </div>
            @if (isFieldInvalid('correo')) {
              <span class="form-error">
                <i class="ri-error-warning-line"></i> Ingrese un correo electrónico válido
              </span>
            }
          </div>

          <div class="form-group">
            <div class="label-with-link">
              <label class="form-label" for="contrasena">
                Contraseña <span class="required">*</span>
              </label>
              <a href="javascript:void(0)" class="forgot-link text-xs">¿Olvidaste tu contraseña?</a>
            </div>
            <div class="input-icon-wrapper">
              <i class="ri-lock-line input-icon"></i>
              <input 
                id="contrasena"
                [type]="showPassword() ? 'text' : 'password'" 
                formControlName="contrasena" 
                class="form-control with-icon with-action" 
                placeholder="••••••••"
                [class.is-invalid]="isFieldInvalid('contrasena')"
                autocomplete="current-password"
              />
              <button 
                type="button" 
                class="toggle-password-btn" 
                (click)="togglePasswordVisibility()"
                aria-label="Alternar visibilidad de contraseña"
              >
                <i [class]="showPassword() ? 'ri-eye-off-line' : 'ri-eye-line'"></i>
              </button>
            </div>
            @if (isFieldInvalid('contrasena')) {
              <span class="form-error">
                <i class="ri-error-warning-line"></i> La contraseña es requerida (mínimo 8 caracteres)
              </span>
            }
          </div>

          <button 
            type="submit" 
            class="btn btn-accent btn-lg w-full submit-btn" 
            [disabled]="loginForm.invalid || isSubmitting()"
          >
            @if (isSubmitting()) {
              <i class="ri-loader-4-line spin-icon"></i> Iniciando Sesión...
            } @else {
              <i class="ri-login-box-line"></i> Iniciar Sesión
            }
          </button>
        </form>

        <div class="auth-footer">
          <span>¿No tienes una cuenta?</span>
          <a routerLink="/auth/register" class="register-link font-semibold">Regístrate gratis</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page-wrapper {
      min-height: calc(100vh - 72px - 200px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem 1.5rem;
      background: radial-gradient(circle at top, rgba(225, 29, 72, 0.05) 0%, transparent 60%);
    }

    .auth-card {
      width: 100%;
      max-width: 460px;
      padding: 2.5rem;
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-xl);
    }

    .auth-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 1.75rem;
    }

    .auth-logo {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 1.25rem;
    }

    .logo-box {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-sm);
      background: var(--primary);
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }

    .logo-title {
      font-family: 'Outfit', sans-serif;
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--primary);
    }

    .auth-title {
      font-size: 1.65rem;
      font-weight: 800;
      color: var(--primary);
      margin-bottom: 0.25rem;
    }

    .auth-subtitle {
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .label-with-link {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .forgot-link {
      color: var(--accent);
      &:hover {
        text-decoration: underline;
      }
    }

    .input-icon-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 1rem;
      color: var(--text-muted);
      font-size: 1.1rem;
      pointer-events: none;
    }

    .form-control.with-icon {
      padding-left: 2.75rem;
    }

    .form-control.with-action {
      padding-right: 2.75rem;
    }

    .toggle-password-btn {
      position: absolute;
      right: 0.75rem;
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0.25rem;
      font-size: 1.15rem;
      line-height: 1;

      &:hover {
        color: var(--primary);
      }
    }

    .submit-btn {
      margin-top: 0.5rem;
      width: 100%;
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }

    .auth-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-light);
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .register-link {
      color: var(--accent);
      &:hover {
        text-decoration: underline;
      }
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  public showPassword = signal<boolean>(false);
  public isSubmitting = signal<boolean>(false);

  public loginForm: FormGroup = this.fb.group({
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(6)]]
  });

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }
}
