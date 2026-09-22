import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileService } from '../../../../core/services/profile.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ClientProfile, UpdateProfileDto, ChangePasswordDto } from '../../../../core/models/profile.model';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="profile-page-grid animate-fade-in">
      <!-- Left Column: Personal Info & Address -->
      <div class="profile-col main-col">
        <!-- Card 1: Datos Personales -->
        <div class="card profile-card">
          <div class="card-header-clean">
            <div class="header-icon-title">
              <i class="ri-user-3-line text-primary"></i>
              <h3>Información Personal</h3>
            </div>
            <span class="badge badge-accent">Cliente Registrado</span>
          </div>

          @if (loading()) {
            <div class="card-loading">
              <i class="ri-loader-4-line ri-spin"></i> Cargando tus datos...
            </div>
          } @else {
            <form (ngSubmit)="guardarPerfil()" class="form-grid">
              <div class="form-row">
                <div class="form-group col">
                  <label class="form-label">Nombre *</label>
                  <input type="text" class="form-control" [(ngModel)]="profileData.nombre" name="nombre" required />
                </div>
                <div class="form-group col">
                  <label class="form-label">Apellido</label>
                  <input type="text" class="form-control" [(ngModel)]="profileData.apellido" name="apellido" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group col">
                  <label class="form-label">Correo Electrónico</label>
                  <input type="email" class="form-control" [value]="profile()?.email" disabled />
                  <span class="field-hint">El correo no puede modificarse directamente</span>
                </div>
                <div class="form-group col">
                  <label class="form-label">Teléfono / WhatsApp</label>
                  <input type="tel" class="form-control" [(ngModel)]="profileData.telefono" name="telefono" placeholder="+591 70000000" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group col">
                  <label class="form-label">CI / NIT</label>
                  <input type="text" class="form-control" [(ngModel)]="profileData.ci_nit" name="ci_nit" placeholder="Para facturación" />
                </div>
                <div class="form-group col">
                  <label class="form-label">Fecha de Nacimiento</label>
                  <input type="date" class="form-control" [(ngModel)]="profileData.fecha_nacimiento" name="fecha_nacimiento" />
                </div>
              </div>

              <div class="form-actions">
                <button type="submit" class="btn btn-primary" [disabled]="isSavingProfile()">
                  @if (isSavingProfile()) {
                    <i class="ri-loader-4-line ri-spin"></i> Guardando...
                  } @else {
                    <i class="ri-save-line"></i> Actualizar Información
                  }
                </button>
              </div>
            </form>
          }
        </div>

        <!-- Card 2: Dirección de Envío -->
        <div class="card profile-card mt-4">
          <div class="card-header-clean">
            <div class="header-icon-title">
              <i class="ri-map-pin-line text-accent"></i>
              <h3>Dirección de Envío</h3>
            </div>
          </div>

          <form (ngSubmit)="guardarDireccion()" class="form-grid">
            <div class="form-group">
              <label class="form-label">Dirección Principal / Calle</label>
              <input type="text" class="form-control" [(ngModel)]="addressData.direccion" name="direccion" placeholder="Ej: Av. San Martín #1234, Edif. Torre Real, Dpto 4B" />
            </div>

            <div class="form-row">
              <div class="form-group col">
                <label class="form-label">Ciudad</label>
                <input type="text" class="form-control" [(ngModel)]="addressData.ciudad" name="ciudad" placeholder="Santa Cruz, La Paz, Cochabamba..." />
              </div>
              <div class="form-group col">
                <label class="form-label">Referencia</label>
                <input type="text" class="form-control" [(ngModel)]="addressData.referencia" name="referencia" placeholder="Frente al parque, portón blanco..." />
              </div>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-secondary" [disabled]="isSavingAddress()">
                @if (isSavingAddress()) {
                  <i class="ri-loader-4-line ri-spin"></i> Guardando...
                } @else {
                  <i class="ri-map-pin-user-line"></i> Guardar Dirección
                }
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Right Column: Preferences & Password -->
      <div class="profile-col side-col">
        <!-- Card 3: Preferencias de Moda e IA -->
        <div class="card profile-card">
          <div class="card-header-clean">
            <div class="header-icon-title">
              <i class="ri-sparkling-fill text-warning"></i>
              <h3>Preferencias de Moda</h3>
            </div>
          </div>

          <div class="preferences-box">
            <p class="text-sm text-muted">Estas preferencias ayudan a nuestro Asistente de IA a sugerirte las mejores prendas para tu estilo.</p>

            <div class="preference-group mt-3">
              <label class="font-semibold text-xs text-uppercase text-muted">Tallas Habituales</label>
              <div class="tag-selector mt-1">
                @for (t of ['XS', 'S', 'M', 'L', 'XL', 'XXL']; track t) {
                  <button type="button" 
                          class="tag-btn" 
                          [class.selected]="isTallaSelected(t)" 
                          (click)="toggleTalla(t)">
                    {{ t }}
                  </button>
                }
              </div>
            </div>

            <div class="preference-group mt-3">
              <label class="font-semibold text-xs text-uppercase text-muted">Estilos Preferidos</label>
              <div class="tag-selector mt-1">
                @for (e of ['Casual', 'Formal', 'Urbano', 'Elegante', 'Deportivo', 'Minimalista']; track e) {
                  <button type="button" 
                          class="tag-btn" 
                          [class.selected]="isEstiloSelected(e)" 
                          (click)="toggleEstilo(e)">
                    {{ e }}
                  </button>
                }
              </div>
            </div>

            <div class="checkbox-group mt-4">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="prefOfertas" />
                <span>Recibir alertas de nuevas colecciones y promociones</span>
              </label>
              <label class="checkbox-label mt-2">
                <input type="checkbox" [(ngModel)]="prefWhatsapp" />
                <span>Notificaciones de estado de reservas por WhatsApp</span>
              </label>
            </div>

            <div class="form-actions mt-4">
              <button type="button" class="btn btn-outline btn-block" (click)="guardarPreferencias()">
                <i class="ri-check-line"></i> Guardar Preferencias
              </button>
            </div>
          </div>
        </div>

        <!-- Card 4: Seguridad & Cambio de Contraseña -->
        <div class="card profile-card mt-4">
          <div class="card-header-clean">
            <div class="header-icon-title">
              <i class="ri-lock-password-line text-danger"></i>
              <h3>Seguridad & Clave</h3>
            </div>
          </div>

          <form (ngSubmit)="cambiarPassword()" class="form-grid">
            <div class="form-group">
              <label class="form-label">Contraseña Actual *</label>
              <input type="password" class="form-control" [(ngModel)]="passwordData.password_actual" name="current_pwd" required />
            </div>

            <div class="form-group">
              <label class="form-label">Nueva Contraseña *</label>
              <input type="password" class="form-control" [(ngModel)]="passwordData.password_nuevo" name="new_pwd" required minlength="6" />
            </div>

            <div class="form-group">
              <label class="form-label">Confirmar Nueva Contraseña *</label>
              <input type="password" class="form-control" [(ngModel)]="passwordData.confirmacion_password" name="confirm_pwd" required />
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-danger btn-block" [disabled]="isChangingPassword()">
                @if (isChangingPassword()) {
                  <i class="ri-loader-4-line ri-spin"></i> Actualizando...
                } @else {
                  <i class="ri-key-line"></i> Cambiar Contraseña
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-page-grid {
      display: grid;
      grid-template-columns: 1.6fr 1fr;
      gap: 1.75rem;
    }
    .profile-card {
      padding: 1.75rem;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid var(--border-color, #e2e8f0);
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
    }
    .card-header-clean {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border-color, #e2e8f0);
    }
    .header-icon-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .header-icon-title i { font-size: 1.5rem; }
    .header-icon-title h3 { margin: 0; font-size: 1.2rem; font-weight: 700; color: #0f172a; }
    .form-grid { display: flex; flex-direction: column; gap: 1.125rem; }
    .form-row { display: flex; gap: 1rem; }
    .form-row .col { flex: 1; }
    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-label { font-size: 0.8125rem; font-weight: 600; color: #475569; }
    .field-hint { font-size: 0.75rem; color: #94a3b8; }
    .form-actions { display: flex; justify-content: flex-end; margin-top: 0.5rem; }
    .btn-block { width: 100%; justify-content: center; }
    .tag-selector { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .tag-btn {
      padding: 0.35rem 0.75rem;
      border-radius: 20px;
      border: 1.5px solid #e2e8f0;
      background: #f8fafc;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tag-btn:hover { border-color: var(--accent, #ec4899); color: var(--accent, #ec4899); }
    .tag-btn.selected {
      background: var(--accent, #ec4899);
      border-color: var(--accent, #ec4899);
      color: #ffffff;
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.85rem;
      color: #334155;
      cursor: pointer;
    }
    .badge-accent { background: rgba(236, 72, 153, 0.1); color: var(--accent, #ec4899); padding: 0.25rem 0.6rem; border-radius: 6px; font-weight: 600; font-size: 0.75rem; }
    .card-loading { text-align: center; padding: 2rem; color: #64748b; }
    @media (max-width: 900px) {
      .profile-page-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class ProfilePageComponent implements OnInit {
  private profileService = inject(ProfileService);
  private toast = inject(ToastService);

  profile = signal<ClientProfile | null>(null);
  loading = signal<boolean>(true);
  isSavingProfile = signal<boolean>(false);
  isSavingAddress = signal<boolean>(false);
  isChangingPassword = signal<boolean>(false);

  profileData: UpdateProfileDto = {
    nombre: '',
    apellido: '',
    telefono: '',
    ci_nit: '',
    fecha_nacimiento: ''
  };

  addressData: any = {
    direccion: '',
    ciudad: '',
    referencia: ''
  };

  selectedTallas: string[] = [];
  selectedEstilos: string[] = [];
  prefOfertas: boolean = true;
  prefWhatsapp: boolean = true;

  passwordData: ChangePasswordDto = {
    password_actual: '',
    password_nuevo: '',
    confirmacion_password: ''
  };

  ngOnInit(): void {
    this.cargarPerfil();
  }

  cargarPerfil() {
    this.loading.set(true);
    this.profileService.getProfile().subscribe({
      next: (data: any) => {
        const mapped = this.mapBackendToProfile(data);
        this.profile.set(mapped);
        this.profileData = {
          nombre: mapped.nombre || '',
          apellido: mapped.apellido || '',
          telefono: mapped.telefono || '',
          ci_nit: mapped.ci_nit || '',
          nit_ci: mapped.ci_nit || '',
          fecha_nacimiento: mapped.fecha_nacimiento || ''
        };
        this.addressData = this.parseDireccionEnvio(data.direccion_envio ?? data.direccion);
        if (data.preferencias) {
          this.selectedTallas = data.preferencias.tallas_habituales || [];
          this.selectedEstilos = data.preferencias.estilos_preferidos || [];
          this.prefOfertas = data.preferencias.recibir_ofertas ?? true;
          this.prefWhatsapp = data.preferencias.notificaciones_whatsapp ?? true;
        } else {
          this.selectedTallas = [];
          this.selectedEstilos = [];
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  /** Normaliza la respuesta del backend (correo/nit_ci) al modelo del frontend (email/ci_nit). */
  private mapBackendToProfile(data: any): ClientProfile {
    return {
      ...data,
      email: data.correo || data.email,
      ci_nit: data.nit_ci || data.ci_nit,
      nit_ci: data.nit_ci || data.ci_nit,
      fecha_nacimiento: data.fecha_nacimiento || ''
    } as ClientProfile;
  }

  /** Separa el string direccion_envio ("dir, ciudad (Ref: ...)") en sus 3 campos del formulario. */
  private parseDireccionEnvio(raw: any): any {
    const empty = { direccion: '', ciudad: '', referencia: '' };
    if (!raw) return { ...empty };
    if (typeof raw === 'object') {
      return {
        direccion: raw.direccion || raw.direccion_envio || '',
        ciudad: raw.ciudad || '',
        referencia: raw.referencia || ''
      };
    }
    const text = String(raw);
    let referencia = '';
    let rest = text;
    const refMatch = text.match(/\(Ref:\s*(.+?)\)\s*$/);
    if (refMatch) {
      referencia = refMatch[1].trim();
      rest = text.slice(0, refMatch.index).trim().replace(/,\s*$/, '');
    }
    const parts = rest.split(',').map(p => p.trim()).filter(p => p);
    if (parts.length <= 1) {
      return { direccion: rest.trim(), ciudad: '', referencia };
    }
    const ciudad = parts.pop() as string;
    return { direccion: parts.join(', '), ciudad, referencia };
  }

  guardarPerfil() {
    this.isSavingProfile.set(true);
    const payload: any = {
      nombre: this.profileData.nombre,
      apellido: this.profileData.apellido,
      telefono: this.profileData.telefono || null,
      nit_ci: this.profileData.nit_ci || this.profileData.ci_nit || null,
      ci_nit: this.profileData.ci_nit || this.profileData.nit_ci || null,
      fecha_nacimiento: this.profileData.fecha_nacimiento || null
    };
    this.profileService.updateProfile(payload).subscribe({
      next: (updated: any) => {
        const mapped = this.mapBackendToProfile(updated);
        // Preservar preferencias/dirección en memoria (el PUT ya las devuelve, pero por seguridad)
        const prev = this.profile();
        this.profile.set({
          ...mapped,
          preferencias: mapped.preferencias ?? prev?.preferencias,
          direccion_envio: (mapped as any).direccion_envio ?? (prev as any)?.direccion_envio
        } as ClientProfile);
        // Re-sincronizar formulario con lo guardado
        this.profileData = {
          nombre: mapped.nombre || '',
          apellido: mapped.apellido || '',
          telefono: mapped.telefono || '',
          ci_nit: (mapped as any).ci_nit || '',
          nit_ci: (mapped as any).ci_nit || '',
          fecha_nacimiento: (mapped as any).fecha_nacimiento || ''
        };
        this.toast.show('Perfil actualizado exitosamente', 'success');
        this.isSavingProfile.set(false);
      },
      error: (err) => {
        const msg = err.error?.detail || 'Error al actualizar el perfil';
        this.toast.show(msg, 'error');
        this.isSavingProfile.set(false);
      }
    });
  }

  guardarDireccion() {
    this.isSavingAddress.set(true);
    this.profileService.updateAddress(this.addressData).subscribe({
      next: (res: any) => {
        // El backend devuelve direccion_envio combinada; no pisar los campos escritos por el usuario
        if (res?.direccion_envio) {
          const prev = this.profile();
          this.profile.set({ ...prev, direccion_envio: res.direccion_envio } as ClientProfile);
        }
        this.toast.show('Dirección guardada correctamente', 'success');
        this.isSavingAddress.set(false);
      },
      error: (err) => {
        const msg = err.error?.detail || 'Error al guardar la dirección';
        this.toast.show(msg, 'error');
        this.isSavingAddress.set(false);
      }
    });
  }

  isTallaSelected(t: string): boolean {
    return this.selectedTallas.includes(t);
  }

  toggleTalla(t: string) {
    if (this.selectedTallas.includes(t)) {
      this.selectedTallas = this.selectedTallas.filter(x => x !== t);
    } else {
      this.selectedTallas.push(t);
    }
  }

  isEstiloSelected(e: string): boolean {
    return this.selectedEstilos.includes(e);
  }

  toggleEstilo(e: string) {
    if (this.selectedEstilos.includes(e)) {
      this.selectedEstilos = this.selectedEstilos.filter(x => x !== e);
    } else {
      this.selectedEstilos.push(e);
    }
  }

  guardarPreferencias() {
    const prefs = {
      tallas_habituales: this.selectedTallas,
      estilos_preferidos: this.selectedEstilos,
      recibir_ofertas: this.prefOfertas,
      notificaciones_whatsapp: this.prefWhatsapp
    };
    this.profileService.updatePreferences(prefs).subscribe({
      next: (res: any) => {
        const saved = res?.preferencias ?? prefs;
        const prev = this.profile();
        this.profile.set({ ...prev, preferencias: saved } as ClientProfile);
        this.toast.show('Preferencias de moda guardadas', 'success');
      },
      error: (err) => {
        const msg = err.error?.detail || 'Error al guardar preferencias';
        this.toast.show(msg, 'error');
      }
    });
  }

  cambiarPassword() {
    if (this.passwordData.password_nuevo !== this.passwordData.confirmacion_password) {
      this.toast.show('Las contraseñas no coinciden', 'error');
      return;
    }
    this.isChangingPassword.set(true);
    this.profileService.changePassword(this.passwordData).subscribe({
      next: () => {
        this.toast.show('Contraseña actualizada correctamente', 'success');
        this.passwordData = { password_actual: '', password_nuevo: '', confirmacion_password: '' };
        this.isChangingPassword.set(false);
      },
      error: (err) => {
        const msg = err.error?.detail || 'Error al cambiar la contraseña';
        this.toast.show(msg, 'error');
        this.isChangingPassword.set(false);
      }
    });
  }
}
