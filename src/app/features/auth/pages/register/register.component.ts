import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('contrasena');
  const confirm = control.get('confirmarContrasena');
  if (!password || !confirm) return null;
  return password.value === confirm.value ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
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
          <h2 class="auth-title">Crear Cuenta</h2>
          <p class="auth-subtitle">Regístrate para reservar prendas y comprar en línea</p>
        </div>

        <!-- Form -->
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-form">
          <!-- Name Row -->
          <div class="grid grid-cols-2 form-row">
            <div class="form-group">
              <label class="form-label" for="nombre">
                Nombres <span class="required">*</span>
              </label>
              <div class="input-icon-wrapper">
                <i class="ri-user-line input-icon"></i>
                <input 
                  id="nombre"
                  type="text" 
                  formControlName="nombre" 
                  class="form-control with-icon" 
                  placeholder="Juan"
                  [class.is-invalid]="isFieldInvalid('nombre')"
                />
              </div>
              @if (isFieldInvalid('nombre')) {
                <span class="form-error">Nombre requerido</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="apellido">
                Apellidos <span class="required">*</span>
              </label>
              <div class="input-icon-wrapper">
                <i class="ri-user-line input-icon"></i>
                <input 
                  id="apellido"
                  type="text" 
                  formControlName="apellido" 
                  class="form-control with-icon" 
                  placeholder="Pérez"
                  [class.is-invalid]="isFieldInvalid('apellido')"
                />
              </div>
              @if (isFieldInvalid('apellido')) {
                <span class="form-error">Apellido requerido</span>
              }
            </div>
          </div>

          <!-- Email & Phone -->
          <div class="grid grid-cols-2 form-row">
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
                  placeholder="juan.perez@correo.com"
                  [class.is-invalid]="isFieldInvalid('correo')"
                />
              </div>
              @if (isFieldInvalid('correo')) {
                <span class="form-error">Correo válido requerido</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="telefono">
                Teléfono / Celular
              </label>
              <div class="input-icon-wrapper">
                <i class="ri-phone-line input-icon"></i>
                <input 
                  id="telefono"
                  type="tel" 
                  formControlName="telefono" 
                  class="form-control with-icon" 
                  placeholder="+591 70000000"
                />
              </div>
            </div>
          </div>

          <!-- NIT/CI & Address -->
          <div class="grid grid-cols-2 form-row">
            <div class="form-group">
              <label class="form-label" for="nit_ci">
                NIT / C.I. <span class="required">*</span>
              </label>
              <div class="input-icon-wrapper">
                <i class="ri-id-card-line input-icon"></i>
                <input 
                  id="nit_ci"
                  type="text" 
                  formControlName="nit_ci" 
                  class="form-control with-icon" 
                  placeholder="8472910 SC"
                  [class.is-invalid]="isFieldInvalid('nit_ci')"
                />
              </div>
              @if (isFieldInvalid('nit_ci')) {
                <span class="form-error">NIT o C.I. requerido</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="direccion_envio">
                Dirección de Envío
              </label>
              <div class="input-icon-wrapper">
                <i class="ri-map-pin-line input-icon"></i>
                <input 
                  id="direccion_envio"
                  type="text" 
                  formControlName="direccion_envio" 
                  class="form-control with-icon" 
                  placeholder="Av. América #123, Cochabamba"
                />
              </div>
            </div>
          </div>

          <!-- Passwords -->
          <div class="grid grid-cols-2 form-row">
            <div class="form-group">
              <label class="form-label" for="contrasena">
                Contraseña <span class="required">*</span>
              </label>
              <div class="input-icon-wrapper">
                <i class="ri-lock-line input-icon"></i>
                <input 
                  id="contrasena"
                  [type]="showPassword() ? 'text' : 'password'" 
                  formControlName="contrasena" 
                  class="form-control with-icon with-action" 
                  placeholder="••••••••"
                  [class.is-invalid]="isFieldInvalid('contrasena')"
                />
                <button 
                  type="button" 
                  class="toggle-password-btn" 
                  (click)="togglePasswordVisibility()"
                  aria-label="Alternar visibilidad"
                >
                  <i [class]="showPassword() ? 'ri-eye-off-line' : 'ri-eye-line'"></i>
                </button>
              </div>
              @if (isFieldInvalid('contrasena')) {
                <span class="form-error">Mínimo 8 caracteres</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="confirmarContrasena">
                Confirmar <span class="required">*</span>
              </label>
              <div class="input-icon-wrapper">
                <i class="ri-lock-check-line input-icon"></i>
                <input 
                  id="confirmarContrasena"
                  [type]="showPassword() ? 'text' : 'password'" 
                  formControlName="confirmarContrasena" 
                  class="form-control with-icon" 
                  placeholder="••••••••"
                  [class.is-invalid]="registerForm.hasError('passwordMismatch') && registerForm.get('confirmarContrasena')?.touched"
                />
              </div>
              @if (registerForm.hasError('passwordMismatch') && registerForm.get('confirmarContrasena')?.touched) {
                <span class="form-error">Las contraseñas no coinciden</span>
              }
            </div>
          </div>

          <!-- Terms -->
          <div class="terms-box">
            <input type="checkbox" id="terms" required checked>
            <label for="terms" class="text-xs text-muted">
              Acepto los <a href="javascript:void(0)" class="text-accent">Términos del Servicio</a> y las Políticas de Privacidad de FashionStore.
            </label>
          </div>

          <button 
            type="submit" 
            class="btn btn-accent btn-lg w-full submit-btn" 
            [disabled]="registerForm.invalid || isSubmitting()"
          >
            @if (isSubmitting()) {
              <i class="ri-loader-4-line spin-icon"></i> Registrando Cuenta...
            } @else {
              <i class="ri-user-add-line"></i> Crear Cuenta de Cliente
            }
          </button>
        </form>

        <div class="auth-footer">
          <span>¿Ya tienes una cuenta registrada?</span>
          <a routerLink="/auth/login" class="login-link font-semibold">Iniciar Sesión</a>
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
      max-width: 620px;
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
      margin-bottom: 2rem;
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
      gap: 1rem;
    }

    .form-row {
      gap: 1rem;
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

      &:hover {
        color: var(--primary);
      }
    }

    .terms-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0.5rem 0;
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

    .login-link {
      color: var(--accent);
      &:hover {
        text-decoration: underline;
      }
    }

    @media (max-width: 640px) {
      .auth-card {
        padding: 1.5rem;
      }
      .form-row {
        grid-template-columns: 1fr;
      }
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  public showPassword = signal<boolean>(false);
  public isSubmitting = signal<boolean>(false);

  public registerForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    apellido: ['', [Validators.required, Validators.minLength(2)]],
    correo: ['', [Validators.required, Validators.email]],
    telefono: [''],
    nit_ci: ['', [Validators.required, Validators.minLength(4)]],
    direccion_envio: [''],
    contrasena: ['', [Validators.required, Validators.minLength(8)]],
    confirmarContrasena: ['', [Validators.required]]
  }, { validators: passwordMatchValidator });

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    if (this.registerForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const { confirmarContrasena, ...userData } = this.registerForm.value;

    this.authService.register(userData).subscribe({
      next: () => {
        this.isSubmitting.set(false);
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }
}
